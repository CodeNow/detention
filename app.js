'use strict';

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.route('/').get(function (req, res, next) {
  if (req.query.type) {
    var page = req.query.type;
    var options = {};
    [
      'status',
      'branchName',
      'redirectUrl',
      'containerUrl',
      'ownerName',
      'instanceName',
      'ports'
    ].forEach(function (option) {
        var value = req.query[option];
        if (value && value.indexOf('[') === 0) {
          value = JSON.parse(value);
        }
        options[option] = value;
      });
    res.render('pages/' + page, options);
  } else {
    res.render('pages/invalid');
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
  res.status(err.status || 500);
  res.render('pages/invalid');
});


module.exports = app;
