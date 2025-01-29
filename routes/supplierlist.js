require('dotenv').config();
// sequelize...

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

        // const query = `select s.SUPPLIER_ID
        // , NAME
        // , CITY
        // , STATE
        // , STATUS
        // , sq.QMS
        // , sq.EXPIRY_DATE
        // , ss.SCOPE
        // from SUPPLIER s 
        // left join SUPPLIER_QMS sq on s.SUPPLIER_ID = sq.SUPPLIER_ID 
        // left join SUPPLIER_SCOPE ss on s.SUPPLIER_ID = ss.SUPPLIER_ID 
        // where STATUS = "A" order by s.SUPPLIER_ID`;

        const query = `SELECT *
        FROM (
        SELECT s.SUPPLIER_ID
                , NAME
                , CITY
                , STATE
                , STATUS
                , sq.QMS
                , sq.EXPIRY_DATE
                , ss.SCOPE
                , ROW_NUMBER() OVER (PARTITION BY SUPPLIER_ID, QMS ORDER BY EXPIRY_DATE DESC) AS rn
        FROM SUPPLIER s
        left join SUPPLIER_QMS sq on s.SUPPLIER_ID = sq.SUPPLIER_ID 
        left join SUPPLIER_SCOPE ss on s.SUPPLIER_ID = ss.SUPPLIER_ID 
        ) AS sub
        WHERE rn = 1 and EXPIRY_DATE is not null and STATUS = 'A'
        order by SUPPLIER_ID, EXPIRY_DATE desc`;

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

module.exports = router;