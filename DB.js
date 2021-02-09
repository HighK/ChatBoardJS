const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'xehub',
    password: 'xef!@#123',
    database: 'dev_prj_sja'
});

export default connection;