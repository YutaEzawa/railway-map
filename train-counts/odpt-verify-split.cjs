/**
 * ODPT（公共交通オープンデータ）の odpt:TrainTimetable を使い、区間分割の境界・本数を
 * 実データ（駅ごとの停車有無を含む全列車の時刻表）で検証するスクリプト。
 *
 * `auto_v3` は「区間境界を、多くの列車が止まる駅（train-counts/relaxed-major-stations.cjs の
 * 基準）で選べたこと」を表す状態値であり、データ源（ODPT かYahoo!スクレイプか）は問わない
 * （split-lines.cjs も同じ基準で auto_v2/auto_v3 を判定する）。このスクリプトは ODPT の
 * 実測データを使うぶん区間・本数そのものは Yahoo!スクレイプの推定より正確になるが、
 * 状態を auto_v3 にできるかどうかは境界駅が基準を満たすかどうかで決まる（満たさない
 * 境界があれば auto_review にして手動確認に回す）。
 *
 * 対象は ODPT_RAILWAYS に列挙した路線のみ（現状: 京王線）。他の路線を追加するには
 * 事業者ID・路線ID・data/lines.csv 上の路線名を足す（上り＝トークン方向は自動判定）。
 *
 * 使い方:
 *   node train-counts/odpt-verify-split.cjs --line 京王線          # ドライラン
 *   node train-counts/odpt-verify-split.cjs --line 京王線 --write  # CSV に反映
 *
 * 必要な環境変数: ODPT_CHALLENGE_TOKEN（.env、京王等チャレンジ系事業者）
 */
require('../scripts/load-env.cjs')
const { readRows, writeRows } = require('../scripts/lines-csv.cjs')
const { relaxedMajorStations, RARE_TYPE_RATIO } = require('./relaxed-major-stations.cjs')
const path = require('path')
const fs = require('fs')

const STATION_STOPS_PATH = path.resolve(__dirname, 'station-stops.json')

/** 区間本数が「同じ」とみなす差（split-lines.cjs の isSameFreq 相当）。 */
const isSameFreq = (a, b) => Math.abs(a - b) <= Math.max(5, Math.round(Math.min(a, b) * 0.1))

/** 対象路線。operator/railway は ODPT ID、line は data/lines.csv 上の表示名。 */
const ODPT_RAILWAYS = [
  {
    line: '京王線',
    operator: 'Keio',
    railway: 'Keio.Keio',
    host: 'https://api-challenge.odpt.org/api/v4',
    tokenEnv: 'ODPT_CHALLENGE_TOKEN',
    towardDirection: 'Inbound', // 上り（新宿方面）
  },
]

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

/** 駅マスタ: "odpt.Station:Operator.Railway.Id" → 日本語名。 */
async function fetchStationNames(host, operator, token) {
  const data = await fetchJson(`${host}/odpt:Station?odpt:operator=odpt.Operator:${operator}&acl:consumerKey=${token}`)
  const map = new Map()
  for (const s of data) map.set(s['owl:sameAs'], s['dc:title'])
  return map
}

/** 種別マスタ: "odpt.TrainType:Operator.Type" → 日本語名（駅ポップアップ表示は日本語で統一する）。 */
async function fetchTrainTypeNames(host, operator, token) {
  const data = await fetchJson(`${host}/odpt:TrainType?odpt:operator=odpt.Operator:${operator}&acl:consumerKey=${token}`)
  const map = new Map()
  for (const t of data) map.set(t['owl:sameAs'], t['dc:title'])
  return map
}

/** 平日時刻表を取得し、指定方向のみ返す。 */
async function fetchTimetables(host, railway, direction, token) {
  const data = await fetchJson(
    `${host}/odpt:TrainTimetable?odpt:railway=odpt.Railway:${railway}&odpt:calendar=odpt.Calendar:Weekday&acl:consumerKey=${token}`,
  )
  return data.filter((t) => t['odpt:railDirection'] === `odpt.RailDirection:${direction}`)
}

/**
 * 1列車の trainTimetableObject から、この路線内で停車した駅を順序通り抽出する。
 * ODPTの trainTimetableObject は「通過駅を省いて停車駅だけを列挙する」形式（通過駅は
 * エントリ自体が存在しない）。arrivalStation/departureStation が両方あるかどうかは
 * 停車時間の記録粒度の違いにすぎず（長時間停車は arrival+departure の2つ、それ以外は
 * departureTime のみで記録されることが多い）、停車/通過の区別ではない。つまりここに
 * 列挙されるエントリは（始端・終端も含め）すべて停車駅として扱ってよい。
 */
function extractStops(obj) {
  const stops = []
  for (const o of obj) {
    const station = o['odpt:arrivalStation'] || o['odpt:departureStation']
    if (!station) continue
    stops.push({ station, stopped: true })
  }
  return stops
}

/** data/lines.csv の既存行から、路線のトランク駅順（重複除去）を復元する。 */
function trunkOrderFromCsv(line, rows) {
  const lineRows = rows.filter((r) => r.line === line && r.stations.length)
  const order = []
  for (const r of lineRows) {
    for (const st of r.stations) if (!order.includes(st)) order.push(st)
  }
  return order
}

/**
 * ODPT に出てこない駅（京王新線の幡ヶ谷・初台など、別路線扱いの分岐区間の駅）を、
 * 元の CSV 駅順（fullOrder）での位置関係を使って区間の駅リストに割り込ませる。
 * ODPT 区間の終端駅の直後に fullOrder 側で続く「ODPT に無い駅」を、その区間の末尾に足す。
 */
function reinsertExtraStations(sections, odptOrder, fullOrder) {
  const odptSet = new Set(odptOrder)
  const extras = fullOrder.filter((s) => !odptSet.has(s))
  if (!extras.length) return sections
  for (const extra of extras) {
    const fullIdx = fullOrder.indexOf(extra)
    const prevOdptStation = [...fullOrder.slice(0, fullIdx)].reverse().find((s) => odptSet.has(s))
    // prevOdptStation が区間境界（前区間の終端＝次区間の始端）の場合、進行方向的に
    // 「次区間の先頭直後」に入るのが正しい（笹塚〜新宿の間にある幡ヶ谷・初台 等）。
    const sec = sections.find((s) => s.startSt === prevOdptStation) ||
      sections.find((s) => s.stations.includes(prevOdptStation))
    if (sec) {
      const insertAt = sec.stations.indexOf(prevOdptStation)
      sec.stations.splice(insertAt + 1, 0, extra)
    }
  }
  return sections
}

async function analyzeLine(cfg, rows) {
  const token = process.env[cfg.tokenEnv]
  if (!token) return { error: `${cfg.tokenEnv} が未設定` }

  const stationNames = await fetchStationNames(cfg.host, cfg.operator, token)
  const trainTypeNames = await fetchTrainTypeNames(cfg.host, cfg.operator, token)
  const timetables = await fetchTimetables(cfg.host, cfg.railway, cfg.towardDirection, token)
  const fullOrder = trunkOrderFromCsv(cfg.line, rows)

  // ODPT の当該 railway に実在する駅名の集合（京王新線の幡ヶ谷・初台など別 railway の駅は含まれない）
  const encountered = new Set()
  for (const t of timetables) {
    for (const o of t['odpt:trainTimetableObject']) {
      const sid = o['odpt:arrivalStation'] || o['odpt:departureStation']
      if (sid && stationNames.has(sid)) encountered.add(stationNames.get(sid))
    }
  }
  const trunkOrder = fullOrder.filter((s) => encountered.has(s))
  const trunkIndex = new Map(trunkOrder.map((name, i) => [name, i]))

  const segCounts = new Array(trunkOrder.length - 1).fill(0)
  const stopCounts = {} // 駅名 -> { 種別: 本数 }
  let skippedTrains = 0

  const unmappedTypes = new Set()
  for (const t of timetables) {
    const rawType = t['odpt:trainType']
    let trainType = trainTypeNames.get(rawType)
    if (!trainType) {
      trainType = (rawType || '').replace(/^odpt\.TrainType:[^.]+\./, '')
      unmappedTypes.add(rawType)
    }
    const stops = extractStops(t['odpt:trainTimetableObject'])
    const idxs = stops
      .map((s) => ({ ...s, idx: trunkIndex.get(stationNames.get(s.station)) }))
      .filter((s) => s.idx !== undefined)
    if (!idxs.length) { skippedTrains++; continue }

    // 通過本数: この列車が通った区間（駅の並びで連続する idx 間）を加算
    for (let i = 0; i < idxs.length - 1; i++) {
      const a = idxs[i].idx
      const b = idxs[i + 1].idx
      const lo = Math.min(a, b), hi = Math.max(a, b)
      for (let s = lo; s < hi; s++) segCounts[s]++
    }
    // 停車本数: stopped な駅のみ種別ごとに加算
    for (const s of idxs) {
      if (!s.stopped) continue
      const name = stationNames.get(s.station)
      stopCounts[name] = stopCounts[name] || {}
      stopCounts[name][trainType] = (stopCounts[name][trainType] || 0) + 1
    }
  }

  return {
    trunkOrder, fullOrder, segCounts, stopCounts, skippedTrains,
    totalTrains: timetables.length, unmappedTypes: [...unmappedTypes],
  }
}

function printReport(cfg, result) {
  const { trunkOrder, segCounts, stopCounts, skippedTrains, totalTrains } = result
  console.log(`\n=== ${cfg.line}（ODPT ${cfg.railway}・${cfg.towardDirection}・平日）===`)
  console.log(`列車数: ${totalTrains}（区間内データなしでスキップ: ${skippedTrains}）`)
  if (result.unmappedTypes.length) {
    console.log(`⚠ 種別名が日本語マスタに無く英語のまま: ${result.unmappedTypes.join(', ')}`)
  }

  const { majorTypes, result: majorSet } = relaxedMajorStations(trunkOrder, stopCounts)
  console.log(`主要種別（路線内最大種別の${RARE_TYPE_RATIO * 100}%以上・周辺で運行実績があるもの）: ${majorTypes.join('/')}`)

  console.log('\n駅間本数（通過）:')
  for (let i = 0; i < segCounts.length; i++) {
    const a = trunkOrder[i], b = trunkOrder[i + 1]
    console.log(`  ${a}〜${b}: ${segCounts[i]}本`)
  }

  // 実測本数から変化点（境界）を特定
  const boundaries = [0]
  for (let i = 1; i < segCounts.length; i++) {
    if (!isSameFreq(segCounts[i - 1], segCounts[i])) boundaries.push(i)
  }
  boundaries.push(segCounts.length)

  console.log('\n区間案（実測本数の変化点で分割）:')
  const sections = []
  const boundaryWarnings = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startIdx = boundaries[i]
    const endIdx = boundaries[i + 1]
    const freq = segCounts[startIdx]
    const startSt = trunkOrder[startIdx]
    const endSt = trunkOrder[endIdx]
    const isMajorBoundary = startIdx === 0 || majorSet.has(startSt)
    const isMajorBoundaryEnd = endIdx === segCounts.length || majorSet.has(endSt)
    if (!isMajorBoundary) boundaryWarnings.push(`境界駅「${startSt}」は多くの列車が止まる駅ではない`)
    if (!isMajorBoundaryEnd) boundaryWarnings.push(`境界駅「${endSt}」は多くの列車が止まる駅ではない`)
    sections.push({ startSt, endSt, freq, stations: trunkOrder.slice(startIdx, endIdx + 1) })
    console.log(`  ${startSt}〜${endSt}: ${freq}本 (${endIdx - startIdx + 1}駅)` +
      (isMajorBoundary ? '' : `  ⚠ 始端「${startSt}」は多くの列車が止まる駅ではない`) +
      (isMajorBoundaryEnd ? '' : `  ⚠ 終端「${endSt}」は多くの列車が止まる駅ではない`))
  }

  console.log('\n駅ごとの停車種別（主要種別＝●停車 ／ ×通過）:')
  for (const name of trunkOrder) {
    const types = stopCounts[name] || {}
    const flags = majorTypes.map((t) => `${t}${types[t] ? '●' : '×'}`).join(' ')
    console.log(`  ${majorSet.has(name) ? '★' : ' '} ${name}: ${flags}`)
  }

  const status = boundaryWarnings.length ? 'auto_review' : 'auto_v3'
  console.log(`\n→ 状態: ${status}` + (boundaryWarnings.length ? `（${boundaryWarnings.length}件要確認）` : ''))

  return { sections, status, boundaryWarnings }
}

async function main() {
  const argv = process.argv.slice(2)
  const lineFilter = (() => {
    const idx = argv.indexOf('--line')
    return idx >= 0 ? argv[idx + 1] : null
  })()
  const writeMode = argv.includes('--write')

  const rows = readRows()
  const targets = ODPT_RAILWAYS.filter((c) => !lineFilter || c.line === lineFilter)
  if (!targets.length) {
    console.log(`対象路線がありません（対応済み: ${ODPT_RAILWAYS.map((c) => c.line).join(', ')}）`)
    return
  }

  for (const cfg of targets) {
    const result = await analyzeLine(cfg, rows)
    if (result.error) {
      console.log(`✗ ${cfg.line}: ${result.error}`)
      continue
    }
    const { sections, status } = printReport(cfg, result)
    reinsertExtraStations(sections, result.trunkOrder, result.fullOrder)

    if (writeMode) {
      const newRows = sections.map((sec) => ({
        line: cfg.line,
        section: `${cfg.line}(${sec.startSt}〜${sec.endSt})`,
        trains: sec.freq,
        stations: sec.stations,
        status,
      }))
      const newAllRows = []
      let inserted = false
      for (const r of rows) {
        if (r.line !== cfg.line) { newAllRows.push(r); continue }
        if (!inserted) { newAllRows.push(...newRows); inserted = true }
      }
      writeRows(newAllRows)
      console.log(`\nCSV を更新しました: data/lines.csv（${cfg.line}, ${sections.length}区間, ${status}）`)

      // station-stops.json も ODPT 実測値で更新（Yahoo!近似より精度が高いため）
      let stationStops = {}
      try { stationStops = JSON.parse(fs.readFileSync(STATION_STOPS_PATH, 'utf8')) } catch { /* noop */ }
      const total = {}
      for (const [name, types] of Object.entries(result.stopCounts)) {
        total[name] = { total: Object.values(types).reduce((a, b) => a + b, 0), types }
      }
      stationStops[cfg.line] = total
      fs.writeFileSync(STATION_STOPS_PATH, JSON.stringify(stationStops, null, 2) + '\n')
      console.log(`station-stops.json を更新しました（${cfg.line}, ODPT実測）`)
    } else {
      console.log('\nドライランです。反映するには --write を付けてください。')
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
