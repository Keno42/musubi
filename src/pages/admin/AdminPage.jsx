import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import LoginGate from '../../components/LoginGate';
import EmergencyContactFooter from '../../components/EmergencyContactFooter';
import { fetchAllNeedsForAdmin, fetchAllOffersForAdmin, approveMatch } from '../../lib/firestore';

function AdminHome() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedNeedId, setSelectedNeedId] = useState(null);
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const [supplementNote, setSupplementNote] = useState('');
  const [matchedInfo, setMatchedInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    try {
      const [n, o] = await Promise.all([fetchAllNeedsForAdmin(), fetchAllOffersForAdmin()]);
      setNeeds(n);
      setOffers(o);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, []);

  const offersByNeed = useMemo(() => {
    const map = new Map();
    for (const o of offers) {
      if (!map.has(o.needId)) map.set(o.needId, []);
      map.get(o.needId).push(o);
    }
    return map;
  }, [offers]);

  const selectedNeed = needs.find((n) => n.id === selectedNeedId) || null;
  const offersForSelected = selectedNeed ? offersByNeed.get(selectedNeed.id) || [] : [];
  const selectedOffer = offersForSelected.find((o) => o.id === selectedOfferId) || null;

  if (loadError) {
    return (
      <div className="page">
        <p className="page-header">Musubi — 管理者</p>
        <p className="error-text">読み込みに失敗しました: {loadError}</p>
        <p>このメールアドレスが管理者として登録されているか確認してください。</p>
      </div>
    );
  }

  async function handleMatch() {
    setSubmitting(true);
    try {
      await approveMatch(user.uid, selectedNeed, selectedOffer, supplementNote);
      setMatchedInfo({ need: selectedNeed, offer: selectedOffer });
      setSelectedNeedId(null);
      setSelectedOfferId(null);
      setSupplementNote('');
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <p className="page-header">Musubi — 管理者</p>

      {matchedInfo && (
        <div className="card notice-box">
          <p>マッチングが成立しました。</p>
          <p>本番では、利用者とサポーターの双方にメールが送信されます。</p>
          <p>この試作ではメールは送信されません。</p>
          <p>利用者・サポーターは、画面を再読み込みすると確定情報を確認できます。</p>
        </div>
      )}

      {!selectedNeed && (
        <>
          <h2>おねがい一覧</h2>
          <ul className="status-list">
            {needs.map((n) => (
              <li key={n.id} className="card">
                <p>{n.date} {n.startTime}〜{n.endTime} / {n.supportCategory} / {n.status}</p>
                <p>{n.publicArea}</p>
                {n.private && <p>{n.private.personName} / {n.private.personEmail}</p>}
                {n.private && <p>詳細住所: {n.private.privateAddress}</p>}
                <p>応募数: {(offersByNeed.get(n.id) || []).length}</p>
                <button className="btn btn--primary" onClick={() => setSelectedNeedId(n.id)}>
                  応募を確認する
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedNeed && !selectedOffer && (
        <>
          <button className="btn btn--secondary" onClick={() => setSelectedNeedId(null)}>おねがい一覧に戻る</button>
          <h2>応募一覧</h2>
          {offersForSelected.length === 0 && <p>まだ応募はありません。</p>}
          <ul className="status-list">
            {offersForSelected.map((o) => (
              <li key={o.id} className="card">
                <p>{o.supporterName} / {o.supporterEmail} / {o.status}</p>
                {o.message && <p>メッセージ: {o.message}</p>}
                <button className="btn btn--primary" disabled={o.status !== 'submitted'} onClick={() => setSelectedOfferId(o.id)}>
                  この応募でマッチングする
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedNeed && selectedOffer && (
        <div className="card">
          <button className="btn btn--secondary" onClick={() => setSelectedOfferId(null)}>応募一覧に戻る</button>
          <h2>詳細確認</h2>
          <p>日時: {selectedNeed.date} {selectedNeed.startTime}〜{selectedNeed.endTime}</p>
          <p>利用者: {selectedNeed.private?.personName} / {selectedNeed.private?.personEmail}</p>
          <p>詳細住所: {selectedNeed.private?.privateAddress}</p>
          <p>サポーター: {selectedOffer.supporterName} / {selectedOffer.supporterEmail}</p>
          <label>
            サポーターへ伝える補足(任意)
            <textarea className="input" value={supplementNote} onChange={(e) => setSupplementNote(e.target.value)} />
          </label>
          <button className="btn btn--primary btn--large" disabled={submitting} onClick={handleMatch}>
            {submitting ? '処理中...' : 'マッチング成立'}
          </button>
        </div>
      )}

      <EmergencyContactFooter />
    </div>
  );
}

export default function AdminPage() {
  return (
    <LoginGate redirectPath="/admin">
      <AdminHome />
    </LoginGate>
  );
}
