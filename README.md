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
緊急連絡先 — はすべて GitHub の Environment **「Musubi」**(repoの
Settings > Environments)の secrets として管理し、リポジトリのファイルには
一切書きません。登録する secrets:

| Secret | 内容 |
|---|---|
| `FIREBASE_CONFIG` | Firebaseコンソールのweb設定を**厳密なJSON**(キーも引用符で囲む)にしたもの |
| `FIREBASE_PROJECT_ID` | FirebaseプロジェクトID |
| `FIREBASE_SERVICE_ACCOUNT` | Hostingデプロイ用のサービスアカウントJSON |
| `EMERGENCY_CONTACT_NAME` / `EMERGENCY_CONTACT_EMAIL` / `EMERGENCY_CONTACT_PHONE` | 全ログイン後画面のフッターに出す緊急連絡先(未設定ならプレースホルダ表示のまま) |

Hosting は `main` への push ごとに
`.github/workflows/firebase-hosting-merge.yml` が自動デプロイします。上記の
必須 secrets が未設定の場合はビルド前に失敗するので、emulator専用のdemo設定
のまま本番に出ることはありません。

Firestore rules は自動デプロイされません。`firestore.rules` を変更したら
手動でデプロイします:

```sh
firebase deploy --only firestore:rules --project <本番プロジェクトID>
```

⚠️ リポジトリの `firestore.rules` の管理者アドレスはプレースホルダです。
そのままデプロイすると管理者が誰もいなくなります。デプロイ前に実際の
運営アドレスへ置き換えてください(本番の実アドレスはリポジトリに含めない)。

ローカルから実プロジェクトへ接続・手動デプロイしたい場合は、gitignore済みの
`.env.local` に `VITE_FIREBASE_CONFIG` を設定してからビルドしてください。
未設定のビルドは Emulator Suite 専用のdemo設定になり、実プロジェクトには
接続できません(意図的な設計です)。
