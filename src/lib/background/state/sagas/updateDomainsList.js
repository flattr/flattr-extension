"use strict";

const {call, put, race, take} = require("redux-saga/effects");
const {delay} = require("./utils");

const {fetch, Date} = require("global/window");

const {
  DOMAIN_LIST_UPDATE_INTERVAL,
  FILES_DOMAINS_UPDATE
} = require("../../../common/constants");
const db = require("../../database/json");
const presets = require("../../domains/status/preset");
const {validateDomainsList} = require("../../domains/validate");
const settings = require("../../../common/settings");
const {getDomainsUpdate} = require("../actions/domains");

const {
  REQUEST_DOMAINS_UPDATE,
  REQUEST_DOMAINS_UPDATE_FAILURE,
  REQUEST_DOMAINS_UPDATE_SUCCESS
} = require("../types/domains");

function* updateDomains()
{
  let response = yield call(fetch, FILES_DOMAINS_UPDATE, {method: "HEAD"});

  let lastModified =
      (new Date(response.headers.get("last-modified"))).getTime();

  let lastUpdated = yield call(settings.get, "domains.lastUpdated", 0);

  if (lastModified <= lastUpdated)
  {
    yield put({type: REQUEST_DOMAINS_UPDATE_SUCCESS});
    return;
  }

  response = yield call(fetch, FILES_DOMAINS_UPDATE);

  yield call(settings.set, "domains.lastUpdated", Date.now());

  let domains = yield response.json();

  yield call(validateDomainsList, domains);

  yield call(db.save, "domains", {domains});

  yield call(presets.refreshPresets);

  yield put({type: REQUEST_DOMAINS_UPDATE_SUCCESS});
}
exports.updateDomains = updateDomains;

function* watchForDomainUpdateStart()
{
  while (true)
  {
    yield take(REQUEST_DOMAINS_UPDATE);

    // throttle requests
    yield call(delay, 1000);

    try
    {
      yield call(updateDomains);
    }
    catch (error)
    {
      yield put({type: REQUEST_DOMAINS_UPDATE_FAILURE, error});
    }
  }
}
exports.watchForDomainUpdateStart = watchForDomainUpdateStart;

function* runUpdateDomains()
{
  yield put(getDomainsUpdate());

  yield race({
    failure: take(REQUEST_DOMAINS_UPDATE_FAILURE),
    success: take(REQUEST_DOMAINS_UPDATE_SUCCESS)
  });
}
exports.runUpdateDomains = runUpdateDomains;

function* watchForDomainUpdateAlarm()
{
  let lastUpdated = yield call(settings.get, "domains.lastUpdated", 0);

  while (true)
  {
    let intervalDelay =
        (lastUpdated + DOMAIN_LIST_UPDATE_INTERVAL) - Date.now();
    if (intervalDelay > 0)
    {
      yield call(delay, intervalDelay);
    }

    yield call(runUpdateDomains);

    lastUpdated = Date.now();
  }
}
exports.watchForDomainUpdateAlarm = watchForDomainUpdateAlarm;
