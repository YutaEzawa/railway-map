/**
 * data/lines.csv の「状態」が空（pending）の路線について、
 * Yahoo!路線情報の時刻表をスクレイプして区間ごとの本数を確認し、
 * 本数が一様なら auto_v1、区間分割が必要なら auto_v2 で CSV を更新する。
 *
 * 使い方:
 *   node split-lines/split-lines.cjs [--count N] [--line 路線名] [--write] [--fresh]
 *
 * オプション:
 *   --count N  : 処理する路線数（デフォルト 5）
 *   --line 名  : 特定路線に絞り込み
 *   --write    : CSV に書き込む（省略はドライラン表示のみ）
 *   --fresh    : Yahoo! キャッシュを無視して再スクレイプ
 *
 * 処理フロー（1路線あたり）:
 *   1. GeoJSON から路線上の駅を順序付きで取得
 *   2. 始端・終端での平日本数をスクレイプ
 *   3. 本数が一様 → auto_v1（駅列は空のまま、本数を確認・更新）
 *   4. 本数が異なる → 二分探索で変化点を特定 → auto_v2（区間分割行を生成）
 *   5. 解決できない場合 → auto_fail（理由を記録）
 *
 * データ源: Yahoo!路線情報（robots.txt 遵守: 1.2s 間隔・許可パスのみ・キャッシュ使用）
 */
const fs = require('fs')
const path = require('path')
const { readRows, writeRows } = require('../scripts/lines-csv.cjs')

// ====== 定数 ======
const BASE = 'https://transit.yahoo.co.jp'
const UA = 'railway-map-hobby-scraper/0.1 (personal use; https://github.com/)'
const CACHE_DIR = path.resolve(__dirname, '../.data/yahoo-cache')
const REQUEST_DELAY_MS = 1200
const WEEKDAY_KIND = 1
const PREF_CODES = {
  北海道: 1,
  青森: 2, 岩手: 3, 宮城: 4, 秋田: 5, 山形: 6, 福島: 7,
  茨城: 8, 栃木: 9, 群馬: 10, 埼玉: 11, 千葉: 12, 東京: 13, 神奈川: 14,
  新潟: 15, 富山: 16, 石川: 17, 福井: 18, 山梨: 19, 長野: 20, 岐阜: 21, 静岡: 22, 愛知: 23,
  三重: 24, 滋賀: 25, 京都: 26, 大阪: 27, 兵庫: 28, 奈良: 29, 和歌山: 30,
  鳥取: 31, 島根: 32, 岡山: 33, 広島: 34, 山口: 35,
  徳島: 36, 香川: 37, 愛媛: 38, 高知: 39,
  福岡: 40, 佐賀: 41, 長崎: 42, 熊本: 43, 大分: 44, 宮崎: 45, 鹿児島: 46, 沖縄: 47,
}
const KANA_ROWS = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa']

const RAILWAYS_PATH = path.resolve(__dirname, '../public/data/railways.geojson')
const STATIONS_PATH = path.resolve(__dirname, '../public/data/stations.geojson')
const REVIEW_PATH = path.resolve(__dirname, '../data/review.md')

/**
 * CSV 路線名 → Yahoo! 表示名（異なる場合のみ）。部分一致で使用する。
 * 値は文字列 or 配列（区間で Yahoo 名が変わる路線は配列で列挙）。
 * マッピングで一致しない場合は元の路線名でもマッチを試みる（フォールバック）。
 */
const LINE_NAME_TO_YAHOO = {
  // 千葉エリア
  中央・総武線各駅停車: '中央・総武線',
  東武野田線: '東武アーバンパークライン',
  都営新宿線: '都営地下鉄新宿線',
  総武線: '総武本線',
  新京成線: '京成松戸線',
  東葉高速線: '東葉高速鉄道',
  小湊鐵道線: '小湊鉄道',
  いすみ線: 'いすみ鉄道',
  銚子電気鉄道線: '銚子電鉄',
  千葉モノレール1号線: '千葉都市モノレール1号線',
  千葉モノレール2号線: '千葉都市モノレール2号線',
  // 東京・神奈川・埼玉
  東海道線: '東海道本線',
  京浜東北線: '京浜東北・根岸線',
  根岸線: '京浜東北・根岸線',
  宇都宮線: '東北本線',
  中央線快速: '中央線',
  '相鉄・JR直通線': '相鉄直通線', // Yahoo は「ＪＲ埼京・相鉄直通線」
  東武伊勢崎線: 'スカイツリーライン',
  都営浅草線: '都営地下鉄浅草線',
  都営三田線: '都営地下鉄三田線',
  都営大江戸線: '都営地下鉄大江戸線',
  都電荒川線: '都電荒川線',
  横浜市営ブルーライン: '横浜市営地下鉄ブルーライン',
  横浜市営グリーンライン: '横浜市営地下鉄グリーンライン',
  埼玉高速鉄道線: '埼玉高速鉄道',
  日暮里・舎人ライナー: '日暮里・舎人ライナー',
  みなとみらい21線: 'みなとみらい線',
  湘南モノレール: '湘南モノレール',
  秩父本線: '秩父鉄道',
  金沢シーサイドライン: '横浜シーサイドライン',
  多摩都市モノレール線: '多摩モノレール',
  御岳登山ケーブルカー: '御岳山ケーブル',
  高尾登山ケーブルカー: '高尾登山ケーブル',
  伊豆箱根大雄山線: '伊豆箱根鉄道大雄山線',
  // 北関東
  竜ヶ崎線: '竜ケ崎線', // Yahoo は「関東鉄道竜ケ崎線」（ヶ でなく ケ）
  宇都宮芳賀ライトレール線: '宇都宮ライトレール',
  筑波山鋼索鉄道線: '筑波山ケーブルカー',
  // 東北
  仙台空港線: '仙台空港アクセス線',
  仙台市営南北線: '仙台市地下鉄南北線',
  仙台市営東西線: '仙台市地下鉄東西線',
  // 北海道
  宗谷線: '宗谷本線',
  日高線: '日高本線',
  札幌市営南北線: '札幌市営地下鉄南北線',
  札幌市営東西線: '札幌市営地下鉄東西線',
  札幌市営東豊線: '札幌市営地下鉄東豊線',
  札沼線: '学園都市線', // Yahoo は愛称のみ表記
  釧網線: '釧網本線',
  // 中部・近畿・中国・四国・九州（全国拡張）
  大阪メトロ御堂筋線: 'OsakaMetro御堂筋線',
  大阪メトロ谷町線: 'OsakaMetro谷町線',
  大阪メトロ四つ橋線: 'OsakaMetro四つ橋線',
  大阪メトロ中央線: 'OsakaMetro中央線',
  大阪メトロ千日前線: 'OsakaMetro千日前線',
  大阪メトロ堺筋線: 'OsakaMetro堺筋線',
  大阪メトロ長堀鶴見緑地線: 'OsakaMetro長堀鶴見緑地線',
  大阪メトロ今里筋線: 'OsakaMetro今里筋線',
  福岡市営空港線: '福岡市地下鉄空港線',
  福岡市営箱崎線: '福岡市地下鉄箱崎線',
  福岡市営七隈線: '福岡市地下鉄七隈線',
  '神戸市営西神・山手線': '神戸市営地下鉄西神・山手線',
  神戸市営海岸線: '神戸市営地下鉄海岸線',
  京都市営東西線: '京都市営地下鉄東西線',
  京都市営烏丸線: '京都市営地下鉄烏丸線',
  神戸線: '阪急神戸本線',
  宝塚線: '阪急宝塚本線',
  阪急京都線: '阪急京都本線',
  信楽線: '信楽高原鐵道',
  篠栗線: '福北ゆたか線',
  桜島線: 'ゆめ咲線',
  // JR 愛称・正式名（全国拡張の再調査で判明した分）
  吉備線: '桃太郎線',
  宇野線: ['宇野みなと線', '瀬戸大橋線', '宇野線'],
  桜井線: ['万葉まほろば線', '桜井線'],
  片町線: '学研都市線',
  越美北線: '九頭竜線',
  筑豊線: ['福北ゆたか線', '若松線', '原田線'], // 区間で愛称が変わる
  '東海道線(JR西日本)': ['琵琶湖線', 'JR京都線', 'JR神戸線'], // 区間愛称
  山陽線: ['山陽本線', 'JR神戸線', '和田岬線'], // 神戸口は JR神戸線
  山陰線: ['山陰本線', '嵯峨野線'], // 京都口は嵯峨野線
  北陸線: ['北陸本線', 'IRいしかわ鉄道', 'ハピラインふくい'], // 北陸新幹線開業で移管済み区間
  本四備讃線: '瀬戸大橋線',
  関西線: ['関西本線', '大和路線'], // 大阪口は大和路線
  福知山線: ['福知山線', 'JR宝塚線'], // 大阪口は JR宝塚線
  高野線: ['南海高野線', '汐見橋線'], // 汐見橋口は運行系統が別
  帆柱ケーブル線: '皿倉山ケーブルカー',
  立山黒部貫光鋼索線: ['黒部ケーブルカー', '立山ケーブルカー'],
  富山地方鉄道本線: ['富山地方鉄道本線', '富山地方鉄道'],
  // 中部の私鉄・三セク
  伊勢線: '伊勢鉄道',
  天竜浜名湖線: '天竜浜名湖鉄道',
  明知線: '明知鉄道',
  樽見線: '樽見鉄道',
  越美南線: '長良川鉄道',
  大月線: '富士急行線',
  河口湖線: '富士急行線',
  東京モノレール羽田線: '東京モノレール',
  // 富山・万葉線（市内軌道は系統名）
  富山地方鉄道支線: '富山地方鉄道',
  富山都心線: '富山地方鉄道',
  富山駅南北接続線: '富山地方鉄道',
  呉羽線: '富山地方鉄道',
  安野屋線: '富山地方鉄道',
  新湊港線: '万葉線',
  高岡軌道線: '万葉線',
  黒部峡谷鉄道線: '黒部峡谷鉄道',
  // 近畿の私鉄・ケーブル
  北大阪急行南北線: '北大阪急行線',
  南港ポートタウン線: 'ニュートラム',
  泉北高速鉄道線: '南海泉北線', // 2025年 南海に合併
  北条線: '北条鉄道',
  水間線: '水間鉄道',
  宮津線: '京都丹後鉄道',
  嵯峨野観光線: '嵯峨野観光鉄道',
  京福鋼索線: '叡山ケーブル',
  京阪鋼索線: '京阪石清水八幡宮参道ケーブル',
  比叡山鉄道線: '坂本ケーブル',
  鞍馬山鋼索鉄道: '鞍馬山ケーブル',
  天橋立鋼索鉄道: '天橋立ケーブルカー',
  生駒鋼索線: '生駒ケーブル',
  西信貴鋼索線: '西信貴ケーブル',
  南海鋼索線: '南海高野山ケーブル',
  六甲ケーブル線: '六甲ケーブル',
  摩耶ケーブル線: '摩耶ケーブル',
  十国鋼索線: '十国峠パノラマケーブルカー',
  // 名古屋市営地下鉄
  名古屋市営東山線: '名古屋市営地下鉄東山線',
  名古屋市営名城線: '名古屋市営地下鉄名城線',
  名古屋市営名港線: '名古屋市営地下鉄名港線',
  名古屋市営鶴舞線: '名古屋市営地下鉄鶴舞線',
  名古屋市営桜通線: '名古屋市営地下鉄桜通線',
  名古屋市営上飯田線: '名古屋市営地下鉄上飯田線',
  広見線: '名鉄広見線',
  // 中国・四国の軌道・私鉄
  広島電鉄本線: '広島電鉄',
  宇品線: '広島電鉄',
  江波線: '広島電鉄',
  横川線: '広島電鉄',
  白島線: '広島電鉄',
  皆実線: '広島電鉄',
  宮島線: '広島電鉄宮島線',
  東山本線: '岡山電気軌道',
  水島本線: '水島臨海鉄道',
  若桜線: '若桜鉄道',
  伊予鉄道城北線: '伊予鉄道環状線',
  城南線: '伊予鉄道',
  大手町線: '伊予鉄道',
  花園線: '伊予鉄道',
  連絡線: '伊予鉄道',
  阿佐東線: '阿佐海岸鉄道',
  阿佐線: 'ごめん・なはり線',
  // 九州の軌道
  長崎電気軌道本線: '長崎電気軌道',
  大浦支線: '長崎電気軌道',
  蛍茶屋支線: '長崎電気軌道',
  赤迫支線: '長崎電気軌道',
  桜町支線: '長崎電気軌道',
}

/**
 * 路線名 → 「終点方面」に含まれるキーワード（方面ラベルに終端駅が出ない路線のみ）。
 * towardHints での自動マッチが失敗したときの補助ヒントとして使う。
 * 複数キーワードをスペース区切りで指定すると OR マッチ。
 */
const TOWARD_OVERRIDES = {
  東海道線: '小田原 熱海',
  高崎線: '熊谷 高崎',
  常磐線: '取手 水戸',
  青梅線: '青梅 奥多摩',
  八高線: '高麗川 高崎',
  川越線: '川越 高麗川',
  五日市線: '武蔵五日市',
  横須賀線: '久里浜 逗子',
  御殿場線: '御殿場 沼津',
  埼京線: '大宮 川越',
  東北新幹線: '大宮 仙台',
  上越新幹線: '大宮 新潟',
  東海道新幹線: '新横浜 名古屋',
}

// D: セグメント連結時の最大ギャップ（度）がこれを超えたら駅順序を信頼せず auto_fail。
// 0.05度 ≈ 5.5km。隣接駅間の自然な間隔や軽微なデータ欠損は許容し、明確なワープのみ弾く。
const GAP_FAIL_DEG = 0.05

/**
 * corridor / 並走サービスとして描画される路線（build-railways.cjs の CORRIDORS・SERVICE_LINES）。
 * 地図側はゾーン単位（trainSection）で本数を引くため、CSV を区間分割しても使われず
 * 既定値に落ちてしまう。これらは常に「区間なしの単一値」として書き込む。
 * （東北本線・東海道線・中央本線のように trainSection と一致する manual 区間だけが例外）
 */
const SERVICE_UNIFORM_LINES = new Set([
  '京浜東北線', '宇都宮線', '横須賀線', '湘南新宿ライン', '相鉄・JR直通線',
  '埼京線', '中央線快速', '中央・総武線各駅停車', '総武線快速',
  '常磐線快速', '常磐線各駅停車',
])

/**
 * 駅名・路線名の正規化（全角/半角・空白・JR表記を吸収）。
 */
function normLine(s) {
  return String(s).normalize('NFKC').replace(/\s+/g, '').replace(/^JR(東日本|東海|西日本)?/i, '')
}
function normStation(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[(（].*?[)）]/g, '')
    .replace(/[ヶヵ]/g, 'ケ') // 表記ゆれ吸収: 茅ヶ崎/茅ケ崎 等
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cachePath(key) {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(CACHE_DIR, `${safe}.html`)
}

/** 許可パスを fetch。キャッシュ優先。FRESH=1 または --fresh で再取得。 */
async function fetchPath(urlPath, cacheKey) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const cp = cachePath(cacheKey)
  if (!process.env.FRESH && fs.existsSync(cp)) {
    return fs.readFileSync(cp, 'utf8')
  }
  await sleep(REQUEST_DELAY_MS)
  const res = await fetch(`${BASE}${urlPath}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${urlPath}`)
  const html = await res.text()
  fs.writeFileSync(cp, html)
  return html
}

const unescapeHtml = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
const stripTags = (s) => s.replace(/<[^>]+>/g, '')

/** 都道府県別索引を巡回して 駅名 → [駅ID] マップを構築（キャッシュ）。 */
async function buildStationIndex() {
  const indexFile = path.join(CACHE_DIR, 'stations.json')
  if (!process.env.FRESH && fs.existsSync(indexFile)) {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(indexFile, 'utf8'))))
  }
  const map = new Map()
  for (const [pref, code] of Object.entries(PREF_CODES)) {
    for (const row of KANA_ROWS) {
      let html
      try {
        html = await fetchPath(`/timetable/pref/${code}/${row}`, `pref_${code}_${row}`)
      } catch (e) {
        console.log(`  索引取得失敗 ${pref}/${row}: ${e.message}`)
        continue
      }
      const re = /<a[^>]+href="\/timetable\/(\d+)\?pref=\d+[^"]*"[^>]*>(.*?)<\/a>/gs
      let m
      while ((m = re.exec(html))) {
        const id = Number(m[1])
        const name = normStation(unescapeHtml(stripTags(m[2])))
        if (!name) continue
        const arr = map.get(name) || []
        if (!arr.includes(id)) arr.push(id)
        map.set(name, arr)
      }
    }
    console.log(`  索引: ${pref} 取込済`)
  }
  fs.writeFileSync(indexFile, JSON.stringify(Object.fromEntries(map), null, 0))
  return map
}

/** 駅の路線一覧ページを解析 → [{line, lineCode, toward}] */
async function getStationLines(stationId) {
  const html = await fetchPath(`/timetable/${stationId}`, `station_${stationId}`)
  const out = []
  const blockRe = /<dt>(.*?)<\/dt>\s*<dd>(.*?)<\/dd>/gs
  let b
  while ((b = blockRe.exec(html))) {
    const line = unescapeHtml(stripTags(b[1])).trim()
    const linkRe = new RegExp(
      `<a[^>]+href="/timetable/${stationId}/(\\d+)[^"]*"[^>]*>(.*?)</a>`,
      'gs',
    )
    let l
    while ((l = linkRe.exec(b[2]))) {
      const toward = unescapeHtml(stripTags(l[2])).replace(/方面\s*$/, '').trim()
      out.push({ line, lineCode: l[1], toward })
    }
  }
  return out
}

/** 平日時刻表の発車本数を数える（同一時刻は1本として集約）。 */
async function countWeekday(stationId, lineCode) {
  const html = await fetchPath(
    `/timetable/${stationId}/${lineCode}?kind=${WEEKDAY_KIND}`,
    `tt_${stationId}_${lineCode}_k${WEEKDAY_KIND}`,
  )
  const re = new RegExp(
    `/timetable/${stationId}/${lineCode}/\\d+\\?kind=${WEEKDAY_KIND}&(?:amp;)?hh=(\\d+)&(?:amp;)?mm=(\\d+)`,
    'g',
  )
  const times = new Set()
  let m
  while ((m = re.exec(html))) times.add(`${m[1]}:${m[2]}`)
  return times.size
}

/**
 * 駅名 → {stationId, lineCode, fallback} を解決。
 * toward は方向ヒント（複数候補を空白区切り）。
 * ヒントで一致しない場合は TOWARD_OVERRIDES → matches[0] へフォールバック。
 * 解決できない場合は null を返す。
 */
async function resolveStation(stationName, lineName, toward, stationIndex) {
  // マッピング（文字列 or 配列）を優先し、元の路線名もフォールバック候補にする
  const mapped = LINE_NAME_TO_YAHOO[lineName]
  const wantCands = [...new Set(
    [...(Array.isArray(mapped) ? mapped : mapped ? [mapped] : []), lineName].map(normLine),
  )]
  const towardNames = (toward || '').split(/\s+/).filter(Boolean).map(normStation)
  // TOWARD_OVERRIDES のキーワードも追加ヒントとして使う
  const overrideNames = (TOWARD_OVERRIDES[lineName] || '').split(/\s+/).filter(Boolean).map(normStation)
  const allHints = [...new Set([...towardNames, ...overrideNames])]

  // 「◯◯線」と「◯◯本線」は同一視する（JR の正式名称ゆれ: 久大線⇄久大本線 等）
  const lineMatch = (ly, want) => {
    if (ly.includes(want) || want.includes(ly)) return true
    const ly2 = ly.replace(/本線$/, '線')
    const want2 = want.replace(/本線$/, '線')
    return ly2.includes(want2) || want2.includes(ly2)
  }

  const sids = stationIndex.get(normStation(stationName)) || []
  for (const sid of sids) {
    let lines
    try {
      lines = await getStationLines(sid)
    } catch {
      continue
    }
    // マッピング候補を順に試す（先勝ち）。どれも当たらなければ次の駅IDへ。
    let matches = []
    for (const want of wantCands) {
      matches = lines.filter((l) => lineMatch(normLine(l.line), want))
      if (matches.length) break
    }
    if (!matches.length) continue

    const chosen =
      matches.find((l) => {
        const tw = normStation(l.toward)
        return allHints.some((hint) => hint && tw.includes(hint))
      }) ||
      (matches.length === 1 ? matches[0] : null) ||
      matches[0] // フォールバック: ヒント不一致でも最初のマッチを使う

    if (chosen) {
      const fallback = !matches.find((l) => {
        const tw = normStation(l.toward)
        return allHints.some((hint) => hint && tw.includes(hint))
      })
      return { stationId: sid, lineCode: chosen.lineCode, toward: chosen.toward, fallback }
    }
  }
  return null
}

// ====== GeoJSON ユーティリティ（グラフベースの経路抽出） ======
//
// N02 のセグメント集合には実在の分岐（鶴見線の海芝浦支線等）・ループ・並走線が
// 含まれるため、「1本の折れ線に連結」する旧方式では途中でワープして駅順序が壊れた。
// 端点を頂点・セグメントを辺とする無向グラフを作り、
//   幹線 = 最長経路（重み付き直径）、支線 = 幹線から外れる長い枝
// として抽出し、駅を最寄りの経路（幹線 or 各支線）に割り当てて順序付ける。

const MIN_BRANCH_DEG = 0.008 // ≈0.9km 未満の枝は側線・引上線とみなし無視
const MIN_BRANCH_APART_DEG = 0.004 // 枝の先端が幹線から ≈450m 以内なら並走線とみなし無視
const DROP_COMPONENT_DEG = 0.02 // 接続できない飛び地はこの総延長未満なら黙って捨てる

function segLength(coords) {
  let L = 0
  for (let i = 0; i < coords.length - 1; i++) {
    L += Math.hypot(coords[i + 1][0] - coords[i][0], coords[i + 1][1] - coords[i][1])
  }
  return L
}

/** 重み付き Dijkstra。graph は Map(node -> [{to, e}])。blocked は辺集合、stopNodes は展開禁止ノード。 */
function dijkstra(graph, src, blocked = null, stopNodes = null) {
  const dist = new Map([[src, 0]])
  const prev = new Map()
  const visited = new Set()
  for (;;) {
    let u = null
    let du = Infinity
    for (const [k, d] of dist) {
      if (!visited.has(k) && d < du) { u = k; du = d }
    }
    if (u === null) break
    visited.add(u)
    if (stopNodes && u !== src && stopNodes.has(u)) continue // trunk ノードは通り抜け禁止
    for (const { to, e } of graph.get(u) || []) {
      if (blocked && blocked.has(e)) continue
      const nd = du + e.len
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd)
        prev.set(to, { from: u, e })
      }
    }
  }
  return { dist, prev }
}

/** prev チェーンから src→dst のノード・辺列を復元する。 */
function tracePath(prev, src, dst) {
  const nodes = [dst]
  const edges = []
  let cur = dst
  while (cur !== src) {
    const p = prev.get(cur)
    if (!p) return null
    edges.push({ e: p.e, toNode: cur })
    nodes.push(p.from)
    cur = p.from
  }
  nodes.reverse()
  edges.reverse()
  return { nodes, edges }
}

/** 辺列を折れ線座標に展開する（辺の向きはノード列に合わせる）。 */
function edgesToPolyline(pathObj, nodePt) {
  const coords = []
  const push = (pts) => {
    for (const p of pts) {
      const last = coords[coords.length - 1]
      if (!last || last[0] !== p[0] || last[1] !== p[1]) coords.push(p)
    }
  }
  for (let i = 0; i < pathObj.edges.length; i++) {
    const { e } = pathObj.edges[i]
    const from = pathObj.nodes[i]
    if (e.virtual) {
      push([nodePt.get(from), nodePt.get(pathObj.nodes[i + 1])])
    } else {
      push(e.a === from ? e.coords : [...e.coords].reverse())
    }
  }
  return coords
}

/**
 * セグメント集合から 幹線（最長経路）＋支線 を抽出する。
 * 成分が分かれている場合は最近接点対を仮想エッジ（gap 記録）で GAP_FAIL_DEG まで接続する。
 * @returns {{ trunkCoords, branches: [{attachPt, coords}], maxGap } | { fail: string }}
 */
function extractPaths(segments) {
  const key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}` // ≈11m で端点を同一視
  const nodePt = new Map()
  const graph = new Map()
  const addEdge = (a, b, e) => {
    if (!graph.has(a)) graph.set(a, [])
    if (!graph.has(b)) graph.set(b, [])
    graph.get(a).push({ to: b, e })
    graph.get(b).push({ to: a, e })
  }
  for (const seg of segments) {
    if (!seg || seg.length < 2) continue
    const a = key(seg[0])
    const b = key(seg[seg.length - 1])
    nodePt.set(a, seg[0])
    nodePt.set(b, seg[seg.length - 1])
    if (a === b) continue // 自己ループ（駅前ループ等）は無視
    addEdge(a, b, { a, b, len: segLength(seg), coords: seg })
  }
  if (!graph.size) return { fail: 'ジオメトリなし' }

  // 連結成分に分け、最近接点対を仮想エッジで接続（GAP_FAIL_DEG 以内のみ）
  const compId = new Map()
  const comps = []
  for (const start of graph.keys()) {
    if (compId.has(start)) continue
    const id = comps.length
    const nodes = []
    const queue = [start]
    compId.set(start, id)
    while (queue.length) {
      const n = queue.pop()
      nodes.push(n)
      for (const { to } of graph.get(n)) {
        if (!compId.has(to)) { compId.set(to, id); queue.push(to) }
      }
    }
    comps.push({ nodes, len: 0 })
  }
  for (const [, edges] of graph) {
    for (const { e } of edges) comps[compId.get(e.a)].len += e.len / 2 // 両向きで2回数える
  }

  let maxGap = 0
  const islandGraphs = [] // 接続できない大きな飛び地の部分グラフ
  const alive = comps.map((_, i) => i)
  const groupOf = comps.map((_, i) => i)
  const find = (i) => (groupOf[i] === i ? i : (groupOf[i] = find(groupOf[i])))
  const edist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  for (;;) {
    const groups = [...new Set(alive.map(find))]
    if (groups.length <= 1) break
    let best = { d: Infinity }
    for (let gi = 0; gi < groups.length; gi++) {
      for (let gj = gi + 1; gj < groups.length; gj++) {
        for (const ci of comps.keys()) {
          if (find(ci) !== groups[gi]) continue
          for (const cj of comps.keys()) {
            if (find(cj) !== groups[gj]) continue
            for (const na of comps[ci].nodes) {
              for (const nb of comps[cj].nodes) {
                const d = edist(nodePt.get(na), nodePt.get(nb))
                if (d < best.d) best = { d, na, nb, gi: groups[gi], gj: groups[gj] }
              }
            }
          }
        }
      }
    }
    if (best.d > GAP_FAIL_DEG) {
      // 接続できない飛び地: 小さければ捨て、大きければ独立成分（island）として残す
      // （例: 鹿児島線は肥薩おれんじ鉄道移管で 門司港〜八代 と 川内〜鹿児島 に分かれている）
      const groupLens = new Map()
      for (const ci of comps.keys()) {
        const g = find(ci)
        groupLens.set(g, (groupLens.get(g) || 0) + comps[ci].len)
      }
      const sorted = [...groupLens.entries()].sort((a, b) => b[1] - a[1])
      const bigIslands = sorted.slice(1).filter(([, l]) => l > DROP_COMPONENT_DEG)
      if (bigIslands.length > 3) {
        return { fail: `飛び地が多すぎる（${bigIslands.length + 1}成分）` }
      }
      // 主成分以外をグラフから外し、大きい飛び地は island 用に部分グラフを保存
      const mainGroup = sorted[0][0]
      const islandGroups = new Set(bigIslands.map(([g]) => g))
      const islandNodes = new Map() // group -> Set(node)
      for (const ci of comps.keys()) {
        const g = find(ci)
        if (g === mainGroup || !islandGroups.has(g)) continue
        if (!islandNodes.has(g)) islandNodes.set(g, new Set())
        for (const n of comps[ci].nodes) islandNodes.get(g).add(n)
      }
      for (const nodes of islandNodes.values()) {
        const sub = new Map()
        for (const n of nodes) {
          sub.set(n, (graph.get(n) || []).filter(({ to }) => nodes.has(to)))
        }
        islandGraphs.push(sub)
      }
      for (const ci of comps.keys()) {
        if (find(ci) === mainGroup) continue
        for (const n of comps[ci].nodes) graph.delete(n)
      }
      for (const [n, edges] of graph) {
        graph.set(n, edges.filter(({ to }) => graph.has(to)))
      }
      break
    }
    maxGap = Math.max(maxGap, best.d)
    addEdge(best.na, best.nb, { a: best.na, b: best.nb, len: best.d, virtual: true })
    groupOf[find(best.gi)] = find(best.gj)
  }

  // 幹線 = 重み付き直径（2回 Dijkstra）
  const anyNode = graph.keys().next().value
  const d1 = dijkstra(graph, anyNode)
  let u = anyNode
  for (const [n, d] of d1.dist) if (d > (d1.dist.get(u) ?? 0)) u = n
  const d2 = dijkstra(graph, u)
  let v = u
  for (const [n, d] of d2.dist) if (d > (d2.dist.get(v) ?? 0)) v = n
  const trunkPath = tracePath(d2.prev, u, v)
  if (!trunkPath) return { fail: '幹線経路の復元失敗' }
  const trunkCoords = edgesToPolyline(trunkPath, nodePt)
  const trunkNodeSet = new Set(trunkPath.nodes)
  const trunkEdgeSet = new Set(trunkPath.edges.map((x) => x.e))

  // 支線 = 幹線ノードから幹線辺を使わずに届く長い枝（1ノード最大3本）
  const branches = []
  const blocked = new Set(trunkEdgeSet)
  for (const t of trunkPath.nodes) {
    for (let guard = 0; guard < 3; guard++) {
      const { dist, prev } = dijkstra(graph, t, blocked, trunkNodeSet)
      let w = null
      let dw = 0
      for (const [n, d] of dist) {
        if (n === t || trunkNodeSet.has(n)) continue
        if (d > dw) { w = n; dw = d }
      }
      if (!w || dw < MIN_BRANCH_DEG) break
      const bPath = tracePath(prev, t, w)
      if (!bPath) break
      for (const { e } of bPath.edges) blocked.add(e)
      // 先端が幹線のすぐ近く（並走線・渡り線）なら支線として扱わない
      const endPt = nodePt.get(w)
      const { dist: dTrunk } = projectPt(endPt, trunkCoords)
      if (dTrunk < MIN_BRANCH_APART_DEG) continue
      branches.push({ attachPt: nodePt.get(t), coords: edgesToPolyline(bPath, nodePt) })
    }
  }

  // 飛び地（island）ごとに直径経路を計算して独立の折れ線にする
  const islands = []
  for (const sub of islandGraphs) {
    const start = sub.keys().next().value
    if (!start) continue
    const e1 = dijkstra(sub, start)
    let iu = start
    for (const [nn, d] of e1.dist) if (d > (e1.dist.get(iu) ?? 0)) iu = nn
    const e2 = dijkstra(sub, iu)
    let iv = iu
    for (const [nn, d] of e2.dist) if (d > (e2.dist.get(iv) ?? 0)) iv = nn
    const iPath = tracePath(e2.prev, iu, iv)
    if (iPath && iPath.edges.length) islands.push(edgesToPolyline(iPath, nodePt))
  }

  return { trunkCoords, branches, islands, maxGap }
}

/** 点を折れ線に射影し、全長比 t∈[0,1] と最短距離（度）を返す。 */
function projectPt(point, polyline) {
  const [px, py] = point
  let totalLen = 0
  for (let i = 0; i < polyline.length - 1; i++) {
    totalLen += Math.hypot(polyline[i + 1][0] - polyline[i][0], polyline[i + 1][1] - polyline[i][1])
  }
  if (totalLen === 0) return { t: 0, dist: Math.hypot(px - polyline[0][0], py - polyline[0][1]) }

  let cumLen = 0
  let bestT = 0
  let bestDist = Infinity
  for (let i = 0; i < polyline.length - 1; i++) {
    const [ax, ay] = polyline[i]
    const [bx, by] = polyline[i + 1]
    const segLen = Math.hypot(bx - ax, by - ay)
    const dx = bx - ax
    const dy = by - ay
    const lenSq = dx * dx + dy * dy
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
    if (d < bestDist) {
      bestDist = d
      bestT = (cumLen + t * segLen) / totalLen
    }
    cumLen += segLen
  }
  return { t: bestT, dist: bestDist }
}

/**
 * GeoJSON から lineName の 幹線駅列（順序付き・major フラグ付き）と支線を返す。
 * @returns {{ trunk: [{name, major}], branches: [{junction, stations: [{name, major}]}], maxGap }
 *           | { fail: string } | null}
 */
function getLinePaths(lineName, railwaysFC, stationsFC) {
  const feats = railwaysFC.features.filter((f) => f.properties.line === lineName)
  if (!feats.length) return null
  // 区間分割済みの路線は区間ごとに別フィーチャになっているため、offset なしの
  // 全フィーチャのセグメントを統合して1本のグラフにする（offset 付きは並走サービスの重ね描き）。
  const baseFeats = feats.filter((f) => !f.properties.offset)
  const useFeats = baseFeats.length ? baseFeats : [feats[0]]
  const segments = useFeats.flatMap((f) =>
    f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates],
  )

  const paths = extractPaths(segments)
  if (paths.fail) return { fail: paths.fail }
  const { trunkCoords, branches, islands, maxGap } = paths

  const lineStations = stationsFC.features
    .filter((f) => f.properties.lines && f.properties.lines.includes(lineName))
    .map((f) => ({ name: f.properties.name, major: !!f.properties.major, pt: f.geometry.coordinates }))
  if (!lineStations.length) return null

  // 各駅を最寄りの経路（幹線 / 支線 / 飛び地）に割り当てる。同着なら幹線を優先。
  const trunkSts = []
  const branchSts = branches.map(() => [])
  const islandSts = islands.map(() => [])
  for (const st of lineStations) {
    const pTrunk = projectPt(st.pt, trunkCoords)
    let best = { kind: 'trunk', t: pTrunk.t, dist: pTrunk.dist }
    branches.forEach((b, i) => {
      const p = projectPt(st.pt, b.coords)
      if (p.dist < best.dist - 0.0005) best = { kind: 'branch', idx: i, t: p.t, dist: p.dist }
    })
    islands.forEach((coords, i) => {
      const p = projectPt(st.pt, coords)
      if (p.dist < best.dist - 0.0005) best = { kind: 'island', idx: i, t: p.t, dist: p.dist }
    })
    if (best.kind === 'trunk') trunkSts.push({ ...st, t: best.t })
    else if (best.kind === 'branch') branchSts[best.idx].push({ ...st, t: best.t })
    else islandSts[best.idx].push({ ...st, t: best.t })
  }
  trunkSts.sort((a, b) => a.t - b.t)

  const trunk = trunkSts.map((s) => ({ name: s.name, major: s.major }))
  const outBranches = []
  branches.forEach((b, i) => {
    const sts = branchSts[i]
    if (!sts.length) return
    sts.sort((a, b2) => a.t - b2.t)
    // 分岐点に最も近い幹線駅 = 接続駅
    let junction = null
    let bestD = Infinity
    for (const s of trunkSts) {
      const st = lineStations.find((x) => x.name === s.name)
      const d = Math.hypot(st.pt[0] - b.attachPt[0], st.pt[1] - b.attachPt[1])
      if (d < bestD) { bestD = d; junction = s.name }
    }
    outBranches.push({ junction, stations: sts.map((s) => ({ name: s.name, major: s.major })) })
  })

  const outIslands = []
  islandSts.forEach((sts) => {
    if (sts.length < 2) return
    sts.sort((a, b) => a.t - b.t)
    outIslands.push({ stations: sts.map((s) => ({ name: s.name, major: s.major })) })
  })

  return { trunk, branches: outBranches, islands: outIslands, maxGap }
}

// ====== 本数解析 ======

/** 本数の差が小さければ「同一」とみなす（±10% or ±5本）。 */
function isSameFreq(a, b) {
  if (a === null || b === null) return false
  const diff = Math.abs(a - b)
  const avg = (a + b) / 2
  return diff <= Math.max(5, avg * 0.1)
}

/**
 * 自己検証: 区間本数の「中間V字凹み」を検出する。
 * 鉄道の本数は折返し駅でしか減らないため、線の途中で減って再び増える
 * （内部の極小）のは物理的に不自然＝駅順序ずれ or カウント誤差の兆候。
 * 該当区間の説明配列を返す（空なら問題なし）。人手確認を促すために使う。
 */
function findFreqDips(sections) {
  const warnings = []
  for (let i = 1; i < sections.length - 1; i++) {
    const prev = sections[i - 1].freq
    const cur = sections[i].freq
    const next = sections[i + 1].freq
    if (cur < prev && cur < next && !isSameFreq(cur, prev) && !isSameFreq(cur, next)) {
      warnings.push(
        `${sections[i].startStation}〜${sections[i].endStation} が ${cur}本 で前後（${prev}/${next}）より低い（中間の極小＝不自然）`,
      )
    }
  }
  return warnings
}

/**
 * 駅 stationName で lineName の本数を取得。失敗時は null。
 * towardHints: 方向ヒントとなる駅名の配列（終端・終端のひとつ手前など）
 */
async function getFreqAt(stationName, lineName, towardHints, stationIndex) {
  const towardStr = (towardHints || []).join(' ')
  const resolved = await resolveStation(stationName, lineName, towardStr, stationIndex)
  if (!resolved) return null
  if (resolved.fallback) {
    console.log(`    (方向フォールバック: ${stationName} → ${resolved.toward})`)
  }
  try {
    const n = await countWeekday(resolved.stationId, resolved.lineCode)
    return n > 0 ? n : null // 0本 = 時刻表ページのパース失敗とみなす（営業路線で平日0本はない）
  } catch {
    return null
  }
}

/**
 * idx の近傍で major（乗換駅・主要ターミナル ≈ 優等停車駅）な駅のインデックスを探す。
 * 急行・特急の走る路線では各停しか停まらない駅の本数は通過分だけ低く出るため、
 * 検索駅を優等停車駅に寄せて「各停駅を境界にした偽の本数変化」を避ける（範囲 (lo,hi) 内のみ）。
 */
function snapToMajor(stations, idx, lo, hi, radius = 6) {
  if (stations[idx]?.major) return idx
  for (let d = 1; d <= radius; d++) {
    if (idx - d > lo && stations[idx - d]?.major) return idx - d
    if (idx + d < hi && stations[idx + d]?.major) return idx + d
  }
  return idx
}

/**
 * 二分探索で本数の変化点を見つける。
 * stations[lo] での本数 freqLo、stations[hi] での本数 freqHi が分かっている状態で
 * 変化が起きている区間 [before, after] の候補を返す。
 * 中点は優等停車駅（major）に吸着させる。depth ≥ 5 またはインデックスが隣接したら終了。
 *
 * 返り値: [{splitAfterIdx, freqBefore, freqAfter}]
 *   splitAfterIdx: stations[splitAfterIdx] と stations[splitAfterIdx+1] の間が境界
 */
async function binarySearch(stations, lo, hi, freqLo, freqHi, lineName, towardHints, stationIndex, depth) {
  if (depth >= 5 || hi - lo <= 1) {
    return [{ splitAfterIdx: lo, freqBefore: freqLo, freqAfter: freqHi }]
  }

  const rawMid = Math.floor((lo + hi) / 2)
  let mid = snapToMajor(stations, rawMid, lo, hi)
  if (mid <= lo || mid >= hi) mid = rawMid
  const freqMid = await getFreqAt(stations[mid].name, lineName, towardHints, stationIndex)

  if (freqMid === null) {
    // 解決不可 → その中点をそのまま境界とする
    return [{ splitAfterIdx: lo, freqBefore: freqLo, freqAfter: freqHi }]
  }

  const results = []

  if (!isSameFreq(freqLo, freqMid)) {
    const sub = await binarySearch(stations, lo, mid, freqLo, freqMid, lineName, towardHints, stationIndex, depth + 1)
    results.push(...sub)
  }

  if (!isSameFreq(freqMid, freqHi)) {
    const sub = await binarySearch(stations, mid, hi, freqMid, freqHi, lineName, towardHints, stationIndex, depth + 1)
    results.push(...sub)
  }

  return results
}

/**
 * 幹線区間列の「偽の中間V字凹み」を併合して除去する。
 * 通過本数は折返し駅・分岐駅（≈ major）でしか減らないため、境界が優等停車駅でない
 * 凹み区間は「各停しか停まらない駅で測った通過本数の過小評価」とみなし、
 * 本数が近い側の隣接区間に吸収する。境界が両方 major の凹みは実在（折返し）として残す。
 */
function mergeFalseDips(sections, majorSet) {
  // 判定は元の区間列に対して1回だけ行う（連鎖併合すると山間部の本物の閑散区間まで
  // 飲み込んでしまうため、カスケードはしない）。
  const dipIdx = new Set()
  for (let i = 1; i < sections.length - 1; i++) {
    const prev = sections[i - 1]
    const cur = sections[i]
    const next = sections[i + 1]
    const isDip = cur.freq < prev.freq && cur.freq < next.freq &&
      !isSameFreq(cur.freq, prev.freq) && !isSameFreq(cur.freq, next.freq)
    if (!isDip) continue
    if (majorSet.has(cur.startStation) && majorSet.has(cur.endStation)) continue // 両境界が優等停車駅なら実在の凹み（折返し）
    // 優等通過の偽凹みでも各停分は残る（隣接の1/4以上）。それ未満の極端な凹みは
    // 山間部の本物の閑散区間（土讃線の阿波池田〜大歩危等）なので残す。
    if (cur.freq < 0.25 * Math.min(prev.freq, next.freq)) continue
    if (dipIdx.has(i - 1)) continue // 連続する凹みは最初の1つだけ併合（連鎖防止）
    dipIdx.add(i)
  }

  const secs = []
  for (let i = 0; i < sections.length; i++) {
    const cur = { ...sections[i], stations: [...sections[i].stations] }
    if (dipIdx.has(i) && secs.length) {
      const prev = secs[secs.length - 1]
      const next = sections[i + 1]
      // 本数が近い側の隣接区間へ吸収
      if (!next || Math.abs(prev.freq - cur.freq) <= Math.abs(next.freq - cur.freq)) {
        prev.endStation = cur.endStation
        prev.stations = [...prev.stations, ...cur.stations.slice(1)]
      } else {
        cur.freq = next.freq // 次区間の本数で置き換え（次のループで同等併合される）
        secs.push(cur)
      }
      continue
    }
    secs.push(cur)
  }

  // 併合の結果、本数が同等になった隣接区間もまとめる
  for (let i = 0; i < secs.length - 1; ) {
    if (isSameFreq(secs[i].freq, secs[i + 1].freq)) {
      secs[i].freq = Math.round((secs[i].freq + secs[i + 1].freq) / 2)
      secs[i].endStation = secs[i + 1].endStation
      secs[i].stations = [...secs[i].stations, ...secs[i + 1].stations.slice(1)]
      secs.splice(i + 1, 1)
    } else {
      i++
    }
  }
  return secs
}

/**
 * 支線の本数を調べて区間オブジェクトを返す（取得失敗時は freq: null）。
 * 支線は「接続駅〜末端」の1区間として扱う（枝内での分割はしない）。
 */
async function analyzeBranch(lineName, junction, branchStations, stationIndex) {
  const names = branchStations.map((s) => s.name)
  const end = names[names.length - 1]
  // 末端のひとつ手前で末端方向の発車本数を数える。1駅だけの支線は末端駅で接続駅方向を数える。
  const probeSt = names.length >= 2 ? names[names.length - 2] : names[0]
  const hints = names.length >= 2 ? [end, junction] : [junction, end]
  const freq = await getFreqAt(probeSt, lineName, hints, stationIndex)
  return {
    startStation: junction,
    endStation: end,
    stations: [junction, ...names],
    freq,
    isBranch: true,
  }
}

/**
 * 1路線の分析。
 * trunk / branches / islands は getLinePaths の返り値（{name, major} の配列）。
 * 返り値: { status, freq?, sections?, reason?, probeWarnings? }
 *   status: 'uniform' | 'split' | 'fail'
 *   uniform でも支線・飛び地があれば sections を持つ split になる。
 *   forceUniform=true（corridor系サービス）は常に単一値（uniform）。
 */
async function analyzeLine(lineName, trunk, branches, islands, stationIndex, forceUniform = false) {
  if (trunk.length < 2) {
    return { status: 'fail', reason: 'GeoJSONに駅が少なすぎる' }
  }

  const n = trunk.length
  // 終端の駅名をヒントとして使う（最後・最後から2番目）
  const towardHints = [trunk[n - 1].name, n > 2 ? trunk[n - 2].name : null].filter(Boolean)

  // 検索駅は優等停車駅（major）優先: 始端は先頭〜3駅目、終端側は末尾手前〜6駅目から選ぶ。
  // Yahoo に無い駅（信号場相当・時刻表非掲載）に当たったら候補を順に試す。
  const startCands = []
  for (let i = 0; i <= Math.min(3, n - 2); i++) if (trunk[i].major) startCands.push(i)
  for (let i = 0; i <= Math.min(3, n - 2); i++) if (!startCands.includes(i)) startCands.push(i)
  const endCands = []
  for (let i = n - 2; i >= Math.max(1, n - 8); i--) if (trunk[i].major) endCands.push(i)
  for (let i = n - 2; i >= Math.max(1, n - 8); i--) if (!endCands.includes(i)) endCands.push(i)
  // 2駅路線（ケーブルカー等）や途中駅が Yahoo に無い路線は終着駅も候補にする
  // （終着駅は発車方向が1つしかないため方向フォールバックで正しく数えられる）
  if (!endCands.includes(n - 1)) endCands.push(n - 1)

  let firstIdx = null
  let freqFirst = null
  for (const i of startCands) {
    freqFirst = await getFreqAt(trunk[i].name, lineName, towardHints, stationIndex)
    if (freqFirst !== null) { firstIdx = i; break }
  }
  if (freqFirst === null) {
    return { status: 'fail', reason: `始端付近「${startCands.map((i) => trunk[i].name).join('/')}」で本数取得失敗` }
  }

  let nearLastIdx = null
  let freqLast = null
  for (const i of endCands) {
    if (i <= firstIdx) continue
    freqLast = await getFreqAt(trunk[i].name, lineName, towardHints, stationIndex)
    if (freqLast !== null) { nearLastIdx = i; break }
  }
  if (freqLast === null) {
    return { status: 'fail', reason: `終端付近「${endCands.map((i) => trunk[i].name).join('/')}」で本数取得失敗` }
  }

  const firstSt = trunk[firstIdx].name
  const nearLastSt = trunk[nearLastIdx].name
  console.log(`  [${lineName}] 始端:${firstSt} / 終端付近:${nearLastSt}`)

  console.log(`  [${lineName}] 始端:${freqFirst}本 / 終端付近:${freqLast}本`)

  // corridor系サービスは地図側がゾーン単位で本数を引くため常に単一値
  if (forceUniform) {
    return { status: 'uniform', freq: Math.round((freqFirst + freqLast) / 2) }
  }

  // 幹線の区間リストを作る
  let trunkSections
  if (isSameFreq(freqFirst, freqLast)) {
    trunkSections = null // 均一
  } else {
    console.log(`  [${lineName}] 本数が異なる → 変化点を二分探索（優等停車駅優先）`)
    const splitPoints = await binarySearch(
      trunk, firstIdx, nearLastIdx, freqFirst, freqLast,
      lineName, towardHints, stationIndex, 0,
    )
    splitPoints.sort((a, b) => a.splitAfterIdx - b.splitAfterIdx)

    const boundaries = [0]
    for (const sp of splitPoints) {
      const b = sp.splitAfterIdx + 1
      if (b > boundaries[boundaries.length - 1] && b < n) boundaries.push(b)
    }
    boundaries.push(n - 1)

    trunkSections = []
    for (let i = 0; i < boundaries.length - 1; i++) {
      const startIdx = boundaries[i]
      const endIdx = boundaries[i + 1]
      const freq = i === 0
        ? (splitPoints[0]?.freqBefore ?? freqFirst)
        : (splitPoints[i - 1]?.freqAfter ?? freqFirst)
      trunkSections.push({
        startStation: trunk[startIdx].name,
        endStation: trunk[endIdx].name,
        stations: trunk.slice(startIdx, endIdx + 1).map((s) => s.name),
        freq,
      })
    }
    // 偽の中間凹み（各停駅での過小カウント）を併合
    if (trunkSections.length > 2) {
      const majorSet = new Set(trunk.filter((s) => s.major).map((s) => s.name))
      const before = trunkSections.length
      if (process.env.DEBUG_SECTIONS) {
        for (const s of trunkSections) console.log(`    (raw) ${s.startStation}〜${s.endStation}: ${s.freq}本`)
      }
      trunkSections = mergeFalseDips(trunkSections, majorSet)
      if (trunkSections.length < before) {
        console.log(`  [${lineName}] 偽の中間凹みを併合: ${before}区間 → ${trunkSections.length}区間`)
      }
    }
    if (trunkSections.length <= 1) trunkSections = null
  }

  // 支線の区間を追加
  const probeWarnings = []
  const branchSections = []
  for (const b of branches) {
    const sec = await analyzeBranch(lineName, b.junction, b.stations, stationIndex)
    if (sec.freq === null) {
      probeWarnings.push(`支線 ${sec.startStation}〜${sec.endStation} の本数取得失敗（本数は既定値）`)
    } else {
      console.log(`  [${lineName}] 支線 ${sec.startStation}〜${sec.endStation}: ${sec.freq}本`)
    }
    branchSections.push(sec)
  }

  // 飛び地（移管等で分断された同名区間）は独立の1区間として本数を測る
  for (const isl of islands) {
    const names = isl.stations.map((s) => s.name)
    const first = names[0]
    const last = names[names.length - 1]
    const probeSt = names.length >= 2 ? names[names.length - 2] : names[0]
    const freq = await getFreqAt(probeSt, lineName, [last, first], stationIndex)
    if (freq === null) {
      probeWarnings.push(`飛び地 ${first}〜${last} の本数取得失敗（本数は既定値）`)
    } else {
      console.log(`  [${lineName}] 飛び地 ${first}〜${last}: ${freq}本`)
    }
    branchSections.push({ startStation: first, endStation: last, stations: names, freq, isBranch: true })
  }

  if (!trunkSections && !branchSections.length) {
    return { status: 'uniform', freq: Math.round((freqFirst + freqLast) / 2) }
  }

  // 支線がある場合、均一幹線も1区間として明示する（支線と区別するため）
  const sections = trunkSections || [{
    startStation: trunk[0].name,
    endStation: trunk[n - 1].name,
    stations: trunk.map((s) => s.name),
    freq: Math.round((freqFirst + freqLast) / 2),
  }]
  return { status: 'split', sections: [...sections, ...branchSections], probeWarnings }
}

/**
 * 分析結果から CSV 行を生成する。
 * uniform → 元行の本数を更新して同一行を返す
 * split   → 区間ごとの行を返す（元行を置き換え）
 */
function generateRows(lineName, result, originalRows) {
  if (result.status === 'uniform') {
    // 単一行に集約（過去の自動区間行が残っていても1本にまとめる）
    return [{
      line: lineName,
      section: '',
      trains: result.freq,
      stations: [],
      status: 'auto_v1',
    }]
  }

  if (result.status === 'split') {
    // 中間V字凹み（dipWarnings）は優等停車駅で測定済みの値なのでそのまま採用（auto_v2）。
    // 支線などの本数取得失敗（probeWarnings）だけを auto_review（人手確認）に落とす。
    const status = result.probeWarnings && result.probeWarnings.length ? 'auto_review' : 'auto_v2'
    return result.sections.map((sec) => ({
      line: lineName,
      section: `${lineName}(${sec.startStation}〜${sec.endStation})`,
      trains: sec.freq,
      stations: sec.stations,
      status,
    }))
  }

  // fail: 元行に status だけ付ける
  return originalRows.map((r) => ({
    ...r,
    status: `auto_fail`,
  }))
}

// ====== 確認用ファイル ======

/**
 * data/review.md を CSV から再生成する。状態が auto_review（中間V字凹み等の要確認）
 * または auto_fail（自動処理失敗）の路線をまとめ、後でまとめて人手確認できるようにする。
 * CSV を真とするので何度実行しても安全（並列・複数回バッチでも壊れない）。
 * @returns {number} 確認待ち路線数
 */
function writeReviewFile(allRows) {
  const FLAG = new Set(['auto_review', 'auto_fail'])
  const lines = [...new Set(allRows.filter((r) => FLAG.has(r.status)).map((r) => r.line))]

  const out = []
  out.push('# 区間分割 要確認リスト（自動生成）')
  out.push('')
  out.push('`split-lines` が自動処理した結果のうち、人手確認が必要なものの一覧。')
  out.push('このファイルは `data/lines.csv` から生成される（`node split-lines/split-lines.cjs --review` で再生成）。')
  out.push('')
  out.push('- **auto_review** … 本数の中間V字凹みなど不自然な兆候あり。値は暫定で地図には反映済み。')
  out.push('- **auto_fail** … 駅順序ずれ等で自動処理に失敗。本数は既定値のまま。')
  out.push('')
  out.push('確認して正しい区間・本数に直したら、その行の `状態` を `manual` にすると本リストから外れる。')
  out.push('')

  if (!lines.length) {
    out.push('現在、確認待ちの路線はありません。 ✅')
    out.push('')
  } else {
    out.push(`確認待ち: **${lines.length} 路線**`)
    out.push('')
    for (const line of lines) {
      const rows = allRows.filter((r) => r.line === line && FLAG.has(r.status))
      const kind = rows.some((r) => r.status === 'auto_review') ? 'auto_review' : 'auto_fail'
      out.push(`## - [ ] ${line}  （${kind}）`)
      if (kind === 'auto_review') {
        out.push('')
        out.push('| 区間 | 本数 |')
        out.push('|------|------|')
        for (const r of rows) {
          out.push(`| ${r.section || '(全体)'} | ${r.trains == null ? '-' : r.trains} |`)
        }
        out.push('')
        out.push('→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。')
      } else {
        out.push('')
        out.push('→ 自動処理失敗。`node split-lines/split-lines.cjs --line "' + line + '" --fresh` で理由を確認。')
      }
      out.push('')
    }
  }

  fs.writeFileSync(REVIEW_PATH, out.join('\n'))
  return lines.length
}

// ====== メイン ======

async function main() {
  const argv = process.argv.slice(2)
  const writeMode = argv.includes('--write')
  const fresh = argv.includes('--fresh')
  if (fresh) process.env.FRESH = '1'

  const countArg = argv.find((a) => a.startsWith('--count'))
  const count = countArg
    ? parseInt(argv[argv.indexOf(countArg) + 1] || '5', 10)
    : 5

  const lineFilter = (() => {
    const idx = argv.indexOf('--line')
    return idx >= 0 ? argv[idx + 1] : null
  })()

  // --review: 確認用ファイルを CSV から再生成して終了（スクレイプなし・読み取り専用）
  if (argv.includes('--review')) {
    const n = writeReviewFile(readRows())
    console.log(`確認用ファイルを再生成: data/review.md（確認待ち ${n} 路線）`)
    return
  }

  // GeoJSON 読み込み
  const railwaysFC = JSON.parse(fs.readFileSync(RAILWAYS_PATH, 'utf8'))
  const stationsFC = JSON.parse(fs.readFileSync(STATIONS_PATH, 'utf8'))

  // CSV から pending 行を抽出
  const allRows = readRows()
  const pendingLines = [...new Set(
    allRows
      .filter((r) => !r.status)
      .filter((r) => !lineFilter || r.line === lineFilter)
      .map((r) => r.line),
  )].slice(0, count)

  if (!pendingLines.length) {
    console.log('処理対象の pending 路線がありません。')
    return
  }

  console.log(`対象路線 (${pendingLines.length}件): ${pendingLines.join(', ')}`)
  console.log('駅名→駅ID 索引を構築中…')
  const stationIndex = await buildStationIndex()

  const results = [] // { lineName, result, newRows }

  for (const lineName of pendingLines) {
    console.log(`\n▶ ${lineName}`)

    // GeoJSON から幹線＋支線の経路と順序付き駅リストを取得
    const paths = getLinePaths(lineName, railwaysFC, stationsFC)
    const failWith = (reason) => {
      console.log(`  ✗ ${reason}（auto_fail）`)
      const origRows = allRows.filter((r) => r.line === lineName)
      results.push({ lineName, result: { status: 'fail', reason }, newRows: origRows.map((r) => ({ ...r, status: 'auto_fail' })) })
    }
    if (!paths) { failWith('GeoJSONに駅データなし'); continue }
    if (paths.fail) { failWith(paths.fail); continue }

    const { trunk, branches, islands, maxGap } = paths
    if (maxGap > 0) console.log(`  （成分間ギャップ ${(maxGap * 111).toFixed(1)}km を接続）`)
    console.log(`  幹線駅数: ${trunk.length}（${trunk[0].name} → ${trunk[trunk.length - 1].name}）` +
      (branches.length ? ` / 支線 ${branches.length}本: ${branches.map((b) => `${b.junction}〜${b.stations[b.stations.length - 1].name}`).join(', ')}` : '') +
      (islands.length ? ` / 飛び地 ${islands.length}区間` : ''))

    const forceUniform = SERVICE_UNIFORM_LINES.has(lineName)
    if (forceUniform) console.log('  （corridor系サービス → 単一値で更新）')
    const result = await analyzeLine(lineName, trunk, branches, islands, stationIndex, forceUniform)
    // 自己検証: 幹線区間の中間V字凹み。優等停車駅で測定済みなので値は採用し、警告表示のみ。
    result.dipWarnings = result.status === 'split'
      ? findFreqDips(result.sections.filter((s) => !s.isBranch))
      : []
    const origRows = allRows.filter((r) => r.line === lineName)
    const newRows = generateRows(lineName, result, origRows)

    if (result.status === 'uniform') {
      console.log(`  ✓ 均一 ${result.freq}本 → auto_v1`)
    } else if (result.status === 'split') {
      const tag = result.probeWarnings.length ? 'auto_review（要確認）' : 'auto_v2'
      console.log(`  ✓ 区間分割 ${result.sections.length}区間 → ${tag}`)
      for (const sec of result.sections) {
        console.log(`    ${sec.isBranch ? '（支線）' : ''}${sec.startStation}〜${sec.endStation}: ${sec.freq ?? '?'}本 (${sec.stations.length}駅)`)
      }
      for (const w of result.probeWarnings) console.log(`    ⚠ 要確認: ${w}`)
      for (const w of result.dipWarnings) console.log(`    ⚠ 中間極小（優等停車駅で測定済みのため採用）: ${w}`)
    } else {
      console.log(`  ✗ 失敗: ${result.reason}`)
    }

    results.push({ lineName, result, newRows })
  }

  // 結果をサマリー表示
  console.log('\n=== サマリー ===')
  for (const { lineName, result } of results) {
    const hasWarn = result.probeWarnings && result.probeWarnings.length
    const mark = result.status === 'fail' ? '✗' : hasWarn ? '⚠' : '✓'
    const detail =
      result.status === 'uniform' ? `均一 ${result.freq}本` :
      result.status === 'split' ? `${result.sections.length}区間に分割` :
      result.reason
    console.log(`  ${mark} ${lineName}: ${detail}`)
  }

  // 自己検証: 要確認（支線等の本数取得失敗）の路線を明示
  const flagged = results.filter((r) => r.result.probeWarnings && r.result.probeWarnings.length)
  if (flagged.length) {
    console.log('\n=== ⚠ 要確認（一部区間の本数が取得できず既定値）===')
    for (const { lineName, result } of flagged) {
      for (const w of result.probeWarnings) console.log(`  ${lineName}: ${w}`)
    }
  }

  if (!writeMode) {
    console.log('\nドライランです。CSV は変更していません。反映するには --write を付けてください。')
    return
  }

  // CSV を更新（処理した路線の行を置き換え）
  const processedLines = new Set(results.map((r) => r.lineName))
  const processedRows = results.flatMap((r) => r.newRows)

  // 元の行順を再構成: pending 行の位置に新しい行を挿入、他はそのまま
  const newAllRows = []
  const usedLines = new Set()
  for (const row of allRows) {
    if (!processedLines.has(row.line)) {
      newAllRows.push(row)
    } else if (!usedLines.has(row.line)) {
      // この路線の新しい行をまとめて挿入
      usedLines.add(row.line)
      const newRows = processedRows.filter((r) => r.line === row.line)
      newAllRows.push(...newRows)
    }
  }

  writeRows(newAllRows)
  console.log(`\nCSV を更新しました: data/lines.csv（${results.length}路線）`)

  // 確認用ファイルを更新（要確認・失敗をまとめ、処理は止めずに進められる）
  const reviewCount = writeReviewFile(newAllRows)
  if (reviewCount) {
    console.log(`⚠ 確認待ち ${reviewCount} 路線 → data/review.md にまとめました（まとめて確認してください）`)
  }
  console.log('GeoJSON を再生成するには: node scripts/build-railways.cjs')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
