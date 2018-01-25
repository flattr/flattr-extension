"use strict";

const {document} = require("global/window");

const settings = require("../../common/settings");

document.addEventListener("component-created", (ev) =>
{
  let flattrBeta = ev.detail;
  if (flattrBeta.localName != "popup-beta")
    return;

  Promise.all([
    settings.get("feedback.disabled", false),
    settings.get("feedback.collapsed", false)
  ])
  .then(([isDisabled, isCollapsed]) =>
  {
    flattrBeta.isCollapsed = isCollapsed;
    flattrBeta.isFeedbackEnabled = !isDisabled;
    flattrBeta.emitter.on("collapsed", () =>
    {
      settings.set("feedback.collapsed", flattrBeta.isCollapsed);
    });
  });
});
