export type Role = "leader" | "guesser" | "host" | "spectator";

export type Moment =
  | "awaiting-clue"
  | "clue-given"
  | "urgency"
  | "reveal-burst"
  | "ended";

/** Compact tag for the last log event, used to pick reactive phrases. */
export type CapsuleLastEvent =
  | { kind: "clue" }
  | { kind: "hit-own" }
  | { kind: "hit-wrong" }
  | { kind: "hit-neutral" }
  | { kind: "assassin" }
  | { kind: "turn-end"; nextTeamName?: string }
  | { kind: "time-out" };

export interface CapsuleState {
  phase: "playing" | "ended" | "lobby" | "setup";
  gphase?: boolean;
  role: Role;
  isMyTurn: boolean;
  gameId: string;
  name?: string;
  clue?: string;
  count?: number;
  winnerName?: string;
  /** Optional explicit moment override (set by Headline / VoiceStrand). */
  moment?: Moment;
  /** Optional last log event, used for reactive phrases. */
  lastEvent?: CapsuleLastEvent;
}

/** The brand word, decorated with تشكيل (diacritics), for one-time headline render. */
export const CAPSULE_HEADLINE_TASHKEEL = "تَلْميحَة";

type PhraseSet = readonly string[];

const PHRASES = {
  // Existing buckets ----------------------------------------------------
  endedWinner: [
    "🏆 فاز فريق {winnerName}",
    "🎉 ختام موفّق — {winnerName} في الصدارة",
  ],
  endedAssassin: [
    "☠ اقترب القاتل — انتهت الجولة",
  ],
  leaderMyTurnPreClue: [
    "هذا دورك يا {name} · همِسة واحدة",
    "كلمة واحدة، يا قائد {name}، يكفي",
    "{name}، الفريق ينتظر تَلْميحَتك",
  ],
  leaderMyTurnPostClue: [
    "في انتظار الفريق…",
    "تنفّس — يخمّنون الآن",
  ],
  guesserMyTurnPostClue: [
    "{clue} · {count} · ما الذي يخطر ببالك؟",
    "اقرأ اللوحة بهدوء — {clue} · {count}",
  ],
  guesserOffTurn: [
    "تنفّس · سيلتقطها الفريق الآخر",
    "اشرب رشفة قهوة، الدور للفريق الآخر",
  ],
  spectator: [
    "👁 تشاهد — انتظر الجولة القادمة",
  ],
  hostLeaderPhase: [
    "مرّر الجهاز إلى القائد",
  ],
  hostGuessPhase: [
    "الفريق يخمّن — راقب اللوحة",
  ],
  fallback: [
    "في انتظار الجولة…",
  ],
  // New moment-aware buckets -------------------------------------------
  reactPraise: [
    "إصابة موفّقة!",
    "أحسنتم — كلمة وقعت في محلّها",
    "تلميحة سديدة، إصابة موفّقة",
  ],
  reactPity: [
    "ليس هذا اللون…",
    "كادت تكون لنا",
    "ابتعدنا قليلاً عن المراد",
  ],
  reactNeutral: [
    "كلمة محايدة… كاد القلب يقفز",
    "محايدة — نفَس عميق",
  ],
  reactAssassin: [
    "وقع القاتل. النهاية.",
    "☠ القاتل — سقطت الكلمة الخاطئة",
  ],
  reactHandoff: [
    "الكلمة الآن لـ{nextTeamName}",
    "دور {nextTeamName} — صمت قبل الهمسة",
  ],
  reactTimeOut: [
    "انتهى الوقت — الدور للآخرين",
    "ضاق الوقت قبل التلميحة",
  ],
  urgencyTension: [
    "الوقت يضيق…",
    "الوقت يضيق — ثوانٍ قليلة قبل الصمت",
    "ضاق الوقت — اختر",
  ],
} as const satisfies Record<string, PhraseSet>;

type Bucket = keyof typeof PHRASES;

function bucketFor(s: CapsuleState): Bucket {
  // 1. Ended state always wins.
  if (s.phase === "ended") {
    return s.winnerName ? "endedWinner" : "endedAssassin";
  }

  // 2. Reactive phrases — last log event takes priority over moment/role.
  if (s.lastEvent) {
    switch (s.lastEvent.kind) {
      case "hit-own":      return "reactPraise";
      case "hit-wrong":    return "reactPity";
      case "hit-neutral":  return "reactNeutral";
      case "assassin":     return "reactAssassin";
      case "turn-end":     return "reactHandoff";
      case "time-out":     return "reactTimeOut";
      // clue: fall through to role-based buckets below
    }
  }

  // 3. Urgency overlay overrides role buckets when set.
  if (s.moment === "urgency") return "urgencyTension";

  // 4. Existing role/phase buckets (unchanged behavior).
  if (s.role === "spectator") return "spectator";
  if (s.role === "host") return s.gphase ? "hostGuessPhase" : "hostLeaderPhase";
  if (s.role === "leader" && s.isMyTurn) {
    return s.gphase ? "leaderMyTurnPostClue" : "leaderMyTurnPreClue";
  }
  if (s.role === "guesser" && s.isMyTurn && s.gphase) {
    return "guesserMyTurnPostClue";
  }
  if (!s.isMyTurn) return "guesserOffTurn";
  return "fallback";
}

/** djb2: small fast 32-bit deterministic hash. */
function djb2(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

function interpolate(template: string, s: CapsuleState): string {
  const nextTeamName =
    s.lastEvent && s.lastEvent.kind === "turn-end"
      ? (s.lastEvent.nextTeamName ?? "")
      : "";
  return template
    .replace(/\{name\}/g, s.name ?? "")
    .replace(/\{clue\}/g, s.clue ?? "")
    .replace(/\{count\}/g, s.count != null ? String(s.count) : "")
    .replace(/\{winnerName\}/g, s.winnerName ?? "")
    .replace(/\{nextTeamName\}/g, nextTeamName);
}

export function resolveCapsulePhrase(s: CapsuleState): string {
  const bucket = bucketFor(s);
  const set = PHRASES[bucket];
  const idx = djb2(`${bucket}::${s.gameId}`) % set.length;
  return interpolate(set[idx]!, s);
}
