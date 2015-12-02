/**
 * @module test/app
 */
'use strict';

var Code = require('code');
var Lab = require('lab');
var sinon = require('sinon');

var lab = exports.lab = Lab.script();

var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var describe = lab.describe;
var expect = Code.expect;
var it = lab.test;

var app = require('../app');

describe('app.js', function () {
  describe('app.loginSuperUser', function () {
    beforeEach(function (done) {
      sinon.stub(app.superUser, 'githubLogin').yieldsAsync();
      sinon.stub(app.log, 'error');
      sinon.stub(app.log, 'trace');
      done();
    });

    afterEach(function (done) {
      app.superUser.githubLogin.restore();
      app.log.error.restore();
      app.log.trace.restore();
      done();
    });

    it('should authenticate with API as hello-runnable', function (done) {
      app.loginSuperUser(function (err) {
        expect(err).to.be.undefined();
        sinon.assert.callCount(app.superUser.githubLogin, 1);
        sinon.assert.calledWith(app.superUser.githubLogin, process.env.HELLO_RUNNABLE_GITHUB_TOKEN);
        sinon.assert.calledWith(app.log.trace,
          sinon.match.any, 'loginSuperUser success');
        done();
      })
    });

    it('should log if authentication errors', function (done) {
      var error = new Error('api error');
      app.superUser.githubLogin.yieldsAsync(error);
      app.loginSuperUser(function (err) {
        expect(err).to.equal(error);
        sinon.assert.callCount(app.superUser.githubLogin, 1);
        sinon.assert.calledWith(app.superUser.githubLogin, process.env.HELLO_RUNNABLE_GITHUB_TOKEN);
        sinon.assert.calledWith(app.log.error,
          sinon.match.any, 'loginSuperUser error');
        done();
      })
    });
  });

  describe('app._validateRequest', function () {
    it('should next with error if non-signin error with no shortHash', function (done) {
      var req = {
        query: {
          type: 'not_running' // !signin
        }
      };
      app._validateRequest(req, {}, function (err) {
        expect(err.message).to.equal('instance shortHash required');
        done();
      });
    });

    it('should next with error if invalid query.type value', function (done) {
      var req = {
        query: {
          shortHash: '5555',
          type: '*^^$^#&$@'
        }
      };
      app._validateRequest(req, {}, function (err) {
        expect(err.message).to.equal('invalid request type');
        done();
      });
    });

    it('should next without error for valid request', function (done) {
      var req = {
        query: {
          shortHash: '5555',
          type: 'not_running'
        }
      };
      app._validateRequest(req, {}, function (err) {
        expect(err).to.be.undefined();
        done();
      });
    });
  });

  describe('app._fetchInstance', function () {
    beforeEach(function (done) {
      sinon.stub(app.superUser, 'fetchInstance');
      done();
    });

    afterEach(function (done) {
      app.superUser.fetchInstance.restore();
      done();
    });

    it('should next without fetching if query is signin', function (done) {
      var req = {
        query: {
          type: 'signin'
        }
      };
      app._fetchInstance(req, {}, function (err) {
        expect(err).to.be.undefined();
        sinon.assert.notCalled(app.superUser.fetchInstance);
        done();
      });
    });

    it('should next with error if fetchInstance yields an error', function (done) {
      var instance = {};
      app.superUser.fetchInstance.returns(instance).yieldsAsync(new Error('error'));
      var req = {
        query: {
          shortHash: 'axcde',
          type: 'not_running'
        }
      };
      app._fetchInstance(req, {}, function (err) {
        expect(err.message).to.equal('instance not found');
        sinon.assert.callCount(app.superUser.fetchInstance, 1);
        sinon.assert.calledWith(app.superUser.fetchInstance, 'axcde');
        done();
      });
    });

    it('should fetch instance and assign to req.instance, then next', function (done) {
      var instance = {};
      app.superUser.fetchInstance.returns(instance).yieldsAsync();
      var req = {
        query: {
          shortHash: 'axcde',
          type: 'not_running'
        }
      };
      app._fetchInstance(req, {}, function (err) {
        expect(err).to.be.undefined();
        sinon.assert.callCount(app.superUser.fetchInstance, 1);
        sinon.assert.calledWith(app.superUser.fetchInstance, 'axcde');
        expect(req.instance).to.equal(instance);
        done();
      });
    });
  });
});
