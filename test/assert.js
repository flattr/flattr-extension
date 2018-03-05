"use strict";

const fs = require("fs");
const {expect, assert} = require("chai");
const {Module} = require("module");
const sinon = require("sinon");

const origRequire = Module.prototype.require;
let moduleIds = null;

sinon.assert.expose(assert, {prefix: ""});

exports.assert = assert;
exports.expect = expect;
exports.match = sinon.match;

exports.assertCalledOnceAndTrigger = (context, args) =>
{
  assert.calledWithMatch(context.addListener, sinon.match.func);
  assert.calledOnce(context.addListener);
  context.trigger(args);
};

exports.assertExists = (path, expected) =>
{
  return new Promise((resolve, reject) =>
  {
    fs.access(path, fs.constants.F_OK, (err) =>
    {
      let exists = !err;
      if (exists === expected)
      {
        resolve();
      }
      else
      {
        reject(new Error(
          `Expected path '${path}' ${expected ? "to" : "to not"} exist`
        ));
      }
    });
  });
};

exports.expectFromList = (value, {done, expecting, sequential}) =>
{
  if (sequential)
  {
    let expected = expecting.shift();
    try
    {
      expect(value).to.deep.equal(expected);
    }
    catch (ex)
    {
      // We haven't found the expected value yet so we need to keep
      // searching for it
      expecting.unshift(expected);
    }
  }
  else
  {
    let idx = expecting.findIndex((expected) =>
    {
      try
      {
        expect(value).to.deep.equal(expected);
        return true;
      }
      catch (ex)
      {
        return false;
      }
    });

    if (idx > -1)
    {
      expecting.splice(idx, 1);
    }
  }

  if (expecting.length === 0 && done)
  {
    done();
  }
};

/**
 * Setup proxy for logging require() calls
 */
function setupRequireProxy()
{
  moduleIds = new Set();
  Module.prototype.require = function(id)
  {
    moduleIds.add(id);
    return origRequire.call(this, id);
  };
}
exports.setupRequireProxy = setupRequireProxy;

/**
 * Checks whether given modules got loaded
 * @param {Object.<string, boolean>} expected - map indicating which modules
 *   are expected to be loaded/not loaded
 */
function expectLoaded(expected)
{
  if (!moduleIds)
    throw new Error("Call setupRequireProxy() first");

  for (let moduleId in expected)
  {
    expect(moduleIds.has(moduleId)).to.equal(expected[moduleId]);
  }

  Module.prototype.require = origRequire;
  moduleIds = null;
}
exports.expectLoaded = expectLoaded;

function prepareExpectObject(base)
{
  return (obj, expected) =>
  {
    expected = Object.assign({}, base, expected);
    expect(obj).to.deep.equal(expected);
  };
}
exports.prepareExpectObject = prepareExpectObject;
