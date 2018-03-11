"use strict";

const {indexedDB, IDBKeyRange} = require("./indexeddb");

const URL = require("./window/url");
const {Storage} = require("./window/localStorage");

let lastVisit = new Date();
lastVisit.setHours(lastVisit.getHours() - 12);
lastVisit = lastVisit.getTime();

function Window(defaults)
{
  let {localStorage} = defaults || {};
  this._listeners = {};
  this.window = this;

  let now = 0;
  this.performance.now = () => ++now;

  this.fetch = (url, options) =>
  {
    return Promise.resolve({ok: true, status: 200});
  };

  this.localStorage = new Storage(localStorage);
}
Window.prototype = {
  _listeners: null,
  chrome: null,
  document: {
    body: {
      scrollWidth: 1024,
      scrollHeight: 3000
    }
  },
  navigator: {
    platform: "Linux x86_64"
  },
  performance: {
    now: null,
    timing: {
      domainLookupStart: 3,
      loadEventEnd: 4,
      redirectStart: 1,
      secureConnectionStart: 2
    }
  },
  indexedDB,
  IDBKeyRange,
  scrollX: 0,
  scrollY: 0,
  window: null,
  Date,
  URL,

  addEventListener(name, listener)
  {
    let listeners = this._listeners;
    if (!(name in listeners))
      listeners[name] = new Set();
    listeners[name].add(listener);
  },

  clearInterval(listener)
  {
    this.removeEventListener("window-interval", listener);
  },

  clearTimeout(listener)
  {
    this.removeEventListener("window-timeout", listener);
  },

  dispatchEvent(name, args)
  {
    if (!(name in this._listeners))
      return;

    let listeners = new Set(this._listeners[name]);
    for (let listener of listeners)
    {
      listener.apply(this, args);
    }
  },

  removeEventListener(name, listener)
  {
    if (name in this._listeners)
    {
      this._listeners[name].delete(listener);
    }
  },

  setInterval(listener, timeout)
  {
    this.addEventListener("window-interval", listener);
    return listener;
  },

  setTimeout(callback, timeout)
  {
    let listener = () =>
    {
      this.removeEventListener("window-timeout", listener);
      callback();
    };
    this.addEventListener("window-timeout", listener);
    return listener;
  }
};
exports.Window = Window;
