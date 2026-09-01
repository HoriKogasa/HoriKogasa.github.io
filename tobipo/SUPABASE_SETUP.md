# Supabaseの初期設定

GitHub Pagesはそのまま使い、曲データだけをSupabaseへ保存します。公開ページの閲覧にログインは不要です。メールのマジックリンクでログインしたユーザーは全員、曲の追加と変更ができます。

## 1. Supabaseプロジェクトを作る

1. Supabase Dashboardで新しいプロジェクトを作成します。
2. SQL Editorを開き、`supabase-setup.sql` の内容を実行します。

## 2. メールログインを設定する

Authenticationの設定でEmailログインと新規登録を有効にします。

URL Configurationで次を設定します。

- Site URL: `https://horikogasa.com/tobipo/`
- Redirect URLs: `https://horikogasa.com/tobipo/admin.html`

## 3. 公開用キーを設定する

Supabase DashboardのConnectまたはAPI Keys画面から、次の2つを取得します。

- Project URL
- Publishable key

`supabase-config.js` のプレースホルダーを書き換えます。Publishable keyはRLSと組み合わせてブラウザで使う公開用キーです。Secret keyまたはservice_role keyは絶対に入れないでください。

```js
window.TOBIPO_CONFIG = {
  url: "https://実際のProject ID.supabase.co",
  publishableKey: "実際のPublishable key",
};
```

## 4. 既存52曲を移す

1. `https://horikogasa.com/tobipo/admin.html` を開きます。
2. メールアドレスを入力し、届いたログインリンクを開きます。
3. 「既存のdata.jsonを取り込む」を一度だけ押します。

Supabaseが未設定、空、または一時的に読み込めない場合、ランキング画面は従来の `data.json` を表示します。

## 権限について

- 未ログイン: 閲覧のみ
- ログイン済み: 閲覧、曲の追加、全曲の変更
- 削除: 不可

これは「ログインできれば誰でも編集可能」という設定です。不特定多数へ広く公開する場合は、スパムや改ざん対策としてSupabase AuthのCAPTCHAも検討してください。
