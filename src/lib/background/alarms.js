"use strict";

const {clearInterval, setInterval, Date} = require("global/window");

const {ALARM_INTERVAL_MS} = require("../common/constants");

function setAlarm(when, listener, ...args)
{
  return new Promise((resolve, reject) =>
  {
    let intervalID = setInterval(() =>
    {
      let now = Date.now();
      if (when <= now)
      {
        clearInterval(intervalID);
        return listener(...args);
      }
    }, ALARM_INTERVAL_MS);

    resolve();
  });
}
exports.setAlarm = setAlarm;
