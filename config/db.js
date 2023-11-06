require('dotenv').config();
const mysql = require('mysql')

const db = mysql.createConnection({
// host: "localhost",
// host: "sql11.freesqldatabase.com",
// host: "sql11.freesqldatabase.com",
host: "sql11.freesqldatabase.com",
// user: "root",
// user: "sql11649784",
// user: "sql11652518",
user: "sql11659757",
// password: "",
// password: "3KHbZMaqBG",
// password: "MZwfUTYAvK",
password: "XD8StdZdWE",
database: process.env.URL_DATABASE
})

module.exports = db;
