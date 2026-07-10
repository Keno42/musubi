# Working on Musubi — read this before writing code

Musubi connects people who need accompaniment (often elderly, sometimes living
with dementia) with local supporters, mediated by a human admin.
**Simplicity is the product.** The biggest threat to this codebase is not a
missing feature — it is accumulation. Every contributor, human or AI, is
expected to leave the app *simpler* than they found it, or to justify why not.

The spec is [`docs/musubi-v2.5-handoff.md`](./docs/musubi-v2.5-handoff.md).
Its §3 defines what is deliberately **out of scope**; §13 lists ideas already
parked for later. Check both before building anything.

## Prime directive: weigh requests, don't just implement them

When you receive a feature request (including from the project owner), weigh it
against the app's standing priorities, in this order:

1. **Safety and privacy of end users** — data separation, security rules
2. **Clarity for end users** — fewer screens, less to read, larger targets
3. **Clarity of the codebase** — fewer files, fewer concepts, fewer deps
4. The requested feature itself

If the request conflicts with 1–3, say so and propose a smaller or safer
version *before* coding. "Here is a leaner way to get what you actually want"
is an expected answer, not insubordination. If an idea is good but not needed
now, record it in a GitHub issue instead of code.

## Invariants — never break these

- `needsPublic` documents must **never** contain PII: no names, emails,
  addresses, destinations, or detailed circumstances. Any new Firestore field
  must be explicitly classified public or private before it is written.
- All Firestore reads/writes go through `src/lib/firestore.js`. No inline
  queries in components.
- Any change to `firestore.rules` requires a matching test in `test/` and a
  passing `npm run test:rules`. Rules deploy is manual:
  `firebase deploy --only firestore:rules` (CI only deploys Hosting).
- No real personal data in seeds, tests, screenshots, or docs.
- Spark-plan assumptions hold: no Cloud Functions, no paid services, no real
  email sending. Anything that requires Blaze is out of scope by definition.

## Size and dependency budget

- Runtime dependencies are `react`, `react-dom`, `react-router-dom`,
  `firebase`. Adding **any** dependency requires written justification in the
  PR — and consider what you can remove in exchange.
- No state-management libraries, CSS frameworks, or UI kits. `src/index.css`
  is the entire design system; extend it, don't replace it.
- Prefer editing an existing component over adding a parallel one. Delete dead
  code in the same change that orphans it.
- If a small feature is costing you hundreds of net new lines, stop —
  the design is probably wrong, not the effort insufficient.

## UX rules (handoff §8)

- Japanese UI. Base font 16px, body text ≥14px, buttons ≥16px and tall,
  generous whitespace, one task per screen, forms revealed step by step.
- Notice/status wording is **fixed** by the handoff doc §5 — don't paraphrase.
- Every logged-in screen shows the emergency contact footer.
- Design for a nervous first-time user on a phone, not a power user.

## Before pushing

```sh
npm run lint && npm run build && npm run test:rules
```

(`test:rules` needs Java 21+ on PATH — see README.) CI runs the same checks on
every PR and push. Hosting auto-deploys from `main`; sanity-check
https://musubi-6fff3.web.app after merging.

## Map — keep this accurate

```
src/pages/       one file per screen role (Top / User / Supporter / Admin)
src/components/  shared pieces (currently 3 — keep it countable)
src/lib/         firestore.js = the only DB access layer
src/auth/        login context (email-link auth)
firestore.rules  the security model — the most load-bearing file in the repo
test/            rules tests
```

If your change makes this map wrong, update it here and be ready to defend the
growth in your PR.
