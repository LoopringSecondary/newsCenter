var jayson         = require('jayson');
var mysql          = require('mysql');
var moment         = require('moment');
var log4js         = require('log4js');
var DataTypes      = require('./gen-nodejs/data_types'),
    ErrorCode      = DataTypes.ErrorCode,
    NewsItem       = DataTypes.NewsItem,
    Language       = DataTypes.Language,
    Category       = DataTypes.Category,
    NewsCollection = DataTypes.NewsCollection;

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

function isPositiveInt(input) { 
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
  if(!isPositiveInt(pageIndex) && !isPositiveInt(pageSize) && pageSize > 10) {
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
    item.title = queryResult[i].title;
    item.content = queryResult[i].content;
    item.category = category;
    item.url = queryResult[i].url;
    var insertTime = (new Date(queryResult[i].insert_time)).getTime();
    item.publishTime = moment.unix(insertTime/1000).utc().format("YYYY-MM-DD HH:mm");
    item.source = queryResult[i].source;
    item.author = queryResult[i].author;
    item.imageUrl = queryResult[i].imageUrl;
    results.data.push(item);
  }
  results.pageIndex = pageIndex;
  results.pageSize = pageSize;
  log.info("respose: " + results.data.length + " records");
  return results;
}

function constructSql(currency, category, language, pageIndex, pageSize) {
    var sqlStr = "";
    switch(currency) {
      case "ALL_CURRENCY":
          sqlStr = 'SELECT * FROM jinse_news limit ' + pageIndex + ',' + pageSize;
          break;
      default:
          sqlStr = 'SELECT * FROM jinse_news where title like "%' + currency + '%" limit ' + pageIndex + ',' + pageSize;
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
    }
  }
});

server.http().listen(5555, function() {
  console.log('News center sever is istening on: 5555:)');
});
