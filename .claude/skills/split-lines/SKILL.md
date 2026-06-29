---
name: split-lines
description: >
  data/lines.csv の「状態」が空（pending）の路線について、Yahoo!路線情報の時刻表から
  区間ごとの本数を自動取得し、本数が一様なら auto_v1、区間分割が必要なら auto_v2 で
  CSV を更新するスキル。「分割を自動化」「区間を自動生成」などと言われたときに使う。
user-invocable: true
---

# split-lines — 区間分割の自動化

`data/lines.csv` の `状態` が空（pending）の路線を選択し、Yahoo!路線情報の時刻表から
区間ごとの本数を取得して、必要に応じて区間分割を自動生成するスキル。

## 状態値の意味

| 状態       | 意味                                           |
|------------|------------------------------------------------|
| （空）     | 未処理（pending）。このスキルの処理対象         |
| `manual`   | 手動で駅列・区間を記載済み。変更しない          |
| `auto_v1`  | 自動処理済み（均一本数、区間分割なし）          |
| `auto_v2`  | 自動処理済み（区間分割あり、駅列を自動生成）    |
| `auto_fail`| 自動処理に失敗（Yahoo!解決不可など）            |

## このスキルでやること

### ステップ 1: 対象路線の選択

`状態` が空の行から `--count N`（デフォルト5）路線分を選択してドライランを実行する。

```bash
node split-lines/split-lines.cjs [--count N] [--line 路線名] [--fresh]
```

### ステップ 2: 結果の確認

スクリプト出力のサマリーをユーザーに見せる。ポイント：
- **均一（auto_v1）**: 本数に問題ないか確認する
- **区間分割（auto_v2）**: 生成された区間・本数・駅列を確認する
- **失敗（auto_fail）**: 理由を確認し、必要に応じて `SECTION_OVERRIDES` や `LINE_NAME_TO_YAHOO` の追記を提案する

### ステップ 3: CSV への反映

ユーザーが OK なら `--write` を付けて実行する。

```bash
node split-lines/split-lines.cjs [--count N] [--line 路線名] [--write]
```

### ステップ 4: GeoJSON の再生成（地図反映に必須）

```bash
node scripts/build-railways.cjs
```

`.data/` が無い環境では CSV は更新済みだが GeoJSON は未反映である旨を伝える。

## 対応オプション（ユーザーが自然言語で指定できる）

| ユーザーの指示               | スクリプトへの変換                        |
|------------------------------|-------------------------------------------|
| 「5路線分」「10本ずつ」など  | `--count N` 引数に変換                    |
| 「京急本線だけ」など路線名   | `--line 路線名` 引数に変換                |
| 「キャッシュを使わず」       | `--fresh` フラグを追加                    |
| 「確認なしで更新して」       | ドライラン確認を省いてステップ 3 に進む   |

## 処理アルゴリズム

1. `public/data/railways.geojson` と `public/data/stations.geojson` から、路線上の駅を
   路線ジオメトリへの射影によって順序付き（始端→終端）で取得する。
2. 始端駅・終端付近の駅でYahoo!時刻表をスクレイプし、平日・片方向の本数を数える。
3. 本数が一様（差が10%以内 or 5本以内）→ **auto_v1**（本数を確認・更新）
4. 本数が異なる → 二分探索で変化点を特定 → **auto_v2**（区間ごとの行を生成）
5. 解決不可（駅IDが不明、路線が見つからない等）→ **auto_fail**（理由を記録）

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| `始端「○○」で本数取得失敗` | `split-lines.cjs` の `LINE_NAME_TO_YAHOO` に路線名対応を追加 |
| GeoJSONに駅データなし | `public/data/stations.geojson` に路線名が含まれているか確認（corridor系は別名の場合がある） |
| 方向が一意に決まらない | `split-lines.cjs` の `SECTION_OVERRIDES`（未実装の場合は `TOWARD_OVERRIDES`）に路線・向き先を追加 |
| 変化点がおかしい | ドライランで区間・本数を確認し、`--line` で個別に再実行 |
| スクレイプ結果が古い | `--fresh` でキャッシュを無効化 |

## robots.txt の遵守

Yahoo!路線情報の robots.txt を厳守している。1.2 秒間隔・許可パスのみ取得・
`.data/yahoo-cache/` にキャッシュ（gitignore 済み）。

## 設定ファイル

`split-lines/split-lines.cjs` の先頭定数を編集する。

- `LINE_NAME_TO_YAHOO` — CSV の路線名 → Yahoo 表示名の対応（食い違いがある路線のみ）
- `isSameFreq()` — 「均一」とみなす閾値（デフォルト: ±10% or ±5本）
