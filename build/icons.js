/**
 * @file Generates Flattr icons
 */

"use strict";

const gulp = require("gulp");
const rename = require("gulp-rename");
const replace = require("gulp-replace");
const svg2png = require("gulp-svg2png");

const colors = {
  default: "#000",
  disabled: "#888",
  sub: "#FFF"
};
const iconSizes = {
  circle: 16,
  flattr: 64,
  star: 12
};
const iconConfig = [
  {src: "flattr", name: "default", size: 16},
  {src: "flattr", name: "default", size: 30},
  {src: "flattr", name: "default", size: 32},
  {src: "flattr", name: "default", size: 48},
  {src: "flattr", name: "default", size: 64},
  {src: "flattr", name: "default", size: 96},
  {src: "flattr", name: "default", size: 128},
  {src: "flattr", name: "disabled", size: 16, x: -4, y: -4},
  {src: "flattr", name: "disabled", size: 32, x: -4, y: -4},
  {src: "circle", name: "default", size: 15},
  {src: "star", name: "sub", size: 11},
  {src: "star", name: "sub", size: 20}
];

function generateIcon({name, size, src, x = 0, y = 0})
{
  let iconSize = iconSizes[src];
  return gulp.src(`build/icons/${src}.svg`)
    .pipe(rename(`${src}-${size}x${size}-${name}.png`))
    .pipe(replace(/COLOR/g, colors[name]))
    .pipe(replace(/VIEWBOX/g, `${x} ${y} ${iconSize - x} ${iconSize - y}`))
    .pipe(svg2png({width: size, height: size}))
    .pipe(gulp.dest("src/icons"));
}

function generateIcons()
{
  let promisedIcons = iconConfig.map(generateIcon);
  return Promise.all(promisedIcons);
}
exports.generateIcons = generateIcons;
