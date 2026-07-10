## What & why

<!-- One or two sentences. If this adds something, say what user problem it solves. -->

## Simplicity check (see AGENTS.md)

- [ ] This makes the app simpler for end users, or the added complexity is justified above
- [ ] No PII in `needsPublic` / public collections; any new Firestore field is classified public or private
- [ ] No new dependencies (or justified above); dead code deleted, not orphaned
- [ ] UI wording follows `docs/musubi-v2.5-handoff.md` §5; UX rules of §8 respected
- [ ] `npm run lint && npm run build && npm run test:rules` pass locally
- [ ] If `firestore.rules` changed: matching test added, and I will run the manual rules deploy after merge
