# railway-map

南関東一都三県（埼玉・千葉・東京・神奈川）の鉄道（JR 東日本＋私鉄・三セク）全路線を、国土地理院の**白地図タイル**を背景に、**実緯度経度**で地図表示する Web アプリ。趣味で開発しているプロジェクトです。

**公開URL: https://railway-map.yuutae07.workers.dev**

## 概要

国土地理院の白地図タイルを背景に、MapLibre GL（`react-map-gl`）で南関東一都三県（埼玉・千葉・東京・神奈川）の全鉄道路線・駅を実緯度経度で描画する。路線・駅データは国土数値情報（鉄道データ N02）から生成した GeoJSON を読み込む。凡例のチェックボックスで JR / 私鉄 の表示を切り替えられる。

## 設計方針

- コスト安全性（最重要）: クラウド利用時の高額請求（従量課金の爆発）を構造的に回避する
- インフラの可搬性: Cloudflare と自宅 Docker 環境のどちらでも動かせる構成にする
- 自動デプロイ: GitHub への push をトリガーとした CI/CD を前提とする

### コスト安全性の考え方
- ホスティングは Cloudflare Workers（静的アセット配信・無料プラン）
- サーバーレス層（Workers / D1）は無料プランに留める（超過時はエラー停止で課金なし）
- 従量課金型の外部サービスは原則使わない

## 技術スタック

### フロントエンド
- ビルド基盤: Vite + React + TypeScript
- 地図描画: MapLibre GL（`react-map-gl/maplibre`）
- 状態/キャッシュ管理: TanStack Query（GeoJSON の fetch・将来のバックエンド連携を見据えて導入）

### 地図・データ
- 背景地図: 国土地理院 白地図タイル（`xyz/blank` ラスタ）
- 路線・駅データ: 国土数値情報 鉄道データ N02 から生成した静的 GeoJSON
  - `public/data/railways.geojson` — 路線（MultiLineString、`line` / `category` / `color` / `trains`）
  - `public/data/stations.geojson` — 駅（Point、`name` / `lines` / `isJr` / `isPrivate` / `major`）
- 区間・本数は手編集の単一ソース `data/lines.csv`（列: `路線,区間,本数,駅`）から生成
- **出典表示は必須**（地図 attribution に表示済み）

> 詳細なデータ生成手順・地図レイヤー構成は [CLAUDE.md](CLAUDE.md) を参照。

### ホスティング
- Cloudflare Workers（静的アセット配信、GitHub 連携で自動デプロイ）
  - ビルドコマンド: `npm run build`
  - デプロイコマンド: `npx wrangler deploy`
  - 配信設定: [wrangler.jsonc](wrangler.jsonc)（`dist/` を配信）

### バックエンド & ストレージ（将来の拡張ロードマップ・現時点では未実装）
- サーバーレス: Cloudflare Workers
- データベース: Cloudflare D1（SQLite ベース）

## セットアップ

### 必要環境
- Node.js v20 以上（LTS 推奨）

### 開発

```bash
npm install
npm run dev
```

### ビルド

```bash
npm run build     # tsc 型チェック → vite build（出力: dist/）
npm run lint      # oxlint
npm run preview   # 本番ビルドのローカルプレビュー
```

## デプロイ

`main` ブランチへの push をトリガーに Cloudflare Workers Builds で自動デプロイされる。

```
main に push
  → npm run build        （dist/ を生成）
  → npx wrangler deploy  （wrangler.jsonc に従い dist/ を配信）
```

手元から手動デプロイする場合:

```bash
npx wrangler deploy --dry-run   # 設定の妥当性チェック（実デプロイなし）
npx wrangler deploy             # 公開
```

## 本数調査の進め方（区間分割・全国拡張）

`data/lines.csv` の `状態` が空（pending）の路線について、Yahoo!路線情報の時刻表から本数を
取得して区間分割する作業は **`/split-lines` スキル**で行う。Claude Code に下記の文言で依頼する
だけでよい（モード・路線数・並列度の解釈ルールはスキルに固定済み。セッションをまたいでも同じ挙動）。

### 2つのモード

- **逐次モード** — 数路線だけ・確認しながら処理する。
- **並列バッチモード** — 全国拡張でまとめて処理する。専用エージェント `train-count-fetcher`
  （Haiku）を並列スポーンしてドライランでキャッシュを温め、最後に親が直列で書き込む
  （「並列スクレイプ → 直列反映」。CSV 競合なし・Yahoo! 礼儀のため並列度は最大 3）。

### 依頼の文言例（コピペ可）

```
# 逐次（少数・確認しながら）
/split-lines 逐次で5路線
/split-lines 南武線 を逐次で処理して
/split-lines 逐次で10路線、確認なしで反映まで

# 並列（全国拡張・まとめて）
/split-lines 並列で9路線、並列度3
/split-lines 並列バッチで pending を全部、並列度3
/split-lines 並列で30路線、3バッチ、確認なしで反映まで

# 路線名を直接指定して範囲を固定
/split-lines 並列で 南武線 横浜線 武蔵野線 京浜東北線 を処理、並列度2
```

### 文言に入れると確実な3要素

| 要素 | 書き方の例 | 省略時の既定 |
|------|-----------|-------------|
| モード | `逐次で` / `並列で` | 路線数 ≤ 5 なら逐次、> 5 や「全部」なら並列 |
| 路線数 | `9路線` / `pending全部` / 路線名を列挙 | 逐次は 5、並列は要指定 |
| 並列度 | `並列度3` / `3バッチ` | 3（最大 3 に丸め） |

おすすめ定型は **`/split-lines 並列で N路線、並列度3`**。確認を飛ばすなら末尾に `、確認なしで反映まで` を付ける。

> 既存の `駅` 列がある路線の本数だけ更新したい場合は `/update-train-counts` を使う。
> 詳細は [.claude/skills/split-lines/SKILL.md](.claude/skills/split-lines/SKILL.md) /
> [train-counts/README.md](train-counts/README.md) を参照。

## ロードマップ
- [x] 白地図背景に実緯度経度で路線・駅を表示する
- [x] 複数事業者（JR / 私鉄・三セク）・乗換駅を描画する
- [x] JR / 私鉄 の表示切替
- [x] 区間ごとの本数表示（CSV ベース）
- [x] 駅クリックで情報を表示する
- [x] 対象範囲の拡大（南関東一都三県＝埼玉・千葉・東京・神奈川）
- [x] 全路線への各社公式ベースのラインカラー付与
- [ ] 千葉以外の路線の区間分割・本数の整備（現状は既定本数）
- [ ] バックエンド（Workers / D1）の導入
- [ ] 自宅 Docker 環境での動作対応
