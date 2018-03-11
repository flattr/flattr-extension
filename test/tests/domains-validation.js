"use strict";

const requireInject = require("require-inject");

const {assert} = require("../assert");

const TEST_PATH = "../../src/lib/background/domains/validate";

describe("Test domains list validation", () =>
{
  it("internal domains list is valid", () =>
  {
    const {validateDomainsList} = requireInject(TEST_PATH);

    assert.isOk(
      validateDomainsList(require("../../src/data/domains.json")),
      "internal json file passes validation");
  });

  it("domains list requires a status property", () =>
  {
    const {validateDomainsList} = requireInject(TEST_PATH);

    assert.throws(
      () => validateDomainsList({
        authors: []
      }),
      /domains list is expected to have/,
      "missing status property fails validation");
  });

  it("domains list requires an array of authors", () =>
  {
    const {validateDomainsList} = requireInject(TEST_PATH);

    assert.throws(
      () => validateDomainsList({
        status: {}
      }),
      /domains list is expected to have/,
      "missing authors array fails validation");
  });
});
