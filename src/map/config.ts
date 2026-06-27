import type { StyleSpecification } from 'maplibre-gl'

/**
 * 国土地理院 白地図タイル（背景）。
 * 出典表示「国土地理院」が必須。ズームは 5〜14。
 * https://maps.gsi.go.jp/development/ichiran.html
 */
const GSI_BLANK_TILES = 'https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png'
const GSI_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>'

/** 白地図ラスタ 1 枚だけの最小スタイル。 */
export const WHITE_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'gsi-blank': {
      type: 'raster',
      tiles: [GSI_BLANK_TILES],
      tileSize: 256,
      maxzoom: 14,
      attribution: GSI_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: 'gsi-blank',
      type: 'raster',
      source: 'gsi-blank',
      // 白地図をやや明るめにして路線を前面に立たせる。
      paint: { 'raster-opacity': 0.9 },
    },
  ],
}

/** 初期表示（千葉県全体が収まる位置）。 */
export const INITIAL_VIEW_STATE = {
  longitude: 140.2,
  latitude: 35.5,
  zoom: 8.6,
}

/** 白地図タイルの最大ズーム（14）。overzoom で 16 まで拡大表示を許容する。 */
export const MAX_ZOOM = 16

/** 路線・駅データの出典表示。 */
export const STATION_DATA_ATTRIBUTION =
  '路線・駅: <a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html" target="_blank" rel="noreferrer">国土数値情報（鉄道データ）</a>'
