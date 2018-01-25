"use strict";

const {jsdom} = require("jsdom");
const requireInject = require("require-inject");

const {expect} = require("../assert");

const {DOMParser, Text} = jsdom().defaultView;

const i18n = requireInject("../../src/lib/ui/i18n", {
  "global/window": {DOMParser, Text},
  "../../src/lib/common/env/chrome": {
    chrome: {
      i18n: {
        getMessage: (id, values) => (values) ? `${id}+[${values}]` : id
      }
    }
  },
  "../../src/lib/ui/components/virtual-element": {
    h: (...args) => args
  }
});

describe("Test lib/ui/i18n", () =>
{
  it("Should handle plain text", () =>
  {
    let str = "foo";

    let nodes = i18n.getNodes(str);
    expect(nodes).to.deep.equal([
      ["foo"]
    ]);

    nodes = i18n.getNodes(str, {values: ["bar", "baz"]});
    expect(nodes).to.deep.equal([
      ["foo+[bar,baz]"]
    ]);
  });

  it("Should handle <a> tags", () =>
  {
    let str = "<a>foo</a><a>bar</a>";
    expect(i18n.getNodes(str, {urls: ["FOO", "BAR"]})).to.deep.equal([
      [
        ["A", {href: "FOO"}, ["foo"]],
        ["A", {href: "BAR"}, ["bar"]]
      ]
    ]);
  });

  it("Should handle <br> tags", () =>
  {
    let str = "foo<br>bar";
    expect(i18n.getNodes(str)).to.deep.equal([
      ["foo"],
      ["bar"]
    ]);
  });

  it("Should handle <em> and <strong> tags", () =>
  {
    let str = "<strong>foo</strong><em>bar</em>";
    expect(i18n.getNodes(str)).to.deep.equal([
      [
        ["STRONG", null, ["foo"]],
        ["EM", null, ["bar"]]
      ]
    ]);
  });

  it("Should handle nested tags", () =>
  {
    let str = "foo <strong>bar <em>baz</em></strong> foo";
    expect(i18n.getNodes(str)).to.deep.equal([
      [
        "foo ",
        [
          "STRONG",
          null,
          [
            "bar ",
            ["EM", null, ["baz"]]
          ]
        ],
        " foo"
      ]
    ]);
  });

  it("Should handle unknown tags", () =>
  {
    let str = "foo <script>b<strong>a</strong>r</script> baz";
    expect(i18n.getNodes(str)).to.deep.equal([
      [
        "foo ",
        "b<strong>a</strong>r",
        " baz"
      ]
    ]);
  });
});
