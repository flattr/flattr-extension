"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");
const {spawn} = require("../utils");
const {ATTENTION_DURATION} = require("../../src/lib/common/constants");

function createMock({attentions, date, pages, timeouts})
{
  attentions = attentions || Object.create(null);
  date = date || {now: 0};
  pages = pages || new Map();
  timeouts = timeouts || [];

  return requireInject("../../src/lib/background/session/attention", {
    "global/window":
    {
      window:
      {
        clearTimeout(id)
        {
          timeouts.splice(timeouts.indexOf(id), 1);
        },
        setTimeout(fn, timeout, ...args)
        {
          timeouts.push(() => fn(...args));
          return fn;
        }
      },
      Date: {now: () => date.now * 1000}
    },
    "../../src/lib/background/session/storage":
    {
      addAttention(tabId, url, newAttention)
      {
        let attention = attentions[url] || 0;
        attentions[url] = attention + newAttention;
        return Promise.resolve();
      },
      getPage: (tabId) => pages.get(tabId)
    }
  });
}

describe("Test attention management", () =>
{
  it("Should manage page timers", () =>
  {
    let pages = new Map();
    let timeouts = [];
    const {select, start, stop} = createMock({pages, timeouts});

    return spawn(function*()
    {
      select(1);
      yield start(1);
      expect(timeouts.length).to.equal(0);

      pages.set(1, {url: "a"});
      yield start(1);
      expect(timeouts.length).to.equal(1);

      let timeout = timeouts[0];
      pages.set(1, {url: "b"});
      yield start(1);
      expect(timeouts.length).to.equal(1);
      expect(timeouts[0]).to.not.equal(timeout);

      timeout = timeouts[0];
      select(2);
      pages.set(2, {url: "b"});
      yield start(2);
      expect(timeouts.length).to.equal(1);
      expect(timeouts[0]).to.not.equal(timeout);

      timeout = timeouts[0];
      yield start(2);
      expect(timeouts.length).to.equal(1);
      expect(timeouts[0]).to.not.equal(timeout);

      stop(2);
      expect(timeouts.length).to.equal(0);

      select(3);
      pages.set(3, {url: "c"});
      yield start(3);
      expect(timeouts.length).to.equal(1);
      timeouts[0]();
      expect(timeouts.length).to.equal(0);

      pages.set(4, {url: "d"});
      yield start(4, "d");
      expect(timeouts.length).to.equal(0);
    });
  });

  it("Should determine attention", () =>
  {
    let attentions = Object.create(null);
    let date = {now: 0};
    let pages = new Map();
    let timeouts = [];
    const {interrupt, select, start, stop} = createMock({
      attentions, date, pages, timeouts
    });

    select(1);
    return spawn(function*()
    {
      pages.set(1, {url: "a"});
      yield start(1);
      date.now += ATTENTION_DURATION;
      timeouts[0]();

      pages.set(1, {url: "b"});
      yield start(1);
      date.now++;
      yield start(1);
      date.now++;
      yield start(1);
      date.now += ATTENTION_DURATION;
      timeouts[0]();

      pages.set(1, {url: "c"});
      yield start(1);
      date.now++;
      pages.set(1, {url: "d"});
      yield start(1);
      date.now += ATTENTION_DURATION;
      timeouts[0]();

      pages.set(1, {url: "e"});
      yield start(1);
      date.now++;
      stop(1);

      pages.set(1, {url: "f"});
      yield start(1);
      date.now++;
      yield interrupt(1);
      date.now += ATTENTION_DURATION - 1;
      timeouts[0]();

      expect(attentions).to.deep.equal({
        a: ATTENTION_DURATION,
        b: ATTENTION_DURATION + 2,
        c: 1,
        d: ATTENTION_DURATION,
        e: 1,
        f: ATTENTION_DURATION
      });
    });
  });
});
