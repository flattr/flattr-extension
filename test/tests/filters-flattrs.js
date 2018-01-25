"use strict";

const {assert, expect} = require("../assert");

const {
  filterFlattrsForURLs
} = require("../../src/lib/background/state/filters/flattrs");

describe("Test lib/common/filters/flattrs", () =>
{
  it("filterForURLs only returns urls", () =>
  {
    let actual = filterFlattrsForURLs([
      {url: "foo", entity: "bar", timestamp: 0}
    ]);
    expect(actual[0]).to.have.property("url");
    expect(actual[0]).to.not.have.property("entity");
    expect(actual[0]).to.not.have.property("timestamp");
  });

  it("filterForURLs throws for non arrays", () =>
  {
    assert.throws(() =>
    {
      filterFlattrsForURLs();
    }, "flattrs argument must be an array");

    assert.throws(() =>
    {
      filterFlattrsForURLs({});
    }, "flattrs argument must be an array");

    assert.throws(() =>
    {
      filterFlattrsForURLs(arguments);
    }, "flattrs argument must be an array");
  });
});
