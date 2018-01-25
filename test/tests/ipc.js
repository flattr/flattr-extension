"use strict";

const requireInject = require("require-inject");
const sinon = require("sinon");
const chrome = require("sinon-chrome");

const {assert, expect} = require("../assert");

describe("Test lib/common/ipc", () =>
{
  afterEach(() => chrome.flush());

  it("on() subscribes to chrome.runtime.onMessage.addListener", (done) =>
  {
    const expectedType = "foo";
    const expectedData = "bar";

    const {on} = requireInject("../../src/lib/common/ipc", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    on(expectedType, ({data}) =>
    {
      expect(data).to.be.equal(expectedData);
      done();
    });

    assert.calledWithMatch(
      chrome.runtime.onMessage.addListener,
      sinon.match.func);

    chrome.runtime.onMessage.dispatch(
      {
        type: expectedType,
        data: expectedData
      });
  });

  it("on(listener), listener called multiple times", (done) =>
  {
    const expectedType = "foo";
    const expectedData = "bar";
    let counter = 0;

    const {on} = requireInject("../../src/lib/common/ipc", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    on(expectedType, ({data}) =>
    {
      counter++;
      expect(data).to.be.equal(expectedData);
      if (counter >= 2)
      {
        done();
      }
    });

    let data = {
      type: expectedType,
      data: expectedData
    };
    chrome.runtime.onMessage.dispatch(data);
    chrome.runtime.onMessage.dispatch(data);
  });

  it("once(listener), listener is only called once", () =>
  {
    const expectedType = "foo";
    const expectedData = "bar";
    let counter = 0;

    const {once} = requireInject("../../src/lib/common/ipc", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    once(expectedType, ({data}) =>
    {
      counter++;
      expect(data).to.be.equal(expectedData);
    });

    assert.calledWithMatch(
      chrome.runtime.onMessage.addListener,
      sinon.match.func);

    let dispatch = () => chrome.runtime.onMessage.dispatch(
      {
        type: expectedType,
        data: expectedData
      });

    dispatch();

    expect(counter).to.be.equal(1);

    dispatch();

    expect(counter).to.be.equal(1);
  });
});
