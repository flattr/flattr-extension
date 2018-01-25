"use strict";

const requireInject = require("require-inject");
const sinon = require("sinon");
const chrome = require("sinon-chrome");

const {expect} = require("../assert");
const {spawn} = require("../utils");
const {createEnvironment} = require("../environments/virtual-element");
const {API_BASE_WEB} = require("../../src/lib/common/constants");

const TAG_NAME = "flattr-options-history";

describe("Test Options History", () =>
{
  it("Using <flattr-options-history> matches file name and lists links", () =>
  {
    return spawn(function*()
    {
      const url = "http://foo.com/";

      const {
        VirtualElement, h, v, register,
        window, document
      } = yield createEnvironment();

      chrome.runtime.sendMessage
      .withArgs(
        sinon.match({
          type: "flattrs-get",
          data: sinon.match.object
        }),
        sinon.match.func
      )
      .yields({
        flattrs: [
          {
            url,
            timestamps: [1, 3, 5],
            entity: "foo.com",
            title: "Foo"
          }
        ]
      });

      requireInject(
        "../../src/lib/ui/components/" + TAG_NAME,
        {
          "global/window": window,
          "../../src/lib/common/env/chrome": {chrome},
          "../../src/lib/ui/components/virtual-element":
          {h, v, register, VirtualElement}
        }
      );

      let testEle = document.createElement(TAG_NAME);
      document.body.appendChild(testEle);

      expect(testEle.children.length).to.be.equal(0);

      yield Promise.resolve();

      expect(testEle.children.length).to.be.equal(5);

      let {links} = document;
      expect(links.length).to.be.equal(4);

      for (let i = 0; i < 3; i++)
      {
        expect(links[i].href).to.be.equal(url);
      }

      expect(links[3].href).to.be.equal(`${API_BASE_WEB}/flattrsgiven`);
    });
  });
});
