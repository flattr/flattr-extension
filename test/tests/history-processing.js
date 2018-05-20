"use strict";

const requireInject = require("require-inject");
const chrome = require("sinon-chrome");
const sinon = require("sinon");

const {HISTORY_CONDITIONS} = require("../../src/lib/common/constants");
const {Window} = require("../mocks/window");
const {expect} = require("../assert");

const MIN_S = 60; // 00:01:00
const HOUR_S = 60 * MIN_S; // 01:00:00
const DAY_S = 24 * HOUR_S; // 24:00:00
const mockEntity = "example.com";
const mockUrl = "http://www.example.com";
const mockUrlVideo = "http://www.youtube.com";
const [long, short] = HISTORY_CONDITIONS;

let {db} = requireInject("../../src/lib/background/database/visits", {
  "global/window": new Window()
});

function checkFlattrs(localHistory, chromeHistory, expected)
{
  let history = new Map();
  for (let [visitTime, visitId, transition, url] of chromeHistory)
  {
    let visits = history.get(url);
    if (!visits)
    {
      visits = [];
      history.set(url, visits);
    }

    visits.push({transition, visitId, visitTime});
  }

  let historyItems = Array.from(history.keys())
    .map((url) => ({url}));
  chrome.history.search.yields(historyItems);

  for (let [url, visits] of history)
  {
    chrome.history.getVisits.withArgs({url}).yields(visits);
  }

  let {
    processHistory
  } = requireInject("../../src/lib/background/history/processor", {
    "../../src/lib/background/database/visits": {db},
    "../../src/lib/common/env/chrome": {chrome}
  });

  if (!localHistory)
  {
    localHistory = chromeHistory.map(([timestamp]) => timestamp);
  }

  let timestamps = localHistory.map((timestamp) => ({timestamp}));
  return db.visits.bulkAdd(timestamps)
    .then(() => processHistory(0))
    .then((flattrVisits) => expect(flattrVisits).to.deep.equal(expected));
}

function expectLong()
{
  expect(long.period).to.be.at.least(4 * DAY_S);
  expect(long.timeout).to.be.at.most(DAY_S);
  expect(long.visitCount).to.equal(3);
}

function expectShort()
{
  expect(short.entityTimeout).to.be.at.most(MIN_S);
  expect(short.period).to.be.at.least(5 * MIN_S);
  expect(short.timeout).to.be.at.most(MIN_S);
  expect(short.visitCount).to.equal(4);
}

describe("Test history processing", () =>
{
  beforeEach(() =>
  {
    db.visits.clear();
    chrome.storage.local.get.withArgs(
      "domains.lastUpdated",
      sinon.match.func
    ).yields({
      "domains.lastUpdated": Date.now()
    });
  });
  afterEach(() => chrome.flush());
  after(() => db.delete());

  it("Should flattr visits over long periods", () =>
  {
    expectLong();

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "typed", `${mockUrl}/`],
        [1480086400000, "1", "typed", `${mockUrl}/`],
        [1480172800000, "1", "typed", `${mockUrl}/`]
      ],
      [mockEntity]
    );
  });

  it("Should flattr visits over short periods", () =>
  {
    expectShort();

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "typed", `${mockUrl}/`],
        [1480000060000, "2", "link", `${mockUrl}/myarticle1`],
        [1480000120000, "3", "link", `${mockUrl}/myarticle2`],
        [1480000180000, "4", "link", `${mockUrl}/myarticle3`]
      ],
      [mockEntity]
    );
  });

  it("Should consider visit for each condition", () =>
  {
    expectLong();
    expectShort();

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "typed", `${mockUrl}/`],
        [1480000060000, "2", "link", `${mockUrl}/myarticle1`],
        [1480000120000, "3", "link", `${mockUrl}/myarticle2`],
        [1480000180000, "4", "link", `${mockUrl}/myarticle3`],
        [1480086400000, "5", "typed", `${mockUrl}/`],
        [1480172800000, "6", "typed", `${mockUrl}/`]
      ],
      [mockEntity, mockEntity]
    );
  });

  it("Shouldn't flattr multi-author domains", () =>
  {
    expectLong();
    expectShort();

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "typed", `${mockUrlVideo}`],
        [1480000060000, "2", "link", `${mockUrlVideo}/myvideo1`],
        [1480000120000, "3", "link", `${mockUrlVideo}/myvideo2`],
        [1480000180000, "4", "link", `${mockUrlVideo}/myvideo3`],
        [1480086400000, "5", "typed", `${mockUrlVideo}`],
        [1480172800000, "6", "typed", `${mockUrlVideo}`]
      ],
      []
    );
  });

  it("Should ignore visits with irrelevant transition types", () =>
  {
    expect(short.entityTimeout).to.be.at.most(50);
    expect(short.period).to.be.at.least(15 * MIN_S);
    expect(short.timeout).to.be.at.most(50);
    expect(short.visitCount).to.be.at.most(4);

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "auto_subframe", `${mockUrl}/`],
        [1480000050000, "2", "auto_subframe", `${mockUrl}/`],
        [1480000100000, "3", "auto_subframe", `${mockUrl}/`],
        [1480000150000, "4", "auto_subframe", `${mockUrl}/`],
        [1480000200000, "5", "auto_toplevel", `${mockUrl}/`],
        [1480000250000, "6", "auto_toplevel", `${mockUrl}/`],
        [1480000300000, "7", "auto_toplevel", `${mockUrl}/`],
        [1480000350000, "8", "auto_toplevel", `${mockUrl}/`],
        [1480000400000, "9", "form_submit", `${mockUrl}/`],
        [1480000450000, "10", "form_submit", `${mockUrl}/`],
        [1480000500000, "11", "form_submit", `${mockUrl}/`],
        [1480000550000, "12", "form_submit", `${mockUrl}/`],
        [1480000600000, "13", "reload", `${mockUrl}/`],
        [1480000650000, "14", "reload", `${mockUrl}/`],
        [1480000700000, "15", "reload", `${mockUrl}/`],
        [1480000750000, "16", "reload", `${mockUrl}/`]
      ],
      []
    );
  });

  it("Should create multiple flattrs per condition", () =>
  {
    expectShort();

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "typed", `${mockUrl}/`],
        [1480000060000, "2", "link", `${mockUrl}/myarticle1`],
        [1480000120000, "3", "link", `${mockUrl}/myarticle2`],
        [1480000180000, "4", "link", `${mockUrl}/myarticle3`],
        [1480000240000, "5", "link", `${mockUrl}/myarticle4`],
        [1480000300000, "6", "link", `${mockUrl}/myarticle5`],
        [1480000360000, "7", "link", `${mockUrl}/myarticle6`],
        [1480000420000, "8", "link", `${mockUrl}/myarticle7`]
      ],
      [mockEntity, mockEntity]
    );
  });

  it("Should ignore visits that have not been recorded", () =>
  {
    expectShort();

    return checkFlattrs(
      [1480000000000, 1480000120000, 1480000240000, 1480000360000],
      [
        [1480000000000, "1", "typed", `${mockUrl}/`],
        [1480000060000, "2", "link", `${mockUrl}/myarticle1`],
        [1480000120000, "3", "link", `${mockUrl}/myarticle2`],
        [1480000180000, "4", "link", `${mockUrl}/myarticle3`],
        [1480000240000, "5", "link", `${mockUrl}/myarticle4`],
        [1480000300000, "6", "link", `${mockUrl}/myarticle5`],
        [1480000360000, "7", "link", `${mockUrl}/myarticle6`],
        [1480000420000, "8", "link", `${mockUrl}/myarticle7`]
      ],
      [mockEntity]
    );
  });

  it("Should consider visits with relevant transition types", () =>
  {
    expect(short.entityTimeout).to.be.at.most(50);
    expect(short.period).to.be.at.least(7 * MIN_S);
    expect(short.timeout).to.be.at.most(50);
    expect(short.visitCount).to.equal(4);

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "link", `${mockUrl}/`],
        [1480000050000, "2", "typed", `${mockUrl}/`],
        [1480000100000, "3", "auto_bookmark", `${mockUrl}/`],
        [1480000150000, "4", "manual_subframe", `${mockUrl}/`],
        [1480000200000, "5", "generated", `${mockUrl}/`],
        [1480000250000, "6", "keyword", `${mockUrl}/`],
        [1480000300000, "7", "keyword_generated", `${mockUrl}/`],
        [1480000350000, "8", "link", `${mockUrl}/`]
      ],
      [mockEntity, mockEntity]
    );
  });

  it("Should ignore visits that occur within timeout", () =>
  {
    expect(long.period).to.be.at.least(4 * DAY_S);
    expect(long.timeout).to.be.at.least(HOUR_S);
    expect(long.visitCount).to.equal(3);
    expect(short.entityTimeout).to.be.at.most(MIN_S);
    expect(short.period).to.be.at.least(5 * MIN_S);
    expect(short.timeout).to.be.at.least(10);
    expect(short.visitCount).to.equal(4);

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "typed", `${mockUrl}`],
        [1480000060000, "2", "link", `${mockUrl}/myarticle1`],
        [1480000120000, "3", "link", `${mockUrl}/myarticle2`],
        [1480000130000, "4", "link", `${mockUrl}/myarticle3`],
        [1480086400000, "5", "typed", `${mockUrl}`],
        [1480090000000, "6", "typed", `${mockUrl}`]
      ],
      []
    );
  });

  it("Should ignore visits that occur within entity timeout", () =>
  {
    expect(short.entityTimeout).to.be.at.least(4);
    expect(short.entityTimeout).to.be.below(short.timeout);
    expect(short.period).to.be.at.least(5 * MIN_S);
    expect(short.timeout).to.be.at.most(15);
    expect(short.visitCount).to.equal(4);

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "typed", `${mockUrl}`],
        [1480000060000, "2", "link", `${mockUrl}/myarticle1`],
        [1480000120000, "3", "link", `${mockUrl}/myarticle2`],
        [1480000122000, "4", "link", `${mockUrl}/myarticle3`],
        [1480000124000, "5", "link", `${mockUrl}/myarticle3`],
        [1480000126000, "6", "link", `${mockUrl}/myarticle3`],
        [1480000128000, "7", "link", `${mockUrl}/myarticle3`],
        [1480000130000, "8", "link", `${mockUrl}/myarticle3`],
        [1480000132000, "9", "link", `${mockUrl}/myarticle3`],
        [1480000134000, "10", "link", `${mockUrl}/myarticle3`],
        [1480000136000, "11", "link", `${mockUrl}/myarticle3`],
        [1480000138000, "12", "link", `${mockUrl}/myarticle3`],
        [1480000140000, "13", "link", `${mockUrl}/myarticle4`]
      ],
      []
    );
  });

  it("Should ignore past visits that occurred outside period", () =>
  {
    expect(long.period).to.be.at.most(30 * DAY_S);
    expect(long.timeout).to.be.at.most(DAY_S);
    expect(long.visitCount).to.equal(3);
    expect(short.entityTimeout).to.be.at.most(MIN_S);
    expect(short.period).to.be.at.most(30 * MIN_S);
    expect(short.visitCount).to.equal(4);

    return checkFlattrs(
      null,
      [
        [1480000000000, "1", "typed", `${mockUrl}`],
        [1480000060000, "2", "link", `${mockUrl}/myarticle1`],
        [1480000120000, "3", "link", `${mockUrl}/myarticle2`],
        [1480001860000, "4", "link", `${mockUrl}/myarticle3`],
        [1480086400000, "5", "typed", `${mockUrl}`],
        [1482678400000, "6", "typed", `${mockUrl}`]
      ],
      []
    );
  });
});
