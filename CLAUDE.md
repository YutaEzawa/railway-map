# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

千葉県内の鉄道（JR 東日本＋私鉄・三セク）全路線を、国土地理院の**白地図タイル**を背景に、**実緯度経度**で表示する趣味の Web アプリ。地図描画は MapLibre GL（`react-map-gl`）を使い、路線・駅データは国土数値情報（鉄道データ N02）から生成した GeoJSON を読み込む。凡例のチェックボックスで JR / 私鉄 の表示を切り替えられる。Vite + React + TypeScript で構築し、`main` への push で Cloudflare Pages に自動デプロイされる。

## コマンド

```bash
npm run dev       # start dev server
npm run build     # tsc type-check then vite build (output: dist/)
npm run lint      # oxlint
npm run preview   # preview the production build locally
```

テストスイートはまだ存在しない。

## アーキテクチャ

**エントリーポイント**: `src/main.tsx` → `src/App.tsx` → `src/map/MapView.tsx`

**データ生成** (`scripts/build-chiba-jr.cjs`):
- 国土数値情報 鉄道データ N02（GeoJSON）と都道府県境界 GeoJSON を入力に、**千葉県内の全鉄道事業者**を抽出して 2 つの静的 GeoJSON を生成する。各路線・駅に `category`（`jr`=東日本旅客鉄道 / `private`=それ以外）を付与。
  - `public/data/chiba-railways.geojson` — 路線（MultiLineString、`line`/`category`/`color`/`trains`、区間分割時は `section`）
  - `public/data/chiba-stations.geojson` — 駅（Point、`name`/`lines`/`isJr`/`isPrivate`/`major`）。`major`=乗換駅 or 主要ターミナル。
- **区間と本数は `data/chiba-lines.csv`（手編集の単一ソース）から読み込む**（`scripts/lines-csv.cjs` 経由）。CSV 列は `路線,区間,本数,駅`。
  - 本数が区間で異なる JR 路線（総武・内房・外房・成田）は区間行に分割し、`駅`（半角スペース区切り）の集合で地図セグメントを区間へ割り当てる。`本数`=平日・片方向。
  - 区間分けしない路線・私鉄は `区間`/`駅` を空にし、路線名＋本数のみ。
- 入力の N02・県境データはリポジトリに含めず（`.data/` は gitignore）、**生成 GeoJSON と CSV をコミット**する。路線表示名・カラー・主要駅リストは `build-chiba-jr.cjs` 先頭の定数（`LINE_NAME_OVERRIDES` / `LINE_COLORS` / `MAJOR_STATIONS`）。
- 再生成: `.data/` に入力を置いて `node scripts/build-chiba-jr.cjs`（入力パスは環境変数 `N02_DIR` / `JAPAN_GEOJSON` でも指定可）。
- 本数の自動更新（任意）: `scripts/fetch-odpt-trains.cjs` が ODPT API から平日本数を取得し、CSV の `本数` 列を上書き（取得できた区間のみ。手入力値は保持）。要 ODPT APIキー。

**地図レイヤー** (`src/map/`):
- `config.ts` — 白地図スタイル（`WHITE_MAP_STYLE`、国土地理院 `xyz/blank` ラスタ、ズーム 5〜14・overzoom で 16）、初期ビュー（`INITIAL_VIEW_STATE`、千葉県全体）、出典文字列を定義。
- `MapView.tsx` — `react-map-gl/maplibre` の `<Map>` に白地図を表示。GeoJSON は TanStack Query で fetch。路線は `<Source>`+`<Layer type="line">`（色は `['get','color']`、視認性のため暗いケーシングを下に敷く）、全駅は circle レイヤー（`major` でサイズ可変）、駅名ラベルは `<Marker>`（HTML）で描く。JR/私鉄チェックボックスの状態からレイヤー `filter` を組み立てて表示を切替。駅ラベルは全体表示では主要駅のみ、ズーム（`LABEL_ALL_ZOOM`）で全駅に切り替わる。凡例＋切替パネルを左上に重ねる。

**路線・駅データの更新方法**:
- 路線表示名・カラーや主要駅ラベルの追加・変更は `scripts/build-chiba-jr.cjs` の `LINE_NAME_OVERRIDES` / `LINE_COLORS` / `MAJOR_STATIONS` を編集して再生成する。
- 対象範囲（県）を変える場合は `CHIBA_ID`、JR 判定は `JR_OPERATOR` を変更する。

> 駅名ラベルは HTML マーカーで描く。MapLibre の symbol layer で日本語を出すには glyph（フォント PBF）のホスティングが必要になるため、それを避ける狙い。

## 重要な制約

- ホスティングは Cloudflare Pages（転送量無料枠が実質無制限）。従量課金型サービスは使わない。
- 将来サーバーレスバックエンドを導入する場合も Cloudflare Workers + D1 の無料プランのみ使用する。
- リンターは **oxlint**（ESLint ではない）。コミット前に `npm run lint` を実行すること。
- 背景地図は国土地理院 白地図タイル、路線・駅データは国土数値情報 鉄道データ N02（ともに無料）。**出典表示は必須**（地図 attribution に表示済み）。
