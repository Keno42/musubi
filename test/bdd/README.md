# BDD / golden-image tests

Playwright tests written as Given/When/Then scenarios. Each scenario asserts
specific, named content (a label, a button, an element count) *and* takes a
screenshot compared against a golden image in `goldens/`.

The screenshot is a **visual reference for human review**, not the sole
pass/fail signal — pixel-diffing alone is too flaky across machines for a
Japanese-language UI (font rendering varies by OS/font availability). If a
scenario's explicit assertions pass but the screenshot differs, look at the
diff and judge whether it's a real regression or just local rendering drift
before updating the golden.

## Scope

Currently covers the public top page only. `/user`, `/supporter`, `/admin`
sit behind email-link auth (`LoginGate`) — testing them needs the
Firestore/Auth emulator running with seeded fixture data, which is real
infrastructure and a deliberate follow-up, not bundled into this first pass.

## Running

```sh
npm run test:bdd              # run scenarios, compare against goldens
npm run test:bdd -- --update-snapshots   # after an intentional UI change
```

Not wired into CI yet — run locally before pushing UI changes, and review
`--update-snapshots` diffs by eye before committing new goldens.
