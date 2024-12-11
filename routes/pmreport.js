// import { getUserValue } from './utils.mjs';
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
        // console.log('Connected to DB');

        const query = `select pi.INPUT_ID, pi.INPUT_DATE, pi.SUBJECT, pi.ASSIGNED_TO, rcr.FREQUENCY, pir.RESPONSE_TEXT from PEOPLE_INPUT pi 
left join PPL_INPT_RSPN pir on pi.INPUT_ID = pir.INPUT_ID 
left join PPL_INPT_RCUR rcr on pi.SUBJECT = rcr.SUBJECT
where pi.SUBJECT REGEXP 'PM(0|1|2)[0-9]{1}' and INPUT_DATE <= current_date() and rcr.STATUS = 'A' and pi.ASSIGNED_TO != 'TKENT'
order by pi.SUBJECT`;
        
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for reports: ' + err);
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