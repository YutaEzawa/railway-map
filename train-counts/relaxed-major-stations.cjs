/**
 * 「多くの列車が止まる駅」（＝区間境界にふさわしい駅）を、駅ごとの種別別停車本数から求める。
 * データ源（Yahoo!スクレイプ／ODPT実データ）に依存しない共通ロジック。
 * `auto_v3` は「この基準で境界を選んだ（＝多くの列車が止まる駅を境界にした）」ことを表す状態値であり、
 * データ源が何であるかは問わない。
 *
 * 判定は2段階:
 *   1. 路線内最大種別の RARE_TYPE_RATIO 未満の種別（特急・ライナー等の優等/少数便）を無視する。
 *   2. 残った種別のうち、対象駅の前後 WINDOW 駅以内で実際に運行がある種別（＝その区間を
 *      走っている種別）だけを「その駅で全部停車していないといけない種別」とする。
 *      路線内のどこか別の枝（例: 京王線の快速＝相模原線直通で八王子方面には来ない）でしか
 *      走らない種別まで全駅に要求すると、正当な境界（例: 北野）まで不一致になってしまうため。
 */
const RARE_TYPE_RATIO = 0.25
const WINDOW = 5

/**
 * @param {string[]} orderedStations 路線の駅名（物理順）
 * @param {Record<string, Record<string, number>>} stopCounts 駅名 -> {種別: 本数}
 * @param {number} [window]
 * @returns {{ majorTypes: string[], result: Set<string> }}
 */
function relaxedMajorStations(orderedStations, stopCounts, window = WINDOW) {
  const globalRep = {}
  for (const types of Object.values(stopCounts)) {
    for (const [type, count] of Object.entries(types)) {
      globalRep[type] = Math.max(globalRep[type] ?? 0, count)
    }
  }
  const globalMax = Math.max(0, ...Object.values(globalRep))
  const majorTypes = new Set(Object.keys(globalRep).filter((t) => globalRep[t] >= globalMax * RARE_TYPE_RATIO))

  const n = orderedStations.length
  const result = new Set()
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - window)
    const hi = Math.min(n - 1, i + window)
    const localTypes = new Set()
    for (let j = lo; j <= hi; j++) {
      const types = stopCounts[orderedStations[j]] || {}
      for (const t of Object.keys(types)) if (majorTypes.has(t)) localTypes.add(t)
    }
    const types = stopCounts[orderedStations[i]] || {}
    if ([...localTypes].every((t) => (types[t] ?? 0) > 0)) result.add(orderedStations[i])
  }
  return { majorTypes: [...majorTypes], result }
}

module.exports = { relaxedMajorStations, RARE_TYPE_RATIO, WINDOW }
