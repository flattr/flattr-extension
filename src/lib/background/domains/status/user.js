"use strict";

const db = require("localforage").createInstance({name: "domains"});

function getAll()
{
  let enabled = [];
  let disabled = [];

  return db.iterate((isDomainDisabled, domain) =>
  {
    if (isDomainDisabled)
    {
      disabled.push({domain});
    }
    else
    {
      enabled.push({domain});
    }
  })
  .then(() =>
  {
    return {enabled, disabled};
  });
}
exports.getAll = getAll;

function isDisabled(entity)
{
  if (!entity)
    return Promise.resolve(false);

  return db.getItem(entity);
}
exports.isDisabled = isDisabled;

function setDisabled(entity, disabled)
{
  if (!entity)
    return Promise.reject("No entity specified");

  return db.setItem(entity, disabled);
}
exports.setDisabled = setDisabled;
