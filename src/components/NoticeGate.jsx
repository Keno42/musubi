import { useState } from 'react';
import EmergencyContactFooter from './EmergencyContactFooter';

export default function NoticeGate({ storageKey, lines, children }) {
  const [confirmed, setConfirmed] = useState(
    () => window.sessionStorage.getItem(storageKey) === 'true'
  );

  if (confirmed) return children;

  return (
    <>
      <div className="notice-gate">
        <h2>ご利用の注意</h2>
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
      <EmergencyContactFooter />
    </>
  );
}
