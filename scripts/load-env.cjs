/**
 * リポジトリ直下の .env を読み込んで process.env に設定する（依存なし）。
 * 既に設定済みの環境変数は上書きしない（インラインの `KEY=... node ...` が優先）。
 * 各スクリプトの先頭で require('./load-env.cjs') する。
 */
const fs = require('fs')
const path = require('path')

const ENV_PATH = path.resolve(__dirname, '../.env')
if (fs.existsSync(ENV_PATH)) {
  for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

module.exports = {}
