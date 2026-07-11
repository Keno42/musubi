import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import LoginGate from '../../components/LoginGate';
import EmergencyContactFooter from '../../components/EmergencyContactFooter';
import { formatDateJa } from '../../lib/format';
import { resolveSupportPoints } from '../../lib/supportPoints';
import { fetchAllNeedsForAdmin, fetchAllOffersForAdmin, approveMatch } from '../../lib/firestore';

const NEED_STATUS = {
  open: { label: '募集中', muted: false },
  matched: { label: '成立済み', muted: true },
};

const OFFER_STATUS = {
  submitted: { label: '確認待ち', muted: false },
  approved: { label: '承認済み', muted: true },
  rejected: { label: '見送り', muted: true },
};

function StatusBadge({ map, status }) {
  const s = map[status] || { label: status, muted: true };
  return <span className={s.muted ? 'badge badge--muted' : 'badge'}>{s.label}</span>;
}

function InfoRow({ name, children }) {
  return (
    <div className="field-card">
      <p className="field-name">{name}</p>
      <p>{children}</p>
    </div>
  );
}

function AdminHome() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedNeedId, setSelectedNeedId] = useState(null);
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const [supplementNote, setSupplementNote] = useState('');
  const [matched, setMatched] = useState(false);
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
      <>
        <p className="error-text">読み込みに失敗しました: {loadError}</p>
        <p>このメールアドレスが管理者として登録されているか確認してください。</p>
      </>
    );
  }

  async function handleMatch() {
    setSubmitting(true);
    try {
      await approveMatch(user.uid, selectedNeed, selectedOffer, supplementNote);
      setMatched(true);
      setSelectedNeedId(null);
      setSelectedOfferId(null);
      setSupplementNote('');
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {matched && (
        <div className="card done-card">
          <p className="done-card__mark">✓</p>
          <h2>マッチングが成立しました</h2>
          <p>本番では、利用者とサポーターの双方にメールが送信されます。</p>
          <p>この試作ではメールは送信されません。</p>
          <p>利用者・サポーターは、画面を再読み込みすると確定情報を確認できます。</p>
        </div>
      )}

      {!selectedNeed && (
        <>
          <h2>おねがい一覧</h2>
          {needs.length === 0 && <p>まだ登録がありません。</p>}
          <ul className="status-list">
            {needs.map((n) => (
              <li key={n.id} className="card">
                <h3>{formatDateJa(n.date)} {n.startTime}〜{n.endTime} <StatusBadge map={NEED_STATUS} status={n.status} /></h3>
                <p><span className="badge">{n.supportCategory}</span> {n.publicArea}</p>
                {n.private && <p>{n.private.personName} / {n.private.personEmail}</p>}
                {n.private && <p>待ち合わせ場所: {n.private.privateAddress}</p>}
                {n.private?.privateDestination && <p>行き先: {n.private.privateDestination}</p>}
                <p>応募: {(offersByNeed.get(n.id) || []).length}件</p>
                <button className="btn btn--primary" onClick={() => { setMatched(false); setSelectedNeedId(n.id); }}>
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
                <h3>{o.supporterName} <StatusBadge map={OFFER_STATUS} status={o.status} /></h3>
                <p>{o.supporterEmail}</p>
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
          <p className="step-indicator">マッチングの確認</p>
          <h2>内容をご確認ください</h2>
          <InfoRow name="日時">{formatDateJa(selectedNeed.date)} {selectedNeed.startTime}〜{selectedNeed.endTime}</InfoRow>
          <InfoRow name="利用者">{selectedNeed.private?.personName} / {selectedNeed.private?.personEmail}</InfoRow>
          <InfoRow name="待ち合わせ場所">{selectedNeed.private?.privateAddress}</InfoRow>
          {selectedNeed.private?.privateDestination && <InfoRow name="行き先">{selectedNeed.private.privateDestination}</InfoRow>}
          {selectedNeed.publicDistance && <InfoRow name="移動距離">{selectedNeed.publicDistance}</InfoRow>}
          {selectedNeed.supportPoints?.length > 0 && (
            <InfoRow name="サポートのポイント">
              {resolveSupportPoints(selectedNeed.supportPoints).map((p) => p.request).join(' / ')}
            </InfoRow>
          )}
          <InfoRow name="サポーター">{selectedOffer.supporterName} / {selectedOffer.supporterEmail}</InfoRow>
          <div className="field-card">
            <label>
              サポーターへ伝える補足(任意)
              <textarea className="input" value={supplementNote} onChange={(e) => setSupplementNote(e.target.value)} />
            </label>
          </div>
          <div className="step-nav">
            <button className="btn btn--secondary" onClick={() => setSelectedOfferId(null)}>応募一覧に戻る</button>
            <button className="btn btn--primary" disabled={submitting} onClick={handleMatch}>
              {submitting ? '処理中...' : 'マッチング成立'}
            </button>
          </div>
        </div>
      )}

      <EmergencyContactFooter />
    </>
  );
}

export default function AdminPage() {
  return (
    <div className="page">
      <LoginGate redirectPath="/admin" title="結び 管理者ログイン">
        <AdminHome />
      </LoginGate>
    </div>
  );
}
