"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");

class MockDate extends Date
{
  constructor(date)
  {
    super(date || "2016-10-31T13:37:44+0000");
  }
}

const {
  getTimestamp,
  DAY_START, DAY_END, MONTHLY_START
} = requireInject("../../src/lib/common/dates", {
  "global/window": {
    Date: MockDate
  }
});

function toTimezone(date)
{
  if (!date)
    return date;

  date = new Date(`${date}+0000`);
  return date.getTime() + date.getTimezoneOffset() * 60000;
}

function checkDates(name, tests)
{
  for (let [origin, expected] of tests)
  {
    // We need to convert the dates to local time to compare them with the
    // expected values
    origin = toTimezone(origin);
    let timestamp = getTimestamp(name, origin);
    expected = toTimezone(expected);
    expect(timestamp).to.equal(expected);
  }
}

describe("Test lib/common/dates", () =>
{
  it("Should resolve DAY_START", () =>
  {
    checkDates(DAY_START, [
      [null, "2016-10-31T04:00:00"],
      ["2015-12-31T13:37:44", "2015-12-31T04:00:00"],
      ["2015-12-31T04:00:01", "2015-12-31T04:00:00"],
      ["2015-12-31T04:00:00", "2015-12-31T04:00:00"],
      ["2015-12-31T03:59:59", "2015-12-30T04:00:00"]
    ]);
  });

  it("Should resolve DAY_END", () =>
  {
    checkDates(DAY_END, [
      [null, "2016-11-01T04:00:00"],
      ["2015-12-31T13:37:44", "2016-01-01T04:00:00"],
      ["2015-12-31T04:00:01", "2016-01-01T04:00:00"],
      ["2015-12-31T04:00:00", "2016-01-01T04:00:00"],
      ["2015-12-31T03:59:59", "2015-12-31T04:00:00"]
    ]);
  });

  it("Should resolve MONTHLY_START", () =>
  {
    checkDates(MONTHLY_START, [
      [null, "2016-10-03T00:00:00"],
      ["2015-12-31T13:37:44", "2015-12-03T00:00:00"],
      ["2015-12-31T00:00:01", "2015-12-03T00:00:00"],
      ["2015-12-31T00:00:00", "2015-12-03T00:00:00"],
      ["2015-12-30T23:59:59", "2015-12-02T00:00:00"]
    ]);
  });
});
