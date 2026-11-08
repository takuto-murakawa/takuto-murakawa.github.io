# 島おこし！ミライ島 — TOP30ランキング API

GitHub Pagesの静的ゲームに追加するCloudflare Workers + D1のオンラインランキングです。採点式は変更せず、24ターン後の総合評価（小数第1位）を使用します。ニックネームと得点だけが公開され、登録は任意です。

## 稼働手順（Cloudflareアカウントが必要）

1. Node.jsを使えるPCでGitHubリポジトリを取得し、leaderboardディレクトリに移動。
2. `npx wrangler login` でCloudflareにログイン。
3. `npx wrangler d1 create mirai-island-ranking` でD1データベースを作成。
4. 表示されたIDを `wrangler.json` の `REPLACE_WITH_D1_DATABASE_ID` と置き換える。
5. `npx wrangler d1 migrations apply mirai-island-ranking --remote` でテーブルを作成。
6. `npx wrangler secret put HASH_SALT` でランダムな20文字以上の秘密文字列を保存（GitHubに置かない）。
7. `npx wrangler deploy` でWorkerを公開。
8. `GET https://<Worker URL>/v1/leaderboard` が空の一覧を返すことを確認。
9. `games/mirai-island/leaderboard-config.js` にWorkerのHTTPS URLを設定してGitHub Pagesを更新。

**9まで終わるまではランキングはOFFのままで、従来のゲームに影響しません。** API URLは公開情報、秘密トークンはブラウザに書かないでください。

## API
- GET /v1/leaderboard: 30件の順位・名前・得点。
- GET /v1/qualify?score=875: 得点87.5の暫定資格（30件未満は通過。満席時は30位を超えた場合のみ）。
- POST /v1/scores: JSON {name: '島づくり名人', score:875}。再度資格判定し、上位30件以外を削除。
- POSTは公式サイトOriginのみ。日別ハッシュでIP別の登録回数を制限。**ブラウザスコアの改ざんは完全には防げません。**

## 運用
- 不適切な名前はCloudflareのD1コンソールから管理者が削除可能。例: `DELETE FROM scores WHERE id=123;`
- 削除対象のIDは `SELECT id,name,score_tenths FROM scores ORDER BY score_tenths DESC,id ASC;` で確認。
- DBには生IPアドレスを記録せず、日別のソルト付きハッシュのみを登録回数制限に利用します。Cloudflareは通信ログを通常処理します。
- 公開時にはサイトのプライバシーページにランキングの外部通信・名前と点数の公開を追記すること。
- ランキングを止めたいときはフロント側API URLを空に戻してください。

## ローカル確認
`npx wrangler d1 migrations apply mirai-island-ranking --local`
`npx wrangler dev`
