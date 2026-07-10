import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import LoginGate from '../../components/LoginGate';
import NoticeGate from '../../components/NoticeGate';
import EmergencyContactFooter from '../../components/EmergencyContactFooter';
import { formatDateJa } from '../../lib/format';
import {
  fetchOpenNeeds,
  createOffer,
  fetchMyOffers,
  fetchMatchingByOfferId,
  fetchMatchDetails,
} from '../../lib/firestore';

function NeedCard({ need, onApply }) {
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ supporterName: '', supporterEmail: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="card done-card">
        <p className="done-card__mark">✓</p>
        <h2>応募を受け付けました(試作)</h2>
        <p>管理者が内容を確認し、マッチングを承認します。</p>
        <p>本番では、マッチング成立後にメールで通知されます。</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>{formatDateJa(need.date)} {need.startTime}〜{need.endTime}</h3>
      <p>{need.publicArea}</p>
      <p><span className="badge">{need.supportCategory}</span></p>
      {need.publicSummary && <p>{need.publicSummary}</p>}

      {!applying ? (
        <button className="btn btn--primary btn--large" onClick={() => setApplying(true)}>
          このおねがいを手伝う
        </button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            await onApply(need.id, form);
            setSubmitting(false);
            setDone(true);
          }}
        >
          <div className="field-card">
            <label>
              お名前
              <input type="text" required className="input" value={form.supporterName}
                onChange={(e) => setForm((f) => ({ ...f, supporterName: e.target.value }))} />
            </label>
          </div>
          <div className="field-card">
            <label>
              メールアドレス
              <input type="email" required className="input" value={form.supporterEmail}
                onChange={(e) => setForm((f) => ({ ...f, supporterEmail: e.target.value }))} />
            </label>
          </div>
          <div className="field-card">
            <label>
              メッセージ(任意)
              <textarea className="input" value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            </label>
          </div>
          <div className="step-nav">
            <button type="button" className="btn btn--secondary" onClick={() => setApplying(false)}>やめる</button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? '送信中...' : '応募する'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MyOfferStatus({ offer }) {
  const [matching, setMatching] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    (async () => {
      const m = await fetchMatchingByOfferId(offer.id);
      setMatching(m);
      if (m) setDetails(await fetchMatchDetails(m.id));
    })();
  }, [offer.id]);

  if (matching) {
    return (
      <li className="card">
        <p><span className="badge">マッチング成立</span></p>
        <p>本番では、登録されたメールアドレス宛に詳細が送信されます。この試作では、画面上で確定情報を確認できます。</p>
        {details && (
          <div className="matched-details">
            <p>詳細住所: {details.confirmedAddress}</p>
            {details.supplementNote && <p>補足: {details.supplementNote}</p>}
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="card">
      <p><span className="badge badge--muted">確認待ち</span></p>
      <p>応募を受け付けました。管理者が内容を確認しています。</p>
    </li>
  );
}

function SupporterHome() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [myOffers, setMyOffers] = useState([]);

  async function reload() {
    setNeeds(await fetchOpenNeeds());
    setMyOffers(await fetchMyOffers(user.uid));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApply(needId, form) {
    await createOffer(user.uid, needId, form);
    setMyOffers(await fetchMyOffers(user.uid));
  }

  return (
    <>
      <h2>募集中のおねがい</h2>
      {needs.length === 0 && <p>現在募集中のおねがいはありません。</p>}
      {needs.map((n) => (
        <NeedCard key={n.id} need={n} onApply={handleApply} />
      ))}

      {myOffers.length > 0 && (
        <>
          <h2>あなたの応募状況</h2>
          <ul className="status-list">
            {myOffers.map((o) => (
              <MyOfferStatus key={o.id} offer={o} />
            ))}
          </ul>
        </>
      )}

      <EmergencyContactFooter />
    </>
  );
}

export default function SupporterPage() {
  return (
    <div className="page">
      <LoginGate redirectPath="/supporter" title="結び サポーターログイン">
        <NoticeGate
          storageKey="musubi.notice.supporter"
          lines={[
            'サポーターは、地域での外出や参加を支えるための付き添い・見守りを行います。',
            '医療行為、身体介助、服薬管理、金銭管理、契約行為、緊急時の単独判断は行いません。',
            '困った場合は、必ず管理者または画面下部の緊急問い合わせ先に連絡してください。',
            'マッチング成立前は、利用者の氏名、詳細住所、連絡先、具体的な目的地は表示されません。',
            'この画面は検討用の試作版です。実在する個人情報は入力しないでください。',
          ]}
        >
          <SupporterHome />
        </NoticeGate>
      </LoginGate>
    </div>
  );
}
