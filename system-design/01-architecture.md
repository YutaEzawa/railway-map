# 01. アーキテクチャ

## 技術スタック

| 区分 | 採用技術 |
|---|---|
| ビルド/開発 | Vite 8 |
| UI | React 19 + TypeScript |
| 地図描画 | MapLibre GL JS + `react-map-gl/maplibre`（v8） |
| データ取得 | TanStack Query（`@tanstack/react-query`） |
| Lint | oxlint（ESLint ではない） |
| デプロイ | Cloudflare Pages（`main` push で自動） |

## 全体データフロー

```
[国土数値情報 N02]  [県境 GeoJSON]            ← 入力（.data/、gitignore）
        \              /
         v            v
   scripts/build-chiba-jr.cjs  ← data/chiba-lines.csv（区間・本数）を参照
         |
         v
 public/data/chiba-railways.geojson         ← 生成物（コミット）
 public/data/chiba-stations.geojson
         |
         v (fetch: TanStack Query)
   src/map/MapView.tsx  ← data/line-style.json（線の太さ）を import
         |
         v
   MapLibre GL（白地図タイル + 路線/駅レイヤー + ポップアップ）
```

- **ビルド時（Node スクリプト）**: N02 と県境から千葉県分を抽出し、CSV の区間・本数を載せて GeoJSON を生成。
- **実行時（ブラウザ）**: 生成済み GeoJSON を fetch し、MapLibre のレイヤー式で描画。

## エントリーポイント

```
src/main.tsx → src/App.tsx → src/map/MapView.tsx
```

- `src/main.tsx`: `QueryClientProvider`（TanStack Query）でラップ。
- `src/App.tsx`: `MapView` を全画面表示。
- `src/map/MapView.tsx`: 地図本体。GeoJSON 取得・レイヤー定義・ポップアップ・凡例パネルを担う。

## ディレクトリ構成（主要）

```
railway-map/
├─ data/                         # 手編集の設定（コミット）
│  ├─ chiba-lines.csv            #   路線・区間・本数・駅
│  └─ line-style.json            #   線の太さ・線種の境界値
├─ public/data/                  # 生成された静的 GeoJSON（コミット, 配信）
│  ├─ chiba-railways.geojson
│  └─ chiba-stations.geojson
├─ scripts/                      # データ生成（Node, .cjs）
│  ├─ build-chiba-jr.cjs         #   GeoJSON 生成（メイン）
│  ├─ lines-csv.cjs              #   CSV 読み書き共有モジュール
│  ├─ fetch-odpt-trains.cjs      #   ODPT から本数取得→CSV更新（任意）
│  └─ load-env.cjs               #   .env ローダー（依存なし）
├─ src/
│  ├─ main.tsx / App.tsx
│  └─ map/
│     ├─ MapView.tsx             #   地図・レイヤー・ポップアップ・凡例
│     ├─ config.ts               #   白地図スタイル・初期ビュー・出典
│     └─ lineStyle.ts            #   line-style.json を型付きで読み込む
├─ .data/                        # N02・県境の入力（gitignore）
├─ .env / .env.example           # スクリプト用の環境変数
└─ system-design/                # 本設計書
```

## 設計上の制約・方針

- ホスティングは Cloudflare Pages（無料枠）。従量課金型サービスは使わない。将来のバックエンドも Cloudflare Workers + D1 の無料プランのみ。
- 背景地図は国土地理院 白地図タイル、路線・駅は国土数値情報 N02（ともに無料、**出典表示必須**）。
- 入力の重い元データ（N02・県境）はコミットしない（`.data/`）。**生成 GeoJSON と手編集 CSV/JSON のみコミット**。
- 駅名ラベルは HTML マーカーで描く（MapLibre の symbol layer で日本語を出すには glyph(フォント PBF) のホスティングが必要なため、それを回避）。
