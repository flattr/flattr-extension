"use strict";

const requireInject = require("require-inject");
const sinon = require("sinon");
const chrome = require("sinon-chrome");
const {jsdom} = require("jsdom");

const {assert, expect} = require("../assert");
const {spawn} = require("../utils");

function getPageName(url)
{
  return url.replace(/.*\/([^/]*)/, "$1");
}

function onceClicked(element, callback)
{
  element.addEventListener("click", function listener()
  {
    element.removeEventListener("click", listener, false);
    callback();
  }, false);
}

let windows = [];
function createDocument(...args)
{
  let document = jsdom(...args);
  let window = document.defaultView;
  windows.push({close: window.close.bind(window)});
  return {document, window};
}

describe("Test lib/popup/links", () =>
{
  beforeEach(() =>
  {
    chrome.tabs.query.yields([]);
  });

  afterEach(() =>
  {
    chrome.flush();
    windows.forEach(({close}) => close());
    windows = [];
  });

  it("Attaches click listeners to 1 link", () =>
  {
    let {document} = createDocument(`
      <nav>
       <a id="test" data-click="open" href="1.html"></a>
      </nav>`);

    const {init} = requireInject("../../src/lib/ui/links", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    init(document.querySelector("nav"), {closeWindow: false});

    document.getElementById("test").click();

    assert.calledWithMatch(chrome.tabs.create, sinon.match((tab) =>
    {
      return getPageName(tab.url) === "1.html";
    }));
  });

  it("Attaches click listeners to 2 links", () =>
  {
    let {document} = createDocument(`
      <nav>
       <a id="test1" data-click="open" href="1.html"></a>
       <a id="test2" data-click="open" href="2.html"></a>
      </nav>`);

    const {init} = requireInject("../../src/lib/ui/links", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    init(document.querySelector("nav"), {closeWindow: false});

    document.getElementById("test1").click();

    assert.calledWithMatch(chrome.tabs.create, sinon.match((tab) =>
    {
      return getPageName(tab.url) === "1.html";
    }));

    document.getElementById("test2").click();

    assert.calledWithMatch(chrome.tabs.create, sinon.match((tab) =>
    {
      return getPageName(tab.url) === "2.html";
    }));
  });

  it("Does close the window when closeWindow == true", (done) =>
  {
    let {document, window} = createDocument(`
       <a id="test" data-click="open" href="1.html"></a>`);

    window.close = done;

    const {init} = requireInject("../../src/lib/ui/links", {
      "../../src/lib/common/env/chrome": {chrome},
      "global/window": {window}
    });

    init(document.body, {closeWindow: true});

    chrome.tabs.create.yields();
    document.getElementById("test").click();
  });

  it("Doesn't close the window when closeWindow == false", () =>
  {
    let {document, window} = createDocument(`
       <a id="test" data-click="open" href="1.html"></a>`);

    let counter = 0;
    window.close = () => counter++;

    const {init} = requireInject("../../src/lib/ui/links", {
      "../../src/lib/common/env/chrome": {chrome},
      "global/window": {window}
    });

    init(document.body, {closeWindow: false});

    chrome.tabs.create.yields();

    let link = document.getElementById("test");

    link.click();

    expect(counter).to.be.equal(0);
    window.close();
    expect(counter).to.be.equal(1);

    return spawn(function*()
    {
      yield new Promise((resolve) =>
      {
        onceClicked(link, resolve);
        link.click();
      });

      expect(counter).to.be.equal(1);

      // test a second time to make sure event bubbling is not an issue
      yield new Promise((resolve) =>
      {
        onceClicked(link, resolve);
        link.click();
      });

      expect(counter).to.be.equal(1);
    });
  });
});
