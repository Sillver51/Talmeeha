export type Role = "leader" | "guesser" | "host" | "spectator";

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
}

/** The brand word, decorated with تشكيل (diacritics), for one-time headline render. */
export const CAPSULE_HEADLINE_TASHKEEL = "تَلْميحَة";

type PhraseSet = readonly string[];

const PHRASES = {
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
} as const satisfies Record<string, PhraseSet>;

type Bucket = keyof typeof PHRASES;

function bucketFor(s: CapsuleState): Bucket {
  if (s.phase === "ended") {
    return s.winnerName ? "endedWinner" : "endedAssassin";
  }
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
  return template
    .replace(/\{name\}/g, s.name ?? "")
    .replace(/\{clue\}/g, s.clue ?? "")
    .replace(/\{count\}/g, s.count != null ? String(s.count) : "")
    .replace(/\{winnerName\}/g, s.winnerName ?? "");
}

export function resolveCapsulePhrase(s: CapsuleState): string {
  const bucket = bucketFor(s);
  const set = PHRASES[bucket];
  const idx = djb2(`${bucket}::${s.gameId}`) % set.length;
  return interpolate(set[idx]!, s);
}
