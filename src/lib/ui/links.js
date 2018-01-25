"use strict";

const {window} = require("global/window");

const {openTab} = require("./open");

function getParentClickAction(ele)
{
  let click = ele && ele.getAttribute("data-click");

  if (click)
    return click;

  if (ele.parentElement)
  {
    return getParentClickAction(ele.parentElement);
  }

  return undefined;
}

function onClick(closeWindow, event)
{
  let element = event.target;
  let clickAction = getParentClickAction(element);

  if (!clickAction)
    return;

  event.preventDefault();
  if (clickAction == "open")
  {
    openTab({url: element.href})
      .then(() => (closeWindow) ? window.close() : null)
      .catch((err) => console.error(err));
  }
}

function init(ele, {closeWindow})
{
  ele.addEventListener("click", onClick.bind(null, closeWindow), false);
}
exports.init = init;
