"use strict";

const {Date} = require("global/window");

const {emit} = require("../common/events");
const {db} = require("./database/flattrs");
const {sendFlattrs} = require("./state/actions/flattrs");
const {store} = require("./state");

function submit({entity, tabId, title, type, url})
{
  return db.transaction("rw", db.flattrs, function*()
  {
    let {flattrs} = db;
    if (url)
    {
      flattrs = flattrs.where("url").equals(url);
    }
    else
    {
      flattrs = flattrs.where("entity").equals(entity)
          .and((entry) => entry.url == url);
    }
    let entry = yield flattrs.first();
    if (!entry)
    {
      entry = {
        entity, title, url,
        timestamps: []
      };
    }
    entry.timestamps.push(Date.now());

    yield db.flattrs.put(entry);

    return entry;
  })
  .then((entry) =>
  {
    emit("flattr-added", {flattr: entry, tabId, type});
    store.dispatch(sendFlattrs({flattrs: [entry]}));
    return entry;
  });
}
exports.submit = submit;

function remove({entity})
{
  return db.flattrs.where("entity").equals(entity).delete().then(() =>
  {
    emit("flattrs-removed", {entity});
  });
}
exports.remove = remove;

/**
 * Query database for flattrs
 * @param {Object} options
 * @param {boolean} [options.count] - whether to evaluate flattrs count
 * @param {string} [options.entity]
 * @param {boolean} [options.flattrs] - whether to evaluate flattrs
 * @param {number} options.start - timestamp of period start
 * @return {Promise<Object>} - object containing requested results
 */
function query(options)
{
  // We query timestamps first because thereby we can query array entries
  // directly and also reduce the continuous degradation of performance
  let collection = db.flattrs.where("timestamps").aboveOrEqual(options.start);

  if (options.entity)
  {
    collection = collection.and((flattr) => flattr.entity == options.entity);
  }

  let promisedCount = null;
  if (options.count)
  {
    promisedCount = collection.count();
  }

  let promisedFlattrs = null;
  if (options.flattrs)
  {
    let map = Object.create(null);
    promisedFlattrs = collection
      .each(({entity, timestamps, title, url}, cursor) =>
      {
        let flattr = map[url];
        if (!flattr)
        {
          flattr = map[url] = {
            timestamps: [],
            entity, title, url
          };
        }

        // The cursor's key represents the value we're querying for - in this
        // case the timestamp - so it is dependent on the query above
        flattr.timestamps.push(cursor.key);
      })
      .then(() => Object.values(map));
  }

  return Promise.all([promisedCount, promisedFlattrs])
    .then(([count, flattrs]) => ({count, flattrs}));
}
exports.query = query;
