const pg = require('pg');
var config = {
  host: process.env.DATABASE_URL
};

const pool = new pg.Pool(config);
module.exports.query = function (text, values, callback) {
  return pool.query(text, values, callback);
};
