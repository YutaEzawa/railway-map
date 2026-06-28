# Todo: 路線の太さを「平日の列車本数」で表現する

## 目的
千葉県の鉄道路線図で、**運行本数の多い路線を太く**描く。本数は公共交通オープンデータ（ODPT）API から取得（クロールは使わない）。基準は **平日・片方向の本数**。

実装は2段階:
1. ODPT から路線ごとの平日本数を集計して確定（← いまここ。ODPTキー待ち）
2. 確定した本数を路線データに載せ、線の太さに反映

詳細計画: `~/.claude/plans/foamy-singing-snowflake.md`

---

## やることリスト

### A. ODPTキー取得（日数がかかる・ユーザー作業）
- [ ] **本体キー** を取得（[ODPT](https://www.odpt.org/) でアカウント登録 → API キー発行）
      - 東京メトロ・都営・つくばEX・京成・新京成・北総・東葉高速・東武 などはこちら
- [ ] ~~**チャレンジ系キー** を取得（[公共交通オープンデータチャレンジ](https://tokyochallenge.odpt.org/) で登録）~~
      → **現状取得不可（保留）**。JR東日本の列車時刻表はチャレンジ系限定のため、
      **当面 JR の本数は ODPT から取れない**。チャレンジキーが取得できたら後で更新する。
- [ ] キーは秘密情報。リポジトリにコミットしない（環境変数で渡す）

> **現時点の方針**: 私鉄は本体キーで ODPT 取得。**JR は暫定の手動概算のまま**にし、
> チャレンジキーが取れた段階で ODPT 由来に差し替える。

### B. キー受領後（Claudeに依頼する作業）
- [ ] `scripts/fetch-odpt-trains.cjs` をキー付きで実行し、平日・片方向の本数を取得
- [ ] 実行ログの「未対応の路線ID」を見て、`scripts/fetch-odpt-trains.cjs` の
      `ODPT_RAILWAY_TO_LINE`（私鉄IDは推定値）を修正 → 再実行し、私鉄も ODPT 由来にする
- [ ] `scripts/data/line-trains.json` の本数を確認・確定
- [ ] 段階2: `scripts/build-railways.cjs` に `trains` を載せ、`src/map/MapView.tsx` の
      `line-width` を「本数 × ズーム」にして太さへ反映
- [ ] `npm run build` / `npm run lint` 通過、地図の出典に ODPT を追記

---

## 現状メモ
- **本数の単一ソースは `data/lines.csv`（手編集）**。列は `路線,区間,本数,駅`。
  本数（平日・片方向）を人力で記載・修正できる。build はこの CSV を読む。
- JR の総武・内房・外房・成田は**区間に分割**済み（CSV の区間行＋駅集合で地図上を区間ごとに描画）。
  現在の本数は暫定の概算。CSV を編集すれば即反映（`node scripts/build-railways.cjs` → 再ビルド）。
- `scripts/fetch-odpt-trains.cjs` は、ODPT キーがあれば CSV の `本数` 列を実数で上書きする
  （取得できた区間のみ。手入力値は保持）。キー未設定なら CSV は変更しない。

---

## キーを受け取った後、Claude に貼る指示文（コピペ用）

### (1) まず本体キーが取れたとき（私鉄を正確化）

> ODPTの本体APIキー（api.odpt.org 用）を取得しました: `（ここに本体キー）`
>
> このキーで `scripts/fetch-odpt-trains.cjs` を実行し、私鉄の平日・片方向の本数を取得してください。
> 実行コマンド: `ODPT_TOKEN=<本体キー> node scripts/fetch-odpt-trains.cjs`
>
> 実行後の手順:
> 1. ログの「未対応の路線ID」を確認し、`ODPT_RAILWAY_TO_LINE` の私鉄路線IDの推定を実IDに直して、
>    千葉県内の私鉄が漏れなく ODPT 由来の本数になるよう再実行する。
> 2. `scripts/data/line-trains.json` の本数を提示して、一緒に確認する。
>    （JR は当面 manual のままでよい。チャレンジキー取得後に更新する）
> 3. 確定したら段階2に進み、`scripts/build-railways.cjs` で各路線に `trains` を付与、
>    `src/map/MapView.tsx` の `line-width` を「本数 × ズーム」にして、路線の太さに反映する。
> 4. `npm run build` と `npm run lint` を通し、地図の出典表示に ODPT を追記する。

### (2) あとでチャレンジキーが取れたとき（JRを正確化）

> ODPTのチャレンジAPIキー（api-challenge2024.odpt.org 用 / JR東日本）も取得しました: `（ここにチャレンジキー）`
>
> `ODPT_TOKEN=<本体キー> ODPT_CHALLENGE_TOKEN=<チャレンジキー> node scripts/fetch-odpt-trains.cjs`
> を実行して JR も ODPT 由来に更新し、`line-trains.json` を確定 → 必要なら build を再実行して反映してください。

> 計画の詳細は `~/.claude/plans/foamy-singing-snowflake.md` を参照。

※ キーをチャットに貼りたくない場合は、シェルで
`export ODPT_TOKEN=...`（必要なら `export ODPT_CHALLENGE_TOKEN=...`）を設定してから
「環境変数にキーを入れたので fetch を実行して」と指示すればOKです。
