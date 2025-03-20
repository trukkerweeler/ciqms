
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

        const query = `select pi.INPUT_ID
        , pi.INPUT_DATE
        , pi.SUBJECT
        , pi.ASSIGNED_TO
        , pi.PROJECT_ID
        , pit.INPUT_TEXT
        , pi.DUE_DATE
        , pi.CLOSED
        , pi.CLOSED_DATE 
        from PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID inner join NINETYTHREEHUNERD nth on pi.INPUT_ID = nth.INPUT_ID order by pi.INPUT_ID desc`;
        // where USER_DEFINED_1 = 'MR'
        
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for inputs: ' + err);
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
// Get closed records
router.get('/closed', (req, res) => {
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

        const query = `select pi.INPUT_ID
        , pi.INPUT_DATE
        , pi.SUBJECT
        , pi.ASSIGNED_TO
        , pi.PROJECT_ID
        , pit.INPUT_TEXT
        , pi.DUE_DATE
        , pi.CLOSED
        , pi.CLOSED_DATE 
        from PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID where CLOSED = 'Y' order by pi.CLOSED_DATE desc`;
        // where USER_DEFINED_1 = 'MR'
        
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for inputs: ' + err);
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
            const query = `INSERT INTO PEOPLE_INPUT (
                INPUT_ID, INPUT_DATE, PEOPLE_ID, ASSIGNED_TO, DUE_DATE, INPUT_TYPE, SUBJECT, PROJECT_ID, CLOSED, CREATE_DATE, CREATE_BY
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const values = [
                req.body.INPUT_ID,
                req.body.INPUT_DATE,
                req.body.PEOPLE_ID,
                req.body.ASSIGNED_TO,
                req.body.DUE_DATE,
                req.body.INPUT_TYPE,
                req.body.SUBJECT,
                req.body.PROJECT_ID,
                req.body.CLOSED,
                req.body.CREATE_DATE,
                req.body.CREATE_BY
            ];

            connection.query(query, values, (err, rows, fields) => {
                if (err) {
                    console.log('Failed to query for PEOPLE_INPUT insert: ' + err);
                    res.sendStatus(500);
                    return;
                }
                res.json(rows);
            });
        

        const insertQuery = 'INSERT INTO PPL_INPT_TEXT (INPUT_ID, INPUT_TEXT) VALUES (?, ?)';
        connection.query(insertQuery, [req.body.INPUT_ID, req.body.INPUT_TEXT], (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for PPL_INPT_TEXT insert: ' + err);
                res.sendStatus(500);
                return;
            }
        });

        const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.INPUT_ID}' WHERE TABLE_NAME = 'PEOPLE_INPUT'`;
        connection.query(updateQuery, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for system id update: ' + err);
                res.sendStatus(500);
                return;
            }
        });

        connection.end();
        });

    } catch (err) {
        console.log('Error connecting to Db (changes 181)');
        return;
    }

});


// CLOSE THE INPUT<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
router.put('/close/:id', (req, res) => {
    // console.log("Params: " + req.params.id);
    // console.log(req.body);
    let mytable = '';
    let appended = '';
    const myfield = Object.keys (req.body) [1]
    
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
        const query = `UPDATE PEOPLE_INPUT SET CLOSED = 'Y', CLOSED_DATE = '${req.body.CLOSED_DATE}' WHERE INPUT_ID = '${req.params.id}'`;
        // console.log(query);

        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for input : ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });
    
        connection.end();
        });
    } catch (err) {
        console.log('Error connecting to Db 345');
        return;
    }

});


module.exports = router;