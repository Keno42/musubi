import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Matches the emulator-only demo projectId in src/firebaseConfig.js.
// Duplicated as a literal (not imported) so this test helper has no
// dependency on the app's module graph.
const PROJECT_ID = 'demo-musubi';
const AUTH_EMULATOR_ORIGIN = 'http://127.0.0.1:9099';

let envPromise;
function getTestEnv() {
  envPromise ??= initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080 },
  });
  return envPromise;
}

// Resets both emulators so every scenario starts from a clean, known state
// regardless of run order. Playwright runs this suite with workers: 1 (see
// playwright.config.js) because this shared backend state isn't safe to
// mutate from parallel tests.
export async function resetEmulators() {
  const env = await getTestEnv();
  await env.clearFirestore();
  const res = await fetch(
    `${AUTH_EMULATOR_ORIGIN}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error(`Failed to clear Auth emulator accounts: ${res.status}`);
}

// Pre-creates an Auth account and returns its uid, so seeded Firestore
// fixtures can reference the exact uid the browser will sign in as later —
// signInViaEmailLink's email-link sign-in reuses the existing account for
// that email rather than creating a new one (verified against the Auth
// Emulator directly; see support/emulatorAuth.js).
export async function createTestUser(email) {
  const res = await fetch(
    `${AUTH_EMULATOR_ORIGIN}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'bdd-fixture-unused', returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error(`Failed to create Auth emulator user ${email}: ${res.status}`);
  const { localId } = await res.json();
  return localId;
}

async function withAdminFirestore(fn) {
  const env = await getTestEnv();
  return env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));
}

const DEFAULT_NEED = {
  date: '2026-07-20',
  startTime: '10:00',
  endTime: '11:00',
  publicArea: '西大井3丁目から2丁目',
  supportCategory: '通院などの外出',
  publicDistance: '近くまで(10分ほどの移動)',
  supportPoints: [],
  publicSummary: '',
};

const DEFAULT_PRIVATE = {
  personName: 'テスト太郎',
  personEmail: 'bdd-fixture-person@example.invalid',
  privateAddress: 'テスト市テスト町1-1',
  privateDestination: 'テストクリニック',
  privateNote: '',
};

// Given: an おねがい already registered by `uid`, in the same document
// shape src/lib/firestore.js#createNeed writes. Returns its id.
export async function seedOpenNeed(uid, overrides = {}) {
  const needId = overrides.id || `bdd-need-${Math.random().toString(36).slice(2)}`;
  await withAdminFirestore(async (db) => {
    await db
      .collection('needsPublic')
      .doc(needId)
      .set({
        id: needId,
        status: 'open',
        createdByUid: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...DEFAULT_NEED,
        ...overrides.public,
      });
    await db
      .collection('needsPrivate')
      .doc(needId)
      .set({
        needId,
        createdByUid: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...DEFAULT_PRIVATE,
        ...overrides.private,
      });
  });
  return needId;
}

// Given: a supporter's offer already submitted for `needId`, in the shape
// src/lib/firestore.js#createOffer writes. Returns its id.
export async function seedOffer(uid, needId, overrides = {}) {
  const offerId = overrides.id || `bdd-offer-${Math.random().toString(36).slice(2)}`;
  await withAdminFirestore(async (db) => {
    await db
      .collection('offers')
      .doc(offerId)
      .set({
        id: offerId,
        needId,
        status: 'submitted',
        supporterName: 'テスト花子',
        supporterEmail: 'bdd-fixture-supporter@example.invalid',
        message: '',
        createdByUid: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      });
  });
  return offerId;
}

// Given: an admin already approved this offer, in the shape
// src/lib/firestore.js#approveMatch writes (needsPublic -> matched,
// offers -> approved, matchings + matchDetails created). `adminUid` is
// purely informational here (no security rule reads it), so it doesn't
// need a pre-created Auth account.
export async function seedApprovedMatch(adminUid, needId, offerId, overrides = {}) {
  const matchingId = overrides.id || `bdd-match-${Math.random().toString(36).slice(2)}`;
  await withAdminFirestore(async (db) => {
    await db.collection('needsPublic').doc(needId).update({ status: 'matched', updatedAt: new Date() });
    await db.collection('offers').doc(offerId).update({ status: 'approved', updatedAt: new Date() });
    const privateSnap = await db.collection('needsPrivate').doc(needId).get();
    const priv = privateSnap.exists ? privateSnap.data() : {};
    await db
      .collection('matchings')
      .doc(matchingId)
      .set({
        id: matchingId,
        needId,
        offerId,
        status: 'matched',
        matchedByUid: adminUid,
        matchedAt: new Date(),
        notificationStatus: 'notification_mocked',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    await db
      .collection('matchDetails')
      .doc(matchingId)
      .set({
        matchingId,
        personName: priv.personName || '',
        confirmedAddress: priv.privateAddress || '',
        confirmedDestination: priv.privateDestination || '',
        supplementNote: overrides.supplementNote || '',
        createdAt: new Date(),
      });
  });
  return matchingId;
}
