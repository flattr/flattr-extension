"use strict";

const {fetch} = require("global/window");

const {MINUTE_MS, DAY_MS} = require("../../common/constants");
const settings = require("../../common/settings");
const {chrome} = require("../../common/env/chrome");
const {hasDomainAuthors} = require("../domains");
const db = require("./db");

const RECIPIENT_URL = "https://vger.flattrplus.com/json";

function substituteString(str, idCache)
{
  if (!idCache.has(str))
  {
    idCache.set(str, idCache.size);
  }
  return idCache.get(str);
}

function substituteURL(url, idCache)
{
  if (!url)
    return null;

  if (!hasDomainAuthors(url.entity))
  {
    url.entity = substituteString(url.entity, idCache);
  }
  url.url = substituteString(url.url, idCache);
  return url;
}

function forEach({dateRange}, onEach)
{
  let startTime = new Date();
  startTime.setDate(startTime.getDate() - dateRange);
  startTime = startTime.getTime();

  return db.forEach(({action, data, tabId, timestamp}) =>
  {
    if (timestamp < startTime)
      return;

    onEach({action, data, tabId, timestamp});
  });
}

function collect({dateRange, skipSubstitution})
{
  let idCache = new Map();
  let collected = [];
  return forEach({dateRange}, ({action, data, tabId, timestamp}) =>
  {
    if (!skipSubstitution)
    {
      switch (action)
      {
        case "author":
          data = substituteString(data, idCache);
          break;
        case "state":
          delete data.title;
          data.url = substituteURL(data.url, idCache);
          break;
        case "title":
          data = null;
          break;
        case "url":
          data = substituteURL(data, idCache);
          break;
      }
    }

    collected.push([timestamp, tabId, action, data]);
  })
  .then(() => collected);
}
exports.collect = collect;

function countEntities({dateRange, minVisitCount})
{
  let counts = new Map();
  let entities = new Set();

  return forEach({dateRange}, ({action, data}) =>
  {
    if (action != "url" || !data)
      return;

    let {entity} = data;
    if (entities.has(entity))
      return;

    let count = counts.get(entity) || 0;
    if (++count == minVisitCount)
    {
      entities.add(entity);
    }
    else
    {
      counts.set(entity, count);
    }
  })
  .then(() => entities.size);
}
exports.countEntities = countEntities;

function countVisits({dateRange, entity})
{
  let count = 0;
  return forEach({dateRange}, ({action, data}) =>
  {
    if (action == "url" && data && data.entity == entity)
    {
      count++;
    }
  })
  .then(() => count);
}
exports.countVisits = countVisits;

function submit(error, name, data)
{
  return fetch(RECIPIENT_URL, {
    method: "POST",
    body: JSON.stringify({
      data, error, name,
      source: chrome.runtime.id
    })
  });
}

function submitData(name, dateRange)
{
  return settings.get("feedback.disabled")
      .then((isDisabled) =>
      {
        if (isDisabled)
          return;

        return collect({dateRange})
            .then((data) => submit(null, name, data));
      })
      .catch((err) => submit(err.toString(), name, null))
      .then(() => db.remove({before: 35}))
      .catch((err) => console.error(err));
}

function getNextMonth(start)
{
  let next = new Date(start);
  next.setHours(0, 0, 0, 0);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  return next.getTime();
}

function resetTimestamp(name)
{
  let now = Date.now();
  settings.set(`beta.collector.${name}`, now);
  return now;
}

function onAlarm({name, periodInMinutes})
{
  if (!/^feedback-/.test(name))
    return;

  let now = Date.now();
  settings.get(`beta.collector.${name}`)
      .then((previous) => submitData(name, (now - previous) / DAY_MS))
      .then(() => resetTimestamp(name))
      .then(() =>
      {
        if (name == "feedback-month-start")
        {
          chrome.alarms.create(name, {when: getNextMonth(now)});
        }
      })
      .catch((err) => console.error(err));
}

function setFeedbackInterval(name, days)
{
  chrome.alarms.get(name, (alarm) =>
  {
    // Alarm already active so no need to set it again
    if (alarm)
      return;

    settings.get(`beta.collector.${name}`)
        .then((previous) =>
        {
          previous = previous || resetTimestamp(name);

          if (name == "feedback-month-start")
          {
            chrome.alarms.create(name, {when: getNextMonth(previous)});
          }
          else
          {
            let period = days * DAY_MS;
            chrome.alarms.create(name, {
              periodInMinutes: period / MINUTE_MS,
              when: previous + period
            });
          }
        })
        .catch((err) => console.error(err));
  });
}
exports.setFeedbackInterval = setFeedbackInterval;

chrome.alarms.onAlarm.addListener(onAlarm);
