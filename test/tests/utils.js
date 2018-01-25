"use strict";

const requireInject = require("require-inject");
const {expect} = require("chai");

const {Window} = require("../mocks/window");

describe("Test utility functions", () =>
{
  let window = new Window();
  const {normalizeURL} = requireInject("../../src/lib/common/utils", {
    "global/window": window,
    "../../src/lib/common/env/chrome": {chrome: {}}
  });

  it("Should remove personally identifiable information from URL", () =>
  {
    function compare(url, expected)
    {
      expect(normalizeURL(url)).to.be.equal(expected);
    }

    compare("http://foo.com", "http://foo.com/");
    compare("http://ABC:DEF@foo.com:80/abc/def?ghi=jkl&v=V#mno",
        "http://foo.com:80/abc/def");
    compare("http://www.youtube.com/watch?a=A&v=V&b=B",
        "http://www.youtube.com/watch?v=V");
  });

  it("Should correctly compare versions", () =>
  {
    const {compareVersions} = require("../../src/lib/common/compare");

    expect(compareVersions("1", "1")).to.be.equal(0);
    expect(compareVersions("1", "2")).to.be.below(0);
    expect(compareVersions("2", "1")).to.be.above(0);
    expect(compareVersions("1.2", "2.1")).to.be.below(0);
    expect(compareVersions("1", "1.0.0")).to.be.equal(0);
    expect(compareVersions("1", "1.1")).to.be.below(0);
    expect(compareVersions("1.1", "1")).to.be.above(0);
    expect(compareVersions("0.1", "0.0.1")).to.be.above(0);
    expect(compareVersions("1", "0.0.0.0.0.1")).to.be.above(0);
  });

  it("Should reject invalid URLs", () =>
  {
    function expectError(url, type)
    {
      let err = null;
      try
      {
        normalizeURL(url);
      }
      catch (ex)
      {
        err = ex;
      }
      expect(err).to.be.instanceof(type);
    }

    expectError(null, TypeError);
    expectError("", TypeError);
    expectError("foo", URIError);
    expectError("http://127.0.0.1", URIError);
    expectError("http://foo.flattr", URIError);
    expectError("http://co.uk", URIError);
    expectError("ftp://www.example.com/", URIError);
  });

  it("Should correctly compare versions", () =>
  {
    const {compareVersions} = require("../../src/lib/common/compare");

    expect(compareVersions("1", "1")).to.be.equal(0);
    expect(compareVersions("1", "2")).to.be.below(0);
    expect(compareVersions("2", "1")).to.be.above(0);
    expect(compareVersions("1.2", "2.1")).to.be.below(0);
    expect(compareVersions("1", "1.0.0")).to.be.equal(0);
    expect(compareVersions("1", "1.1")).to.be.below(0);
    expect(compareVersions("1.1", "1")).to.be.above(0);
    expect(compareVersions("0.1", "0.0.1")).to.be.above(0);
    expect(compareVersions("1", "0.0.0.0.0.1")).to.be.above(0);
  });
});
