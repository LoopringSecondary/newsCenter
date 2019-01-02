"use strict";

var Jayson         = require('jayson');
var Mysql          = require('mysql');
var Async          = require('async');
var Log4js         = require('log4js');
var DataTypes      = require('../../../gen-nodejs/data_types'),
    ErrorCode      = DataTypes.ErrorCode;
var Util           = require('./util');


// make a log directory, just in case it isn't there.
try {
  require('fs').mkdirSync('./log');
} catch (e) {
  if (e.code != 'EEXIST') {
    console.error("Could not set up log directory, error was: ", e);
    process.exit(1);
  }
}

Log4js.configure('./config/log4js.json');
var log = Log4js.getLogger("newsCenter");

var pool  = Mysql.createPool({
  connectionLimit : 10, // When done with the connection, release it.
  host            : 'localhost',
  user            : 'root',
  password        : '111111',
  database        : 'crawler',
  charset         : 'utf8',
  acquireTimeout  : 5000,
});

// create a server
var server = Jayson.server({
  queryNews: function(requests, callback) {
    log.info(requests);
    if(false == Util.checkQueryNewsParms(requests)) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      log.error(error);
      return callback(error, null);
    }

    var sql = Util.constructQueryNewsSql(requests[0]);        
    pool.getConnection(function(connetErr, connection) {
      if (connetErr) {
        log.error(connetErr);
        var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_CONNECT_ERROR'};
        return callback(error, null);
      } 
      Async.parallel ([
        function (cb) {connection.query(sql.queryTotalSql, cb)},
        function (cb) {connection.query(sql.queryNewsSql, cb)}
        ], function(queryErr, result) {
          connection.release();
          if (queryErr) {
            log.error(queryErr);
            return callback(queryErr, null);
          } 
          var total = result[0][0][0].total;
          var queryResult = result[1][0];
          var response = Util.constructNewsRespose(requests[0], queryResult, total);
          return callback(null, response);
        });
    });      
  },

  updateIndex: function(requests, callback) {
    log.info(requests);
    if(false == Util.checkUpdateIndexParms(requests)) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      log.error(error);
      return callback(error, null);
    }

    pool.getConnection(function(connetErr, connection) {
      if (connetErr) {
        var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_CONNECT_ERROR'};
        log.error(error);
        return callback(error, null);
      }
      var parms = {connection: connection, uuid: requests[0].uuid, indexName: requests[0].indexName, direction: requests[0].direction};
      Async.waterfall([
        Util.waterFallStart(parms),
        Util.getNewIndex,
        Util.updateIndex
        ], function (error, result) {
          connection.release();
          if (error) { 
            log.error(error);
            return callback(error, null);
          }
          var response = Util.constructIndexRespose(requests[0], result);
          callback(null, response);
        });
    });         
  },

  queryScrollingInfo: function(requests, callback) {
    log.info("query scrolling information begin...");

    pool.getConnection(function(connetErr, connection) {
      if (connetErr) {
        var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_CONNECT_ERROR'};
        log.error(error);
        return callback(error, null);
      }
      var parms = {connection: connection};
      Async.waterfall([
        Util.waterFallStart(parms),
        Util.queryScrollingInfo
        ], function (error, result) {
          connection.release();
          if (error) { 
            log.error(error);
            return callback(error, null);
          }
          var response = Util.constructScrollingInfoRespose(result);
          callback(null, response);
        });
    });         
  }
});

server.http().listen(5555, function() {
  log.info('News center sever is istening on: 5555:)');
});
