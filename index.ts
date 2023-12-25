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

const overLines =
  <R>(fn: (lines: string[]) => R) =>
  (text: string) =>
    fn(splitLines(text));

const add = (a: number, b: number) => a + b;
const { min, max } = Math;

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

  const calibrationValues = (match: typeof matchDigit) =>
    mapLines((line: string) => {
      let left = 0;
      let right = 0;
      for (let i = 0; i < line.length; i++) {
        left ||= match("left", line, i);
        right ||= match("right", line, i);
        if (left && right) return left * 10 + right;
      }
      throw "no match";
    });

  test("**", async () => {
    const example1 = `
1abc2
pqr3stu8vwx
a1b2c3d4e5f
treb7uchet`;

    expect(calibrationValues(matchDigit)(example1)).toEqual([12, 38, 15, 77]);

    const example2 = `
two1nine
eightwothree
abcone2threexyz
xtwone3four
4nineeightseven2
zoneight234
7pqrstsixteen`;

    expect(calibrationValues(matchWordDigit)(example2)).toEqual([
      29, 83, 13, 24, 42, 14, 76,
    ]);

    const input = await fetchInput(1);

    expect(calibrationValues(matchDigit)(input).reduce(add)).toBe(55108);
    expect(calibrationValues(matchWordDigit)(input).reduce(add)).toBe(56324);
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

  const possibleIds = mapLines((gameStr: string) => {
    const [id, rounds] = parseRounds(gameStr);

    for (const round of rounds)
      for (const color of colors)
        if ((round[color] ?? 0) > bag[color]) return 0;

    return id;
  });

  const minSetsPowers = mapLines((gameStr: string) => {
    const minSet = { red: 0, green: 0, blue: 0 };
    for (const round of parseRounds(gameStr)[1])
      for (const color of colors)
        minSet[color] = Math.max(minSet[color], round[color] ?? 0);

    return Object.values(minSet).reduce((a, b) => a * b);
  });

  test("**", async () => {
    const example = `
Game 1: 3 blue, 4 red; 1 red, 2 green, 6 blue; 2 green
Game 2: 1 blue, 2 green; 3 green, 4 blue, 1 red; 1 green, 1 blue
Game 3: 8 green, 6 blue, 20 red; 5 blue, 4 red, 13 green; 5 green, 1 red
Game 4: 1 green, 3 red, 6 blue; 3 green, 6 red; 3 green, 15 blue, 14 red
Game 5: 6 red, 1 blue, 3 green; 2 blue, 1 red, 2 green`;

    const input = await fetchInput(2);

    expect(possibleIds(example)).toEqual([1, 2, 0, 0, 5]);
    expect(possibleIds(input).reduce(add)).toEqual(2545);

    expect(minSetsPowers(example)).toEqual([48, 12, 1560, 630, 36]);
    expect(minSetsPowers(input).reduce(add)).toEqual(78111);
  });
});

describe("Day 3", () => {
  const parseEngine = overLines((lines: string[]) => {
    const partNumbers: number[] = [];

    const gearPartsDict: Record<`${number}:${number}`, number[]> = {};
    const gearParts = (i: number, p: number) =>
      (gearPartsDict[`${i}:${p}`] ??= []);

    const symbolRe = /[^\d\.]/;

    lines.forEach((line, lineIndex) =>
      [...line.matchAll(/\d+/g)].forEach((match) => {
        const { 0: numberString, index: begin } = match;
        const number = parseInt(numberString);
        const end = begin + numberString.length;

        let isPartNumber = false;
        for (
          let i = max(0, lineIndex - 1);
          i <= min(lines.length - 1, lineIndex + 1);
          i++
        )
          for (let p = max(0, begin - 1); p < min(line.length, end + 1); p++) {
            const c = lines[i][p];
            if (!isPartNumber && (isPartNumber ||= symbolRe.test(c)))
              partNumbers.push(number);
            if (c == "*") gearParts(i, p).push(number);
          }
      })
    );
    const gearsRatios = Object.values(gearPartsDict)
      .filter((parts) => parts.length == 2)
      .map(([a, b]) => a * b);
    return { partNumbers, gearsRatios };
  });

  test("**", async () => {
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

    const input = await fetchInput(3);

    expect(parseEngine(example).partNumbers).toEqual([
      467, 35, 633, 617, 592, 755, 664, 598,
    ]);
    expect(parseEngine(input).partNumbers.reduce(add)).toEqual(544433);

    expect(parseEngine(example).gearsRatios).toEqual([16345, 451490]);
    expect(parseEngine(input).gearsRatios.reduce(add)).toEqual(76314915);
  });
});

describe("Day 4", () => {
  const parseNumbers = (s: string) => s.match(/(\d+)/g)!.map(Number);
  const parseCard = (s: string) => {
    const [, winningStr, oursStr] = s.split(/:|\|/);
    return [new Set(parseNumbers(winningStr)), parseNumbers(oursStr)] as const;
  };
  const processCards = overLines((cardsStr: string[]) => {
    const matchCounts: number[] = [];
    const instanceCounts: number[] = [];

    cardsStr.forEach((cardStr, cardIndex) => {
      const [winning, ours] = parseCard(cardStr);
      const matches = ours.reduce((c, n) => c + Number(winning.has(n)), 0);

      const copyingCards = matchCounts.reduce(
        (result, c, i) => result + (i + c >= cardIndex ? instanceCounts[i] : 0),
        1
      );
      instanceCounts.push(copyingCards);
      matchCounts.push(matches);
    });

    return {
      points: matchCounts.map((c) => c && 2 ** (c - 1)),
      instances: instanceCounts,
    };
  });

  test("**", async () => {
    const example = `
Card 1: 41 48 83 86 17 | 83 86  6 31 17  9 48 53
Card 2: 13 32 20 16 61 | 61 30 68 82 17 32 24 19
Card 3:  1 21 53 59 44 | 69 82 63 72 16 21 14  1
Card 4: 41 92 73 84 69 | 59 84 76 51 58  5 54 83
Card 5: 87 83 26 28 32 | 88 30 70 12 93 22 82 36
Card 6: 31 18 13 56 72 | 74 77 10 23 35 67 36 11`;
    const input = await fetchInput(4);

    expect(processCards(example).points).toEqual([8, 2, 2, 1, 0, 0]);
    expect(processCards(input).points.reduce(add)).toEqual(26346);

    expect(processCards(example).instances).toEqual([1, 2, 4, 8, 14, 1]);
    expect(processCards(input).instances.reduce(add)).toEqual(8467762);
  });
});

/*
describe("Day ", () => {
  test("*", async () => {
    const example = `
  `;
    const input = await fetchInput();
  });
});

*/
