---
name: update-train-counts
description: >
  data/lines.csv の「本数」列（平日・片方向）を Yahoo!路線情報の時刻表スクレイピングで更新する。
  「本数情報を更新」「本数を更新」「運行本数を更新」などと言われたときに使う。
  オプションで対象路線の絞り込み、空欄のみ埋める、キャッシュ無視が指定できる。
user-invocable: true
---

# update-train-counts — 本数情報の更新

`data/lines.csv` の `本数` 列を Yahoo!路線情報の駅時刻表から数えた値で更新するスキル。

## このスキルでやること

1. **スクレイプ**（`train-counts/scrape-yahoo-trains.cjs`）  
   Yahoo!路線情報の時刻表から各区間の平日・片方向の発車本数を数え、
   `train-counts/train-counts.json` に出力する。同じ発車時刻（時:分）は
   1 本として数える（臨時・連結列車の重複掲載を除くため）。

2. **差分確認**（`train-counts/apply-train-counts.cjs` のドライラン）  
   スクレイプ結果と CSV 現在値の差分を表示して確認を促す。

3. **CSV 反映**（`train-counts/apply-train-counts.cjs --write`）  
   ユーザーが OK なら `data/lines.csv` の `本数` 列を更新する。

4. **GeoJSON 再生成**（`scripts/build-railways.cjs`）  
   CSV から `public/data/railways.geojson` を再生成する。**これをしないと地図に反映されない**。

> スクレイプと反映は別スクリプト。CSV は手順 3 まで変更されない。
> 地図（`public/data/railways.geojson`）は CSV から生成されるため、手順 4 まで実行して初めて表示に反映される。

## 手順

### ステップ 1: スクレイプ実行

引数があれば路線名を渡す。`--fresh` が指定されたときは `FRESH=1` を付けてキャッシュを無効化する。

```bash
# 全対象路線
node train-counts/scrape-yahoo-trains.cjs

# 路線名で絞り込み
node train-counts/scrape-yahoo-trains.cjs <路線名> [<路線名>...]

# キャッシュ無視で再取得
FRESH=1 node train-counts/scrape-yahoo-trains.cjs [<路線名>...]
```

### ステップ 2: ドライランで差分を確認

スクレイプ後、ドライランを実行して結果をユーザーに見せる。

```bash
# 全件 or 路線名絞り込み
node train-counts/apply-train-counts.cjs [<路線名>...]
```

差分表の「scrape → CSV」を確認してもらい、問題なければステップ 3 へ進む。
差分が大きい行や意外な値があれば `train-counts/train-counts.json` の `sourceUrl` を案内する。

### ステップ 3: CSV に反映

```bash
node train-counts/apply-train-counts.cjs [<路線名>...] --write
```

`--only-empty` が指定されたときは現在 本数 が空の行だけ埋める:

```bash
node train-counts/apply-train-counts.cjs [<路線名>...] --only-empty --write
```

### ステップ 4: GeoJSON を再生成（地図反映に必須）

CSV を更新したら、地図が読む `public/data/railways.geojson` を再生成する。
ステップ 3 で実際に CSV を変更した場合（ドライランのみで終わった場合は不要）に実行する。

```bash
node scripts/build-railways.cjs
```

- 入力（N02・県境データ）は `.data/` 配下を既定で参照する（無い場合は `N02_DIR` / `JAPAN_GEOJSON` で指定）。
- `.data/` が無く再生成できない環境では、その旨をユーザーに伝える（CSV は更新済みだが地図は未反映）。
- 完了後、ブラウザの再読み込みで反映される。

## 対応オプション（ユーザーが自然言語で指定できる）

| ユーザーの指示 | スクリプトへの変換 |
|---|---|
| 「久留里線だけ」「内房線を」など路線名 | `<路線名>` 引数に追加 |
| 「キャッシュを使わず」「最新データで」 | `FRESH=1` 環境変数を付与 |
| 「空欄だけ埋めて」「手入力値は残して」 | `--only-empty` を追加 |
| 「確認なしで更新して」 | ドライラン確認を省いてステップ 3 に進む |

## 対象範囲

`data/lines.csv` の `駅` 列が**ある路線のみ**（現状は千葉エリアの約 38 行）が自動解決できる。
`駅` 列が空の路線は「未解決」として報告されるが、必要なら `train-counts/scrape-yahoo-trains.cjs` の
`SECTION_OVERRIDES` に `{ stationId, lineCode }` を直書きすることで対象に加えられる。

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `未解決: 路線「○○」が無い` | `LINE_NAME_TO_YAHOO` に CSV 路線名 → Yahoo 表示名の対応を追加 |
| `未解決: 方向が一意に決まらない` | `SECTION_OVERRIDES` の `toward` で向き先の駅名を指定 |
| `未解決: 駅ID未解決` | `STATION_ID_OVERRIDES` に駅名 → 駅ID を追加（Yahoo の URL から ID を確認） |
| スクレイプ結果が古い | `FRESH=1` でキャッシュを無効化して再取得 |
| CSV に予期しない値が入った | `git checkout -- data/lines.csv` で元に戻せる |

## 設定ファイルの場所（チューニング用）

`train-counts/scrape-yahoo-trains.cjs` の先頭定数を編集する。詳細は `train-counts/README.md` 参照。

- `LINE_NAME_TO_YAHOO` — CSV の路線名 → Yahoo 表示名の対応（食い違いがある路線のみ）
- `STATION_ID_OVERRIDES` — 駅名 → 駅ID の手動補正
- `SECTION_OVERRIDES` — 区間キー → `{ stationId, lineCode, station, toward }` の直接指定

## robots.txt の遵守

Yahoo!路線情報の robots.txt を厳守している。検索エンドポイントは叩かず、
許可パスのみ取得・1.2 秒間隔・`.data/yahoo-cache/` にキャッシュ（gitignore 済み）。
詳細は `train-counts/README.md` の「robots.txt の遵守」節を参照。
