import { describe, it, expect } from "vitest";
import { parseLogEntry } from "@/lib/game/logParser";

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
});
