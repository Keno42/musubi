import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import LoginGate from '../../components/LoginGate';
import NoticeGate from '../../components/NoticeGate';
import EmergencyContactFooter from '../../components/EmergencyContactFooter';
import { createNeed, fetchMyNeeds } from '../../lib/firestore';
import { formatDateJa } from '../../lib/format';

const SUPPORT_CATEGORIES = [
  '地域活動への外出',
  '買い物などの生活外出',
  '通院などの外出',
  'その他',
];

const STATUS_LABEL = {
  open: 'おねがいを受け付けました。現在、サポーターからの応募または管理者の確認を待っています。',
  matched: 'マッチングが成立しました。本番では、登録されたメールアドレス宛に詳細が送信されます。この試作では、画面上で成立状態のみ表示しています。',
};

const TOTAL_STEPS = 4;

// 15分きざみ・外出に現実的な時間帯(6:00〜22:00)。
// スマートフォンでは数字入力よりも選択式のほうが確実に操作できる。
const TIME_OPTIONS = (() => {
  const list = [];
  for (let h = 6; h < 22; h++) {
    for (const m of [0, 15, 30, 45]) {
      list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  list.push('22:00');
  return list;
})();

function TimeSelect({ value, onChange }) {
  return (
    <select className="input" value={value} onChange={onChange} required>
      <option value="">選んでください</option>
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

// toISOString は UTC 基準で日本時間の朝 9 時前に前日を返すため、ローカル日付で組み立てる
function toDateString(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayDate() {
  return toDateString(new Date());
}

function maxDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return toDateString(d);
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

function StepCard({ step, title, children }) {
  return (
    <div className="card">
      <p className="step-indicator">おねがいの登録 — ステップ {step} / {TOTAL_STEPS}</p>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function RegisterForm({ uid, onDone, onCancel }) {
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
      onDone();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (step === 1) {
    // iOS の日付ピッカーは min/max を強制しないため、ここでも範囲を確認する
    const dateOutOfRange = form.date && (form.date < todayDate() || form.date > maxDate());
    return (
      <StepCard step={1} title="付き添い希望の日時">
        <div className="field-card">
          <label>
            希望日(今日から14日先まで)
            <input type="date" min={todayDate()} max={maxDate()} value={form.date} onChange={set('date')} className="input" required />
          </label>
          {dateOutOfRange && <p className="error-text">今日から14日先までの日付を選んでください。</p>}
        </div>
        <div className="time-row">
          <div className="field-card">
            <label>
              開始時刻
              <TimeSelect value={form.startTime} onChange={set('startTime')} />
            </label>
          </div>
          <div className="field-card">
            <label>
              終了時刻
              <TimeSelect value={form.endTime} onChange={set('endTime')} />
            </label>
          </div>
        </div>
        <div className="step-nav">
          <button className="btn btn--secondary" onClick={onCancel}>やめる</button>
          <button className="btn btn--primary" disabled={!form.date || dateOutOfRange || !form.startTime || !form.endTime} onClick={() => setStep(2)}>次へ</button>
        </div>
      </StepCard>
    );
  }

  if (step === 2) {
    return (
      <StepCard step={2} title="どんな外出ですか?">
        <div className="field-card">
          {SUPPORT_CATEGORIES.map((c) => (
            <label key={c} className="radio-line">
              <input type="radio" name="supportCategory" value={c} checked={form.supportCategory === c} onChange={set('supportCategory')} />
              {c}
            </label>
          ))}
        </div>
        <div className="field-card">
          <label>
            付き添いに関する補足(管理者確認用)
            <textarea value={form.publicSummary} onChange={set('publicSummary')} className="input" />
          </label>
        </div>
        <div className="step-nav">
          <button className="btn btn--secondary" onClick={() => setStep(1)}>戻る</button>
          <button className="btn btn--primary" onClick={() => setStep(3)}>次へ</button>
        </div>
      </StepCard>
    );
  }

  if (step === 3) {
    return (
      <StepCard step={3} title="大まかなエリア">
        <div className="field-card">
          <label>
            例: 西大井3丁目付近(サポーターに表示されます)
            <input type="text" value={form.publicArea} onChange={set('publicArea')} className="input" required />
          </label>
        </div>
        <div className="step-nav">
          <button className="btn btn--secondary" onClick={() => setStep(2)}>戻る</button>
          <button className="btn btn--primary" disabled={!form.publicArea} onClick={() => setStep(4)}>次へ</button>
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard step={4} title="詳細情報(管理者のみ閲覧)">
      <div className="field-card">
        <label>
          詳細住所
          <input type="text" value={form.privateAddress} onChange={set('privateAddress')} className="input" required />
        </label>
      </div>
      <div className="field-card">
        <label>
          当人の名前
          <input type="text" value={form.personName} onChange={set('personName')} className="input" required />
        </label>
      </div>
      <div className="field-card">
        <label>
          連絡先メールアドレス
          <input type="email" value={form.personEmail} onChange={set('personEmail')} className="input" required />
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="step-nav">
        <button className="btn btn--secondary" onClick={() => setStep(3)}>戻る</button>
        <button
          className="btn btn--primary"
          disabled={submitting || !form.privateAddress || !form.personName || !form.personEmail}
          onClick={submit}
        >
          {submitting ? '登録中...' : '登録する'}
        </button>
      </div>
    </StepCard>
  );
}

function DoneCard({ onRegisterAnother, onBackToList }) {
  return (
    <div className="card done-card">
      <p className="done-card__mark">✓</p>
      <h2>おねがいを登録しました</h2>
      <p>サポーターからの応募と、管理者の確認をお待ちください。</p>
      <p>マッチングが成立すると、この画面で確認できます。</p>
      <div className="step-nav step-nav--stack">
        <button className="btn btn--primary" onClick={onRegisterAnother}>続けて登録する</button>
        <button className="btn btn--secondary" onClick={onBackToList}>登録状況を見る</button>
      </div>
    </div>
  );
}

function MyNeedsList({ needs }) {
  if (needs.length === 0) return null;
  return (
    <div className="card">
      <h2>登録したおねがい</h2>
      <ul className="status-list">
        {needs.map((n) => (
          <li key={n.id}>
            <h3>{formatDateJa(n.date)} {n.startTime}〜{n.endTime}</h3>
            <p><span className="badge">{n.supportCategory}</span></p>
            <p className="status-line">{STATUS_LABEL[n.status] || n.status}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserHome() {
  const { user } = useAuth();
  const [view, setView] = useState('home'); // 'home' | 'form' | 'done'
  const [needs, setNeeds] = useState([]);

  async function reload() {
    setNeeds(await fetchMyNeeds(user.uid));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {view === 'form' && (
        <RegisterForm
          uid={user.uid}
          onDone={() => { setView('done'); reload(); }}
          onCancel={() => setView('home')}
        />
      )}

      {view === 'done' && (
        <DoneCard
          onRegisterAnother={() => setView('form')}
          onBackToList={() => setView('home')}
        />
      )}

      {view === 'home' && (
        <>
          <button className="btn btn--primary btn--large" onClick={() => setView('form')}>
            おねがいを登録する
          </button>
          <MyNeedsList needs={needs} />
        </>
      )}

      <EmergencyContactFooter />
    </>
  );
}

export default function UserPage() {
  return (
    <div className="page">
      <LoginGate redirectPath="/user" title="結び 利用者ログイン">
        <NoticeGate
          storageKey="musubi.notice.user"
          lines={[
            'このサービスは、地域活動や外出に参加するための付き添い・見守りを調整するためのものです。',
            'サポーターに依頼できることは、外出中の付き添い・見守り・道案内・地域活動への参加補助です。',
            '医療行為、身体介助、服薬管理、金銭管理、契約行為、緊急時の単独対応をサポーターに依頼することはできません。',
            '困ったときは、画面下部の緊急問い合わせ先に連絡してください。',
            'この画面は検討用の試作版です。データは保存されますが、実在する利用者の個人情報・詳細住所・緊急性のある情報は入力しないでください。',
          ]}
        >
          <UserHome />
        </NoticeGate>
      </LoginGate>
    </div>
  );
}
