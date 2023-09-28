const mysql = require('mysql')
const db = mysql.createConnection({
host: "localhost",
user: "root",
password: "",
database:"bd_recettes" 
})

module.exports = db;
