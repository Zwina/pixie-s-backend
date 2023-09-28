require('dotenv').config();
const mysql = require('mysql')

const db = mysql.createConnection({
// host: "localhost",
host: "sql11.freesqldatabase.com",
// user: "root",
user: "sql11649784",
// password: "",
password: "3KHbZMaqBG",
database: process.env.URL_DATABASE
})

module.exports = db;
