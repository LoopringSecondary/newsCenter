var jayson         = require('jayson');
var mysql          = require('mysql');
var moment         = require('moment');
var log4js         = require('log4js');
var DataTypes      = require('./gen-nodejs/data_types'),
    ErrorCode      = DataTypes.ErrorCode,
    NewsItem       = DataTypes.NewsItem,
    Language       = DataTypes.Language,
    Category       = DataTypes.Category,
    NewsCollection = DataTypes.NewsCollection,
    IndexResponse  = DataTypes.IndexResponse;

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

log4js.configure('./config/log4js.json');
var log = log4js.getLogger("newscenter");

var pool  = mysql.createPool({
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
  if(category != Category.INFORMATION && category != Category.FLASH) {
    return false;
  }
  if(language != Language.CHINESE && language != Language.ENGLISH) {
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

function constructRespose(queryResult, category, pageIndex, pageSize) {
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
    item.publishTime = moment.unix(insertTime/1000).utc().format("YYYY-MM-DD HH:mm");
    item.source = queryResult[i].source_site_name;
    item.author = queryResult[i].author;
    item.imageUrl = queryResult[i].imageUrl;
    item.bullIndex = queryResult[i].bull_index;
    item.bearIndex = queryResult[i].bear_index;
    item.forwardNum = queryResult[i].forward_num;
    results.data.push(item);
  }
  results.pageIndex = pageIndex;
  results.pageSize = pageSize;
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
      connection.query(sql, function (selectErr, queryResult, fields) {
        // When done with the connection, release it.
        connection.release();
        if (selectErr) {
          var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_SELECT_ERROR'};
          callback(error, null);
        } else {
          console.log(queryResult);
          if(queryResult.length != 1) {
            var error = {code: ErrorCode.DATA_ERROR, message: 'DATA_ERROR'};
            callback(error, null);
          } else {
            console.log("queryResult[0].bull_index = " + eval("queryResult[0]." + indexName))
            var newIndex = eval("queryResult[0]." + indexName) + direction;
            console.log(newIndex);
            if (newIndex < 0) {
              var error = {code: ErrorCode.DATA_ERROR, message: 'DATA_ERROR'};
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
    case 0:
      tableName = "cn_info";
      break;
    case 1:
      // TODO: support English
      return sqlStr;
    default:
      return sqlStr;
  }

  var news_category = searchCategoryName(category);

  switch(currency) {
    case "ALL_CURRENCY":
      sqlStr = 'select * from ' + tableName + ' where news_category = "' + news_category + '" order by insert_time DESC limit ' + pageIndex + ',' + pageSize;
      break;
    default:
      sqlStr = 'select * from ' + tableName + ' where news_category = "' + news_category + '" and title like "%' + currency + '%"  order by insert_time DESC limit ' + pageIndex + ',' + pageSize;
      break;
  }
  return sqlStr;
}

// create a server
var server = jayson.server({
  query: function(args, callback) {
    var currency = args.currency;
    var category = args.category;
    var language = args.language;
    var pageIndex = args.pageIndex;
    var pageSize = args.pageSize;
    log.info(args);
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
            connection.query(sql, function (queryErr, queryResult, fields) {
              // When done with the connection, release it.
              connection.release();
              if (queryErr) {
                var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_QUERY_ERROR'};
                callback(error, null);
              } else {
                var results = constructRespose(queryResult, category, pageIndex, pageSize);
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
    var uuid = args.uuid;
    var indexName = args.indexName;
    var direction = args.direction;
    log.info(args);
    if (!checkUpdateParameters(uuid, indexName, direction)) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      callback(error, null);
    } else {
      var newIndex = -1;
      getNewIndex(uuid, indexName, direction, function (queryErr, indexResult) {
        if(queryErr) {
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
                    // When done with the connection, release it.
                    connection.release();
                    if (updateErr) {
                      var error = {code: ErrorCode.DATABASE_ERROR, message: 'DATABASE_UPDATE_ERROR'};
                      callback(error, null);
                    } else {
                      console.log(result);
                      var response = new IndexResponse();
                      response.bullIndex = newIndex;
                      callback(null, response);
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

function searchLanguageName(myValue) {
  for (prop in Language) {
    if (Language[prop] == myValue) {
      return prop;
    }
  }
}

function searchCategoryName(myValue) {
  for (prop in Category) {
    if (Category[prop] == myValue) {
      return prop;
    }
  }
}

server.http().listen(5555, function() {
  log.info('News center sever is istening on: 5555:)');
});
