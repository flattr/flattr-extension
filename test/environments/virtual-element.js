"use strict";

const fs = require("fs");
const requireInject = require("require-inject");
const jsdom = require("jsdom");
const chrome = require("sinon-chrome");

const webcomponents = fs.readFileSync(
    require.resolve("webcomponents.js/webcomponents-lite"),
    "utf-8");

const {spawn} = require("../utils");

function createEnvironment()
{
  return spawn(function*()
  {
    let window = yield new Promise((resolve, reject) =>
    {
      jsdom.env({
        html: "",
        // We're polyfilling web components since jsdom doesn't support them yet
        // https://github.com/tmpvar/jsdom/issues/1030
        src: [webcomponents],
        done: (e, win) => e ? reject(e) : resolve(win),
        virtualConsole: jsdom.createVirtualConsole().sendTo(console)
      });
    });
    let {document} = window;

    const {
      VirtualElement,
      h,
      v,
      register
    } = requireInject(
      "../../src/lib/ui/components/virtual-element",
      {
        "global/window": window,
        "global/document": document,
        "../../src/lib/common/env/chrome": {chrome}
      }
    );

    return {VirtualElement, h, v, register, window, document};
  });
}
exports.createEnvironment = createEnvironment;
