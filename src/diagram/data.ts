/**
 * JR東日本 路線図（模式図 / スキマティック）のデータ。
 *
 * 地理座標ではなく、駅を見やすく整理した「図上の座標」を手で配置する。
 * 座標系は左上原点の SVG ビューボックス（DIAGRAM_VIEWBOX）。
 *
 * 拡張方法:
 *   1. STATIONS に駅を追加（id をキーに name / x / y / labelDir / major を定義）。
 *   2. LINES に路線を追加（通過順に駅 id を並べる。color は路線カラー）。
 * 既存の駅 id を複数路線で共有すると、その駅が乗換駅として自然に重なる。
 */

export type StationId = string

/** ラベルを駅点のどちら側に置くか。 */
export type LabelDir = 'left' | 'right' | 'up' | 'down'

export interface Station {
  name: string
  x: number
  y: number
  /** ラベルの向き（既定: 'right'）。 */
  labelDir?: LabelDir
  /** 主要駅・乗換駅。マーカーを一回り大きくする。 */
  major?: boolean
}

export interface DiagramLine {
  id: string
  name: string
  /** 路線カラー（公式の路線記号色に近い値）。 */
  color: string
  /** 通過順の駅 id。 */
  stations: StationId[]
}

/** 模式図の論理サイズ。SVG の viewBox に使う。 */
export const DIAGRAM_VIEWBOX = { width: 800, height: 1000 } as const

/**
 * 駅の図上座標。山手線は中央のループ、放射路線はその内外に伸ばす。
 */
export const STATIONS: Record<StationId, Station> = {
  // --- 山手線ループ（時計回り） ---
  tokyo: { name: '東京', x: 560, y: 480, labelDir: 'right', major: true },
  kanda: { name: '神田', x: 560, y: 420, labelDir: 'right' },
  akihabara: { name: '秋葉原', x: 560, y: 360, labelDir: 'right' },
  okachimachi: { name: '御徒町', x: 560, y: 300, labelDir: 'right' },
  ueno: { name: '上野', x: 555, y: 232, labelDir: 'right', major: true },
  nippori: { name: '日暮里', x: 470, y: 185, labelDir: 'up' },
  tabata: { name: '田端', x: 340, y: 195, labelDir: 'up' },
  komagome: { name: '駒込', x: 300, y: 270, labelDir: 'left' },
  sugamo: { name: '巣鴨', x: 300, y: 330, labelDir: 'left' },
  otsuka: { name: '大塚', x: 300, y: 390, labelDir: 'left' },
  ikebukuro: { name: '池袋', x: 300, y: 450, labelDir: 'left', major: true },
  mejiro: { name: '目白', x: 300, y: 510, labelDir: 'left' },
  takadanobaba: { name: '高田馬場', x: 300, y: 570, labelDir: 'left' },
  shinokubo: { name: '新大久保', x: 300, y: 630, labelDir: 'left' },
  shinjuku: { name: '新宿', x: 320, y: 770, labelDir: 'down', major: true },
  yoyogi: { name: '代々木', x: 390, y: 805, labelDir: 'down' },
  harajuku: { name: '原宿', x: 445, y: 805, labelDir: 'down' },
  shibuya: { name: '渋谷', x: 500, y: 805, labelDir: 'down', major: true },
  ebisu: { name: '恵比寿', x: 560, y: 760, labelDir: 'right' },
  shinagawa: { name: '品川', x: 560, y: 690, labelDir: 'right', major: true },
  hamamatsucho: { name: '浜松町', x: 560, y: 620, labelDir: 'right' },
  shimbashi: { name: '新橋', x: 560, y: 560, labelDir: 'right' },
  yurakucho: { name: '有楽町', x: 560, y: 520, labelDir: 'right' },

  // --- 中央快速線（ループを横断して西へ） ---
  yotsuya: { name: '四ツ谷', x: 420, y: 575, labelDir: 'up' },
  nakano: { name: '中野', x: 220, y: 835, labelDir: 'down' },
  mitaka: { name: '三鷹', x: 110, y: 875, labelDir: 'down', major: true },

  // --- 京浜東北線（右側を並走、大宮〜横浜） ---
  omiya: { name: '大宮', x: 660, y: 120, labelDir: 'right', major: true },
  akabane: { name: '赤羽', x: 628, y: 200, labelDir: 'right' },
  oji: { name: '王子', x: 608, y: 262, labelDir: 'right' },
  kamata: { name: '蒲田', x: 620, y: 880, labelDir: 'right' },
  yokohama: { name: '横浜', x: 662, y: 945, labelDir: 'right', major: true },
}

/**
 * 路線。stations は通過順の駅 id。
 * 山手線は始点＝終点（tokyo）でループを閉じる。
 */
export const LINES: DiagramLine[] = [
  {
    id: 'yamanote',
    name: '山手線',
    color: '#80C241',
    stations: [
      'tokyo', 'kanda', 'akihabara', 'okachimachi', 'ueno', 'nippori', 'tabata',
      'komagome', 'sugamo', 'otsuka', 'ikebukuro', 'mejiro', 'takadanobaba',
      'shinokubo', 'shinjuku', 'yoyogi', 'harajuku', 'shibuya', 'ebisu',
      'shinagawa', 'hamamatsucho', 'shimbashi', 'yurakucho', 'tokyo',
    ],
  },
  {
    id: 'chuo-rapid',
    name: '中央線快速',
    color: '#F15A22',
    stations: ['tokyo', 'yotsuya', 'shinjuku', 'nakano', 'mitaka'],
  },
  {
    id: 'keihin-tohoku',
    name: '京浜東北線',
    color: '#00AEEF',
    stations: ['omiya', 'akabane', 'oji', 'kamata', 'yokohama'],
  },
]
