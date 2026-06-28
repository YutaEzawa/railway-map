/**
 * 南関東一都三県（埼玉・千葉・東京・神奈川）の鉄道（JR 東日本＋私鉄・三セク）の
 * 路線・駅データを生成するビルドスクリプト。
 *
 * 入力（無料の公開データ。リポジトリには含めないので各自取得する）:
 *   - 国土数値情報 鉄道データ N02（GeoJSON。全国版）
 *       https://nlftp.mlit.go.jp/ksj/gml/data/N02/N02-23/N02-23_GML.zip
 *       展開後の N02-23_RailroadSection.geojson / N02-23_Station.geojson
 *   - 都道府県境界 GeoJSON（対象都県ポリゴンの切り出しに使用）
 *       https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson
 *
 * 使い方:
 *   N02_DIR=/path/to/N02/UTF-8 JAPAN_GEOJSON=/path/to/japan.geojson \
 *     node scripts/build-railways.cjs
 *   （既定では ./.data/ 配下を参照する）
 *
 * 出力（リポジトリにコミットする静的データ）:
 *   - public/data/railways.geojson  路線（路線ごとの MultiLineString、category=jr|private）
 *   - public/data/stations.geojson  駅（Point。isJr/isPrivate/major）
 */
require('./load-env.cjs')
const fs = require('fs')
const path = require('path')
const { readRows, toSections, toTrains } = require('./lines-csv.cjs')

const N02_DIR = process.env.N02_DIR || path.resolve(__dirname, '../.data/N02/UTF-8')
const JAPAN_GEOJSON =
  process.env.JAPAN_GEOJSON || path.resolve(__dirname, '../.data/japan.geojson')
const OUT_DIR = path.resolve(__dirname, '../public/data')

const JR_OPERATOR = '東日本旅客鉄道'
/** 対象都県（japan.geojson の id）。埼玉=11 / 千葉=12 / 東京=13 / 神奈川=14。 */
const TARGET_PREF_IDS = [11, 12, 13, 14]

/** 本数が見つからない路線の既定値。 */
const DEFAULT_TRAINS = 30

/** 同名駅を同一駅とみなす最大距離（度。約 2km）。これを超えると別駅として分割。 */
const STATION_CLUSTER_DIST = 0.02

// 区間定義・本数は data/lines.csv（手編集）から読み込む。
const CSV_ROWS = readRows()
const LINE_SECTIONS = toSections(CSV_ROWS) // { 路線名: [{label, stations}] }
const TRAINS = toTrains(CSV_ROWS) // { 区間 or 路線: 本数 }

/**
 * 複々線で各駅停車・快速を並べて表示する路線（並走サービス）。
 * N02 の 1 本の路線ジオメトリを、サービスごとに line-offset でずらして 2 本描く。
 * 対象区間（駅集合）と各サービスの本数は CSV の各サービス行（路線名＝サービス名）から取る。
 * baseN02: 元の N02 路線名（displayName）。offset: 並走の左右（+/-1）。
 */
const SERVICE_LINES = {
  総武線: [
    { name: '総武線各駅停車', color: '#FFD400', offset: 1 },
    { name: '総武線快速', color: '#0072BC', offset: -1 },
  ],
  常磐線: [
    { name: '常磐線各駅停車', color: '#00B261', offset: 1 },
    { name: '常磐線快速', color: '#1FA8E0', offset: -1 },
  ],
}
// 並走対象区間の駅集合（baseN02 -> Set(駅名)）。各サービス行の駅の和集合。
const SERVICE_STATION_SET = {}
for (const [base, services] of Object.entries(SERVICE_LINES)) {
  const set = (SERVICE_STATION_SET[base] = new Set())
  for (const sv of services) {
    const row = CSV_ROWS.find((r) => r.line === sv.name)
    if (row) for (const st of row.stations) set.add(st)
  }
}

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
  '東武鉄道|伊勢崎線': '東武伊勢崎線',
  '東武鉄道|東上本線': '東武東上線',
  '東武鉄道|日光線': '東武日光線',
  '東武鉄道|亀戸線': '東武亀戸線',
  '東武鉄道|越生線': '東武越生線',
  '京成電鉄|押上線': '京成押上線',
  '京成電鉄|金町線': '京成金町線',
  '首都圏新都市鉄道|常磐新線': 'つくばエクスプレス',
  // 在圏内で別事業者が同名になる路線の分離（統合されると別路線が 1 本になる）。
  '京浜急行電鉄|本線': '京急本線',
  '京浜急行電鉄|大師線': '京急大師線',
  '東武鉄道|大師線': '東武大師線',
  // 東京メトロ（N02 は「N号線◯◯線」表記。東西線は上で定義済み）。
  '東京地下鉄|3号線銀座線': '東京メトロ銀座線',
  '東京地下鉄|4号線丸ノ内線': '東京メトロ丸ノ内線',
  '東京地下鉄|4号線丸ノ内線分岐線': '東京メトロ丸ノ内線',
  '東京地下鉄|2号線日比谷線': '東京メトロ日比谷線',
  '東京地下鉄|9号線千代田線': '東京メトロ千代田線',
  '東京地下鉄|8号線有楽町線': '東京メトロ有楽町線',
  '東京地下鉄|11号線半蔵門線': '東京メトロ半蔵門線',
  '東京地下鉄|7号線南北線': '東京メトロ南北線',
  '東京地下鉄|13号線副都心線': '東京メトロ副都心線',
  // 都営地下鉄・都電（新宿線は上で定義済み）。
  '東京都|1号線浅草線': '都営浅草線',
  '東京都|6号線三田線': '都営三田線',
  '東京都|12号線大江戸線': '都営大江戸線',
  '東京都|荒川線': '都電荒川線',
  // 横浜市営地下鉄（1号線＋3号線＝ブルーライン、4号線＝グリーンライン）。
  '横浜市|1号線': '横浜市営ブルーライン',
  '横浜市|3号線': '横浜市営ブルーライン',
  '横浜市|4号線': '横浜市営グリーンライン',
  // 京急（本線・大師線は上で定義済み）。
  '京浜急行電鉄|空港線': '京急空港線',
  '京浜急行電鉄|久里浜線': '京急久里浜線',
  '京浜急行電鉄|逗子線': '京急逗子線',
  // 西武（他社にも同名・あいまい名がある路線を明示）。
  '西武鉄道|池袋線': '西武池袋線',
  '西武鉄道|新宿線': '西武新宿線',
  '西武鉄道|多摩川線': '西武多摩川線',
  '西武鉄道|山口線': '西武山口線',
  // 小田急（湘南モノレール「江の島線」と紛らわしいため）。
  '小田急電鉄|江ノ島線': '小田急江ノ島線',
  // 新交通・モノレール・登山鉄道などの分かりにくい N02 名。
  'ゆりかもめ|東京臨海新交通臨海線': 'ゆりかもめ',
  '東京臨海高速鉄道|臨海副都心線': 'りんかい線',
  '湘南モノレール|江の島線': '湘南モノレール',
  '江ノ島電鉄|江ノ島電鉄線': '江ノ島電鉄',
  '埼玉新都市交通|伊奈線': 'ニューシャトル',
  '箱根登山鉄道|鉄道線': '箱根登山鉄道',
  '箱根登山鉄道|鋼索線': '箱根登山ケーブルカー',
  '御岳登山鉄道|ケーブルカー': '御岳登山ケーブルカー',
  '高尾登山電鉄|高尾鋼索線': '高尾登山ケーブルカー',
  '大山観光電鉄|大山鋼索線': '大山ケーブルカー',
  '伊豆箱根鉄道|大雄山線': '伊豆箱根大雄山線',
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

  // ===== 南関東への拡大で追加（各社公式のラインカラーをベースに） =====
  // JR 東日本（駅ナンバリングのラインカラー）
  山手線: '#9ACD32',
  根岸線: '#00BAE8', // 京浜東北・根岸線
  東北線: '#00BAE8', // 京浜東北線（東京〜大宮）
  東海道線: '#F68B1E',
  高崎線: '#F68B1E',
  中央線: '#F15A22', // 中央線快速
  青梅線: '#F15A22',
  五日市線: '#F15A22',
  横須賀線: '#0072BC',
  横浜線: '#80C342',
  南武線: '#FBD05D',
  鶴見線: '#FFD400',
  八高線: '#A8A39D',
  川越線: '#00AC9A', // 川越線・埼京線
  赤羽線: '#00AC9A', // 埼京線（池袋〜赤羽）
  相模線: '#009793',
  東北新幹線: '#2CA13A',
  上越新幹線: '#2CA13A',
  // JR 東海
  東海道新幹線: '#2E5BA0',
  御殿場線: '#F77F00',
  // 東京メトロ（公式コーポレートカラー）
  東京メトロ銀座線: '#FF9500',
  東京メトロ丸ノ内線: '#F62E36',
  東京メトロ日比谷線: '#B5B5AC',
  東京メトロ千代田線: '#00BB85',
  東京メトロ有楽町線: '#C1A470',
  東京メトロ半蔵門線: '#8F76D6',
  東京メトロ南北線: '#00ADA9',
  東京メトロ副都心線: '#9C5E31',
  // 都営地下鉄・都電
  都営浅草線: '#E85298',
  都営三田線: '#0079C2',
  都営大江戸線: '#B6007A',
  都電荒川線: '#E60012',
  // 横浜市営地下鉄
  横浜市営ブルーライン: '#0070C0',
  横浜市営グリーンライン: '#00A650',
  金沢シーサイドライン: '#0091D2',
  // 京王
  京王線: '#DD0077',
  高尾線: '#DD0077',
  相模原線: '#DD0077',
  競馬場線: '#DD0077',
  動物園線: '#DD0077',
  井の頭線: '#0079C3',
  // 小田急
  小田原線: '#0067C0',
  小田急江ノ島線: '#0067C0',
  多摩線: '#0067C0',
  // 東急
  東横線: '#DA0442',
  目黒線: '#009CD2',
  田園都市線: '#20A23B',
  大井町線: '#F18D00',
  池上線: '#EE86A8',
  東急多摩川線: '#B4007F',
  世田谷線: '#FABE00',
  こどもの国線: '#6BBF4B',
  東急新横浜線: '#00A0B0',
  // 京急（空港線のみエアポート青、他は京急レッド）
  京急本線: '#E60012',
  京急久里浜線: '#E60012',
  京急逗子線: '#E60012',
  京急大師線: '#E60012',
  京急空港線: '#0099D9',
  // 西武（西武ブルー）
  西武池袋線: '#00A0E9',
  西武新宿線: '#00A0E9',
  西武秩父線: '#00A0E9',
  拝島線: '#00A0E9',
  多摩湖線: '#00A0E9',
  西武多摩川線: '#00A0E9',
  国分寺線: '#00A0E9',
  西武山口線: '#00A0E9',
  狭山線: '#00A0E9',
  西武園線: '#00A0E9',
  西武有楽町線: '#00A0E9',
  豊島線: '#00A0E9',
  // 東武（東武ブルー。野田線は上で定義済み）
  東武伊勢崎線: '#006FBC',
  東武東上線: '#006FBC',
  東武日光線: '#006FBC',
  東武亀戸線: '#006FBC',
  東武大師線: '#006FBC',
  東武越生線: '#006FBC',
  // 相鉄（YOKOHAMA NAVYBLUE）
  相鉄本線: '#002B7F',
  相鉄いずみ野線: '#002B7F',
  相鉄新横浜線: '#002B7F',
  // 京成（押上線・金町線は京成ブルー）
  京成押上線: '#005BAC',
  京成金町線: '#005BAC',
  // 新交通・モノレール・その他
  ゆりかもめ: '#0068B7',
  りんかい線: '#00A0C6',
  東京モノレール羽田線: '#C8102E',
  多摩都市モノレール線: '#6FB92C',
  埼玉高速鉄道線: '#0086CB',
  ニューシャトル: '#6CBE45',
  '日暮里・舎人ライナー': '#C9258B',
  みなとみらい21線: '#0B318F',
  江ノ島電鉄: '#009844',
  湘南モノレール: '#2B57A6',
  箱根登山鉄道: '#E60012',
  箱根登山ケーブルカー: '#F39800',
  御岳登山ケーブルカー: '#009844',
  高尾登山ケーブルカー: '#E60012',
  大山ケーブルカー: '#006FBC',
  伊豆箱根大雄山線: '#1267B5',
  秩父本線: '#00913A',
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

// --- 対象都県ポリゴンによる内外判定（複数都県の和集合） ---
function buildPrefTest(japan, ids) {
  const polys = []
  for (const id of ids) {
    const pref = japan.features.find((f) => f.properties.id === id)
    if (!pref) throw new Error(`都県フィーチャが見つかりません: id=${id}`)
    const g = pref.geometry
    if (g.type === 'Polygon') polys.push(g.coordinates)
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => polys.push(p))
  }

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

/** セグメントの座標を西→東（経度が増える向き）に揃える。 */
function orientWestEast(coords) {
  return coords[0][0] <= coords[coords.length - 1][0] ? coords : coords.slice().reverse()
}

function main() {
  const japan = load(JAPAN_GEOJSON)
  const inTarget = buildPrefTest(japan, TARGET_PREF_IDS)
  const rs = load(path.join(N02_DIR, 'N02-23_RailroadSection.geojson'))
  const st = load(path.join(N02_DIR, 'N02-23_Station.geojson'))

  // 駅名 → 区間ラベル（区間定義のある JR 路線のみ）。
  const stationToSection = {} // 路線名 -> { 駅名: label }
  for (const [line, secs] of Object.entries(LINE_SECTIONS)) {
    const m = (stationToSection[line] = {})
    for (const s of secs) for (const name of s.stations) m[name] = s.label
  }
  // 区間割り当て用に、区間定義のある路線（事業者問わず）の駅座標を集める。
  const lineStations = {} // 表示路線名 -> [{ name, x, y }]
  for (const f of st.features) {
    const ln = displayLineName(f.properties.N02_004, f.properties.N02_003)
    if (!LINE_SECTIONS[ln] && !SERVICE_LINES[ln]) continue
    const [cx, cy] = centroid(f.geometry.coordinates)
    if (!inTarget(cx, cy)) continue
    ;(lineStations[ln] = lineStations[ln] || []).push({ name: f.properties.N02_005, x: cx, y: cy })
  }
  // 点に最も近い駅名を返す。
  const nearestStation = (line, x, y) => {
    let best = null, bestD = Infinity
    for (const s of lineStations[line] || []) {
      const d = (s.x - x) ** 2 + (s.y - y) ** 2
      if (d < bestD) { bestD = d; best = s.name }
    }
    return best
  }
  const sectionOf = (line, x, y) =>
    (stationToSection[line][nearestStation(line, x, y)] || '') || LINE_SECTIONS[line][0].label
  // セグメントが並走サービス区間（複々線）に入っているか。
  // 両端の最寄り駅がともに区間内のときだけ並走にする（境界の外側へはみ出さない）。
  const inServiceZone = (line, coords) => {
    const set = SERVICE_STATION_SET[line]
    if (!set) return false
    const a = coords[0]
    const b = coords[coords.length - 1]
    const na = nearestStation(line, a[0], a[1])
    const nb = nearestStation(line, b[0], b[1])
    return !!na && !!nb && set.has(na) && set.has(nb)
  }

  // --- 路線: 対象都県内のセグメントを出力先（区間ラベル / 並走サービス / 路線名）へ
  //     振り分けて MultiLineString へまとめる。並走サービスは 1 セグメントを複数出力 ---
  // 採否は「いずれかの頂点が圏内（約1kmのバッファ込み）」。中点だけだと東京湾の
  // 埋立地・人工島を渡る区間（ゆりかもめのお台場ループ、東京モノレールの整備場〜
  // 昭和島など）の頂点が、海上で粗い県境ポリゴンの外に落ちて区間が欠落するため、
  // 県境から少し外側まで含める。
  // 約0.8km。湾岸の埋立地区間を拾いつつ、隣県（茨城の常総線など）を巻き込まない値。
  const BORDER_BUFFER = 0.008
  const nearTarget = (x, y) =>
    inTarget(x, y) ||
    inTarget(x + BORDER_BUFFER, y) ||
    inTarget(x - BORDER_BUFFER, y) ||
    inTarget(x, y + BORDER_BUFFER) ||
    inTarget(x, y - BORDER_BUFFER)
  const lines = {} // キー -> { coords, category, line, color, section?, offset? }
  for (const f of rs.features) {
    if (!f.geometry.coordinates.some(([x, y]) => nearTarget(x, y))) continue
    const [mx, my] = midPoint(f.geometry.coordinates)
    const op = f.properties.N02_004
    const name = displayLineName(op, f.properties.N02_003)
    const category = op === JR_OPERATOR ? 'jr' : 'private'

    let outs
    if (SERVICE_LINES[name] && inServiceZone(name, f.geometry.coordinates)) {
      outs = SERVICE_LINES[name].map((sv) => ({ key: sv.name, line: sv.name, color: sv.color, offset: sv.offset }))
    } else if (LINE_SECTIONS[name]) {
      const section = sectionOf(name, mx, my)
      outs = [{ key: section, line: name, color: LINE_COLORS[name] || DEFAULT_COLOR, section }]
    } else {
      outs = [{ key: name, line: name, color: LINE_COLORS[name] || DEFAULT_COLOR }]
    }
    for (const o of outs) {
      const e = (lines[o.key] =
        lines[o.key] || { coords: [], category, line: o.line, color: o.color, section: o.section, offset: o.offset })
      // 並走サービスは line-offset の左右が描画方向で決まるため、
      // 全セグメントを西→東に揃えて各停/快速の側が反転しないようにする。
      const coords = o.offset ? orientWestEast(f.geometry.coordinates) : f.geometry.coordinates
      e.coords.push(coords)
    }
  }
  const railwayFeatures = Object.keys(lines).map((key) => {
    const e = lines[key]
    const props = { line: e.line, category: e.category, color: e.color, trains: TRAINS[key] ?? DEFAULT_TRAINS }
    if (e.section) props.section = e.section
    if (e.offset) props.offset = e.offset
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

  // --- 駅: 駅名で集約。ただし同名でも離れた別駅は別点に分ける ---
  // N02 は同一物理駅を事業者・路線ごとに別フィーチャで持つので駅名で寄せる。
  // ただし広域化すると同名・別location の駅（例: 栄町＝千葉モノレール/都電荒川線、
  // 永田＝外房線/秩父鉄道）が混ざるため、駅名の中で近接クラスタ単位に分けて
  // それぞれ 1 点にする（霞ヶ関のメトロ3線は同一駅、東武東上の霞ヶ関は別点、を満たす）。
  const stationRecords = {} // 駅名 -> [{ x, y, line, jr }]
  for (const f of st.features) {
    const [cx, cy] = centroid(f.geometry.coordinates)
    if (!inTarget(cx, cy)) continue
    const op = f.properties.N02_004
    ;(stationRecords[f.properties.N02_005] = stationRecords[f.properties.N02_005] || []).push({
      x: cx, y: cy, line: displayLineName(op, f.properties.N02_003), jr: op === JR_OPERATOR,
    })
  }
  // 同名の駅レコードを近接クラスタへ分割（単連結・貪欲法）。
  const clusterRecords = (recs) => {
    const clusters = []
    for (const r of recs) {
      let target = null
      for (const cl of clusters) {
        if (cl.some((p) => Math.hypot(p.x - r.x, p.y - r.y) <= STATION_CLUSTER_DIST)) {
          target = cl
          break
        }
      }
      if (target) target.push(r)
      else clusters.push([r])
    }
    return clusters
  }
  const stationFeatures = []
  for (const [name, recs] of Object.entries(stationRecords)) {
    for (const cl of clusterRecords(recs)) {
      const [x, y] = centroid(cl.map((p) => [p.x, p.y]))
      const lineList = [...new Set(cl.map((p) => p.line))]
      const major = lineList.length > 1 || MAJOR_STATIONS.has(name)
      stationFeatures.push({
        type: 'Feature',
        properties: {
          name,
          lines: lineList,
          isJr: cl.some((p) => p.jr),
          isPrivate: cl.some((p) => !p.jr),
          major,
        },
        geometry: { type: 'Point', coordinates: [x, y] },
      })
    }
  }
  stationFeatures.sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'ja'))

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const railways = { type: 'FeatureCollection', features: railwayFeatures }
  const stations = { type: 'FeatureCollection', features: stationFeatures }
  fs.writeFileSync(path.join(OUT_DIR, 'railways.geojson'), JSON.stringify(railways))
  fs.writeFileSync(path.join(OUT_DIR, 'stations.geojson'), JSON.stringify(stations))

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
