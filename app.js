/**
 * @module app
 */
'use strict';

var Runnable = require('runnable');
var bodyParser = require('body-parser');
var express = require('express');
var path = require('path');
var put = require('101/put');

var app = express();
var log = require('./logger')(__filename);
var version = require('./package.json').version;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var locals = {
  version: version
};

// this is used for hello runnable user so we only have to login once
var superUser = new Runnable(process.env.API_HOST, {
  requestDefaults: {
    headers: {
      'user-agent': 'detention-root'
    },
  }
});

/**
 * Authenticate with API as super user
 * Must invoke before server begins listening
 */
app.loginSuperUser = function (cb) {
  var logData = {
    tx: true
  };
  log.info(logData, 'api.loginSuperUser');
  superUser.githubLogin(process.env.HELLO_RUNNABLE_GITHUB_TOKEN, function (err) {
    if (err) {
      log.error(put({
        err: err
      }, logData), 'loginSuperUser error');
    } else {
      log.trace(logData, 'loginSuperUser success');
    }
    cb(err);
  });
};

/**
 * Fetch Instance resource from API
 */
app._fetchInstance = function (req, res, next) {
  log.info({
    shortHash: req.query.shortHash
  }, 'api._fetchInstance');
  if (!req.query.shortHash) {
    // only valid occurance if login error
    log.trace('_fetchInstance !shortHash');
    return next();
  }
  req.instance = superUser.fetchInstance(req.query.shortHash, function (err) {
    if (err) {
      log.error({
        err: err
      }, '_fetchInstance superUser.fetchInstance error');
    }
    log.trace('_fetchInstance superUser.fetchInstance success');
    next();
  });
};

// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.route('/*').get(app._fetchInstance, function (req, res, next) {
  var options = {
    localVersion: version,
    absoluteUrl: process.env.ABSOLUTE_URL || 'detention.runnable.io'
  };
  if (req.query.type) {
    var page = req.query.type;
    [
      'status',
      'redirectUrl',
      'shortHash'
    ].forEach(function (option) {
      options[option] = req.query[option];
    });
    if (req.query.ports) {
      var value = req.query.ports;
      if (!Array.isArray(value)) {
        value = [value];
      }
      options.ports = value;
    }
    options.headerText = options.status;
    if (options.status) {
      if (options.status === 'buildFailed') {
        options.headerText = 'build failed.';
        options.status = 'failed to build';
      } else {
        options.status = 'is ' + options.status;
      }
    }
    res.render('pages/' + page, options);
  } else {
    res.render('pages/invalid', options);
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.render('pages/invalid', {
    localVersion: version
  });
});


module.exports = app;
