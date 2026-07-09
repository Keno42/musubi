import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function LoginGate({ redirectPath, children }) {
  const { user, loading, sendLoginLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return <p>読み込み中...</p>;

  if (user) return children;

  if (sent) {
    return (
      <div className="login-gate">
        <p>ログイン用のリンクをメールで送信しました。</p>
        <p>メール内のリンクを開くとログインが完了します。</p>
      </div>
    );
  }

  return (
    <div className="login-gate">
      <h2>ログイン</h2>
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
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
        <button type="submit" className="btn btn--primary">ログインリンクを送信</button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
