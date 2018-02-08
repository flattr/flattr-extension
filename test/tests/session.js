"use strict";

const {removeAllDatabases} = require("../mocks/dexie");

const {run} = require("../mocks/sessionRunner");
const {expect} = require("../assert");
const {
  ATTENTION_DURATION,
  ATTENTION_THRESHOLDS
} = require("../../src/lib/common/constants");

const mockEntity = "example.com";
const mockUrl = "http://www.example.com/foo-session";
const mockUrlVideo = "http://www.example.com/myvideo";
const mockUrlOther = "http://www.example.com/bar-session";

describe("Test session management", () =>
{
  beforeEach(removeAllDatabases);
  after(removeAllDatabases);

  it("Should gather attention on interaction", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(5);

    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000200000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: ATTENTION_DURATION,
          entity: mockEntity,
          url: mockUrl
        }
      ]
    });
  });

  it("Should not gather attention simultaneously", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(5);
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 1, "pointermoved", null],
        [1480000200000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: ATTENTION_DURATION + 5,
          entity: mockEntity,
          url: mockUrl
        }
      ]
    });
  });

  it("Should stop gathering attention after tab is removed", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(5);
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 1, "scrolled-start",
            {x: 0, y: 100, width: 1000, height: 2000}],
        [1480000020000, 1, "scrolled-ongoing",
            {x: 0, y: 200, width: 1000, height: 2000}],
        [1480000025000, 1, "scrolled-end",
            {x: 0, y: 300, width: 1000, height: 2000}],
        [1480000030000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 20,
          entity: mockEntity,
          url: mockUrl
        }
      ]
    });
  });

  it("Should stop and start attention gathering when URL changes", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(5);
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000014000, 1, "url", mockUrlOther],
        [1480000015000, 1, "page-loaded", 200],
        [1480000200000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 5,
          entity: mockEntity,
          url: mockUrl
        },
        {
          attention: ATTENTION_DURATION,
          entity: mockEntity,
          url: mockUrlOther
        }
      ]
    });
  });

  it("Should only gather attention when tab is selected", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(5);
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000004000, 1, "url", mockUrl],
        [1480000005000, 1, "page-loaded", 200],
        [1480000010000, 1, "selected", null],
        [1480000015000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 5,
          entity: mockEntity,
          url: mockUrl
        }
      ]
    });
  });

  it("Should switch attention gathering when selecting other tab", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(5);

    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 2, "created", {index: 2, openerId: null, windowId: 1}],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000014000, 2, "url", mockUrlOther],
        [1480000015000, 2, "page-loaded", 200],
        [1480000020000, 1, "selected", null],
        [1480000025000, 2, "selected", null],
        [1480000200000, 1, "removed", null],
        [1480000205000, 2, "removed", null]
      ],
      expectedPages: [
        {
          attention: 5,
          entity: mockEntity,
          url: mockUrl
        },
        {
          attention: ATTENTION_DURATION,
          entity: mockEntity,
          url: mockUrlOther
        }
      ]
    });
  });

  it("Should gather attention globally if URL open in multiple tabs", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(10);
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 2, "created", {index: 2, openerId: null, windowId: 1}],
        [1480000020000, 2, "selected", null],
        [1480000025000, 1, "removed", null],
        [1480000029000, 2, "url", mockUrl],
        [1480000030000, 2, "page-loaded", 200],
        [1480000035000, 2, "removed", null]
      ],
      expectedPages: [
        {
          attention: 15,
          entity: mockEntity,
          url: mockUrl
        }
      ]
    });
  });

  it("Should continue gathering attention when coming back to URL", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(5);
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000014000, 1, "url", mockUrlOther],
        [1480000015000, 1, "page-loaded", 200],
        [1480000019000, 1, "url", mockUrl],
        [1480000020000, 1, "page-loaded", 200],
        [1480000025000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 5,
          entity: mockEntity,
          url: mockUrlOther
        },
        {
          attention: 10,
          entity: mockEntity,
          url: mockUrl
        }
      ]
    });
  });

  it("Should manually flattr URL", () =>
  {
    expect(ATTENTION_DURATION).to.be.at.least(5);
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 1, "user-flattr-added", null],
        [1480000020000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 10,
          entity: mockEntity,
          manualAttention: ATTENTION_THRESHOLDS[0] - 5,
          url: mockUrl
        }
      ],
      expectedSubmissions: [
        [1480000015000, mockUrl]
      ]
    });
  });

  it("Should flattr URL multiple times", () =>
  {
    expect(ATTENTION_DURATION).to.be.equal(15);
    expect(ATTENTION_THRESHOLDS[0]).to.be.equal(50);
    expect(ATTENTION_THRESHOLDS[1]).to.be.equal(96);
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000100000, 1, "pointerclicked", null],
        [1480000200000, 1, "pointerclicked", null],
        [1480000300000, 1, "pointerclicked", null],
        [1480000400000, 1, "pointerclicked", null],
        [1480000500000, 1, "pointerclicked", null],
        [1480000600000, 1, "pointerclicked", null],
        [1480001505000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: ATTENTION_DURATION * 7,
          entity: mockEntity,
          url: mockUrl
        }
      ],
      expectedSubmissions: [
        [1480000315000, mockUrl],
        [1480000615000, mockUrl]
      ]
    });
  });

  it("Should handle manual and automatic flattring in parallel", () =>
  {
    expect(ATTENTION_DURATION).to.be.equal(15);
    expect(ATTENTION_THRESHOLDS[1]).to.be.equal(96);

    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 200],
        [1480000110000, 1, "pointermoved", null],
        [1480000210000, 1, "pointermoved", null],
        [1480000310000, 1, "pointermoved", null],
        [1480000409000, 1, "url", mockUrl],
        [1480000410000, 1, "page-loaded", 200],
        [1480000415000, 1, "user-flattr-added", null],
        [1480000420000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: ATTENTION_DURATION * 4 + 10,
          entity: mockEntity,
          manualAttention: 31,
          url: mockUrl
        }
      ],
      expectedSubmissions: [
        [1480000325000, mockUrl],
        [1480000415000, mockUrl]
      ]
    });
  });

  it("Should ignore pages after they failed to load", () =>
  {
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000009000, 1, "url", mockUrl],
        [1480000010000, 1, "page-loaded", 500],
        [1480000020000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 0,
          entity: mockEntity,
          url: mockUrl
        }
      ]
    });
  });

  it("Audio: Should create flattrs", () =>
  {
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000010000, 1, "url", mockUrlVideo],
        [1480000010000, 1, "page-loaded", 200],
        [1480000200000, 1, "audible", true],
        [1480000215000, 1, "audible-ongoing", null],
        [1480000230000, 1, "audible-ongoing", null],
        [1480000245000, 1, "audible-ongoing", null],
        [1480000260000, 1, "audible-ongoing", null],
        [1480000275000, 1, "audible-ongoing", null],
        [1480000290000, 1, "audible-ongoing", null],
        [1480000305000, 1, "audible-ongoing", null],
        [1480000320000, 1, "audible-ongoing", null],
        [1480000335000, 1, "audible-ongoing", null],
        [1480000350000, 1, "audible-ongoing", null],
        [1480000365000, 1, "audible-ongoing", null],
        [1480000380000, 1, "audible-ongoing", null],
        [1480000395000, 1, "audible-ongoing", null],
        [1480000410000, 1, "audible-ongoing", null],
        [1480000425000, 1, "audible-ongoing", null],
        [1480000440000, 1, "audible-ongoing", null],
        [1480000455000, 1, "audible-ongoing", null],
        [1480000470000, 1, "audible-ongoing", null],
        [1480000485000, 1, "audible-ongoing", null],
        [1480000500000, 1, "audible-ongoing", null],
        [1480000515000, 1, "audible-ongoing", null],
        [1480000530000, 1, "audible-ongoing", null],
        [1480000545000, 1, "audible-ongoing", null],
        [1480000560000, 1, "audible-ongoing", null],
        [1480000575000, 1, "audible-ongoing", null],
        [1480000590000, 1, "audible-ongoing", null],
        [1480000605000, 1, "audible-ongoing", null],
        [1480000620000, 1, "audible-ongoing", null],
        [1480000635000, 1, "audible-ongoing", null],
        [1480000650000, 1, "audible-ongoing", null],
        [1480000665000, 1, "audible-ongoing", null],
        [1480000680000, 1, "audible-ongoing", null],
        [1480000695000, 1, "audible-ongoing", null],
        [1480000710000, 1, "audible-ongoing", null],
        [1480000725000, 1, "audible-ongoing", null],
        [1480000740000, 1, "audible-ongoing", null],
        [1480000755000, 1, "audible-ongoing", null],
        [1480000770000, 1, "audible-ongoing", null],
        [1480000785000, 1, "audible-ongoing", null],
        [1480000800000, 1, "audible-ongoing", null],
        [1480000815000, 1, "audible-ongoing", null],
        [1480000830000, 1, "audible-ongoing", null],
        [1480000845000, 1, "audible-ongoing", null],
        [1480000860000, 1, "audible-ongoing", null],
        [1480000875000, 1, "audible-ongoing", null],
        [1480000890000, 1, "audible-ongoing", null],
        [1480000905000, 1, "audible-ongoing", null],
        [1480000920000, 1, "audible-ongoing", null],
        [1480000935000, 1, "audible-ongoing", null],
        [1480000950000, 1, "audible-ongoing", null],
        [1480000965000, 1, "audible-ongoing", null],
        [1480000980000, 1, "audible-ongoing", null],
        [1480000995000, 1, "audible-ongoing", null],
        // TODO: "audible" and "muted" events don't interrupt attention
        // gathering so full 15s are counted and not just 5s
        [1480001000000, 1, "audible", false],
        [1480002000000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: ATTENTION_DURATION + 800,
          entity: mockEntity,
          isAudio: true,
          url: mockUrlVideo
        }
      ],
      expectedSubmissions: [
        [1480000335000, mockUrlVideo],
        [1480000590000, mockUrlVideo]
      ]
    });
  });

  it("Audio: Should stop when tab is no longer audible", () =>
  {
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000010000, 1, "url", mockUrlVideo],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 1, "audible", true],
        [1480000020000, 1, "audible", false],
        [1480002000000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 10,
          entity: mockEntity,
          url: mockUrlVideo
        }
      ]
    });
  });

  it("Audio: Should not stop regular attention gathering ", () =>
  {
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000010000, 1, "url", mockUrlVideo],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 1, "audible", true],
        [1480000020000, 1, "pointermoved", null],
        [1480000025000, 1, "audible", false],
        [1480002000000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 25,
          entity: mockEntity,
          url: mockUrlVideo
        }
      ]
    });
  });

  it("Audio: Small snippets of sound should not cause page to be marked", () =>
  {
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000010000, 1, "url", mockUrlVideo],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 1, "audible", true],
        [1480000030000, 1, "audible-ongoing", null],
        [1480000031000, 1, "audible", false],
        [1480000040000, 1, "audible", true],
        [1480000055000, 1, "audible-ongoing", null],
        [1480000056000, 1, "audible", false],
        [1480002000000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 37,
          entity: mockEntity,
          url: mockUrlVideo
        }
      ]
    });
  });

  it("Audio: Should consider tab being muted", () =>
  {
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 1, "selected", null],
        [1480000010000, 1, "url", mockUrlVideo],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 1, "audible", true],
        [1480000020000, 1, "muted", true],
        [1480000200000, 1, "audible", false],
        [1480002000000, 1, "removed", null]
      ],
      expectedPages: [
        {
          attention: 10,
          entity: mockEntity,
          url: mockUrlVideo
        }
      ]
    });
  });

  it("Audio: Should gather attention in parallel to regular algorithm", () =>
  {
    let url = "http://www.example.com/myarticle";
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 2, "created", {index: 2, openerId: null, windowId: 1}],
        [1480000010000, 1, "url", mockUrlVideo],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 2, "url", url],
        [1480000015000, 2, "page-loaded", 200],
        [1480000020000, 2, "selected", null],
        [1480000025000, 1, "audible", true],
        [1480000030000, 2, "pointermoved", null],
        [1480000040000, 1, "audible-ongoing", null],
        [1480000050000, 2, "pointermoved", null],
        [1480000055000, 1, "audible-ongoing", null],
        [1480000070000, 2, "pointermoved", null],
        [1480000070000, 1, "audible-ongoing", null],
        [1480000095000, 1, "audible-ongoing", null],
        [1480000110000, 1, "audible-ongoing", null],
        [1480000125000, 1, "audible-ongoing", null],
        [1480000140000, 1, "audible-ongoing", null],
        [1480000155000, 1, "audible-ongoing", null],
        [1480000170000, 1, "audible-ongoing", null],
        [1480000185000, 1, "audible-ongoing", null],
        [1480000190000, 1, "removed", null],
        [1480000210000, 2, "removed", null]
      ],
      expectedPages: [
        {
          attention: 55,
          entity: mockEntity,
          url
        },
        {
          attention: 165,
          entity: mockEntity,
          isAudio: true,
          url: mockUrlVideo
        }
      ],
      expectedSubmissions: [
        [1480000085000, url],
        [1480000175000, mockUrlVideo]
      ]
    });
  });

  it("Audio: Should gather attention in multiple tabs", () =>
  {
    let url = "http://www.example.com/myvideo2";
    return run({
      events: [
        [1480000000000, 1, "created", {index: 1, openerId: null, windowId: 1}],
        [1480000005000, 2, "created", {index: 2, openerId: null, windowId: 1}],
        [1480000010000, 1, "url", mockUrlVideo],
        [1480000010000, 1, "page-loaded", 200],
        [1480000015000, 2, "url", url],
        [1480000015000, 2, "page-loaded", 200],
        [1480000025000, 1, "audible", true],
        [1480000030000, 2, "audible", true],
        [1480000040000, 1, "audible-ongoing", null],
        [1480000045000, 2, "audible-ongoing", null],
        [1480000055000, 1, "audible-ongoing", null],
        [1480000060000, 2, "audible-ongoing", null],
        [1480000070000, 1, "audible-ongoing", null],
        [1480000075000, 2, "audible-ongoing", null],
        [1480000085000, 1, "audible-ongoing", null],
        [1480000090000, 2, "audible-ongoing", null],
        [1480000105000, 2, "audible-ongoing", null],
        [1480000100000, 1, "removed", null],
        [1480000110000, 2, "removed", null]
      ],
      expectedPages: [
        {
          attention: 75,
          entity: mockEntity,
          isAudio: true,
          url: mockUrlVideo
        },
        {
          attention: 80,
          entity: mockEntity,
          isAudio: true,
          url
        }
      ]
    });
  });
});
