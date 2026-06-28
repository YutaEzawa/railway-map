# 02. データパイプラインとデータモデル

## 入力データ

| データ | 提供元 | 配置 | 用途 |
|---|---|---|---|
| 鉄道データ N02-23（GeoJSON） | 国土数値情報 | `.data/N02/UTF-8/`（gitignore） | 路線ジオメトリ・駅 |
| 都道府県境界 GeoJSON | dataofjapan/land | `.data/japan.geojson`（gitignore） | 千葉県の切り出し |

入力パスは環境変数 `N02_DIR` / `JAPAN_GEOJSON` で上書き可（既定は `.data/` 配下）。

## 生成スクリプト `scripts/build-chiba-jr.cjs`

処理の流れ:

1. **千葉県ポリゴンの内外判定**を県境 GeoJSON から構築（ray-casting、穴対応）。
2. N02 の全フィーチャから、セグメント中点／駅重心が千葉県内のものを抽出。
3. `data/chiba-lines.csv`（`scripts/lines-csv.cjs` 経由）から **区間定義・本数**を読み込む。
4. **路線**: セグメントを出力先へ振り分けて路線ごとの `MultiLineString` にまとめる。
   - 区間定義のある路線 → セグメント中点に最も近い駅が属する**区間**へ割り当て。
   - 複々線の並走サービス → 後述（1 セグメントを複数サービスへ複製）。
   - それ以外 → 路線名そのまま。
5. **駅**: 駅名で集約（乗換駅は複数路線を 1 点に）。
6. `public/data/` に 2 つの GeoJSON を出力。

事業者の分類は `category`: `jr`（運営会社＝東日本旅客鉄道）/ `private`（それ以外）。
私鉄の曖昧な路線名（「本線」「1号線」等）は `LINE_NAME_OVERRIDES` で表示名へ補正（例: 京成本線、東京メトロ東西線）。

### 区間分割（セクション）

N02 は路線を 1 本（例: 総武線＝市川〜銚子）でまとめるため、**運行本数が異なる区間**を CSV の区間行（区間名＋駅集合）で定義し、各セグメントを「中点に最も近い駅が属する区間」へ割り当てる。

- 現在の区間分割: 総武線（市川〜千葉／総武本線 千葉〜銚子）、内房線、外房線、成田線（我孫子支線／空港支線／佐倉〜松岸）。
- CSV の全路線に全駅を記載済みのため、私鉄を含めどの路線でも後から区間を増やせる（事業者問わず分割対応）。

### 複々線の並走サービス（各停／快速）

総武線・常磐線は複々線。1 本の N02 ジオメトリを、サービスごとに `line-offset` でずらして 2 本描く。

- 定義: `build-chiba-jr.cjs` の `SERVICE_LINES`（baseN02 路線名 → サービス名・色・offset(±1)）。
- 対象区間（複々線）と各サービスの本数は CSV のサービス行から取得。
- 判定: セグメントの**両端の最寄り駅がともに複々線区間内**なら並走（境界の外へはみ出さない）。
- 向きの統一: `line-offset` の左右は描画方向に依存するため、並走セグメントを **西→東に揃える**（`orientWestEast`）。これで各停/快速の側が途中で入れ替わらない（各停=+1 が常に南側）。

## 本数データ（線の太さ用）

- 単一ソースは `data/chiba-lines.csv` の `本数` 列（平日・片方向）。
- 現状は手入力の概算（JR はチャレンジ系 API キー未取得のため）。
- 任意で `scripts/fetch-odpt-trains.cjs` が ODPT（公共交通オープンデータ）の `odpt:TrainTimetable` から平日本数を集計し、**取得できた区間だけ CSV の本数列を上書き**（手入力値は保持）。要 API キー（`.env`）。

## 出力 GeoJSON スキーマ

### `public/data/chiba-railways.geojson`（路線）

`FeatureCollection`、各 `Feature` は `MultiLineString`。`properties`:

| プロパティ | 型 | 説明 |
|---|---|---|
| `line` | string | 路線（凡例・色のキー。並走は「総武線各駅停車」等） |
| `category` | `'jr' \| 'private'` | 事業者区分 |
| `color` | string | 線の色（HEX） |
| `trains` | number | 平日・片方向の本数（太さ・線種に使用） |
| `section` | string?(任意) | 区間名（区間分割時のみ） |
| `offset` | number?(任意) | 並走の左右（±1、複々線サービスのみ） |

### `public/data/chiba-stations.geojson`（駅）

`FeatureCollection`、各 `Feature` は `Point`。`properties`:

| プロパティ | 型 | 説明 |
|---|---|---|
| `name` | string | 駅名 |
| `lines` | string[] | 通る路線（表示名の配列） |
| `isJr` | boolean | JR 駅か |
| `isPrivate` | boolean | 私鉄駅か |
| `major` | boolean | 主要駅（乗換駅 or ターミナル）。ラベル表示の判定に使用 |

> 注: MapLibre の `queryRenderedFeatures` では配列プロパティ（`lines`）が JSON 文字列で返るため、フロント側で `JSON.parse` して復元する。

## 環境変数（`scripts/load-env.cjs`）

- リポジトリ直下の `.env` を読み込み `process.env` へ設定（依存なし）。インラインの環境変数が優先。
- `.env` は gitignore。雛形は `.env.example`。
- 変数: `ODPT_TOKEN`（本体 API）/ `ODPT_CHALLENGE_TOKEN`（JR 東のチャレンジ系 API）/ `N02_DIR` / `JAPAN_GEOJSON`。
