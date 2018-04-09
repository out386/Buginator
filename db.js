const pg = require('pg');
const url = require('url')
const params = url.parse(process.env.DATABASE_URL);
const auth = params.auth.split(':');
const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true
};

const pool = new pg.Pool(config);
module.exports.query = function (text, values, callback) {
  return pool.query(text, values, callback);
};
