"use strict";

const {expect} = require("../assert");

const defaultLocale = require("../../src/_locales/en/messages.json");

describe("Test the default locale", () =>
{
  it("has required values", () =>
  {
    expect(defaultLocale).to.have.property("name");
    expect(defaultLocale).to.have.property("name_development");
    expect(defaultLocale).to.have.property("name_staging");
    expect(defaultLocale).to.have.property("name_usertesting");
    expect(defaultLocale).to.have.property("description");
  });
});
