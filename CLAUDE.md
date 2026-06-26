# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

JR 東日本などの鉄道路線を「路線図（模式図 / スキマティック）」として表示する趣味の Web アプリ。地理院地図のような背景タイルは使わず、駅を見やすく整理した図上座標を SVG で描く。Vite + React + TypeScript で構築し、`main` への push で Cloudflare Pages に自動デプロイされる。

## コマンド

```bash
npm run dev       # start dev server
npm run build     # tsc type-check then vite build (output: dist/)
npm run lint      # oxlint
npm run preview   # preview the production build locally
```

テストスイートはまだ存在しない。

## アーキテクチャ

**エントリーポイント**: `src/main.tsx` → `src/App.tsx` → `src/diagram/RouteDiagram.tsx`

**路線図レイヤー** (`src/diagram/`):
- `data.ts` — Single source of truth for the diagram. 駅の図上座標（`STATIONS`）と路線（`LINES`）を手で定義する。地理座標ではなく、SVG ビューボックス（`DIAGRAM_VIEWBOX`）上の論理座標。路線を増やすときはこのファイルだけを編集する。
- `RouteDiagram.tsx` — `data.ts` を読み、SVG で路線ライン（`<polyline>`）・駅マーカー・駅名ラベル・凡例を描画する。背景タイルなしの無地背景。

**路線図データの追加方法** (`data.ts`):
1. `STATIONS` に駅を追加（`id` をキーに `name` / `x` / `y` / `labelDir` / `major`）。
2. `LINES` に路線を追加（通過順の駅 `id` を並べ、`color` に路線カラーを指定）。
3. 既存の駅 `id` を複数路線で共有すると、その駅が乗換駅として自然に重なる。

**状態管理・データ取得**: TanStack Query は将来のバックエンド連携を見据えて導入済みだが、現時点では未使用。

## 重要な制約

- ホスティングは Cloudflare Pages（転送量無料枠が実質無制限）。従量課金型サービスは使わない。
- 将来サーバーレスバックエンドを導入する場合も Cloudflare Workers + D1 の無料プランのみ使用する。
- リンターは **oxlint**（ESLint ではない）。コミット前に `npm run lint` を実行すること。
