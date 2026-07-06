# 区間分割 要確認リスト（自動生成）

`split-lines` が自動処理した結果のうち、人手確認が必要なものの一覧。
このファイルは `data/lines.csv` から生成される（`node split-lines/split-lines.cjs --review` で再生成）。

- **auto_review** … 本数の中間V字凹みなど不自然な兆候あり。値は暫定で地図には反映済み。
- **auto_fail** … 駅順序ずれ等で自動処理に失敗。本数は既定値のまま。

確認して正しい区間・本数に直したら、その行の `状態` を `manual` にすると本リストから外れる。

確認待ち: **7 路線**

## - [ ] 箱根登山鉄道  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "箱根登山鉄道" --fresh` で理由を確認。

## - [ ] 相鉄・JR直通線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "相鉄・JR直通線" --fresh` で理由を確認。

## - [ ] 根室線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "根室線" --fresh` で理由を確認。

## - [ ] 海峡線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "海峡線" --fresh` で理由を確認。

## - [ ] ガイドウェイバス志段味線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "ガイドウェイバス志段味線" --fresh` で理由を確認。

## - [ ] 摩耶ケーブル線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "摩耶ケーブル線" --fresh` で理由を確認。

## - [ ] 黒部峡谷鉄道線  （auto_fail）

→ 自動処理失敗。`node split-lines/split-lines.cjs --line "黒部峡谷鉄道線" --fresh` で理由を確認。
