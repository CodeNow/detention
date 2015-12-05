/**
 * @module lib/logger
 */
'use strict';

var bunyan = require('bunyan');
var envIs = require('101/env-is');
var path = require('path');
var put = require('101/put');

var logger = bunyan.createLogger({
  name: 'detention',
  streams: [{
    level: process.env.LOG_LEVEL_STDOUT || 'trace',
    stream: process.stdout
  }],
  serializers: bunyan.stdSerializers,
  // DO NOT use src in prod, slow
  src: !envIs('production'),
  environment: process.env.NODE_ENV
});

/**
 * Return a new child bunyan instance
 * @param {String} namespace
 */
module.exports = function (namespace) {
  return logger.child({
    module: path.relative(process.cwd(), namespace)
  });
}
