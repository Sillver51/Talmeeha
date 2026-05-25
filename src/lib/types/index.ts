export type Team = "red" | "blue";
export type CardType = Team | "neutral" | "assassin";
export type Phase = "lobby" | "setup" | "playing" | "ended";

/** A card type as seen by a viewer: real type, or "hidden" when the viewer may not see the key. */
export type VisibleCardType = CardType | "hidden";

/** A board card in a projected, per-viewer view. */
export interface ViewCard { w: string; t: VisibleCardType; rv: boolean; }

/** Public remaining (unrevealed) counts — safe to show everyone. */
export interface RemainingCounts { red: number; blue: number; neutral: number; }

/** What a single client receives: the room state with a role-filtered board + public counts. */
export interface PlayerView extends Omit<GameState, "board"> {
  board: ViewCard[];
  counts: RemainingCounts;
}

export interface Card { w: string; t: CardType; rv: boolean; }
export interface Player { id: string; name: string; team: Team | null; disconnected?: boolean; }
export interface Clue { w: string; n: number; }
export interface HostTeam { players: string[]; leader: string; gIdx: number; }

export interface GameState {
  code: string;
  phase: Phase;
  hostMode: boolean;
  hostSocketId?: string;
  board: Card[];
  turn: Team;
  clue: Clue | null;
  gleft: number;
  gphase: boolean;
  winner: Team | null;
  teams: Record<Team, string[]>;
  leaders: Record<Team, string | null>;
  teamNames: Record<Team, string>;
  players: Record<string, Player>;
  doubts: Record<number, string[]>;
  wins: Record<Team, number>;
  sRed: number;
  sBlue: number;
  log: string[];
  hRed?: HostTeam;
  hBlue?: HostTeam;
}

export interface Joined { code: string; myId: string; isHost: boolean; }

export interface CreateHostPayload {
  hostName: string; redName: string; blueName: string;
  redPlayers: string[]; redLeader: string;
  bluePlayers: string[]; blueLeader: string;
}

export interface ClientToServerEvents {
  create_host: (p: CreateHostPayload) => void;
  create_online: (p: { name: string }) => void;
  join_online: (p: { code: string; name: string }) => void;
  rejoin: (p: { code: string; playerId: string; name: string }) => void;
  select_team: (p: { code: string; team: Team }) => void;
  become_leader: (p: { code: string; team: Team }) => void;
  start_game: (p: { code: string }) => void;
  submit_clue: (p: { code: string; word: string; num: number }) => void;
  guess_card: (p: { code: string; index: number }) => void;
  toggle_doubt: (p: { code: string; index: number }) => void;
  end_turn: (p: { code: string }) => void;
  restart: (p: { code: string }) => void;
}

export interface ServerToClientEvents {
  state: (s: PlayerView) => void;
  joined: (p: Joined) => void;
  error: (msg: string) => void;
}
