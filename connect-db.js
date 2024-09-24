const mysql = require('mysql2')

const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password:'',
    database:'surety',
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to the database.');
});

module.exports = con;