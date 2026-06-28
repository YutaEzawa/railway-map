# 04. 編集できる設定ファイル

プログラミング不要で挙動を調整できるファイルの一覧。編集後の反映方法も記載。

## 1. `data/lines.csv` — 区間・本数・駅

路線ごとの区間と本数（線の太さの元）を定義する単一ソース。列は `路線,区間,本数,駅`。

| 列 | 説明 |
|---|---|
| 路線 | 親路線の表示名（凡例・色のキー） |
| 区間 | 区間ラベル（本数が区間で異なる場合のみ。分けないなら空） |
| 本数 | 平日・片方向の列車本数（← 手入力する値） |
| 駅 | その路線/区間の駅を半角スペース区切りで列挙 |

- **本数を変える**: 対象行の `本数` を編集。
- **区間で分ける**: 1 行を複数行に分け、各行に `区間`名と駅の部分集合を書く（事業者問わず可）。
  例（小湊鐵道線を 2 分割）:
  ```
  小湊鐵道線,小湊線(五井〜上総牛久),40,五井 上総村上 海士有木 上総三又 上総山田 光風台 馬立 上総牛久
  小湊鐵道線,小湊線(上総牛久〜上総中野),12,上総川間 上総鶴舞 上総久保 高滝 里見 飯給 月崎 上総大久保 養老渓谷 上総中野
  ```
- 反映: `node scripts/build-railways.cjs` → GeoJSON 再生成 → 開発サーバーが反映。

## 2. `data/line-style.json` — 線の太さ・線種の境界値

線の太さ・線種を制御するパラメータ。

| キー | 説明 |
|---|---|
| `thresholds.dashBelow` | これ未満の本数は点線 |
| `thresholds.normal` | これ以上で「普通」 |
| `thresholds.thick` | これ以上で「太線」 |
| `line` / `casing` | 実線の太さ `[細,普通,太]` をズーム別に（casing は縁取りで少し太め） |
| `dashed.dasharray` / `dashed.width` | 点線の破線パターンと太さ（ズーム別） |
| `parallelOffset` | 複々線（各停/快速）を並べる片側オフセット量(px)をズーム別に |

- 反映: 開発サーバー実行中ならファイル保存で HMR により即反映（再ビルド不要。`src/map/lineStyle.ts` が import）。

## 3. `.env` — スクリプト用の環境変数

`scripts/*.cjs` が起動時に読み込む（`.env.example` をコピーして作成）。秘密情報を含むため gitignore。

| 変数 | 用途 |
|---|---|
| `ODPT_TOKEN` | ODPT 本体 API キー（私鉄各社の本数取得） |
| `ODPT_CHALLENGE_TOKEN` | ODPT チャレンジ系 API キー（JR 東の列車時刻表） |
| `N02_DIR` / `JAPAN_GEOJSON` | ビルド入力データのパス（省略時 `.data/` 配下） |

- インラインの環境変数（`ODPT_TOKEN=... node ...`）が `.env` より優先。

## 4. スクリプト内の定数（要コード編集）

非プログラマ向けではないが、変更頻度のために記載。すべて `scripts/build-railways.cjs` 先頭付近。

| 定数 | 説明 |
|---|---|
| `LINE_COLORS` | 路線（表示名）→ 色 |
| `LINE_NAME_OVERRIDES` | N02 の曖昧な路線名 → 表示名 |
| `MAJOR_STATIONS` | 主要駅（ラベル対象）に追加する駅 |
| `SERVICE_LINES` | 複々線の並走サービス（各停/快速）の色・左右 |
| `JR_OPERATOR` / `TARGET_PREF_IDS` | JR 判定・対象都県（id 配列） |

ラベル表示ズーム（`LABEL_ZOOM`）は `src/map/MapView.tsx` で定義。

## コマンド

```bash
npm run dev       # 開発サーバー（保存で自動リロード）
npm run build     # tsc 型チェック + vite build（dist/）
npm run lint      # oxlint
node scripts/build-railways.cjs        # GeoJSON 再生成（CSV/区間を変えたとき）
node scripts/fetch-odpt-trains.cjs     # ODPT から本数取得→CSV更新（任意, 要 .env）
```
