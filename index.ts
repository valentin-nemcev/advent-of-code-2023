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

describe("Day 1", () => {
  function calibrationValue(line: string) {
    const matchDigit = (c: string) => ("1" <= c && c <= "9" ? Number(c) : 0);

    let left = 0;
    for (let i = 0; i < line.length; i++)
      if ((left = matchDigit(line[i]) ?? left)) break;

    let right = 0;
    for (let i = line.length - 1; i >= 0; i--)
      if ((right = matchDigit(line[i]) ?? right)) break;

    return left * 10 + right;
  }

  function part1(input: string) {
    const lines = input.split("\n");
    return lines.map(calibrationValue).reduce((a, b) => a + b);
  }

  test("*", async () => {
    const example = `1abc2
pqr3stu8vwx
a1b2c3d4e5f
treb7uchet`;

    expect(example.split("\n").map(calibrationValue)).toEqual([12, 38, 15, 77]);
    expect(part1(example)).toEqual(142);

    expect(part1(await fetchInput(1))).toBe(55108);
  });
});
