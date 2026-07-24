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
 * 対象は ODPT_LINES に列挙した {line, operator} のみ。railway ID・上り方向は自動判定する
 * （odpt:Railway の駅名一致・destinationStation の集中度から推定。誤判定の可能性がある行は
 * auto_review/auto_fail に落として人手確認に回す＝止まらない自己検証は split-lines.cjs と同じ方針）。
 *
 * 使い方:
 *   node train-counts/odpt-verify-split.cjs --line 京王線          # ドライラン（1路線）
 *   node train-counts/odpt-verify-split.cjs --line 京王線 --write  # CSV に反映
 *   node train-counts/odpt-verify-split.cjs --all [--write]        # ODPT_LINES 全件を順に処理
 *
 * 必要な環境変数: ODPT_TOKEN（本体系）／ODPT_CHALLENGE_TOKEN（チャレンジ系。JR・京王等）
 */
require('../scripts/load-env.cjs')
const { readRows, writeRows } = require('../scripts/lines-csv.cjs')
const { relaxedMajorStations, RARE_TYPE_RATIO } = require('./relaxed-major-stations.cjs')
const path = require('path')
const fs = require('fs')

const STATION_STOPS_PATH = path.resolve(__dirname, 'station-stops.json')
const REPORT_PATH = path.resolve(__dirname, '../data/odpt-v3-report.md')

/** 区間本数が「同じ」とみなす差（split-lines.cjs の isSameFreq 相当）。 */
const isSameFreq = (a, b) => Math.abs(a - b) <= Math.max(5, Math.round(Math.min(a, b) * 0.1))

const REGULAR = { host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' }
const CHALLENGE = { host: 'https://api-challenge.odpt.org/api/v4', tokenEnv: 'ODPT_CHALLENGE_TOKEN' }

/** 事業者ID → API系統。odpt:Operator の一覧（本体/チャレンジ）から判明したもの。 */
const OPERATOR_TIER = {
  Keio: CHALLENGE, 'JR-East': CHALLENGE,
  Odakyu: REGULAR, Tokyu: REGULAR, Keisei: REGULAR, Keikyu: REGULAR, Sotetsu: CHALLENGE,
  Seibu: REGULAR, TokyoMetro: REGULAR, Toei: REGULAR, Tobu: CHALLENGE, KantoRailway: REGULAR,
  Hokuso: REGULAR, Shibayama: REGULAR, MIR: REGULAR, SaitamaRailway: REGULAR, ToyoRapid: REGULAR,
  TamaMonorail: REGULAR, TokyoMonorail: REGULAR, TWR: REGULAR, Minatomirai: REGULAR,
  YokohamaMunicipal: REGULAR,
  Aizu: CHALLENGE, ChibaMonorail: CHALLENGE, Chichibu: CHALLENGE, Choshi: CHALLENGE,
  Enoden: CHALLENGE, Fujikyu: CHALLENGE, Hitachinaka: CHALLENGE, Hokuetsu: CHALLENGE,
  Isumi: CHALLENGE, IzuHakone: CHALLENGE, Izukyu: CHALLENGE, Jomo: CHALLENGE, Joshin: CHALLENGE,
  KashimaRinkai: CHALLENGE, Kominato: CHALLENGE, Ryutetsu: CHALLENGE, SaitamaTransit: CHALLENGE,
  SendaiAirportTransit: CHALLENGE, SendaiMunicipal: CHALLENGE, ShonanMonorail: CHALLENGE,
  UtsunomiyaLightRail: CHALLENGE, WataraseKeikoku: CHALLENGE, Yagan: CHALLENGE,
  YokohamaSeaside: CHALLENGE, Yurikamome: REGULAR, OdakyuHakone: CHALLENGE,
}

/** CSVの表示名に付く事業者プレフィックス（ODPT dc:title は素の路線名のため剥がして比較する）。 */
const LINE_NAME_PREFIXES = [
  '東京メトロ', '都営', '横浜市営', '小田急', '東急', '西武', '東武', '京成', '京急',
  '相鉄', '北総', '芝山', '東葉高速', '埼玉高速', '埼玉新都市交通', '関東', '多摩都市', '京王',
]
function stripPrefix(name) {
  for (const p of LINE_NAME_PREFIXES) if (name.startsWith(p) && name.length > p.length) return name.slice(p.length)
  return name
}

/**
 * 処理対象。railway ID・方向は自動判定するので、line と operator だけ書けばよい
 * （自動判定に失敗する路線だけ railway を明記して上書きする）。
 *
 * 一覧は「実際に odpt:TrainTimetable を提供している事業者」を全数調査して絞り込んだもの
 * （2026-07: Odakyu/Tokyu/Keisei/Keikyu/Seibu/KantoRailway/Hokuso/Shibayama/SaitamaRailway/
 * ToyoRapid/Minatomirai/ChibaMonorail/TokyoMonorail、および小規模三セク会社の大半は
 * Operator/Station等のメタデータはあっても odpt:TrainTimetable が空で対象外だった）。
 */
const ODPT_LINES = [
  // 京王（チャレンジ系）
  { line: '京王線', operator: 'Keio' },
  { line: '井の頭線', operator: 'Keio' },
  { line: '高尾線', operator: 'Keio' },
  { line: '相模原線', operator: 'Keio' },
  { line: '動物園線', operator: 'Keio' },
  { line: '競馬場線', operator: 'Keio' },
  // 相鉄（チャレンジ系）
  { line: '相鉄本線', operator: 'Sotetsu' },
  { line: '相鉄いずみ野線', operator: 'Sotetsu' },
  { line: '相鉄新横浜線', operator: 'Sotetsu' },
  // 東京メトロ（本体系）
  { line: '東京メトロ丸ノ内線', operator: 'TokyoMetro' },
  { line: '東京メトロ千代田線', operator: 'TokyoMetro' },
  { line: '東京メトロ南北線', operator: 'TokyoMetro' },
  { line: '東京メトロ副都心線', operator: 'TokyoMetro' },
  { line: '東京メトロ銀座線', operator: 'TokyoMetro' },
  { line: '東京メトロ半蔵門線', operator: 'TokyoMetro' },
  { line: '東京メトロ日比谷線', operator: 'TokyoMetro' },
  { line: '東京メトロ東西線', operator: 'TokyoMetro' },
  { line: '東京メトロ有楽町線', operator: 'TokyoMetro' },
  // 都営（本体系）
  { line: '都営浅草線', operator: 'Toei' },
  { line: '都営三田線', operator: 'Toei' },
  { line: '都営新宿線', operator: 'Toei' },
  { line: '都営大江戸線', operator: 'Toei' },
  { line: '都電荒川線', operator: 'Toei' },
  { line: '日暮里・舎人ライナー', operator: 'Toei' },
  // 東武（チャレンジ系）
  { line: '東武伊勢崎線', operator: 'Tobu' },
  { line: '東武東上線', operator: 'Tobu' },
  { line: '東武日光線', operator: 'Tobu' },
  { line: '東武野田線', operator: 'Tobu', railway: 'Tobu.TobuUrbanPark' }, // ODPT表示名は「東武アーバンパークライン」
  { line: '東武亀戸線', operator: 'Tobu' },
  { line: '東武大師線', operator: 'Tobu' },
  { line: '東武越生線', operator: 'Tobu' },
  { line: '東武佐野線', operator: 'Tobu' },
  { line: '東武小泉線', operator: 'Tobu' },
  { line: '東武桐生線', operator: 'Tobu' },
  { line: '東武鬼怒川線', operator: 'Tobu' },
  { line: '東武宇都宮線', operator: 'Tobu' },
  // その他（本体系）
  { line: 'つくばエクスプレス', operator: 'MIR' },
  { line: '多摩都市モノレール線', operator: 'TamaMonorail', railway: 'TamaMonorail.TamaMonorail' },
  { line: 'りんかい線', operator: 'TWR' },
  { line: '横浜市営ブルーライン', operator: 'YokohamaMunicipal' },
  { line: '横浜市営グリーンライン', operator: 'YokohamaMunicipal' },
  // JR東日本（チャレンジ系）。CORRIDORS/SERVICE_LINES で扱う系統名（東北本線・東海道線・
  // 中央本線・総武線・常磐線・埼京線、およびその中の通称サービス名 京浜東北線・宇都宮線・
  // 湘南新宿ライン・横須賀線・中央線快速・中央総武各停・根岸線 等）は対象外
  // （trainSection の無いゾーンで区間分割すると build-railways.cjs 側の本数解決が
  // 壊れるため。詳しくは CLAUDE.md「CORRIDORS」の節を参照）。
  // JR東日本の odpt:TrainTimetable は首都圏近郊の一部路線のみ提供されており
  // （2026-07 全数調査）、以下以外（山手線=ループで駅順が組めない／川越線・吾妻線=
  // ブランド区間の一部しかカバーせず駅数が既存CSVの60%未満／上越線=特急4本のみで
  // 普通列車が未収録／それ以外の地方路線=odpt:TrainTimetable自体が空）は対象外。
  { line: '横浜線', operator: 'JR-East' },
  { line: '南武線', operator: 'JR-East' },
  { line: '八高線', operator: 'JR-East' },
  { line: '五日市線', operator: 'JR-East' },
  { line: '青梅線', operator: 'JR-East' },
  { line: '相模線', operator: 'JR-East' },
  { line: '伊東線', operator: 'JR-East' },
]

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

// 同一事業者に複数路線がある場合（東武12路線・東京メトロ9路線等）に駅・種別マスタを
// 使い回すためのキャッシュ。1事業者につき1回だけ取得する。
const stationNamesCache = new Map()
const trainTypeNamesCache = new Map()

/** 駅マスタ: "odpt.Station:Operator.Railway.Id" → 日本語名。事業者単位でキャッシュする。 */
async function fetchStationNames(host, operator, token) {
  if (stationNamesCache.has(operator)) return stationNamesCache.get(operator)
  const data = await fetchJson(`${host}/odpt:Station?odpt:operator=odpt.Operator:${operator}&acl:consumerKey=${token}`)
  const map = new Map()
  for (const s of data) map.set(s['owl:sameAs'], s['dc:title'])
  stationNamesCache.set(operator, map)
  return map
}

/** 種別マスタ: "odpt.TrainType:Operator.Type" → 日本語名（駅ポップアップ表示は日本語で統一する）。事業者単位でキャッシュする。 */
async function fetchTrainTypeNames(host, operator, token) {
  if (trainTypeNamesCache.has(operator)) return trainTypeNamesCache.get(operator)
  const data = await fetchJson(`${host}/odpt:TrainType?odpt:operator=odpt.Operator:${operator}&acl:consumerKey=${token}`)
  const map = new Map()
  for (const t of data) map.set(t['owl:sameAs'], t['dc:title'])
  trainTypeNamesCache.set(operator, map)
  return map
}

/** 事業者の路線一覧から、CSV表示名に最も合う railway ID を推定する。 */
const railwaysCache = new Map()
async function discoverRailway(host, operator, token, lineName) {
  if (!railwaysCache.has(operator)) {
    railwaysCache.set(operator, await fetchJson(`${host}/odpt:Railway?odpt:operator=odpt.Operator:${operator}&acl:consumerKey=${token}`))
  }
  const rails = railwaysCache.get(operator)
  const target = stripPrefix(lineName)
  let best = rails.find((r) => r['dc:title'] === lineName || r['dc:title'] === target)
  if (!best) {
    best = rails.find((r) => target.includes(r['dc:title']) || r['dc:title'].includes(target))
  }
  return { id: best ? best['owl:sameAs'].replace('odpt.Railway:', '') : null, candidates: rails.map((r) => r['dc:title']) }
}

/** 平日全列車を取得（両方向）。 */
async function fetchTimetables(host, railway, token) {
  return fetchJson(
    `${host}/odpt:TrainTimetable?odpt:railway=odpt.Railway:${railway}&odpt:calendar=odpt.Calendar:Weekday&acl:consumerKey=${token}`,
  )
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
    stops.push(station)
  }
  return stops
}

/**
 * 両方向のうち「上り」（片方の駅に収束する方向）を推定する。
 * 下りは複数の終着駅に分散し、上りは単一の主要駅にほぼ収束するという経験則を使う。
 */
function pickDirection(timetables) {
  // 方向値は Inbound/Outbound とは限らない（TokyoMetro/Toei 等は終着駅名を使った独自の
  // 方向ID、例: odpt.RailDirection:TokyoMetro.Ogikubo）。実際に出現した値でグルーピングする。
  const byDir = new Map()
  for (const t of timetables) {
    const dir = (t['odpt:railDirection'] || '').replace(/^odpt\.RailDirection:/, '')
    if (!dir) continue
    if (!byDir.has(dir)) byDir.set(dir, [])
    byDir.get(dir).push(t)
  }
  const concentration = (list) => {
    if (!list.length) return 0
    const counts = {}
    for (const t of list) {
      const dest = (t['odpt:destinationStation'] || []).join(',')
      counts[dest] = (counts[dest] || 0) + 1
    }
    return Math.max(...Object.values(counts)) / list.length
  }
  let best = null
  for (const [dir, list] of byDir) {
    const score = concentration(list)
    if (!best || score > best.score) best = { direction: dir, trains: list, score }
  }
  return best || { direction: null, trains: [] }
}

/**
 * 駅の物理順序を ODPT の時刻表そのものから復元する（各列車の停車駅の並びを鎖として
 * トポロジカルソート）。CSV に既存行が無い路線でも駅順が組み立てられる。
 */
function deriveOrder(timetables, stationNames) {
  const nextOf = new Map()
  const allNames = new Set()
  for (const t of timetables) {
    const names = extractStops(t['odpt:trainTimetableObject']).map((s) => stationNames.get(s)).filter(Boolean)
    for (const n of names) allNames.add(n)
    for (let i = 0; i < names.length - 1; i++) {
      if (!nextOf.has(names[i])) nextOf.set(names[i], new Set())
      nextOf.get(names[i]).add(names[i + 1])
    }
  }
  const inDegree = new Map([...allNames].map((n) => [n, 0]))
  for (const set of nextOf.values()) for (const n of set) inDegree.set(n, (inDegree.get(n) || 0) + 1)
  const queue = [...allNames].filter((n) => inDegree.get(n) === 0)
  const order = []
  const remaining = new Map(inDegree)
  while (queue.length) {
    const n = queue.shift()
    order.push(n)
    for (const m of (nextOf.get(n) || [])) {
      remaining.set(m, remaining.get(m) - 1)
      if (remaining.get(m) === 0) queue.push(m)
    }
  }
  return { order, ok: order.length === allNames.size, total: allNames.size }
}

/** data/lines.csv の既存行から、路線のトランク駅順（重複除去）を復元する（あれば優先使用）。 */
function trunkOrderFromCsv(line, rows) {
  const lineRows = rows.filter((r) => r.line === line && r.stations.length)
  const order = []
  for (const r of lineRows) {
    for (const st of r.stations) if (!order.includes(st)) order.push(st)
  }
  return order
}

/**
 * ODPT に出てこない駅（別 railway 扱いの分岐区間の駅、例: 京王新線の幡ヶ谷・初台）を、
 * 元の CSV 駅順（fullOrder）での位置関係を使って区間の駅リストに割り込ませる。
 */
function reinsertExtraStations(sections, odptOrder, fullOrder) {
  const odptSet = new Set(odptOrder)
  const extras = fullOrder.filter((s) => !odptSet.has(s))
  if (!extras.length) return sections
  for (const extra of extras) {
    const fullIdx = fullOrder.indexOf(extra)
    const prevOdptStation = [...fullOrder.slice(0, fullIdx)].reverse().find((s) => odptSet.has(s))
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
  const tier = OPERATOR_TIER[cfg.operator]
  if (!tier) return { error: `事業者 ${cfg.operator} のAPI系統が不明（OPERATOR_TIER未登録）` }
  const token = process.env[tier.tokenEnv]
  if (!token) return { error: `${tier.tokenEnv} が未設定` }

  const stationNames = await fetchStationNames(tier.host, cfg.operator, token)
  const trainTypeNames = await fetchTrainTypeNames(tier.host, cfg.operator, token)
  let railway = cfg.railway
  if (!railway) {
    const discovered = await discoverRailway(tier.host, cfg.operator, token, cfg.line)
    railway = discovered.id
    if (!railway) return { error: `railway ID を特定できず（候補: ${discovered.candidates.join('/')}）` }
  }

  const allTimetables = await fetchTimetables(tier.host, railway, token)
  if (!allTimetables.length) return { error: `${railway}: odpt:TrainTimetable が空（データ未提供）` }
  const { direction, trains: timetables } = pickDirection(allTimetables)
  if (!timetables.length) return { error: `${railway}: 有効な方向のデータなし` }

  const fullOrderCsv = trunkOrderFromCsv(cfg.line, rows)
  const { order: derivedOrder, ok: orderOk, total: derivedTotal } = deriveOrder(timetables, stationNames)
  if (!orderOk) {
    return { error: `駅順のトポロジカルソート失敗（駅${derivedTotal}中${derivedOrder.length}駅のみ整列。ループ/分岐路線の疑い）`, railway, direction }
  }
  // trunkOrder は常に ODPT 時刻表から実測した駅順を正とする（CSVの既存駅列は不完全・古い
  // 場合があるため信用しすぎない。例: つくばエクスプレスの旧CSV行は5駅分の暫定記載だった）。
  // CSVの既存駅列は「fullOrderCsvがderivedOrderを包含する superset」の場合だけ、
  // ODPTに出てこない追加駅（例: 京王新線の幡ヶ谷・初台）の割り込み先として使う。
  const trunkOrder = derivedOrder
  const isSuperset = fullOrderCsv.length > 0 && derivedOrder.every((s) => fullOrderCsv.includes(s))
  const fullOrder = isSuperset ? fullOrderCsv : derivedOrder
  if (trunkOrder.length < 2) return { error: `駅数が少なすぎる（${trunkOrder.length}駅）`, railway, direction }
  // 既存CSVの駅数に対してODPT側が大きく足りない場合、この railway ID はブランド名区間
  // （例: 東武伊勢崎線の都心側は別ID「東武スカイツリーライン」）等で路線の一部しか
  // カバーしていない疑いが強い。無自覚に書くと既存のより完全なデータを退行させてしまうため、
  // 書き込まず auto_fail にして手動確認に回す。
  if (fullOrderCsv.length >= 4 && trunkOrder.length < fullOrderCsv.length * 0.6) {
    return {
      error: `ODPT駅数(${trunkOrder.length})が既存CSV駅数(${fullOrderCsv.length})の60%未満。` +
        `別ブランド名の railway ID に分かれている疑いあり（例: 伊勢崎線/東武スカイツリーライン）。書き込みをスキップ`,
      railway, direction,
    }
  }

  const trunkIndex = new Map(trunkOrder.map((name, i) => [name, i]))
  const segCounts = new Array(trunkOrder.length - 1).fill(0)
  const stopCounts = {}
  let skippedTrains = 0

  const unmappedTypes = new Set()
  for (const t of timetables) {
    const rawType = t['odpt:trainType']
    let trainType = trainTypeNames.get(rawType)
    if (!trainType) {
      trainType = (rawType || '').replace(/^odpt\.TrainType:[^.]+\./, '')
      unmappedTypes.add(rawType)
    }
    const names = extractStops(t['odpt:trainTimetableObject']).map((s) => stationNames.get(s)).filter(Boolean)
    const idxs = names.map((n) => trunkIndex.get(n)).filter((i) => i !== undefined)
    if (!idxs.length) { skippedTrains++; continue }

    for (let i = 0; i < idxs.length - 1; i++) {
      const lo = Math.min(idxs[i], idxs[i + 1]), hi = Math.max(idxs[i], idxs[i + 1])
      for (let s = lo; s < hi; s++) segCounts[s]++
    }
    for (const n of names) {
      const idx = trunkIndex.get(n)
      if (idx === undefined) continue
      stopCounts[n] = stopCounts[n] || {}
      stopCounts[n][trainType] = (stopCounts[n][trainType] || 0) + 1
    }
  }

  return {
    trunkOrder, fullOrder, segCounts, stopCounts, skippedTrains, railway, direction,
    totalTrains: timetables.length, unmappedTypes: [...unmappedTypes],
  }
}

function buildReport(cfg, result) {
  const { trunkOrder, segCounts, stopCounts, skippedTrains, totalTrains, railway, direction } = result
  const lines = []
  lines.push(`\n=== ${cfg.line}（${cfg.operator} / ODPT ${railway}・${direction}・平日）===`)
  lines.push(`列車数: ${totalTrains}（区間内データなしでスキップ: ${skippedTrains}）`)
  if (result.unmappedTypes.length) {
    lines.push(`⚠ 種別名が日本語マスタに無く英語のまま: ${result.unmappedTypes.join(', ')}`)
  }

  const { majorTypes, result: majorSet } = relaxedMajorStations(trunkOrder, stopCounts)
  lines.push(`主要種別（路線内最大種別の${RARE_TYPE_RATIO * 100}%以上・周辺で運行実績があるもの）: ${majorTypes.join('/')}`)

  const boundaries = [0]
  for (let i = 1; i < segCounts.length; i++) {
    if (!isSameFreq(segCounts[i - 1], segCounts[i])) boundaries.push(i)
  }
  boundaries.push(segCounts.length)

  lines.push('区間案（実測本数の変化点で分割）:')
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
    lines.push(`  ${startSt}〜${endSt}: ${freq}本 (${endIdx - startIdx + 1}駅)` +
      (isMajorBoundary ? '' : `  ⚠始端「${startSt}」`) +
      (isMajorBoundaryEnd ? '' : `  ⚠終端「${endSt}」`))
  }

  const status = boundaryWarnings.length ? 'auto_review' : 'auto_v3'
  lines.push(`→ 状態: ${status}` + (boundaryWarnings.length ? `（${boundaryWarnings.length}件要確認）` : ''))

  return { sections, status, boundaryWarnings, text: lines.join('\n') }
}

async function main() {
  const argv = process.argv.slice(2)
  const lineFilter = (() => {
    const idx = argv.indexOf('--line')
    return idx >= 0 ? argv[idx + 1] : null
  })()
  const operatorFilter = (() => {
    const idx = argv.indexOf('--operator')
    return idx >= 0 ? argv[idx + 1] : null
  })()
  const writeMode = argv.includes('--write')
  const all = argv.includes('--all')

  const rows = readRows()
  const targets = ODPT_LINES.filter(
    (c) => (all || !lineFilter || c.line === lineFilter) && (!operatorFilter || c.operator === operatorFilter),
  )
  if (!targets.length) {
    console.log(`対象路線がありません（対応済み: ${ODPT_LINES.map((c) => c.line).join(', ')}）`)
    return
  }

  const reportSections = []
  for (const [i, cfg] of targets.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 300))
    console.log(`\n▶ ${cfg.line}（${cfg.operator}）`)
    let result
    try {
      result = await analyzeLine(cfg, rows)
    } catch (e) {
      result = { error: e.message }
    }
    if (result.error) {
      console.log(`✗ ${cfg.line}: ${result.error}`)
      reportSections.push(`## ${cfg.line}（${cfg.operator}）: auto_fail\n\n${result.error}\n`)
      continue
    }
    const { sections, status, text } = buildReport(cfg, result)
    console.log(text)
    reinsertExtraStations(sections, result.trunkOrder, result.fullOrder)
    reportSections.push(`## ${cfg.line}（${cfg.operator}）: ${status}\n\n\`\`\`\n${text}\n\`\`\`\n`)

    if (writeMode) {
      const newRows = sections.map((sec) => ({
        line: cfg.line,
        section: `${cfg.line}(${sec.startSt}〜${sec.endSt})`,
        trains: sec.freq,
        stations: sec.stations,
        status,
      }))
      const allRows = readRows()
      const newAllRows = []
      let inserted = false
      for (const r of allRows) {
        if (r.line !== cfg.line) { newAllRows.push(r); continue }
        if (!inserted) { newAllRows.push(...newRows); inserted = true }
      }
      if (!inserted) newAllRows.push(...newRows)
      writeRows(newAllRows)
      console.log(`CSV を更新しました: data/lines.csv（${cfg.line}, ${sections.length}区間, ${status}）`)

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
      console.log('ドライランです。反映するには --write を付けてください。')
    }
  }

  fs.writeFileSync(REPORT_PATH, `# ODPT auto_v3化 レポート\n\n${reportSections.join('\n')}`)
  console.log(`\nレポートを書き出しました: ${path.relative(process.cwd(), REPORT_PATH)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
