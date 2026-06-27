/**
 * 千葉県内の JR 東日本 路線・駅データを生成するビルドスクリプト。
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
 *
 * 出力（リポジトリにコミットする静的データ）:
 *   - public/data/chiba-jr-railways.geojson  路線（路線ごとの MultiLineString）
 *   - public/data/chiba-jr-stations.geojson  駅（Point。major=主要駅フラグ）
 */
const fs = require('fs')
const path = require('path')

const N02_DIR = process.env.N02_DIR || path.resolve(__dirname, '../.data/N02/UTF-8')
const JAPAN_GEOJSON =
  process.env.JAPAN_GEOJSON || path.resolve(__dirname, '../.data/japan.geojson')
const OUT_DIR = path.resolve(__dirname, '../public/data')

const JR = '東日本旅客鉄道'
const CHIBA_ID = 12

/** 路線カラー（白地図上で識別しやすい配色）。 */
const LINE_COLORS = {
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
}
const DEFAULT_COLOR = '#666666'

/** 乗換駅に加えて主要駅（ターミナル・拠点）としてラベルを出す駅。 */
const MAJOR_STATIONS = new Set([
  '千葉', '船橋', '西船橋', '津田沼', '稲毛', '市川', '本八幡',
  '松戸', '柏', '我孫子', '成田', '成田空港', '空港第２ビル',
  '佐倉', '銚子', '八日市場', '旭', '成東', '東金', '大網',
  '茂原', '上総一ノ宮', '勝浦', '安房鴨川', '館山', '君津',
  '木更津', '五井', '蘇我', '大原', '久留里', '上総亀山',
  '香取', '佐原', '松岸', '新松戸', '海浜幕張', '舞浜',
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

function main() {
  const japan = load(JAPAN_GEOJSON)
  const inChiba = buildChibaTest(japan)
  const rs = load(path.join(N02_DIR, 'N02-23_RailroadSection.geojson'))
  const st = load(path.join(N02_DIR, 'N02-23_Station.geojson'))

  // --- 路線: 路線名ごとに Chiba 内のセグメントを MultiLineString にまとめる ---
  const lineCoords = {} // 路線名 -> 座標列の配列
  for (const f of rs.features) {
    if (f.properties.N02_004 !== JR) continue
    const [mx, my] = midPoint(f.geometry.coordinates)
    if (!inChiba(mx, my)) continue
    const ln = f.properties.N02_003
    ;(lineCoords[ln] = lineCoords[ln] || []).push(f.geometry.coordinates)
  }
  const railwayFeatures = Object.keys(lineCoords)
    .sort()
    .map((ln) => ({
      type: 'Feature',
      properties: { line: ln, color: LINE_COLORS[ln] || DEFAULT_COLOR },
      geometry: { type: 'MultiLineString', coordinates: lineCoords[ln] },
    }))

  // --- 駅: 駅名で集約（乗換駅は複数路線をまとめて 1 点に）---
  const stationMap = {} // 駅名 -> { pts:[[x,y]], lines:Set }
  for (const f of st.features) {
    if (f.properties.N02_004 !== JR) continue
    const c = f.geometry.coordinates
    const [cx, cy] = centroid(c)
    if (!inChiba(cx, cy)) continue
    const name = f.properties.N02_005
    const ln = f.properties.N02_003
    const e = (stationMap[name] = stationMap[name] || { pts: [], lines: new Set() })
    e.pts.push([cx, cy])
    e.lines.add(ln)
  }
  const stationFeatures = Object.entries(stationMap)
    .map(([name, e]) => {
      const [x, y] = centroid(e.pts)
      const lines = [...e.lines]
      const major = lines.length > 1 || MAJOR_STATIONS.has(name)
      return {
        type: 'Feature',
        properties: { name, lines, major },
        geometry: { type: 'Point', coordinates: [x, y] },
      }
    })
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'ja'))

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const railways = { type: 'FeatureCollection', features: railwayFeatures }
  const stations = { type: 'FeatureCollection', features: stationFeatures }
  fs.writeFileSync(path.join(OUT_DIR, 'chiba-jr-railways.geojson'), JSON.stringify(railways))
  fs.writeFileSync(path.join(OUT_DIR, 'chiba-jr-stations.geojson'), JSON.stringify(stations))

  const majorCount = stationFeatures.filter((f) => f.properties.major).length
  console.log(`路線: ${railwayFeatures.length} 本`)
  railwayFeatures.forEach((f) =>
    console.log(`  ${f.properties.line} (${f.geometry.coordinates.length} seg) ${f.properties.color}`),
  )
  console.log(`駅: ${stationFeatures.length} 駅（うち主要駅ラベル ${majorCount}）`)
}

main()
