"use strict";

const {jsdom} = require("jsdom");
const requireInject = require("require-inject");
const chrome = require("sinon-chrome");

const {Settings} = require("../mocks/settings");
const {assert, expect} = require("../assert");
const {spawn} = require("../utils");

const mockToken = "abcdef";

function getMockAccount()
{
  let settings = new Settings();

  return {
    account: requireInject("../../src/lib/common/account", {
      "../../src/lib/common/env/chrome": {chrome},
      "../../src/lib/common/settings": settings
    }),
    settings
  };
}

function getMockServerApi({onFetch, mockAccount})
{
  let {account, settings} = mockAccount || getMockAccount();

  return requireInject("../../src/lib/background/server/api", {
    "global/window": {
      fetch(url, options)
      {
        assert.match(url, /\/rest\/v2\/flattr\/bulk$/);
        expect(options.method.toLowerCase()).to.equal("post");
        expect(options.headers["Content-Type"]).to.equal("application/json");
        return Promise.resolve(onFetch(options));
      }
    },
    "../../src/lib/common/account": account,
    "../../src/lib/common/env/chrome": {chrome},
    "../../src/lib/common/settings": settings
  });
}

function runAccountScript(document, onSend)
{
  let {CustomEvent} = document.defaultView;
  let sessionStorage = Object.create(null);

  requireInject("../../src/lib/content/account", {
    "global/window": {
      document,
      location: {
        pathname: "/page",
        protocol: "http:",
        host: "example.com"
      },
      window: {sessionStorage},
      CustomEvent
    },
    "../../src/lib/common/env/chrome": {chrome},
    "../../src/lib/common/constants": {
      API_BASE_DOMAIN: "example.com"
    },
    "../../src/lib/common/ipc": {
      send: onSend
    }
  });

  return {sessionStorage};
}

describe("Test account management", () =>
{
  it("Should store account credentials", () =>
  {
    return spawn(function*()
    {
      const account = requireInject("../../src/lib/common/account", {
        "../../src/lib/common/env/chrome": {chrome},
        "../../src/lib/common/settings": new Settings()
      });

      let isAuthenticated = yield account.isAuthenticated();
      expect(isAuthenticated).to.be.equal(false);

      yield account.setToken("FOO");
      isAuthenticated = yield account.isAuthenticated();
      expect(isAuthenticated).to.be.equal(true);
    });
  });

  it("Should retrieve account credentials from webpage", (done) =>
  {
    const id = "extension-id";
    const version = "0.1";

    chrome.runtime.id = id;
    chrome.runtime.getManifest.returns({version});

    let document = jsdom();
    let {CustomEvent} = document.defaultView;

    document.addEventListener("flattr-installed", () =>
    {
      let event = new CustomEvent("flattr-trigger", {
        detail: {action: "authentication"}
      });
      document.dispatchEvent(event);
    });

    document.addEventListener("flattr-authenticate", (ev) =>
    {
      try
      {
        expect(ev.detail).to.deep.equal({
          build: "__BUILD_VERSION__",
          id, version
        });
      }
      catch (ex)
      {
        done(ex);
        return;
      }

      let event = new CustomEvent("flattr-token", {
        detail: {
          accessToken: "FOO",
          subscription: {active: true}
        }
      });
      document.dispatchEvent(event);
    });

    document.addEventListener("flattr-authenticated", (ev) =>
    {
      try
      {
        expect(ev.detail).to.deep.equal({authenticated: true});
      }
      catch (ex)
      {
        done(ex);
        return;
      }

      done();
    });

    let {sessionStorage} = runAccountScript(
      document,
      (name, data) =>
      {
        try
        {
          expect(name).to.be.equal("account-authenticated");
          expect(data).to.deep.equal({
            accessToken: "FOO",
            shouldClose: false,
            subscription: {active: true}
          });
        }
        catch (ex)
        {
          done(ex);
          return;
        }

        return Promise.resolve({authenticated: true});
      }
    );

    expect(sessionStorage.extension).to.equal(version);
  });

  it("Should handle subscription changes", (done) =>
  {
    let document = jsdom();
    let {CustomEvent} = document.defaultView;

    document.addEventListener("flattr-installed", () =>
    {
      let event = new CustomEvent("flattr-subscription", {
        detail: {
          subscription: {active: false}
        }
      });
      document.dispatchEvent(event);
    });

    runAccountScript(
      document,
      (name, data) =>
      {
        try
        {
          expect(name).to.be.equal("account-subscription-changed");
          expect(data).to.deep.equal({active: false});
          done();
        }
        catch (ex)
        {
          done(ex);
        }
      }
    );
  });

  it("Should submit Flattrs", () =>
  {
    let flattrs = [
      {timestamp: 1, url: "foo"},
      {timestamp: 2, url: "bar"}
    ];
    let expected = JSON.stringify([
      {url: "foo"},
      {url: "bar"}
    ]);
    let isSubmitted = false;

    const {account, settings} = getMockAccount();
    const serverApi = getMockServerApi({
      onFetch({body, headers})
      {
        expect(headers["Authorization"]).to.equal(`Bearer ${mockToken}`);
        expect(body).to.deep.equal(expected);

        isSubmitted = true;
        return {ok: true, status: 200};
      },
      mockAccount: {account, settings}
    });

    return spawn(function*()
    {
      yield account.setSubscription({active: true});
      yield account.setToken(mockToken);

      yield serverApi.sendFlattrs({flattrs});

      expect(isSubmitted).to.equal(true);
    });
  });

  it("Should not submit anything if there are no Flattrs to submit", () =>
  {
    let isSubmitted = false;

    const {account, settings} = getMockAccount();
    const serverApi = getMockServerApi({
      onFetch()
      {
        isSubmitted = true;
        return {ok: true, status: 200};
      },
      mockAccount: {account, settings}
    });

    return spawn(function*()
    {
      yield account.setSubscription({active: true});
      yield account.setToken(mockToken);

      let {ok} = yield serverApi.sendFlattrs({flattrs: []});
      expect(isSubmitted).to.equal(false);
      expect(ok).to.equal(true);
    });
  });

  it("Should not submit anything if missing access token", () =>
  {
    let fetchCount = 0;

    const {account, settings} = getMockAccount();
    const serverApi = getMockServerApi({
      onFetch()
      {
        fetchCount++;
        return {ok: true, status: 200};
      },
      mockAccount: {account, settings}
    });

    return spawn(function*()
    {
      yield account.setSubscription({active: true});

      let {status} = yield serverApi.sendFlattrs({flattrs: [{url: "foo"}]});
      expect(fetchCount).to.equal(0);
      expect(status).to.equal(401);
    });
  });

  it("Should submit Flattrs even without active subscription", () =>
  {
    let fetchCount = 0;

    const {account, settings} = getMockAccount();
    const serverApi = getMockServerApi({
      onFetch()
      {
        fetchCount++;
        return {ok: true, status: 200};
      },
      mockAccount: {account, settings}
    });

    return spawn(function*()
    {
      yield account.setSubscription({active: false});
      yield account.setToken(mockToken);

      let {status} = yield serverApi.sendFlattrs({flattrs: [{url: "foo"}]});
      expect(fetchCount).to.equal(1);
      expect(status).to.equal(200);
    });
  });

  it("Should clear access token after failed submission", () =>
  {
    const {account, settings} = getMockAccount();
    const serverApi = getMockServerApi({
      onFetch: () => ({ok: false, status: 401}),
      mockAccount: {account, settings}
    });

    return spawn(function*()
    {
      yield account.setSubscription({active: true});
      yield account.setToken("abc");

      let {token} = yield account.getAccount();
      expect(token).to.deep.equal({accessToken: "abc"});

      yield serverApi.sendFlattrs({flattrs: [{url: "foo"}]});

      ({token} = yield account.getAccount());
      expect(token).to.deep.equal({accessToken: null});
    });
  });

  it("Should change subscription state after failed submission", () =>
  {
    const {account, settings} = getMockAccount();
    const serverApi = getMockServerApi({
      onFetch: () => ({ok: false, status: 402}),
      mockAccount: {account, settings}
    });

    return spawn(function*()
    {
      yield account.setSubscription({active: true});
      yield account.setToken(mockToken);

      let {subscription} = yield account.getAccount();
      expect(subscription).to.deep.equal({active: true});

      yield serverApi.sendFlattrs({flattrs: [{url: "foo"}]});

      ({subscription} = yield account.getAccount());
      expect(subscription).to.deep.equal({active: false});
    });
  });
});
