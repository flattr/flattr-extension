"use strict";

let apiDomain = 'flattr.com'
let apiProtocol = 'https'
if ("__BUILD_TYPE__" === 'staging') {
  apiDomain = 'smickr.net'
}
if ("__BUILD_TYPE__" === 'development') {
  apiDomain = 'flattr.test'
  apiProtocol = 'http'
}

/**
 * Base domain of endpoints and of pages on which to listen for external events
 * @type {string}
 */
exports.API_BASE_DOMAIN = apiDomain;

const FILES_BASE = `${apiProtocol}://files.${apiDomain}`;
exports.FILES_DOMAINS_UPDATE = `${FILES_BASE}/domains.json`;

/**
 * Base URL of API endpoints
 * @type {string}
 */
exports.API_BASE = `${apiProtocol}://api.${apiDomain}`;

/**
 * Base URL of pages on which to listen for external events
 * @type {string}
 */
const API_BASE_WEB = `${apiProtocol}://${apiDomain}`;
exports.API_BASE_WEB = API_BASE_WEB;

/**
 * URL of page to open for initiating the authentication flow
 * @type {string}
 */
exports.API_EVENT_PAGE_AUTH = `${API_BASE_WEB}/oauth/ext`;

/**
 * URL of page to open for changing the active subscription
 * @type {string}
 */
exports.API_EVENT_PAGE_SUBSCRIPTION =
  `${API_BASE_WEB}/settings/account/subscription`;

exports.API_RETRY_DELAY_MS = [
  60000, // 00h:01m:00s
  240000, // 00h:04m:00s
  960000, // 00h:16m:00s
  3840000 // 01h:04m:00s
];

exports.ATTENTION_AUDIO_INTERVAL_SYM = Symbol("Audio attention interval");
exports.ATTENTION_AUDIO_THRESHOLDS = [
  140, // 00h:02m:20s
  400, // 00h:06m:40s
  880, // 00h:14m:40s
  1480, // 00h:24m:40s
  2460, // 00h:41m:00s
  3660 // 01h:01m:00s
];
exports.ATTENTION_AUDIO_TIMEOUT = 20000; // 00h:00:20s
exports.ATTENTION_AUDIO_TIMEOUT_SYM = Symbol("Audio attention timeout");

exports.ATTENTION_DURATION = 15; // 00:00:15
exports.ATTENTION_LAST_THRESHOLD = 86400; // 24:00:00
exports.ATTENTION_THRESHOLDS = [
  50, // 00:00:50
  96, // 00:01:36
  138, // 00:02:18
  176, // 00:02:56
  210 // 00:03:30
];
exports.IDLE_INTERVAL = 60; // 00:01:00
exports.STATUS_UNDEFINED = 0;
exports.STATUS_ENABLED = 1;
exports.STATUS_DISABLED = 2;
exports.STATUS_BLOCKED = 3;

exports.MINUTE_MS = 60000; // 00h:01m:00s
let DAY_MS = exports.DAY_MS = 86400000; // 24h:00m:00s

exports.HISTORY_CONDITIONS = [
  {
    entityTimeout: 0, // 00:00:00
    period: 2592000, // 30T00:00:00
    timeout: 21600, // 06:00:00
    visitCount: 3
  },
  {
    entityTimeout: 5, // 00:00:05
    period: 1800, // 00:30:00
    timeout: 15, // 00:00:15
    visitCount: 4
  }
];

exports.HISTORY_MAX_VISIT_DEVIATION = 3600000; // 01h:00m:00s
exports.HISTORY_PROCESSING_DELAY = 300000; // 00h:05m:00s
exports.HISTORY_PROCESSING_INTERVAL = DAY_MS;

exports.DOMAIN_LIST_UPDATE_INTERVAL = DAY_MS;

exports.ALARM_INTERVAL_MS = 1800000; // 00h:30m:00s
