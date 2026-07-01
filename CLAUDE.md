# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

南関東一都三県（埼玉・千葉・東京・神奈川）の鉄道（JR 東日本＋私鉄・三セク）全路線を、国土地理院の**白地図タイル**を背景に、**実緯度経度**で表示する趣味の Web アプリ。地図描画は MapLibre GL（`react-map-gl`）を使い、路線・駅データは国土数値情報（鉄道データ N02）から生成した GeoJSON を読み込む。凡例のチェックボックスで JR / 私鉄 の表示を切り替えられる。Vite + React + TypeScript で構築し、`main` への push で Cloudflare Pages に自動デプロイされる。

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

**データ生成** (`scripts/build-railways.cjs`):
- 国土数値情報 鉄道データ N02（GeoJSON。全国版）と都道府県境界 GeoJSON を入力に、**対象都県内（`TARGET_PREF_IDS`＝埼玉11/千葉12/東京13/神奈川14 の和集合）の全鉄道事業者**を抽出して 2 つの静的 GeoJSON を生成する。各路線・駅に `category`（`jr`=東日本旅客鉄道 / `private`=それ以外）を付与。
  - `public/data/railways.geojson` — 路線（MultiLineString、`line`/`category`/`color`/`trains`、区間分割時は `section`）
  - `public/data/stations.geojson` — 駅（Point、`name`/`lines`/`isJr`/`isPrivate`/`major`、停車本数があれば `stopTrains`＋`stopTypes`）。`major`=乗換駅 or 主要ターミナル。`stopTrains`=平日・片方向の合計停車（発車）本数、`stopTypes`=種別ごとの停車本数 `{種別:本数}` の JSON 文字列（geojson は入れ子を文字列化するため）。ともに急行/各停で停車パターンが違う路線の駅だけ持つ（`train-counts/station-stops.json` 由来）。
- **区間と本数は `data/lines.csv`（手編集の単一ソース）から読み込む**（`scripts/lines-csv.cjs` 経由）。CSV 列は `路線,区間,本数,駅`。CSV に無い路線は既定値（色＝灰色 `DEFAULT_COLOR`、本数＝`DEFAULT_TRAINS`）で描画される。
  - `駅`（半角スペース区切り）は**千葉エリアの路線で全駅を記載**（南関東拡張で追加した路線の多くは `本数` のみで `駅` は空）。区間に分けたい路線は、1 行を複数行に分けて各行に `区間` 名と駅の部分集合を書けばよい（事業者問わず分割可）。`本数`=平日・片方向。
  - `区間` が空の行は路線全体を 1 本で描画（`本数` のみ使用、`駅` は将来の分割用）。`区間` を付けた行は `駅` 集合で地図セグメントをその区間へ割り当てる（中点に最も近い駅の区間）。
  - 現在は総武・内房・外房・成田を区間分割済み。
- **並走サービス**（複々線で各停/快速等を line-offset で並べて描く）は `SERVICE_LINES`（総武・常磐）と、系統が重なる JR 幹線用の `CORRIDORS`（東北線・東海道線・中央線）。`CORRIDORS` は 1 つの N02 物理路線名を駅集合で「ゾーン」に分け、各ゾーンで該当する**通称**サービス（京浜東北線・宇都宮線・埼京線・横須賀線・相鉄/JR直通線・中央線快速・中央総武各停 等）を引く。共用区間は offset で並走、単独区間は中央寄せ（同名でも offset 違いは別フィーチャ＝凡例は `line` 名で集約）。本数はサービス名で CSV からひく。
- 入力の N02・県境データはリポジトリに含めず（`.data/` は gitignore）、**生成 GeoJSON と CSV をコミット**する。路線表示名・カラー・主要駅リストは `build-railways.cjs` 先頭の定数（`LINE_NAME_OVERRIDES` / `LINE_COLORS` / `MAJOR_STATIONS`）。`LINE_COLORS` は在圏内の全路線に各社公式ベースのラインカラーを定義済み（表示名でひく。未定義なら灰色 `DEFAULT_COLOR`）。`LINE_NAME_OVERRIDES` は N02 の「N号線◯◯線」「本線」等の曖昧名を `東京メトロ日比谷線`・`京急本線` のような表示名へ補正する。
- 再生成: `.data/` に入力を置いて `node scripts/build-railways.cjs`（入力パスは環境変数 `N02_DIR` / `JAPAN_GEOJSON` でも指定可）。
- 本数の自動更新（任意）: `scripts/fetch-odpt-trains.cjs` が ODPT API から平日本数を取得し、CSV の `本数` 列を上書き（取得できた区間のみ）。要 ODPT APIキー。
- 本数の更新（スクレイプ）: `/update-train-counts` スキルで実行する。詳細は `.claude/skills/update-train-counts.md` および `train-counts/README.md` 参照。
- **停車本数（駅サイズ用）**: 線の太さ＝通過本数（`trains`）、駅の丸サイズ＝停車本数（`stopTrains`）の 2 チャンネルで急行/各停の差を表す。`train-counts/scrape-station-stops.cjs` が対象路線（`TARGET_LINES`。現状は西武池袋線・京王線）の全駅について、上り（東京寄り終端）方向の平日発車本数を Yahoo!路線情報の埋め込み JSON から**種別ごと＋合計**で数えて `train-counts/station-stops.json`（`{路線:{駅名:{total,types}}}`）に出力する。`build-railways.cjs` がこれを読み駅フィーチャに `stopTrains`（合計）＋`stopTypes`（種別内訳の JSON 文字列）を付ける。地図で駅ドットをクリックすると種別ごと・合計の停車本数がポップアップに出る。直通サービス（西武→副都心線・京王→都営新宿線）は Yahoo 上で別路線扱いのため含まれない近似。対象路線を増やすにはスクレイパの `TARGET_LINES` に `{ line, terminals }` を追加して再取得→`build-railways.cjs` 再実行。

**地図レイヤー** (`src/map/`):
- `config.ts` — 白地図スタイル（`WHITE_MAP_STYLE`、国土地理院 `xyz/blank` ラスタ、ズーム 5〜14・overzoom で 16）、初期ビュー（`INITIAL_VIEW_STATE`、南関東一都三県の本土全体）、出典文字列を定義。
- `MapView.tsx` — `react-map-gl/maplibre` の `<Map>` に白地図を表示。GeoJSON は TanStack Query で fetch。路線は `<Source>`+`<Layer type="line">`（色は `['get','color']`、視認性のため暗いケーシングを下に敷く）、全駅は circle レイヤー（`stopTrains` があれば停車本数比例、無ければ `major` で 2 値のサイズ）、駅名ラベルは `<Marker>`（HTML）で描く。JR/私鉄チェックボックスの状態からレイヤー `filter` を組み立てて表示を切替。駅ラベルは全体表示では主要駅のみ、ズーム（`LABEL_ALL_ZOOM`）で全駅に切り替わる。凡例＋切替パネルを左上に重ねる。

**路線・駅データの更新方法**:
- 路線表示名・カラーや主要駅ラベルの追加・変更は `scripts/build-railways.cjs` の `LINE_NAME_OVERRIDES` / `LINE_COLORS` / `MAJOR_STATIONS` を編集して再生成する。
- 対象範囲（都県）を変える場合は `TARGET_PREF_IDS`（japan.geojson の id 配列）、JR 判定は `JR_OPERATOR` を変更する。

> 駅名ラベルは HTML マーカーで描く。MapLibre の symbol layer で日本語を出すには glyph（フォント PBF）のホスティングが必要になるため、それを避ける狙い。

## 重要な制約

- ホスティングは Cloudflare Pages（転送量無料枠が実質無制限）。従量課金型サービスは使わない。
- 将来サーバーレスバックエンドを導入する場合も Cloudflare Workers + D1 の無料プランのみ使用する。
- リンターは **oxlint**（ESLint ではない）。コミット前に `npm run lint` を実行すること。
- 背景地図は国土地理院 白地図タイル、路線・駅データは国土数値情報 鉄道データ N02（ともに無料）。**出典表示は必須**（地図 attribution に表示済み）。
