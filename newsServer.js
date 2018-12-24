var Jayson         = require('jayson');
var Mysql          = require('mysql');
var Async          = require('async');
var Moment         = require('moment');
var Log4js         = require('log4js');
var DataTypes      = require('./gen-nodejs/data_types'),
    ErrorCode      = DataTypes.ErrorCode,
    NewsItem       = DataTypes.NewsItem,
    NewsCollection = DataTypes.NewsCollection,
    IndexResponse  = DataTypes.IndexResponse,
    S_CHINESE      = DataTypes.S_CHINESE,
    T_CHINENE      = DataTypes.T_CHINENE,
    ENGLISH        = DataTypes.ENGLISH,
    INFORMATION    = DataTypes.INFORMATION,
    FLASH          = DataTypes.FLASH;

/**
 * make a log directory, just in case it isn't there.
 */
try {
  require('fs').mkdirSync('./log');
} catch (e) {
  if (e.code != 'EEXIST') {
    console.error("Could not set up log directory, error was: ", e);
    process.exit(1);
  }
}

Log4js.configure('./config/log4js.json');
var log = Log4js.getLogger("newscenter");

var pool  = Mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        : '111111',
  database        : 'crawler',
  charset         : 'utf8',
});

function isNonNegativeInt(input) { 
  var re =  /^\d+$/;
  if (!re.test(input)) { 
    return false;
  } 
  return true;
}

function checkQueryParameters(currency, category, language, pageIndex, pageSize) {
  if(category != INFORMATION && category != FLASH) {
    return false;
  }
  if(language != S_CHINESE && language != T_CHINENE && language != ENGLISH) {
    console.log("language");
    return false;
  }
  if(!isNonNegativeInt(pageIndex) || !isNonNegativeInt(pageSize) || pageSize > 10) {
    return false;
  }
  return true;
}

function checkUpdateParameters(uuid, indexName, direction) {
  if (indexName != "bull_index" && indexName != "bear_index" && indexName != "forward_num") {
    return false;
  }
  if (direction != -1 && direction != 1) {
    return false;
  }
  if(indexName == "forward_num" && direction != 1) {
    return false;
  }
  return true;
}

function constructRespose(queryResult, category, currency, language, pageIndex, pageSize, total) {
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
    item.category = category;
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
    item.currency = currency;
    results.data.push(item);
  }
  results.pageIndex = pageIndex;
  results.pageSize = pageSize;
  results.total = total; //TODO 增加一次读库，如果APP显示方式优化，此处及查库过程可以删除
  log.info("respose: " + results.data.length + " records");
  return results;
}

function getNewIndex (uuid, indexName, direction, callback) {
  var sql = 'select ' + indexName + ' from cn_info where uuid = "' + uuid + '"';
  pool.getConnection(function(connetErr, connection) {
    if (connetErr) {
      var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_CONNECT_ERROR'};
      callback(error, null);
    } else {
      // Use the connection
      connection.query(sql, function (selectErr, queryResult) {
        // When done with the connection, release it.
        connection.release();
        if (selectErr) {
          var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_SELECT_ERROR'};
          callback(error, null);
        } else {
          console.log(queryResult);
          if(queryResult.length != 1) {
            var error = {code: ErrorCode.BUSINESS_ERROR, message: 'BUSINESS_ERROR'};
            callback(error, null);
          } else {
            console.log("queryResult[0].bull_index = " + eval("queryResult[0]." + indexName))
            var newIndex = eval("queryResult[0]." + indexName) + direction;
            if (newIndex < 0) {
              var error = {code: ErrorCode.BUSINESS_ERROR, message: 'BUSINESS_ERROR'};
              console.log("newIndex < 0");
              callback(error, null);
            } else {
              callback(null, newIndex);
            }
          }
        }
      });
    }
  });    
}

function constructSql(currency, category, language, pageIndex, pageSize) {
  var sqlStr = "";
  var tableName = "";

  switch(language) {
    case S_CHINESE:
      tableName = "cn_info";
      break;
    case ENGLISH:
      // TODO: support English
      return sqlStr;
    default:
      return sqlStr;
  }

  switch(currency) {
    case "ALL_CURRENCY":
      sqlStr = 'select * from ' + tableName + ' where news_category = "' + category + '" order by insert_time DESC limit ' + pageIndex + ',' + pageSize;
      break;
    default:
      sqlStr = 'select * from ' + tableName + ' where news_category = "' + category + '" and title like "%' + currency + '%"  order by insert_time DESC limit ' + pageIndex + ',' + pageSize;
      break;
  }
  return sqlStr;
}

// create a server
var server = Jayson.server({
  queryAsync: function(args, callback) {
    if(args.length != 1) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      return callback(error, null);
    }
    var arg = args[0];
    var currency = arg.currency;
    var category = arg.category;
    var language = arg.language;
    var pageIndex = arg.pageIndex;
    var pageSize = arg.pageSize;
    log.info(arg);
    if(!checkQueryParameters(currency, category, language, pageIndex, pageSize)) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      return callback(error, null);
    } else {
      var queryNewsSql = constructSql(currency, category, language, pageIndex, pageSize);
      var queryTotalSql = 'select count(*) as total from cn_info where title like "%' + currency + '%"';
      log.info(queryNewsSql);
      if (queryNewsSql != "") {
        pool.getConnection(function(connetErr, connection) {
          if (connetErr) {
            var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_CONNECT_ERROR'};
            callback(error, null);
          } else {
            Async.parallel ([
              function (cb) {connection.query(queryTotalSql, cb)},
              function (cb) {connection.query(queryNewsSql, cb)}
              ], function(err, result) {
                // When done with the connection, release it.
                connection.release();
                if (err) {
                  log.error(err);
                  callback(err);
                } else {
                  var total = result[0][0][0].total;
                  var queryResult = result[1][0];
                  var results = constructRespose(queryResult, category, currency, language, pageIndex, pageSize, total);
                  callback(null, results);
                }
              });
          }
        });
      } else {
        var results = new NewsCollection();            
        results.data = [];
        callback(null, results);
      }      
    }
  },

  queryNews: function(args, callback) {
    if(args.length != 1) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      return callback(error, null);
    }
    var arg = args[0];
    var currency = arg.currency;
    var category = arg.category;
    var language = arg.language;
    var pageIndex = arg.pageIndex;
    var pageSize = arg.pageSize;
    log.info(arg);
    if(!checkQueryParameters(currency, category, language, pageIndex, pageSize)) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      callback(error, null);
    } else {
      var sql = constructSql(currency, category, language, pageIndex, pageSize);
      log.info(sql);
      if (sql != "") {
        pool.getConnection(function(connetErr, connection) {
          if (connetErr) {
            var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_CONNECT_ERROR'};
            callback(error, null);
          } else {
            // Use the connection
            connection.query(sql, function (queryErr, queryResult) {
              // When done with the connection, release it.
              connection.release();
              if (queryErr) {
                var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_QUERY_ERROR'};
                callback(error, null);
              } else {
                var results = constructRespose(queryResult, category, currency, language, pageIndex, pageSize);
                callback(null, results);
              }
            });
          }
        });
      } else {
        var results = new NewsCollection();            
        results.data = [];
        callback(null, results);
      }      
    }
  },

  updateIndex: function(args, callback) {
    if(args.length != 1) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      return callback(error, null);
    }
    var arg = args[0];
    var uuid = arg.uuid;
    var indexName = arg.indexName;
    var direction = arg.direction;
    log.info(args);
    if (!checkUpdateParameters(uuid, indexName, direction)) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      callback(error, null);
    } else {
      var newIndex = -1;
      getNewIndex(uuid, indexName, direction, function (queryErr, indexResult) {
        if(queryErr) {
          console.log(queryErr);
          callback(queryErr, null);
        } else {
          newIndex = indexResult;
          console.log("newIndex = " + newIndex);
          if (newIndex < 0) {
            log.error("INDEX_CACULATE_ERROR uuid = " + uuid + ", indexName = " + indexName);
            var error = {code: ErrorCode.INDEX_CACULATE_ERROR, message: 'INDEX_CACULATE_ERROR'};
            callback(error, null);
          } else {
            var sql = 'update cn_info set ' + indexName + ' = ' + newIndex + ', update_time = now() where uuid = "' + uuid + '"';
            log.info(sql);
            if (sql != "") {
              pool.getConnection(function(connetErr, connection) {
                if (connetErr) {
                  var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_CONNECT_ERROR'};
                  callback(error, null);
                } else {
                  // Use the connection
                  connection.query(sql, function (updateErr, result) {
                    if (updateErr) {
                      // When done with the connection, release it.
                      connection.release();
                      var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_UPDATE_ERROR'};
                      callback(error, null);
                    } else {
                      // Use the connection
                      var sqlAfter = 'select * from cn_info where uuid = "' + uuid + '"';
                      connection.query(sqlAfter, function (queryAfterErr, resultAfter, fields) {
                        // When done with the connection, release it.
                        connection.release();
                        if (queryAfterErr) {
                          var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_UPDATE_ERROR'};
                          callback(error, null);
                        } else {
                          console.log(resultAfter);
                          if(resultAfter.length != 1) {
                            var error = {code: ErrorCode.BUSINESS_ERROR, message: 'BUSINESS_ERROR'};
                            callback(error, null);
                          } else {
                            var response = new IndexResponse();
                            response.uuid = uuid;
                            response.bullIndex = resultAfter[0].bull_index;
                            response.bearIndex = resultAfter[0].bear_index;
                            response.forwardNum = resultAfter[0].forward_num;
                            callback(null, response);
                          }
                        };
                      });
                    }
                  });
                }
              });
            } else {
              var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
              callback(error, null);
            }  
          }
        }
      });          
    }
  }
});

server.http().listen(5555, function() {
  log.info('News center sever is istening on: 5555:)');
});
