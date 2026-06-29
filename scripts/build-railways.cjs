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
    // 緩行は三鷹〜千葉まで通しで「中央・総武線各駅停車」（offset は中央線と揃えて +1）。
    { name: '中央・総武線各駅停車', color: '#FFD400', offset: 1 },
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
    // 区間分割されている場合も含めて全行を収集する。
    const rows = CSV_ROWS.filter((r) => r.line === sv.name)
    for (const row of rows) for (const st of row.stations) set.add(st)
  }
}

/**
 * 系統が重なる JR 幹線（東北線・東海道線・中央線）を「通称」ごとに描き分ける定義。
 * N02 は 1 つの物理路線名に複数系統（京浜東北/宇都宮、京浜東北/東海道、快速/各停 等）を
 * 収録しているため、駅集合で「ゾーン」に分け、各ゾーンで該当する通称サービスを引く。
 * 同一ゾーンに複数サービスがある区間（共用複々線）は line-offset で並べて描く。
 * ゾーン判定はセグメント中点の最寄り駅（そのゾーンの駅集合内）で行う。
 * 本数はサービス名で CSV からひく（無ければ既定）。色はここで指定。
 */
const CORRIDORS = {
  東北線: [
    {
      // 東京〜大宮: 京浜東北線と宇都宮線（東北本線中距離）が共用する主線。
      label: '東北本線(東京〜大宮)',
      services: [
        { name: '京浜東北線', color: '#00BAE8', offset: 1 },
        { name: '宇都宮線', color: '#F68B1E', offset: -1 },
      ],
      stations: '東京 神田 秋葉原 御徒町 上野 鶯谷 日暮里 西日暮里 田端 上中里 王子 東十条 尾久 赤羽 川口 西川口 蕨 南浦和 浦和 北浦和 与野 さいたま新都心 大宮'.split(' '),
    },
    {
      // 大宮以北: 宇都宮線（中距離）単独。
      label: '宇都宮線(大宮〜栗橋)',
      services: [{ name: '宇都宮線', color: '#F68B1E', offset: 0 }],
      stations: '土呂 東大宮 蓮田 白岡 新白岡 久喜 東鷲宮 栗橋'.split(' '),
    },
    {
      // 赤羽〜大宮の別線（武蔵浦和経由）: 埼京線単独。主線と分岐するため branch。
      label: '埼京線(赤羽〜大宮)',
      branch: true,
      services: [{ name: '埼京線', color: '#00AC9A', offset: 0 }],
      stations: '浮間舟渡 北赤羽 戸田公園 戸田 北戸田 武蔵浦和 中浦和 南与野 与野本町 北与野'.split(' '),
    },
  ],
  東海道線: [
    {
      // 東京〜横浜: 京浜東北線と東海道線（中距離）が共用。
      label: '東海道本線(東京〜横浜)',
      services: [
        { name: '京浜東北線', color: '#00BAE8', offset: 1 },
        { name: '東海道線', color: '#F68B1E', offset: -1 },
      ],
      stations: '有楽町 新橋 浜松町 田町 高輪ゲートウェイ 品川 大井町 大森 蒲田 川崎 鶴見 新子安 東神奈川'.split(' '),
    },
    {
      // 横浜〜大船: 東海道線と横須賀線が並走（N02 は東海道線でまとめている区間）。
      // 保土ヶ谷・東戸塚（横須賀の駅）もここに含め、両系統を並走描画する。
      // 横須賀は offset 0（大船〜久里浜の単独区間と揃えて連続させる）、東海道を -1 にずらす。
      label: '東海道・横須賀(横浜〜大船)',
      services: [
        { name: '東海道線', color: '#F68B1E', offset: -1 },
        { name: '横須賀線', color: '#0072BC', offset: 0 },
      ],
      stations: '横浜 保土ヶ谷 東戸塚 戸塚 大船'.split(' '),
    },
    {
      // 大船以西: 東海道線（中距離）単独。
      label: '東海道線(大船〜熱海)',
      services: [{ name: '東海道線', color: '#F68B1E', offset: 0 }],
      stations: '藤沢 辻堂 茅ヶ崎 平塚 大磯 二宮 国府津 鴨宮 小田原 早川 根府川 真鶴 湯河原 熱海'.split(' '),
    },
    {
      // 品鶴線（東京方の横須賀線・湘南新宿）: 横須賀線単独。主線（鶴見・川崎）の近くを
      // 内陸で並走するため branch 指定（端点が品鶴駅の区間は主線へ流さない）。
      // 保土ヶ谷・東戸塚は東海道と並走するため上の横浜〜大船ゾーン側に入れる。
      label: '横須賀線(品鶴線)',
      branch: true,
      services: [{ name: '横須賀線', color: '#0072BC', offset: 0 }],
      stations: '西大井 武蔵小杉 新川崎'.split(' '),
    },
    {
      // 相鉄・JR直通線（東海道貨物線経由）。
      label: '相鉄・JR直通線',
      branch: true,
      services: [{ name: '相鉄・JR直通線', color: '#6A1B7A', offset: 0 }],
      stations: '羽沢横浜国大'.split(' '),
    },
  ],
  中央線: [
    {
      // 御茶ノ水〜三鷹: 中央線快速と中央・総武線各駅停車の複々線。
      label: '中央複々線(御茶ノ水〜三鷹)',
      services: [
        // 緩行は総武線側と側を揃える（緩行 +1 / 快速 -1）。
        { name: '中央線快速', color: '#F15A22', offset: -1 },
        { name: '中央・総武線各駅停車', color: '#FFD400', offset: 1 },
      ],
      stations: '御茶ノ水 水道橋 飯田橋 市ヶ谷 四ツ谷 信濃町 千駄ヶ谷 代々木 新宿 大久保 東中野 中野 高円寺 阿佐ヶ谷 荻窪 西荻窪 吉祥寺 三鷹'.split(' '),
    },
    {
      // 東京〜御茶ノ水: 中央線快速単独。
      label: '中央線快速(東京〜御茶ノ水)',
      services: [{ name: '中央線快速', color: '#F15A22', offset: 0 }],
      stations: '東京 神田'.split(' '),
    },
    {
      // 三鷹〜高尾: 中央線快速単独。
      label: '中央線快速(三鷹〜高尾)',
      services: [{ name: '中央線快速', color: '#F15A22', offset: 0 }],
      stations: '武蔵境 東小金井 武蔵小金井 国分寺 西国分寺 国立 立川 日野 豊田 八王子 西八王子 高尾 相模湖 藤野'.split(' '),
    },
  ],
}
// 駅名 → ゾーン index（CORRIDORS の各 base 内）。
const CORRIDOR_ZONE = {} // base -> { 駅名: zoneIndex }
for (const [base, zones] of Object.entries(CORRIDORS)) {
  const m = (CORRIDOR_ZONE[base] = {})
  zones.forEach((z, i) => z.stations.forEach((s) => (m[s] = i)))
}

/**
 * 物理路線の一部区間を別サービス名で描き替える（CORRIDORS ほど複雑でない補完用）。
 * 両端の最寄り駅がともに stations に含まれるセグメントだけ対象。本数はサービス名で CSV からひく。
 * 総武線の緩行（御茶ノ水〜錦糸町）＝中央・総武線各駅停車、快速地下線（東京〜錦糸町）＝総武線快速。
 * （錦糸町〜千葉の複々線は従来どおり SERVICE_LINES で描く。）
 */
const STATION_RELABEL = {
  総武線: [
    // 快速地下線（東京〜錦糸町）。新日本橋・馬喰町は快速線のみの駅なのでアンカー
    // （片端がこれらに最寄りなら快速）。地下線は両国の真下を通り端点が両国にスナップ
    // することがあるため、両端一致だけだと取りこぼす。
    { line: '総武線快速', color: '#0072BC', anchors: new Set(['新日本橋', '馬喰町']), stations: new Set(['東京', '新日本橋', '馬喰町', '錦糸町']) },
    { line: '中央・総武線各駅停車', color: '#FFD400', stations: new Set(['御茶ノ水', '秋葉原', '浅草橋', '両国', '錦糸町']) },
  ],
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
  // 赤羽線（池袋〜赤羽）は埼京線の一部。通称へ統一（赤羽〜大宮別線は東北線 CORRIDORS で）。
  '東日本旅客鉄道|赤羽線': '埼京線',
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
  根岸線: '#00BAE8', // 京浜東北・根岸線（横浜〜大船。京浜東北は CORRIDORS で別途）
  高崎線: '#F68B1E',
  青梅線: '#F15A22',
  五日市線: '#F15A22',
  横須賀線: '#0072BC', // 大船〜久里浜（東京方の品鶴線は東海道線 CORRIDORS で別途）
  横浜線: '#80C342',
  南武線: '#FBD05D',
  鶴見線: '#FFD400',
  八高線: '#A8A39D',
  川越線: '#00AC9A', // 川越線・埼京線
  埼京線: '#00AC9A', // 池袋〜赤羽（赤羽線をリネーム。赤羽〜大宮別線は東北線 CORRIDORS）
  相模線: '#009793',
  // 東北線・東海道線・中央線は系統が重なるため CORRIDORS（後述）で通称別に描く
  京浜東北線: '#00BAE8',
  宇都宮線: '#F68B1E',
  東海道線: '#F68B1E',
  中央線快速: '#F15A22',
  '中央・総武線各駅停車': '#FFD400',
  '相鉄・JR直通線': '#6A1B7A',
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

/**
 * 並走（line-offset）の左右が描画方向で決まるため、セグメントの向きを揃える。
 * 主軸が東西なら西→東、南北なら南→北に統一（東北線のような南北路線にも対応）。
 */
function orientConsistent(coords) {
  const a = coords[0], b = coords[coords.length - 1]
  const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1])
  if (dx >= dy) return a[0] <= b[0] ? coords : coords.slice().reverse()
  return a[1] <= b[1] ? coords : coords.slice().reverse()
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
    // 先書き優先: 複数区間に現れる境界駅は最初の区間（より手前）に属させる。
    // 境界セグメント検出（後述）と組み合わせ、セグメントを正しい区間に割り当てる。
    for (const s of secs) for (const name of s.stations) if (!(name in m)) m[name] = s.label
  }
  // 区間割り当て用に、区間定義のある路線（事業者問わず）の駅座標を集める。
  // CORRIDORS の base 路線は、ゾーンに登録した駅のみ集めて zone も持たせる。
  const lineStations = {} // 表示路線名 -> [{ name, x, y }]
  const corridorStations = {} // base -> [{ name, x, y, zone }]
  for (const f of st.features) {
    const ln = displayLineName(f.properties.N02_004, f.properties.N02_003)
    const [cx, cy] = centroid(f.geometry.coordinates)
    if (!inTarget(cx, cy)) continue
    if (LINE_SECTIONS[ln] || SERVICE_LINES[ln]) {
      ;(lineStations[ln] = lineStations[ln] || []).push({ name: f.properties.N02_005, x: cx, y: cy })
    }
    if (CORRIDORS[ln]) {
      const zone = CORRIDOR_ZONE[ln][f.properties.N02_005]
      if (zone !== undefined)
        ;(corridorStations[ln] = corridorStations[ln] || []).push({ name: f.properties.N02_005, x: cx, y: cy, zone })
    }
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
  // CORRIDORS: 点の最寄りゾーン駅から、その通称ゾーン定義を返す（駅・点用）。
  const corridorOf = (base, x, y) => {
    let best = null, bestD = Infinity
    for (const s of corridorStations[base] || []) {
      const d = (s.x - x) ** 2 + (s.y - y) ** 2
      if (d < bestD) { bestD = d; best = s.zone }
    }
    return CORRIDORS[base][best ?? 0]
  }
  // CORRIDORS（セグメント用）: 中点でゾーンを決めるが、端点が分岐線（品鶴・埼京・相鉄）
  // の駅に接する区間は分岐ゾーンを優先する。分岐線は主線（鶴見・川崎・赤羽等）の近くを
  // 通るため、中点だけだと主線ゾーン（京浜東北＋東海道 等）へ誤って吸われてしまう。
  const corridorOfSegment = (base, coords) => {
    const a = coords[0], b = coords[coords.length - 1]
    for (const [x, y] of [a, b]) {
      const z = corridorOf(base, x, y)
      if (z.branch) return z
    }
    const [mx, my] = midPoint(coords)
    return corridorOf(base, mx, my)
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

    // out: { line(表示名), trainKey(本数キー), color, offset, section? }
    const coords = f.geometry.coordinates
    let outs, relabel
    if (CORRIDORS[name]) {
      // 系統が重なる JR 幹線: セグメントの通称ゾーンの各サービスを引く（共用区間は offset で並走）。
      const zone = corridorOfSegment(name, coords)
      outs = zone.services.map((sv) => ({ line: sv.name, trainKey: sv.name, color: sv.color, offset: sv.offset }))
    } else if (
      STATION_RELABEL[name] &&
      (relabel = (() => {
        const a = nearestStation(name, coords[0][0], coords[0][1])
        const b = nearestStation(name, coords[coords.length - 1][0], coords[coords.length - 1][1])
        if (!a || !b) return null
        return STATION_RELABEL[name].find(
          (r) =>
            (r.anchors && (r.anchors.has(a) || r.anchors.has(b))) ||
            (r.stations.has(a) && r.stations.has(b)),
        )
      })())
    ) {
      outs = [{ line: relabel.line, trainKey: relabel.line, color: relabel.color }]
    } else if (SERVICE_LINES[name] && inServiceZone(name, f.geometry.coordinates)) {
      outs = SERVICE_LINES[name].map((sv) => ({ line: sv.name, trainKey: sv.name, color: sv.color, offset: sv.offset }))
    } else if (LINE_SECTIONS[name]) {
      // 中点判定では区間境界をまたぐセグメントの割り当てが不安定になる。
      // 両端の最寄り駅が異なる区間に属するとき（境界セグメント）は、
      // CSV の記載順で後ろ（より遠方）の区間に割り当て、境界を明確にする。
      const stmap = stationToSection[name]
      const na = nearestStation(name, coords[0][0], coords[0][1])
      const nb = nearestStation(name, coords[coords.length - 1][0], coords[coords.length - 1][1])
      const sa = na ? stmap[na] : undefined
      const sb = nb ? stmap[nb] : undefined
      let section
      if (sa && sb && sa !== sb) {
        const idxA = LINE_SECTIONS[name].findIndex((s) => s.label === sa)
        const idxB = LINE_SECTIONS[name].findIndex((s) => s.label === sb)
        section = idxA < idxB ? sb : sa
      } else {
        section = sectionOf(name, mx, my)
      }
      outs = [{ line: name, trainKey: section, color: LINE_COLORS[name] || DEFAULT_COLOR, section }]
    } else {
      outs = [{ line: name, trainKey: name, color: LINE_COLORS[name] || DEFAULT_COLOR }]
    }
    for (const o of outs) {
      // 同一サービスでも offset が違えば別フィーチャ（共用区間=offset / 単独区間=中央寄せ）。
      // 凡例は line 名で重複排除されるので分割しても 1 項目に集約される。
      const key = `${o.section || o.line}#${o.offset || 0}`
      const e = (lines[key] =
        lines[key] || { coords: [], category, line: o.line, color: o.color, section: o.section, offset: o.offset, trainKey: o.trainKey })
      // 並走サービスは line-offset の左右が描画方向で決まるため、
      // 全セグメントの向きを揃えて各停/快速等の側が反転しないようにする。
      const coords = o.offset ? orientConsistent(f.geometry.coordinates) : f.geometry.coordinates
      e.coords.push(coords)
    }
  }
  const railwayFeatures = Object.keys(lines).map((key) => {
    const e = lines[key]
    // 区間分割された路線の SERVICE_LINES/CORRIDORS 参照では trainKey がサービス名（区間なし）に
    // なるため、セクションキーの最初の一致をフォールバックとして使う。
    const resolveTrains = (key) =>
      TRAINS[key] ?? Object.values(
        Object.fromEntries(Object.entries(TRAINS).filter(([k]) => k.startsWith(key + '(')))
      )[0] ?? DEFAULT_TRAINS
    const props = { line: e.line, category: e.category, color: e.color, trains: resolveTrains(e.trainKey) }
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
  // 駅の所属路線名も、地図と同じ通称へ寄せる（東北線→京浜東北線/宇都宮線、
  // 東海道線の品鶴→横須賀線、総武線の御茶ノ水〜錦糸町→中央・総武各停 等）。
  const reclassStationLines = (base, x, y, stName) => {
    if (CORRIDORS[base]) return [...new Set(corridorOf(base, x, y).services.map((s) => s.name))]
    const rel = STATION_RELABEL[base]
    if (rel) {
      const ls = [...new Set(rel.filter((r) => r.stations.has(stName)).map((r) => r.line))]
      if (ls.length) return ls
    }
    return [base]
  }
  const stationRecords = {} // 駅名 -> [{ x, y, line, jr }]
  for (const f of st.features) {
    const [cx, cy] = centroid(f.geometry.coordinates)
    if (!inTarget(cx, cy)) continue
    const op = f.properties.N02_004
    const jr = op === JR_OPERATOR
    const base = displayLineName(op, f.properties.N02_003)
    const recs = (stationRecords[f.properties.N02_005] = stationRecords[f.properties.N02_005] || [])
    for (const ln of reclassStationLines(base, cx, cy, f.properties.N02_005)) {
      recs.push({ x: cx, y: cy, line: ln, jr })
    }
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
