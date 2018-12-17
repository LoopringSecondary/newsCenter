var jayson         = require('jayson');
var mysql          = require('mysql');
var DataTypes      = require('./gen-nodejs/data_types'),
    ErrorCode      = DataTypes.ErrorCode,
    NewsItem       = DataTypes.NewsItem,
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

var log4js = require('log4js');
log4js.configure('./config/log4js.json');

var log = log4js.getLogger("newscenter");

var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : 'root',
  password        : '123456',
  database        : 'newscenter'
});

function isPositiveInt(input) { 
  var re = /^[0-9]+.?[0-9]*/;
  if (!re.test(input) || (input <= 0)) { 
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
    item.title = queryResult[i].title;
    item.content = queryResult[i].content;
    item.category = queryResult[i].category;
    item.url = queryResult[i].url;
    item.publishTime = queryResult[i].publish_time_str;
    item.source = queryResult[i].source;
    item.author = queryResult[i].author;
    item.imageUrl = queryResult[i].imageUrl;
    results.data.push(item);
  }
  results.pageIndex = pageIndex;
  results.pageSize = pageSize;
  //console.log(queryResult);
  return results;
}

// create a server
var server = jayson.server({
  query: function(args, callback) {
    var category = args.category;
    var language = args.language;
    var pageIndex = args.pageIndex;
    var pageSize = args.pageSize;
    log.info(args);
    if(!isPositiveInt(pageIndex) && !isPositiveInt(pageSize)) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      callback(error, null);
    } else {
      var sql = 'SELECT * FROM jinse_news where title like "%' + category + '%" limit ' + pageIndex + ',' + pageSize;
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

server.http().listen(3000, function() {
  console.log('News center sever is istening on *:3000:)');
});
