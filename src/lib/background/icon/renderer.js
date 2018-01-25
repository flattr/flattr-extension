/**
 * @file Renders toolbar icons
 */

"use strict";

const {document} = require("global/window");

const animationStepCount = 10;
const animationLength = 1000; // 00:00:01
const iconColors = {
  default: [0x00, 0x00, 0x00, 0xFF],
  disabled: [0x88, 0x88, 0x88, 0xFF],
  enabled: [0x3D, 0x99, 0x2E, 0xFF],
  error: [0xE1, 0x1A, 0x2C, 0xFF],
  info: [0x08, 0x9E, 0xCD, 0xFF]
};
const iconOffset = 2;
const iconSize = 32;

let iconCache = new Map();

function loadImage(url)
{
  let element = document.createElement("img");
  let promise = new Promise((resolve, reject) =>
  {
    element.onload = () => resolve();
    element.onerror = () => reject(`Failed to load image ${url}`);
    element.src = url;
  });
  return {element, promise};
}

let image = loadImage("icons/flattr-30x30-default.png");
let bgImage = loadImage("icons/circle-15x15-default.png");
let subImage = loadImage("icons/star-11x11-sub.png");

let canvas = document.createElement("canvas");
canvas.width = iconSize;
canvas.height = iconSize;
let ctx = canvas.getContext("2d");

/**
 * Render icon image
 * @param {number} progress - progress of animation (0: start, 1: end)
 * @param {Object} tabIcon - tab icon data
 * @param {string} [tabIcon.lastState] - previous state name
 * @param {string} tabIcon.state - state name
 * @param {string} [tabIcon.subIcon] - sub icon name
 * @return {Object} - icon data
 */
function draw(progress, {lastState, state, subIcon})
{
  // Initialize canvas
  ctx.clearRect(0, 0, iconSize, iconSize);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Draw icon and rotate
  let centerRotation = (iconSize + iconOffset) / 2;
  let centerIcon = (iconSize - iconOffset) / 2;
  // We're only rotating the icon half-way
  let angle = progress * Math.PI;
  ctx.translate(centerRotation, centerRotation);
  ctx.rotate(angle);
  ctx.drawImage(image.element, -centerIcon, -centerIcon);
  ctx.rotate(-angle);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Draw sub icon background
  if (subIcon)
  {
    ctx.globalAlpha = progress;
    ctx.drawImage(bgImage.element, 0, 0);
  }

  // Apply color
  let color = iconColors[state];
  if (lastState)
  {
    color = iconColors[lastState].map((colorValue, idx) =>
    {
      return Math.floor(
        colorValue * (1 - progress) +
        color[idx] * progress,
        0
      );
    });
  }

  ctx.fillStyle = `rgba(${color.join()})`;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-in";
  ctx.fillRect(0, 0, iconSize, iconSize);

  // Draw sub icon content
  if (subIcon == "star")
  {
    ctx.globalAlpha = progress;
    ctx.globalCompositeOperation = "lighten";
    ctx.drawImage(subImage.element, 2, 2);
  }

  return ctx.getImageData(0, 0, iconSize, iconSize);
}

function wait(duration)
{
  return new Promise((resolve) =>
  {
    setTimeout(resolve, duration);
  });
}

function drawAnimated(tabIcon, onImageData)
{
  let transitioned = Promise.resolve();

  for (let i = 0; i <= animationStepCount; i++)
  {
    transitioned = transitioned.then(() =>
    {
      onImageData(draw(i / animationStepCount, tabIcon));

      // We cannot use requestAnimationFrame() here because Chrome doesn't
      // call its callback when it's run within the background page
      // https://bugs.chromium.org/p/chromium/issues/detail?id=763395
      return wait(animationLength / animationStepCount);
    });
  }

  return transitioned;
}

function drawStatic(tabIcon, onImageData)
{
  let cacheId = `${tabIcon.state}-${tabIcon.subIcon || "none"}`;
  let imageData = iconCache.get(cacheId);
  if (!imageData)
  {
    imageData = draw(1, tabIcon);
    iconCache.set(cacheId, imageData);
  }
  onImageData(imageData);
}

/**
 * Retrieve color and image data for tab icon
 * @param {Object} tabIcon - tab icon data
 * @param {Function} onImageData - callback handling image data
 * @return {Object} icon data (color, promise)
 */
function getIconData(tabIcon, onImageData)
{
  let transitioned = Promise.all([image.promise, subImage.promise])
    .then(() =>
    {
      let fn = (tabIcon.animate) ? drawAnimated : drawStatic;
      return fn(tabIcon, onImageData);
    });

  let color = iconColors[tabIcon.state];
  return {color, transitioned};
}
exports.getIconData = getIconData;
