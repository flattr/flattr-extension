"use strict";

const requireInject = require("require-inject");
const {expect} = require("chai");

const {Window} = require("../mocks/window");

describe("Test background page data collection of scroll events", () =>
{
  let expecting = [
    ["scrolled-start", 0, 0],
    ["scrolled-end", 0, 20],
    ["scrolled-start", 0, 20],
    ["scrolled-end", 0, 15],
    ["scrolled-start", 0, 15],
    ["scrolled-ongoing", 0, 31],
    ["scrolled-ongoing", 0, 32],
    ["scrolled-end", 0, 33],
    ["scrolled-start", 0, 33],
    ["scrolled-end", 20, 33],
    ["scrolled-start", 20, 33],
    ["scrolled-end", 10, 33]
  ];

  it("Should record scroll events", () =>
  {
    let win = new Window();
    requireInject("../../src/lib/content/stats/scroll", {
      "global/window": win,
      "../../src/lib/common/events":
      {
        emit(type, action, data)
        {
          expect([action, data.x, data.y]).to.deep.equal(expecting.shift());
        },
        on() {}
      }
    });

    function scroll(event, x, y)
    {
      win.scrollX = x;
      win.scrollY = y;
      win.dispatchEvent(event, [{isTrusted: true}]);
    }

    scroll("scroll", 0, 10);
    scroll("scroll", 0, 20);
    scroll("scroll", 0, 15);
    scroll("window-timeout", -1, -1);
    scroll("scroll", 0, 30);
    scroll("window-interval", 0, 31);
    scroll("window-interval", 0, 32);
    scroll("scroll", 0, 33);
    scroll("window-timeout", -1, -1);
    scroll("scroll", 20, 33);
    scroll("scroll", 10, 33);
    scroll("window-timeout", -1, -1);
    expect(expecting.length).to.be.equal(0);
  });
});
