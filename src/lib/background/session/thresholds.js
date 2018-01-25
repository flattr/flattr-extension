"use strict";

const {ATTENTION_LAST_THRESHOLD, ATTENTION_THRESHOLDS,
    ATTENTION_THRESHOLDS_VIDEO} = require("../../common/constants");
const {hasDomainVideos} = require("../domains");

const MAX_ATTENTION = ATTENTION_LAST_THRESHOLD * 10000;

function* getThresholds(entity)
{
  let thresholds = ATTENTION_THRESHOLDS;
  if (hasDomainVideos(entity))
  {
    thresholds = ATTENTION_THRESHOLDS_VIDEO;
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
  return (entity, attention) =>
  {
    if (typeof attention != "number" || Number.isNaN(attention))
      throw new TypeError("Attention is not a number");

    if (attention > MAX_ATTENTION)
      throw new RangeError("Attention is too large");

    return fn(entity, attention);
  };
}

function getAttentionProgress(entity, attention)
{
  let previous = 0;
  for (let threshold of getThresholds(entity))
  {
    if (attention < threshold)
      return (attention - previous) / (threshold - previous);

    previous = threshold;
  }
}
exports.getAttentionProgress = validate(getAttentionProgress);

function getRemainingAttention(entity, attention)
{
  for (let threshold of getThresholds(entity))
  {
    if (attention < threshold)
      return threshold - attention;
  }
}
exports.getRemainingAttention = validate(getRemainingAttention);
