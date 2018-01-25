/**
 * @file Exposes build-related methods via gulp tasks
 */

"use strict";

const gulp = require("gulp");
const runSequence = require("run-sequence");

const {build, bundleFiles, cleanBuild,
        cleanDb, getInfo, watch} = require("./build");
const {checkCSS, checkHTML, checkJSExt, checkJSMocha, checkJSNode} =
    require("./tests");

const {uploadToCWS} = require("./cws-upload");
const {uploadToAMO} = require("./amo-upload");
const {generateIcons} = require("./icons");
const {run: runMocha} = require("../test/mocha");

let buildInfo = null;
let zipFilepath = null;

gulp.task("build", ["bundle", "info"], () =>
{
  return build(buildInfo).then((filepath) =>
  {
    zipFilepath = filepath;
  });
});

gulp.task("bundle", ["clean-build", "info"],
    () => bundleFiles(buildInfo, false));

gulp.task("clean-build", cleanBuild);
gulp.task("clean-db", cleanDb);
gulp.task("clean", ["clean-build", "clean-db"]);

gulp.task("csslint", checkCSS);

gulp.task("debug", ["clean-build", "info"],
    () => bundleFiles(buildInfo, true));

gulp.task("htmllint", checkHTML);

gulp.task("icons", generateIcons);

gulp.task("eslint-ext", checkJSExt);

gulp.task("eslint-mocha", checkJSMocha);

gulp.task("eslint-node", checkJSNode);

gulp.task("eslint", (done) =>
{
  runSequence("eslint-ext", "eslint-mocha", "eslint-node", done);
});

gulp.task("lint", (done) =>
{
  runSequence("csslint", "htmllint", "eslint", done);
});

gulp.task("test", (done) =>
{
  runSequence("lint", "test-mocha", "clean-db", done);
});

gulp.task("test-mocha", () => runMocha());

gulp.task("upload", ["build", "info"], () =>
{
  if (buildInfo.target == "gecko")
    return uploadToAMO(zipFilepath, buildInfo);
  return uploadToCWS(zipFilepath, buildInfo.type);
});

gulp.task("info", (done) =>
{
  return getInfo().then((info) =>
  {
    buildInfo = info;
  });
});

gulp.task("watch", watch);
