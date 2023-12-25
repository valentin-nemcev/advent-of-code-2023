import { describe, expect, test } from "bun:test";

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

  test("*", () => {
    const example = `1abc2
pqr3stu8vwx
a1b2c3d4e5f
treb7uchet`;

    expect(example.split("\n").map(calibrationValue)).toEqual([12, 38, 15, 77]);
    expect(part1(example)).toEqual(142);
  });
});
