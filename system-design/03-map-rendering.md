# 03. 地図描画仕様

実装は `src/map/MapView.tsx`（レイヤー定義・状態・ポップアップ）、`src/map/config.ts`（白地図スタイル・初期ビュー）、`src/map/lineStyle.ts`（線の太さパラメータ読み込み）。

## 背景地図（`config.ts`）

- `WHITE_MAP_STYLE`: 国土地理院 白地図ラスタ（`https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png`、`maxzoom: 14`）1 枚のみの最小スタイル。`raster-opacity: 0.9`。
- `INITIAL_VIEW_STATE`: 千葉県全体（おおよそ lng 140.2 / lat 35.5 / zoom 8.6）。
- `MAX_ZOOM`: 16（白地図は z14 まで、overzoom で 16 まで拡大表示）。
- attribution に「国土地理院」「国土数値情報（鉄道データ）」を表示。

## データ取得

- `useGeoJSON(url)` = TanStack Query の `useQuery`。`public/data/` の 2 GeoJSON を fetch、`staleTime: Infinity`。

## レイヤー構成（描画順）

`railways` ソース（路線 GeoJSON）と `stations` ソース（駅 GeoJSON）に対し、以下のレイヤーを重ねる。

| # | レイヤー id | 種別 | 役割 |
|---|---|---|---|
| 1 | `route-lines-casing` | line | 路線の暗い縁取り（白地図上での視認性）。実線のみ |
| 2 | `route-lines` | line | 路線本体（実線）。色は `['get','color']` |
| 3 | `route-lines-dashed` | line | 本数が少ない路線（点線） |
| 4 | `route-lines-hit` | line | クリック判定用の透明な太線（`line-opacity:0`） |
| 5 | `stations` | circle | 全駅ドット（`major` で半径可変） |
| — | 駅名ラベル | HTML `<Marker>` | 主要/全駅をズームに応じて表示 |

線の太さ・オフセットは `['interpolate', ['linear'], ['zoom'], ...]` を最上位に置き、各ズーム段の値に本数 `step` 式やオフセット式を入れる（MapLibre は `['zoom']` を他の式へ入れ子にできない制約があるため）。

## 線種 4 段階（本数で分岐）

境界値・太さは `data/line-style.json`（→ `lineStyle.ts`）で定義。本数（平日・片方向）で分類:

| 線種 | 条件（既定） | 実装 |
|---|---|---|
| 点線 | 本数 < `dashBelow`(25) | `route-lines-dashed`（`line-dasharray`、別レイヤー※） |
| 細線 | 25 〜 60 未満 | `route-lines` の `step` 最小段 |
| 普通 | 60 〜 130 未満 | `step` 中段 |
| 太線 | 130 以上 | `step` 上段 |

- 太さは `solidWidth(stops)` がズーム別 × 本数 `step` 式を生成。casing も同様に一回り太く。
- ※ `line-dasharray` はデータ式に非対応のため、点線は本数 < `dashBelow` を `filter` した**専用レイヤー**で描く。実線レイヤーは逆に本数 ≧ `dashBelow` を `filter`。

## 複々線の並走表示

- `offset` プロパティ（±1、既定 0）× ズーム別 px（`line-style.json` の `parallelOffset`）で `line-offset` を計算（`offsetExpr`）。
- casing・実線・点線・hit の各レイヤーに同じ `line-offset` を適用し、各停/快速が平行に並ぶ。
- 並走セグメントは生成時に西→東へ向きを統一済みのため、左右が反転しない。

## 駅ドットとラベル

- ドット: `circle` レイヤー。半径はズーム × `major` で可変、白塗り＋濃いストローク。
- ラベル: HTML `<Marker>`（`anchor="left"`）。主要駅は太字。表示する駅はズーム閾値（`LABEL_ZOOM`）で制御:

| 対象 | 表示開始ズーム |
|---|---|
| JR 主要駅 | 常時（0） |
| 私鉄 主要駅 | 10 |
| JR 全駅 | 11 |
| 私鉄 全駅 | 12 |

- 現在ズームは整数に丸めて state 管理（閾値跨ぎのみ再描画）。
- カテゴリ（JR/私鉄）が無効なものはラベルも出さない。

## JR / 私鉄 表示切替

- 右上パネルのチェックボックス（`showJR` / `showPrivate`）。
- フィルタ式を組み立ててレイヤーへ適用:
  - 路線: `lineFilter`（`category` の match）。実線/点線はさらに本数閾値で `solidFilter` / `dashedFilter` に分岐。
  - 駅: `stationFilter`（`isJr` / `isPrivate` の any）。乗換駅はどちらか有効なら表示。
- パネルは「詳細（路線名）」を開くと路線一覧（色見本付き）を JR/私鉄 別に表示。区間分割した路線は親路線名で重複排除。

## クリックでポップアップ

- `interactiveLayerIds = ['stations', 'route-lines-hit']`。ホバーでカーソルをポインターに。
- クリック時 `queryRenderedFeatures` 相当の `e.features` を見て、**駅を優先**。
  - 駅: 駅名＋通る路線（`lines` を JSON.parse）。
  - 路線: 路線名・区間（あれば）・平日片方向の本数・JR/私鉄。
- `route-lines-hit`（透明な太線）でクリック領域を広げ、細い路線も拾いやすくしている。
