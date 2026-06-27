/**
 * 千葉県内の鉄道（JR 東日本＋私鉄・三セク）の路線・駅データを生成するビルドスクリプト。
 *
 * 入力（無料の公開データ。リポジトリには含めないので各自取得する）:
 *   - 国土数値情報 鉄道データ N02（GeoJSON）
 *       https://nlftp.mlit.go.jp/ksj/gml/data/N02/N02-23/N02-23_GML.zip
 *       展開後の N02-23_RailroadSection.geojson / N02-23_Station.geojson
 *   - 都道府県境界 GeoJSON（千葉県ポリゴンの切り出しに使用）
 *       https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson
 *
 * 使い方:
 *   N02_DIR=/path/to/N02/UTF-8 JAPAN_GEOJSON=/path/to/japan.geojson \
 *     node scripts/build-chiba-jr.cjs
 *   （既定では ./.data/ 配下を参照する）
 *
 * 出力（リポジトリにコミットする静的データ）:
 *   - public/data/chiba-railways.geojson  路線（路線ごとの MultiLineString、category=jr|private）
 *   - public/data/chiba-stations.geojson  駅（Point。isJr/isPrivate/major）
 */
const fs = require('fs')
const path = require('path')
const { readRows, toSections, toTrains } = require('./lines-csv.cjs')

const N02_DIR = process.env.N02_DIR || path.resolve(__dirname, '../.data/N02/UTF-8')
const JAPAN_GEOJSON =
  process.env.JAPAN_GEOJSON || path.resolve(__dirname, '../.data/japan.geojson')
const OUT_DIR = path.resolve(__dirname, '../public/data')

const JR_OPERATOR = '東日本旅客鉄道'
const CHIBA_ID = 12

/** 本数が見つからない路線の既定値。 */
const DEFAULT_TRAINS = 30

// 区間定義・本数は data/chiba-lines.csv（手編集）から読み込む。
const CSV_ROWS = readRows()
const LINE_SECTIONS = toSections(CSV_ROWS) // { 路線名: [{label, stations}] }
const TRAINS = toTrains(CSV_ROWS) // { 区間 or 路線: 本数 }

/**
 * 私鉄の路線表示名の補正（事業者名|N02路線名 → 表示名）。
 * 「本線」「1号線」など事業者をまたいで重複・曖昧な名前を分かりやすくする。
 */
const LINE_NAME_OVERRIDES = {
  '京成電鉄|本線': '京成本線',
  '京成電鉄|千葉線': '京成千葉線',
  '京成電鉄|千原線': '京成千原線',
  '京成電鉄|東成田線': '京成東成田線',
  '京成電鉄|成田空港線': '成田スカイアクセス線',
  '千葉都市モノレール|1号線': '千葉モノレール1号線',
  '千葉都市モノレール|2号線': '千葉モノレール2号線',
  '東京地下鉄|5号線東西線': '東京メトロ東西線',
  '東京都|10号線新宿線': '都営新宿線',
  '東武鉄道|野田線': '東武野田線',
  '首都圏新都市鉄道|常磐新線': 'つくばエクスプレス',
}

/** 路線カラー（白地図上で識別しやすい配色）。表示名でひく。 */
const LINE_COLORS = {
  // JR 東日本
  総武線: '#F2C500',
  京葉線: '#C9252F',
  外房線: '#E8382C',
  内房線: '#1E78C8',
  成田線: '#2EA84F',
  東金線: '#F08300',
  久留里線: '#D6418D',
  武蔵野線: '#8E44AD',
  常磐線: '#00A0A0',
  鹿島線: '#7F5A3C',
  // 私鉄・三セク
  京成本線: '#005BAC',
  京成千葉線: '#3DA9E0',
  京成千原線: '#67A82E',
  京成東成田線: '#9E7BB5',
  成田スカイアクセス線: '#EE7800',
  北総線: '#13469B',
  新京成線: '#E85298',
  東京メトロ東西線: '#009BBF',
  都営新宿線: '#6CBB5A',
  東武野田線: '#54B948',
  東葉高速線: '#B5651D',
  千葉モノレール1号線: '#00838F',
  千葉モノレール2号線: '#4DB6AC',
  つくばエクスプレス: '#1B2F8A',
  小湊鐵道線: '#D7003A',
  いすみ線: '#F2B500',
  ユーカリが丘線: '#8C8C8C',
  ディズニーリゾートライン: '#FF77AA',
  銚子電気鉄道線: '#7A4FBF',
  芝山鉄道線: '#9A9A33',
  流山線: '#C2185B',
}
const DEFAULT_COLOR = '#666666'

/** 乗換駅に加えて主要駅（ターミナル・拠点）としてラベルを出す駅。 */
const MAJOR_STATIONS = new Set([
  // JR
  '千葉', '船橋', '西船橋', '津田沼', '稲毛', '市川', '本八幡',
  '松戸', '柏', '我孫子', '成田', '成田空港', '空港第２ビル',
  '佐倉', '銚子', '八日市場', '旭', '成東', '東金', '大網',
  '茂原', '上総一ノ宮', '勝浦', '安房鴨川', '館山', '君津',
  '木更津', '五井', '蘇我', '大原', '久留里', '上総亀山',
  '香取', '佐原', '松岸', '新松戸', '海浜幕張', '舞浜',
  // 私鉄の拠点
  '京成船橋', '京成津田沼', '京成成田', '京成千葉', '千葉中央',
  '新鎌ヶ谷', '勝田台', '八千代台', '北習志野', '流山おおたかの森',
  'ユーカリが丘', '五香',
])

function load(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

// --- 千葉県ポリゴンによる内外判定 ---
function buildChibaTest(japan) {
  const chiba = japan.features.find((f) => f.properties.id === CHIBA_ID)
  if (!chiba) throw new Error('千葉県のフィーチャが見つかりません')
  const polys = []
  const g = chiba.geometry
  if (g.type === 'Polygon') polys.push(g.coordinates)
  else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => polys.push(p))

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  polys.forEach((p) =>
    p[0].forEach(([x, y]) => {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }),
  )
  const inRing = (x, y, ring) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1]
      const xj = ring[j][0], yj = ring[j][1]
      const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      if (hit) inside = !inside
    }
    return inside
  }
  return (x, y) => {
    if (x < minX || x > maxX || y < minY || y > maxY) return false
    for (const poly of polys) {
      if (inRing(x, y, poly[0])) {
        let hole = false
        for (let k = 1; k < poly.length; k++) {
          if (inRing(x, y, poly[k])) { hole = true; break }
        }
        if (!hole) return true
      }
    }
    return false
  }
}

/** LineString の中点（代表点）。 */
function midPoint(coords) {
  return coords[Math.floor(coords.length / 2)]
}

/** 座標列の重心（駅の代表点に使う）。 */
function centroid(coords) {
  let sx = 0, sy = 0
  for (const [x, y] of coords) { sx += x; sy += y }
  return [sx / coords.length, sy / coords.length]
}

/** N02 の事業者名・路線名から表示用の路線名を決める。 */
function displayLineName(operator, rawName) {
  return LINE_NAME_OVERRIDES[`${operator}|${rawName}`] || rawName
}

function main() {
  const japan = load(JAPAN_GEOJSON)
  const inChiba = buildChibaTest(japan)
  const rs = load(path.join(N02_DIR, 'N02-23_RailroadSection.geojson'))
  const st = load(path.join(N02_DIR, 'N02-23_Station.geojson'))

  // 駅名 → 区間ラベル（区間定義のある JR 路線のみ）。
  const stationToSection = {} // 路線名 -> { 駅名: label }
  for (const [line, secs] of Object.entries(LINE_SECTIONS)) {
    const m = (stationToSection[line] = {})
    for (const s of secs) for (const name of s.stations) m[name] = s.label
  }
  // 区間割り当て用に、JR 路線ごとの駅座標を集める。
  const jrLineStations = {} // 路線名 -> [{ name, x, y }]
  for (const f of st.features) {
    if (f.properties.N02_004 !== JR_OPERATOR) continue
    const ln = f.properties.N02_003
    if (!LINE_SECTIONS[ln]) continue
    const [cx, cy] = centroid(f.geometry.coordinates)
    if (!inChiba(cx, cy)) continue
    ;(jrLineStations[ln] = jrLineStations[ln] || []).push({ name: f.properties.N02_005, x: cx, y: cy })
  }
  // 点に最も近い駅の区間ラベルを返す。
  const sectionOf = (line, x, y) => {
    let best = null, bestD = Infinity
    for (const s of jrLineStations[line] || []) {
      const d = (s.x - x) ** 2 + (s.y - y) ** 2
      if (d < bestD) { bestD = d; best = s.name }
    }
    return (best && stationToSection[line][best]) || LINE_SECTIONS[line][0].label
  }

  // --- 路線: Chiba 内のセグメントを「区間ラベル（区間定義あり）」または
  //     「表示路線名（区間定義なし）」ごとに MultiLineString へまとめる ---
  const lines = {} // キー -> { coords:[], category, line(親), section? }
  for (const f of rs.features) {
    const [mx, my] = midPoint(f.geometry.coordinates)
    if (!inChiba(mx, my)) continue
    const op = f.properties.N02_004
    const name = displayLineName(op, f.properties.N02_003)
    const category = op === JR_OPERATOR ? 'jr' : 'private'
    let key = name, section
    if (op === JR_OPERATOR && LINE_SECTIONS[name]) {
      section = sectionOf(name, mx, my)
      key = section
    }
    const e = (lines[key] = lines[key] || { coords: [], category, line: name, section })
    e.coords.push(f.geometry.coordinates)
  }
  const railwayFeatures = Object.keys(lines).map((key) => {
    const e = lines[key]
    const props = {
      line: e.line,
      category: e.category,
      color: LINE_COLORS[e.line] || DEFAULT_COLOR,
      trains: TRAINS[key] ?? DEFAULT_TRAINS,
    }
    if (e.section) props.section = e.section
    return { type: 'Feature', properties: props, geometry: { type: 'MultiLineString', coordinates: e.coords } }
  })
  // 並びを JR → 私鉄、路線名、区間 にする。
  railwayFeatures.sort((a, b) => {
    if (a.properties.category !== b.properties.category)
      return a.properties.category === 'jr' ? -1 : 1
    if (a.properties.line !== b.properties.line)
      return a.properties.line.localeCompare(b.properties.line, 'ja')
    return (a.properties.section || '').localeCompare(b.properties.section || '', 'ja')
  })

  // --- 駅: 駅名で集約（乗換駅は複数路線をまとめて 1 点に）---
  const stationMap = {} // 駅名 -> { pts:[], lines:Set, jr, priv }
  for (const f of st.features) {
    const c = f.geometry.coordinates
    const [cx, cy] = centroid(c)
    if (!inChiba(cx, cy)) continue
    const op = f.properties.N02_004
    const name = f.properties.N02_005
    const e = (stationMap[name] =
      stationMap[name] || { pts: [], lines: new Set(), jr: false, priv: false })
    e.pts.push([cx, cy])
    e.lines.add(displayLineName(op, f.properties.N02_003))
    if (op === JR_OPERATOR) e.jr = true
    else e.priv = true
  }
  const stationFeatures = Object.entries(stationMap)
    .map(([name, e]) => {
      const [x, y] = centroid(e.pts)
      const lineList = [...e.lines]
      const major = lineList.length > 1 || MAJOR_STATIONS.has(name)
      return {
        type: 'Feature',
        properties: { name, lines: lineList, isJr: e.jr, isPrivate: e.priv, major },
        geometry: { type: 'Point', coordinates: [x, y] },
      }
    })
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'ja'))

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const railways = { type: 'FeatureCollection', features: railwayFeatures }
  const stations = { type: 'FeatureCollection', features: stationFeatures }
  fs.writeFileSync(path.join(OUT_DIR, 'chiba-railways.geojson'), JSON.stringify(railways))
  fs.writeFileSync(path.join(OUT_DIR, 'chiba-stations.geojson'), JSON.stringify(stations))

  const jrLines = railwayFeatures.filter((f) => f.properties.category === 'jr')
  const pvLines = railwayFeatures.filter((f) => f.properties.category === 'private')
  const majorCount = stationFeatures.filter((f) => f.properties.major).length
  console.log(`路線フィーチャ: JR ${jrLines.length} / 私鉄 ${pvLines.length}`)
  railwayFeatures.forEach((f) => {
    const p = f.properties
    const label = p.section ? `${p.line} ／ ${p.section}` : p.line
    console.log(`  [${p.category}] ${String(p.trains).padStart(4)}本  ${label}`)
  })
  console.log(`駅: ${stationFeatures.length}（主要 ${majorCount}）`)
}

main()
