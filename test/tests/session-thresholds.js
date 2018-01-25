"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");

const T1 = 100; // 00:01:40
const T2 = 300; // 00:05:00
const T3 = 900; // 00:15:00
const T4 = 2700; // 00:45:00
const TN = 86400; // 24:00:00
const V1 = 200; // 00:03:20
const videoDomain = "video.com";

const {getAttentionProgress, getRemainingAttention} =
    requireInject("../../src/lib/background/session/thresholds", {
      "../../src/lib/common/constants": {
        ATTENTION_LAST_THRESHOLD: TN,
        ATTENTION_THRESHOLDS: [T1, T2, T3, T4],
        ATTENTION_THRESHOLDS_VIDEO: [V1]
      },
      "../../src/lib/background/domains": {
        hasDomainVideos: (entity) => entity == videoDomain
      }
    });

describe("Test Flattr attention thresholds", () =>
{
  /**
   * @type {Array}
   * @property {number} 0 - total attention
   * @property {number} 1 - previous threshold
   * @property {number} 2 - next threshold
   * @property {number} 3 - number of Flattrs
   */
  let expecting = [
    [0, 0, T1, 0],
    [T1 * 0.4, 0, T1, 0],
    [T1 - 1, 0, T1, 0],
    [T1, T1, T2, 1],
    [T1 + 1, T1, T2, 1],
    [T2 * 1.4, T2, T3, 2],
    [T4, T4, TN, 4],
    [TN, TN, TN * 2, 5],
    [TN + 1, TN, TN * 2, 5],
    [TN * 5 + 10, TN * 5, TN * 6, 9]
  ];

  it("Should return progress towards next threshold", () =>
  {
    for (let [attention, prev, next] of expecting)
    {
      expect(getAttentionProgress(null, attention))
          .to.equal((attention - prev) / (next - prev));
    }
  });

  it("Should return remaining attention until next threshold", () =>
  {
    for (let [attention,, next] of expecting)
    {
      expect(getRemainingAttention(null, attention)).to.equal(next - attention);
    }
  });

  it("Should use different thresholds depending on domain", () =>
  {
    let expected = [
      [null, T1],
      ["foo.com", T1],
      [videoDomain, V1]
    ];

    for (let [domain, threshold] of expected)
    {
      expect(getRemainingAttention(domain, 10)).to.equal(threshold - 10);
    }
  });
});
