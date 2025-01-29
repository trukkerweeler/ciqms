require('dotenv').config();

const express = require('express');
const router = express.Router();
const mysql = require('mysql');


// ==================================================
// Get all records
router.get('/', (req, res) => {
    try {
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            port: 3306,
            database: 'quality'
        });
        connection.connect(function(err) {
            if (err) {
                console.error('Error connecting: ' + err.stack);
                return;
            }
        // console.log('Connected to DB');

        const query = 'select SUPPLIER_ID, NAME, CITY, STATE, STATUS, CREATE_DATE from SUPPLIER order by SUPPLIER_ID';
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for corrective actions: ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });

        connection.end();
        });
    
    } catch (err) {
        console.log('Error connecting to Db');
        return;
    }

});

// ==================================================
// post new doc
router.post('/', (req, res) => {
    try {
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            port: 3306,
            database: 'quality'
        });
        connection.connect(function(err) {
            if (err) {
                console.error('Error connecting: ' + err.stack);
                return;
            }
        
        const query = `insert into SUPPLIER (SUPPLIER_ID, NAME, CITY, STATE, ZIP, STATUS, CREATE_BY, CREATE_DATE) 
            values (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        connection.query(query, [
            req.body.SUPPLIER_ID,
            req.body.NAME,
            req.body.CITY,
            req.body.STATE,
            req.body.ZIP,
            req.body.STATUS,
            req.body.CREATE_BY,
            req.body.CREATE_DATE
        ], (err, rows, fields) => {

            if (err) {
            console.log('Failed to query for supplier insert: ' + err);
            res.sendStatus(500);
            return;
            }
            res.json(rows);
        });

        const query2 = 'insert into SUPPLIER_SCOPE (SUPPLIER_ID, SCOPE) values (?, ?)';
        connection.query(query2, [req.body.SUPPLIER_ID, req.body.SCOPE], (err, rows, fields) => {

            if (err) {
                console.log('Failed to query for supplier scope insert: ' + err);
                res.sendStatus(500)
                return;
            }
        });
        if (req.body.FIRST_NAME != '') {
            const query3 = 'insert into SUPPLIER_CONTACT (SUPPLIER_ID, SUPP_CONT_NO, LAST_NAME, FIRST_NAME, WORK_EMAIL_ADDRESS, CREATE_BY, CREATE_DATE) values (?, ?, ?, ?, ?, ?, ?)';
            connection.query(query3, [req.body.SUPPLIER_ID, req.body.SUPP_CONT_NO, req.body.LAST_NAME, req.body.FIRST_NAME, req.body.WORK_EMAIL_ADDRESS, req.body.CREATE_BY, req.body.CREATE_DATE], (err, rows, fields) => {

                if (err) {
                    console.log('Failed to query for supplier contact insert: ' + err);
                    res.sendStatus(500)
                    return;
                }
            });
        }

        connection.end();
        });

    } catch (err) {
        console.log('Error connecting to Db');
        return;
    }

});

// post new qms record
router.post('/qms', (req, res) => {
    try {
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            port: 3306,
            database: 'quality'
        });
        connection.connect(function(err) {
            if (err) {
                console.error('Error connecting: ' + err.stack);
                return;
            }
        
            const query = `insert into SUPPLIER_QMS (SUPPLIER_ID, QMS, CERTIFICATE, EXPIRY_DATE) 
                values (?, ?, ?, ?)`;
            
            connection.query(query, [
                req.body.SUPPLIER_ID,
                req.body.QMS,
                req.body.CERTIFICATE,
                req.body.EXPIRY_DATE
            ], (err, rows, fields) => {

                if (err) {
                console.log('Failed to query for supplier qms insert: ' + err);
                res.sendStatus(500);
                return;
                }
                res.json(rows);
            });

        connection.end();
        });

    } catch (err) {
        console.log('Error connecting to Db');
        return;
    }

});

module.exports = router;