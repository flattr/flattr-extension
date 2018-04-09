"use strict";

const {
  ATTENTION_AUDIO_THRESHOLDS,
  ATTENTION_LAST_THRESHOLD,
  ATTENTION_THRESHOLDS
} = require("../../common/constants");
const tabPages = require("../tabPages");

const MAX_ATTENTION = ATTENTION_LAST_THRESHOLD * 10000;

function* getThresholds(url)
{
  let thresholds = ATTENTION_THRESHOLDS;

  let tabPage = tabPages.getByUrl(url);
  if (tabPage && tabPage.isAudio)
  {
    thresholds = ATTENTION_AUDIO_THRESHOLDS;
  }
  for (let threshold of thresholds)
  {
    yield threshold;
  }

  let threshold = 0;
  while (true)
  {
    threshold += ATTENTION_LAST_THRESHOLD;
    yield threshold;
  }
}

function validate(fn)
{
  return (url, attention) =>
  {
    if (typeof attention != "number" || Number.isNaN(attention))
      throw new TypeError("Attention is not a number");

    if (attention > MAX_ATTENTION)
      throw new RangeError("Attention is too large");

    return fn(url, attention);
  };
}

function getAttentionProgress(url, attention)
{
  let previous = 0;
  for (let threshold of getThresholds(url))
  {
    if (attention < threshold)
      return (attention - previous) / (threshold - previous);

    previous = threshold;
  }
}
exports.getAttentionProgress = validate(getAttentionProgress);

function getRemainingAttention(url, attention)
{
  for (let threshold of getThresholds(url))
  {
    if (attention < threshold)
      return threshold - attention;
  }
}
exports.getRemainingAttention = validate(getRemainingAttention);
