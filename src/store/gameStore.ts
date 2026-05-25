import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  PlayerView,
  ServerToClientEvents,
  Team,
} from "@/lib/types";
import type { TimerPreset } from "@/lib/game";

type Mode = "host" | "online";
/**
 * Socket connection lifecycle, driven by socket.io events:
 *  - `connecting`    initial dial before the first `connect`
 *  - `online`        socket is connected
 *  - `reconnecting`  unexpected drop / reconnect attempt in flight
 *  - `offline`       intentional close or reconnection gave up
 */
export type ConnectionStatus = "connecting" | "online" | "reconnecting" | "offline";
/**
 * Pre-connection client screen for host mode (mirrors legacy `show()`):
 * `"home"` before setup, `"setup"` after `startHostSetup()`. Once a `gs` exists
 * the rendered screen is derived from `gs.phase`, so this only disambiguates the
 * host-mode home/setup transition that has no server state behind it.
 */
type ClientScreen = "home" | "setup";

interface HostTeamSetup {
  players: string[];
  leader: string | null;
  name: string;
}

interface WinsData {
  red: number;
  blue: number;
  redName: string;
  blueName: string;
}

const DEFAULT_RED_NAME = "الفريق الأحمر";
const DEFAULT_BLUE_NAME = "الفريق الأزرق";
const WINS_KEY = "talmeeha_wins";
const NAME_KEY = "tname";

// Client socket: <ListenEvents = ServerToClient, EmitEvents = ClientToServer>.
type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface GameStore {
  socket: GameSocket | null;
  myId: string | null;
  myName: string;
  roomCode: string | null;
  isHost: boolean;
  gs: PlayerView | null;
  pendingJoinCode: string | null;
  // connection
  connectionStatus: ConnectionStatus;
  roomLost: boolean;
  // local UI
  mode: Mode;
  clientScreen: ClientScreen;
  doubtMode: boolean;
  hostViewLeader: boolean;
  peeking: boolean;
  toastMsg: string | null;
  winsData: WinsData;
  hSetup: { red: HostTeamSetup; blue: HostTeamSetup };
  // lifecycle
  connect(): void;
  // actions
  selectMode(m: Mode): void;
  setPendingJoinCode(code: string | null): void;
  startHostSetup(name: string): void;
  addPlayer(t: Team, name: string): void;
  removePlayer(t: Team, name: string): void;
  setLeader(t: Team, name: string): void;
  launchHostGame(redName: string, blueName: string): void;
  createRoom(name: string): void;
  joinRoom(code: string, name: string): void;
  joinTeam(t: Team): void;
  becomeLeader(t: Team): void;
  startGame(): void;
  submitClue(word: string, num: number): void;
  guessCard(i: number): void;
  toggleDoubt(i: number): void;
  endTurn(): void;
  setTimer(preset: TimerPreset | "off"): void;
  restart(): void;
  goHome(): void;
  toggleDoubtMode(): void;
  toggleHostView(): void;
  setPeeking(on: boolean): void;
  toast(msg: string): void;
  resetWins(): void;
}

function emptyHostSetup(): { red: HostTeamSetup; blue: HostTeamSetup } {
  return {
    red: { players: [], leader: null, name: DEFAULT_RED_NAME },
    blue: { players: [], leader: null, name: DEFAULT_BLUE_NAME },
  };
}

const DEFAULT_WINS: WinsData = {
  red: 0,
  blue: 0,
  redName: "الأحمر",
  blueName: "الأزرق",
};

// SSR-safe localStorage helpers — never touched at module load / during render.
function loadWins(): WinsData {
  if (typeof window === "undefined") return DEFAULT_WINS;
  try {
    const s = window.localStorage.getItem(WINS_KEY);
    if (s) return { ...DEFAULT_WINS, ...(JSON.parse(s) as Partial<WinsData>) };
  } catch {
    // ignore corrupt persisted state
  }
  return DEFAULT_WINS;
}

function saveWins(w: WinsData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WINS_KEY, JSON.stringify(w));
  } catch {
    // ignore quota / private-mode errors
  }
}

function loadName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(n: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(NAME_KEY, n);
  } catch {
    // ignore
  }
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  myId: null,
  myName: "",
  roomCode: null,
  isHost: false,
  gs: null,
  pendingJoinCode: null,
  connectionStatus: "connecting",
  roomLost: false,
  mode: "host",
  clientScreen: "home",
  doubtMode: false,
  hostViewLeader: false,
  peeking: false,
  toastMsg: null,
  winsData: DEFAULT_WINS,
  hSetup: emptyHostSetup(),

  // Idempotent: creates the socket once and hydrates persisted client state.
  connect() {
    if (get().socket) return;
    const socket: GameSocket = io();
    // Tracks whether the last `connect` fired a `rejoin`. A subsequent server
    // `error` then means the seat is gone (room closed / server restarted),
    // which we surface as room-lost recovery rather than a transient toast.
    let attemptedRejoin = false;

    // On every (re)connect: if we already hold a room seat, ask the server to restore it.
    // First connect is a no-op (roomCode/myId are null). After a network drop, the store
    // still holds the prior code + playerId, so the server remaps us to the new socket id.
    socket.on("connect", () => {
      set({ connectionStatus: "online" });
      const { roomCode, myId, myName } = get();
      // Require a non-empty name too: the server's rejoinSchema rejects a blank name,
      // so emitting without one would only burn the seat's grace window for nothing.
      if (roomCode && myId && myName) {
        attemptedRejoin = true;
        socket.emit("rejoin", { code: roomCode, playerId: myId, name: myName });
      }
    });

    socket.on("disconnect", (reason) => {
      // "io client disconnect" = we closed it intentionally; anything else = unexpected drop.
      set({
        connectionStatus: reason === "io client disconnect" ? "offline" : "reconnecting",
      });
    });
    // Reconnection lifecycle lives on the manager (socket.io), not the socket.
    socket.io.on("reconnect_attempt", () => set({ connectionStatus: "reconnecting" }));
    socket.io.on("reconnect_failed", () => set({ connectionStatus: "offline" }));
    socket.on("connect_error", () => {
      set((s) => ({
        connectionStatus: s.connectionStatus === "online" ? "reconnecting" : s.connectionStatus,
      }));
    });

    socket.on("joined", ({ code, myId, isHost }) => {
      attemptedRejoin = false; // a successful (re)join clears the pending flag
      set({ myId, roomCode: code, isHost });
    });

    socket.on("state", (state) => {
      set({ gs: state });
      // Mirror legacy `render()`/`show()`: any incoming non-setup state drives
      // the screen back off the host-mode `clientScreen` override (e.g. after
      // the host gear opened setup mid-round, the next push returns to game).
      if (state.phase !== "setup" && get().clientScreen !== "home") {
        set({ clientScreen: "home" });
      }
      // Mirror legacy: keep wins in sync with authoritative server state.
      if (state.wins) {
        const next: WinsData = {
          red: state.wins.red ?? 0,
          blue: state.wins.blue ?? 0,
          redName: state.teamNames?.red ?? get().winsData.redName,
          blueName: state.teamNames?.blue ?? get().winsData.blueName,
        };
        saveWins(next);
        set({ winsData: next });
      }
    });

    socket.on("error", (msg) => {
      if (attemptedRejoin) {
        // A rejoin after reconnect failed → the room is gone (server restart / closed).
        attemptedRejoin = false;
        set({ roomLost: true });
        return;
      }
      get().toast(msg);
    });

    set({
      socket,
      connectionStatus: "connecting",
      winsData: loadWins(),
      myName: loadName(),
    });
  },

  selectMode(m) {
    set({ mode: m });
  },

  setPendingJoinCode(code) {
    set({ pendingJoinCode: code });
  },

  startHostSetup(name) {
    const n = name.trim();
    if (!n) {
      get().toast("أدخل اسمك");
      return;
    }
    saveName(n);
    set({ myName: n, hSetup: emptyHostSetup(), clientScreen: "setup" });
  },

  addPlayer(t, name) {
    const n = name.trim();
    if (!n) {
      get().toast("أدخل الاسم");
      return;
    }
    const team = get().hSetup[t];
    if (team.players.includes(n)) {
      get().toast("الاسم موجود");
      return;
    }
    set((s) => ({
      hSetup: {
        ...s.hSetup,
        [t]: { ...team, players: [...team.players, n] },
      },
    }));
  },

  removePlayer(t, name) {
    set((s) => {
      const team = s.hSetup[t];
      return {
        hSetup: {
          ...s.hSetup,
          [t]: {
            ...team,
            players: team.players.filter((p) => p !== name),
            leader: team.leader === name ? null : team.leader,
          },
        },
      };
    });
  },

  setLeader(t, name) {
    set((s) => ({
      hSetup: { ...s.hSetup, [t]: { ...s.hSetup[t], leader: name } },
    }));
  },

  launchHostGame(redName, blueName) {
    const rName = redName.trim() || DEFAULT_RED_NAME;
    const bName = blueName.trim() || DEFAULT_BLUE_NAME;
    const { socket, hSetup, myName, winsData } = get();
    if (!socket) return;
    const redLeader = hSetup.red.leader;
    const blueLeader = hSetup.blue.leader;
    if (!redLeader || !blueLeader) {
      get().toast("عيّن قائداً لكل فريق");
      return;
    }
    const nextWins: WinsData = { ...winsData, redName: rName, blueName: bName };
    saveWins(nextWins);
    set({
      isHost: true,
      hostViewLeader: false,
      doubtMode: false,
      winsData: nextWins,
      hSetup: {
        red: { ...hSetup.red, name: rName },
        blue: { ...hSetup.blue, name: bName },
      },
    });
    socket.emit("create_host", {
      hostName: myName,
      redName: rName,
      blueName: bName,
      redPlayers: hSetup.red.players,
      redLeader,
      bluePlayers: hSetup.blue.players,
      blueLeader,
    });
  },

  createRoom(name) {
    const n = name.trim();
    if (!n) {
      get().toast("أدخل اسمك");
      return;
    }
    const { socket } = get();
    if (!socket) return;
    saveName(n);
    set({ myName: n, isHost: false });
    socket.emit("create_online", { name: n });
  },

  joinRoom(code, name) {
    const n = name.trim();
    const c = code.trim();
    if (!n) {
      get().toast("أدخل اسمك");
      return;
    }
    if (c.length !== 4) {
      get().toast("الرمز 4 أرقام");
      return;
    }
    const { socket } = get();
    if (!socket) return;
    saveName(n);
    set({ myName: n, isHost: false });
    socket.emit("join_online", { code: c, name: n });
  },

  joinTeam(t) {
    const { socket, roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit("select_team", { code: roomCode, team: t });
  },

  becomeLeader(t) {
    const { socket, roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit("become_leader", { code: roomCode, team: t });
    get().toast("أصبحت قائد! 🍇");
  },

  startGame() {
    const { socket, roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit("start_game", { code: roomCode });
  },

  submitClue(word, num) {
    const w = word.trim();
    if (!w) {
      get().toast("أدخل كلمة التلميح");
      return;
    }
    if (w.includes(" ")) {
      get().toast("كلمة واحدة فقط!");
      return;
    }
    if (!num || num < 1) {
      get().toast("أدخل عدداً");
      return;
    }
    const { socket, roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit("submit_clue", { code: roomCode, word: w, num });
  },

  guessCard(i) {
    const { socket, roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit("guess_card", { code: roomCode, index: i });
  },

  toggleDoubt(i) {
    const { socket, roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit("toggle_doubt", { code: roomCode, index: i });
  },

  endTurn() {
    const { socket, roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit("end_turn", { code: roomCode });
  },

  setTimer(preset) {
    const { socket, roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit("set_timer", { code: roomCode, preset });
  },

  restart() {
    const { socket, roomCode } = get();
    set({ doubtMode: false });
    if (!socket || !roomCode) return;
    socket.emit("restart", { code: roomCode });
  },

  goHome() {
    set({
      roomCode: null,
      gs: null,
      isHost: false,
      doubtMode: false,
      roomLost: false,
      clientScreen: "home",
    });
  },

  toggleDoubtMode() {
    set((s) => ({ doubtMode: !s.doubtMode }));
  },

  toggleHostView() {
    set((s) => ({ hostViewLeader: !s.hostViewLeader }));
  },

  setPeeking(on) {
    set({ peeking: on });
  },

  toast(msg) {
    set({ toastMsg: msg });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toastMsg: null }), 2600);
  },

  resetWins() {
    const next: WinsData = { ...get().winsData, red: 0, blue: 0 };
    saveWins(next);
    set({ winsData: next });
    get().toast("تم تصفير السكور 🍇");
  },
}));
