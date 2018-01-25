"use strict";

const fs = require("fs");
const requireInject = require("require-inject");

const {assertExists, expect} = require("../assert");

function createDir(path)
{
  return new Promise((resolve, reject) =>
  {
    fs.mkdir(path, (err) => resolve());
  });
}

function createFile(path)
{
  return new Promise((resolve, reject) =>
  {
    fs.writeFile(path, "", (err) => resolve());
  });
}

describe("Test build tasks", () =>
{
  let gulp = requireInject("gulp");

  let cwsId = null;
  let publishedToCws = new Set();
  class ChromeWebStore
  {
    constructor(clientId, clientSecret)
    {
      expect(clientId).to.be.equal(`${cwsId}-client`);
      expect(clientSecret).to.be.equal(`${cwsId}-secret`);
    }
    getRefreshToken(refreshToken)
    {
      expect(refreshToken).to.be.equal(`${cwsId}-refresh`);
      return JSON.stringify({access_token: `${cwsId}-access`});
    }
    publishItem(token, itemId)
    {
      expect(token).to.be.equal(`${cwsId}-access`);
      expect(itemId).to.be.equal(`${cwsId}-ext`);
      publishedToCws.add(cwsId);
      return JSON.stringify({status: ["OK"]});
    }
    updateItem(token, fileBin, itemId)
    {
      expect(token).to.be.equal(`${cwsId}-access`);
      expect(fileBin.length).to.be.above(0);
      expect(itemId).to.be.equal(`${cwsId}-ext`);
      return {error_detail: null, upload_state: "SUCCESS"};
    }
  }

  const signAddon = {
    default()
    {
      const downloadedXpiPath = "downloaded.xpi";
      fs.writeFileSync(downloadedXpiPath, "", "utf8");
      return Promise.resolve({
        success: true,
        downloadedFiles: [downloadedXpiPath]
      });
    }
  };

  let amoCommands = {
    uploadedDevelopmentXpi: false,
    uploadedStagingXpi: false,
    uploadedReleaseXpi: false,
    uploadedDevelopmentManifest: false,
    uploadedStagingManifest: false,
    uploadedReleaseManifest: false,
    linkedDevelopmentXpi: false,
    linkedStagingXpi: false,
    linkedReleaseXpi: false
  };

  const childProcess = {
    execFile(file, args, callback)
    {
      if (file == "scp" && args.length == 2 &&
          args[1] == "fx-upload-server:fx-upload-path")
      {
        if (/\/flattr-.*-development\.xpi$/.test(args[0]))
          amoCommands.uploadedDevelopmentXpi = true;
        else if (/\/flattr-.*-staging\.xpi$/.test(args[0]))
          amoCommands.uploadedStagingXpi = true;
        else if (/\/flattr-.*-release\.xpi$/.test(args[0]))
          amoCommands.uploadedReleaseXpi = true;

        if (args[0].endsWith("development-updates.json"))
          amoCommands.uploadedDevelopmentManifest = true;
        else if (args[0].endsWith("staging-updates.json"))
          amoCommands.uploadedStagingManifest = true;
        else if (args[0].endsWith("release-updates.json"))
          amoCommands.uploadedReleaseManifest = true;
      }

      if (file == "ssh" && args.length == 5 && args[0] == "fx-upload-server" &&
          args[1] == "ln" && args[2] == "-sf")
      {
        if (/^flattr-.*-development\.xpi$/.test(args[3]) &&
            args[4] == "fx-upload-path/flattr-development.xpi")
          amoCommands.linkedDevelopmentXpi = true;
        else if (/^flattr-.*-staging\.xpi$/.test(args[3]) &&
            args[4] == "fx-upload-path/flattr-staging.xpi")
          amoCommands.linkedStagingXpi = true;
        else if (/^flattr-.*-release\.xpi$/.test(args[3]) &&
            args[4] == "fx-upload-path/flattr-release.xpi")
          amoCommands.linkedReleaseXpi = true;
      }

      callback();
    }
  };

  // We already loaded build/cws-upload.js and build/amo-upload.js during
  // initialization of our gulp tasks. Therefore we need to remove them from
  // the cache to ensure our mocks are used.
  delete require.cache[require.resolve("../../build/cws-upload")];
  delete require.cache[require.resolve("../../build/amo-upload")];
  requireInject("../../build", {
    gulp,
    "chrome-webstore-manager": ChromeWebStore,
    "sign-addon": signAddon,
    "child_process": childProcess
  });

  function runTask(name)
  {
    let {dep, fn} = gulp.tasks[name];
    let dependencies = dep.map((task) => runTask(task));

    return Promise.all(dependencies).then(() =>
    {
      let result = fn();
      if (result instanceof Promise)
        return result;

      return new Promise((resolve, reject) =>
      {
        result.on("error", reject).on("end", resolve);
      });
    });
  }

  beforeEach(() => runTask("clean-build"));

  afterEach(() =>
  {
    return Promise.all([
      // make sure COPYING exists
      assertExists("./COPYING", true),

      // make sure src/manifest.json exists
      assertExists("./src/manifest.json", true),

      // make sure src/manifest-development.json exists
      assertExists("./src/manifest-development.json", true),

      // make sure devenv/manifest-development.json does not exist
      assertExists("./devenv/manifest-development.json", false),

      // make sure src/manifest-staging.json exists
      assertExists("./src/manifest-staging.json", true),

      // make sure devenv/manifest-staging.json does not exist
      assertExists("./devenv/manifest-staging.json", false),

      // make sure src/manifest-usertesting.json exists
      assertExists("./src/manifest-usertesting.json", true),

      // make sure devenv/manifest-usertesting.json does not exist
      assertExists("./devenv/manifest-usertesting.json", false)
    ]);
  });

  it("clean-build", () =>
  {
    return Promise.all([
      createDir("./devenv"),
      createDir("./bin")
    ])
    .then(() => assertExists("./devenv", true))
    .then(() => assertExists("./bin", true))
    .then(() => runTask("clean-build"))
    .then(() => assertExists("./devenv", false))
    .then(() => assertExists("./bin", false));
  });

  it("clean-db", () =>
  {
    return Promise.all([
      createFile("./__sysdb__.sqlite"),
      createFile("./D_test")
    ])
    .then(() => assertExists("./__sysdb__.sqlite", true))
    .then(() => assertExists("./D_test", true))
    .then(() => runTask("clean-db"))
    .then(() => assertExists("./__sysdb__.sqlite", false))
    .then(() => assertExists("./D_test", false));
  });

  it("debug", () =>
  {
    return runTask("debug")
        .then(() => assertExists("./devenv", true))
        .then(() => assertExists("./devenv/COPYING", true))
        .then(() => assertExists("./devenv/manifest.json", true))
        .then(() => assertExists("./devenv/lib/background/index.js", true))
        .then(() => assertExists("./devenv/ui/js/webcomponents-lite.js", true))
        .then(() => assertExists("./devenv/lib/background/index.js.map", true))
        .then(() => assertExists("./bin", false))
        .then(() => assertExists("./devenv/data/domains.json", false));
  });

  it("bundle: defaults", () =>
  {
    return runTask("bundle")
        .then(() => assertExists("./devenv", true))
        .then(() => assertExists("./devenv/COPYING", true))
        .then(() => assertExists("./devenv/manifest.json", true))
        .then(() => assertExists("./devenv/lib/background/index.js", true))
        .then(() => assertExists("./devenv/ui/js/webcomponents-lite.js", true))
        .then(() => assertExists("./bin", false))
        .then(() => assertExists("./devenv/data/domains.json", false))
        .then(() =>
        {
          let manifest = JSON.parse(fs.readFileSync("./devenv/manifest.json"));
          expect(manifest.name).to.equal("__MSG_name_development__");
          expect(manifest).to.have.property("default_locale");
          expect(manifest).to.have.property("incognito");
          expect(manifest.version).to.not.contain("alpha");
        });
  });

  it("bundle: target = (default) chromium, type = staging", () =>
  {
    process.env.FP_BUILD_TYPE = "staging";
    return runTask("bundle")
        .then(() =>
        {
          let manifest = JSON.parse(fs.readFileSync("./devenv/manifest.json"));
          expect(manifest.name).to.equal("__MSG_name_staging__");
          expect(manifest).to.have.property("default_locale");
          expect(manifest).to.have.property("incognito");
          expect(manifest).to.not.have.property("applications");
          expect(manifest.version).to.not.contain("alpha");
        });
  });

  it("bundle: target = (default) chromium, type = release", () =>
  {
    process.env.FP_BUILD_TYPE = "release";
    return runTask("bundle")
        .then(() =>
        {
          let manifest = JSON.parse(fs.readFileSync("./devenv/manifest.json"));
          expect(manifest.name).to.equal("__MSG_name__");
          expect(manifest).to.have.property("default_locale");
          expect(manifest).to.have.property("incognito");
          expect(manifest).to.not.have.property("applications");
          expect(manifest.version).to.not.contain("alpha");
        });
  });

  it("bundle: target = (default) chromium, type = usertesting", () =>
  {
    process.env.FP_BUILD_TYPE = "usertesting";
    return runTask("bundle")
        .then(() =>
        {
          let manifest = JSON.parse(fs.readFileSync("./devenv/manifest.json"));
          expect(manifest.name).to.equal("__MSG_name_usertesting__");
          expect(manifest).to.have.property("default_locale");
          expect(manifest).to.have.property("incognito");
          expect(manifest).to.not.have.property("applications");
          expect(manifest.version).to.not.contain("alpha");
        });
  });

  it("bundle: target = gecko, type = development", () =>
  {
    process.env.FP_BUILD_TARGET = "gecko";
    process.env.FP_BUILD_TYPE = "development";
    return runTask("bundle")
        .then(() =>
        {
          let manifest = JSON.parse(fs.readFileSync("./devenv/manifest.json"));
          expect(manifest.name).to.equal("__MSG_name_development__");
          expect(manifest).to.have.property("default_locale");
          expect(manifest).to.not.have.property("incognito");
          expect(manifest).to.have.property("applications");
          expect(manifest.version).to.match(/alpha$/);
          expect(manifest.applications.gecko.update_url)
              .to.match(/development-updates\.json$/);
        });
  });

  it("bundle: target = gecko, type = staging", () =>
  {
    process.env.FP_BUILD_TARGET = "gecko";
    process.env.FP_BUILD_TYPE = "staging";
    return runTask("bundle")
        .then(() =>
        {
          let manifest = JSON.parse(fs.readFileSync("./devenv/manifest.json"));
          expect(manifest.name).to.equal("__MSG_name_staging__");
          expect(manifest).to.have.property("default_locale");
          expect(manifest).to.not.have.property("incognito");
          expect(manifest).to.have.property("applications");
          expect(manifest.version).to.not.contain("alpha");
          expect(manifest.applications.gecko.update_url)
              .to.match(/staging-updates\.json$/);
        });
  });

  it("bundle: target = gecko, type = release", () =>
  {
    process.env.FP_BUILD_TARGET = "gecko";
    process.env.FP_BUILD_TYPE = "release";
    return runTask("bundle")
        .then(() =>
        {
          let manifest = JSON.parse(fs.readFileSync("./devenv/manifest.json"));
          expect(manifest.name).to.equal("__MSG_name__");
          expect(manifest).to.have.property("default_locale");
          expect(manifest).to.not.have.property("incognito");
          expect(manifest).to.have.property("applications");
          expect(manifest.version).to.not.contain("alpha");
          expect(manifest.applications.gecko.update_url)
              .to.match(/release-updates\.json$/);
        });
  });

  it("build", () =>
  {
    return runTask("build")
        .then(() => assertExists("./bin", true));
  });

  it("upload chromium development build", () =>
  {
    cwsId = "dev";
    process.env.FP_BUILD_TARGET = "chromium";
    process.env.FP_BUILD_TYPE = "development";
    process.env.FP_CWS_DEVELOPMENT_CLIENT_ID = "dev-client";
    process.env.FP_CWS_DEVELOPMENT_CLIENT_SECRET = "dev-secret";
    process.env.FP_CWS_DEVELOPMENT_REFRESH_TOKEN = "dev-refresh";
    process.env.FP_CWS_DEVELOPMENT_EXTENSION_ID = "dev-ext";
    return runTask("clean-build")
        .then(() => expect(publishedToCws.has(cwsId)).to.be.false)
        .then(() => runTask("upload"))
        .then(() => expect(publishedToCws.has(cwsId)).to.be.true);
  });

  it("upload chromium staging build", () =>
  {
    cwsId = "staging";
    process.env.FP_BUILD_TARGET = "chromium";
    process.env.FP_BUILD_TYPE = "staging";
    process.env.FP_CWS_STAGING_CLIENT_ID = "staging-client";
    process.env.FP_CWS_STAGING_CLIENT_SECRET = "staging-secret";
    process.env.FP_CWS_STAGING_REFRESH_TOKEN = "staging-refresh";
    process.env.FP_CWS_STAGING_EXTENSION_ID = "staging-ext";
    return runTask("clean-build")
        .then(() => expect(publishedToCws.has(cwsId)).to.be.false)
        .then(() => runTask("upload"))
        .then(() => expect(publishedToCws.has(cwsId)).to.be.true);
  });

  it("upload chromium release build", () =>
  {
    cwsId = "release";
    process.env.FP_BUILD_TARGET = "chromium";
    process.env.FP_BUILD_TYPE = "release";
    process.env.FP_CWS_RELEASE_CLIENT_ID = "release-client";
    process.env.FP_CWS_RELEASE_CLIENT_SECRET = "release-secret";
    process.env.FP_CWS_RELEASE_REFRESH_TOKEN = "release-refresh";
    process.env.FP_CWS_RELEASE_EXTENSION_ID = "release-ext";
    return runTask("clean-build")
        .then(() => expect(publishedToCws.has(cwsId)).to.be.false)
        .then(() => runTask("upload"))
        .then(() => expect(publishedToCws.has(cwsId)).to.be.true);
  });

  it("upload chromium usertesting build", () =>
  {
    cwsId = "usertesting";
    process.env.FP_BUILD_TARGET = "chromium";
    process.env.FP_BUILD_TYPE = "usertesting";
    process.env.FP_CWS_USERTESTING_CLIENT_ID = "usertesting-client";
    process.env.FP_CWS_USERTESTING_CLIENT_SECRET = "usertesting-secret";
    process.env.FP_CWS_USERTESTING_REFRESH_TOKEN = "usertesting-refresh";
    process.env.FP_CWS_USERTESTING_EXTENSION_ID = "usertesting-ext";
    return runTask("clean-build")
        .then(() => expect(publishedToCws.has(cwsId)).to.be.false)
        .then(() => runTask("upload"))
        .then(() => expect(publishedToCws.has(cwsId)).to.be.true);
  });

  it("upload gecko development build", () =>
  {
    process.env.FP_BUILD_TARGET = "gecko";
    process.env.FP_BUILD_TYPE = "development";
    process.env.FP_AMO_KEY = "amo-key";
    process.env.FP_AMO_SECRET = "amo-secret";
    process.env.FP_AMO_ID = "amo-id";
    process.env.FP_FX_DOWNLOAD_BASE_URL = "fx-base-url";
    process.env.FP_FX_UPLOAD_SERVER = "fx-upload-server";
    process.env.FP_FX_UPLOAD_PATH = "fx-upload-path";
    return runTask("clean-build")
        .then(() =>
        {
          expect(amoCommands.uploadedDevelopmentXpi).to.be.equal(false);
          expect(amoCommands.uploadedDevelopmentManifest).to.be.equal(false);
          expect(amoCommands.linkedDevelopmentXpi).to.be.equal(false);
        })
        .then(() => runTask("upload"))
        .then(() =>
        {
          expect(amoCommands.uploadedDevelopmentXpi).to.be.equal(true);
          expect(amoCommands.uploadedDevelopmentManifest).to.be.equal(true);
          expect(amoCommands.linkedDevelopmentXpi).to.be.equal(true);
          let manifest = JSON.parse(
            fs.readFileSync("./bin/development-updates.json"));
          expect(manifest.addons).to.contain.property("amo-id");
        });
  });

  it("upload gecko staging build", () =>
  {
    process.env.FP_BUILD_TARGET = "gecko";
    process.env.FP_BUILD_TYPE = "staging";
    process.env.FP_AMO_KEY = "amo-key";
    process.env.FP_AMO_SECRET = "amo-secret";
    process.env.FP_AMO_ID = "amo-id";
    process.env.FP_FX_DOWNLOAD_BASE_URL = "fx-base-url";
    process.env.FP_FX_UPLOAD_SERVER = "fx-upload-server";
    process.env.FP_FX_UPLOAD_PATH = "fx-upload-path";
    return runTask("clean-build")
        .then(() =>
        {
          expect(amoCommands.uploadedStagingXpi).to.be.equal(false);
          expect(amoCommands.uploadedStagingManifest).to.be.equal(false);
          expect(amoCommands.linkedStagingXpi).to.be.equal(false);
        })
        .then(() => runTask("upload"))
        .then(() =>
        {
          expect(amoCommands.uploadedStagingXpi).to.be.equal(true);
          expect(amoCommands.uploadedStagingManifest).to.be.equal(true);
          expect(amoCommands.linkedStagingXpi).to.be.equal(true);
          let manifest = JSON.parse(
            fs.readFileSync("./bin/staging-updates.json"));
          expect(manifest.addons).to.contain.property("amo-id");
        });
  });

  it("upload gecko release build", () =>
  {
    process.env.FP_BUILD_TARGET = "gecko";
    process.env.FP_BUILD_TYPE = "release";
    process.env.FP_AMO_KEY = "amo-key";
    process.env.FP_AMO_SECRET = "amo-secret";
    process.env.FP_AMO_ID = "amo-id";
    process.env.FP_FX_DOWNLOAD_BASE_URL = "fx-base-url";
    process.env.FP_FX_UPLOAD_SERVER = "fx-upload-server";
    process.env.FP_FX_UPLOAD_PATH = "fx-upload-path";
    return runTask("clean-build")
        .then(() =>
        {
          expect(amoCommands.uploadedReleaseXpi).to.be.equal(false);
          expect(amoCommands.uploadedReleaseManifest).to.be.equal(false);
          expect(amoCommands.linkedReleaseXpi).to.be.equal(false);
        })
        .then(() => runTask("upload"))
        .then(() =>
        {
          expect(amoCommands.uploadedReleaseXpi).to.be.equal(true);
          expect(amoCommands.uploadedReleaseManifest).to.be.equal(true);
          expect(amoCommands.linkedReleaseXpi).to.be.equal(true);
          let manifest = JSON.parse(
            fs.readFileSync("./bin/release-updates.json"));
          expect(manifest.addons).to.contain.property("amo-id");
        });
  });
});
