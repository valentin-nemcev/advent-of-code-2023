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

const splitLines = (s: string): string[] => s.match(/(.+)/g)!;

const add = (a: number, b: number) => a + b;

const map = describe("Day 1", () => {
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
      if (left && right) return left * 10 + right;
    }
    throw "no match";
  };

  test("*", async () => {
    const example = `
1abc2
pqr3stu8vwx
a1b2c3d4e5f
treb7uchet`;

    const perLine = (s: string) =>
      splitLines(s).map(calibrationValue(matchDigit));

    expect(perLine(example)).toEqual([12, 38, 15, 77]);
    expect(perLine(example).reduce(add)).toEqual(142);

    expect(perLine(await fetchInput(1)).reduce(add)).toBe(55108);
  });

  test("**", async () => {
    const example = `
two1nine
eightwothree
abcone2threexyz
xtwone3four
4nineeightseven2
zoneight234
7pqrstsixteen`;

    const perLine = (s: string) =>
      splitLines(s).map(calibrationValue(matchWordDigit));

    expect(perLine(example)).toEqual([29, 83, 13, 24, 42, 14, 76]);
    expect(perLine(example).reduce(add)).toEqual(281);

    expect(perLine(await fetchInput(1)).reduce(add)).toBe(56324);
  });
});

describe("Day 2", () => {
  const bag = { red: 12, green: 13, blue: 14 };
  const colors = Object.keys(bag) as Array<keyof typeof bag>;

  const idIfPossible = (line: string) => {
    const parseColor = (colorStr: string): [string, number] => {
      const [numStr, color] = colorStr.split(" ");
      return [color, Number(numStr)];
    };

    const parseRound = (roundStr: string) =>
      Object.fromEntries(roundStr.split(", ").map(parseColor));

    const [, idStr, roundsStr] = line.match(/game (\d+): (.*)/i)!;
    const rounds = roundsStr.split("; ").map(parseRound);

    for (const round of rounds)
      for (const color of colors)
        if ((round[color] ?? 0) > bag[color]) return 0;

    return Number(idStr);
  };

  test("*", async () => {
    const example = `
Game 1: 3 blue, 4 red; 1 red, 2 green, 6 blue; 2 green
Game 2: 1 blue, 2 green; 3 green, 4 blue, 1 red; 1 green, 1 blue
Game 3: 8 green, 6 blue, 20 red; 5 blue, 4 red, 13 green; 5 green, 1 red
Game 4: 1 green, 3 red, 6 blue; 3 green, 6 red; 3 green, 15 blue, 14 red
Game 5: 6 red, 1 blue, 3 green; 2 blue, 1 red, 2 green`;

    const perLine = (s: string) => splitLines(s).map(idIfPossible);
    expect(perLine(example)).toEqual([1, 2, 0, 0, 5]);
    expect(perLine(example).reduce(add)).toEqual(8);

    expect(perLine(await fetchInput(2)).reduce(add)).toEqual(0);
  });
});
