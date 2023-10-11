require('dotenv').config();
const mysql = require('mysql')

const db = mysql.createConnection({
// host: "localhost",
// host: "sql11.freesqldatabase.com",
host: "sql11.freesqldatabase.com",
// user: "root",
// user: "sql11649784",
user: "sql11652518",
// password: "",
// password: "3KHbZMaqBG",
password: "MZwfUTYAvK",
database: process.env.URL_DATABASE
})

module.exports = db;
