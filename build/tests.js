/**
 * @file Provides methods for checking the source code for issues and
 *   for testing the functionality of the code
 */

"use strict";

const csslint = require("gulp-csslint");
const gulp = require("gulp");
const eslint = require("gulp-eslint");
const htmllint = require("gulp-htmllint");
const map = require("map-stream");

/**
 * Create a fail reporter for tests
 * @param {string} type
 * @return {stream.Stream}
 */
function makeFailReporter(type)
{
  return map((file, cb) =>
  {
    let data = file[type];
    if (("success" in data && !data.success) ||
        ("errorCount" in data && data.errorCount > 0))
    {
      process.exitCode = 1;
    }

    cb(null, file);
  });
}

/**
 * Check HTML code
 * @return {stream.Stream}
 */
function checkHTML()
{
  return gulp.src(["src/ui/*.html"])
    .pipe(htmllint({failOnError: true}));
}
exports.checkHTML = checkHTML;

/**
 * Check CSS code
 * @return {stream.Stream}
 */
function checkCSS()
{
  let failReporter = makeFailReporter("csslint");

  return gulp.src(["src/ui/css/*.css"])
    .pipe(csslint())
    .pipe(csslint.reporter())
    .pipe(failReporter);
}
exports.checkCSS = checkCSS;

/**
 * Check JavaScript code
 * @param {string[]} envs - list of JavaScript environments
 * @param {string} src - source files
 * @return {stream.Stream}
 */
function checkJS(envs, src)
{
  let failReporter = makeFailReporter("eslint");

  return gulp.src(src)
    .pipe(eslint({envs}))
    .pipe(eslint.format())
    .pipe(failReporter);
}

/**
 * Check JavaScript coding style for extension environment
 * @return {stream.Stream}
 */
exports.checkJSExt = () =>
{
  return checkJS(
    ["commonjs", "shared-node-browser", "webextensions"],
    "src/lib/**/*.js"
  );
};

/**
 * Check JavaScript coding style for mocha environment
 * @return {stream.Stream}
 */
exports.checkJSMocha = () => checkJS(["mocha", "node"], "test/**/*.js");

/**
 * Check JavaScript coding style for Node environment
 * @return {stream.Stream}
 */
exports.checkJSNode = () => checkJS(["node"], ["*.js", "build/*.js"]);
