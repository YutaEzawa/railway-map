/**
 * 地図関連の設定を1箇所に集約するモジュール。
 *
 * 背景地図（ベースマップ）の定義に加え、将来追加する路線データの
 * ソース定義をここで一元管理する。
 */

/** 初期表示の中心・ズーム（東京駅周辺）。 */
export const INITIAL_VIEW_STATE = {
  longitude: 139.7671,
  latitude: 35.6812,
  zoom: 10,
} as const

/**
 * 背景地図: 国土地理院 標準地図（ラスタタイル）。
 * 出典表示「国土地理院」は attribution として必ず画面に表示する。
 */
export const GSI_STD_RASTER = {
  tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
  tileSize: 256,
  maxzoom: 18,
  attribution:
    '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>',
}

/**
 * 路線データのソース種別。
 *
 * 今は地図表示のみのため路線レイヤーは未実装だが、後で
 * GeoJSON → PMTiles（ベクトルタイル）へ差し替えやすいよう、
 * 「ソース種別を1箇所で切り替える」構造をここに用意しておく。
 *
 * 切り替え手順（将来）:
 *   1. ROUTE_SOURCE_KIND を 'geojson' / 'pmtiles' のどちらかに設定する。
 *   2. 対応する url / path を ROUTE_SOURCE に記述する。
 *   3. MapView 側で ROUTE_SOURCE_KIND を見てソース/レイヤーを出し分ける。
 *      - 'geojson': <Source type="geojson" data={url}> をそのまま使う。
 *      - 'pmtiles': pmtiles プロトコルを登録のうえ
 *        <Source type="vector" url={`pmtiles://${path}`}> を使う。
 */
export type RouteSourceKind = 'geojson' | 'pmtiles'

/** ★ ここを切り替えるだけでソース種別が変わるようにしておく。 */
export const ROUTE_SOURCE_KIND: RouteSourceKind = 'geojson'

/**
 * 種別ごとの実体定義。今は未使用（地図表示のみ）。
 * データを用意したら url / path を埋める。
 */
export const ROUTE_SOURCE: Record<RouteSourceKind, { description: string; url: string }> = {
  geojson: {
    description: 'GeoJSON を直接読み込む。小規模データ・開発初期向け。',
    url: '', // 例: '/data/routes.geojson'
  },
  pmtiles: {
    description: 'PMTiles ベクトルタイル。大規模データ・本番向け。',
    url: '', // 例: 'pmtiles:///data/routes.pmtiles'
  },
}
