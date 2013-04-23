
/**
 * Module dependencies.
 */

var adapter = require('tower-adapter')
  , topology = require('tower-topology')
  , action = require('tower-stream')
  , filter = require('tower-filter')
  , validate = require('tower-validate')
  , queryToTopology = require('tower-query-to-topology');

/**
 * Expose `memory` adapter.
 */

exports = module.exports = adapter('memory');

/**
 * Collections by name.
 */

exports.collections = {};

/**
 * Adapter data types.
 */

exports
  .type('string')
  .type('text')
  .type('date')
  .type('float')
  .type('integer')
  .type('number')
  .type('boolean')
  .type('bitmask')
  .type('array');

/**
 * Find records.
 */

action('memory.query')
  .on('exec', query);

action('memory.save')
  .on('exec', create);

/**
 * Create records.
 */

action('memory.create')
  .on('exec', create);

/**
 * Update records.
 */

action('memory.update')
  .on('exec', update);

/**
 * Remove records.
 */

action('memory.remove')
  .on('exec', remove);

/**
 * Execute a database query.
 */

exports.execute = function(constraints, fn){
  var topology = queryToTopology('memory', constraints);

  // XXX: need to come up w/ API for adding events before it's executed.
  //process.nextTick(function(){
    topology.exec(fn);
  //});

  return topology;
}

/**
 * Connect.
 *
 * @param {String} name
 * @param {Function} fn
 * @api public
 */

exports.connect = function(name, fn){
  if (fn) fn();
}

/**
 * Disconnect.
 *
 * @param {String} name
 * @param {Function} fn
 * @api public
 */

exports.disconnect = function(name, fn){
  if (fn) fn();
}

/**
 * Create a database/collection/index.
 *
 * @param {String} name
 * @param {Function} fn
 * @api public
 */

exports.create = function(name, fn){
  return exports.collections[name] = [];
}

/**
 * Update a database/collection/index.
 *
 * @param {String} name
 * @param {Function} fn
 * @api public
 */

exports.update = function(name, fn){

}

/**
 * Remove a database/collection/index.
 *
 * @param {String} name
 * @param {Function} fn
 * @api public
 */

exports.remove = function(name, fn){
  delete exports.collections[name];
  return exports;
}

/**
 * Find a database/collection/index.
 *
 * @param {String} name
 * @param {Function} fn
 * @api public
 */

exports.find = function(name, fn){
  return exports.collections[name];
}

function collection(name) {
  return exports.collections[name] || (exports.collections[name] = []);
}

function query(ctx, data, fn) {
  var records = collection(ctx.collectionName)
    , constraints = ctx.constraints;

  if (constraints.length) {
    ctx.emit('data', filter(records, constraints));
  } else {
    // optimized case of no query params
    ctx.emit('data', records);
  }
  
  fn();
}

function create(ctx, data, fn) {
  var records = collection(ctx.collectionName)
    , constraints = ctx.constraints;

  // XXX: generate uuid
  records.push.apply(records, ctx.data);
  ctx.emit('data', ctx.data);
  fn();
}

function update(context, data, next) {
  var records = collection(context.collectionName)
    , data = context.data
    , constraints = context.constraints;

  // XXX: or `isBlank`
  // if (!data)

  if (constraints.length)
    records = filter(records, constraints);

  // XXX: this could be optimized to just iterate once
  //      by reimpl part of `filter` here.
  // XXX: or maybe there is a `each-array-and-remove` that
  // is a slightly different iteration pattern so you can
  // remove/modify items while iterating.
  for (var i = 0, n = records.length; i < n; i++) {
    // XXX: `merge` part?
    for (var key in data) records[i][key] = data[key];
  }

  context.emit('data', records);
}

function remove(context, data, fn) {
  var records = collection(context.collectionName)
    , constraints = context.constraints;

  var result = [];

  if (constraints) {
    var i = records.length;

    while (i--) {
      if (validate(records[i], constraints)) {
        result.unshift(records.splice(i, 1)[0]);
      }
    }
  }

  context.emit('data', result);
  fn();
}