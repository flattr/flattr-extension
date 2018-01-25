"use strict";

const {register, h} = require("../virtual-element");

function create({checked, attributes, onclick}, children)
{
  return h("input-toggle", [
    h("label", [
      h("input", {
        attributes,
        type: "checkbox",
        checked,
        onkeypress(e)
        {
          // enter key
          if (e.keyCode == 13)
          {
            this.click();
          }
        },
        onclick
      }),
      h("toggle", [h("knob")]),
      children
    ])
  ]);
}

register("input-toggle", create);
