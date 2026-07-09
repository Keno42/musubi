# Musubi

地域の「行きたい」「手伝える」を安全につなぐ試作サービス(v2.5)。
プロジェクトの背景・仕様は [`docs/musubi-v2.5-handoff.md`](./docs/musubi-v2.5-handoff.md) を参照。

## Stack

Vite + React + Firebase(Hosting / Auth メールリンク認証 / Firestore)

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
```

## Emulator Suite

```sh
firebase emulators:start
```

Firestore: 8080 / Auth: 9099 / Hosting: 5000 / Emulator UI: 4000

To point the app at emulators during `npm run dev`, set `VITE_USE_EMULATORS=true`.

## Deploy

Hosting deploys automatically via GitHub Actions on every push to `main` (see
`.github/workflows/firebase-hosting-merge.yml`). PRs get their own preview channel
via `.github/workflows/firebase-hosting-pull-request.yml`.

Firestore rules are **not** auto-deployed (the CI service account only has Hosting
Admin permission) — after changing `firestore.rules`, deploy manually:

```sh
firebase deploy --only firestore:rules
```

To deploy everything manually:

```sh
npm run build
firebase deploy
```

### API key restriction and PR previews

The Firebase Web SDK apiKey is restricted (Google Cloud Console → APIs & Services →
Credentials) to only accept requests referred from `https://musubi-6fff3.web.app/*`.
This means logging in on a PR preview URL (`https://musubi-6fff3--<channel>.web.app`)
against the live backend will fail auth/Firestore calls, since its referrer won't match.

If you need to test a PR preview against the live backend, temporarily add its exact
URL (find it in the PR's bot comment or the workflow run output) as another allowed
referrer, then remove it once done. Otherwise, test PR previews via the Emulator Suite,
or skip auth-dependent flows on previews.
