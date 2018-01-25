"use strict";

const {expect} = require("../assert");
const {spawn} = require("../utils");
const {createEnvironment} = require("../environments/virtual-element");

describe("Test VirtualElement", () =>
{
  it("renderTree() returns a root", () =>
  {
    return spawn(function*()
    {
      const {VirtualElement, h, document} = yield createEnvironment();

      class TestElement extends VirtualElement
      {
        renderTree()
        {
          return h("div.test", "test");
        }
      }

      document.registerElement("test-element", TestElement);

      let testEle = document.createElement("test-element");
      document.body.appendChild(testEle);

      expect(testEle.children.length).to.be.equal(1);
      expect(testEle.children[0].innerHTML).to.be.equal("test");
    });
  });

  it("renderTree() returns an array with single element", () =>
  {
    return spawn(function*()
    {
      const {VirtualElement, h, document} = yield createEnvironment();

      class TestElement extends VirtualElement
      {
        renderTree()
        {
          return [h("div.test", "test")];
        }
      }

      document.registerElement("test-element", TestElement);

      let testEle = document.createElement("test-element");
      document.body.appendChild(testEle);

      expect(testEle.children.length).to.be.equal(1);
      expect(testEle.children[0].innerHTML).to.be.equal("test");
    });
  });

  it("renderTree() returns an array with multiple elements", () =>
  {
    return spawn(function*()
    {
      const {VirtualElement, h, document} = yield createEnvironment();

      class TestElement extends VirtualElement
      {
        renderTree()
        {
          return [h("div.test1", "test1"), h("div.test2", "test2")];
        }
      }

      document.registerElement("test-element", TestElement);

      let testEle = document.createElement("test-element");
      document.body.appendChild(testEle);

      expect(testEle.children.length).to.be.equal(2);
      expect(testEle.children[0].innerHTML).to.be.equal("test1");
      expect(testEle.children[1].innerHTML).to.be.equal("test2");
    });
  });

  it("multiple renderTree() calls work for single root node", () =>
  {
    return spawn(function*()
    {
      const EXPECTED = ["foo", "bar"];
      const {VirtualElement, h, document} = yield createEnvironment();

      class TestElement extends VirtualElement
      {
        get data()
        {
          return this._data || EXPECTED[0];
        }

        set data(value)
        {
          return this._data = value;
        }

        renderTree()
        {
          return h("div", this.data);
        }

        change()
        {
          this.data = EXPECTED[1];
          this.render();
        }
      }

      document.registerElement("test-element", TestElement);

      let testEle = document.createElement("test-element");
      document.body.appendChild(testEle);

      expect(testEle.children.length).to.be.equal(1);
      expect(testEle.children[0].innerHTML).to.be.equal(EXPECTED[0]);

      testEle.change();

      expect(testEle.children.length).to.be.equal(1);
      expect(testEle.children[0].innerHTML).to.be.equal(EXPECTED[1]);
    });
  });

  it("multiple renderTree() calls work for array of nodes", () =>
  {
    return spawn(function*()
    {
      const EXPECTED = ["foo", "bar"];
      const {VirtualElement, h, document} = yield createEnvironment();

      class TestElement extends VirtualElement
      {
        get data()
        {
          return this._data || EXPECTED[0];
        }

        set data(value)
        {
          return this._data = value;
        }

        renderTree()
        {
          return [h("div", this.data), h("div", EXPECTED[0])];
        }

        change()
        {
          this.data = EXPECTED[1];
          this.render();
        }
      }

      document.registerElement("test-element", TestElement);

      let testEle = document.createElement("test-element");
      document.body.appendChild(testEle);

      expect(testEle.children.length).to.be.equal(2);
      expect(testEle.children[0].innerHTML).to.be.equal(EXPECTED[0]);
      expect(testEle.children[1].innerHTML).to.be.equal(EXPECTED[0]);

      testEle.change();

      expect(testEle.children.length).to.be.equal(2);
      expect(testEle.children[0].innerHTML).to.be.equal(EXPECTED[1]);
      expect(testEle.children[1].innerHTML).to.be.equal(EXPECTED[0]);
    });
  });
});
