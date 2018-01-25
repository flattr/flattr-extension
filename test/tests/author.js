"use strict";

const requireInject = require("require-inject");
const {expect} = require("chai");
const {jsdom} = require("jsdom");

describe("Test author handling", () =>
{
  // For now the author detection is only active on youtube.com
  it("Should ignore non-youtube.com domains", () =>
  {
    requireInject("../../src/lib/content/stats/author", {
      "global/window":
      {
        document: {domain: "www.example.com"}
      },
      "../../src/lib/common/events":
      {
        on(type)
        {
          throw new Error(`Unexpected listener for "${type}" event`);
        }
      }
    });
  });

  it("Should extract schema.org information from page", (done) =>
  {
    const authorId = "http://example.com/author";
    let document = jsdom(`
      <div itemprop="author">
        <a itemprop="url" href="${authorId}"></a>
      </div>
    `);

    // For now the author detection is only active on youtube.com
    document.domain = "www.youtube.com";

    requireInject("../../src/lib/content/stats/author", {
      "global/window":
      {
        document,
        setTimeout: (listener) => listener()
      },
      "../../src/lib/common/events":
      {
        emit(type, action, data)
        {
          expect(type).to.be.equal("stats");
          expect(action).to.be.equal("author");
          expect(data).to.be.equal(authorId);
          done();
        },
        on: (type, listener) => listener()
      }
    });
  });
});
