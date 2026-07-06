import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvToObjects, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("parses simple comma-separated rows", () => {
    const rows = parseCsv("a,b,c\n1,2,3");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing commas and newlines", () => {
    const rows = parseCsv('name,body\n"Taro","Great app, love it!"\n"Jiro","Line1\nLine2"');
    expect(rows).toEqual([
      ["name", "body"],
      ["Taro", "Great app, love it!"],
      ["Jiro", "Line1\nLine2"],
    ]);
  });

  it("parses CSV rows into objects keyed by header", () => {
    const objects = parseCsvToObjects("appId,rating,body\n123,5,Great app");
    expect(objects).toEqual([{ appId: "123", rating: "5", body: "Great app" }]);
  });

  it("round-trips through toCsv and parseCsv", () => {
    const csv = toCsv(["a", "b"], [["hello, world", "line1\nline2"]]);
    const rows = parseCsv(csv);
    expect(rows[1]).toEqual(["hello, world", "line1\nline2"]);
  });
});
