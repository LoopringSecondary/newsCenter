var jayson =require('jayson');
var mysql = require('mysql');

var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : 'localhost',
  user            : '',
  password        : '',
  database        : 'newsCenter'
});
 
// create a server
var server = jayson.server({
  query: function(args, callback) {
    //var sql = 'SELECT * FROM websites' + ' limit ' + pageIndex + ',' + pageSize;
    // TODO: check and parse parameters
    console.log(args);
    var sql = 'SELECT * FROM news limit 1,1';
    console.log(sql);
    pool.getConnection(function(err, connection) {
      if (err) throw err; // not connected!
      // Use the connection
      connection.query(sql, function (error, results, fields) {
        // When done with the connection, release it.
        // TODO:construct a response
        callback(null, results);
        connection.release();
        // Handle error after the release.
        if (error) {
          console.log(error);
          throw error;
        }
        // Don't use the connection here, it has been returned to the pool.
      });
    });
  }
});

server.http().listen(3000, function() {;
  console.log('News center sever is istening on *:3000:)');
});
