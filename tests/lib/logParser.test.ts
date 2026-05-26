import { describe, it, expect } from "vitest";
import { parseLogEntry, lastEventOf, startingTeamOf } from "@/lib/game/logParser";

describe("parseLogEntry", () => {
  const teamNames = { red: "الفريق الأحمر", blue: "الفريق الأزرق" };

  it("parses a clue line into kind/by/word/count", () => {
    const e = parseLogEntry('💡 عمر: "بحر" — 3');
    expect(e.kind).toBe("clue");
    expect(e.by).toBe("عمر");
    expect(e.word).toBe("بحر");
    expect(e.count).toBe(3);
  });

  it("parses a hit line", () => {
    const e = parseLogEntry('✅ ليلى: "نخلة" — إصابة!');
    expect(e.kind).toBe("hit");
    expect(e.by).toBe("ليلى");
    expect(e.word).toBe("نخلة");
  });

  it("parses a miss line", () => {
    const e = parseLogEntry('❌ نور: "قمر"');
    expect(e.kind).toBe("miss");
    expect(e.by).toBe("نور");
    expect(e.word).toBe("قمر");
  });

  it("parses an assassin line", () => {
    const e = parseLogEntry("☠️ جود كشف القاتل!");
    expect(e.kind).toBe("assassin");
    expect(e.by).toBe("جود");
  });

  it("parses a win line and resolves team from teamNames", () => {
    const e = parseLogEntry(`🏆 فاز ${teamNames.red}! 🍇`, teamNames);
    expect(e.kind).toBe("win");
    expect(e.team).toBe("red");
  });

  it("parses sudden-death win before regular win", () => {
    const e = parseLogEntry(`⏰🏆 فاز ${teamNames.blue} بالحسم! 🍇`, teamNames);
    expect(e.kind).toBe("suddenDeathWin");
    expect(e.team).toBe("blue");
  });

  it("parses time-out", () => {
    expect(parseLogEntry("⏰ انتهى الوقت").kind).toBe("timeOut");
  });

  it("parses turn-end vs turn-skipped", () => {
    expect(parseLogEntry("⏭ انتهى الدور").kind).toBe("turnEnd");
    expect(parseLogEntry("⏭ تم تمرير الدور — لا يوجد لاعب متصل").kind).toBe("turnSkipped");
  });

  it("parses start line and infers team", () => {
    const e = parseLogEntry(`بدأت اللعبة! يبدأ ${teamNames.red} 🍇`, teamNames);
    expect(e.kind).toBe("start");
    expect(e.team).toBe("red");
  });

  it("parses room-created", () => {
    expect(parseLogEntry("تم إنشاء الغرفة! 🍇").kind).toBe("roomCreated");
  });

  it("falls back to info for unknown strings", () => {
    expect(parseLogEntry("شيء مجهول هنا").kind).toBe("info");
  });

  it("preserves raw text on every kind", () => {
    const raw = '💡 سارة: "نجم" — 2';
    expect(parseLogEntry(raw).raw).toBe(raw);
  });

  describe("lastEventOf", () => {
    const teamNames = { red: "الفريق الأحمر", blue: "الفريق الأزرق" };

    it("returns null for an empty log", () => {
      expect(lastEventOf([], teamNames)).toBeNull();
    });

    it("parses the newest entry (server pushes newest-first)", () => {
      const log = [
        '✅ ليلى: "نخلة" — إصابة!', // newest
        '💡 عمر: "بحر" — 3',
      ];
      const e = lastEventOf(log, teamNames);
      expect(e?.kind).toBe("hit");
      expect(e?.by).toBe("ليلى");
      expect(e?.word).toBe("نخلة");
    });

    it("resolves team names on win lines", () => {
      const log = [`🏆 فاز ${teamNames.red}! 🍇`];
      const e = lastEventOf(log, teamNames);
      expect(e?.kind).toBe("win");
      expect(e?.team).toBe("red");
    });
  });

  describe("startingTeamOf", () => {
    const teamNames = { red: "الفريق الأحمر", blue: "الفريق الأزرق" };

    it("returns null for an empty log", () => {
      expect(startingTeamOf([], teamNames)).toBeNull();
    });

    it("returns the starting team from the start entry (newest-first log)", () => {
      const log = [
        '✅ عمر: "بحر" — إصابة!',
        '💡 ليلى: "بحر" — 2',
        `بدأت اللعبة! يبدأ ${teamNames.blue} 🍇`,
      ];
      expect(startingTeamOf(log, teamNames)).toBe("blue");
    });

    it("returns null when no start entry is present", () => {
      const log = ['💡 عمر: "بحر" — 2'];
      expect(startingTeamOf(log, teamNames)).toBeNull();
    });
  });
});
