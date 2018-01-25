"use strict";

const requireInject = require("require-inject");

const {removeAllDatabases} = require("../mocks/dexie");
const {Window} = require("../mocks/window");
const {expect} = require("../assert");
const {spawn} = require("../utils");

let dbFlattrs = [
  {
    entity: "foo",
    timestamps: [1],
    url: "bar"
  },
  {
    entity: "foo",
    timestamps: [2, 4],
    url: "foo"
  },
  {
    entity: "foo",
    timestamps: [5],
    url: ""
  },
  {
    entity: "bar",
    timestamps: [3],
    url: ""
  }
];

let win = new Window();

const {db} = requireInject("../../src/lib/background/database/flattrs", {
  "global/window": win
});

const {query} = requireInject(
  "../../src/lib/background/flattrManager",
  {
    "global/window": win,
    "../../src/lib/background/database/flattrs": {db},
    "../../src/lib/common/utils": {
      normalizeURL: (url) => url
    },
    "../../src/lib/background/state": {
      store: {
        dispatch() {}
      }
    }
  }
);

function checkFlattrs(flattrs, expected)
{
  flattrs = flattrs.map(({timestamps}) => timestamps);
  flattrs = Array.prototype.concat.apply([], flattrs);
  flattrs.sort((a, b) => a - b);
  expect(flattrs).to.deep.equal(expected);
}

describe("Test flattr manager", () =>
{
  before(() => db.flattrs.bulkPut(dbFlattrs));
  after(removeAllDatabases);

  it("Should collect flattrs", () =>
  {
    return spawn(function*()
    {
      let result = yield query({entity: "foo", flattrs: true, start: 0});
      checkFlattrs(result.flattrs, [1, 2, 4, 5]);

      result = yield query({entity: "foo", flattrs: true, start: 4});
      checkFlattrs(result.flattrs, [4, 5]);
    });
  });

  it("Should count flattrs", () =>
  {
    return spawn(function*()
    {
      let result = yield query({count: true, entity: "foo", start: 0});
      expect(result.count).to.equal(4);

      result = yield query({count: true, entity: "foo", start: 4});
      expect(result.count).to.equal(2);
    });
  });
});
