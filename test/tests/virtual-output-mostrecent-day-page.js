"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");
const {spawn} = require("../utils");
const {createEnvironment} = require("../environments/virtual-element");

const TEST_URL = "http://example.com/";

describe("Test virtual component output-mostrecent-day-page", () =>
{
  it("Should return expected values", () =>
  {
    let virtualName = "output-mostrecent-day-page";
    return spawn(function*()
    {
      let {h, v, register, window} = yield createEnvironment();

      requireInject("../../src/lib/ui/components/virtual/" + virtualName, {
        "global/window": window,
        "../../src/lib/ui/i18n": {get: () => ""},
        "../../src/lib/ui/components/virtual-element": {h, v, register}
      });

      let page = {
        url: TEST_URL,
        entity: "example.com",
        title: "An example",
        timestamps: [0]
      };

      let root = v("flattr-" + virtualName, {
        year: 2017, month: 1, day: 1,
        budget: 5,
        page,
        total: 5
      });

      expect(root.tagName).to.equal("DIV");
      expect(root.properties.className).to.equal("page");

      let expectedValues = [null, "FEB 1", "$1.00", "1"];
      let node;
      for (let i = 3; i >= 0; i--)
      {
        node = root.children[i];
        expect(node.tagName).to.equal("DIV");

        if (expectedValues[i])
          expect(node.children[0].text).to.equal(expectedValues[i]);

        let classList = node.properties.className.split(" ");
        expect(classList).to.contain("col");
        expect(classList).to.contain("col" + i);
      }

      expect(node.children[0].children[0].text).to.equal(page.entity);
      expect(node.children[2].children[0].text).to.equal(page.title);
    });
  });
});
