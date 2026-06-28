/**
 * 路線の線種・太さのパラメータ。
 *
 * 実際の値は `data/line-style.json`（プログラミング不要で編集可能）に置く。
 * このファイルは型を付けて読み込むだけ。JSON 側のコメントに各値の意味を記載。
 *
 * - thresholds: 本数(平日・片方向)の境界値。
 *     本数 < dashBelow            → 点線
 *     dashBelow ≦ 本数 < normal  → 細線
 *     normal   ≦ 本数 < thick    → 普通
 *     thick    ≦ 本数            → 太線
 * - line / casing: 実線（細/普通/太）の太さをズーム別に [細, 普通, 太] で指定。
 * - dashed: 点線の太さ（ズーム別）と破線パターン（line-dasharray）。
 */
import styleJson from '../../data/line-style.json'

export type WidthStops = { zoom: number; tiers: [number, number, number] }[]

export interface LineStyle {
  thresholds: { dashBelow: number; normal: number; thick: number }
  line: WidthStops
  casing: WidthStops
  dashed: { dasharray: number[]; width: { zoom: number; w: number }[] }
  /** 複々線（各停/快速）を並べて描くときの片側オフセット量(px)をズーム別に。 */
  parallelOffset: { zoom: number; px: number }[]
}

export const LINE_STYLE: LineStyle = styleJson as unknown as LineStyle
