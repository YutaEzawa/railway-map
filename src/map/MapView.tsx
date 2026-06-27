import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Map,
  Source,
  Layer,
  Marker,
  type LineLayerSpecification,
  type CircleLayerSpecification,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, LineString, MultiLineString, Point } from 'geojson'
import {
  INITIAL_VIEW_STATE,
  MAX_ZOOM,
  STATION_DATA_ATTRIBUTION,
  WHITE_MAP_STYLE,
} from './config'
import './MapView.css'

type LineProps = { line: string; color: string }
type StationProps = { name: string; lines: string[]; major: boolean }
type RailwaysData = FeatureCollection<LineString | MultiLineString, LineProps>
type StationsData = FeatureCollection<Point, StationProps>

const RAILWAYS_URL = `${import.meta.env.BASE_URL}data/chiba-jr-railways.geojson`
const STATIONS_URL = `${import.meta.env.BASE_URL}data/chiba-jr-stations.geojson`

/** 路線ラインの下に敷く暗いケーシング。白地図上で路線色を見やすくする。 */
const lineCasingLayer: LineLayerSpecification = {
  id: 'route-lines-casing',
  type: 'line',
  source: 'railways',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': '#555555',
    'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 12, 6, 16, 9],
  },
}

/** 路線ライン。色は feature の color プロパティを参照。 */
const lineLayer: LineLayerSpecification = {
  id: 'route-lines',
  type: 'line',
  source: 'railways',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': ['get', 'color'],
    'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.8, 12, 4, 16, 7],
  },
}

/** 駅ドット（全駅）。主要駅は一回り大きく。 */
const stationLayer: CircleLayerSpecification = {
  id: 'stations',
  type: 'circle',
  source: 'stations',
  paint: {
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      8, ['case', ['get', 'major'], 3, 1.6],
      12, ['case', ['get', 'major'], 5, 3],
      16, ['case', ['get', 'major'], 7, 5],
    ],
    'circle-color': '#ffffff',
    'circle-stroke-color': '#333333',
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 1.8, 16, 2.5],
  },
}

function useGeoJSON<T>(url: string) {
  return useQuery<T>({
    queryKey: [url],
    queryFn: () => fetch(url).then((r) => r.json()),
    staleTime: Infinity,
  })
}

/**
 * 国土地理院の白地図タイル上に、千葉県内の JR 東日本 全路線・全駅を重ねて表示する。
 * 路線・駅データは public/data の GeoJSON（国土数値情報 N02 由来）を読み込む。
 */
export default function MapView() {
  const railways = useGeoJSON<RailwaysData>(RAILWAYS_URL)
  const stations = useGeoJSON<StationsData>(STATIONS_URL)

  // 凡例（路線名＋色）。
  const legend = useMemo(() => {
    if (!railways.data) return []
    return railways.data.features.map((f) => f.properties)
  }, [railways.data])

  // 主要駅だけラベルを出す。
  const majorStations = useMemo(() => {
    if (!stations.data) return []
    return stations.data.features.filter((f) => f.properties.major)
  }, [stations.data])

  return (
    <div className="map-view">
      <div className="map-view__legend">
        {legend.map((l) => (
          <span key={l.line} className="map-view__legend-item">
            <span className="map-view__swatch" style={{ background: l.color }} />
            {l.line}
          </span>
        ))}
      </div>

      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={WHITE_MAP_STYLE}
        maxZoom={MAX_ZOOM}
        attributionControl={{ customAttribution: STATION_DATA_ATTRIBUTION }}
      >
        {railways.data && (
          <Source id="railways" type="geojson" data={railways.data}>
            <Layer {...lineCasingLayer} />
            <Layer {...lineLayer} />
          </Source>
        )}

        {stations.data && (
          <Source id="stations" type="geojson" data={stations.data}>
            <Layer {...stationLayer} />
          </Source>
        )}

        {majorStations.map((f) => (
          <Marker
            key={f.properties.name}
            longitude={f.geometry.coordinates[0]}
            latitude={f.geometry.coordinates[1]}
            anchor="left"
          >
            <span className="map-view__label">{f.properties.name}</span>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
