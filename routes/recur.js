// import { getUserValue, get } from './utils.mjs';
require('dotenv').config();

const express = require('express');
const router = express.Router();
const mysql = require('mysql');

router.post('/', async (req, res) => {
    // prefix the id with 0s to make it 7 digits
    const inputId = req.body.INPUT_ID.toString().padStart(7, '0');
    const sql = `INSERT INTO PPL_INPT_RCUR (RECUR_ID, INPUT_ID, ASSIGNED_TO, FREQUENCY, SUBJECT, STATUS) VALUES (?, ?, ?, ?, ?, ?)`;
    const inserts = [req.body['RECUR_ID'], inputId, req.body['ASSIGNED_TO'], req.body['FREQUENCY'], req.body['SUBJECT'], req.body['STATUS']];  
    const query = mysql.format(sql, inserts);
    // console.log(query);
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
        // console.log('Connected to DB 26');
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for input: ' + err);
                res.sendStatus(500);
                return;
            }
            res.end();
        }
        );

        const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.RECUR_ID}' WHERE TABLE_NAME = 'PPL_INPT_RCUR'`;
        connection.query(updateQuery, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for corrective id update: ' + err);
                res.sendStatus(500);
                return;
            }
        });

        connection.end();
        });
    } catch (err) {
        console.log('Error connecting to Db 58');
        return;
    }
}
);



// Get the next ID for a new recurrence
router.get('/nextId', (req, res) => {
    // res.json('0000005');
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

        const query = 'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "PPL_INPT_RCUR"';
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for attendance: ' + err);
                res.sendStatus(500);
                return;
            }
            const nextId = parseInt(rows[0].CURRENT_ID) + 1;
            let dbNextId = nextId.toString().padStart(7, '0');

            res.json(dbNextId);
        });    

        connection.end();
        });
    } catch (err) {
        console.log('Error connecting to Db 58');
        return;
    }
});

// Get the records for the recurrence table
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

        const query = 'SELECT * FROM PPL_INPT_RCUR where STATUS = "A" order by SUBJECT ASC';
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for attendance: ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });    

        connection.end();
        });
    } catch (err) {
        console.log('Error connecting to Db 128');
        return;
    }
});

module.exports = router;