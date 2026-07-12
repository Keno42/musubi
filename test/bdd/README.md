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

One spec file per page, covering every typical UX *status* that page can be
in — not every possible personal scenario. States that aren't reachable
through any real app code path (e.g. an offer's `rejected` status — nothing
in `src/` ever sets it) aren't given a scenario; a golden for a state the
app can't actually produce isn't testing anything real.

- `top.spec.js` — the public top page (no login): first visit, phone viewport.
- `user.spec.js` — `/user`: no おねがい yet (empty form), an open
  (unmatched) おねがい, a matched おねがい.
- `supporter.spec.js` — `/supporter`: nothing open to browse, browsing an
  open おねがい, mid-application with the self-check unconfirmed, already
  applied and awaiting review, application matched.
- `admin.spec.js` — `/admin`: nothing registered yet, a mix of open/matched
  おねがい, multiple offers awaiting review, approving a match end-to-end.

Signing in without a real inbox is done via the Firestore/Auth **emulator**:
the app's real `sendSignInLinkToEmail` call is exercised as normal, but
instead of an email being sent, the emulator records the link and exposes
it at `GET /emulator/v1/projects/{projectId}/oobCodes`. The test fetches
that link and navigates to it — the same request a user's browser makes by
clicking the link in their email — so the app's actual
`src/auth/AuthContext.jsx` sign-in code runs unmodified. See
`support/emulatorAuth.js`. No app code, no test-only bypass, no seams added
to production code for testing purposes.

Preconditions that belong to a *different* actor than the one signing in
(an おねがい someone else registered, an offer another supporter made, a
match an admin already approved) are seeded directly into the Firestore
emulator — see `support/seed.js` — in the same document shape
`src/lib/firestore.js` writes, rather than replaying every other role's
full UI flow as setup for every scenario. State transitions the scenario is
actually *about* (applying, approving a match) are still driven through the
real UI. `seed.js` also pre-creates the signing-in account via the Auth
Emulator's REST API so seeded documents can reference the exact `uid` the
browser will sign in as (verified this reuses the same account rather than
creating a duplicate — see the function doc comments).

Because scenarios share one Firestore/Auth emulator as mutable backend
state, `playwright.config.js` runs this suite with `workers: 1`, and each
spec resets both emulators in `test.beforeEach` — parallel workers
resetting/reading that shared state concurrently would race.

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
