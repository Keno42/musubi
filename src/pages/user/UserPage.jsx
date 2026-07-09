import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import LoginGate from '../../components/LoginGate';
import NoticeGate from '../../components/NoticeGate';
import EmergencyContactFooter from '../../components/EmergencyContactFooter';
import { createNeed, fetchMyNeeds } from '../../lib/firestore';

const SUPPORT_CATEGORIES = [
  '地域活動への外出',
  '買い物などの生活外出',
  '通院などの外出',
  'その他',
];

const STATUS_LABEL = {
  open: 'ニーズを受け付けました。現在、サポーターからの応募または管理者確認を待っています。',
  matched: 'マッチングが成立しました。本番では、登録されたメールアドレス宛に詳細が送信されます。この試作では、画面上で成立状態のみ表示しています。',
};

function maxDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    date: '',
    startTime: '',
    endTime: '',
    supportCategory: SUPPORT_CATEGORIES[0],
    publicSummary: '',
    publicArea: '',
    privateAddress: '',
    personName: '',
    personEmail: '',
  };
}

function RegisterForm({ uid, onRegistered }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await createNeed(uid, form);
      setForm(emptyForm());
      setStep(1);
      onRegistered();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>ニーズを登録する</h2>

      {step === 1 && (
        <fieldset>
          <legend>希望日時</legend>
          <label>
            希望日
            <input type="date" min={todayDate()} max={maxDate()} value={form.date} onChange={set('date')} className="input" required />
          </label>
          <label>
            希望開始時刻
            <input type="time" value={form.startTime} onChange={set('startTime')} className="input" required />
          </label>
          <label>
            希望終了時刻
            <input type="time" value={form.endTime} onChange={set('endTime')} className="input" required />
          </label>
          <button className="btn btn--primary" disabled={!form.date || !form.startTime || !form.endTime} onClick={() => setStep(2)}>次へ</button>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset>
          <legend>支援カテゴリ</legend>
          {SUPPORT_CATEGORIES.map((c) => (
            <label key={c} className="radio-line">
              <input type="radio" name="supportCategory" value={c} checked={form.supportCategory === c} onChange={set('supportCategory')} />
              {c}
            </label>
          ))}
          <label>
            付き添いに関する補足(管理者確認用)
            <textarea value={form.publicSummary} onChange={set('publicSummary')} className="input" />
          </label>
          <button className="btn btn--secondary" onClick={() => setStep(1)}>戻る</button>
          <button className="btn btn--primary" onClick={() => setStep(3)}>次へ</button>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset>
          <legend>大まかなエリア</legend>
          <label>
            例: 西大井3丁目付近(サポーターに表示されます)
            <input type="text" value={form.publicArea} onChange={set('publicArea')} className="input" required />
          </label>
          <button className="btn btn--secondary" onClick={() => setStep(2)}>戻る</button>
          <button className="btn btn--primary" disabled={!form.publicArea} onClick={() => setStep(4)}>次へ</button>
        </fieldset>
      )}

      {step === 4 && (
        <fieldset>
          <legend>詳細情報(管理者のみ閲覧)</legend>
          <label>
            詳細住所
            <input type="text" value={form.privateAddress} onChange={set('privateAddress')} className="input" required />
          </label>
          <label>
            当人の名前
            <input type="text" value={form.personName} onChange={set('personName')} className="input" required />
          </label>
          <label>
            連絡先メールアドレス
            <input type="email" value={form.personEmail} onChange={set('personEmail')} className="input" required />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn--secondary" onClick={() => setStep(3)}>戻る</button>
          <button
            className="btn btn--primary"
            disabled={submitting || !form.privateAddress || !form.personName || !form.personEmail}
            onClick={submit}
          >
            {submitting ? '登録中...' : '登録する'}
          </button>
        </fieldset>
      )}
    </div>
  );
}

function MyNeedsList({ needs }) {
  if (needs.length === 0) return null;
  return (
    <div className="card">
      <h2>登録したニーズ</h2>
      <ul className="status-list">
        {needs.map((n) => (
          <li key={n.id}>
            <p>{n.date} {n.startTime}〜{n.endTime} / {n.supportCategory}</p>
            <p className="status-line">{STATUS_LABEL[n.status] || n.status}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserHome() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [loaded, setLoaded] = useState(false);

  async function reload() {
    const list = await fetchMyNeeds(user.uid);
    setNeeds(list);
    setLoaded(true);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <h1>利用者画面</h1>
      <RegisterForm uid={user.uid} onRegistered={reload} />
      {loaded && <MyNeedsList needs={needs} />}
      <EmergencyContactFooter />
    </div>
  );
}

export default function UserPage() {
  return (
    <LoginGate redirectPath="/user">
      <NoticeGate
        storageKey="musubi.notice.user"
        lines={[
          'このサービスは、地域活動や外出に参加するための付き添い・見守りを調整するためのものです。',
          'サポーターに依頼できることは、外出中の付き添い・見守り・道案内・地域活動への参加補助です。',
          '医療行為、身体介助、服薬管理、金銭管理、契約行為、緊急時の単独対応をサポーターに依頼することはできません。',
          '困ったときは、画面下部の緊急問い合わせ先に連絡してください。',
        ]}
      >
        <UserHome />
      </NoticeGate>
    </LoginGate>
  );
}
