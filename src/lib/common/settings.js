"use strict";

const {localStorage} = require("global/window");

const {chrome} = require("./env/chrome");

function get(name, defaultValue)
{
  return new Promise((resolve, reject) =>
  {
    chrome.storage.local.get(name, (data) =>
    {
      if (chrome.runtime.lastError)
      {
        reject(chrome.runtime.lastError);
      }
      else if (typeof data[name] != "undefined")
      {
        resolve(data[name]);
      }
      else
      {
        resolve(defaultValue);
      }
    });
  });
}
exports.get = get;

/**
 * Retrieve setting synchronously
 * @param {string} name
 * @param {any} defaultValue
 * @return {any} - value
 * @deprecated see https://github.com/flattr/flattr-extension/issues/3
 */
function getSync(name, defaultValue)
{
  let value = localStorage.getItem(name);

  if (value === null && typeof defaultValue != "undefined")
    return defaultValue;

  try
  {
    value = JSON.parse(value);
  }
  catch (ex)
  {
    // Ignore exception
  }

  return value;
}
exports.getSync = getSync;

function set(name, value)
{
  return new Promise((resolve, reject) =>
  {
    chrome.storage.local.set(
      {[name]: value},
      () =>
      {
        if (chrome.runtime.lastError)
        {
          reject(chrome.runtime.lastError);
        }
        else
        {
          resolve(value);
        }
      }
    );
  });
}
exports.set = set;

/**
 * Update setting synchronously
 * @param {string} name
 * @param {any} value
 * @deprecated see https://github.com/flattr/flattr-extension/issues/3
 */
function setSync(name, value)
{
  if (value instanceof Object)
  {
    value = JSON.stringify(value);
  }

  localStorage.setItem(name, value);
}
exports.setSync = setSync;
