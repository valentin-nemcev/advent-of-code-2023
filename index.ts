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

  const input = await response.text();
  await Bun.write(file, input);
  return input;
}

const splitLines = (text: string): string[] => text.match(/(.+)/g)!;
const mapLines =
  <R>(fn: (line: string, index: number) => R) =>
  (text: string) =>
    splitLines(text).map(fn);

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

    const part1 = mapLines(calibrationValue(matchDigit));

    expect(part1(example)).toEqual([12, 38, 15, 77]);
    expect(part1(example).reduce(add)).toEqual(142);

    expect(part1(await fetchInput(1)).reduce(add)).toBe(55108);
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

    const part2 = mapLines(calibrationValue(matchWordDigit));

    expect(part2(example)).toEqual([29, 83, 13, 24, 42, 14, 76]);
    expect(part2(example).reduce(add)).toEqual(281);

    expect(part2(await fetchInput(1)).reduce(add)).toBe(56324);
  });
});

describe("Day 2", () => {
  const bag = { red: 12, green: 13, blue: 14 };
  const colors = Object.keys(bag) as Array<keyof typeof bag>;

  const parseRounds = (gameStr: string) => {
    const parseColor = (colorStr: string) => {
      const [numStr, color] = colorStr.split(" ");
      return [color, Number(numStr)] as const;
    };

    const parseRound = (roundStr: string) =>
      Object.fromEntries(roundStr.split(", ").map(parseColor));

    const [, idStr, roundsStr] = gameStr.match(/game (\d+): (.*)/i)!;
    return [Number(idStr), roundsStr.split("; ").map(parseRound)] as const;
  };

  const idIfPossible = (gameStr: string) => {
    const [id, rounds] = parseRounds(gameStr);

    for (const round of rounds)
      for (const color of colors)
        if ((round[color] ?? 0) > bag[color]) return 0;

    return id;
  };

  const minSetPower = (gameStr: string) => {
    const minSet = { red: 0, green: 0, blue: 0 };
    for (const round of parseRounds(gameStr)[1])
      for (const color of colors)
        minSet[color] = Math.max(minSet[color], round[color] ?? 0);

    return Object.values(minSet).reduce((a, b) => a * b);
  };

  test("**", async () => {
    const example = `
Game 1: 3 blue, 4 red; 1 red, 2 green, 6 blue; 2 green
Game 2: 1 blue, 2 green; 3 green, 4 blue, 1 red; 1 green, 1 blue
Game 3: 8 green, 6 blue, 20 red; 5 blue, 4 red, 13 green; 5 green, 1 red
Game 4: 1 green, 3 red, 6 blue; 3 green, 6 red; 3 green, 15 blue, 14 red
Game 5: 6 red, 1 blue, 3 green; 2 blue, 1 red, 2 green`;

    const part1 = mapLines(idIfPossible);
    expect(part1(example)).toEqual([1, 2, 0, 0, 5]);
    expect(part1(example).reduce(add)).toEqual(8);

    const input = await fetchInput(2);
    expect(part1(input).reduce(add)).toEqual(2545);

    const part2 = mapLines(minSetPower);
    expect(part2(example)).toEqual([48, 12, 1560, 630, 36]);
    expect(part2(example).reduce(add)).toEqual(2286);

    expect(part2(input).reduce(add)).toEqual(78111);
  });
});

describe("Day 3", () => {
  const partNumbers = (lines: string[]) => {
    const numbers = lines.flatMap((line, lineIndex) =>
      [...line.matchAll(/\d+/g)].map((match) => {
        const { 0: numberString, index: begin } = match;
        const end = begin + numberString.length;

        const clamp = (pos: number) => Math.max(0, Math.min(pos, line.length));
        const adjacent = [-1, 0, 1]
          .map((offset) => lines[lineIndex + offset] ?? "")
          .map((l) => l.slice(clamp(begin - 1), clamp(end + 1)));

        const isPartNumber = adjacent.some((l) => /[^\d\.]/g.test(l));
        return {
          number: parseInt(numberString),
          isPartNumber,
        };
      })
    );
    return numbers;
  };

  test("*", async () => {
    const example = `
467..114..
...*......
..35..633.
......#...
617*......
.....+.58.
..592.....
......755.
...$.*....
.664.598..`;

    const part1 = (text: string) =>
      partNumbers(splitLines(text)).map((n) => (n.isPartNumber ? n.number : 0));
    expect(part1(example)).toEqual([
      467, 0, 35, 633, 617, 0, 592, 755, 664, 598,
    ]);

    const input = await fetchInput(3);
    expect(part1(input).reduce(add)).toEqual(544433);
  });
});
