import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import LoginGate from '../../components/LoginGate';
import NoticeGate from '../../components/NoticeGate';
import EmergencyContactFooter from '../../components/EmergencyContactFooter';
import NeedPublicCard from '../../components/NeedPublicCard';
import { formatDateJa } from '../../lib/format';
import { selfCheckItems, resolveSupportPoints } from '../../lib/supportPoints';
import {
  fetchOpenNeeds,
  createOffer,
  fetchMyOffers,
  fetchMatchingByOfferId,
  fetchMatchDetails,
  fetchNeedPublic,
} from '../../lib/firestore';

function NeedCard({ need, applied, onApply }) {
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ supporterName: '', supporterEmail: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // 応募前セルフチェック(サポートのポイントから自動生成・最大3問・安全系優先)。
  // 全問チェックするまで応募ボタンは押せない。
  const checks = selfCheckItems(need.supportPoints);
  const [confirmed, setConfirmed] = useState(() => new Set());

  function toggleConfirm(id) {
    setConfirmed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allConfirmed = confirmed.size >= checks.length;

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
    <NeedPublicCard need={need}>
      {applied ? (
        <button className="btn btn--primary btn--large" disabled>
          応募済み
        </button>
      ) : !applying ? (
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
          {checks.length > 0 && (
            <div className="field-card">
              <p className="field-name">応募の前に、できることを確認してください</p>
              {checks.map((c) => (
                <label key={c.id} className="radio-line">
                  <input
                    type="checkbox"
                    checked={confirmed.has(c.id)}
                    onChange={() => toggleConfirm(c.id)}
                  />
                  {c.selfCheck}
                </label>
              ))}
            </div>
          )}
          <div className="step-nav">
            <button type="button" className="btn btn--secondary" onClick={() => setApplying(false)}>やめる</button>
            <button type="submit" className="btn btn--primary" disabled={submitting || !allConfirmed}>
              {submitting ? '送信中...' : allConfirmed ? '応募する' : 'すべて確認すると応募できます'}
            </button>
          </div>
        </form>
      )}
    </NeedPublicCard>
  );
}

function MyOfferStatus({ offer }) {
  const [matching, setMatching] = useState(null);
  const [details, setDetails] = useState(null);
  const [need, setNeed] = useState(null);

  useEffect(() => {
    (async () => {
      setNeed(await fetchNeedPublic(offer.needId));
      const m = await fetchMatchingByOfferId(offer.id);
      setMatching(m);
      if (m) setDetails(await fetchMatchDetails(m.id));
    })();
  }, [offer.id, offer.needId]);

  // どの「おねがい」への応募かが分かるよう、成立前後とも日時を必ず見せる
  const heading = need && (
    <h3>{formatDateJa(need.date)} {need.startTime}〜{need.endTime}</h3>
  );

  if (matching) {
    return (
      <li className="card">
        {heading}
        <p><span className="badge">マッチング成立</span></p>
        <p>本番では、登録されたメールアドレス宛に詳細が送信されます。この試作では、画面上で確定情報を確認できます。</p>
        {details && (
          <div className="matched-details">
            {details.personName && <p>当人のお名前: {details.personName}</p>}
            <p>待ち合わせ場所: {details.confirmedAddress}</p>
            {details.confirmedDestination && <p>行き先: {details.confirmedDestination}</p>}
            {need?.publicSummary && <p>本人から一言: 「{need.publicSummary}」</p>}
            {resolveSupportPoints(need?.supportPoints).map((p) => (
              <p key={p.id}>・{p.situation} → {p.request}</p>
            ))}
            {details.supplementNote && <p>補足: {details.supplementNote}</p>}
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="card">
      {heading}
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

  const appliedNeedIds = new Set(myOffers.map((o) => o.needId));

  return (
    <>
      <h2>募集中のおねがい</h2>
      {needs.length === 0 && <p>現在募集中のおねがいはありません。</p>}
      {needs.map((n) => (
        <NeedCard key={n.id} need={n} applied={appliedNeedIds.has(n.id)} onApply={handleApply} />
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
