import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ---- needs ----

export async function createNeed(uid, form) {
  const needRef = doc(collection(db, 'needsPublic'));
  const needId = needRef.id;
  const privateRef = doc(db, 'needsPrivate', needId);

  const batch = writeBatch(db);
  batch.set(needRef, {
    id: needId,
    status: 'open',
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    publicArea: form.publicArea,
    supportCategory: form.supportCategory,
    publicDistance: form.publicDistance || '',
    supportPoints: form.supportPoints || [],
    publicSummary: form.publicSummary || '',
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(privateRef, {
    needId,
    personName: form.personName,
    personEmail: form.personEmail,
    privateAddress: form.privateAddress,
    privateDestination: form.privateDestination || '',
    privateNote: form.privateNote || '',
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return needId;
}

export async function fetchOpenNeeds() {
  const q = query(collection(db, 'needsPublic'), where('status', '==', 'open'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function fetchMyNeeds(uid) {
  const q = query(collection(db, 'needsPublic'), where('createdByUid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function fetchNeedPublic(needId) {
  const snap = await getDoc(doc(db, 'needsPublic', needId));
  return snap.exists() ? snap.data() : null;
}

// ---- offers ----

export async function createOffer(uid, needId, form) {
  const offerRef = doc(collection(db, 'offers'));
  await writeBatchSet(offerRef, {
    id: offerRef.id,
    needId,
    status: 'submitted',
    supporterName: form.supporterName,
    supporterEmail: form.supporterEmail,
    message: form.message || '',
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return offerRef.id;
}

async function writeBatchSet(ref, data) {
  const batch = writeBatch(db);
  batch.set(ref, data);
  await batch.commit();
}

export async function fetchMyOffers(uid) {
  const q = query(collection(db, 'offers'), where('createdByUid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function fetchOffersForNeed(needId) {
  const q = query(collection(db, 'offers'), where('needId', '==', needId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// ---- matchings / matchDetails ----

export async function fetchMatchingByOfferId(offerId) {
  const q = query(collection(db, 'matchings'), where('offerId', '==', offerId));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}

export async function fetchMatchingByNeedId(needId) {
  const q = query(collection(db, 'matchings'), where('needId', '==', needId));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}

export async function fetchMatchDetails(matchingId) {
  const snap = await getDoc(doc(db, 'matchDetails', matchingId));
  return snap.exists() ? snap.data() : null;
}

// ---- admin ----

export async function fetchAllNeedsForAdmin() {
  const [publicSnap, privateSnap] = await Promise.all([
    getDocs(query(collection(db, 'needsPublic'), orderBy('createdAt', 'desc'))),
    getDocs(collection(db, 'needsPrivate')),
  ]);
  const privateById = new Map(privateSnap.docs.map((d) => [d.id, d.data()]));
  return publicSnap.docs.map((d) => ({ ...d.data(), private: privateById.get(d.id) || null }));
}

export async function fetchAllOffersForAdmin() {
  const snap = await getDocs(collection(db, 'offers'));
  return snap.docs.map((d) => d.data());
}

export async function approveMatch(adminUid, need, offer, supplementNote) {
  const matchingRef = doc(collection(db, 'matchings'));
  const matchingId = matchingRef.id;
  const needRef = doc(db, 'needsPublic', need.id);
  const offerRef = doc(db, 'offers', offer.id);
  const detailsRef = doc(db, 'matchDetails', matchingId);

  const batch = writeBatch(db);
  batch.update(needRef, { status: 'matched', updatedAt: serverTimestamp() });
  batch.update(offerRef, { status: 'approved', updatedAt: serverTimestamp() });
  batch.set(matchingRef, {
    id: matchingId,
    needId: need.id,
    offerId: offer.id,
    status: 'matched',
    matchedByUid: adminUid,
    matchedAt: serverTimestamp(),
    notificationStatus: 'notification_mocked',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // 利用者フォームの約束「管理者と、当日の担当サポーターにだけお知らせします」に
  // 合わせて、成立時に担当サポーターへ渡す項目をここで確定する(名前・待ち合わせ場所・行き先)。
  batch.set(detailsRef, {
    matchingId,
    personName: need.private?.personName || '',
    confirmedAddress: need.private?.privateAddress || '',
    confirmedDestination: need.private?.privateDestination || '',
    supplementNote: supplementNote || '',
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return matchingId;
}

export async function updateNeedStatus(needId, status) {
  await updateDoc(doc(db, 'needsPublic', needId), { status, updatedAt: serverTimestamp() });
}
