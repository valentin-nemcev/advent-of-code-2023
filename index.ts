import { describe, expect, test } from "bun:test";

describe("Day 1", () => {
  function calibrationValue(line: string) {
    let left = 0;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if ("1" <= char && char <= "9") {
        left = Number(char);
        break;
      }
    }

    let right = 0;
    for (let i = line.length - 1; i >= 0; i--) {
      const char = line[i];
      if ("1" <= char && char <= "9") {
        right = Number(char);
        break;
      }
    }
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
