import { describe, expect, test } from "bun:test";

async function fetchInput(day: number) {
  const file = Bun.file(`inputs/${day}.txt`);

  if (await file.exists()) return file.text();

  const session = process.env.SESSION_COOKIE;
  if (!session) throw "Missing SESSION_COOKIE env var";

  console.warn(`Fetching puzzle input for day ${day}...`);
  const response = await fetch(
    `https://adventofcode.com/2023/day/${day}/input`,
    { headers: { cookie: "session=" + session } }
  );
  if (!response.ok) throw `${response.status}: ${await response.text()}`;

  await Bun.write(file, response);
  return file.text();
}

const add = (a: number, b: number) => a + b;

describe("Day 1", () => {
  const digitWords = [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ];

  const matchDigit = (dir: "left" | "right", s: string, i: number) => {
    const c = dir == "left" ? s[i] : s[s.length - i - 1];
    return "1" <= c && c <= "9" ? Number(c) : 0;
  };

  const matchWordDigit = (dir: "left" | "right", s: string, i: number) =>
    matchDigit(dir, s, i) ||
    digitWords.findIndex((w) =>
      dir == "left" ? s.startsWith(w, i) : s.endsWith(w, s.length - i)
    ) + 1;

  const calibrationValue = (match: typeof matchDigit) => (line: string) => {
    let left = 0;
    let right = 0;
    for (let i = 0; i < line.length; i++) {
      left ||= match("left", line, i);
      right ||= match("right", line, i);
      if (left && right) break;
    }
    return left * 10 + right;
  };

  test("*", async () => {
    const example = `1abc2
  pqr3stu8vwx
  a1b2c3d4e5f
  treb7uchet`;

    const perLine = (s: string) =>
      s.split("\n").map(calibrationValue(matchDigit));

    expect(perLine(example)).toEqual([12, 38, 15, 77]);
    expect(perLine(example).reduce(add)).toEqual(142);

    expect(perLine(await fetchInput(1)).reduce(add)).toBe(55108);
  });

  test("**", async () => {
    const example = `two1nine
  eightwothree
  abcone2threexyz
  xtwone3four
  4nineeightseven2
  zoneight234
  7pqrstsixteen`;

    const perLine = (s: string) =>
      s.split("\n").map(calibrationValue(matchWordDigit));

    expect(perLine(example)).toEqual([29, 83, 13, 24, 42, 14, 76]);
    expect(perLine(example).reduce(add)).toEqual(281);

    expect(perLine(await fetchInput(1)).reduce(add)).toBe(56324);
  });
});
