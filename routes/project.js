require('dotenv').config();
// sequelize...
const express = require('express');
const router = express.Router();
const mysql = require('mysql');



// Get all records
router.get('/', (req, res) => {
    // console.log(req.params.id);
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

        const query = `select * from PROJECT`;

        // console.log(query);

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
        console.log('Error connecting to Db 83');
        return;
    }

});



// ==================================================
// Get a single record
router.get('/:id', (req, res) => {
    // console.log(req.params.id);
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
        const query = `SELECT 
        pi.INPUT_ID
        , pi.PEOPLE_ID
        , pi.PROJECT_ID
        , INPUT_DATE
        , pi.DUE_DATE
        , pi.ASSIGNED_TO
        , INPUT_TYPE
        , SUBJECT
        , pit.INPUT_TEXT
        , pi.CLOSED
        , pi.CLOSED_DATE
        , pir.RESPONSE_TEXT
        , pif.FOLLOWUP_TEXT 
        , p.NAME
        , p.LEADER
        , pd.DESCRIPTION
        FROM quality.PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID
        left join PPL_INPT_FLUP pif on pi.INPUT_ID = pif.INPUT_ID
        left join PPL_INPT_RSPN pir on pi.INPUT_ID = pir.INPUT_ID 
        left join PROJECT p on pi.PROJECT_ID = p.PROJECT_ID
        left join PROJ_DESC pd on pi.PROJECT_ID = pd.PROJECT_ID
        where p.PROJECT_ID = ?
        order by pi.CLOSED, pi.INPUT_ID desc`;

        connection.query(query, [req.params.id], (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for corrective actions: ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });
        

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
        console.log('Error connecting to Db 83');
        return;
    }

});

// ==================================================
router.post('/', (req, res) => {
    // console.log(req.body);
    const data = req.body;
    console.log(data);
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

    const query = `insert into PROJECT (PROJECT_ID, NAME, LEADER, PROJECT_TYPE, CREATE_DATE, CREATE_BY, CLOSED) 
    values (?, ?, ?, ?, ?, ?, ?)`;
    const values = [data.PROJECT_ID, data.NAME, data.LEADER, data.PROJECT_TYPE, data.CREATE_DATE, data.CREATE_BY, data.CLOSED];
    console.log(query);

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
});

module.exports = router;