import { formatDateJa } from '../lib/format';
import { resolveSupportPoints } from '../lib/supportPoints';

// サポーターの募集一覧と、利用者の登録前プレビュー(おねがいカード)の
// 両方で使う公開情報カード。ここに表示してよいのは needsPublic のフィールドだけ。
// 場所は丁目レベルの大まかな出発地・目的地まで(氏名・連絡先・正確な住所・施設名は不可)。
// 「本人から一言」は最上部に引用で表示する(支援対象ではなく一人の人として最初に見せる)。
export default function NeedPublicCard({ need, children }) {
  const points = resolveSupportPoints(need.supportPoints);
  return (
    <div className="card">
      {(need.date || need.startTime || need.endTime) && (
        <h3>{formatDateJa(need.date)} {need.startTime}〜{need.endTime}</h3>
      )}
      {need.publicSummary && <p>「{need.publicSummary}」</p>}
      <p><span className="badge">{need.supportCategory}</span></p>
      {need.publicArea && <p>エリア: {need.publicArea}</p>}
      {need.publicDistance && <p>移動距離: {need.publicDistance}</p>}
      {points.length > 0 && (
        <>
          <p>サポートのポイント:</p>
          {points.map((p) => (
            <p key={p.id}>・{p.situation} → {p.request}</p>
          ))}
        </>
      )}
      {children}
    </div>
  );
}
