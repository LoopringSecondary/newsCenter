var jayson         = require('jayson');
var mysql          = require('mysql');
var DataTypes      = require('./gen-nodejs/data_types'),
    ErrorCode      = DataTypes.ErrorCode,
    NewsItem       = DataTypes.NewsItem,
    NewsCollection = DataTypes.NewsCollection;

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

function constructRespose(queryResult, pageIndex, pageSize) {
  var results = new NewsCollection();            
  results.data = [];
  var item = new NewsItem();
  for (var i = 0; i < queryResult.length; i++) {
    var item = new NewsItem();
    item.title = queryResult[i].title;
    item.content = queryResult[i].content;
    item.category = queryResult[i].category;
    item.newsTime = queryResult[i].insert_ime;
    results.data.push(item);
  }
  results.pageIndex = pageIndex;
  results.pageSize = pageSize;
  console.log(queryResult);
  console.log(queryResult.length);
  return results;
}

// create a server
var server = jayson.server({
  query: function(args, callback) {
    var category = args.category;
    var pageIndex = args.pageIndex;
    var pageSize = args.pageSize;
    console.log(args);
    if(!isPositiveInt(pageIndex) && !isPositiveInt(pageSize)) {
      var error = {code: ErrorCode.PARAMETER_ERROR, message: 'PARAMETER_ERROR'};
      callback(error, null);
    } else {
      var sql = 'SELECT * FROM news_tbl where category="' + category + '" limit ' + pageIndex + ',' + pageSize;
      console.log(sql);
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
              var results = constructRespose(queryResult, pageIndex, pageSize);
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
