/**
 * 路線・区間・本数の定義 CSV（data/lines.csv）の読み書き。
 *
 * 列: 路線,区間,本数,駅
 *   - 路線: 親路線の表示名（凡例・色のキー。例: 総武線 / 京成本線）
 *   - 区間: 区間ラベル（運転本数が区間で異なる JR 路線のみ。例: 総武線(市川〜千葉)）。
 *           区間分けしない路線は空。
 *   - 本数: 平日・片方向の列車本数（手入力する値）。空なら既定値。
 *   - 駅: その区間に属する駅名を半角スペース区切りで列挙（区間行のみ）。
 *         この駅集合で地図上のセグメントを区間に割り当てる。
 *
 * 本数の対応キーは「区間が空でなければ区間ラベル、空なら路線名」。
 */
const fs = require('fs')
const path = require('path')

const CSV_PATH = path.resolve(__dirname, '../data/lines.csv')
const HEADER = '路線,区間,本数,駅'

/** 本数のキー（区間優先）。 */
function trainKey(row) {
  return row.section || row.line
}

/** CSV を読み込んで行配列にする。 */
function readRows(csvPath = CSV_PATH) {
  const text = fs.readFileSync(csvPath, 'utf8')
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  const rows = []
  for (const line of lines) {
    if (line === HEADER) continue
    const parts = line.split(',')
    const [lineName = '', section = '', trains = ''] = parts
    const stationsRaw = parts.slice(3).join(',') // 駅にカンマは無い前提
    rows.push({
      line: lineName.trim(),
      section: section.trim(),
      trains: trains.trim() === '' ? null : Number(trains.trim()),
      stations: stationsRaw.trim() === '' ? [] : stationsRaw.trim().split(/\s+/),
    })
  }
  return rows
}

/** 行配列を CSV 文字列にする（readRows と往復可能な形式）。 */
function serialize(rows) {
  const body = rows.map((r) =>
    [r.line, r.section, r.trains == null ? '' : String(r.trains), r.stations.join(' ')].join(','),
  )
  return [HEADER, ...body].join('\n') + '\n'
}

/** 行配列を CSV に書き出す。 */
function writeRows(rows, csvPath = CSV_PATH) {
  fs.writeFileSync(csvPath, serialize(rows))
}

/** 区間定義（地図のセグメント割り当て用）。{ 路線名: [{label, stations}] }。 */
function toSections(rows) {
  const sections = {}
  for (const r of rows) {
    if (r.section && r.stations.length) {
      ;(sections[r.line] = sections[r.line] || []).push({ label: r.section, stations: r.stations })
    }
  }
  return sections
}

/** 本数マップ。{ キー(区間 or 路線): 本数 }。 */
function toTrains(rows) {
  const trains = {}
  for (const r of rows) if (r.trains != null) trains[trainKey(r)] = r.trains
  return trains
}

module.exports = { CSV_PATH, readRows, writeRows, serialize, toSections, toTrains, trainKey }
