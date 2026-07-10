import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

function ReenterEmailForm({ onSubmit, error }) {
  const [email, setEmail] = useState('');
  return (
    <div className="card login-gate">
      <h2>メールアドレスの確認</h2>
      <p>確認のため、ログインリンクを受け取ったメールアドレスをもう一度入力してください。</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email);
        }}
      >
        <label>
          メールアドレス
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <button type="submit" className="btn btn--primary">ログインする</button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default function LoginGate({ redirectPath, title, children }) {
  const { user, loading, linkStatus, linkError, completeLinkSignIn, sendLoginLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Returning from the email link: never flash the login form.
  if (linkStatus === 'processing') {
    return (
      <div className="card login-gate">
        <h2>ログインしています</h2>
        <p>お待ちください…</p>
      </div>
    );
  }

  if (linkStatus === 'need-email') {
    return <ReenterEmailForm onSubmit={completeLinkSignIn} error={linkError} />;
  }

  if (loading) return <p>読み込み中...</p>;

  if (user) return children;

  if (sent) {
    return (
      <div className="card login-gate">
        <h2>メールを送信しました</h2>
        <p>ログイン用のリンクをメールで送信しました。</p>
        <p>メール内のリンクを開くとログインが完了します。</p>
      </div>
    );
  }

  // linkStatus 'error' (期限切れ・使用済みリンク) はこのフォームで送り直す
  return (
    <div className="card login-gate">
      <h2>{title || 'ログイン'}</h2>
      {linkStatus === 'error' && <p className="error-text">{linkError}</p>}
      <p>メールアドレスを入力すると、ログイン用リンクが送信されます。</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await sendLoginLink(email, redirectPath);
            setSent(true);
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <label>
          メールアドレス
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <button type="submit" className="btn btn--primary">ログインリンクを送信</button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
