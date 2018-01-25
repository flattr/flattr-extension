"use strict";

const {Date} = require("global/window");

const {chrome} = require("../../common/env/chrome");
const {HISTORY_CONDITIONS} = require("../../common/constants");
const {sortTimestamped} = require("../../common/sort");
const {db} = require("../database/visits");
const {getEntity, hasDomainAuthors} = require("../domains");
const {waitForPendingVisitsToSave} = require("./utils");

const ignoredTransitions = new Set([
  "auto_subframe",
  "auto_toplevel",
  "form_submit",
  "reload"
]);

let flatten = (array) => [].concat(...array);

function getKnownVisits(lastProcessing)
{
  return waitForPendingVisitsToSave()
    .then(() => db.visits.where("timestamp").above(lastProcessing).toArray())
    .then((visits) =>
    {
      visits = visits.map(({timestamp}) => timestamp);
      return new Set(visits);
    });
}

function getVisits(url)
{
  return new Promise((resolve) =>
  {
    chrome.history.getVisits({url}, (visits) =>
    {
      let entity = getEntity(url);
      visits = visits.map(({transition, visitId, visitTime}) =>
      {
        return {entity, timestamp: visitTime, transition};
      });
      resolve(visits);
    });
  });
}

function getHistory(lastProcessing)
{
  return new Promise((resolve, reject) =>
  {
    chrome.history.search(
      {
        startTime: lastProcessing,
        text: "",
        // This value must be an integer between 1 and 2^31-1 so we set
        // the value to one result per second to get the maximum number of
        // useful results while staying well within the boundaries
        maxResults: Math.floor((Date.now() - lastProcessing) / 1000)
      },
      (items) =>
      {
        let history = items.map(({url}) => getVisits(url));
        Promise.all(history)
          .then(flatten)
          .then(resolve)
          .catch(reject);
      }
    );
  });
}

function filterVisits([visits, knownVisits])
{
  visits = visits.filter(({entity, timestamp, transition}) =>
  {
    // Ignore visits we haven't encountered yet
    if (!knownVisits.has(timestamp))
      return false;

    // Ignore transition types that don't represent a visit
    if (ignoredTransitions.has(transition))
      return false;

    // Ignore multi-author domains
    if (hasDomainAuthors(entity))
      return false;

    return true;
  });

  visits.sort(sortTimestamped(false));
  return visits;
}

function applyCondition(visits, {entityTimeout, period, timeout, visitCount})
{
  let flattrEntities = [];
  let entityHistory = new Map();

  for (let i = 0; i < visits.length; i++)
  {
    let {entity, timestamp} = visits[i];

    let entityVisits = entityHistory.get(entity);
    if (!entityVisits)
    {
      entityVisits = [];
      entityHistory.set(entity, entityVisits);
    }

    // Ignore visits following a previous visit
    let lastVisit = visits[i - 1];
    if (lastVisit && timestamp < lastVisit.timestamp + timeout * 1000)
      continue;

    // Ignore visits that are followed by another visit from same entity
    let nextVisit = visits[i + 1];
    if (nextVisit && nextVisit.timestamp < timestamp + entityTimeout * 1000)
      continue;

    // Ignore old visits
    while (entityVisits[0] < timestamp - period * 1000)
    {
      entityVisits.shift();
    }

    // Check against visit count
    entityVisits.push(timestamp);
    if (entityVisits.length != visitCount)
      continue;

    flattrEntities.push(entity);
    entityHistory.delete(entity);
  }

  return flattrEntities;
}

function getFlattrEntities(visits)
{
  let flattrEntities = HISTORY_CONDITIONS
    .map((condition) => applyCondition(visits, condition));

  flattrEntities = flatten(flattrEntities)
    .filter((entity) => !!entity);

  return flattrEntities;
}

/**
 * Returns entities to flattr based on visit history
 * @param {number} lastProcessing - timestamp of last processing
 * @return {Promise<string[]>} entities to flattr
 */
function processHistory(lastProcessing)
{
  return Promise.all([
    getHistory(lastProcessing),
    getKnownVisits(lastProcessing)
  ])
  .then(filterVisits)
  .then(getFlattrEntities);
}
exports.processHistory = processHistory;
