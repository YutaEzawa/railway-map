# 区間分割 要確認リスト（自動生成）

`split-lines` が自動処理した結果のうち、人手確認が必要なものの一覧。
このファイルは `data/lines.csv` から生成される（`node split-lines/split-lines.cjs --review` で再生成）。

- **auto_review** … 本数の中間V字凹みなど不自然な兆候あり。値は暫定で地図には反映済み。
- **auto_fail** … 駅順序ずれ等で自動処理に失敗。本数は既定値のまま。

確認して正しい区間・本数に直したら、その行の `状態` を `manual` にすると本リストから外れる。

確認待ち: **33 路線**

## - [ ] 横須賀線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "横須賀線" --fresh` で理由を確認。

## - [ ] 鶴見線  （auto_review）

| 区間 | 本数 |
|------|------|
| 鶴見線(鶴見〜弁天橋) | 94 |
| 鶴見線(弁天橋〜安善) | 85 |
| 鶴見線(安善〜大川) | 52 |
| 鶴見線(大川〜浜川崎) | 9 |
| 鶴見線(浜川崎〜武蔵白石) | 31 |
| 鶴見線(武蔵白石〜浅野) | 46 |
| 鶴見線(浅野〜海芝浦) | 24 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 相模線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "相模線" --fresh` で理由を確認。

## - [ ] 常磐線  （auto_review）

| 区間 | 本数 |
|------|------|
| 常磐線(日暮里〜綾瀬) | 134 |
| 常磐線(綾瀬〜我孫子) | 158 |
| 常磐線(我孫子〜松戸) | 114 |
| 常磐線(松戸〜新松戸) | 133 |
| 常磐線(新松戸〜北柏) | 150 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 東京メトロ副都心線  （auto_review）

| 区間 | 本数 |
|------|------|
| 東京メトロ副都心線(渋谷〜北参道) | 259 |
| 東京メトロ副都心線(北参道〜新宿三丁目) | 190 |
| 東京メトロ副都心線(新宿三丁目〜東新宿) | 259 |
| 東京メトロ副都心線(東新宿〜小竹向原) | 169 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 都営大江戸線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "都営大江戸線" --fresh` で理由を確認。

## - [ ] 横浜市営ブルーライン  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "横浜市営ブルーライン" --fresh` で理由を確認。

## - [ ] 京王線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "京王線" --fresh` で理由を確認。

## - [ ] 小田原線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "小田原線" --fresh` で理由を確認。

## - [ ] 小田急江ノ島線  （auto_review）

| 区間 | 本数 |
|------|------|
| 小田急江ノ島線(片瀬江ノ島〜藤沢) | 97 |
| 小田急江ノ島線(藤沢〜鶴間) | 174 |
| 小田急江ノ島線(鶴間〜南林間) | 115 |
| 小田急江ノ島線(南林間〜中央林間) | 133 |
| 小田急江ノ島線(中央林間〜東林間) | 171 |
| 小田急江ノ島線(東林間〜相模大野) | 115 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 東横線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "東横線" --fresh` で理由を確認。

## - [ ] 田園都市線  （auto_review）

| 区間 | 本数 |
|------|------|
| 田園都市線(渋谷〜二子新地) | 284 |
| 田園都市線(二子新地〜高津) | 186 |
| 田園都市線(高津〜梶が谷) | 316 |
| 田園都市線(梶が谷〜中央林間) | 191 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 西武池袋線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "西武池袋線" --fresh` で理由を確認。

## - [ ] 西武新宿線  （auto_review）

| 区間 | 本数 |
|------|------|
| 西武新宿線(本川越〜武蔵関) | 139 |
| 西武新宿線(武蔵関〜都立家政) | 266 |
| 西武新宿線(都立家政〜下落合) | 128 |
| 西武新宿線(下落合〜西武新宿) | 295 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 国分寺線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "国分寺線" --fresh` で理由を確認。

## - [ ] 東武伊勢崎線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "東武伊勢崎線" --fresh` で理由を確認。

## - [ ] 東武東上線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "東武東上線" --fresh` で理由を確認。

## - [ ] 東京モノレール羽田線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "東京モノレール羽田線" --fresh` で理由を確認。

## - [ ] 多摩都市モノレール線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "多摩都市モノレール線" --fresh` で理由を確認。

## - [ ] ニューシャトル  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "ニューシャトル" --fresh` で理由を確認。

## - [ ] みなとみらい21線  （auto_review）

| 区間 | 本数 |
|------|------|
| みなとみらい21線(元町・中華街〜日本大通り) | 298 |
| みなとみらい21線(日本大通り〜みなとみらい) | 266 |
| みなとみらい21線(みなとみらい〜新高島) | 297 |
| みなとみらい21線(新高島〜横浜) | 160 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 江ノ島電鉄  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "江ノ島電鉄" --fresh` で理由を確認。

## - [ ] 箱根登山鉄道  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "箱根登山鉄道" --fresh` で理由を確認。

## - [ ] 御岳登山ケーブルカー  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "御岳登山ケーブルカー" --fresh` で理由を確認。

## - [ ] 高尾登山ケーブルカー  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "高尾登山ケーブルカー" --fresh` で理由を確認。

## - [ ] 伊豆箱根大雄山線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "伊豆箱根大雄山線" --fresh` で理由を確認。

## - [ ] 秩父本線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "秩父本線" --fresh` で理由を確認。

## - [ ] 金沢シーサイドライン  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "金沢シーサイドライン" --fresh` で理由を確認。

## - [ ] 京浜東北線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "京浜東北線" --fresh` で理由を確認。

## - [ ] 宇都宮線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "宇都宮線" --fresh` で理由を確認。

## - [ ] 湘南新宿ライン  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "湘南新宿ライン" --fresh` で理由を確認。

## - [ ] 中央線快速  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "中央線快速" --fresh` で理由を確認。

## - [ ] 相鉄・JR直通線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "相鉄・JR直通線" --fresh` で理由を確認。
