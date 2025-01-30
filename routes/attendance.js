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

        const query = 'select COURSE_ATND_ID, COURSE_ID, DATE_TIME, PEOPLE_ID, INSTRUCTOR, MINUTES from CTA_ATTENDANCE order by DATE_TIME desc;';
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
    

    // res.send('Hello Corrective!');
    } catch (err) {
        console.log('Error connecting to Db');
        return;
    }

});

// Get the next ID for a new attendance record
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

        const query = 'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "CTA_ATTENDANCE"';
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
        console.log('Error connecting to Db 83');
        return;
    }
});

// ==================================================
// Create a record
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
        // console.log('Connected to DB');
             
        const query = `insert into CTA_ATTENDANCE (COURSE_ATND_ID
            , COURSE_ID
            , DATE_TIME
            , PEOPLE_ID
            , INSTRUCTOR
            , MINUTES
            , CREATE_BY
            , CREATED_DATE) 
        values 
        (?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            req.body.COURSE_ATND_ID,
            req.body.COURSE_ID,
            req.body.DATE_TIME,
            req.body.PEOPLE_ID,
            req.body.INSTRUCTOR,
            req.body.MINUTES,
            req.body.CREATE_BY,
            req.body.CREATED_DATE
        ];

        connection.query(query, values, (err, rows, fields) => {
            if (err) {
            console.log('Failed to query for attendance insert: ' + err);
            res.sendStatus(500);
            return;
            }
            res.json(rows);
        });
        

        const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.COURSE_ATND_ID}' WHERE TABLE_NAME = 'CTA_ATTENDANCE'`;
        connection.query(updateQuery, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for attendance system id update: ' + err);
                res.sendStatus(500);
                return;
            }
        });

        connection.end();
        });

    } catch (err) {
        console.log('Error connecting to Db (changes 144)');
        return;
    }

});

// ==================================================
// Get a single record
module.exports = router;