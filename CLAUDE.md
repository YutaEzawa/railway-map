# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

日本の地図上に鉄道路線を表示する趣味の Web アプリ。Vite + React + TypeScript で構築し、`main` への push で Cloudflare Pages に自動デプロイされる。

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

**地図レイヤー** (`src/map/`):
- `config.ts` — Single source of truth for all map configuration: initial viewport, GSI raster tile definition, and railway data source kind/URLs. When adding railway data, this is the only file that needs the source URL changed.
- `MapView.tsx` — Renders a `react-map-gl/maplibre` `<Map>` with the GSI standard raster tile as the background. Railway line layers (`<Source>` + `<Layer>`) go inside this component, gated on `ROUTE_SOURCE_KIND` from `config.ts`.

**路線データ戦略** (`config.ts` で定義):
- `ROUTE_SOURCE_KIND` — Switches between `'geojson'` (local asset, small data) and `'pmtiles'` (vector tiles via Cloudflare R2, large data).
- スタイリング・インタラクションは両フォーマットで共通して残る属性名のみに依存させ、移行コストを最小化する。

**背景地図**: 国土地理院 標準地図（ラスタタイル）。従量課金なし。画面上に「国土地理院」の出典表示を必ず表示すること。

**状態管理・データ取得**: TanStack Query は将来のバックエンド連携を見据えて導入済みだが、現時点では未使用。

## 重要な制約

- 従量課金型タイルサービスは使わない。背景タイルは国土地理院タイルなど Egress コストがかからないものに限定する。
- 将来の PMTiles ファイルは Cloudflare R2（Egress 無料）に置く。サーバーレスバックエンドは Cloudflare Workers + D1 の無料プランのみ使用する。
- リンターは **oxlint**（ESLint ではない）。コミット前に `npm run lint` を実行すること。
