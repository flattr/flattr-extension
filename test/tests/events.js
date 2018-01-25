"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");
const {spawn} = require("../utils");

const PATH_EVENTS = "../../src/lib/common/events";
const PATH_EVENTS_PROMISE = "../../src/lib/common/events/promise";

describe("Test lib/common/events", () =>
{
  it("emit() works", (done) =>
  {
    const {on, emit} = requireInject(PATH_EVENTS);
    on("test", done);
    emit("test");
  });

  it("on() is synchronous", () =>
  {
    const {on, emit} = requireInject(PATH_EVENTS);
    let worked = false;
    on("test", () => worked = true);
    emit("test");
    expect(worked).to.be.equal(true);
  });

  it("on() works after multiple emits", () =>
  {
    const {on, emit} = requireInject(PATH_EVENTS);
    let count = 0;
    on("test", () => count++);
    emit("test");
    expect(count).to.be.equal(1);
    emit("test");
    expect(count).to.be.equal(2);
  });

  it("off() works", () =>
  {
    const {on, off, emit} = requireInject(PATH_EVENTS);
    let count = 0;
    let listener = () => count++;
    on("test", listener);
    emit("test");
    expect(count).to.be.equal(1);
    off("test", listener);
    emit("test");
    expect(count).to.be.equal(1);
    on("test", listener);
    emit("test");
    expect(count).to.be.equal(2);
  });

  it("once() works", () =>
  {
    const {once, emit} = requireInject(PATH_EVENTS);
    let count = 0;
    let listener = () => count++;
    once("test", listener);
    emit("test");
    expect(count).to.be.equal(1);
    emit("test");
    expect(count).to.be.equal(1);
    once("test", listener);
    emit("test");
    expect(count).to.be.equal(2);
  });

  it("once() returns a promise", () =>
  {
    const events = requireInject(PATH_EVENTS);
    const {on, off, emit} = events;
    const {once} = requireInject(PATH_EVENTS_PROMISE, {
      [PATH_EVENTS]: events
    });
    let onCount = 0;
    let onlistener = () => onCount++;
    on("test", onlistener);

    return spawn(function*()
    {
      let promise = once("test");
      expect(onCount).to.be.equal(0);

      emit("test");
      expect(onCount).to.be.equal(1);
      yield promise;
      expect(onCount).to.be.equal(1);

      emit("test");
      yield promise;
      expect(onCount).to.be.equal(2);
      promise = once("test");

      emit("test");
      expect(onCount).to.be.equal(3);
      yield promise;
      expect(onCount).to.be.equal(3);

      emit("test");
      yield promise;
      expect(onCount).to.be.equal(4);

      // listener is optional
      promise = once("test");

      emit("test");
      yield promise;
      expect(onCount).to.be.equal(5);
      off("test", onlistener);
    });
  });

  it("reset() works", () =>
  {
    const {on, reset, emit} = requireInject(PATH_EVENTS);
    let count = 0;
    let listener = () => count++;
    on("test", listener);
    emit("test");
    expect(count).to.be.equal(1);
    reset();
    emit("test");
    expect(count).to.be.equal(1);
    on("test", listener);
    emit("test");
    expect(count).to.be.equal(2);
  });

  it("multiple events are kept separate", () =>
  {
    const {on, off, reset, emit} = requireInject(PATH_EVENTS);
    let count = 0;
    let listener = () => count++;

    on("foo", listener);
    on("bar", listener);
    emit("foo");
    expect(count).to.be.equal(1);

    emit("bar");
    expect(count).to.be.equal(2);

    off("foo", listener);
    emit("foo");
    expect(count).to.be.equal(2);

    emit("bar");
    expect(count).to.be.equal(3);

    on("foo", listener);
    emit("foo");
    expect(count).to.be.equal(4);

    off("foo", listener);
    emit("foo");
    expect(count).to.be.equal(4);

    off("bar", listener);
    emit("bar");
    expect(count).to.be.equal(4);

    on("foo", listener);
    on("bar", listener);
    emit("foo");
    expect(count).to.be.equal(5);

    emit("bar");
    expect(count).to.be.equal(6);

    reset();
    emit("foo");
    emit("bar");
    expect(count).to.be.equal(6);
  });
});
