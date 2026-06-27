# 利用データとライセンス

このアプリ（千葉県の鉄道路線図）で利用している外部データの出所・ライセンス・利用先の一覧。
**※ ライセンスは各提供元の最新の規約が優先。商用利用や再配布の際は必ず原典を確認すること。**

## 1. アプリに含まれる／表示するデータ

| データ | 提供元 | URL | ライセンス形態 | 当アプリでの利用先 |
|---|---|---|---|---|
| 白地図タイル（背景地図） | 国土地理院 | https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png （一覧: https://maps.gsi.go.jp/development/ichiran.html ） | 国土地理院コンテンツ利用規約（出典明示で複製・使用可。商用可） | 地図の背景タイル。`src/map/config.ts` の `WHITE_MAP_STYLE`。地図右下に「国土地理院」を出典表示 |
| 鉄道データ（路線・駅） | 国土交通省 国土数値情報（鉄道データ N02-23） | データ: https://nlftp.mlit.go.jp/ksj/gml/data/N02/N02-23/N02-23_GML.zip 説明: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html | 国土数値情報 利用約款（出典明示で利用可。CC BY 4.0 互換） https://nlftp.mlit.go.jp/ksj/other/yakkan.html | 路線ジオメトリ・駅位置の元データ。`scripts/build-chiba-jr.cjs` で加工し `public/data/chiba-railways.geojson` / `chiba-stations.geojson` を生成。地図右下に「国土数値情報（鉄道データ）」を出典表示 |

## 2. ビルド時のみ使う入力データ（アプリには再配布しない）

| データ | 提供元 | URL | ライセンス形態 | 当アプリでの利用先 |
|---|---|---|---|---|
| 都道府県境界 GeoJSON | dataofjapan/land（元データ: 国土数値情報 行政区域） | https://github.com/dataofjapan/land （`japan.geojson`） | リポジトリの LICENSE を要確認（元データは国土数値情報）。**本リポジトリでは再配布せず**、`.data/`（gitignore）に置いてビルド時の千葉県切り出しにのみ使用 | `scripts/build-chiba-jr.cjs` で千葉県ポリゴンとして鉄道データをクリップ |

## 3. 本数データ（線の太さ用）— 現状の扱い

| データ | 提供元 | URL | ライセンス形態 | 当アプリでの利用先 |
|---|---|---|---|---|
| 列車本数（平日・片方向） | **現状は手入力の概算値** | — | — | `data/chiba-lines.csv` の `本数` 列。区間ごとの暫定値 |
| 列車時刻表（本数の正確化・**予定**） | 公共交通オープンデータセンター（ODPT） | https://www.odpt.org/ （API: api.odpt.org / JR東はチャレンジ系 api-challenge2024.odpt.org） | ODPT 利用規約／各事業者の利用条件。**JR東日本はチャレンジ系限定ライセンス**。要 API キー登録 | `scripts/fetch-odpt-trains.cjs` が CSV の `本数` 列を上書き予定。**現時点では未取得＝未使用**（キー取得待ち） |

## 4. 地図描画ライブラリ（参考）

| ソフトウェア | URL | ライセンス | 用途 |
|---|---|---|---|
| MapLibre GL JS | https://github.com/maplibre/maplibre-gl-js | BSD-3-Clause | 地図描画エンジン |
| react-map-gl | https://github.com/visgl/react-map-gl | MIT | MapLibre の React ラッパー |

---

### 出典表示について
- 地図の attribution（右下）に「国土地理院」「国土数値情報（鉄道データ）」を表示済み（`src/map/config.ts`）。
- ODPT のデータを実際に利用する段階になったら、attribution に ODPT（および対象事業者）の出典も追記すること。
