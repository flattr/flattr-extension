"use strict";

const {window, Date} = require("global/window");

const {ALARM_INTERVAL_MS} = require("../common/constants");

function setAlarm(when, listener, ...args)
{
  return new Promise((resolve, reject) =>
  {
    let intervalID = window.setInterval(() =>
    {
      let now = Date.now();
      if (when <= now)
      {
        window.clearInterval(intervalID);
        return listener(...args);
      }
    }, ALARM_INTERVAL_MS);

    resolve();
  });
}
exports.setAlarm = setAlarm;
