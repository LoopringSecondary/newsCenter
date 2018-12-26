"use strict";

var Moment               = require('moment');
var Log4js               = require('log4js');
var DataTypes            = require('../../../gen-nodejs/data_types'),
    ErrorCode            = DataTypes.ErrorCode,
    NewsItem             = DataTypes.NewsItem,
    NewsCollection       = DataTypes.NewsCollection,
    IndexResponse        = DataTypes.IndexResponse,
    S_CHINESE            = DataTypes.S_CHINESE,
    T_CHINENE            = DataTypes.T_CHINENE,
    ENGLISH              = DataTypes.ENGLISH,
    INFORMATION          = DataTypes.INFORMATION,
    FLASH                = DataTypes.FLASH,
    MAX_PAGE_SIZE        = DataTypes.MAX_PAGE_SIZE,
    BULL_INDEX_COLUMN    = DataTypes.BULL_INDEX_COLUMN,
    BEAR_INDEX_COLUMN    = DataTypes.BEAR_INDEX_COLUMN,
    FORWARD_NUM_COLUMN   = DataTypes.FORWARD_NUM_COLUMN;

Log4js.configure('./config/log4js.json');
var log = Log4js.getLogger("util");

function isNonNegativeInt(input) { 
  var re =  /^\d+$/;
  if (!re.test(input)) { 
    return false;
  } 
  return true;
};

exports.checkQueryNewsParms = function(requests) {
  if (requests.length != 1) return fasle;
  var request = requests[0]; 
  if(request.category != INFORMATION && request.category != FLASH) {
    return false;
  }
  if(request.language != S_CHINESE && request.language != T_CHINENE && request.language != ENGLISH) {
    return false;
  }
  if(!isNonNegativeInt(request.pageIndex) || !isNonNegativeInt(request.pageSize) || request.pageSize > MAX_PAGE_SIZE) {
    return false;
  }
  return true;
}

exports.checkUpdateIndexParms = function(requests) {
  if (requests.length != 1) return fasle;
  var request = requests[0]; 
  if (request.indexName != BULL_INDEX_COLUMN && request.indexName != BEAR_INDEX_COLUMN && request.indexName != FORWARD_NUM_COLUMN) {
    return false;
  }
  if (request.direction != -1 && request.direction != 1) {
    return false;
  }
  if(request.indexName == FORWARD_NUM_COLUMN && request.direction != 1) {
    return false;
  }
  return true;
}

exports.constructQueryNewsSql = function(request) {
  var queryNewsSql = "";
  var queryTotalSql = "";
  const tableName = "cn_info";
  const orderCondition = " order by insert_time DESC limit ";

  switch(request.currency) {
    case "ALL_CURRENCY":
      queryNewsSql = 'select * from ' + tableName + ' where news_category = "' + request.category + '"' + orderCondition + request.pageIndex + ',' + request.pageSize;
      queryTotalSql = 'select count(*) as total from cn_info';
      break;
    default:
      queryNewsSql = 'select * from ' + tableName + ' where news_category = "' + request.category + '" and title like "%' + request.currency + '%"' + orderCondition + request.pageIndex + ',' + request.pageSize;
      queryTotalSql = 'select count(*) as total from cn_info where title like "%' + request.currency + '%"';
      break;
  }


  var sql = {queryNewsSql: queryNewsSql, queryTotalSql: queryTotalSql};
  log.info(sql);
  return sql;
}

exports.constructNewsRespose = function(request, queryResult, total) {
  var results = new NewsCollection();            
  results.data = [];
  var item = new NewsItem();
  for (var i = 0; i < queryResult.length; i++) {
    var item = new NewsItem();
    if (queryResult[i].title == null || queryResult[i].content == null) {
      continue;
    }
    item.uuid = queryResult[i].uuid;
    item.title = queryResult[i].title;
    item.content = queryResult[i].content;
    item.category = queryResult[i].category;
    item.url = queryResult[i].url;
    var insertTime = (new Date(queryResult[i].insert_time)).getTime();
    item.publishTime = Moment.unix(insertTime/1000).utc().format("YYYY-MM-DD HH:mm");
    item.source = queryResult[i].source_site_name;
    item.author = queryResult[i].author;
    item.imageUrl = queryResult[i].imageUrl;
    item.bullIndex = queryResult[i].bull_index;
    item.bearIndex = queryResult[i].bear_index;
    item.forwardNum = queryResult[i].forward_num;
    item.language = queryResult[i].language;
    item.currency = request.currency;
    results.data.push(item);
  }
  results.pageIndex = request.pageIndex;
  results.pageSize = request.pageSize;
  results.total = total; // 此处增加一次读库，如果APP显示方式优化，此处及查库过程可以删除
  return results;
}

exports.constructIndexRespose = function(request, result) {
  var response = new IndexResponse();
  response.uuid = request.uuid;
  response.bullIndex = result.bullIndex;
  response.bearIndex = result.bearIndex;
  response.forwardNum = result.forwardNum;
  log.info(response);
  return response;
}

exports.waterFallStart = function(parms) {
  return function (callback) {
    callback (null, parms);
  }
}

exports.getNewIndex = function(request, callback) {
  var sql = 'select * from cn_info where uuid = "' + request.uuid + '"';
  // Use the connection
  var connection = request.connection;
  connection.query(sql, function (queryErr, queryResult) {
    if(queryErr) {
      var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_SELECT_ERROR'};
      return callback(error, null);
    } else {
      if(queryResult.length != 1) {
        var error = {code: ErrorCode.BUSINESS_ERROR, message: 'BUSINESS_ERROR'};
        return callback(error, null);
      } else {
        var newIndex = eval("queryResult[0]." + request.indexName) + request.direction;
        if (newIndex < 0) {
          var error = {code: ErrorCode.BUSINESS_ERROR, message: 'BUSINESS_ERROR'};
          return callback(error, null);
        } else {
          var parms = {connection: request.connection, uuid: request.uuid, bullIndex: queryResult[0].bull_index, bearIndex: queryResult[0].bear_index, forwardNum: queryResult[0].forward_num};
          switch(request.indexName) {
            case BULL_INDEX_COLUMN:
              parms.bullIndex = newIndex;
              break;
            case BEAR_INDEX_COLUMN:
              parms.bearIndex = newIndex;
              break;
            case FORWARD_NUM_COLUMN:
              parms.forwardNum = newIndex;
              break;
            default:
              var error = {code: ErrorCode.BUSINESS_ERROR, message: 'BUSINESS_ERROR'};
              return callback(error, null);
          }
          return callback(null, parms);
        }
      }
    }
  });
}

exports.updateIndex = function(request, callback) {
  var sql = 'update cn_info set bull_index = ' + request.bullIndex + ', bear_index = ' + request.bearIndex + ', forward_num = ' + request.forwardNum + ', update_time = now() where uuid = "' + request.uuid + '"';
  log.info(sql);
  request.connection.query(sql, function (queryErr, queryResult) {
    if(queryErr) {
      log.error(queryErr);
      var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_SELECT_ERROR'};
      return callback(error, null);
    } else {
      var result = {bullIndex: request.bullIndex, bearIndex: request.bearIndex, forwardNum: request.forwardNum};
      return callback(null, result);
    }
  });
}















