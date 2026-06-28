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
