/**
 * data/lines.csv の各路線・区間の「平日・片方向の本数」を Yahoo!路線情報の
 * 駅時刻表から数えて確認用にファイル出力するスクレイパ。
 *
 * 目的: 本数の単一ソースは data/lines.csv（手入力）。このツールは値を自動更新せず、
 *       スクレイプした本数を data/train-counts.json に書き出し、CSV の手入力値との
 *       差分を標準出力に表示する（確認用）。反映するかは人が判断する。
 *
 * 数え方: 区間の代表駅（既定は CSV の「駅」列の端駅）について、もう一方の端へ向かう
 *         向きの「平日」時刻表ページの発車本数（列車アンカーのユニーク数）を数える。
 *         片方向なのでそのまま本数候補になる（ODPT 版のような ÷2 はしない）。
 *
 * データ源: Yahoo!路線情報（ https://transit.yahoo.co.jp/ ）。robots.txt を厳守する。
 *   - 取得するのは許可パスのみ:
 *       /timetable/pref/{県}/{50音}      ← 駅名→駅ID の索引（Allow: timetable/pref* ）
 *       /timetable/{駅ID}                ← 駅の路線一覧（方面リンク）
 *       /timetable/{駅ID}/{路線}?kind=1   ← 平日時刻表（Allow: timetable 配下の駅/路線?クエリ）
 *   - 検索（/timetable/search 等）と 3 セグメントの列車詳細・print は叩かない（Disallow）。
 *   - リクエスト間隔 1.1s 以上 + ローカル HTML キャッシュ（.data/yahoo-cache/、gitignore 済）。
 *
 * 使い方:
 *   node train-counts/scrape-yahoo-trains.cjs                 # 全行
 *   node train-counts/scrape-yahoo-trains.cjs 久留里線 京成千葉線   # 路線名/区間名で絞り込み
 *   FRESH=1 node train-counts/scrape-yahoo-trains.cjs ...     # キャッシュを使わず再取得
 */
const fs = require('fs')
const path = require('path')
const { readRows, trainKey } = require('../scripts/lines-csv.cjs')

const BASE = 'https://transit.yahoo.co.jp'
const UA = 'railway-map-hobby-scraper/0.1 (personal use; https://github.com/)'
const CACHE_DIR = path.resolve(__dirname, '../.data/yahoo-cache')
const OUT_PATH = path.resolve(__dirname, 'train-counts.json')
const REQUEST_DELAY_MS = 1200
const WEEKDAY_KIND = 1

/** 在圏の都県（japan.geojson の id と同じ）→ Yahoo pref コード。 */
const PREF_CODES = { 埼玉: 11, 千葉: 12, 東京: 13, 神奈川: 14 }
/** 県別索引の 50 音ページ（/timetable/pref/{code}/{row}）。 */
const KANA_ROWS = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa']

/**
 * CSV の路線名 → Yahoo の路線見出し（<dt>）名の対応（自動正規化で一致しない例外のみ）。
 * 既定は normalize() 後の部分一致で自動マッチするので、ここは「名前が食い違う路線」だけ。
 * 値は Yahoo 側の表示名（部分一致で使う）。
 */
const LINE_NAME_TO_YAHOO = {
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
}

/**
 * 駅名→駅ID の自動解決で外れる場合の手動補正（CSV の駅名 → Yahoo 駅ID）。
 * 同名駅・括弧付き表記・索引漏れなどに使う。
 */
const STATION_ID_OVERRIDES = {
  // 例: '大手町': 22564,
}

/**
 * 区間キー（trainKey: 区間名 or 路線名）→ 取得パラメータの直接指定。
 * 直通・分岐などで自動の代表駅/方向が合わない難所だけ書く。
 *   { stationId, lineCode } を指定すると解決をスキップしてそのまま数える。
 *   { station, toward } で代表駅・向き先（方面に含まれる駅名）を上書きもできる。
 */
const SECTION_OVERRIDES = {
  // 方面ラベルに区間内の駅が出ない路線は toward で向き先を明示する。
  つくばエクスプレス: { toward: '秋葉原' },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 全角/半角・空白・JR表記を吸収する正規化（路線名・方面ラベルの比較用）。 */
function normLine(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/^JR(東日本|東海|西日本)?/i, '')
}

/** 駅名の正規化（県名サフィックス (◯◯県) を除去）。 */
function normStation(s) {
  return String(s).normalize('NFKC').replace(/\s+/g, '').replace(/[(（].*?[)）]/g, '')
}

function cachePath(key) {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(CACHE_DIR, `${safe}.html`)
}

/** 許可パスのみを取得。キャッシュ優先。FRESH=1 で再取得。 */
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
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
const stripTags = (s) => s.replace(/<[^>]+>/g, '')

/** 県別 50 音索引を巡回し、駅名(正規化)→[駅ID...] を構築（キャッシュ）。 */
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
    console.log(`  索引: ${pref}(${code}) 取込済`)
  }
  fs.writeFileSync(indexFile, JSON.stringify(Object.fromEntries(map), null, 0))
  return map
}

/** 駅の路線一覧ページを解析 → [{ line, lineCode, toward }]。 */
async function getStationLines(stationId) {
  const html = await fetchPath(`/timetable/${stationId}`, `station_${stationId}`)
  const out = []
  // <dt>路線名</dt><dd>...<a href="/timetable/{id}/{code}?...">方面…方面</a>...</dd>
  const blockRe = /<dt>(.*?)<\/dt>\s*<dd>(.*?)<\/dd>/gs
  let b
  while ((b = blockRe.exec(html))) {
    const line = unescapeHtml(stripTags(b[1])).trim()
    const linkRe = new RegExp(`<a[^>]+href="/timetable/${stationId}/(\\d+)[^"]*"[^>]*>(.*?)</a>`, 'gs')
    let l
    while ((l = linkRe.exec(b[2]))) {
      const toward = unescapeHtml(stripTags(l[2])).replace(/方面\s*$/, '').trim()
      out.push({ line, lineCode: l[1], toward })
    }
  }
  return out
}

/** 平日時刻表の発車本数（列車アンカーのユニーク数）を数える。 */
async function countWeekday(stationId, lineCode) {
  const html = await fetchPath(
    `/timetable/${stationId}/${lineCode}?kind=${WEEKDAY_KIND}`,
    `tt_${stationId}_${lineCode}_k${WEEKDAY_KIND}`,
  )
  const re = new RegExp(`/timetable/${stationId}/${lineCode}/(\\d+)\\?kind=${WEEKDAY_KIND}`, 'g')
  const ids = new Set()
  let m
  while ((m = re.exec(html))) ids.add(m[1])
  return ids.size
}

/** CSV 行 → 取得対象（代表駅 ID・路線コード・方向ラベル）を解決。 */
async function resolve(row, stationIndex) {
  const key = trainKey(row)
  const ov = SECTION_OVERRIDES[key]
  if (ov && ov.stationId && ov.lineCode) {
    return { stationId: ov.stationId, lineCode: ov.lineCode, station: ov.station || '(override)', toward: '(override)' }
  }

  const stations = row.stations
  if (!stations.length) return { error: 'CSV に駅列が無い' }

  // 代表駅の候補（端駅を優先、両端を試す）。override の station 指定があれば最優先。
  const candidates = []
  if (ov && ov.station) candidates.push(ov.station)
  candidates.push(stations[0], stations[stations.length - 1])

  const wantLineY = normLine(LINE_NAME_TO_YAHOO[row.line] || row.line)
  const towardHint = ov && ov.toward ? normStation(ov.toward) : null
  // 区間内の「代表駅以外の駅」を方向判定のヒントに使う。
  const others = new Set(stations.map(normStation))

  const tried = []
  for (const stName of candidates) {
    // 同名駅（事業者違いで別ID）に備え、その名前に紐づく全 ID を試す。
    const sids = STATION_ID_OVERRIDES[stName] ? [STATION_ID_OVERRIDES[stName]] : stationIndex.get(normStation(stName)) || []
    if (!sids.length) {
      tried.push(`${stName}: 駅ID未解決`)
      continue
    }
    for (const sid of sids) {
      let lines
      try {
        lines = await getStationLines(sid)
      } catch (e) {
        tried.push(`${stName}(${sid}): 一覧取得失敗 ${e.message}`)
        continue
      }
      const matches = lines.filter((l) => {
        const ly = normLine(l.line)
        return ly.includes(wantLineY) || wantLineY.includes(ly)
      })
      if (!matches.length) {
        tried.push(`${stName}(${sid}): 路線「${row.line}」が無い（候補: ${[...new Set(lines.map((l) => l.line))].join('/')}）`)
        continue
      }
      // 方向選択: 代表駅以外の区間駅 or override の toward を含む方面を優先。
      const others2 = new Set([...others].filter((n) => n !== normStation(stName)))
      const chosen =
        matches.find((l) => {
          const tw = normStation(l.toward)
          if (towardHint) return tw.includes(towardHint)
          return [...others2].some((o) => o && tw.includes(o))
        }) || (matches.length === 1 ? matches[0] : null)

      if (!chosen) {
        tried.push(`${stName}(${sid}): 方向が一意に決まらない（方面: ${matches.map((m) => m.toward).join(' / ')}）`)
        continue
      }
      return { stationId: sid, lineCode: chosen.lineCode, station: stName, toward: chosen.toward }
    }
  }
  return { error: tried.join(' | ') }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  let rows = readRows()
  if (args.length) {
    rows = rows.filter((r) => args.some((a) => r.line.includes(a) || (r.section && r.section.includes(a)) || trainKey(r) === a))
    if (!rows.length) {
      console.log(`一致する行がありません: ${args.join(' ')}`)
      return
    }
  }

  console.log('駅名→駅ID 索引を構築中…')
  const stationIndex = await buildStationIndex()

  const results = []
  const failures = []
  for (const row of rows) {
    const key = trainKey(row)
    const r = await resolve(row, stationIndex)
    if (r.error) {
      failures.push({ key, reason: r.error })
      console.log(`  ✗ ${key}: ${r.error}`)
      continue
    }
    let count
    try {
      count = await countWeekday(r.stationId, r.lineCode)
    } catch (e) {
      failures.push({ key, reason: `本数取得失敗 ${e.message}` })
      console.log(`  ✗ ${key}: 本数取得失敗 ${e.message}`)
      continue
    }
    const sourceUrl = `${BASE}/timetable/${r.stationId}/${r.lineCode}?kind=${WEEKDAY_KIND}`
    results.push({
      key,
      line: row.line,
      section: row.section || null,
      station: r.station,
      stationId: r.stationId,
      lineCode: r.lineCode,
      direction: r.toward,
      weekdayCount: count,
      manual: row.trains,
      sourceUrl,
      fetchedAt: new Date().toISOString(),
    })
    console.log(`  ✓ ${key}: ${count}本 [${r.station}発・${r.toward}方面] (CSV=${row.trains ?? '-'})`)
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2) + '\n')

  // 差分表
  console.log('\n=== 差分（scrape vs CSV手入力） ===')
  console.log('  scrape  CSV   差   キー')
  for (const r of results) {
    const diff = r.manual == null ? '' : String(r.weekdayCount - r.manual)
    const mark = r.manual != null && r.weekdayCount !== r.manual ? ' *' : ''
    console.log(
      `  ${String(r.weekdayCount).padStart(5)}  ${String(r.manual ?? '-').padStart(4)}  ${String(diff).padStart(4)}  ${r.key}${mark}`,
    )
  }
  if (failures.length) {
    console.log(`\n=== 未解決（${failures.length}件・要オーバーライド） ===`)
    failures.forEach((f) => console.log(`  ${f.key}: ${f.reason}`))
  }
  console.log(`\n出力: ${path.relative(process.cwd(), OUT_PATH)}（${results.length}件）。CSV は変更していません。`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
