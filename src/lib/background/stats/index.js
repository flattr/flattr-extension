"use strict";

const {on} = require("../../common/events");
const {getEntity, getStatus} = require("../domains");
const {setFeedbackInterval} = require("./collector");
const db = require("./db");

setFeedbackInterval("feedback-day-7", 7);
setFeedbackInterval("feedback-day-28", 28);
setFeedbackInterval("feedback-month-start", null);

function transformURL(url)
{
  if (!url)
    return Promise.resolve(null);

  return getStatus({url}).then((status) =>
  {
    return {
      entity: getEntity(url),
      status, url
    };
  });
}

on("data", ({tabId, action, data, timestamp}) =>
{
  let result = Promise.resolve();
  if (action == "state")
  {
    result = transformURL(data.url).then((url) => data.url = url);
  }
  else if (action == "url")
  {
    result = transformURL(data).then((url) => data = url);
  }

  result.then(() => db.push(tabId, action, data, timestamp))
      .catch((err) => console.error(err));
});
