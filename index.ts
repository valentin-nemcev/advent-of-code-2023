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

const splitLines = (text: string): string[] => text.trim().split("\n");
const mapLines =
  <R>(fn: (line: string, index: number) => R) =>
  (text: string) =>
    splitLines(text).map(fn);

const overLines =
  <R>(fn: (lines: string[]) => R) =>
  (text: string) =>
    fn(splitLines(text));

const add = (a: number, b: number) => a + b;
const multiply = (a: number, b: number) => a * b;

const { min, max, floor, ceil } = Math;

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

describe("Day 5", () => {
  const mapSeeds = overLines((lines) => {
    const [seedsLine, ...mapLines] = lines;
    const seeds = seedsLine.match(/\d+/g)!.map(Number);

    let currentMap: Array<{ begin: number; end: number; offset: number }>;
    const maps: Array<typeof currentMap> = [];
    for (const mapLine of mapLines) {
      if (mapLine == "") continue;
      if (mapLine.endsWith("map:")) {
        maps.push((currentMap = []));
        continue;
      }
      const [destBegin, begin, length] = mapLine.match(/\d+/g)!.map(Number);
      currentMap!.push({
        begin,
        end: begin + length,
        offset: destBegin - begin,
      });
    }
    const single = seeds.map((s) =>
      maps.reduce(
        (s, ranges) =>
          s +
          (ranges.find(({ begin, end }) => begin <= s && s < end)?.offset ?? 0),
        s
      )
    );

    const seedRanges: Array<[begin: number, end: number]> = [];
    for (let i = 0; i < seeds.length; i += 2) {
      const [begin, length] = seeds.slice(i, i + 2);
      seedRanges.push([begin, begin + length]);
    }

    const ranges = maps.reduce((srcRanges, map) => {
      const dstRanges: typeof srcRanges = [];

      srcRange: while (srcRanges.length) {
        const [srcBegin, srcEnd] = srcRanges.pop()!;
        mapRange: for (const { begin: mapBegin, end: mapEnd, offset } of map) {
          if (srcEnd <= mapBegin || srcBegin >= mapEnd) continue mapRange;

          if (srcBegin < mapBegin) {
            srcRanges.push([srcBegin, mapBegin], [mapBegin, srcEnd]);
            continue srcRange;
          }

          if (srcEnd > mapEnd) {
            srcRanges.push([srcBegin, mapEnd], [mapEnd, srcEnd]);
            continue srcRange;
          }

          dstRanges.push([srcBegin + offset, srcEnd + offset]);
          continue srcRange;
        }
        dstRanges.push([srcBegin, srcEnd]);
      }
      return dstRanges;
    }, seedRanges);

    return { single, ranges };
  });

  test("**", async () => {
    const example = `
seeds: 79 14 55 13

seed-to-soil map:
50 98 2
52 50 48

soil-to-fertilizer map:
0 15 37
37 52 2
39 0 15

fertilizer-to-water map:
49 53 8
0 11 42
42 0 7
57 7 4

water-to-light map:
88 18 7
18 25 70

light-to-temperature map:
45 77 23
81 45 19
68 64 13

temperature-to-humidity map:
0 69 1
1 0 69

humidity-to-location map:
60 56 37
56 93 4`;

    const input = await fetchInput(5);

    expect(mapSeeds(example).single).toEqual([82, 43, 86, 35]);
    expect(min(...mapSeeds(input).single)).toEqual(111627841);

    expect(mapSeeds(example).ranges).toEqual([
      [97, 99],
      [56, 60],
      [94, 97],
      [86, 90],
      [60, 61],
      [46, 56],
      [82, 85],
    ]);

    expect(min(...mapSeeds(input).ranges.map((r) => r[0]))).toEqual(69323688);
  });
});

describe("Day 6", () => {
  const solveTimes = (time: number, distance: number) => {
    // distance == x * (time - x);
    // 0 == x * x - time * x + distance;

    const [x1, x2] = [-1, 1].map(
      (s) => (time + s * Math.sqrt(time ** 2 - 4 * (distance + 0))) / 2
    );
    return ceil(x2) - floor(x1) - 1;
  };

  const combinationsByLine = overLines(([timeLine, distanceLine]: string[]) => {
    const times = timeLine.match(/\d+/g)!.map(Number);
    const distances = distanceLine.match(/\d+/g)!.map(Number);

    return times.map((time, i) => solveTimes(time, distances[i]));
  });

  const combinationsMerged = overLines(([timeLine, distanceLine]: string[]) => {
    const timeMerged = Number(timeLine.match(/\d+/g)!.join(""));
    const distanceMerged = Number(distanceLine.match(/\d+/g)!.join(""));

    return solveTimes(timeMerged, distanceMerged);
  });

  test("**", async () => {
    const example = `
Time:      7  15   30
Distance:  9  40  200`;

    const input = await fetchInput(6);

    expect(combinationsByLine(example)).toEqual([4, 8, 9]);
    expect(combinationsByLine(input).reduce(multiply)).toEqual(608902);

    expect(combinationsMerged(input)).toEqual(46173809);
    expect(combinationsMerged(example)).toEqual(71503);
  });
});

describe("Day 7", () => {
  const cardTypes = [
    "A",
    "K",
    "Q",
    "J",
    "T",
    "9",
    "8",
    "7",
    "6",
    "5",
    "4",
    "3",
    "2",
    "*",
  ].reverse();
  const cardRanks = Object.fromEntries(cardTypes.map((c, i) => [c, i]));

  const rankedBids = (withJoker?: "withJoker") =>
    overLines((lines: string[]) => {
      const handStrength = (hand: string[]) => {
        const cards: Record<string, number> = {};
        hand.forEach((c) => (cards[c] = (cards[c] ?? 0) + 1));
        const jokerCount = cards["*"] ?? 0;
        cards["*"] = 0;

        let [first, second] = Object.values(cards).sort((a, b) => b - a);
        first += jokerCount;
        if (first == 5) return 7;
        if (first == 4) return 6;
        if (first == 3 && second == 2) return 5;
        if (first == 3) return 4;
        if (first == 2 && second == 2) return 3;
        if (first == 2) return 2;
        if (first == 1) return 1;
        return 0;
      };

      const hands = lines.map((l) => {
        let [handStr, bidStr] = l.split(" ");
        if (withJoker) handStr = handStr.replaceAll("J", "*");
        const hand = handStr.split("");
        const rank = [
          handStrength(hand),
          ...hand.map((c) => cardRanks[c]),
        ].reverse();
        const rankPacked = rank.reduce((r, x, i) => r | (x << (i * 4)), 0);

        return [rankPacked, Number(bidStr)] as const;
      });

      return hands.sort(([a], [b]) => a - b).map((h) => h[1]);
    });

  test("**", async () => {
    const example = `
32T3K 765
T55J5 684
KK677 28
KTJJT 220
QQQJA 483`;
    const input = await fetchInput(7);

    expect(rankedBids()(example)).toEqual([765, 220, 28, 684, 483]);
    const handWinning = (r: number, bid: number, i: number): number =>
      r + bid * (i + 1);
    expect(rankedBids()(example).reduce(handWinning)).toEqual(6440);
    expect(rankedBids()(input).reduce(handWinning)).toEqual(248217452);

    expect(rankedBids("withJoker")(example)).toEqual([765, 28, 684, 483, 220]);
    expect(rankedBids("withJoker")(example).reduce(handWinning)).toEqual(5905);
    expect(rankedBids("withJoker")(input).reduce(handWinning)).toEqual(
      245576185
    );
  });
});

describe("Day 8", () => {
  const gcd = (a: number, b: number) => {
    if (a < b) [a, b] = [b, a];
    while (b > 0) [a, b] = [b, a % b];
    return a;
  };

  const countSteps = (amGhost?: "amGhost") =>
    overLines(([directionLine, , ...mapLines]: string[]) => {
      const directions = directionLine.split("").map((d) => Number(d == "R"));

      const map = new Map<string, [string, string]>();
      mapLines.forEach((l) => {
        const [node, left, right] = l.match(/[0-9A-Z]{3}/g)!;
        map.set(node, [left, right]);
      });
      let nodes = [...map.keys()].filter((n) =>
        amGhost ? n.endsWith("A") : n == "AAA"
      );

      const steps = nodes.map((node) => {
        let step = 0;
        while (!node.endsWith("Z")) {
          const dir = directions[step++ % directions.length];
          node = map.get(node)![dir];
        }
        return step;
      });
      const stepsGcd = steps.reduce(gcd);
      return steps.reduce((r, s) => r * (s / stepsGcd), stepsGcd);
    });

  test("**", async () => {
    const example1 = `
LLR

AAA = (BBB, BBB)
BBB = (AAA, ZZZ)
ZZZ = (ZZZ, ZZZ)`;
    const input = await fetchInput(8);

    expect(countSteps()(example1)).toEqual(6);
    expect(countSteps()(input)).toEqual(21883);

    const example2 = `
LR

11A = (11B, XXX)
11B = (XXX, 11Z)
11Z = (11B, XXX)
22A = (22B, XXX)
22B = (22C, 22C)
22C = (22Z, 22Z)
22Z = (22B, 22B)
XXX = (XXX, XXX)`;

    expect(countSteps("amGhost")(example2)).toEqual(6);
    expect(countSteps("amGhost")(input)).toEqual(12833235391111);
  });
});

describe("Day 9", () => {
  const extrapolate = (dir: "forward" | "backward") =>
    mapLines((seqStr: string) => {
      const sequences = [seqStr.split(" ").map(Number)];

      for (let i = 0; i < sequences[0].length; i++)
        for (let seqN = 1; seqN <= i; seqN++) {
          const deriv = (sequences[seqN] ??= []);
          const derivI = i - seqN;

          const base = sequences[seqN - 1];
          const baseI = derivI + 1;

          deriv[derivI] = base[baseI] - base[baseI - 1];
        }

      if (dir == "forward") {
        const targetLength = sequences[0].length + 1;
        for (let i = sequences.length; i < targetLength; i++)
          for (let seqN = sequences.length - 2; seqN >= 0; seqN--) {
            const base = sequences[seqN];
            const baseI = i - seqN;

            const deriv = sequences[seqN + 1];
            const derivI = baseI - 1;

            deriv[derivI] ??= deriv[derivI - 1] ?? 0;

            base[baseI] = base[baseI - 1] + deriv[derivI];
          }

        return sequences[0][sequences[0].length - 1];
      } else {
        let baseValue = 0;
        for (let seqN = sequences.length - 2; seqN >= 0; seqN--)
          baseValue = sequences[seqN][0] - baseValue;
        return baseValue;
      }
    });

  test("**", async () => {
    const example = `
0 3 6 9 12 15
1 3 6 10 15 21
10 13 16 21 30 45
2 2 2 15 80 277 753 1775 3836 7847 15459 29588 55294 101364 183419 330383 598182`;
    const input = await fetchInput(9);

    expect(extrapolate("forward")(example)).toEqual([18, 28, 68, 1098304]);
    expect(extrapolate("forward")(input).reduce(add)).toEqual(1934898178);

    expect(extrapolate("backward")(example)).toEqual([-3, 0, 5, 3]);
    expect(extrapolate("backward")(input).reduce(add)).toEqual(1129);
  });
});

describe("Day 10", () => {
  type Direction = "up" | "down" | "left" | "right";
  const directions: Record<
    Direction,
    { d: [number, number]; pipes: Record<string, Direction> }
  > = {
    up: { d: [-1, 0], pipes: { "|": "up", "7": "left", F: "right" } },
    down: { d: [1, 0], pipes: { "|": "down", J: "left", L: "right" } },
    left: { d: [0, -1], pipes: { "-": "left", L: "up", F: "down" } },
    right: { d: [0, 1], pipes: { "-": "right", J: "up", "7": "down" } },
  };
  const loopLength = overLines((lines: string[]) => {
    const pipes = lines.map((l) => l.split(""));

    let [startRow, startCol] = [0, 0];

    outer: while (startRow++ < pipes.length)
      for (startCol = 0; startCol < pipes[startRow].length; startCol++)
        if (pipes[startRow][startCol] == "S") break outer;

    let [row, col] = [startRow, startCol];
    let distance = 0;
    let direction: Direction | undefined;
    const distanceLimit = pipes[0].length * pipes.length;
    outer: while (distance++ < distanceLimit) {
      const dirs = direction
        ? [directions[direction]]
        : Object.values(directions);
      for (const dir of dirs) {
        const [r, c] = [row + dir.d[0], col + dir.d[1]];
        if (pipes[r][c] == "S") return distance / 2;
        const nextDir = dir.pipes[pipes[r][c]];
        if (!nextDir) continue;
        [row, col] = [r, c];
        direction = nextDir;
        pipes[row][col] = String(distance % 10);
        // console.log(pipes.map((r) => r.join("")).join("\n") + "\n");
        continue outer;
      }
      throw "stuck";
    }
    while (startRow != row || startCol != col);
    throw "lost";
  });

  test("*", async () => {
    const example = `
7-F7-
.FJ|7
SJLL7
|F--J
LJ.LJ`;
    const input = await fetchInput(10);

    expect(loopLength(example)).toEqual(8);
    expect(loopLength(input)).toEqual(6701);
  });
});

/*
describe("Day ", () => {
  test("*", async () => {
    const example = `
`;
    const input = await fetchInput();

    expect(solution(example)).toEqual([]);
    expect(solution(input).reduce(add)).toEqual(0);
  });
});

*/
