import { useState } from 'react';

export default function NoticeGate({ storageKey, title, lines, children }) {
  const [confirmed, setConfirmed] = useState(
    () => window.sessionStorage.getItem(storageKey) === 'true'
  );

  if (confirmed) return children;

  return (
    <div className="notice-gate">
      {title && <h2>{title}</h2>}
      {lines.map((line, i) => (
        <p key={i} className="notice-gate__line">{line}</p>
      ))}
      <button
        className="btn btn--primary"
        onClick={() => {
          window.sessionStorage.setItem(storageKey, 'true');
          setConfirmed(true);
        }}
      >
        確認しました
      </button>
    </div>
  );
}
