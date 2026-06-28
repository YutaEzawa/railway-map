/**
 * data/chiba-lines.csv の「本数」列を ODPT（公共交通オープンデータ）で更新するスクリプト。
 *
 * 本数の単一ソースは data/chiba-lines.csv（手入力）。このスクリプトは、ODPT で
 * 取得できた路線・区間だけ本数を実数で上書きし、それ以外の手入力値は保持する。
 *
 * データ源: ODPT の odpt:TrainTimetable（ https://www.odpt.org/ 無料・要APIキー）
 *
 * 使い方:
 *   - リポジトリ直下の .env に ODPT_TOKEN / ODPT_CHALLENGE_TOKEN を記入して
 *     `node scripts/fetch-odpt-trains.cjs`（.env は .env.example を参照）。
 *   - もしくはインラインで:
 *     ODPT_TOKEN=<本体APIキー> [ODPT_CHALLENGE_TOKEN=<チャレンジAPIキー>] \
 *       node scripts/fetch-odpt-trains.cjs
 *   - JR東日本はチャレンジ系（api-challenge2024.odpt.org）。現状キー取得保留のため
 *     ODPT_CHALLENGE_TOKEN 未設定なら JR はスキップ（CSV の手入力値のまま）。
 *   - 東京メトロ/都営/つくばEX 等は本体（api.odpt.org）。
 *   - キーが無ければ何も更新せず、現在の CSV 値を表示するだけ。
 *
 * 集計: odpt:calendar が平日のものを odpt:railway 単位で件数集計（両方向）し、
 *       ÷2（四捨五入）で片方向換算。ODPT_RAILWAY_TO_LINE で CSV のキー
 *       （区間ラベル or 路線名）へ対応づけて合算する。
 */
require('./load-env.cjs')
const { readRows, writeRows, trainKey } = require('./lines-csv.cjs')

const WEEKDAY = 'odpt.Calendar:Weekday'

/** 取得対象の事業者（id・APIホスト・使用するトークンの環境変数名）。 */
const OPERATORS = [
  { id: 'JR-East', host: 'https://api-challenge2024.odpt.org/api/v4', tokenEnv: 'ODPT_CHALLENGE_TOKEN' },
  { id: 'TokyoMetro', host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' },
  { id: 'Toei', host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' },
  { id: 'MIR', host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' },
  { id: 'Keisei', host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' },
  { id: 'Shinkeisei', host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' },
  { id: 'Hokuso', host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' },
  { id: 'ToyoRapid', host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' },
  { id: 'Tobu', host: 'https://api.odpt.org/api/v4', tokenEnv: 'ODPT_TOKEN' },
]

/**
 * ODPT 路線ID（odpt.Railway:... の "..." 部分）→ CSV のキー（区間ラベル or 路線名）。
 * 区間分割した JR 路線は区間ラベルへ対応づける。私鉄IDは推定を含む（ログで要確認）。
 */
const ODPT_RAILWAY_TO_LINE = {
  // JR 東日本（区間ラベルへ）
  'JR-East.ChuoSobuLocal': '総武線(市川〜千葉)',
  'JR-East.SobuRapid': '総武線(市川〜千葉)',
  'JR-East.Sobu': '総武本線(千葉〜銚子)',
  'JR-East.Keiyo': '京葉線',
  'JR-East.Sotobo': '外房線(千葉〜上総一ノ宮)',
  'JR-East.Uchibo': '内房線(蘇我〜君津)',
  'JR-East.Narita': '成田線(佐倉〜松岸)',
  'JR-East.NaritaAbikoBranch': '成田線(我孫子支線)',
  'JR-East.NaritaAirportBranch': '成田線(空港支線)',
  'JR-East.Togane': '東金線',
  'JR-East.Kururi': '久留里線',
  'JR-East.Kashima': '鹿島線',
  'JR-East.Musashino': '武蔵野線',
  'JR-East.JobanRapid': '常磐線',
  'JR-East.JobanLocal': '常磐線',
  // 私鉄（ID は推定。ログの「未対応の路線ID」を見て修正）
  'TokyoMetro.Tozai': '東京メトロ東西線',
  'Toei.Shinjuku': '都営新宿線',
  'MIR.TsukubaExpress': 'つくばエクスプレス',
  'Keisei.Main': '京成本線',
  'Keisei.Chiba': '京成千葉線',
  'Keisei.Chihara': '京成千原線',
  'Keisei.HigashiNarita': '京成東成田線',
  'Keisei.NaritaSkyAccess': '成田スカイアクセス線',
  'Shinkeisei.ShinKeisei': '新京成線',
  'Shinkeisei.Main': '新京成線',
  'Hokuso.Hokuso': '北総線',
  'ToyoRapid.ToyoRapid': '東葉高速線',
  'Tobu.TobuUrbanPark': '東武野田線',
  'Tobu.Noda': '東武野田線',
}

const shortId = (full) => String(full).replace(/^odpt\.Railway:/, '')

async function fetchTimetables(op, token) {
  const url = `${op.host}/odpt:TrainTimetable?odpt:operator=odpt.Operator:${op.id}&acl:consumerKey=${token}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('unexpected response')
  return data
}

async function main() {
  const rows = readRows()
  const rowByKey = {}
  for (const r of rows) rowByKey[trainKey(r)] = r

  const fromOdpt = {} // CSVキー -> 片方向本数
  const unmapped = new Set()
  let anyToken = false

  for (const op of OPERATORS) {
    const token = process.env[op.tokenEnv]
    if (!token) { console.log(`- ${op.id}: skip（${op.tokenEnv} 未設定）`); continue }
    anyToken = true
    let tts
    try {
      tts = await fetchTimetables(op, token)
    } catch (e) {
      console.log(`- ${op.id}: 取得失敗（${e.message}）`)
      continue
    }
    const byRailway = {}
    for (const t of tts) {
      if (t['odpt:calendar'] !== WEEKDAY) continue
      const rid = shortId(t['odpt:railway'])
      byRailway[rid] = (byRailway[rid] || 0) + 1
    }
    const got = []
    for (const [rid, both] of Object.entries(byRailway)) {
      const key = ODPT_RAILWAY_TO_LINE[rid]
      if (!key) { unmapped.add(`${rid} (両方向${both})`); continue }
      fromOdpt[key] = (fromOdpt[key] || 0) + Math.round(both / 2)
      got.push(key)
    }
    console.log(`- ${op.id}: 平日時刻表 ${tts.length} 件 → ${[...new Set(got)].join('、') || 'なし'}`)
  }

  // CSV の本数列を ODPT 値で上書き（取れたものだけ）。
  let updated = 0
  const missingKey = []
  for (const [key, n] of Object.entries(fromOdpt)) {
    if (rowByKey[key]) {
      if (rowByKey[key].trains !== n) updated++
      rowByKey[key].trains = n
    } else {
      missingKey.push(`${key} (=${n})`)
    }
  }

  console.log('\n=== 現在の本数（平日・片方向、CSV 反映後） ===')
  ;[...rows]
    .sort((a, b) => (b.trains ?? -1) - (a.trains ?? -1))
    .forEach((r) => {
      const src = fromOdpt[trainKey(r)] != null ? 'odpt' : 'manual'
      console.log(`  ${String(r.trains ?? '-').padStart(4)}  ${trainKey(r)}  [${src}]`)
    })

  if (unmapped.size) {
    console.log('\n=== 未対応の路線ID（ODPT_RAILWAY_TO_LINE に追加して再実行） ===')
    ;[...unmapped].sort().forEach((u) => console.log(`  ${u}`))
  }
  if (missingKey.length) {
    console.log('\n=== CSV にキーが無い対応先（CSV の路線/区間名と不一致） ===')
    missingKey.forEach((m) => console.log(`  ${m}`))
  }

  if (!anyToken) {
    console.log('\nODPT キー未設定のため CSV は変更なし（手入力値のまま）。')
    return
  }
  if (updated > 0) {
    writeRows(rows)
    console.log(`\nCSV を更新（${updated} 件）: data/chiba-lines.csv`)
  } else {
    console.log('\n更新対象なし（CSV は変更なし）。')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
