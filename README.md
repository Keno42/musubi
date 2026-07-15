# Musubi

地域の「行きたい」「手伝える」を安全につなぐ試作サービス(v3)。
ベースの仕様は [`docs/musubi-v2.5-handoff.md`](./docs/musubi-v2.5-handoff.md)、
v3(おねがいカード)の設計判断は [`docs/feedback/2026-07-11-stakeholder.md`](./docs/feedback/2026-07-11-stakeholder.md) を参照。

## Stack

Vite + React + Firebase(Hosting / Auth メールリンク認証 / Firestore)

## Contributing — 人間もAIも必読

コードを書く前に [`AGENTS.md`](./AGENTS.md) を読むこと。
このプロジェクトの最優先事項は「機能を増やすこと」ではなく
「利用者・開発者・AIにとって常にシンプルであり続けること」。
依頼をそのまま実装せず、アプリ全体の優先順位と照らして判断する。

## Local setup

```sh
nvm use          # Node version pinned in .nvmrc
npm install
```

Firestore Emulator は Java 21+ が必要です(`firebase-tools` の要件)。システムに入っていない場合は
ポータブルな JDK を使ってください(sudo不要):

```sh
export JAVA_HOME=~/java/jdk-21.0.11+10/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
```

## Scripts

```sh
npm run dev          # start Vite dev server
npm run build        # production build
npm run lint         # eslint
npm run test:rules   # Firestore security rules tests (needs JAVA_HOME, see above)
npm run test:bdd        # Playwright BDD / golden-image scenarios (see test/bdd/README.md)
npm run test:bdd:update # same, refreshing golden images with what actually rendered
```

## Emulator Suite

```sh
firebase emulators:start
```

Firestore: 8080 / Auth: 9099 / Hosting: 5000 / Emulator UI: 4000

To point the app at emulators during `npm run dev`, set `VITE_USE_EMULATORS=true`.

管理者判定は `firestore.rules` に直書きされたメールアドレスで行います。
エミュレータで管理者画面を試すには、そのアドレス(リポジトリ上は
`admin@example.com`)でログインしてください(エミュレータはメールボックスの
所有確認をしないため、誰でもそのアドレスでログインできます。ログインリンクは
エミュレータのログに出力されます)。

## Deploy

このリポジトリは「エンジン」であり、**自分がどこにデプロイされるかを知りません**。
デプロイ先の識別情報 — FirebaseプロジェクトID・web設定・本番URL・実際の
緊急連絡先 — はすべて GitHub の Environment(repoの Settings > Environments)
の secrets として管理し、リポジトリのファイルには一切書きません。

| Environment | 用途 |
|---|---|
| `Musubi` | 本番。deployment branches を `main` のみに制限しておくこと(作業ブランチを誤って本番に出せなくなる) |
| `Musubi-Preview` | 本番反映前の確認用(任意)。**必ず本番とは別のFirebaseプロジェクト**を指すこと — 同じプロジェクト内の第2 Hostingサイトでは Firestore/Auth が本番と共有され、テスト用のおねがいが実際の利用者・サポーターに見えてしまう |

各 Environment に登録する secrets(両方とも同じ名前一式):

| Secret | 内容 |
|---|---|
| `FIREBASE_CONFIG` | Firebaseコンソールのweb設定を**厳密なJSON**(キーも引用符で囲む)にしたもの |
| `FIREBASE_PROJECT_ID` | FirebaseプロジェクトID |
| `FIREBASE_SERVICE_ACCOUNT` | Hostingデプロイ用のサービスアカウントJSON |
| `EMERGENCY_CONTACT_NAME` / `EMERGENCY_CONTACT_EMAIL` / `EMERGENCY_CONTACT_PHONE` | 全ログイン後画面のフッターに出す緊急連絡先(未設定ならプレースホルダ表示のまま。プレビューでは未設定のままが正解) |

デプロイの実行方法(`.github/workflows/deploy.yml`):

- **本番**: `main` への push で自動デプロイ。
- **secretsだけ変えたとき**(連絡先の変更など、コード変更なしの再デプロイ):
  Actions タブ → 「Deploy Hosting」→ Run workflow → branch: `main`、
  environment: `Musubi`。
- **本番反映前の確認**: Run workflow → branch: 確認したいブランチ、
  environment: `Musubi-Preview`(デフォルト)。プレビュープロジェクトの
  固定URL(`<プレビュープロジェクトID>.web.app`)で確認できます。

いずれも必須 secrets が未設定の場合はビルド前に失敗するので、emulator専用の
demo設定のまま本番に出ることはありません。

Firestore rules は自動デプロイされません。`firestore.rules` を変更したら
対象プロジェクト(本番・プレビュー各々)へ手動でデプロイします:

```sh
firebase deploy --only firestore:rules --project <対象プロジェクトID>
```

プレビュープロジェクト側も初回だけ本番と同じセットアップ(Auth のメール
リンク認証の有効化・Firestore 作成・rules デプロイ)が必要です。

⚠️ リポジトリの `firestore.rules` の管理者アドレスはプレースホルダです。
そのままデプロイすると管理者が誰もいなくなります。デプロイ前に実際の
運営アドレスへ置き換えてください(本番の実アドレスはリポジトリに含めない)。

ローカルから実プロジェクトへ接続・手動デプロイしたい場合は、gitignore済みの
`.env.local` に `VITE_FIREBASE_CONFIG` を設定してからビルドしてください。
未設定のビルドは Emulator Suite 専用のdemo設定になり、実プロジェクトには
接続できません(意図的な設計です)。
