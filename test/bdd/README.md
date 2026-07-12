# BDD / golden-image tests

Playwright tests written as Given/When/Then scenarios. Each scenario asserts
specific, named content (a label, a button, a disabled state) *and* takes a
screenshot compared against a golden image in `goldens/`.

The screenshot is a **visual reference for human review**, not the sole
pass/fail signal — pixel-diffing alone is too flaky across machines for a
Japanese-language UI (font rendering varies by OS/font availability). If a
scenario's explicit assertions pass but the screenshot differs, look at the
diff and judge whether it's a real regression or just local rendering drift
before updating the golden.

## Scope

`top.spec.js` covers the public top page — no login needed.

`user.spec.js` covers the auth-gated `/user` page. Signing in without a real
inbox is done via the Firestore/Auth **emulator**: the app's real
`sendSignInLinkToEmail` call is exercised as normal, but instead of an email
being sent, the emulator records the link and exposes it at
`GET /emulator/v1/projects/{projectId}/oobCodes`. The test fetches that link
and navigates to it — the same request a user's browser makes by clicking
the link in their email — so the app's actual
`src/auth/AuthContext.jsx` sign-in code runs unmodified. See
`support/emulatorAuth.js`. No app code, no test-only bypass, no seams added
to production code for testing purposes.

`/supporter` and `/admin` aren't covered yet; the same `signInViaEmailLink`
helper applies, they just need their own scenario files.

## Running

```sh
npm run test:bdd           # run scenarios against the emulator, compare against goldens
npm run test:bdd:update    # same, but refresh goldens with what actually rendered
```

Needs Java 21+ on PATH (Firestore emulator) — see README.md. Not a plain
`playwright test` invocation: both scripts wrap the run in
`firebase emulators:exec` so the Auth/Firestore emulators are up first
(passing `--update-snapshots` through the emulator wrapper as a bare CLI
flag doesn't work, hence the separate `test:bdd:update` script instead of
`npm run test:bdd -- --update-snapshots`).

## CI

`.github/workflows/bdd-goldens.yml` runs `test:bdd:update` on every PR and
pushes any changed golden images straight back onto the PR branch. It never
blocks merging — a human looks at the resulting image diff (and at any
scenario assertion failures, which the job also swallows rather than
red-X'ing the PR) and decides whether it's expected. Skipped for PRs from
forks, which can't push back to the PR branch anyway.
