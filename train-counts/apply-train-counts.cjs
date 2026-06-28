/**
 * train-counts.json（scrape-yahoo-trains.cjs の出力）の本数で
 * data/lines.csv の「本数」列を更新するツール。
 *
 * scrape-yahoo-trains.cjs は CSV を変更しない（確認用）。本数を実際に CSV へ
 * 反映したいときにこのスクリプトを使う。既存の lines-csv.cjs で読み書きする。
 *
 * 安全策:
 *   - 既定は **ドライラン**（変更内容を表示するだけ。CSV は書き換えない）。
 *   - 実際に書き込むには `--write` を付ける。
 *   - 路線名/区間名を引数で渡すと、その行だけに絞って適用できる。
 *   - `--only-empty` で「現在 本数 が空の行だけ」埋める（手入力値を保護）。
 *
 * 使い方:
 *   node train-counts/apply-train-counts.cjs                 # 全件ドライラン（差分表示）
 *   node train-counts/apply-train-counts.cjs --write         # 全件を CSV に反映
 *   node train-counts/apply-train-counts.cjs 久留里線 --write  # 指定行だけ反映
 *   node train-counts/apply-train-counts.cjs --only-empty --write  # 空欄だけ埋める
 */
const fs = require('fs')
const path = require('path')
const { readRows, writeRows, trainKey } = require('../scripts/lines-csv.cjs')

const COUNTS_PATH = path.resolve(__dirname, 'train-counts.json')

function main() {
  const argv = process.argv.slice(2)
  const write = argv.includes('--write')
  const onlyEmpty = argv.includes('--only-empty')
  const filters = argv.filter((a) => !a.startsWith('-'))

  if (!fs.existsSync(COUNTS_PATH)) {
    console.error(`${path.relative(process.cwd(), COUNTS_PATH)} がありません。先に scrape-yahoo-trains.cjs を実行してください。`)
    process.exit(1)
  }
  const counts = JSON.parse(fs.readFileSync(COUNTS_PATH, 'utf8'))
  const countByKey = new Map(counts.map((c) => [c.key, c.weekdayCount]))

  const rows = readRows()
  const matchesFilter = (r) =>
    !filters.length || filters.some((f) => r.line.includes(f) || (r.section && r.section.includes(f)) || trainKey(r) === f)

  const changes = [] // { key, from, to }
  const skipped = [] // { key, reason }
  for (const r of rows) {
    const key = trainKey(r)
    if (!countByKey.has(key)) continue
    if (!matchesFilter(r)) continue
    const to = countByKey.get(key)
    const from = r.trains
    if (onlyEmpty && from != null) {
      skipped.push({ key, reason: `既に本数あり(${from})` })
      continue
    }
    if (from === to) {
      skipped.push({ key, reason: `変更なし(${to})` })
      continue
    }
    changes.push({ key, from, to, row: r })
  }

  console.log(`=== ${write ? '適用' : 'ドライラン'}: ${changes.length} 件の変更${onlyEmpty ? '（空欄のみ）' : ''} ===`)
  console.log('   旧 →   新   キー')
  for (const c of changes) {
    console.log(`  ${String(c.from ?? '-').padStart(3)} → ${String(c.to).padStart(3)}  ${c.key}`)
  }

  if (!changes.length) {
    console.log('\n変更対象がありません。')
    return
  }

  if (!write) {
    console.log('\nドライランです。CSV は変更していません。反映するには --write を付けてください。')
    return
  }

  for (const c of changes) c.row.trains = c.to
  writeRows(rows)
  console.log(`\nCSV を更新しました（${changes.length} 件）: data/lines.csv`)
}

main()
