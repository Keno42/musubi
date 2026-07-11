// おねがいカードの「手伝って欲しいこと」チェック項目。
//
// 原則:
// - 診断名ではなく「場面 → してほしい対処」で書く(厚生労働省「認知症の人の
//   日常生活・社会生活における意思決定支援ガイドライン」(平成30年6月)の考え方)。
//   本人が画面を見ても尊厳が傷つかない文言にする。
// - チェック=行動指示: チェックした項目はそのままカードに表示され、サポーター
//   応募時のセルフチェック設問(selfCheck)に1対1で変換される。
//   自由記述に可否判断を依存させない。
// - Firestoreには id の配列(needsPublic.supportPoints)として保存する。
//   固定語彙なので自由記述より漏えいリスクが低く、公開分類。

export const SUPPORT_CATEGORIES = [
  '地域活動への外出',
  '買い物などの生活外出',
  '通院などの外出',
  'その他',
];

// scene: null = 全カテゴリ共通。それ以外は SUPPORT_CATEGORIES の値。
export const SUPPORT_POINTS = [
  { id: 'C1', scene: null, situation: '同じ話や質問を繰り返すことがある', request: 'そのたびに初めてのように聞いてほしい', selfCheck: '同じ質問に、何度でも穏やかに答えられます' },
  { id: 'C2', scene: null, situation: '予定や行き先をすぐ忘れることがある', request: 'その都度やさしく伝え直してほしい', selfCheck: '予定や行き先を、その都度やさしく伝え直せます' },
  { id: 'C3', scene: null, situation: '一人で歩いて行ってしまうことがある', request: '常に視界に入れていてほしい', selfCheck: 'レジや電話の間も、常に目を離さずにいられます' },
  { id: 'C5', scene: null, situation: '思い通りにならないと強い口調になることがある', request: '正さず、いったん本人に合わせてほしい', selfCheck: '強い口調で言われても、正さずに本人に合わせられます' },
  { id: 'C6', scene: null, situation: '耳が聞こえにくい', request: '正面から、ゆっくりはっきり話してほしい', selfCheck: '正面から、ゆっくりはっきり話せます' },
  { id: 'X1', scene: null, situation: 'むずかしい話がにがてなことがある', request: 'やさしい言葉で、ひとつずつ話してほしい', selfCheck: 'やさしい言葉で、ひとつずつ説明できます' },
  { id: 'C9', scene: null, situation: '疲れやすい', request: 'こまめに座って休憩したい', selfCheck: '本人のペースで、こまめに休憩を取れます' },
  { id: 'C10', scene: null, situation: '足元が不安定なことがある', request: '段差や坂で声をかけてほしい', selfCheck: '段差や坂で、先に気づいて声をかけられます' },
  { id: 'C11', scene: null, situation: '車いすを使っている', request: '押す手伝いをしてほしい', selfCheck: '車いすを、あわてず慎重に押せます' },

  { id: 'E1', scene: '地域活動への外出', situation: '輪に入るきっかけをつくるのが苦手', request: '最初にまわりの人へ紹介してほしい', selfCheck: '初対面の人に、本人を自然に紹介できます' },
  { id: 'E2', scene: '地域活動への外出', situation: '人混みや大きな音で疲れやすい', request: '静かな席を選んでほしい', selfCheck: '静かな席を選び、早めに休ませる判断ができます' },
  { id: 'E4', scene: '地域活動への外出', situation: '途中で帰りたくなることがある', request: '無理に引き留めず、一緒に帰ってほしい', selfCheck: '「帰りたい」に、無理に引き留めず付き合えます' },

  { id: 'S1', scene: '買い物などの生活外出', situation: 'レジや小銭の計算で焦ってしまう', request: '急かさず、店員さんとの間に立ってほしい', selfCheck: 'レジで急かさず、店員さんとの間に立てます' },
  { id: 'S2', scene: '買い物などの生活外出', situation: '同じものを何度も買おうとすることがある', request: '「おうちにありましたよ」とやんわり伝えてほしい', selfCheck: '「おうちにありましたよ」とやんわり伝えられます' },

  { id: 'H1', scene: '通院などの外出', situation: '受付や会計の手順がわからなくなる', request: '窓口まで案内して、隣で見守ってほしい', selfCheck: '受付や会計の窓口まで案内し、隣で見守れます' },
  { id: 'H4', scene: '通院などの外出', situation: '待ち時間に不安になる', request: 'そばで話し相手になってほしい', selfCheck: '待ち時間に、そばで話し相手になれます' },
];

// 安全に関わる項目。セルフチェックで最優先に出す。
const SAFETY_IDS = ['C3', 'C5'];

export function pointsForCategory(category) {
  return SUPPORT_POINTS.filter((p) => p.scene === null || p.scene === category);
}

export function resolveSupportPoints(ids) {
  if (!ids || ids.length === 0) return [];
  return SUPPORT_POINTS.filter((p) => ids.includes(p.id));
}

// 応募前セルフチェック: 安全系を優先して最大3問(それ以上はカード本文で読ませる)
export function selfCheckItems(ids) {
  const points = resolveSupportPoints(ids);
  const safety = points.filter((p) => SAFETY_IDS.includes(p.id));
  const rest = points.filter((p) => !SAFETY_IDS.includes(p.id));
  return [...safety, ...rest].slice(0, 3);
}
