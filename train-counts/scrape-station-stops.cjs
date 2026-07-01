/**
 * 「停車本数」可視化用スクレイパ。
 *
 * 各駅に止まる列車の本数（＝その駅の平日・片方向の発車本数）を、合計＋種別ごとに
 * 路線ごとに数えて train-counts/station-stops.json に出力する。急行通過駅と停車駅で
 * 本数が大きく変わる路線（西武池袋線・京王線など）で、駅の丸サイズを停車本数に比例
 * させ、クリック時に種別内訳を出すための元データ。
 * 出力形: { 路線: { 駅名: { total: 合計, types: { 種別: 本数 } } } }
 *
 * 通過本数（路線を走る全列車＝線の太さ）は data/lines.csv の `本数` 列が単一ソース。
 * こちらは別チャンネル（駅の停車本数）なので、CSV とは独立した JSON に書き出す。
 *
 * 数え方:
 *   路線の各駅について、終端（TERMINAL。上り＝東京寄り）へ向かう向きの平日時刻表の
 *   発車本数を数える。発車本数＝その駅に停車して出発する本数＝停車本数。
 *   終端駅自身は反対向き（唯一の向き）の全発車を停車本数として数える。
 *   ※ 直通サービス（西武→副都心線、京王→都営新宿線 等）は Yahoo 上で別路線扱いの
 *     ため本数に含まれない。急行/各停の停車パターン差を見るには十分な近似とする。
 *
 * データ源・robots.txt 遵守・キャッシュは scrape-yahoo-trains.cjs と共通（ヘルパー再利用）。
 *
 * 使い方:
 *   node train-counts/scrape-station-stops.cjs                # 設定された全路線
 *   node train-counts/scrape-station-stops.cjs 西武池袋線        # 路線名で絞り込み
 *   FRESH=1 node train-counts/scrape-station-stops.cjs ...     # キャッシュ無視で再取得
 */
const fs = require('fs')
const path = require('path')
const {
  buildStationIndex,
  getStationLines,
  countWeekdayTypes,
  normLine,
  normStation,
  STATION_ID_OVERRIDES,
} = require('./scrape-yahoo-trains.cjs')

const STATIONS_GEOJSON = path.resolve(__dirname, '../public/data/stations.geojson')
const OUT_PATH = path.resolve(__dirname, 'station-stops.json')

/**
 * 対象路線（パイロット）。terminal は上り（東京寄り）の終端駅名。
 * stations は stations.geojson から自動取得するが、Yahoo の表示名と食い違う場合の
 * 路線名は scrape-yahoo-trains.cjs 側の normalize で吸収される（部分一致）。
 */
const TARGET_LINES = [
  // terminals: 上り方面ラベルの優先順。先頭が見つからなければ次を試す
  // （飯能以西の秩父線区間は上りラベルが「飯能」になるため）。
  { line: '西武池袋線', terminals: ['池袋', '飯能'] },
  // 初台・幡ヶ谷は京王新線（笹塚〜新宿の地下別線）のみの駅。Yahoo では京王線に出ず、
  // 上り（新宿方面）は都営新宿線直通のため終点ラベルが本八幡になる。
  {
    line: '京王線',
    terminals: ['新宿'],
    stationLine: { 初台: '京王新線', 幡ヶ谷: '京王新線' },
    stationToward: { 初台: ['本八幡'], 幡ヶ谷: ['本八幡'] },
  },
]

/** stations.geojson から路線の駅名一覧を取得（順不同。方向判定は terminal 名で行う）。 */
function stationsForLine(line) {
  const g = JSON.parse(fs.readFileSync(STATIONS_GEOJSON, 'utf8'))
  return g.features.filter((f) => f.properties.lines.includes(line)).map((f) => f.properties.name)
}

/** 1 駅の停車本数（terminals 方向の平日発車本数）を合計＋種別ごとに取得。 */
async function countStop(stationName, line, terminals, stationIndex) {
  const sids = STATION_ID_OVERRIDES[stationName]
    ? [STATION_ID_OVERRIDES[stationName]]
    : stationIndex.get(normStation(stationName)) || []
  if (!sids.length) return { error: '駅ID未解決' }

  const wantLine = normLine(line)
  const termNs = terminals.map(normStation)
  const tried = []
  for (const sid of sids) {
    let lines
    try {
      lines = await getStationLines(sid)
    } catch (e) {
      tried.push(`${sid}: 一覧取得失敗 ${e.message}`)
      continue
    }
    const matches = lines.filter((l) => {
      const ly = normLine(l.line)
      return ly.includes(wantLine) || wantLine.includes(ly)
    })
    if (!matches.length) {
      tried.push(`${sid}: 路線なし(${[...new Set(lines.map((l) => l.line))].join('/')})`)
      continue
    }
    // 上り（terminals 方面）を優先順に探す。terminal 駅自身は反対向き 1 つだけなのでそれを使う。
    let chosen = null
    for (const t of termNs) {
      chosen = matches.find((l) => normStation(l.toward).includes(t))
      if (chosen) break
    }
    if (!chosen && matches.length === 1) chosen = matches[0]
    if (!chosen) {
      tried.push(`${sid}: 方向不定(${matches.map((m) => m.toward).join('/')})`)
      continue
    }
    let res
    try {
      res = await countWeekdayTypes(sid, chosen.lineCode)
    } catch (e) {
      tried.push(`${sid}: 本数取得失敗 ${e.message}`)
      continue
    }
    return { total: res.total, types: res.types, stationId: sid, toward: chosen.toward }
  }
  return { error: tried.join(' | ') }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  let targets = TARGET_LINES
  if (args.length) targets = targets.filter((t) => args.some((a) => t.line.includes(a)))
  if (!targets.length) {
    console.log(`一致する路線がありません: ${args.join(' ')}`)
    return
  }

  console.log('駅名→駅ID 索引を構築中…')
  const stationIndex = await buildStationIndex()

  const out = {}
  const failures = []
  for (const { line, terminals, stationLine, stationToward } of targets) {
    const stations = stationsForLine(line)
    console.log(`\n=== ${line}（${stations.length}駅・${terminals[0]}方面） ===`)
    out[line] = {}
    for (const st of stations) {
      const effLine = (stationLine && stationLine[st]) || line
      const effTerm = (stationToward && stationToward[st]) || terminals
      const r = await countStop(st, effLine, effTerm, stationIndex)
      if (r.error) {
        failures.push({ line, station: st, reason: r.error })
        console.log(`  ✗ ${st}: ${r.error}`)
        continue
      }
      out[line][st] = { total: r.total, types: r.types }
      const brk = Object.entries(r.types)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}${v}`)
        .join(' ')
      console.log(`  ✓ ${st}: ${String(r.total).padStart(3)}本 [${r.toward}方面] ${brk}`)
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n')
  console.log(`\n出力: ${path.relative(process.cwd(), OUT_PATH)}`)
  if (failures.length) {
    console.log(`\n=== 未解決（${failures.length}件） ===`)
    failures.forEach((f) => console.log(`  ${f.line} ${f.station}: ${f.reason}`))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
