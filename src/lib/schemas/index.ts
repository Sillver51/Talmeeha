import { z } from "zod";

const code = z.string().regex(/^\d{4}$/);
const team = z.enum(["red", "blue"]);
const name = z.string().trim().min(1).max(18);
const oneWord = z.string().trim().min(1).max(25).refine((w) => !/\s/.test(w), "single word only");

export const createHostSchema = z.object({
  hostName: name,
  redName: z.string().trim().max(18), blueName: z.string().trim().max(18),
  redPlayers: z.array(name).min(2), redLeader: name,
  bluePlayers: z.array(name).min(2), blueLeader: name,
});
export const createOnlineSchema = z.object({ name });
export const joinOnlineSchema = z.object({ code, name });
export const rejoinSchema = z.object({ code, playerId: z.string().trim().min(1).max(40), name });
export const selectTeamSchema = z.object({ code, team });
export const becomeLeaderSchema = z.object({ code, team });
export const startGameSchema = z.object({ code });
export const submitClueSchema = z.object({ code, word: oneWord, num: z.number().int().min(1).max(9) });
export const guessCardSchema = z.object({ code, index: z.number().int().min(0).max(24) });
export const toggleDoubtSchema = z.object({ code, index: z.number().int().min(0).max(24) });
export const endTurnSchema = z.object({ code });
export const restartSchema = z.object({ code });
