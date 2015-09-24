'use strict';

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var version = require('./package.json').version;
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var locals = {
  version: version
};

// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.route('/*').get(function (req, res, next) {
  var options = {
    localVersion: version,
    absoluteUrl: process.env.ABSOLUTE_URL || 'detention.runnable.io'
  };
  if (req.query.type) {
    var page = req.query.type;
    [
      'status',
      'branchName',
      'redirectUrl',
      'containerUrl',
      'ownerName',
      'instanceName'
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
