import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  GameState,
  Player,
  ServerToClientEvents,
  Team,
} from "@/lib/types";
import { store } from "../rooms";
import { selectTeamSchema, becomeLeaderSchema } from "@/lib/schemas";

// Returns a copy of the room with the socket removed from both team rosters.
function removeFromTeams(room: GameState, id: string): Record<Team, string[]> {
  return {
    red: room.teams.red.filter((i) => i !== id),
    blue: room.teams.blue.filter((i) => i !== id),
  };
}

// Ports legacy `select_team` (server.js:145-155) and `become_leader` (server.js:158-169).
export function registerTeamHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  socket.on("select_team", (payload) => {
    const parsed = selectTeamSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "اختيار الفريق غير صالح");
      return;
    }
    const { code, team } = parsed.data;

    const room = store.get(code);
    if (!room || !room.players[socket.id]) return;

    const teams = removeFromTeams(room, socket.id);
    teams[team] = [...teams[team], socket.id];

    // Clear leadership when leaving the team the player led.
    const leaders: Record<Team, string | null> = {
      red: room.leaders.red === socket.id && team !== "red" ? null : room.leaders.red,
      blue: room.leaders.blue === socket.id && team !== "blue" ? null : room.leaders.blue,
    };

    const existing = room.players[socket.id]!;
    const player: Player = { ...existing, team };

    const next: GameState = {
      ...room,
      teams,
      leaders,
      players: { ...room.players, [socket.id]: player },
    };

    store.set(code, next);
    io.to(code).emit("state", next);
  });

  socket.on("become_leader", (payload) => {
    const parsed = becomeLeaderSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", "طلب القيادة غير صالح");
      return;
    }
    const { code, team } = parsed.data;

    const room = store.get(code);
    if (!room || !room.players[socket.id]) return;

    let teams = room.teams;
    let players = room.players;
    // If the player isn't already on that team, move them onto it first (legacy behaviour).
    if (!room.teams[team].includes(socket.id)) {
      const cleared = removeFromTeams(room, socket.id);
      cleared[team] = [...cleared[team], socket.id];
      teams = cleared;
      players = { ...room.players, [socket.id]: { ...room.players[socket.id]!, team } };
    }

    const leaders: Record<Team, string | null> = { ...room.leaders, [team]: socket.id };

    const next: GameState = { ...room, teams, players, leaders };
    store.set(code, next);
    io.to(code).emit("state", next);
  });
}
