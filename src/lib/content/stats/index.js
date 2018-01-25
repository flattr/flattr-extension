"use strict";

const {window} = require("global/window");

const {emit, on} = require("../../common/events");

let isLoaded = false;
let moveTimeout = null;

let events = {
  click(ev)
  {
    if (!ev.isTrusted)
      return;

    emit("stats", "pointerclicked", null);
  },
  keypress(ev)
  {
    if (!ev.isTrusted || ev.repeat)
      return;

    emit("stats", "keypressed", null);
  },
  mousemove(ev)
  {
    // Event is fired every few milliseconds so we're limiting the amount of
    // data we forward to avoid processing redundant events
    if (!ev.isTrusted || moveTimeout)
      return;

    moveTimeout = window.setTimeout(() =>
    {
      moveTimeout = null;
    }, 1000);
    emit("stats", "pointermoved", null);
  }
};

on("load", ({isActive, isBlocked}) =>
{
  if (isLoaded || !isActive || isBlocked)
    return;

  isLoaded = true;
  require("./author");
  require("./scroll");

  for (let name in events)
  {
    window.addEventListener(name, events[name], false);
  }
});

on("unload", () =>
{
  isLoaded = false;
  for (let name in events)
  {
    window.clearTimeout(moveTimeout);
    window.removeEventListener(name, events[name], false);
  }
});
