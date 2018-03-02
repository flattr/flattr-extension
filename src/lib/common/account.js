/**
 * @file Manages Flattr account credentials
 */

"use strict";

const {emit} = require("./events");
const settings = require("./settings");

let flattrAccount = settings.get("account.token", {accessToken: null});
let flattrSubscription = settings.get("account.subscription", {active: false});

/**
 * Retrieve account information
 * @return {Promise<Object>}
 */
function getAccount()
{
  return Promise.all([flattrAccount, flattrSubscription])
    .then(([token, subscription]) => ({subscription, token}));
}
exports.getAccount = getAccount;

/**
 * Determine whether user has an active subscription
 * @return {Promise<boolean>}
 */
function hasSubscription()
{
  return flattrSubscription.then(({active}) => active);
}
exports.hasSubscription = hasSubscription;

/**
 * Determine whether extension should be active
 * @return {Promise<boolean>}
 */
exports.isActive = isAuthenticated;

/**
 * Determine whether user linked Flattr account
 * @return {Promise<boolean>}
 */
function isAuthenticated()
{
  return flattrAccount.then(({accessToken}) => !!accessToken);
}
exports.isAuthenticated = isAuthenticated;

/**
 * Set account credentials
 * @param {string} accessToken
 * @return {Promise}
 */
function setToken(accessToken)
{
  let account = {accessToken};
  return settings.set("account.token", account)
    .then(() =>
    {
      flattrAccount = Promise.resolve(account);
      emit("authentication-changed", !!accessToken);
    });
}
exports.setToken = setToken;

/**
 * Set account subscription
 * @param {Object} subscription
 * @param {boolean} subscription.active
 * @return {Promise}
 */
function setSubscription(subscription)
{
  return settings.set("account.subscription", subscription)
    .then(() =>
    {
      flattrSubscription = Promise.resolve(subscription);
      emit("subscription-changed", !!subscription.active);
    });
}
exports.setSubscription = setSubscription;
