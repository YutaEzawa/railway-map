# 区間分割 要確認リスト（自動生成）

`split-lines` が自動処理した結果のうち、人手確認が必要なものの一覧。
このファイルは `data/lines.csv` から生成される（`node split-lines/split-lines.cjs --review` で再生成）。

- **auto_review** … 本数の中間V字凹みなど不自然な兆候あり。値は暫定で地図には反映済み。
- **auto_fail** … 駅順序ずれ等で自動処理に失敗。本数は既定値のまま。

確認して正しい区間・本数に直したら、その行の `状態` を `manual` にすると本リストから外れる。

確認待ち: **176 路線**

## - [ ] 横須賀線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "横須賀線" --fresh` で理由を確認。

## - [ ] 東北新幹線  （auto_review）

| 区間 | 本数 |
|------|------|
| 東北新幹線(いわて沼宮内〜くりこま高原) | 8 |
| 東北新幹線(くりこま高原〜一ノ関) | 21 |
| 東北新幹線(一ノ関〜八戸) | 27 |
| 東北新幹線(八戸〜福島) | 35 |
| 東北新幹線(福島〜新白河) | 48 |
| 東北新幹線(新白河〜那須塩原) | 20 |
| 東北新幹線(那須塩原〜小山) | 60 |
| 東北新幹線(小山〜上野) | 27 |
| 東北新幹線(上野〜東京) | 107 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 東京メトロ副都心線  （auto_review）

| 区間 | 本数 |
|------|------|
| 東京メトロ副都心線(渋谷〜北参道) | 259 |
| 東京メトロ副都心線(北参道〜雑司が谷) | 190 |
| 東京メトロ副都心線(雑司が谷〜小竹向原) | 169 |
| 東京メトロ副都心線(小竹向原〜新宿三丁目) | 223 |
| 東京メトロ副都心線(新宿三丁目〜西早稲田) | 259 |
| 東京メトロ副都心線(西早稲田〜要町) | 169 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 都営大江戸線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "都営大江戸線" --fresh` で理由を確認。

## - [ ] 横浜市営ブルーライン  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "横浜市営ブルーライン" --fresh` で理由を確認。

## - [ ] 京王線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "京王線" --fresh` で理由を確認。

## - [ ] 小田原線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "小田原線" --fresh` で理由を確認。

## - [ ] 東横線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "東横線" --fresh` で理由を確認。

## - [ ] 西武池袋線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "西武池袋線" --fresh` で理由を確認。

## - [ ] 西武新宿線  （auto_review）

| 区間 | 本数 |
|------|------|
| 西武新宿線(井荻〜中井) | 139 |
| 西武新宿線(中井〜都立家政) | 244 |
| 西武新宿線(都立家政〜東伏見) | 160 |
| 西武新宿線(東伏見〜南大塚) | 139 |
| 西武新宿線(南大塚〜武蔵関) | 108 |
| 西武新宿線(武蔵関〜野方) | 136 |
| 西武新宿線(野方〜西武新宿) | 295 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

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
| ポートアイランド線(医療センター〜中埠頭) | 174 |
| ポートアイランド線(中埠頭〜市民広場) | 134 |
| ポートアイランド線(市民広場〜みなとじま) | 179 |
| ポートアイランド線(みなとじま〜三宮) | 312 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 七尾線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "七尾線" --fresh` で理由を確認。

## - [ ] 三河線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "三河線" --fresh` で理由を確認。

## - [ ] 中央線(JR東海)  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "中央線(JR東海)" --fresh` で理由を確認。

## - [ ] 久大線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "久大線" --fresh` で理由を確認。

## - [ ] 予讃線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "予讃線" --fresh` で理由を確認。

## - [ ] 京福鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "京福鋼索線" --fresh` で理由を確認。

## - [ ] 京阪本線  （auto_review）

| 区間 | 本数 |
|------|------|
| 京阪本線(萱島〜香里園) | 120 |
| 京阪本線(香里園〜寝屋川市) | 198 |
| 京阪本線(寝屋川市〜七条) | 102 |
| 京阪本線(七条〜三条) | 206 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 京阪鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "京阪鋼索線" --fresh` で理由を確認。

## - [ ] 伊予鉄道城北線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "伊予鉄道城北線" --fresh` で理由を確認。

## - [ ] 伊勢線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "伊勢線" --fresh` で理由を確認。

## - [ ] 伯備線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "伯備線" --fresh` で理由を確認。

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
| 名古屋本線(一ツ木〜豊明) | 65 |
| 名古屋本線(豊明〜本星崎) | 73 |
| 名古屋本線(本星崎〜名鉄名古屋) | 152 |
| 名古屋本線(名鉄名古屋〜有松) | 65 |
| 名古屋本線(有松〜宇頭) | 197 |
| 名古屋本線(宇頭〜御油) | 67 |
| 名古屋本線(御油〜東岡崎) | 56 |
| 名古屋本線(東岡崎〜本宿) | 101 |
| 名古屋本線(本宿〜矢作橋) | 36 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 呉羽線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "呉羽線" --fresh` で理由を確認。

## - [ ] 土讃線  （auto_review）

| 区間 | 本数 |
|------|------|
| 土讃線(旭〜安和) | 32 |
| 土讃線(安和〜円行寺口) | 5 |
| 土讃線(円行寺口〜吾桑) | 14 |
| 土讃線(吾桑〜高知商業前) | 53 |
| 土讃線(高知商業前〜小村神社前) | 25 |
| 土讃線(小村神社前〜須崎) | 5 |
| 土讃線(須崎〜斗賀野) | 32 |
| 土讃線(斗賀野〜土佐新荘) | 40 |
| 土讃線(土佐新荘〜入明) | 17 |
| 土讃線(入明〜金蔵寺) | 4 |
| 土讃線(金蔵寺〜塩入) | 23 |

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
| 山陽新幹線(岡山〜新尾道) | 156 |
| 山陽新幹線(新尾道〜西明石) | 22 |
| 山陽新幹線(西明石〜徳山) | 29 |
| 山陽新幹線(徳山〜姫路) | 46 |
| 山陽新幹線(姫路〜福山) | 69 |
| 山陽新幹線(福山〜新下関) | 84 |
| 山陽新幹線(新下関〜博多) | 135 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 山陽線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "山陽線" --fresh` で理由を確認。

## - [ ] 嵯峨野観光線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "嵯峨野観光線" --fresh` で理由を確認。

## - [ ] 帆柱ケーブル線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "帆柱ケーブル線" --fresh` で理由を確認。

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

## - [ ] 橿原線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "橿原線" --fresh` で理由を確認。

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
| 河和線(高横須賀〜住吉町) | 65 |
| 河和線(住吉町〜河和) | 109 |
| 河和線(河和〜上ゲ) | 71 |
| 河和線(上ゲ〜青山) | 51 |
| 河和線(青山〜富貴) | 83 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 泉北高速鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "泉北高速鉄道線" --fresh` で理由を確認。

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

## - [ ] 皆実線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "皆実線" --fresh` で理由を確認。

## - [ ] 神戸市営西神・山手線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "神戸市営西神・山手線" --fresh` で理由を確認。

## - [ ] 神戸線  （auto_review）

| 区間 | 本数 |
|------|------|
| 神戸線(神戸三宮〜春日野道) | 223 |
| 神戸線(春日野道〜岡本) | 119 |
| 神戸線(岡本〜御影) | 225 |
| 神戸線(御影〜十三) | 119 |
| 神戸線(十三〜夙川) | 256 |
| 神戸線(夙川〜大阪梅田) | 225 |
| 神戸線(大阪梅田〜中津) | 256 |
| 神戸線(中津〜塚口) | 116 |
| 神戸線(塚口〜武庫之荘) | 173 |
| 神戸線(武庫之荘〜六甲) | 137 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 福知山線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "福知山線" --fresh` で理由を確認。

## - [ ] 立山黒部貫光鋼索線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "立山黒部貫光鋼索線" --fresh` で理由を確認。

## - [ ] 筑肥線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "筑肥線" --fresh` で理由を確認。

## - [ ] 筑豊線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "筑豊線" --fresh` で理由を確認。

## - [ ] 篠ノ井線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "篠ノ井線" --fresh` で理由を確認。

## - [ ] 紀勢線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "紀勢線" --fresh` で理由を確認。

## - [ ] 美祢線  （auto_review）

| 区間 | 本数 |
|------|------|
| 美祢線(厚狭〜湯ノ峠) | 21 |
| 美祢線(湯ノ峠〜於福) | 0 |
| 美祢線(於福〜美祢) | 11 |

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
| 赤穂線(伊部〜伊里) | 23 |
| 赤穂線(伊里〜香登) | 17 |
| 赤穂線(香登〜西大寺) | 23 |
| 赤穂線(西大寺〜相生) | 37 |

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

## - [ ] 近鉄京都線  （auto_review）

| 区間 | 本数 |
|------|------|
| 近鉄京都線(伊勢田〜上鳥羽口) | 108 |
| 近鉄京都線(上鳥羽口〜新祝園) | 75 |
| 近鉄京都線(新祝園〜大和西大寺) | 188 |
| 近鉄京都線(大和西大寺〜京都) | 152 |

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

## - [ ] 阪和線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "阪和線" --fresh` で理由を確認。

## - [ ] 阿佐東線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "阿佐東線" --fresh` で理由を確認。

## - [ ] 阿佐線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "阿佐線" --fresh` で理由を確認。

## - [ ] 鞍馬山鋼索鉄道  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "鞍馬山鋼索鉄道" --fresh` で理由を確認。

## - [ ] 飯田線  （auto_review）

| 区間 | 本数 |
|------|------|
| 飯田線(伊那市〜木ノ下) | 19 |
| 飯田線(木ノ下〜本長篠) | 10 |
| 飯田線(本長篠〜小坂井) | 20 |
| 飯田線(小坂井〜野田城) | 33 |

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
| 高徳線(オレンジタウン〜板野) | 27 |
| 高徳線(板野〜木太町) | 34 |
| 高徳線(木太町〜池谷) | 17 |
| 高徳線(池谷〜佐古) | 33 |
| 高徳線(佐古〜徳島) | 40 |

→ 本数の並びが不自然（中間で減って増える等）。実態を確認し区間・本数を修正。

## - [ ] 高野線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "高野線" --fresh` で理由を確認。

## - [ ] 鹿児島線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "鹿児島線" --fresh` で理由を確認。

## - [ ] 黒部峡谷鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "黒部峡谷鉄道線" --fresh` で理由を確認。
