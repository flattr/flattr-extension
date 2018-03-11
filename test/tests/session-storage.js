"use strict";

const requireInject = require("require-inject");

const {localforage} = require("../mocks/localforage");
const {Window} = require("../mocks/window");
const {removeAllDatabases} = require("../mocks/dexie");
const chrome = require("sinon-chrome");

const {expect} = require("../assert");
const {spawn} = require("../utils");

const {
  ATTENTION_THRESHOLDS,
  STATUS_ENABLED
} = require("../../src/lib/common/constants");
const MOCK_ENTITY = "example.com";

function createMockStorage({presets})
{
  let submissions = [];

  let win = new Window();
  win.setTimeout = setTimeout;

  function getDatabase(name)
  {
    return requireInject(
      "../../src/lib/background/database/" + name,
      {
        "global/window": win
      }
    );
  }

  let {db: flattrsDb} = getDatabase("flattrs");
  let {db: sessionDb} = getDatabase("session");

  let deps = {
    localforage,
    "../../src/data/domains": presets,
    "../../src/lib/background/database/flattrs": {db: flattrsDb},
    "../../src/lib/background/database/session": {db: sessionDb},
    "../../src/lib/common/env/chrome": {chrome},
    "global/window": win,
    "../../src/lib/background/server/api": {
      sendFlattrs: () => Promise.resolve({ok: true})
    }
  };

  let flattrManager = requireInject(
    "../../src/lib/background/flattrManager",
    deps
  );

  function submitWrapper(func)
  {
    return (data) =>
    {
      if (data.url)
      {
        submissions.push(data.url);
      }
      return func(data);
    };
  }

  flattrManager.assign = submitWrapper(flattrManager.assign);
  flattrManager.submit = submitWrapper(flattrManager.submit);

  deps = Object.assign({}, deps);
  deps["../../src/lib/background/flattrManager"] = flattrManager;

  let storage = requireInject(
    "../../src/lib/background/session/storage",
    deps
  );

  return {storage, flattrsDb, sessionDb, submissions};
}

describe("Test session storage", () =>
{
  let mockEntity = MOCK_ENTITY;
  let mockStatus = {
    com: {
      example: STATUS_ENABLED
    }
  };
  let mockUrl = "http://example.com/";

  beforeEach(removeAllDatabases);
  after(removeAllDatabases);

  it("Should update tab page", () =>
  {
    const {
      storage: {getPage, updatePage}
    } = createMockStorage({
      presets: {
        author: [],
        status: {}
      }
    });

    return spawn(function*()
    {
      yield updatePage(1, {url: undefined});
      expect(getPage(1)).to.equal(undefined);

      yield updatePage(1, {url: `${mockUrl}a`});
      expect(getPage(1)).to.deep.equal({
        attention: 0,
        entity: mockEntity,
        title: undefined,
        url: `${mockUrl}a`
      });

      yield updatePage(1, {title: "A"});
      expect(getPage(1)).to.deep.equal({
        attention: 0,
        entity: mockEntity,
        title: "A",
        url: `${mockUrl}a`
      });

      yield updatePage(1, {title: "AA"});
      expect(getPage(1)).to.deep.equal({
        attention: 0,
        entity: mockEntity,
        title: "AA",
        url: `${mockUrl}a`
      });

      yield updatePage(1, {url: `${mockUrl}aa`});
      expect(getPage(1)).to.deep.equal({
        attention: 0,
        entity: mockEntity,
        title: undefined,
        url: `${mockUrl}aa`
      });

      yield updatePage(1, {url: undefined});
      expect(getPage(1)).to.equal(undefined);
    });
  });

  it("Should save session changes if enabled", () =>
  {
    const {
      storage:
      {
        addAttention, getPage, removePage, updatePage
      },
      sessionDb
    } = createMockStorage(
      {
        presets:
        {
          author: [],
          status: mockStatus
        }
      }
    );

    return spawn(function*()
    {
      yield updatePage(1, {title: "A", url: `${mockUrl}a`});
      yield addAttention(1, `${mockUrl}a`, 11);

      expect(getPage(1)).to.deep.equal({
        attention: 11,
        entity: mockEntity,
        title: "A",
        url: `${mockUrl}a`
      });

      yield updatePage(1, {title: "AA", url: `${mockUrl}aa`});
      yield addAttention(1, `${mockUrl}aa`, 22);

      expect(getPage(1)).to.deep.equal({
        attention: 22,
        entity: mockEntity,
        title: "AA",
        url: `${mockUrl}aa`
      });

      yield updatePage(2, {title: "B", url: `${mockUrl}b`});
      yield updatePage(3, {title: "C", url: `${mockUrl}c`});
      yield removePage(2);

      expect(getPage(2)).to.equal(undefined);
      expect(getPage(3)).to.deep.equal({
        attention: 0,
        entity: mockEntity,
        title: "C",
        url: `${mockUrl}c`
      });

      let pages = yield sessionDb.pages.toArray();
      expect(pages).to.deep.equal([
        {
          attention: 11,
          entity: mockEntity,
          manualAttention: 0,
          title: "A",
          url: `${mockUrl}a`
        },
        {
          attention: 22,
          entity: mockEntity,
          manualAttention: 0,
          title: "AA",
          url: `${mockUrl}aa`
        },
        {
          attention: 0,
          entity: mockEntity,
          manualAttention: 0,
          title: "B",
          url: `${mockUrl}b`
        },
        {
          attention: 0,
          entity: mockEntity,
          manualAttention: 0,
          title: "C",
          url: `${mockUrl}c`
        }
      ]);
    });
  });

  it("Should not save session changes if disabled", () =>
  {
    const {
      sessionDb,
      storage: {addAttention, updatePage}
    } = createMockStorage(
      {
        presets: {
          author: [],
          status: {}
        }
      }
    );

    return spawn(function*()
    {
      yield updatePage(1, {title: "A", url: `${mockUrl}a`});
      yield addAttention(1, `${mockUrl}a`, 1);

      let pageCount = yield sessionDb.pages.count();
      expect(pageCount).to.equal(0);
    });
  });

  it("Should submit an automatic Flattr", () =>
  {
    const {
      storage: {addAttention, updatePage},
      submissions
    } = createMockStorage({
      presets: {
        status: mockStatus
      }
    });

    return spawn(function*()
    {
      yield updatePage(1, {url: mockUrl});

      yield addAttention(1, mockUrl, 1);
      expect(submissions.length).to.equal(0);

      yield addAttention(1, mockUrl, Infinity);
      expect(submissions).to.deep.equal([mockUrl]);
    });
  });

  it("Should submit a manual Flattr", () =>
  {
    const {
      storage: {
        addAttention, fastForward, getPage, updatePage
      },
      flattrsDb, sessionDb, submissions
    } = createMockStorage(
      {
        presets: {
          author: [],
          status: mockStatus
        }
      }
    );

    return spawn(function*()
    {
      const attention = 10;
      const start = Date.now();
      const url = `${mockUrl}foo-session-storage`;
      let entity = mockEntity;
      let title = "FOO";

      yield updatePage(1, {title: "FOO", url});
      yield addAttention(1, url, attention);

      expect(getPage(1)).to.deep.equal({attention, entity, title, url});

      yield fastForward(1);

      expect(ATTENTION_THRESHOLDS[0]).to.be.at.least(attention);
      let pages = yield sessionDb.pages.toArray();
      expect(pages).to.deep.equal([{
        attention, entity, title, url,
        manualAttention: ATTENTION_THRESHOLDS[0] - attention
      }]);

      let flattrs = yield flattrsDb.flattrs.where("url").equals(url).toArray();

      expect(flattrs.length).to.equal(1);

      let flattr = flattrs[0];

      expect(flattr.url).to.equal(url);
      expect(flattr.entity).to.equal(entity);
      expect(flattr.title).to.equal(title);
      expect(flattr.timestamps.length).to.equal(1);
      expect(flattr.timestamps[0]).to.be.above(start);

      expect(submissions).to.deep.equal([url]);
    });
  });

  it("Should reset data", () =>
  {
    const url = "http://example.com/";
    const {
      storage: {getPage, reset, updatePage},
      sessionDb
    } = createMockStorage(
      {
        presets: {
          author: [],
          status: mockStatus
        }
      }
    );

    return spawn(function*()
    {
      yield updatePage(1, {url});
      expect(getPage(1).url).to.equal(url);

      let pages = yield sessionDb.pages.count();
      expect(pages).to.equal(1);


      yield reset();
      expect(getPage(1)).to.equal(undefined);

      pages = yield sessionDb.pages.count();
      expect(pages).to.equal(0);
    });
  });
});
