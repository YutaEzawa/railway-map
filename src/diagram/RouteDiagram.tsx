import {
  DIAGRAM_VIEWBOX,
  LINES,
  STATIONS,
  type LabelDir,
  type StationId,
} from './data'
import './RouteDiagram.css'

const LINE_WIDTH = 8
const STATION_R = 5
const STATION_R_MAJOR = 7.5

/** ラベルの向きから、テキストの位置・揃えを求める。 */
function labelAttrs(x: number, y: number, dir: LabelDir = 'right') {
  const gap = 12
  switch (dir) {
    case 'left':
      return { x: x - gap, y, textAnchor: 'end' as const, dominantBaseline: 'middle' as const }
    case 'up':
      return { x, y: y - gap, textAnchor: 'middle' as const, dominantBaseline: 'auto' as const }
    case 'down':
      return { x, y: y + gap, textAnchor: 'middle' as const, dominantBaseline: 'hanging' as const }
    case 'right':
    default:
      return { x: x + gap, y, textAnchor: 'start' as const, dominantBaseline: 'middle' as const }
  }
}

/** 駅 id 列から SVG polyline 用の "x,y x,y ..." 文字列を作る。 */
function toPoints(stationIds: StationId[]): string {
  return stationIds
    .map((id) => {
      const s = STATIONS[id]
      return `${s.x},${s.y}`
    })
    .join(' ')
}

/**
 * JR東日本の路線を模式図（スキマティック）で表示する。
 * 地理院地図のような背景タイルは使わず、手で配置した図上座標を SVG で描く。
 */
export default function RouteDiagram() {
  // いずれかの路線で参照されている駅だけを描画対象にする。
  const usedIds = new Set<StationId>()
  for (const line of LINES) {
    for (const id of line.stations) usedIds.add(id)
  }

  return (
    <div className="route-diagram">
      <div className="route-diagram__legend">
        {LINES.map((line) => (
          <span key={line.id} className="route-diagram__legend-item">
            <span className="route-diagram__swatch" style={{ background: line.color }} />
            {line.name}
          </span>
        ))}
      </div>

      <svg
        className="route-diagram__svg"
        viewBox={`0 0 ${DIAGRAM_VIEWBOX.width} ${DIAGRAM_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="JR東日本 路線図"
      >
        {/* 路線ライン */}
        {LINES.map((line) => (
          <polyline
            key={line.id}
            points={toPoints(line.stations)}
            fill="none"
            stroke={line.color}
            strokeWidth={LINE_WIDTH}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* 駅マーカーとラベル */}
        {[...usedIds].map((id) => {
          const s = STATIONS[id]
          const r = s.major ? STATION_R_MAJOR : STATION_R
          const label = labelAttrs(s.x, s.y, s.labelDir)
          return (
            <g key={id}>
              <circle
                cx={s.x}
                cy={s.y}
                r={r}
                fill="#ffffff"
                stroke="#333333"
                strokeWidth={2.5}
              />
              <text
                className={s.major ? 'route-diagram__label route-diagram__label--major' : 'route-diagram__label'}
                x={label.x}
                y={label.y}
                textAnchor={label.textAnchor}
                dominantBaseline={label.dominantBaseline}
              >
                {s.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
