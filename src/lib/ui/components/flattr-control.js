"use strict";

require("./virtual/input-toggle");

const {document, CustomEvent} = require("global/window");

const {
  STATUS_BLOCKED,
  STATUS_DISABLED,
  STATUS_ENABLED,
  STATUS_UNDEFINED
} = require("../../common/constants");
require("./virtual/anchor");
const i18n = require("../i18n");
const {v, h, VirtualElement} = require("./virtual-element");

const requiredProps = [
  "attention",
  "entity",
  "flattrs",
  "hasAuthors",
  "status"
];

class FlattrControl extends VirtualElement
{
  set attention(attention)
  {
    this._attention = attention;
    this.render();
  }

  set entity(entity)
  {
    this._entity = entity;
    this.render();
  }

  set hasAuthors(hasAuthors)
  {
    this._hasAuthors = hasAuthors;
    this.render();
  }

  set status(status)
  {
    this._status = status;
    if (status.entity == STATUS_DISABLED)
    {
      this._isExpanded = false;
    }
    this.render();
  }

  _renderFlattrList()
  {
    return this._flattrs.map(({count, title, url}) =>
    {
      return h("li", [
        h("span.flattr-url-count", [count]),
        h("span.url-title", {title: url}, title || url)
      ]);
    });
  }

  addFlattrs(...flattrs)
  {
    this._flattrs = this._flattrs || [];
    for (let flattr of flattrs)
    {
      let existing = this._flattrs.find(({url}) => url == flattr.url);
      if (!existing)
      {
        existing = {
          count: 0,
          title: flattr.title,
          url: flattr.url
        };
        this._flattrs.push(existing);
      }

      existing.count += flattr.count || 1;
    }
    this.render();
  }

  setFlattrs(...args)
  {
    this._flattrs = [];
    this.addFlattrs(...args);
  }

  updateStatus(status)
  {
    this._status.entity = status;
    this.render();
  }

  renderTree()
  {
    if (!this.isInitialized(requiredProps))
      return;

    if (this._status.entity == STATUS_BLOCKED ||
        this._status.entity == STATUS_UNDEFINED)
    {
      let id = (this._status == STATUS_BLOCKED) ? "blocked" : "error";
      return h(
        "div.message.icon.icon-ban",
        i18n.get(`popup_message_${id}`)
      );
    }

    let flattrButton = null;
    if (this._status.url == STATUS_BLOCKED)
    {
      flattrButton = h(
        "div.message.icon.icon-ban",
        i18n.get("popup_message_blocked_url")
      );
    }
    else
    {
      flattrButton = v(
        "anchor",
        {name: "flattr-button"},
        h(
          "button.flattr-button",
          {
            onclick: (ev) =>
            {
              if (ev.target.dataset.flattred)
                return;

              this.dispatchEvent(new CustomEvent("added"));
              ev.stopPropagation();

              ev.target.dataset.flattred = true;
            },
            onmouseout(ev)
            {
              delete ev.target.dataset.flattred;
            }
          },
          [
            h("span", {dataset: {state: "default"}},
                i18n.get("popup_flattrButton_default")),
            h("span", {dataset: {state: "default-hover"}},
                i18n.get("popup_flattrButton_defaultHover")),
            h("span", {dataset: {state: "flattred"}},
                i18n.get("popup_flattrButton_flattred")),
            h("div.flattr-attention", {
              style: {width: `${this._attention * 100}%`}
            })
          ]
        )
      );
    }

    if (typeof this._isExpanded == "undefined")
    {
      this._isExpanded = false;
    }

    this.setBoolAttribute("disabled", this._status.entity == STATUS_DISABLED);
    this.setBoolAttribute("flattred", this._flattrs.length > 0);

    let flattrCount = this._flattrs
        .reduce((total, {count}) => total + count, 0);
    let flattrList = this._renderFlattrList();

    let authorLabel = null;
    if (this._hasAuthors)
    {
      authorLabel = h("em", i18n.get("popup_flattrEnable_author"));
    }

    let isEnabled = this._status.entity == STATUS_ENABLED;

    return [
      flattrButton,
      h(
        "div.flattr-list",
        {className: (this._isExpanded) ? "" : "collapsed"},
        [
          h("div", [
            h("span.flattr-count", [flattrCount]),
            h(
              "span",
              i18n.getNodes("popup_flattrList_title_" +
                ((flattrCount > 1) ? "plural" : "singular"))
            ),
            h("button.flattr-collapse", {
              onclick: () =>
              {
                this._isExpanded = !this._isExpanded;
                if (this._isExpanded)
                {
                  let ev = new CustomEvent("expanded");
                  this.dispatchEvent(ev);
                }
                this.render();
              }
            })
          ]),
          h("ul", flattrList)
        ]
      ),
      v(
        "anchor",
        {name: "flattr-enable"},
        h("div.flattr-enable", [
          v("input-toggle", {
            attributes: {default: "off"},
            checked: isEnabled,
            onclick: (ev) =>
            {
              let isChecked = ev.target.checked;
              let newEvent = new CustomEvent("status-changed", {
                detail: {
                  status: (isChecked) ? STATUS_ENABLED : STATUS_DISABLED,
                  entity: this._entity
                }
              });
              this.dispatchEvent(newEvent);
              ev.stopPropagation();
            }
          }),
          h("label", [
            h(
              "span",
              i18n.getNodes(
                "popup_flattrEnable_label",
                {values: [this._entity]}
              )
            ),
            h(
              "em",
              (isEnabled) ?
                i18n.get("popup_flattrEnable_enabled") :
                i18n.get("popup_flattrEnable_disabled")
            ),
            authorLabel
          ])
        ])
      )
    ];
  }
}

document.registerElement("flattr-control", FlattrControl);
