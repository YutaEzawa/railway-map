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
const { readRows, writeRows, trainKey } = require('../scripts/lines-csv.cjs')

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

/** CSV 路線名 → Yahoo! 表示名（異なる場合のみ）。部分一致で使用する。 */
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
  相鉄・JR直通線: '相鉄・JR直通線',
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
  江ノ島電鉄: '江ノ電',
  湘南モノレール: '湘南モノレール',
  秩父本線: '西武秩父線',
  金沢シーサイドライン: '金沢シーサイドライン',
  ニューシャトル: '埼玉新都市交通伊奈線',
  多摩都市モノレール線: '多摩都市モノレール',
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
 * 駅名・路線名の正規化（全角/半角・空白・JR表記を吸収）。
 */
function normLine(s) {
  return String(s).normalize('NFKC').replace(/\s+/g, '').replace(/^JR(東日本|東海|西日本)?/i, '')
}
function normStation(s) {
  return String(s).normalize('NFKC').replace(/\s+/g, '').replace(/[(（].*?[)）]/g, '')
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
  const wantLineY = normLine(LINE_NAME_TO_YAHOO[lineName] || lineName)
  const towardNames = (toward || '').split(/\s+/).filter(Boolean).map(normStation)
  // TOWARD_OVERRIDES のキーワードも追加ヒントとして使う
  const overrideNames = (TOWARD_OVERRIDES[lineName] || '').split(/\s+/).filter(Boolean).map(normStation)
  const allHints = [...new Set([...towardNames, ...overrideNames])]

  const sids = stationIndex.get(normStation(stationName)) || []
  for (const sid of sids) {
    let lines
    try {
      lines = await getStationLines(sid)
    } catch (e) {
      continue
    }
    const matches = lines.filter((l) => {
      const ly = normLine(l.line)
      return ly.includes(wantLineY) || wantLineY.includes(ly)
    })
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

// ====== GeoJSON ユーティリティ ======

/**
 * MultiLineString のセグメント配列を、端点の近傍でつながるように順序付けて
 * 1本の折れ線にして返す。
 * N02 データはセグメントがランダム順のため、flat() では正しい経路にならない。
 *
 * 方式A: 端点の出現回数を数え、1回しか現れない端点（=路線の終端）を持つ
 *   セグメントから連結を始める。これにより「線の途中から開始し、片側にしか
 *   伸ばせず逆側へワープする」現象を防ぐ。
 * 方式D: 連結時に跨いだ最大ギャップ（度）を `maxGap` として返す。呼び出し側が
 *   閾値超過なら auto_fail に倒す安全網に使う。
 *
 * @returns {{ coords: number[][], maxGap: number }}
 */
function chainSegments(segments) {
  if (!segments || segments.length === 0) return { coords: [], maxGap: 0 }
  if (segments.length === 1) return { coords: segments[0].slice(), maxGap: 0 }

  const edist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
  const key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}` // ≈11m で端点を同一視

  // 各セグメント端点の出現回数を数える（degree 1 = 路線の終端）
  const endpointCount = new Map()
  for (const seg of segments) {
    for (const p of [seg[0], seg[seg.length - 1]]) {
      const k = key(p)
      endpointCount.set(k, (endpointCount.get(k) || 0) + 1)
    }
  }

  // degree-1 端点を持つセグメントを始点にする（無ければループ等 → segments[0]）
  let startIdx = 0
  let startReversed = false
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (endpointCount.get(key(seg[0])) === 1) { startIdx = i; startReversed = false; break }
    if (endpointCount.get(key(seg[seg.length - 1])) === 1) { startIdx = i; startReversed = true; break }
  }

  const first = segments[startIdx]
  const result = (startReversed ? [...first].reverse() : first.slice())
  const used = new Set([startIdx])
  let maxGap = 0

  while (used.size < segments.length) {
    const endPt = result[result.length - 1]
    let bestDist = Infinity
    let bestIdx = -1
    let bestReverse = false

    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue
      const seg = segments[i]
      const dS = edist(endPt, seg[0])
      const dE = edist(endPt, seg[seg.length - 1])
      if (dS < bestDist) { bestDist = dS; bestIdx = i; bestReverse = false }
      if (dE < bestDist) { bestDist = dE; bestIdx = i; bestReverse = true }
    }

    if (bestIdx < 0) break
    if (bestDist > maxGap) maxGap = bestDist
    const seg = segments[bestIdx]
    result.push(...(bestReverse ? [...seg].reverse() : seg).slice(1))
    used.add(bestIdx)
  }

  return { coords: result, maxGap }
}

/** 点を折れ線に射影し、折れ線全長に対する位置 t∈[0,1] を返す。 */
function projectOntoPolyline(point, polyline) {
  const [px, py] = point
  let totalLen = 0
  for (let i = 0; i < polyline.length - 1; i++) {
    const [ax, ay] = polyline[i]
    const [bx, by] = polyline[i + 1]
    totalLen += Math.hypot(bx - ax, by - ay)
  }
  if (totalLen === 0) return 0

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
    const projX = ax + t * dx
    const projY = ay + t * dy
    const d = Math.hypot(px - projX, py - projY)

    if (d < bestDist) {
      bestDist = d
      bestT = (cumLen + t * segLen) / totalLen
    }
    cumLen += segLen
  }
  return bestT
}

/**
 * GeoJSON から lineName の路線上にある駅を順序付きで返す。
 * offset のない最初のフィーチャを基準路線として使用。
 * @returns {{ stations: string[], maxGap: number }} maxGap はセグメント連結時の最大ギャップ（度）
 */
function getOrderedStations(lineName, railwaysFC, stationsFC) {
  const feats = railwaysFC.features.filter((f) => f.properties.line === lineName)
  if (!feats.length) return { stations: [], maxGap: 0 }

  const feat = feats.find((f) => !f.properties.offset) || feats[0]
  const chained =
    feat.geometry.type === 'MultiLineString'
      ? chainSegments(feat.geometry.coordinates)
      : { coords: feat.geometry.coordinates, maxGap: 0 }
  const coords = chained.coords

  const lineStations = stationsFC.features.filter(
    (f) => f.properties.lines && f.properties.lines.includes(lineName),
  )
  if (!lineStations.length) return { stations: [], maxGap: chained.maxGap }

  const withPos = lineStations.map((f) => ({
    name: f.properties.name,
    t: projectOntoPolyline(f.geometry.coordinates, coords),
  }))
  withPos.sort((a, b) => a.t - b.t)

  return { stations: withPos.map((s) => s.name), maxGap: chained.maxGap }
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
    return await countWeekday(resolved.stationId, resolved.lineCode)
  } catch {
    return null
  }
}

/**
 * 二分探索で本数の変化点を見つける。
 * stations[lo] での本数 freqLo、stations[hi] での本数 freqHi が分かっている状態で
 * 変化が起きている区間 [before, after] の候補を返す。
 * depth ≥ 4 またはインデックスが隣接したら終了。
 *
 * 返り値: [{splitAfterIdx, freqBefore, freqAfter}]
 *   splitAfterIdx: stations[splitAfterIdx] と stations[splitAfterIdx+1] の間が境界
 */
async function binarySearch(stations, lo, hi, freqLo, freqHi, lineName, towardHints, stationIndex, depth) {
  if (depth >= 4 || hi - lo <= 1) {
    return [{ splitAfterIdx: lo, freqBefore: freqLo, freqAfter: freqHi }]
  }

  const mid = Math.floor((lo + hi) / 2)
  const freqMid = await getFreqAt(stations[mid], lineName, towardHints, stationIndex)

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
 * 1路線の分析。
 * 返り値: { status, freq?, sections?, reason? }
 *   status: 'uniform' | 'split' | 'fail'
 */
async function analyzeLine(lineName, stations, stationIndex) {
  if (stations.length < 2) {
    return { status: 'fail', reason: 'GeoJSONに駅が少なすぎる' }
  }

  // 終端の駅名をヒントとして使う（最後・最後から2番目）
  const lastSt = stations[stations.length - 1]
  const secondLastSt = stations.length > 2 ? stations[stations.length - 2] : null
  const towardHints = [lastSt, secondLastSt].filter(Boolean)

  // 始端（idx=0）と 終端のひとつ手前（idx=n-2, 終着駅は発着が1方向のみ）の本数を取得
  const firstSt = stations[0]
  const nearLastSt = stations.length > 1 ? stations[stations.length - 2] : stations[0]

  console.log(`  [${lineName}] 始端:${firstSt} / 終端付近:${nearLastSt}`)

  const freqFirst = await getFreqAt(firstSt, lineName, towardHints, stationIndex)
  if (freqFirst === null) {
    return { status: 'fail', reason: `始端「${firstSt}」で本数取得失敗` }
  }

  const freqLast = await getFreqAt(nearLastSt, lineName, towardHints, stationIndex)
  if (freqLast === null) {
    return { status: 'fail', reason: `終端付近「${nearLastSt}」で本数取得失敗` }
  }

  console.log(`  [${lineName}] 始端:${freqFirst}本 / 終端付近:${freqLast}本`)

  if (isSameFreq(freqFirst, freqLast)) {
    const freq = Math.round((freqFirst + freqLast) / 2)
    return { status: 'uniform', freq }
  }

  // 本数が異なる → 二分探索で変化点を特定
  console.log(`  [${lineName}] 本数が異なる → 変化点を二分探索`)
  const splitPoints = await binarySearch(
    stations, 0, stations.length - 2, freqFirst, freqLast,
    lineName, towardHints, stationIndex, 0,
  )

  if (!splitPoints.length) {
    return { status: 'uniform', freq: Math.round((freqFirst + freqLast) / 2) }
  }

  // 変化点リストから区間を生成
  // splitPoints は splitAfterIdx の昇順（binarySearch の再帰構造上）
  splitPoints.sort((a, b) => a.splitAfterIdx - b.splitAfterIdx)

  // 区間の境界インデックス: [0, sp1.splitAfterIdx+1, sp2.splitAfterIdx+1, ..., n-1]
  // firstIdx/lastIdx より前後にスキップした駅も先頭/末尾の区間に含める
  const boundaries = [0]
  for (const sp of splitPoints) {
    const b = sp.splitAfterIdx + 1
    if (b > boundaries[boundaries.length - 1] && b < stations.length) {
      boundaries.push(b)
    }
  }
  boundaries.push(stations.length - 1)

  // 各区間の本数
  // 区間 0: splitPoints[0].freqBefore（最初の分割前の本数）
  // 区間 k>0: splitPoints[k-1].freqAfter（直前の分割後の本数）
  const sections = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startIdx = boundaries[i]
    const endIdx = boundaries[i + 1]
    const freq = i === 0
      ? (splitPoints[0]?.freqBefore ?? freqFirst)
      : (splitPoints[i - 1]?.freqAfter ?? freqFirst)
    sections.push({
      startStation: stations[startIdx],
      endStation: stations[endIdx],
      stations: stations.slice(startIdx, endIdx + 1),
      freq,
    })
  }

  return { status: 'split', sections }
}

/**
 * 分析結果から CSV 行を生成する。
 * uniform → 元行の本数を更新して同一行を返す
 * split   → 区間ごとの行を返す（元行を置き換え）
 */
function generateRows(lineName, result, originalRows) {
  if (result.status === 'uniform') {
    // 元行をそのまま流用（本数と status のみ更新）
    return originalRows.map((r) => ({
      ...r,
      trains: result.freq,
      status: 'auto_v1',
    }))
  }

  if (result.status === 'split') {
    // 自己検証で要確認（中間V字凹み等）が出た場合は auto_review として書き出す。
    // 処理は止めず CSV には反映するが、後でまとめて人手確認する対象になる。
    const status = result.warnings && result.warnings.length ? 'auto_review' : 'auto_v2'
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

    // GeoJSON から順序付き駅リストを取得
    const { stations: orderedStations, maxGap } = getOrderedStations(lineName, railwaysFC, stationsFC)
    if (!orderedStations.length) {
      console.log(`  ✗ GeoJSONに駅データなし（スキップ）`)
      const origRows = allRows.filter((r) => r.line === lineName)
      results.push({ lineName, result: { status: 'fail', reason: 'GeoJSONに駅データなし' }, newRows: origRows.map((r) => ({ ...r, status: 'auto_fail' })) })
      continue
    }

    // D: セグメント連結に大ギャップ（ワープ）があれば駅順序が信頼できない → auto_fail
    if (maxGap > GAP_FAIL_DEG) {
      const km = (maxGap * 111).toFixed(1)
      console.log(`  ✗ セグメント連結に大ギャップ ${km}km → 駅順序の信頼性なし（auto_fail）`)
      const origRows = allRows.filter((r) => r.line === lineName)
      results.push({ lineName, result: { status: 'fail', reason: `連結ギャップ${km}km（駅順序不確実）` }, newRows: origRows.map((r) => ({ ...r, status: 'auto_fail' })) })
      continue
    }

    console.log(`  駅数: ${orderedStations.length}（${orderedStations[0]} → ${orderedStations[orderedStations.length - 1]}）`)

    const result = await analyzeLine(lineName, orderedStations, stationIndex)
    // 自己検証: 中間V字凹みがあれば要確認フラグを立てる（generateRows の status に反映）
    result.warnings = result.status === 'split' ? findFreqDips(result.sections) : []
    const origRows = allRows.filter((r) => r.line === lineName)
    const newRows = generateRows(lineName, result, origRows)

    if (result.status === 'uniform') {
      console.log(`  ✓ 均一 ${result.freq}本 → auto_v1`)
    } else if (result.status === 'split') {
      const tag = result.warnings.length ? 'auto_review（要確認）' : 'auto_v2'
      console.log(`  ✓ 区間分割 ${result.sections.length}区間 → ${tag}`)
      for (const sec of result.sections) {
        console.log(`    ${sec.startStation}〜${sec.endStation}: ${sec.freq}本 (${sec.stations.length}駅)`)
      }
      for (const w of result.warnings) {
        console.log(`    ⚠ 要確認: ${w}`)
      }
    } else {
      console.log(`  ✗ 失敗: ${result.reason}`)
    }

    results.push({ lineName, result, newRows })
  }

  // 結果をサマリー表示
  console.log('\n=== サマリー ===')
  for (const { lineName, result } of results) {
    const hasWarn = result.warnings && result.warnings.length
    const mark = result.status === 'fail' ? '✗' : hasWarn ? '⚠' : '✓'
    const detail =
      result.status === 'uniform' ? `均一 ${result.freq}本` :
      result.status === 'split' ? `${result.sections.length}区間に分割` :
      result.reason
    console.log(`  ${mark} ${lineName}: ${detail}`)
  }

  // 自己検証: 要確認（中間V字凹み）の路線を明示。--write 前に必ず人手確認する
  const flagged = results.filter((r) => r.result.warnings && r.result.warnings.length)
  if (flagged.length) {
    console.log('\n=== ⚠ 要確認（自動値をそのまま信用しない）===')
    for (const { lineName, result } of flagged) {
      for (const w of result.warnings) console.log(`  ${lineName}: ${w}`)
    }
    console.log('  → 本数の中間極小は折返し駅でしか起きないはず。駅順序ずれ/カウント誤差の疑い。')
    console.log('    実態を確認し、必要なら手動で区間・本数を修正（manual）すること。')
  }

  if (!writeMode) {
    console.log('\nドライランです。CSV は変更していません。反映するには --write を付けてください。')
    return
  }

  // CSV を更新（処理した路線の行を置き換え）
  const processedLines = new Set(results.map((r) => r.lineName))
  const untouchedRows = allRows.filter((r) => !processedLines.has(r.line))
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
