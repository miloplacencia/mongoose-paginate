'use strict';

/**
 * @package mongoose-paginate
 * @param {Object} [query={}]
 * @param {Object} [options={}]
 * @param {Object|String} [options.select]
 * @param {Object|String} [options.sort]
 * @param {Array|Object|String} [options.populate]
 * @param {Boolean} [options.lean=false]
 * @param {Boolean} [options.leanWithId=true]
 * @param {Number} [options.offset=0] - Use offset or page to set skip position
 * @param {Number} [options.page=1]
 * @param {Number} [options.limit=10]
 * @param {Function} [callback]
 * @returns {Promise}
 */

async function paginate(query, options, callback) {
  query = query || {};
  options = Object.assign({}, paginate.options, options);

  let select = options.select;
  let sort = options.sort;
  let populate = options.populate;
  let lean = options.lean || false;
  let leanWithId =
    typeof options.leanWithId === 'boolean' ? options.leanWithId : true;
  let limit = typeof options.limit === 'number' ? options.limit : 10;
  let page, offset, skip, promises;

  if (options.offset) {
    offset = options.offset;
    skip = offset;
  } else if (options.page) {
    page = options.page;
    skip = (page - 1) * limit;
  } else {
    page = 1;
    offset = 0;
    skip = offset;
  }

  let docsQuery = this.find(query)
    .select(select)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean(lean);

  if (populate) {
    [].concat(populate).forEach(item => {
      docsQuery.populate(item);
    });
  }

  promises = {
    docs: limit ? docsQuery.exec() : Promise.resolve([]),
    count: this.countDocuments(query).exec(),
  };

  if (lean && leanWithId) {
    promises.docs = promises.docs.then(docs =>
      docs.map(doc => ({
        ...doc,
        id: String(doc._id),
      })),
    );
  }

  promises = Object.keys(promises).map(x => promises[x]);

  const [docs, count] = await Promise.all(promises);

  let result = {
    docs: docs,
    total: count,
    limit: limit,
  };
  if (offset !== undefined) {
    result.offset = offset;
  }
  if (page !== undefined) {
    result.page = page;
    result.pages = Math.ceil(count / limit) || 1;
  }
  if (typeof callback === 'function') {
    return callback(null, result);
  }

  return result;
}

/**
 * @param {Schema} schema
 */

module.exports = function(schema) {
  schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;
