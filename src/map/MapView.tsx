import Map from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { GSI_STD_RASTER, INITIAL_VIEW_STATE } from './config'

/**
 * 背景に国土地理院 標準地図を表示する地図コンポーネント。
 *
 * 路線データのレイヤーはまだ追加していない。追加する際は、
 * react-map-gl/maplibre から { Source, Layer } を import し、
 * config.ts の ROUTE_SOURCE_KIND に応じて出し分ける:
 *
 *   {ROUTE_SOURCE_KIND === 'geojson' ? (
 *     <Source id="routes" type="geojson" data={ROUTE_SOURCE.geojson.url}>
 *       <Layer id="routes-line" type="line" ... />
 *     </Source>
 *   ) : (
 *     <Source id="routes" type="vector" url={ROUTE_SOURCE.pmtiles.url}>
 *       <Layer id="routes-line" type="line" source-layer="routes" ... />
 *     </Source>
 *   )}
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
    />
  )
}
