"use strict";

const {fetch} = require("global/window");

const {getAccount, setSubscription, setToken} = require("../../common/account");
const {API_BASE} = require("../../common/constants");
const {filterFlattrsForURLs} = require("../state/filters/flattrs");

function send({account, flattrs})
{
  flattrs = filterFlattrsForURLs(flattrs);

  if (flattrs.length < 1)
    return Promise.resolve({ok: true});

  let {subscription, token} = account;
  if (!token.accessToken)
    return Promise.resolve({ok: false, status: 401});

  if (!subscription.active)
    return Promise.resolve({ok: false, status: 402});

  return fetch(
    `${API_BASE}/rest/v2/flattr/bulk`,
    {
      method: "POST",
      body: JSON.stringify(flattrs),
      headers: {
        "Authorization": `Bearer ${token.accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );
}

function sendFlattrs({flattrs})
{
  if (!Array.isArray(flattrs))
  {
    throw new Error("flattrs are required but were not provided.");
  }

  return getAccount()
    .then((account) => send({account, flattrs}))
    .then((resp) =>
    {
      let action = Promise.resolve();

      switch (resp.status)
      {
        // Unauthorized
        case 401:
          action = setToken(null);
          break;
        // Payment Required
        case 402:
          action = setSubscription({active: false});
          break;
      }

      return action.then(() => resp);
    })
    .catch((err) => ({error: err, ok: false, status: 0}));
}
exports.sendFlattrs = sendFlattrs;
