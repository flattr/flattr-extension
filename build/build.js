/**
 * @file Provides methods for building the extension
 */

"use strict";

const browserify = require("browserify");
const {exec} = require("child_process");
const del = require("del");
const factorVinylify = require("factor-vinylify");
const gulp = require("gulp");
const jeditor = require("gulp-json-editor");
const sourcemaps = require("gulp-sourcemaps");
const zip = require("gulp-zip");
const path = require("path");
const buffer = require("vinyl-buffer");

const packageJSON = require("../package.json");
const manifest = require("../src/manifest.json");

const BIN_DIR = path.resolve("bin");
const DEVENV_DIR = path.resolve("devenv");
const SRC_DIR = path.resolve("src");

/**
 * Logging function for the purpose of logging within build modules
 * @param {...any} args - arguments to log
 */
function log(...args)
{
  /* eslint-disable no-console */
  if (process.env.FP_BUILD_MODE == "test")
    return;

  console.log(...args);
  /* eslint-enable no-console */
}
exports.log = log;

/**
 * Creates the manifest.json file
 * @param {BuildInfo} buildInfo
 * @return {Promise}
 */
function writeManifest(buildInfo)
{
  return new Promise((resolve, reject) =>
  {
    let manifestPath = path.join(DEVENV_DIR, "manifest.json");
    log(`Writing manifest to ${manifestPath}...`);

    gulp.src("src/manifest.json", {base: SRC_DIR})
      .on("error", reject)
      .pipe(jeditor((json) =>
      {
        json.version = `${manifest.version}.${buildInfo.number}`;

        // modify manifest.json for Firefox support
        if (buildInfo.target == "gecko")
        {
          delete json.incognito;

          if (buildInfo.type == "development")
            json.version += "alpha";
          else if (buildInfo.type == "staging")
            json.version += "beta";

          json.applications.gecko.update_url =
            "https://downloads.adblockplus.org/devbuilds/flattr/" +
            buildInfo.type + "-updates.json";
        }

        // remove Firefox specific manifest.json properties for Chrome
        if (buildInfo.target != "gecko")
        {
          delete json.applications;
        }

        // overwrite manifest json file values with build specific values
        let overwrites = {};
        try
        {
          overwrites = require(`../src/manifest-${buildInfo.type}.json`);
        }
        catch (e)
        {
          // ignore module not found errors
          if (e.code != "MODULE_NOT_FOUND")
          {
            console.error(e);
          }

          return json;
        }

        return Object.assign(json, overwrites);
      }))
      .pipe(gulp.dest(DEVENV_DIR))
      .on("end", resolve);
  });
}

function makeSourceMap(input)
{
  return input
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write("./"));
}

/**
 * Creates bundles for specified files
 * @param {string[]} filepaths - file paths
 * @param {BuildInfo} buildInfo
 * @param {boolean} debug - indicates whether to include debug information
 * @return {Promise}
 */
function bundle(filepaths, buildInfo, debug)
{
  return new Promise((resolve, reject) =>
  {
    log("Bundling files");

    let input = filepaths.map((filepath) => path.join(SRC_DIR, filepath));
    let inputExternal = path.join(SRC_DIR, "lib/common/env/external.js");
    let output = filepaths.map((filepath) => path.join(DEVENV_DIR, filepath));
    let outputCommon = "lib/common.js";

    let browserifyBundle = browserify({entries: input, debug});

    // Expose certain extension functionality to the outside
    browserifyBundle.require(inputExternal, {expose: "flattrAPI"});

    if (buildInfo.type !== "development")
    {
      browserifyBundle.ignore("redux-logger");
    }

    let stream = browserifyBundle
      .transform("browserify-versionify",
      {
        placeholder: "__BUILD_VERSION__",
        version: buildInfo.version
      })
      .transform("browserify-versionify", {
        placeholder: "__BUILD_TYPE__",
        version: buildInfo.type
      })
      .plugin(factorVinylify, {
        basedir: DEVENV_DIR,
        common: outputCommon,
        outputs: output
      })
      .bundle()
      .on("error", reject);

    if (debug)
    {
      log("Generating source maps");
      stream = makeSourceMap(stream);
    }

    stream
      .pipe(gulp.dest(DEVENV_DIR))
      .on("error", reject)
      .on("end", resolve);
  });
}

/**
 * Include static file in build
 * @param {string} src - absolute file path
 * @param {string} dest - path to destination directory
 * @return {Promise}
 */
function includeFile(src, dest)
{
  return new Promise((resolve, reject) =>
  {
    dest = dest || "";

    log(`Including ${dest + path.basename(src)}...`);

    gulp.src(src)
      .on("error", reject)
      .pipe(gulp.dest(path.join(DEVENV_DIR, dest)))
      .on("end", resolve);
  });
}

/**
 * Include static file(s) in build
 * @param {string} src - file path/glob within `src/`
 * @return {Promise}
 */
function includeGlob(src)
{
  return new Promise((resolve, reject) =>
  {
    log(`Including ${src}...`);

    src = path.join(SRC_DIR, src);

    gulp.src(src, {base: SRC_DIR})
      .on("error", reject)
      .pipe(gulp.dest(DEVENV_DIR))
      .on("end", resolve);
  });
}

/**
 * Create bundles for all files
 * @param {BuildInfo} buildInfo
 * @param {boolean} debug - indicates whether to include debug information
 * @return {Promise}
 */
function bundleFiles(buildInfo, debug)
{
  return Promise.all([
    writeManifest(buildInfo),

    includeGlob("_locales/**/messages.json"),
    includeGlob("icons/*.png"),
    includeGlob("ui/*.html"),
    includeGlob("ui/css/*.css"),
    includeGlob("ui/fonts/*.woff"),

    includeFile("COPYING", ""),
    includeFile(
      require.resolve("webcomponents.js/webcomponents-lite"),
      "ui/js/"
    ),

    bundle(
      [
        "lib/background/index.js",
        "lib/content/index.js",
        "lib/ui/options/index.js",
        "lib/ui/popup/index.js"
      ],
      buildInfo, debug
    )
  ]);
}
exports.bundleFiles = bundleFiles;

/**
 * Clean up build directories
 * @return {Promise}
 */
function cleanBuild()
{
  log(`Cleaning up ${BIN_DIR}...`);
  log(`Cleaning up ${DEVENV_DIR}...`);
  return del([BIN_DIR, DEVENV_DIR]);
}
exports.cleanBuild = cleanBuild;

/**
 * Clean up test databases
 * @return {Promise}
 */
function cleanDb()
{
  log("Removing test databases...");
  return del(["__sysdb__.sqlite", "D_*"]);
}
exports.cleanDb = cleanDb;

/**
 * Returns build-related information
 * @return {BuildInfo}
 */
function getInfo()
{
  return new Promise((resolve, reject) =>
  {
    exec(
      "git rev-list --count HEAD; git rev-parse --short HEAD",
      (err, stdout, stderr) =>
      {
        if (err)
        {
          reject();
        }
        else
        {
          const [number, hash] = stdout.split("\n", 2);
          let version = [number, hash].join("/");
          /**
           * Build information
           * @typedef {Object} BuildInfo
           * @property {number} number - build number (ex 123)
           * @property {string} type - build type (ex "development")
           * @property {string} target - build target (ex "chromium", "firefox")
           * @property {string} version - build version string (ex 1.2.3)
           */
          resolve({
            number: parseInt(number, 10),
            type: process.env.FP_BUILD_TYPE || "development",
            target: process.env.FP_BUILD_TARGET || "chromium",
            version
          });
        }
      }
    );
  });
}
exports.getInfo = getInfo;

/**
 * Create packaged build from development directory
 * @param {BuildInfo} buildInfo
 * @return {Promise}
 */
function build(buildInfo)
{
  return new Promise((resolve, reject) =>
  {
    let filename = `${packageJSON.name}-${manifest.version}.` +
        `${buildInfo.number}-${buildInfo.type}-${buildInfo.target}.zip`;
    log(`Creating ${filename}...`);

    gulp.src(path.join(DEVENV_DIR, "**"))
      .pipe(zip(filename))
      .on("error", reject)
      .pipe(gulp.dest(BIN_DIR))
      .on("end", () => resolve(path.join(BIN_DIR, filename)));
  });
}
exports.build = build;

/**
 * Watch for file changes to rebuild automatically
 */
function watch()
{
  log("Press CTRL + C to exit.");

  let watcher = gulp.watch([
    "src/_locales/**",
    "src/data/**",
    "src/icons/**",
    "src/lib/**",
    "src/ui/**",
    "src/manifest*.json"
  ], ["debug"]);
  watcher.on("change", evt => log(`${evt.path} was ${evt.type}`));
}
exports.watch = watch;
