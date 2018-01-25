"use strict";

const {
  sortNumberStrings,
  sortTimestamped
} = require("../../src/lib/common/sort");

const {expect} = require("../assert");

const ASCENDING = ["1", "2", "3", "4", "5"];
const DESCENDING = ["5", "4", "3", "2", "1"];

describe("Test lib/common/sort", () =>
{
  it("sortNumberStrings() does not change a sorted array", () =>
  {
    let actual = ASCENDING.slice();
    actual.sort(sortNumberStrings());
    expect(actual).to.deep.equal(ASCENDING);
  });

  it("sortNumberStrings() sorts backwards array", () =>
  {
    let actual = DESCENDING.slice();
    actual.sort(sortNumberStrings());
    expect(actual).to.deep.equal(ASCENDING);
  });

  it("sortNumberStrings() sorts numbers and strings", () =>
  {
    let expected = [1, "2", 3, "4", "5"];
    let actual = ["2", 3, "4", "5", 1];
    actual.sort(sortNumberStrings());
    expect(actual).to.deep.equal(expected);
  });

  it("sortNumberStrings() sorts arrays", () =>
  {
    let actual = ["2", "3", "4", "5", "1"];
    actual.sort(sortNumberStrings());
    expect(actual).to.deep.equal(ASCENDING);

    actual = ["2", "5", "4", "3", "1"];
    actual.sort(sortNumberStrings());
    expect(actual).to.deep.equal(ASCENDING);
  });

  it("sortNumberStrings() sorts handles falsey desc argument", () =>
  {
    let actual = ["2", "3", "4", "5", "1"];
    actual.sort(sortNumberStrings(false));
    expect(actual).to.deep.equal(ASCENDING);

    actual = ["2", "5", "4", "3", "1"];
    actual.sort(sortNumberStrings(null));
    expect(actual).to.deep.equal(ASCENDING);

    actual = ["2", "5", "3", "4", "1"];
    actual.sort(sortNumberStrings(0));
    expect(actual).to.deep.equal(ASCENDING);
  });

  it("sortNumberStrings() sorts arrays in desc order", () =>
  {
    let actual = ["2", "3", "4", "5", "1"];
    actual.sort(sortNumberStrings(true));
    expect(actual).to.deep.equal(DESCENDING);

    actual = ["2", "5", "4", "3", "1"];
    actual.sort(sortNumberStrings(true));
    expect(actual).to.deep.equal(DESCENDING);
  });

  it("sortNumberStrings() sorts handles truthy desc argument", () =>
  {
    let actual = ["2", "3", "4", "5", "1"];
    actual.sort(sortNumberStrings(1));
    expect(actual).to.deep.equal(DESCENDING);
  });

  it("sortNumberStrings() handles duplicates", () =>
  {
    let expected = ["1", "2", "2", "3", "5"];
    let actual = ["2", "3", "2", "5", "1"];
    actual.sort(sortNumberStrings());
    expect(actual).to.deep.equal(expected);
  });

  it("sortNumberStrings() handles single item", () =>
  {
    let expected = ["2"];
    let actual = ["2"];
    actual.sort(sortNumberStrings());
    expect(actual).to.deep.equal(expected);
  });

  it("sortNumberStrings() handles empty array", () =>
  {
    let expected = [];
    let actual = [];
    actual.sort(sortNumberStrings());
    expect(actual).to.deep.equal(expected);
  });

  it("sortTimestamped() doesn't sort arrays without timestamps", () =>
  {
    let actual = ["foo", "bar", "baz"];
    let expected = actual.slice();
    actual.sort(sortTimestamped());
    expect(actual).to.deep.equal(expected);
  });

  it("sortTimestamped() sorts arrays in correct order", () =>
  {
    let prototype = [{timestamp: 2}, {timestamp: 3}, {timestamp: 1}];

    let actual = prototype.slice();
    actual.sort(sortTimestamped(false));
    expect(actual).to.deep.equal([
      {timestamp: 1},
      {timestamp: 2},
      {timestamp: 3}
    ]);

    actual = prototype.slice();
    actual.sort(sortTimestamped(true));
    expect(actual).to.deep.equal([
      {timestamp: 3},
      {timestamp: 2},
      {timestamp: 1}
    ]);
  });
});
