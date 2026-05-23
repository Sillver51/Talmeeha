import type { Server, Socket } from "socket.io";
import type { GameState, HostTeam, Player, Team } from "@/lib/types";
import { store } from "../rooms";
import { createHostSchema } from "@/lib/schemas";
import { buildBoard, remaining } from "@/lib/game";
import { WORDS } from "@/lib/words";

// Port of legacy `create_host` (server.js:78-112): host-mode room with synthetic
// players hRed/hBlue, populated players/teams/leaders, sRed/sBlue counts.
export function registerHostHandlers(io: Server, socket: Socket): void {
  socket.on("create_host", (payload) => {
    const parsed = createHostSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "بيانات الإعداد غير صالحة");
      return;
    }
    const { redName, blueName, redPlayers, redLeader, bluePlayers, blueLeader } = parsed.data;

    const code = store.genCode();
    const { board, startTeam } = buildBoard(WORDS);

    const teamNames: Record<Team, string> = {
      red: redName || "الفريق الأحمر",
      blue: blueName || "الفريق الأزرق",
    };

    const hRed: HostTeam = { players: redPlayers, leader: redLeader, gIdx: 0 };
    const hBlue: HostTeam = { players: bluePlayers, leader: blueLeader, gIdx: 0 };

    // Populate synthetic players / teams / leaders (legacy ids `h_<team>_<i>`).
    const players: Record<string, Player> = {};
    const teams: Record<Team, string[]> = { red: [], blue: [] };
    const leaders: Record<Team, string | null> = { red: null, blue: null };
    (["red", "blue"] as const).forEach((t) => {
      const list = t === "red" ? redPlayers : bluePlayers;
      const ldr = t === "red" ? redLeader : blueLeader;
      list.forEach((name, i) => {
        const id = `h_${t}_${i}`;
        players[id] = { id, name, team: t };
        teams[t].push(id);
        if (name === ldr) leaders[t] = id;
      });
    });

    const room: GameState = {
      code,
      phase: "playing",
      hostMode: true,
      hostSocketId: socket.id,
      players,
      teams,
      leaders,
      teamNames,
      board,
      turn: startTeam,
      clue: null,
      gleft: 0,
      gphase: false,
      winner: null,
      doubts: {},
      wins: { red: 0, blue: 0 },
      log: [`بدأت اللعبة! يبدأ ${teamNames[startTeam]} 🍇`],
      hRed,
      hBlue,
      sRed: remaining(board, "red"),
      sBlue: remaining(board, "blue"),
    };

    store.set(code, room);
    socket.join(code);
    socket.emit("joined", { code, myId: socket.id, isHost: true });
    io.to(code).emit("state", room);
  });
}
