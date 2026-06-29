# train-counts — 区間ごとの本数を時刻表から数えるツール

`data/lines.csv` の各路線・区間の「**平日・片方向の本数**（`本数` 列）」を、Yahoo!路線情報の
駅時刻表から数えて確認するためのスクレイパです。

- 値の単一ソースはあくまで `data/lines.csv`（手入力）。**このツールは CSV を書き換えません**。
- 数えた本数を [`train-counts.json`](./train-counts.json) に出力し、CSV の手入力値との差分を標準出力に表示します。
- 反映するかどうかは人が差分を見て判断します（確認用ツール）。

## ファイル構成

```
train-counts/
├── scrape-yahoo-trains.cjs   # スクレイパ本体（CSV は変更しない）
├── apply-train-counts.cjs    # 取得結果を data/lines.csv に反映するツール
├── train-counts.json         # 出力（最新の取得結果）
└── README.md                 # このファイル
```

- 入力 CSV: `../data/lines.csv`（`../scripts/lines-csv.cjs` 経由で読む）
- HTML キャッシュ: `../.data/yahoo-cache/`（gitignore 済み・コミットされない）

## 使い方

```bash
# 駅列のある全路線を取得（初回は数分かかる）
node train-counts/scrape-yahoo-trains.cjs

# 路線名・区間名で絞り込み（部分一致）
node train-counts/scrape-yahoo-trains.cjs 久留里線 京成千葉線

# キャッシュを使わず再取得（ダイヤ改正後など）
FRESH=1 node train-counts/scrape-yahoo-trains.cjs
```

### 出力例（標準出力）

```
  ✓ 久留里線: 17本 [木更津発・久留里・上総亀山方面] (CSV=15)
  ...
=== 差分（scrape vs CSV手入力） ===
  scrape  CSV   差   キー
     17    15     2  久留里線 *      ← * は CSV と差がある行
=== 未解決（…件・要オーバーライド） ===
  …: 理由
```

## CSV への反映（apply-train-counts.cjs）

`train-counts.json` の本数を `data/lines.csv` の `本数` 列へ反映するツールです。
スクレイパと分離してあり、**安全のため既定はドライラン**（変更内容を表示するだけ）。

```bash
# 全件ドライラン（何がどう変わるかだけ表示。CSV は変更しない）
node train-counts/apply-train-counts.cjs

# 全件を CSV に反映
node train-counts/apply-train-counts.cjs --write

# 路線名・区間名で絞って反映（部分一致）
node train-counts/apply-train-counts.cjs 久留里線 京成千葉線 --write

# 現在 本数 が空の行だけ埋める（手入力値を保護）
node train-counts/apply-train-counts.cjs --only-empty --write
```

| オプション | 意味 |
|------------|------|
| （なし） | ドライラン。`旧 → 新` の差分を表示するのみ。 |
| `--write` | 実際に `data/lines.csv` を書き換える。 |
| `--only-empty` | 現在 `本数` が空の行だけ更新（既に値がある行は触らない）。 |
| `路線名/区間名` | その行だけに絞って対象にする。 |

> スクレイプ値は端駅基準で折返しを含むため、CSV の手入力値より多めに出がちです。
> 全件 `--write` で一括上書きする前に、必ずドライランで差分を確認してください。
> CSV はバージョン管理下なので、誤って反映しても `git checkout -- data/lines.csv` で戻せます。

### 出力ファイル `train-counts.json`

各要素は 1 区間（CSV の 1 行）に対応します。

| キー | 意味 |
|------|------|
| `key` | 本数のキー（区間名があれば区間名、無ければ路線名） |
| `line` / `section` | CSV の路線名 / 区間名 |
| `station` / `stationId` | 数えた代表駅と Yahoo の駅ID |
| `lineCode` / `direction` | Yahoo の路線コードと向き（◯◯方面） |
| `weekdayCount` | スクレイプした平日・片方向の本数 |
| `manual` | CSV の手入力本数（比較用） |
| `sourceUrl` | 取得元の Yahoo 時刻表 URL |
| `fetchedAt` | 取得日時（ISO8601） |

## 動作仕様

### 数え方

1. 対象区間の **代表駅** を選ぶ（CSV `駅` 列の端駅。先頭→末尾の順に試し、最初に解決できた駅を採用）。
2. その駅から **もう一方の端へ向かう向き** を選ぶ（Yahoo の「◯◯方面」ラベルに区間内の別の駅が
   含まれる向きを優先。方向が一意でなければ未解決として報告）。
3. その向きの **平日** 時刻表ページ（`?kind=1`）の発車本数を数える。
   片方向なのでそのまま本数候補になります（ODPT 版のような ÷2 はしません）。
   **同じ発車時刻（時:分）は 1 本として数える**（臨時列車・連結列車が同一時刻で重複掲載される
   ことがあるため、列車リンクの `hh`/`mm` で集約してユニークな時刻数を本数とする）。

> 端駅は短距離の折り返し列車を含むため、区間途中より本数が多めに出る傾向があります。
> 値はあくまで「目安・確認用」として扱ってください。

### 駅名→駅IDの解決

検索エンドポイントは使わず、許可された県別 50 音インデックス
（`/timetable/pref/{県コード}/{a|ka|…}`、埼玉=11/千葉=12/東京=13/神奈川=14）を 1 回巡回して
`駅名 → 駅ID` の対応表を作り、`../.data/yahoo-cache/stations.json` にキャッシュします。
同名駅（事業者違いで別ID）は、その名前に紐づく全 ID を順に試します。

### 対象範囲（重要）

**`data/lines.csv` の `駅` 列がある路線だけ**が対象です（現状は千葉エリアの約 38 行）。
南関東拡張で追加した路線の多くは `本数` のみで `駅` 列が空のため、自動では数えられません。
必要なら後述の `SECTION_OVERRIDES` に代表駅・路線コードを直接書いて対象に加えられます。

### robots.txt の遵守

Yahoo!路線情報の robots.txt を厳守します。

- 取得するのは **許可パスのみ**:
  - `/timetable/pref/{県}/{50音}` — 駅名→駅ID 索引（`Allow: /timetable/pref*`）
  - `/timetable/{駅ID}` — 駅の路線一覧
  - `/timetable/{駅ID}/{路線}?kind=1` — 平日時刻表（`Allow: /timetable/*/*/?*`）
- **叩かないもの**: 検索（`/timetable/search` 等）、3 セグメントの個別列車詳細、`print`（いずれも `Disallow`）。
- リクエスト間隔 1.2 秒以上、`User-Agent` 明示、ローカル HTML キャッシュで再取得を抑制。

> 当初は ekitan を検討しましたが、robots.txt で時刻表系がクロール禁止かつ ClaudeBot 名指しブロック
> だったため、駅時刻表詳細ページを明示許可している Yahoo を採用しています。

## チューニング（スクリプト先頭の定数）

うまく解決できない区間は、`scrape-yahoo-trains.cjs` 先頭の定数を編集します。

| 定数 | 用途 |
|------|------|
| `LINE_NAME_TO_YAHOO` | CSV の路線名が Yahoo の表示名と食い違う場合の対応（例: `新京成線 → 京成松戸線`、`小湊鐵道線 → 小湊鉄道`）。既定は正規化して部分一致するので、例外だけ書く。 |
| `STATION_ID_OVERRIDES` | 駅名→駅IDの自動解決が外れる場合の手動補正（同名駅・索引漏れなど）。 |
| `SECTION_OVERRIDES` | 区間キー → `{ stationId, lineCode }`（解決をスキップして直接指定）または `{ station, toward }`（代表駅・向き先を上書き）。直通・分岐などの難所や、`駅` 列が空の路線を対象に加える時に使う。 |

## 関連

- 本数を ODPT API から取得する別ツール: `../scripts/fetch-odpt-trains.cjs`（こちらは取得値で CSV を上書きする）。
- データ生成の全体像はリポジトリ直下の `../CLAUDE.md` を参照。
