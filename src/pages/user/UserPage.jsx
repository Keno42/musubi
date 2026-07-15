import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import LoginGate from '../../components/LoginGate';
import NoticeGate from '../../components/NoticeGate';
import EmergencyContactFooter from '../../components/EmergencyContactFooter';
import NeedPublicCard from '../../components/NeedPublicCard';
import { createNeed, fetchMyNeeds } from '../../lib/firestore';
import { formatDateJa } from '../../lib/format';
import { SUPPORT_CATEGORIES, pointsForCategory } from '../../lib/supportPoints';

// おおよその移動距離はサポーターの応募判断に必要(関係者フィードバック 2026-07-11)。
// 目的地を特定しない粒度に限る。実際の行き先は needsPrivate 側のみ。
// 「徒歩で」と書かない: 自走の車いすなど、歩かない移動の人を締め出さない表現にする。
const DISTANCE_OPTIONS = [
  '移動はほとんどありません',
  '近くまで(10分ほどの移動)',
  '少し遠くまで(30分ほどの移動)',
  'バス・電車・車などを使います',
];

const STATUS_LABEL = {
  open: 'おねがいを受け付けました。現在、サポーターからの応募または管理者の確認を待っています。',
  matched: 'マッチングが成立しました。本番では、登録されたメールアドレス宛に詳細が送信されます。この試作では、画面上で成立状態のみ表示しています。',
};

const TOTAL_STEPS = 5;

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

// 今日から14日先までの選択肢。ネイティブの日付入力は iOS で端末言語の英語表記・
// 独自サイズ・範囲外選択が起きるため、時刻と同じ選択式にする。
function dateOptions() {
  const list = [];
  const d = new Date();
  for (let i = 0; i <= 14; i++) {
    list.push(toDateString(d));
    d.setDate(d.getDate() + 1);
  }
  return list;
}

function emptyForm() {
  return {
    date: '',
    startTime: '',
    endTime: '',
    supportCategory: SUPPORT_CATEGORIES[0],
    publicDistance: '',
    supportPoints: [],
    publicSummary: '',
    publicArea: '',
    privateAddress: '',
    privateDestination: '',
    personName: '',
    personEmail: '',
  };
}

function StepCard({ step, title, audience, children }) {
  return (
    <div className="card">
      <p className="step-indicator">おねがいの登録 — ステップ {step} / {TOTAL_STEPS}</p>
      <h2>{title}</h2>
      {audience && <p className="step-audience">{audience}</p>}
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

  function togglePoint(id) {
    setForm((f) => ({
      ...f,
      supportPoints: f.supportPoints.includes(id)
        ? f.supportPoints.filter((p) => p !== id)
        : [...f.supportPoints, id],
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // カテゴリを変えた場合に、非表示になったシーン専用項目が残らないようにする
      const visible = pointsForCategory(form.supportCategory).map((p) => p.id);
      await createNeed(uid, {
        ...form,
        supportPoints: form.supportPoints.filter((id) => visible.includes(id)),
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (step === 1) {
    return (
      <StepCard step={1} title="付き添い希望の日時" audience="サポーターのみなさんに公開されます">
        <p>サポーターのみなさんに見せる「おねがいカード」を作ります。お名前や正確な場所は、カードには載りません。</p>
        <div className="field-card">
          <label>
            希望日(今日から14日先まで)
            <select className="input" value={form.date} onChange={set('date')} required>
              <option value="">選んでください</option>
              {dateOptions().map((d) => (
                <option key={d} value={d}>{formatDateJa(d)}</option>
              ))}
            </select>
          </label>
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
          <button className="btn btn--primary" disabled={!form.date || !form.startTime || !form.endTime} onClick={() => setStep(2)}>次へ</button>
        </div>
      </StepCard>
    );
  }

  if (step === 2) {
    return (
      <StepCard step={2} title="どんな外出ですか?" audience="サポーターのみなさんに公開されます">
        <div className="field-card">
          {SUPPORT_CATEGORIES.map((c) => (
            <label key={c} className="radio-line">
              <input type="radio" name="supportCategory" value={c} checked={form.supportCategory === c} onChange={set('supportCategory')} />
              {c}
            </label>
          ))}
        </div>
        <div className="field-card">
          <p className="field-name">どのくらい移動しますか?</p>
          {DISTANCE_OPTIONS.map((d) => (
            <label key={d} className="radio-line">
              <input type="radio" name="publicDistance" value={d} checked={form.publicDistance === d} onChange={set('publicDistance')} />
              {d}
            </label>
          ))}
        </div>
        <div className="step-nav">
          <button className="btn btn--secondary" onClick={() => setStep(1)}>戻る</button>
          <button className="btn btn--primary" disabled={!form.publicDistance} onClick={() => setStep(3)}>次へ</button>
        </div>
      </StepCard>
    );
  }

  // ステップ3まででサポーターに公開される「おねがいカード」の内容が揃う。
  // カードの姿はステップ5のプレビューで確認できる。
  if (step === 3) {
    return (
      <StepCard step={3} title="おねがいカードの仕上げ" audience="サポーターのみなさんに公開されます">
        <div className="field-card">
          <label>
            大まかな出発地と目的地(例: 「西大井3丁目」や「西大井3丁目から2丁目」など)
            <input type="text" value={form.publicArea} onChange={set('publicArea')} className="input" required />
          </label>
        </div>
        <div className="field-card">
          <p className="field-name">手伝って欲しいこと(あてはまるものすべて)</p>
          {pointsForCategory(form.supportCategory).map((p) => (
            <label key={p.id} className="radio-line">
              <input
                type="checkbox"
                checked={form.supportPoints.includes(p.id)}
                onChange={() => togglePoint(p.id)}
              />
              {p.situation} → {p.request}
            </label>
          ))}
        </div>
        <div className="field-card">
          <label>
            本人から一言(任意。例: コーラスをやっていました。音楽の話ができたら嬉しいです)
            <textarea value={form.publicSummary} onChange={set('publicSummary')} className="input" />
          </label>
        </div>
        <p>お名前や正確な場所は、このあと別にお伺いします。カードには書かないでください。</p>
        <div className="step-nav">
          <button className="btn btn--secondary" onClick={() => setStep(2)}>戻る</button>
          <button
            className="btn btn--primary"
            disabled={!form.publicArea}
            onClick={() => setStep(4)}
          >
            次へ
          </button>
        </div>
      </StepCard>
    );
  }

  if (step === 4) {
    return (
      <StepCard step={4} title="当日のための詳細" audience="管理者と、当日の担当サポーターにだけお知らせします">
        <div className="field-card">
          <label>
            当人の名前
            <input type="text" value={form.personName} onChange={set('personName')} className="input" required />
          </label>
        </div>
        <div className="field-card">
          <label>
            待ち合わせ場所(例: 自宅の住所や、目印になる場所)
            <input type="text" value={form.privateAddress} onChange={set('privateAddress')} className="input" required />
          </label>
        </div>
        <div className="field-card">
          <label>
            行き先(例: ○○医院)
            <input type="text" value={form.privateDestination} onChange={set('privateDestination')} className="input" required />
          </label>
        </div>
        <div className="field-card">
          <label>
            連絡先メールアドレス
            <input type="email" value={form.personEmail} onChange={set('personEmail')} className="input" required />
          </label>
        </div>
        <div className="step-nav">
          <button className="btn btn--secondary" onClick={() => setStep(3)}>戻る</button>
          <button
            className="btn btn--primary"
            disabled={!form.personName || !form.privateAddress || !form.privateDestination || !form.personEmail}
            onClick={() => setStep(5)}
          >
            内容を確認
          </button>
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard step={5} title="内容の確認">
      <p>この「おねがいカード」が、サポーターのみなさんに公開されます。</p>
      <NeedPublicCard need={form} />
      <div className="field-card">
        <p className="field-name">管理者と、当日の担当サポーターにだけお知らせします</p>
        <p>当人の名前: {form.personName}</p>
        <p>待ち合わせ場所: {form.privateAddress}</p>
        <p>行き先: {form.privateDestination}</p>
        <p>連絡先: {form.personEmail}</p>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="step-nav">
        <button className="btn btn--secondary" onClick={() => setStep(4)}>戻る</button>
        <button className="btn btn--primary" disabled={submitting} onClick={submit}>
          {submitting ? '登録中...' : 'この内容で登録する'}
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
      <p>「おねがいカード」は、この内容でサポーターのみなさんに公開されています。</p>
      <ul className="status-list">
        {needs.map((n) => (
          <li key={n.id}>
            <NeedPublicCard need={n} />
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
