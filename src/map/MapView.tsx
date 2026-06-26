import type { LineLayerSpecification } from 'maplibre-gl'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import {
  GSI_STD_RASTER,
  INITIAL_VIEW_STATE,
  ROUTE_SOURCE,
  ROUTE_SOURCE_KIND,
} from './config'

/**
 * 路線ラインの描画スタイル。
 *
 * 両フォーマット（geojson / pmtiles）で共通して残せる属性名のみに
 * 依存させ、移行コストを抑える。ここでは:
 *   - color: 路線色（無ければグレーにフォールバック）
 */
const ROUTE_LINE_PAINT: LineLayerSpecification['paint'] = {
  'line-color': ['coalesce', ['get', 'color'], '#888888'],
  // ズームに応じて線を太くして見やすくする。
  'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 3, 16, 5],
}

/**
 * 背景に国土地理院 標準地図を表示し、その上に鉄道路線を描画する地図コンポーネント。
 *
 * 路線データのソースは config.ts の ROUTE_SOURCE_KIND で出し分ける:
 *   - 'geojson': ローカルの GeoJSON を直接読み込む（小規模・開発初期向け）。
 *   - 'pmtiles': ベクトルタイル（大規模・本番向け、未実装）。
 */
export default function MapView() {
  return (
    <Map
      initialViewState={INITIAL_VIEW_STATE}
      style={{ width: '100%', height: '100%' }}
      // 背景タイルだけのシンプルなスタイルをインラインで定義する。
      mapStyle={{
        version: 8,
        sources: {
          'gsi-std': {
            type: 'raster',
            ...GSI_STD_RASTER,
          },
        },
        layers: [
          {
            id: 'gsi-std',
            type: 'raster',
            source: 'gsi-std',
          },
        ],
      }}
    >
      {ROUTE_SOURCE_KIND === 'geojson' ? (
        <Source id="routes" type="geojson" data={ROUTE_SOURCE.geojson.url}>
          <Layer
            id="routes-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={ROUTE_LINE_PAINT}
          />
        </Source>
      ) : (
        // pmtiles は未実装。protocol 登録のうえ source-layer を指定する。
        <Source id="routes" type="vector" url={`pmtiles://${ROUTE_SOURCE.pmtiles.url}`}>
          <Layer
            id="routes-line"
            type="line"
            source-layer="routes"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={ROUTE_LINE_PAINT}
          />
        </Source>
      )}
    </Map>
  )
}
