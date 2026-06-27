import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Map,
  Source,
  Layer,
  Marker,
  type LineLayerSpecification,
  type CircleLayerSpecification,
} from 'react-map-gl/maplibre'
import type { FilterSpecification, ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, LineString, MultiLineString, Point } from 'geojson'
import {
  INITIAL_VIEW_STATE,
  MAX_ZOOM,
  STATION_DATA_ATTRIBUTION,
  WHITE_MAP_STYLE,
} from './config'
import './MapView.css'

type Category = 'jr' | 'private'
type LineProps = { line: string; category: Category; color: string }
type StationProps = {
  name: string
  lines: string[]
  isJr: boolean
  isPrivate: boolean
  major: boolean
}
type RailwaysData = FeatureCollection<LineString | MultiLineString, LineProps>
type StationsData = FeatureCollection<Point, StationProps>

const RAILWAYS_URL = `${import.meta.env.BASE_URL}data/chiba-railways.geojson`
const STATIONS_URL = `${import.meta.env.BASE_URL}data/chiba-stations.geojson`

/** 駅名ラベルを表示し始めるズーム（カテゴリ × 主要/全駅ごと）。 */
const LABEL_ZOOM = {
  jrMajor: 0, // JR 主要駅は常時表示
  privateMajor: 10,
  jrAll: 11,
  privateAll: 12,
}

/** 何も表示しないフィルタ。 */
const HIDE_ALL: FilterSpecification = ['==', ['literal', 1], 0]

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
 * 国土地理院の白地図タイル上に、千葉県内の鉄道（JR＋私鉄）の全路線・全駅を重ねて表示する。
 * 路線・駅データは public/data の GeoJSON（国土数値情報 N02 由来）を読み込む。
 * 凡例のチェックボックスで JR / 私鉄 の表示を切り替えられる。
 */
export default function MapView() {
  const railways = useGeoJSON<RailwaysData>(RAILWAYS_URL)
  const stations = useGeoJSON<StationsData>(STATIONS_URL)

  const [showJR, setShowJR] = useState(true)
  const [showPrivate, setShowPrivate] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)

  // 現在ズーム（整数に丸める）。閾値判定は整数比較で十分なので再描画を抑えられる。
  const [zoom, setZoom] = useState(Math.floor(INITIAL_VIEW_STATE.zoom))

  // 凡例（カテゴリ別の路線名＋色）。
  const { jrLines, privateLines } = useMemo(() => {
    const feats = railways.data?.features ?? []
    return {
      jrLines: feats.map((f) => f.properties).filter((p) => p.category === 'jr'),
      privateLines: feats.map((f) => f.properties).filter((p) => p.category === 'private'),
    }
  }, [railways.data])

  // 路線レイヤー用フィルタ（有効カテゴリのみ表示）。
  const lineFilter = useMemo<FilterSpecification>(() => {
    const cats: Category[] = []
    if (showJR) cats.push('jr')
    if (showPrivate) cats.push('private')
    if (cats.length === 0) return HIDE_ALL
    return ['match', ['get', 'category'], cats, true, false]
  }, [showJR, showPrivate])

  // 駅レイヤー用フィルタ（JR 駅 or 私鉄 駅。乗換駅は両方）。
  const stationFilter = useMemo<FilterSpecification>(() => {
    const ors: ExpressionSpecification[] = []
    if (showJR) ors.push(['get', 'isJr'])
    if (showPrivate) ors.push(['get', 'isPrivate'])
    if (ors.length === 0) return HIDE_ALL
    return ['any', ...ors] as FilterSpecification
  }, [showJR, showPrivate])

  // ラベルを出す駅。カテゴリ × 主要/全駅ごとの閾値ズームを満たしたものだけ表示する。
  // JR主要=常時 / 私鉄主要=z10 / JR全駅=z12 / 私鉄全駅=z13。乗換駅は最小閾値を採用。
  const labeledStations = useMemo(() => {
    const feats = stations.data?.features ?? []
    return feats.filter((f) => {
      const p = f.properties
      let minZoom = Infinity
      if (showJR && p.isJr) minZoom = Math.min(minZoom, p.major ? LABEL_ZOOM.jrMajor : LABEL_ZOOM.jrAll)
      if (showPrivate && p.isPrivate) minZoom = Math.min(minZoom, p.major ? LABEL_ZOOM.privateMajor : LABEL_ZOOM.privateAll)
      return zoom >= minZoom
    })
  }, [stations.data, showJR, showPrivate, zoom])

  return (
    <div className="map-view">
      <div className="map-view__panel">
        <div className="map-view__toggles">
          <label className="map-view__toggle">
            <input
              type="checkbox"
              checked={showJR}
              onChange={(e) => setShowJR(e.target.checked)}
            />
            JR
          </label>
          <label className="map-view__toggle">
            <input
              type="checkbox"
              checked={showPrivate}
              onChange={(e) => setShowPrivate(e.target.checked)}
            />
            私鉄
          </label>
        </div>

        <button
          type="button"
          className="map-view__detail-btn"
          onClick={() => setDetailOpen((o) => !o)}
          aria-expanded={detailOpen}
        >
          詳細（路線名）{detailOpen ? ' ▲' : ' ▼'}
        </button>

        {detailOpen && (
          <div className="map-view__detail">
            <div className="map-view__detail-head">JR</div>
            <div className="map-view__lines">
              {jrLines.map((l) => (
                <span key={l.line} className="map-view__legend-item">
                  <span className="map-view__swatch" style={{ background: l.color }} />
                  {l.line}
                </span>
              ))}
            </div>
            <div className="map-view__detail-head">私鉄</div>
            <div className="map-view__lines">
              {privateLines.map((l) => (
                <span key={l.line} className="map-view__legend-item">
                  <span className="map-view__swatch" style={{ background: l.color }} />
                  {l.line}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={WHITE_MAP_STYLE}
        maxZoom={MAX_ZOOM}
        attributionControl={{ customAttribution: STATION_DATA_ATTRIBUTION }}
        onZoom={(e) => {
          const z = Math.floor(e.viewState.zoom)
          setZoom((prev) => (prev === z ? prev : z))
        }}
      >
        {railways.data && (
          <Source id="railways" type="geojson" data={railways.data}>
            <Layer {...lineCasingLayer} filter={lineFilter} />
            <Layer {...lineLayer} filter={lineFilter} />
          </Source>
        )}

        {stations.data && (
          <Source id="stations" type="geojson" data={stations.data}>
            <Layer {...stationLayer} filter={stationFilter} />
          </Source>
        )}

        {labeledStations.map((f) => (
          <Marker
            key={f.properties.name}
            longitude={f.geometry.coordinates[0]}
            latitude={f.geometry.coordinates[1]}
            anchor="left"
          >
            <span
              className={
                f.properties.major
                  ? 'map-view__label map-view__label--major'
                  : 'map-view__label'
              }
            >
              {f.properties.name}
            </span>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
