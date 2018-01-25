"use strict";

const {db} = require("../database/events");

function push(tabId, action, data, timestamp = Date.now())
{
  return db.events.put({action, data, tabId, timestamp});
}
exports.push = push;

exports.forEach = (onEach) => db.events.each(onEach);

function remove({before})
{
  let startTime = new Date();
  startTime.setDate(startTime.getDate() - before);
  startTime = startTime.getTime();

  return db.events
    .where("timestamp").below(startTime)
    .delete();
}
exports.remove = remove;
