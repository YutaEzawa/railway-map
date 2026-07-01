# 区間分割 要確認リスト（自動生成）

`split-lines` が自動処理した結果のうち、人手確認が必要なものの一覧。
このファイルは `data/lines.csv` から生成される（`node split-lines/split-lines.cjs --review` で再生成）。

- **auto_review** … 本数の中間V字凹みなど不自然な兆候あり。値は暫定で地図には反映済み。
- **auto_fail** … 駅順序ずれ等で自動処理に失敗。本数は既定値のまま。

確認して正しい区間・本数に直したら、その行の `状態` を `manual` にすると本リストから外れる。

確認待ち: **201 路線**

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

## - [ ] 東北新幹線  （auto_review）

| 区間 | 本数 |
|------|------|
| 東北新幹線(東京〜小山) | 107 |
| 東北新幹線(小山〜宇都宮) | 27 |
| 東北新幹線(宇都宮〜郡山) | 17 |
| 東北新幹線(郡山〜白石蔵王) | 47 |
| 東北新幹線(白石蔵王〜古川) | 58 |
| 東北新幹線(古川〜新青森) | 21 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 御殿場線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "御殿場線" --fresh` で理由を確認。

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

## - [ ] 上越線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "上越線" --fresh` で理由を確認。

## - [ ] 北陸新幹線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "北陸新幹線" --fresh` で理由を確認。

## - [ ] いわて銀河鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "いわて銀河鉄道線" --fresh` で理由を確認。

## - [ ] 三陸鉄道リアス線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "三陸鉄道リアス線" --fresh` で理由を確認。

## - [ ] 仙石線  （auto_review）

| 区間 | 本数 |
|------|------|
| 仙石線(石巻〜陸前赤井) | 24 |
| 仙石線(陸前赤井〜高城町) | 16 |
| 仙石線(高城町〜東塩釜) | 40 |
| 仙石線(東塩釜〜多賀城) | 76 |
| 仙石線(多賀城〜あおば通) | 91 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 奥羽線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "奥羽線" --fresh` で理由を確認。

## - [ ] 山田線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "山田線" --fresh` で理由を確認。

## - [ ] 津軽線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "津軽線" --fresh` で理由を確認。

## - [ ] 米坂線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "米坂線" --fresh` で理由を確認。

## - [ ] 羽越線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "羽越線" --fresh` で理由を確認。

## - [ ] 花輪線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "花輪線" --fresh` で理由を確認。

## - [ ] 青い森鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "青い森鉄道線" --fresh` で理由を確認。

## - [ ] 函館線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "函館線" --fresh` で理由を確認。

## - [ ] 千歳線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "千歳線" --fresh` で理由を確認。

## - [ ] 室蘭線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "室蘭線" --fresh` で理由を確認。

## - [ ] 根室線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "根室線" --fresh` で理由を確認。

## - [ ] 海峡線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "海峡線" --fresh` で理由を確認。

## - [ ] 石北線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "石北線" --fresh` で理由を確認。

## - [ ] あいの風とやま鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "あいの風とやま鉄道線" --fresh` で理由を確認。

## - [ ] とさでん交通  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "とさでん交通" --fresh` で理由を確認。

## - [ ] ガイドウェイバス志段味線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "ガイドウェイバス志段味線" --fresh` で理由を確認。

## - [ ] ポートアイランド線  （auto_review）

| 区間 | 本数 |
|------|------|
| ポートアイランド線(三宮〜北埠頭) | 312 |
| ポートアイランド線(北埠頭〜市民広場) | 134 |
| ポートアイランド線(市民広場〜神戸空港) | 179 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 七尾線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "七尾線" --fresh` で理由を確認。

## - [ ] 三河線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "三河線" --fresh` で理由を確認。

## - [ ] 中央線(JR東海)  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "中央線(JR東海)" --fresh` で理由を確認。

## - [ ] 久大線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "久大線" --fresh` で理由を確認。

## - [ ] 九州新幹線  （auto_review）

| 区間 | 本数 |
|------|------|
| 九州新幹線(鹿児島中央〜川内) | 46 |
| 九州新幹線(川内〜出水) | 40 |
| 九州新幹線(出水〜熊本) | 29 |
| 九州新幹線(熊本〜新玉名) | 60 |
| 九州新幹線(新玉名〜久留米) | 24 |
| 九州新幹線(久留米〜博多) | 54 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 予讃線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "予讃線" --fresh` で理由を確認。

## - [ ] 京福鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "京福鋼索線" --fresh` で理由を確認。

## - [ ] 京阪本線  （auto_review）

| 区間 | 本数 |
|------|------|
| 京阪本線(三条〜祇園四条) | 200 |
| 京阪本線(祇園四条〜七条) | 105 |
| 京阪本線(七条〜橋本) | 94 |
| 京阪本線(橋本〜淀屋橋) | 220 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 京阪鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "京阪鋼索線" --fresh` で理由を確認。

## - [ ] 伊予鉄道城北線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "伊予鉄道城北線" --fresh` で理由を確認。

## - [ ] 伊勢線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "伊勢線" --fresh` で理由を確認。

## - [ ] 伯備線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "伯備線" --fresh` で理由を確認。

## - [ ] 佐世保線  （auto_review）

| 区間 | 本数 |
|------|------|
| 佐世保線(江北〜大町) | 51 |
| 佐世保線(大町〜早岐) | 15 |
| 佐世保線(早岐〜大塔) | 45 |
| 佐世保線(大塔〜佐世保) | 28 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 六甲ケーブル線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "六甲ケーブル線" --fresh` で理由を確認。

## - [ ] 別府ラクテンチケーブル線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "別府ラクテンチケーブル線" --fresh` で理由を確認。

## - [ ] 北大阪急行南北線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "北大阪急行南北線" --fresh` で理由を確認。

## - [ ] 北条線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "北条線" --fresh` で理由を確認。

## - [ ] 北陸線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "北陸線" --fresh` で理由を確認。

## - [ ] 十国鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "十国鋼索線" --fresh` で理由を確認。

## - [ ] 南海本線  （auto_review）

| 区間 | 本数 |
|------|------|
| 南海本線(天下茶屋〜湊) | 241 |
| 南海本線(湊〜諏訪ノ森) | 94 |
| 南海本線(諏訪ノ森〜高石) | 189 |
| 南海本線(高石〜岸和田) | 94 |
| 南海本線(岸和田〜二色浜) | 189 |
| 南海本線(二色浜〜井原里) | 94 |
| 南海本線(井原里〜箱作) | 77 |
| 南海本線(箱作〜和歌山市) | 120 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 南海鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "南海鋼索線" --fresh` で理由を確認。

## - [ ] 南港ポートタウン線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "南港ポートタウン線" --fresh` で理由を確認。

## - [ ] 吉備線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "吉備線" --fresh` で理由を確認。

## - [ ] 名古屋市営上飯田線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "名古屋市営上飯田線" --fresh` で理由を確認。

## - [ ] 名古屋市営名城線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "名古屋市営名城線" --fresh` で理由を確認。

## - [ ] 名古屋市営名港線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "名古屋市営名港線" --fresh` で理由を確認。

## - [ ] 名古屋市営東山線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "名古屋市営東山線" --fresh` で理由を確認。

## - [ ] 名古屋市営桜通線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "名古屋市営桜通線" --fresh` で理由を確認。

## - [ ] 名古屋市営鶴舞線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "名古屋市営鶴舞線" --fresh` で理由を確認。

## - [ ] 名古屋本線  （auto_review）

| 区間 | 本数 |
|------|------|
| 名古屋本線(名鉄岐阜〜石刀) | 146 |
| 名古屋本線(石刀〜妙興寺) | 203 |
| 名古屋本線(妙興寺〜須ヶ口) | 66 |
| 名古屋本線(須ヶ口〜東枇杷島) | 42 |
| 名古屋本線(東枇杷島〜金山) | 109 |
| 名古屋本線(金山〜鳴海) | 73 |
| 名古屋本線(鳴海〜前後) | 99 |
| 名古屋本線(前後〜一ツ木) | 65 |
| 名古屋本線(一ツ木〜宇頭) | 172 |
| 名古屋本線(宇頭〜東岡崎) | 66 |
| 名古屋本線(東岡崎〜名電山中) | 58 |
| 名古屋本線(名電山中〜豊橋) | 39 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 名古屋線  （auto_review）

| 区間 | 本数 |
|------|------|
| 名古屋線(近鉄名古屋〜米野) | 234 |
| 名古屋線(米野〜戸田) | 68 |
| 名古屋線(戸田〜富吉) | 165 |
| 名古屋線(富吉〜近鉄長島) | 126 |
| 名古屋線(近鉄長島〜益生) | 180 |
| 名古屋線(益生〜伊勢中川) | 67 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 呉線  （auto_review）

| 区間 | 本数 |
|------|------|
| 呉線(三原〜安浦) | 18 |
| 呉線(安浦〜広) | 25 |
| 呉線(広〜かるが浜) | 48 |
| 呉線(かるが浜〜坂) | 40 |
| 呉線(坂〜海田市) | 68 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 呉羽線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "呉羽線" --fresh` で理由を確認。

## - [ ] 和歌山線  （auto_review）

| 区間 | 本数 |
|------|------|
| 和歌山線(王寺〜高田) | 44 |
| 和歌山線(高田〜名手) | 22 |
| 和歌山線(名手〜和歌山) | 31 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 因美線  （auto_review）

| 区間 | 本数 |
|------|------|
| 因美線(鳥取〜津ノ井) | 32 |
| 因美線(津ノ井〜郡家) | 18 |
| 因美線(郡家〜河原) | 26 |
| 因美線(河原〜東津山) | 12 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 土讃線  （auto_review）

| 区間 | 本数 |
|------|------|
| 土讃線(多度津〜金蔵寺) | 46 |
| 土讃線(金蔵寺〜塩入) | 23 |
| 土讃線(塩入〜角茂谷) | 3 |
| 土讃線(角茂谷〜高知) | 40 |
| 土讃線(高知〜高知商業前) | 32 |
| 土讃線(高知商業前〜波川) | 25 |
| 土讃線(波川〜大間) | 17 |
| 土讃線(大間〜窪川) | 5 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 城南線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "城南線" --fresh` で理由を確認。

## - [ ] 大手町線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "大手町線" --fresh` で理由を確認。

## - [ ] 大月線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "大月線" --fresh` で理由を確認。

## - [ ] 大浦支線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "大浦支線" --fresh` で理由を確認。

## - [ ] 大阪線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "大阪線" --fresh` で理由を確認。

## - [ ] 天橋立鋼索鉄道  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "天橋立鋼索鉄道" --fresh` で理由を確認。

## - [ ] 天神大牟田線  （auto_review）

| 区間 | 本数 |
|------|------|
| 天神大牟田線(西鉄福岡（天神）〜薬院) | 225 |
| 天神大牟田線(薬院〜下大利) | 118 |
| 天神大牟田線(下大利〜紫) | 190 |
| 天神大牟田線(紫〜筑紫) | 102 |
| 天神大牟田線(筑紫〜櫛原) | 113 |
| 天神大牟田線(櫛原〜試験場前) | 105 |
| 天神大牟田線(試験場前〜大善寺) | 68 |
| 天神大牟田線(大善寺〜東甘木) | 39 |
| 天神大牟田線(東甘木〜大牟田) | 75 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 天竜浜名湖線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "天竜浜名湖線" --fresh` で理由を確認。

## - [ ] 妙高はねうまライン  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "妙高はねうまライン" --fresh` で理由を確認。

## - [ ] 姫新線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "姫新線" --fresh` で理由を確認。

## - [ ] 宇品線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "宇品線" --fresh` で理由を確認。

## - [ ] 宇野線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "宇野線" --fresh` で理由を確認。

## - [ ] 安野屋線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "安野屋線" --fresh` で理由を確認。

## - [ ] 宝塚線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "宝塚線" --fresh` で理由を確認。

## - [ ] 宮島線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "宮島線" --fresh` で理由を確認。

## - [ ] 宮津線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "宮津線" --fresh` で理由を確認。

## - [ ] 富山地方鉄道支線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "富山地方鉄道支線" --fresh` で理由を確認。

## - [ ] 富山地方鉄道本線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "富山地方鉄道本線" --fresh` で理由を確認。

## - [ ] 富山都心線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "富山都心線" --fresh` で理由を確認。

## - [ ] 富山駅南北接続線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "富山駅南北接続線" --fresh` で理由を確認。

## - [ ] 山陰線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "山陰線" --fresh` で理由を確認。

## - [ ] 山陽新幹線  （auto_review）

| 区間 | 本数 |
|------|------|
| 山陽新幹線(新大阪〜西明石) | 156 |
| 山陽新幹線(西明石〜徳山) | 29 |
| 山陽新幹線(徳山〜新山口) | 46 |
| 山陽新幹線(新山口〜厚狭) | 62 |
| 山陽新幹線(厚狭〜新下関) | 21 |
| 山陽新幹線(新下関〜博多) | 135 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 山陽線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "山陽線" --fresh` で理由を確認。

## - [ ] 嵯峨野観光線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "嵯峨野観光線" --fresh` で理由を確認。

## - [ ] 帆柱ケーブル線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "帆柱ケーブル線" --fresh` で理由を確認。

## - [ ] 常滑線  （auto_review）

| 区間 | 本数 |
|------|------|
| 常滑線(神宮前〜豊田本町) | 246 |
| 常滑線(豊田本町〜聚楽園) | 71 |
| 常滑線(聚楽園〜古見) | 102 |
| 常滑線(古見〜長浦) | 76 |
| 常滑線(長浦〜常滑) | 37 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 広島短距離交通瀬野線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "広島短距離交通瀬野線" --fresh` で理由を確認。

## - [ ] 広島電鉄本線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "広島電鉄本線" --fresh` で理由を確認。

## - [ ] 広見線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "広見線" --fresh` で理由を確認。

## - [ ] 摩耶ケーブル線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "摩耶ケーブル線" --fresh` で理由を確認。

## - [ ] 新湊港線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "新湊港線" --fresh` で理由を確認。

## - [ ] 日本海ひすいライン  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "日本海ひすいライン" --fresh` で理由を確認。

## - [ ] 日豊線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "日豊線" --fresh` で理由を確認。

## - [ ] 明知線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "明知線" --fresh` で理由を確認。

## - [ ] 木次線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "木次線" --fresh` で理由を確認。

## - [ ] 本四備讃線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "本四備讃線" --fresh` で理由を確認。

## - [ ] 東山本線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "東山本線" --fresh` で理由を確認。

## - [ ] 東海道線(JR東海)  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "東海道線(JR東海)" --fresh` で理由を確認。

## - [ ] 東海道線(JR西日本)  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "東海道線(JR西日本)" --fresh` で理由を確認。

## - [ ] 桜井線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "桜井線" --fresh` で理由を確認。

## - [ ] 桜町支線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "桜町支線" --fresh` で理由を確認。

## - [ ] 横川線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "横川線" --fresh` で理由を確認。

## - [ ] 樽見線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "樽見線" --fresh` で理由を確認。

## - [ ] 橿原線  （auto_review）

| 区間 | 本数 |
|------|------|
| 橿原線(大和西大寺〜尼ヶ辻) | 168 |
| 橿原線(尼ヶ辻〜平端) | 85 |
| 橿原線(平端〜ファミリー公園前) | 109 |
| 橿原線(ファミリー公園前〜八木西口) | 73 |
| 橿原線(八木西口〜橿原神宮前) | 109 |
| 橿原線(橿原神宮前〜大和八木) | 136 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 武豊線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "武豊線" --fresh` で理由を確認。

## - [ ] 比叡山鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "比叡山鉄道線" --fresh` で理由を確認。

## - [ ] 水島本線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "水島本線" --fresh` で理由を確認。

## - [ ] 水間線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "水間線" --fresh` で理由を確認。

## - [ ] 江波線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "江波線" --fresh` で理由を確認。

## - [ ] 河口湖線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "河口湖線" --fresh` で理由を確認。

## - [ ] 河和線  （auto_review）

| 区間 | 本数 |
|------|------|
| 河和線(太田川〜高横須賀) | 140 |
| 河和線(高横須賀〜住吉町) | 65 |
| 河和線(住吉町〜知多半田) | 109 |
| 河和線(知多半田〜成岩) | 83 |
| 河和線(成岩〜知多武豊) | 51 |
| 河和線(知多武豊〜富貴) | 83 |
| 河和線(富貴〜河和) | 74 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 泉北高速鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "泉北高速鉄道線" --fresh` で理由を確認。

## - [ ] 浅野川線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "浅野川線" --fresh` で理由を確認。

## - [ ] 無軌条電車線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "無軌条電車線" --fresh` で理由を確認。

## - [ ] 片町線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "片町線" --fresh` で理由を確認。

## - [ ] 犬山線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "犬山線" --fresh` で理由を確認。

## - [ ] 生駒鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "生駒鋼索線" --fresh` で理由を確認。

## - [ ] 白島線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "白島線" --fresh` で理由を確認。

## - [ ] 白新線  （auto_review）

| 区間 | 本数 |
|------|------|
| 白新線(新発田〜西新発田) | 39 |
| 白新線(西新発田〜豊栄) | 31 |
| 白新線(豊栄〜東新潟) | 53 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 皆実線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "皆実線" --fresh` で理由を確認。

## - [ ] 神戸市営海岸線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "神戸市営海岸線" --fresh` で理由を確認。

## - [ ] 神戸市営西神・山手線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "神戸市営西神・山手線" --fresh` で理由を確認。

## - [ ] 神戸線  （auto_review）

| 区間 | 本数 |
|------|------|
| 神戸線(大阪梅田〜中津) | 256 |
| 神戸線(中津〜塚口) | 116 |
| 神戸線(塚口〜武庫之荘) | 173 |
| 神戸線(武庫之荘〜西宮北口) | 137 |
| 神戸線(西宮北口〜御影) | 225 |
| 神戸線(御影〜六甲) | 119 |
| 神戸線(六甲〜王子公園) | 152 |
| 神戸線(王子公園〜神戸三宮) | 119 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 福知山線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "福知山線" --fresh` で理由を確認。

## - [ ] 立山黒部貫光鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "立山黒部貫光鋼索線" --fresh` で理由を確認。

## - [ ] 筑肥線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "筑肥線" --fresh` で理由を確認。

## - [ ] 筑豊線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "筑豊線" --fresh` で理由を確認。

## - [ ] 篠ノ井線  （auto_review）

| 区間 | 本数 |
|------|------|
| 篠ノ井線(篠ノ井〜稲荷山) | 73 |
| 篠ノ井線(稲荷山〜明科) | 18 |
| 篠ノ井線(明科〜松本) | 26 |
| 篠ノ井線(松本〜南松本) | 89 |
| 篠ノ井線(南松本〜塩尻) | 52 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 篠栗線  （auto_review）

| 区間 | 本数 |
|------|------|
| 篠栗線(桂川〜九郎原) | 55 |
| 篠栗線(九郎原〜城戸南蔵院前) | 26 |
| 篠栗線(城戸南蔵院前〜筑前山手) | 55 |
| 篠栗線(筑前山手〜篠栗) | 38 |
| 篠栗線(篠栗〜門松) | 72 |
| 篠栗線(門松〜長者原) | 61 |
| 篠栗線(長者原〜吉塚) | 73 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 紀勢線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "紀勢線" --fresh` で理由を確認。

## - [ ] 美祢線  （auto_review）

| 区間 | 本数 |
|------|------|
| 美祢線(厚狭〜湯ノ峠) | 21 |
| 美祢線(湯ノ峠〜厚保) | 0 |
| 美祢線(厚保〜長門市) | 9 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 肥薩線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "肥薩線" --fresh` で理由を確認。

## - [ ] 花園線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "花園線" --fresh` で理由を確認。

## - [ ] 芸備線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "芸備線" --fresh` で理由を確認。

## - [ ] 若桜線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "若桜線" --fresh` で理由を確認。

## - [ ] 草津線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "草津線" --fresh` で理由を確認。

## - [ ] 蛍茶屋支線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "蛍茶屋支線" --fresh` で理由を確認。

## - [ ] 西九州線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "西九州線" --fresh` で理由を確認。

## - [ ] 西信貴鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "西信貴鋼索線" --fresh` で理由を確認。

## - [ ] 豊肥線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "豊肥線" --fresh` で理由を確認。

## - [ ] 赤穂線  （auto_review）

| 区間 | 本数 |
|------|------|
| 赤穂線(相生〜播州赤穂) | 29 |
| 赤穂線(播州赤穂〜備前片上) | 17 |
| 赤穂線(備前片上〜長船) | 23 |
| 赤穂線(長船〜東岡山) | 32 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 赤迫支線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "赤迫支線" --fresh` で理由を確認。

## - [ ] 越後線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "越後線" --fresh` で理由を確認。

## - [ ] 越美北線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "越美北線" --fresh` で理由を確認。

## - [ ] 越美南線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "越美南線" --fresh` で理由を確認。

## - [ ] 身延線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "身延線" --fresh` で理由を確認。

## - [ ] 近江鉄道本線  （auto_review）

| 区間 | 本数 |
|------|------|
| 近江鉄道本線(米原〜フジテック前) | 45 |
| 近江鉄道本線(フジテック前〜彦根) | 26 |
| 近江鉄道本線(彦根〜高宮) | 33 |
| 近江鉄道本線(高宮〜貴生川) | 26 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 近鉄京都線  （auto_review）

| 区間 | 本数 |
|------|------|
| 近鉄京都線(京都〜東寺) | 211 |
| 近鉄京都線(東寺〜十条) | 152 |
| 近鉄京都線(十条〜竹田) | 77 |
| 近鉄京都線(竹田〜伏見) | 188 |
| 近鉄京都線(伏見〜桃山御陵前) | 247 |
| 近鉄京都線(桃山御陵前〜向島) | 188 |
| 近鉄京都線(向島〜富野荘) | 104 |
| 近鉄京都線(富野荘〜興戸) | 173 |
| 近鉄京都線(興戸〜大和西大寺) | 89 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 近鉄奈良線  （auto_review）

| 区間 | 本数 |
|------|------|
| 近鉄奈良線(近鉄奈良〜富雄) | 239 |
| 近鉄奈良線(富雄〜生駒) | 120 |
| 近鉄奈良線(生駒〜石切) | 249 |
| 近鉄奈良線(石切〜額田) | 167 |
| 近鉄奈良線(額田〜東花園) | 104 |
| 近鉄奈良線(東花園〜河内花園) | 129 |
| 近鉄奈良線(河内花園〜布施) | 106 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 近鉄山田線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "近鉄山田線" --fresh` で理由を確認。

## - [ ] 近鉄連絡線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "近鉄連絡線" --fresh` で理由を確認。

## - [ ] 連絡線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "連絡線" --fresh` で理由を確認。

## - [ ] 長崎線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "長崎線" --fresh` で理由を確認。

## - [ ] 長崎電気軌道本線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "長崎電気軌道本線" --fresh` で理由を確認。

## - [ ] 関西線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "関西線" --fresh` で理由を確認。

## - [ ] 阪和線  （auto_review）

| 区間 | 本数 |
|------|------|
| 阪和線(天王寺〜美章園) | 262 |
| 阪和線(美章園〜浅香) | 82 |
| 阪和線(浅香〜三国ヶ丘) | 214 |
| 阪和線(三国ヶ丘〜和歌山) | 82 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 阪神本線  （auto_review）

| 区間 | 本数 |
|------|------|
| 阪神本線(大阪梅田〜福島) | 297 |
| 阪神本線(福島〜野田) | 119 |
| 阪神本線(野田〜尼崎センタープール前) | 106 |
| 阪神本線(尼崎センタープール前〜深江) | 213 |
| 阪神本線(深江〜春日野道) | 114 |
| 阪神本線(春日野道〜元町) | 246 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 阿佐東線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "阿佐東線" --fresh` で理由を確認。

## - [ ] 阿佐線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "阿佐線" --fresh` で理由を確認。

## - [ ] 鞍馬山鋼索鉄道  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "鞍馬山鋼索鉄道" --fresh` で理由を確認。

## - [ ] 鞍馬線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "鞍馬線" --fresh` で理由を確認。

## - [ ] 飯田線  （auto_review）

| 区間 | 本数 |
|------|------|
| 飯田線(辰野〜時又) | 19 |
| 飯田線(時又〜本長篠) | 10 |
| 飯田線(本長篠〜東新町) | 22 |
| 飯田線(東新町〜豊橋) | 36 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 養老線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "養老線" --fresh` で理由を確認。

## - [ ] 高山線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "高山線" --fresh` で理由を確認。

## - [ ] 高岡軌道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "高岡軌道線" --fresh` で理由を確認。

## - [ ] 高徳線  （auto_review）

| 区間 | 本数 |
|------|------|
| 高徳線(高松〜木太町) | 44 |
| 高徳線(木太町〜丹生) | 27 |
| 高徳線(丹生〜讃岐白鳥) | 35 |
| 高徳線(讃岐白鳥〜讃岐相生) | 23 |
| 高徳線(讃岐相生〜板野) | 6 |
| 高徳線(板野〜阿波川端) | 34 |
| 高徳線(阿波川端〜池谷) | 17 |
| 高徳線(池谷〜吉成) | 40 |
| 高徳線(吉成〜徳島) | 63 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 高野線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "高野線" --fresh` で理由を確認。

## - [ ] 鹿児島線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "鹿児島線" --fresh` で理由を確認。

## - [ ] 黒部峡谷鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "黒部峡谷鉄道線" --fresh` で理由を確認。
