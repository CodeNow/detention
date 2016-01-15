/**
 * @module app
 */
'use strict';

var ErrorCat = require('error-cat');
var Runnable = require('runnable');
var assign = require('101/assign');
var bodyParser = require('body-parser');
var express = require('express');
var keypather = require('keypather')();
var path = require('path');
var put = require('101/put');

var app = express();
var log = app.log = require('./logger')(__filename);
var version = require('./package.json').version;

// valid Detention request types (val for req validation)
var validDetentionTypes = [
  'not_running',
  'ports',
  'signin',
  'unresponsive'
];

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

assign(app.locals, {
  localVersion: version,
  absoluteUrl: process.env.ABSOLUTE_URL
});

// this is used for hello runnable user so we only have to login once
var superUser = app.superUser = new Runnable(process.env.API_URL, {
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
 * Validate query parameters
 */
app._validateRequest = function (req, res, next) {
  log.info('app._validateRequest');
  if (!req.query.shortHash && req.query.type !== 'signin') {
    log.trace('_validateRequest !shortHash');
    // TODO?: switch to createAndReport
    return next(ErrorCat.create(500, 'instance shortHash required'));
  }
  if (!~validDetentionTypes.indexOf(req.query.type)) {
    // only valid occurance if login error
    log.trace('_validateRequest !type');
    // TODO?: switch to createAndReport
    return next(ErrorCat.create(500, 'invalid request type'));
  }
  log.trace('_validateRequest success');
  next();
};

/**
 * Fetch Instance resource from API
 */
app._fetchInstance = function (req, res, next) {
  log.info({
    shortHash: req.query.shortHash
  }, 'api._fetchInstance');
  if (req.query.type === 'signin') {
    log.trace('_fetchInstance signin bypass');
    return next();
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

/**
 * Resolve instance status and render + return relevant error message html page
 */
app._processNaviError = function (req, res, next) {
  log.info({
    query: req.query
  }, 'processNaviError');
  var options = {};

  [
    'redirectUrl',
    'shortHash'
  ].forEach(function (option) {
    options[option] = req.query[option];
  });

  if (req.instance) {
    options.branchName = req.instance.getBranchName();
    // Temp missing pending resolution of SAN-3018
    // https://runnable.atlassian.net/browse/SAN-3018
    options.instanceName = keypather.get(req.instance, 'attrs.lowerName');
    options.ownerName = keypather.get(req.instance, 'attrs.owner.username');
    var ports = keypather.get(req.instance, 'attrs.container.ports');
    if (ports) {
      options.ports = Object.keys(ports).map(function (portKey) {
        // Ex: '3000/tcp' --> '3000'
        return portKey.replace(/\/tcp$/, '');
      });
    } else {
      log.warn({
        instance: req.instance
      }, '_processNaviError instance !ports');
    }
  }

  if (req.query.type === 'signin') {
    log.trace('processNaviError type signin');
    res.status(401);
    return res.render('pages/signin', options);
  }
  if (req.query.type === 'not_running') {
    res.status(503);
    log.trace('processNaviError type not_running');

    if (keypather.get(req.instance, 'contextVersion.attrs.dockRemoved')) {
      log.trace({
        options: options
      }, 'processNaviError instance dock_removed');
      return res.render('pages/migrating', options);
    }

    // container state error pages.
    // - Not running (building, starting, crashed)
    // - Running, but unresponsive
    var status = req.instance.status();
    log.trace({
      status: status,
      options: options
    }, 'processNaviError instance status');

    options.status = status;
    switch(status) {
      case 'crashed':
        res.render('pages/crashed', options);
        break;
      case 'stopped':
      case 'stopping':
        res.render('pages/stopped', options);
        break;
      case 'running':
        // The instance could have started after Navi fetched it and proxied to detention.
        // Might not be the best idea to trigger a refresh, could easily result in user-unfriendly
        // infinite redirect loops. Better to display an error page prompting user to refresh?
        res.render('pages/running', options);
        break;
      case 'neverStarted':
      case 'buildFailed':
        res.render('pages/buildFailed', options);
        break;
      case 'building':
        res.render('pages/building', options);
        break;
      case 'starting':
        res.render('pages/starting', options);
        break;
      case 'unknown':
        res.render('pages/unknown', options);
        break;
    }
    return;
  }
  if (req.query.type === 'ports'){
    log.trace('processNaviError type ports');
    /*
     * Currently not implemented, might be bundled into 'unresponsive'
     *
     * Userland hipache will only route to navi if a request is made to an elastic url on a port
     * that's explicitly set on the instance (we set hipache redis entries when ports are exposed)
     * otherwise userland-hipache will return an error page due to a lack of a redis entry.
     *
     * Probably could fix by patching Hipache or perhaps reading the manual to see if there's a
     * some kind of forward-for-all-ports functionality
     *
     * Anand if you read this Monday morning lets chat about it at 3pm
     */
    return;
  }
  if (req.query.type === 'unresponsive'){
    log.trace('processNaviError type unresponsive');
    res.status(503);
    res.render('pages/unresponsive', options);
    return;
  }
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.route('/*').get(
  app._validateRequest,
  app._fetchInstance,
  app._processNaviError
);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.render('pages/invalid', {});
});

module.exports = app;
