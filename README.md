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

Hosting deploys automatically via GitHub Actions on every push to `main` (see
`.github/workflows/firebase-hosting-merge.yml`). PRs get their own preview channel
via `.github/workflows/firebase-hosting-pull-request.yml`.

Firestore rules are **not** auto-deployed — after changing `firestore.rules`,
deploy manually:

```sh
firebase deploy --only firestore:rules
```

⚠️ リポジトリの `firestore.rules` の管理者アドレスはプレースホルダです。
そのままデプロイすると管理者が誰もいなくなります。デプロイ前に実際の
運営アドレスへ置き換えてください(本番の実アドレスはリポジトリに含めない)。

To deploy everything manually:

```sh
npm run build
firebase deploy
```

Note: PR preview channels are for UI review only — test auth/Firestore flows
locally via the Emulator Suite instead.
