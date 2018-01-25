"use strict";

const {document, window} = require("global/window");

const {emit, on} = require("../../common/events");

const SCROLL_TIMEOUT = 1000; // 00:00:01

let scrollData = null;

function getScrollState()
{
  return {
    x: window.scrollX,
    y: window.scrollY,
    width: document.body.scrollWidth,
    height: document.body.scrollHeight
  };
}

function onScrollEnd()
{
  emit("stats", "scrolled-end", scrollData.state);
  window.clearInterval(scrollData.interval);
  window.clearTimeout(scrollData.timeout);
  scrollData.interval = null;
  scrollData.timeout = null;
  scrollData.direction = 0;
}

function onScroll(ev)
{
  if (!ev.isTrusted)
    return;

  let state = getScrollState();
  if (!scrollData)
  {
    scrollData =
    {
      direction: 0,
      interval: null,
      timeout: null,
      state:
      {
        x: 0,
        y: 0,
        width: state.width,
        height: state.height
      }
    };
  }

  let direction = 0;
  if (state.x - scrollData.state.x)
  {
    direction |= (state.x > scrollData.state.x) ? 1 : 2;
  }
  if (state.y - scrollData.state.y)
  {
    direction |= (state.y > scrollData.state.y) ? 4 : 8;
  }

  if (scrollData.direction != direction)
  {
    if (scrollData.direction > 0)
    {
      onScrollEnd();
    }

    emit("stats", "scrolled-start", scrollData.state);
    scrollData.interval = window.setInterval(() =>
        emit("stats", "scrolled-ongoing", getScrollState()), SCROLL_TIMEOUT);
  }

  window.clearTimeout(scrollData.timeout);
  scrollData.timeout = window.setTimeout(onScrollEnd, SCROLL_TIMEOUT);

  scrollData.direction = direction;
  scrollData.state = state;
}

window.addEventListener("scroll", onScroll, false);

on("unload", () =>
{
  window.removeEventListener("scroll", onScroll, false);
  if (scrollData)
  {
    window.clearInterval(scrollData.interval);
    window.clearTimeout(scrollData.timeout);
  }
});
