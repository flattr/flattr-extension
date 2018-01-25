"use strict";

const notifications = require("../../../data/notifications");
const {API_BASE_DOMAIN, STATUS_DISABLED} = require("../../common/constants");
const {emit, on} = require("../../common/events");
const settings = require("../../common/settings");
const {getCurrentTab} = require("../../common/utils");
const {countEntities, countVisits} = require("../stats/collector");
const {getEntity, getStatus, hasDomainAuthors} = require("../domains");
const tabPages = require("../tabPages");

function loadCounters(config)
{
  let promises = config
    .map(([name, value]) => settings.get(`counter.${name}`, value));

  return Promise.all(promises)
    .then((values) =>
    {
      let counters = Object.create(null);
      for (let i = 0; i < values.length; i++)
      {
        let [name] = config[i];
        counters[name] = values[i];
      }
      return counters;
    });
}

function onLoad(counters)
{
  function showNotification(tabId, notification)
  {
    if (!(notification in notifications))
      throw new Error(`Unknown notification: ${notification}`);

    let tab = {id: tabId};
    if (tabId == null || !tabPages.has(tabId))
    {
      tab = getCurrentTab();
    }

    return Promise.resolve(tab)
      .then(({id}) =>
      {
        let tabPage = tabPages.get(id);
        tabPage.notification = notification;
        emit("notification-changed", {tabId: id, notification});
      })
      .catch((err) => console.error(err));
  }

  on("flattr-added", ({tabId, flattr, type}) =>
  {
    if (type != "attention")
      return;

    settings.set("counter.flattrs", ++counters.flattrs);

    if (hasDomainAuthors(flattr.entity))
    {
      settings.set("counter.flattrs.author", ++counters["flattrs.author"]);
      if (counters["flattrs.author"] == 1)
        return showNotification(tabId, "flattr-first-author");
    }

    if (counters.flattrs == 1)
      return showNotification(tabId, "flattr-first");

    if (counters.flattrs == 20)
      return showNotification(tabId, "flattr-some");

    // Querying localForage is slow so rather than counting all reoccurring
    // visits each time a Flattr is made we only increment it once. Therefore
    // the counter doesn't represent the number of reoccurring visits.
    if (counters["flattrs.revisited"] == 0)
    {
      return countVisits({dateRange: 20, entity: flattr.entity})
        .then((entityCount) =>
        {
          if (entityCount < 5)
            return;

          settings.set(
            "counter.flattrs.revisited",
            ++counters["flattrs.revisited"]
          );
          return showNotification(tabId, "flattr-first-revisited");
        });
    }
  });

  on("data", ({tabId, action, data}) =>
  {
    switch (action)
    {
      case "url":
        let entity = getEntity(data);
        if (entity == API_BASE_DOMAIN)
          return;

        return getStatus({url: data})
          .then((status) =>
          {
            if (status.combined != STATUS_DISABLED)
              return;

            settings.set(
              "counter.visits.disabled",
              ++counters["visits.disabled"]
            );

            if (counters["visits.disabled"] == 1)
              return showNotification(tabId, "disabled-first");

            if (counters["visits.disabled.revisited"] < 3)
            {
              return countEntities({
                dateRange: 20,
                minVisitCount: 6
              })
              .then((entityCount) =>
              {
                if (entityCount == counters["visits.disabled.revisited"])
                  return;

                settings.set(
                  "counter.visits.disabled.revisited",
                  ++counters["visits.disabled.revisited"]
                );
                return showNotification(tabId, "disabled-some-revisited");
              });
            }
          });
      case "user-notification-dismissed":
        let tabPage = tabPages.get(tabId);
        if (!tabPage)
          break;

        delete tabPage.notification;
        emit("notification-changed", {tabId, notification: null});
        break;
    }
  });
}

loadCounters([
  ["flattrs", 0],
  ["flattrs.author", 0],
  ["flattrs.revisited", 0],
  ["visits.disabled", 0],
  ["visits.disabled.revisited", 0]
])
.then(onLoad)
.catch((err) => console.error(err));
