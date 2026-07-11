import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';

// 管理者は firestore.rules に直書きされたメールアドレスで判定する
// (リポジトリ上はプレースホルダ。実際の運営アドレスは本番環境側でのみ管理)
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_CLAIMS = { email: ADMIN_EMAIL };

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'musubi-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

test.after(async () => {
  await testEnv.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

function needPublicDoc(overrides = {}) {
  return {
    id: 'need1',
    status: 'open',
    date: '2026-07-12',
    startTime: '13:00',
    endTime: '15:00',
    publicArea: '西大井3丁目付近',
    supportCategory: '地域活動への外出',
    publicSummary: '短時間の付き添いを希望しています',
    createdByUid: 'user1',
    ...overrides,
  };
}

function needPrivateDoc(overrides = {}) {
  return {
    needId: 'need1',
    personName: '山田太郎',
    personEmail: 'yamada@example.com',
    privateAddress: '東京都品川区西大井X-X-X',
    privateNote: '',
    createdByUid: 'user1',
    ...overrides,
  };
}

async function seedAsAdmin(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

test('unauthenticated users cannot read needsPublic', async () => {
  await seedAsAdmin((db) => db.collection('needsPublic').doc('need1').set(needPublicDoc()));
  const unauth = testEnv.unauthenticatedContext();
  await assertFails(unauth.firestore().collection('needsPublic').doc('need1').get());
});

test('signed-in users can read needsPublic', async () => {
  await seedAsAdmin((db) => db.collection('needsPublic').doc('need1').set(needPublicDoc()));
  const user = testEnv.authenticatedContext('user2', { email: 'user2@example.com' });
  await assertSucceeds(user.firestore().collection('needsPublic').doc('need1').get());
});

test('user can create a needsPublic doc with their own uid, not someone else\'s', async () => {
  const user = testEnv.authenticatedContext('user1', { email: 'user1@example.com' });
  await assertSucceeds(
    user.firestore().collection('needsPublic').doc('need1').set(needPublicDoc({ createdByUid: 'user1' }))
  );
  await assertFails(
    user.firestore().collection('needsPublic').doc('need2').set(needPublicDoc({ id: 'need2', createdByUid: 'someoneElse' }))
  );
});

test('non-admin cannot read needsPrivate; admin can', async () => {
  await seedAsAdmin((db) => db.collection('needsPrivate').doc('need1').set(needPrivateDoc()));

  const nonAdmin = testEnv.authenticatedContext('user2', { email: 'user2@example.com' });
  await assertFails(nonAdmin.firestore().collection('needsPrivate').doc('need1').get());

  const admin = testEnv.authenticatedContext('admin1', ADMIN_CLAIMS);
  await assertSucceeds(admin.firestore().collection('needsPrivate').doc('need1').get());
});

// 管理者判定はホワイトリストのメールアドレスのみ。リスト外のメールや
// カスタムクレームでは管理者になれないことを固定するリグレッションテスト。
test('only the whitelisted email grants admin; other emails and custom claims do not', async () => {
  await seedAsAdmin((db) => db.collection('needsPrivate').doc('need1').set(needPrivateDoc()));

  const otherEmail = testEnv.authenticatedContext('user3', { email: 'operator@example.com' });
  await assertFails(otherEmail.firestore().collection('needsPrivate').doc('need1').get());

  const claimWithoutEmail = testEnv.authenticatedContext('user4', { admin: true });
  await assertFails(claimWithoutEmail.firestore().collection('needsPrivate').doc('need1').get());
});

test('offer creator can read their own offer; other users cannot', async () => {
  await seedAsAdmin((db) =>
    db.collection('offers').doc('offer1').set({
      id: 'offer1',
      needId: 'need1',
      status: 'submitted',
      supporterName: 'サポーターA',
      supporterEmail: 'supporter@example.com',
      message: '',
      createdByUid: 'supporter1',
    })
  );

  const owner = testEnv.authenticatedContext('supporter1', { email: 'supporter1@example.com' });
  await assertSucceeds(owner.firestore().collection('offers').doc('offer1').get());

  const stranger = testEnv.authenticatedContext('stranger', { email: 'stranger@example.com' });
  await assertFails(stranger.firestore().collection('offers').doc('offer1').get());
});

// fetchMyOffers が使う「自分の応募一覧」クエリ。リスト読み取りはドキュメント単位の
// 読み取りと別に判定されるため、明示的にテストする。
test('supporter can list their own offers via createdByUid query; unconstrained list fails', async () => {
  await seedAsAdmin((db) =>
    db.collection('offers').doc('offer1').set({
      id: 'offer1',
      needId: 'need1',
      status: 'submitted',
      supporterName: 'サポーターA',
      supporterEmail: 'supporter@example.com',
      message: '',
      createdByUid: 'supporter1',
    })
  );

  const owner = testEnv.authenticatedContext('supporter1', { email: 'supporter1@example.com' });
  await assertSucceeds(
    owner.firestore().collection('offers').where('createdByUid', '==', 'supporter1').get()
  );
  await assertFails(owner.firestore().collection('offers').get());
});

test('only admin can change offer status', async () => {
  await seedAsAdmin((db) =>
    db.collection('offers').doc('offer1').set({
      id: 'offer1',
      needId: 'need1',
      status: 'submitted',
      supporterName: 'サポーターA',
      supporterEmail: 'supporter@example.com',
      message: '',
      createdByUid: 'supporter1',
    })
  );

  const owner = testEnv.authenticatedContext('supporter1', { email: 'supporter1@example.com' });
  await assertFails(
    owner.firestore().collection('offers').doc('offer1').update({ status: 'approved' })
  );

  const admin = testEnv.authenticatedContext('admin1', ADMIN_CLAIMS);
  await assertSucceeds(
    admin.firestore().collection('offers').doc('offer1').update({ status: 'approved' })
  );
});

test('only admin can write matchings', async () => {
  const user = testEnv.authenticatedContext('user1', { email: 'user1@example.com' });
  await assertFails(
    user.firestore().collection('matchings').doc('m1').set({
      id: 'm1',
      needId: 'need1',
      offerId: 'offer1',
      status: 'matched',
    })
  );

  const admin = testEnv.authenticatedContext('admin1', ADMIN_CLAIMS);
  await assertSucceeds(
    admin.firestore().collection('matchings').doc('m1').set({
      id: 'm1',
      needId: 'need1',
      offerId: 'offer1',
      status: 'matched',
    })
  );
});

test('matched supporter and need owner can read matchDetails; a stranger cannot', async () => {
  await seedAsAdmin(async (db) => {
    await db.collection('needsPrivate').doc('need1').set(needPrivateDoc({ createdByUid: 'user1' }));
    await db.collection('offers').doc('offer1').set({
      id: 'offer1',
      needId: 'need1',
      status: 'approved',
      createdByUid: 'supporter1',
    });
    await db.collection('matchings').doc('m1').set({
      id: 'm1',
      needId: 'need1',
      offerId: 'offer1',
      status: 'matched',
    });
    await db.collection('matchDetails').doc('m1').set({
      matchingId: 'm1',
      confirmedAddress: '東京都品川区西大井X-X-X',
      supplementNote: '',
    });
  });

  const needOwner = testEnv.authenticatedContext('user1', { email: 'user1@example.com' });
  await assertSucceeds(needOwner.firestore().collection('matchDetails').doc('m1').get());

  const supporter = testEnv.authenticatedContext('supporter1', { email: 'supporter1@example.com' });
  await assertSucceeds(supporter.firestore().collection('matchDetails').doc('m1').get());

  const stranger = testEnv.authenticatedContext('stranger', { email: 'stranger@example.com' });
  await assertFails(stranger.firestore().collection('matchDetails').doc('m1').get());
});
