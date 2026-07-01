import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Map,
  Source,
  Layer,
  Marker,
  Popup,
  type LineLayerSpecification,
  type CircleLayerSpecification,
  type MapLayerMouseEvent,
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
import { LINE_STYLE, type WidthStops } from './lineStyle'
import './MapView.css'

type Category = 'jr' | 'private'
type LineProps = {
  line: string
  category: Category
  color: string
  trains: number
  section?: string
}
type StationProps = {
  name: string
  lines: string[]
  isJr: boolean
  isPrivate: boolean
  major: boolean
  /** 合計停車本数（平日・片方向）。急行/各停で停車パターンが違う路線の駅だけ持つ。 */
  stopTrains?: number
  /** 種別ごとの停車本数 { 種別: 本数 } の JSON 文字列（geojson は入れ子を文字列化するため）。 */
  stopTypes?: string
}
type RailwaysData = FeatureCollection<LineString | MultiLineString, LineProps>
type StationsData = FeatureCollection<Point, StationProps>

const RAILWAYS_URL = `${import.meta.env.BASE_URL}data/railways.geojson`
const STATIONS_URL = `${import.meta.env.BASE_URL}data/stations.geojson`

// 線種の境界値・太さは lineStyle.ts（別ファイル）で定義。
const { thresholds: TH, line: LINE_W, casing: CASING_W, dashed: DASHED } = LINE_STYLE
const DASH_BELOW = TH.dashBelow

/** 実線の太さ式（ズーム interpolate × 本数 step で 細/普通/太）。 */
function solidWidth(stops: WidthStops): ExpressionSpecification {
  const expr: unknown[] = ['interpolate', ['linear'], ['zoom']]
  for (const s of stops) {
    expr.push(s.zoom, ['step', ['get', 'trains'], s.tiers[0], TH.normal, s.tiers[1], TH.thick, s.tiers[2]])
  }
  return expr as ExpressionSpecification
}

/** 点線の太さ式（ズーム interpolate のみ）。 */
function dashedWidth(): ExpressionSpecification {
  const expr: unknown[] = ['interpolate', ['linear'], ['zoom']]
  for (const s of DASHED.width) expr.push(s.zoom, s.w)
  return expr as ExpressionSpecification
}

/** 並走オフセット式。offset プロパティ(±1, 既定0)×ズーム別px。複々線の各停/快速用。 */
function offsetExpr(): ExpressionSpecification {
  const expr: unknown[] = ['interpolate', ['linear'], ['zoom']]
  for (const s of LINE_STYLE.parallelOffset) {
    expr.push(s.zoom, ['*', ['coalesce', ['get', 'offset'], 0], s.px])
  }
  return expr as ExpressionSpecification
}
const LINE_OFFSET = offsetExpr()

/** 駅名ラベルを表示し始めるズーム（カテゴリ × 主要/全駅ごと）。 */
const LABEL_ZOOM = {
  jrMajor: 0, // JR 主要駅は常時表示
  privateMajor: 10,
  jrAll: 11,
  privateAll: 12,
}

/** 何も表示しないフィルタ。 */
const HIDE_ALL: FilterSpecification = ['==', ['literal', 1], 0]

/** 路線ライン（実線）の下に敷く暗いケーシング。細/普通/太の3段階。 */
const lineCasingLayer: LineLayerSpecification = {
  id: 'route-lines-casing',
  type: 'line',
  source: 'railways',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': '#555555',
    'line-width': solidWidth(CASING_W),
    'line-offset': LINE_OFFSET,
  },
}

/** 路線ライン（実線）。本数で 細/普通/太 の3段階。色は color プロパティ。 */
const lineLayer: LineLayerSpecification = {
  id: 'route-lines',
  type: 'line',
  source: 'railways',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': ['get', 'color'],
    'line-width': solidWidth(LINE_W),
    'line-offset': LINE_OFFSET,
  },
}

/** 本数が少ない路線（点線）。line-dasharray はデータ式不可のため専用レイヤー。 */
const lineDashedLayer: LineLayerSpecification = {
  id: 'route-lines-dashed',
  type: 'line',
  source: 'railways',
  layout: { 'line-join': 'round', 'line-cap': 'butt' },
  paint: {
    'line-color': ['get', 'color'],
    'line-dasharray': DASHED.dasharray,
    'line-width': dashedWidth(),
    'line-offset': LINE_OFFSET,
  },
}

/** クリック判定用の透明な太線（見た目は変えずクリック領域だけ広げる）。 */
const lineHitLayer: LineLayerSpecification = {
  id: 'route-lines-hit',
  type: 'line',
  source: 'railways',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: {
    'line-color': '#000000',
    'line-opacity': 0,
    'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 12, 12, 16, 18],
    'line-offset': LINE_OFFSET,
  },
}

// 停車本数(stopTrains)を持つ駅は本数に比例した半径、持たない駅は major で2値。
// stopTrains の値域は概ね 40〜380本（西武池袋線・京王線）。下限/上限でクランプ。
const STOP_MIN = 40
const STOP_MAX = 380
/** あるズームでの円半径式：stopTrains があれば本数比例、無ければ major 2値。 */
function radiusAtZoom(stopLo: number, stopHi: number, majorR: number, minorR: number) {
  return [
    'case',
    ['has', 'stopTrains'],
    ['interpolate', ['linear'], ['get', 'stopTrains'], STOP_MIN, stopLo, STOP_MAX, stopHi],
    ['case', ['get', 'major'], majorR, minorR],
  ]
}

/** 駅ドット（全駅）。停車本数があれば本数比例サイズ、無ければ主要駅を一回り大きく。 */
const stationLayer: CircleLayerSpecification = {
  id: 'stations',
  type: 'circle',
  source: 'stations',
  paint: {
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      8, radiusAtZoom(1.6, 4, 3, 1.6),
      12, radiusAtZoom(2.5, 8, 5, 3),
      16, radiusAtZoom(4, 13, 7, 5),
    ] as unknown as ExpressionSpecification,
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

/** クリックで表示するポップアップ情報。 */
type PopupInfo =
  | {
      kind: 'station'
      lng: number
      lat: number
      name: string
      lines: string[]
      stopTrains?: number
      /** 種別ごとの停車本数（本数降順）。停車本数データがある駅のみ。 */
      stopTypes?: [string, number][]
    }
  | { kind: 'line'; lng: number; lat: number; line: string; section?: string; trains: number; category: Category }

/** クリック判定の対象レイヤー（駅ドットと、路線用の透明な太線）。 */
const CLICK_LAYERS = ['stations', 'route-lines-hit']

/**
 * 国土地理院の白地図タイル上に、日本全国の鉄道
 * （JR＋私鉄）の全路線・全駅を重ねて表示する。
 * 路線・駅データは public/data の GeoJSON（国土数値情報 N02 由来）を読み込む。
 * 凡例のチェックボックスで JR / 私鉄 の表示を切り替えられる。
 */
export default function MapView() {
  const railways = useGeoJSON<RailwaysData>(RAILWAYS_URL)
  const stations = useGeoJSON<StationsData>(STATIONS_URL)

  const [showJR, setShowJR] = useState(true)
  const [showPrivate, setShowPrivate] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [popup, setPopup] = useState<PopupInfo | null>(null)
  const [cursor, setCursor] = useState('')

  // 路線・駅をクリックしたらポップアップ情報を組み立てる。
  const handleClick = (e: MapLayerMouseEvent) => {
    const feats = e.features ?? []
    const station = feats.find((f) => f.layer.id === 'stations')
    if (station) {
      const [lng, lat] = (station.geometry as Point).coordinates
      const props = station.properties ?? {}
      let lines = props.lines
      if (typeof lines === 'string') {
        try { lines = JSON.parse(lines) } catch { lines = [] }
      }
      // stopTypes は JSON 文字列。パースして本数降順の配列にする。
      let stopTypes: [string, number][] | undefined
      if (typeof props.stopTypes === 'string') {
        try {
          stopTypes = (Object.entries(JSON.parse(props.stopTypes)) as [string, number][]).sort(
            (a, b) => b[1] - a[1],
          )
        } catch { stopTypes = undefined }
      }
      setPopup({
        kind: 'station',
        lng, lat,
        name: props.name,
        lines: lines ?? [],
        stopTrains: typeof props.stopTrains === 'number' ? props.stopTrains : undefined,
        stopTypes,
      })
      return
    }
    const line = feats.find((f) => f.layer.id === 'route-lines-hit')
    if (line) {
      const p = line.properties ?? {}
      setPopup({
        kind: 'line', lng: e.lngLat.lng, lat: e.lngLat.lat,
        line: p.line, section: p.section, trains: p.trains, category: p.category,
      })
      return
    }
    setPopup(null)
  }

  // 現在ズーム（整数に丸める）。閾値判定は整数比較で十分なので再描画を抑えられる。
  const [zoom, setZoom] = useState(Math.floor(INITIAL_VIEW_STATE.zoom))

  // 凡例（カテゴリ別の路線名＋色）。区間分割した路線は親路線名で重複排除する。
  const { jrLines, privateLines } = useMemo(() => {
    const feats = railways.data?.features ?? []
    const dedupe = (cat: Category) => {
      const seen: Record<string, LineProps> = {}
      const order: string[] = []
      for (const f of feats) {
        const p = f.properties
        if (p.category === cat && !(p.line in seen)) {
          seen[p.line] = p
          order.push(p.line)
        }
      }
      return order.map((l) => seen[l])
    }
    return { jrLines: dedupe('jr'), privateLines: dedupe('private') }
  }, [railways.data])

  // 路線レイヤー用フィルタ（有効カテゴリのみ表示）。
  const lineFilter = useMemo<FilterSpecification>(() => {
    const cats: Category[] = []
    if (showJR) cats.push('jr')
    if (showPrivate) cats.push('private')
    if (cats.length === 0) return HIDE_ALL
    return ['match', ['get', 'category'], cats, true, false]
  }, [showJR, showPrivate])

  // 実線（本数 >= DASH_BELOW）と点線（< DASH_BELOW）でレイヤーを分ける。
  const solidFilter = useMemo<FilterSpecification>(
    () => ['all', lineFilter, ['>=', ['get', 'trains'], DASH_BELOW]] as FilterSpecification,
    [lineFilter],
  )
  const dashedFilter = useMemo<FilterSpecification>(
    () => ['all', lineFilter, ['<', ['get', 'trains'], DASH_BELOW]] as FilterSpecification,
    [lineFilter],
  )

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
        interactiveLayerIds={CLICK_LAYERS}
        cursor={cursor}
        onClick={handleClick}
        onMouseEnter={() => setCursor('pointer')}
        onMouseLeave={() => setCursor('')}
        onZoom={(e) => {
          const z = Math.floor(e.viewState.zoom)
          setZoom((prev) => (prev === z ? prev : z))
        }}
      >
        {railways.data && (
          <Source id="railways" type="geojson" data={railways.data}>
            <Layer {...lineCasingLayer} filter={solidFilter} />
            <Layer {...lineLayer} filter={solidFilter} />
            <Layer {...lineDashedLayer} filter={dashedFilter} />
            <Layer {...lineHitLayer} filter={lineFilter} />
          </Source>
        )}

        {stations.data && (
          <Source id="stations" type="geojson" data={stations.data}>
            <Layer {...stationLayer} filter={stationFilter} />
          </Source>
        )}

        {labeledStations.map((f) => (
          <Marker
            key={`${f.properties.name}:${f.geometry.coordinates[0]},${f.geometry.coordinates[1]}`}
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

        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            offset={12}
            closeOnClick={false}
            onClose={() => setPopup(null)}
          >
            {popup.kind === 'station' ? (
              <div className="map-view__popup">
                <div className="map-view__popup-title">{popup.name}</div>
                <div className="map-view__popup-row">
                  {popup.lines.length ? popup.lines.join(' / ') : '駅'}
                </div>
                {popup.stopTypes && popup.stopTypes.length > 0 && (
                  <div className="map-view__popup-stops">
                    <div className="map-view__popup-row map-view__popup-stops-head">
                      停車本数（平日・片方向）
                    </div>
                    {popup.stopTypes.map(([kind, n]) => (
                      <div key={kind} className="map-view__popup-stop-row">
                        <span>{kind}</span>
                        <span>{n} 本</span>
                      </div>
                    ))}
                    <div className="map-view__popup-stop-row map-view__popup-stop-total">
                      <span>合計</span>
                      <span>{popup.stopTrains} 本</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="map-view__popup">
                <div className="map-view__popup-title">{popup.line}</div>
                {popup.section && (
                  <div className="map-view__popup-row">区間: {popup.section}</div>
                )}
                <div className="map-view__popup-row">
                  平日・片方向 約 {popup.trains} 本
                </div>
                <div className="map-view__popup-row">
                  {popup.category === 'jr' ? 'JR' : '私鉄'}
                </div>
              </div>
            )}
          </Popup>
        )}
      </Map>
    </div>
  )
}
