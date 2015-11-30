/**
 * @module app
 */
'use strict';

var ErrorCat = require('error-cat');
var Runnable = require('runnable');
var bodyParser = require('body-parser');
var express = require('express');
var keypather = require('keypather')();
var path = require('path');
var put = require('101/put');

var app = express();
var log = require('./logger')(__filename);
var version = require('./package.json').version;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.locals({
  localVersionversion: version,
  absoluteUrl: process.env.ABSOLUTE_URL || 'detention.runnable.io'
});

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
    // TODO?: switch to createAndReport
    return next(ErrorCat.create(500, 'instance shortHash required'));
  }
  req.instance = superUser.fetchInstance(req.query.shortHash, function (err) {
    if (err) {
      log.error({
        err: err
      }, '_fetchInstance superUser.fetchInstance error');
      // TODO?: switch to createAndReport
      return next(ErrorCat.create(404, 'instance not found'));
    }
    log.trace('_fetchInstance superUser.fetchInstance success');
    next();
  });
};

// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.route('/*').get(app._fetchInstance, function processInstance (req, res, next) {
  log.info({
    query: req.query
  }, 'processInstance');
  var options = {};

  [
    'redirectUrl',
    'shortHash'
  ].forEach(function (option) {
    options[option] = req.query[option];
  });

  if (req.query.type === 'signin') {
    log.trace('processInstance type signin');
    return res.render('pages/signin', options);
  } else if (req.query.type === 'not_running') {
    log.trace('processInstance type !signin');

    if (!req.instance) {
      log.error('instance not found');
      return next(new Error('instance not found'));
    }

    options.branchName = keypather.get(req.instance, 'attrs.contextVersion.branch');
    // Temp missing pending resolution of SAN-3018
    // https://runnable.atlassian.net/browse/SAN-3018
    options.instanceName = keypather.get(req.instance, 'attrs.contextVersion.branch');
    options.ownerName = keypather.get(req.instance, 'attrs.owner.username');

    // container state error pages.
    // - Not running (building, starting, crashed)
    // - Running, but unresponsive
    var status = req.instance.status();
    log.trace({
      status: status,
      options: options
    }, 'processInstance instance status');

    options.status = status;
    switch(status) {
      case 'stopped':
      case 'crashed':
      case 'stopping':
        options.headerText = 'is ' + status;
        res.render('pages/dead', options);
        break;
      case 'running':
        // The instance could have started after Navi fetched it and proxied to detention.
        // Might not be the best idea to trigger a refresh, could easily result in user-unfriendly
        // infinite redirect loops. Better to display an error page prompting user to refresh?
        options.headerText = 'is running';
        res.render('pages/dead', options);
        break;
      case 'buildFailed':
        options.headerText = 'build failed';
        res.render('pages/dead', options);
        break;
      case 'building':
        options.headerText = 'is building';
        res.render('pages/dead', options);
        break;
      case 'neverStarted':
      case 'starting':
        options.headerText = 'is starting';
        res.render('pages/dead', options);
        break;
      case 'unknown':
        options.headerText = 'unknown';
        res.render('pages/dead', options);
        break;
    }
  } else {
    // ports, unresponsive
  }

/*
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
  } else {
    res.render('pages/invalid', options);
  }
*/

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
  res.render('pages/invalid', {});
});

module.exports = app;
