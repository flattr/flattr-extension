"use strict";

const requireInject = require("require-inject");
const chrome = require("sinon-chrome");

const {expect} = require("../assert");
const {spawn} = require("../utils");
const {createEnvironment} = require("../environments/virtual-element");
const {
  API_BASE_WEB,
  API_EVENT_PAGE_AUTH,
  API_EVENT_PAGE_SUBSCRIPTION
} = require("../../src/lib/common/constants");

const TAG_NAME = "flattr-options-message";

function expectCounts(origin, tests)
{
  for (let [expected, selector] of tests)
  {
    let count = origin.querySelectorAll(selector).length;
    expect(count).to.equal(expected);
  }
}

describe("Test <flattr-options-message>", () =>
{
  it("Creating <flattr-options-message>", () =>
  {
    return spawn(function*()
    {
      const {
        VirtualElement, h, v, register,
        window, document
      } = yield createEnvironment();

      requireInject(
        "../../src/lib/ui/components/" + TAG_NAME,
        {
          "global/window": window,
          "../../src/lib/common/env/chrome": {chrome},
          "../../src/lib/ui/components/virtual-element":
          {h, v, register, VirtualElement}
        }
      );

      let element = document.createElement(TAG_NAME);

      expect(element.childNodes.length).to.equal(0);

      element.message = "signin";
      expect(element.childNodes.length).to.equal(4);
      expectCounts(element, [
        [5, "*"],
        [2, "a"],
        [1, `a[href='${API_BASE_WEB}/']`],
        [1, `a[href='${API_EVENT_PAGE_AUTH}']`]
      ]);

      element.message = "subscribe";
      expect(element.childNodes.length).to.equal(3);
      expectCounts(element, [
        [3, "*"],
        [1, "a"],
        [1, `a[href='${API_EVENT_PAGE_SUBSCRIPTION}']`]
      ]);
    });
  });
});
