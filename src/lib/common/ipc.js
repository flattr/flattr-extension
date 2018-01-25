"use strict";

const {chrome} = require("./env/chrome");

function send(type, msg, metadata)
{
  metadata = metadata || {};
  let {tabId} = metadata;
  let data = {
    type,
    data: msg
  };

  return new Promise((resolve) =>
  {
    if (tabId)
    {
      chrome.tabs.sendMessage(tabId, data, resolve);
    }
    else
    {
      // Firefox doesn't support null as tab ID so we shouldn't set it
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1341073
      chrome.runtime.sendMessage(data, resolve);
    }
  });
}
exports.send = send;

function on(type, cb)
{
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) =>
  {
    if (msg.type != type)
    {
      return false;
    }

    return cb({
      data: msg.data,
      sender,
      sendResponse
    });
  });
}
exports.on = on;

function once(type, cb)
{
  let listener = (msg, sender, sendResponse) =>
  {
    if (msg.type != type)
    {
      return false;
    }
    chrome.runtime.onMessage.removeListener(listener);

    return cb({
      data: msg.data,
      sender,
      sendResponse
    });
  };

  chrome.runtime.onMessage.addListener(listener);
}
exports.once = once;
