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

        const query = `select c.CORRECTIVE_ID
        , TITLE
        , USER_DEFINED_2
        , USER_DEFINED_1
        , c.REQUEST_BY
        , c.ASSIGNED_TO
        , c.CORRECTIVE_DATE
        , c.REFERENCE
        , ia.CORRECTION_DATE
        , ia.ACTION_BY 
        , c.CREATE_DATE
        , c.DUE_DATE
        , CLOSED
        , c.CLOSED_DATE
        from CORRECTIVE c 
        left join CORRECTIVE_TREND ct on c.CORRECTIVE_ID = ct.CORRECTIVE_ID 
        left join CORRECTION ia on c.CORRECTIVE_ID = ia.CORRECTIVE_ID 
        left join CORRECTIVE_CTRL cc on c.CORRECTIVE_ID = cc.CORRECTIVE_ID
        order by CLOSED, CORRECTIVE_ID desc`;
        
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

// Get the next ID for a new record
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

        const query = 'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "CORRECTIVE"';
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
        console.log('Connected to DB');

        let closedDate = null;
        console.log(req.body.CLOSED_DATE);
        // if ((typeof(req.body.CLOSED_DATE) === 'undefined') || (req.body.CLOSED_DATE === '0000-00-00')) {
        if (typeof(req.body.CLOSED_DATE) !== 'undefined') {
            closedDate = req.body.CLOSED_DATE;
        } else {
            closedDate = null;
        }
        // Change FIELDS to uppercase
        req.body.ASSIGNED_TO = req.body.ASSIGNED_TO.toUpperCase();
        req.body.REQUEST_BY = req.body.REQUEST_BY.toUpperCase();

             
        const query = `insert into CORRECTIVE (CORRECTIVE_ID
            , USER_DEFINED_1
            , REQUEST_BY
            , ASSIGNED_TO
            , CORRECTIVE_DATE
            , REFERENCE
            , CLOSED
            , TITLE
            , CREATE_DATE
            , CREATE_BY
            ) values (
                '${req.body.CORRECTIVE_ID}'
                , '${req.body.USER_DEFINED_1}'
                , '${req.body.REQUEST_BY}'
                , '${req.body.ASSIGNED_TO}'
                , '${req.body.CORRECTIVE_DATE}'
                , '${req.body.REFERENCE}'
                , '${req.body.CLOSED}'
                , '${req.body.TITLE}'
                , '${req.body.CREATE_DATE}'
                , '${req.body.CREATE_BY}'
            )`;
        
        // console.log(query);

        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for corrective insert: ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });

        // Escape the single quotes
        req.body.NC_TREND = req.body.NC_TREND.replace(/'/g, "\\'");

        const insertQuery = `insert into CORRECTIVE_TREND (CORRECTIVE_ID, NC_TREND) values ('${req.body.CORRECTIVE_ID}', '${req.body.NC_TREND}')`;
        connection.query(insertQuery, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for corrective trend insert: ' + err);
                res.sendStatus(500);
                return;
            }
        });

        const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.CORRECTIVE_ID}' WHERE TABLE_NAME = 'CORRECTIVE'`;
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
        console.log('Error connecting to Db (changes 196)');
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

        const query = `select c.CORRECTIVE_ID
        , TITLE
        , USER_DEFINED_2
        , USER_DEFINED_1
        , c.REQUEST_BY
        , c.ASSIGNED_TO
        , c.CORRECTIVE_DATE
        , c.REFERENCE
        , c.PROJECT_ID
        , c.CORR_ACTION_DATE
        , ia.CORRECTION_DATE
        , ia.ACTION_BY
        , cc.CREATE_DATE
        , DUE_DATE
        , CLOSED
        , c.CLOSED_DATE
        , ct.NC_TREND
        , ia.CORRECTION_TEXT
        , cc.CONTROL_TEXT
        , cc.CAUSE_TEXT
        from CORRECTIVE c
        left join CORRECTIVE_TREND ct on c.CORRECTIVE_ID = ct.CORRECTIVE_ID            
        left join CORRECTION ia on c.CORRECTIVE_ID = ia.CORRECTIVE_ID
        left join CORRECTIVE_CTRL cc on c.CORRECTIVE_ID = cc.CORRECTIVE_ID
        where c.CORRECTIVE_ID = '${req.params.id}'`;

        // console.log(query);

        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('250 Failed to query for corrective actions: ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });

        connection.end();
        });
    } catch (err) {
        console.log('Error connecting to Db 251');
        return;
    }
});


// PUTPUTPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTP
router.put('/:id', (req, res) => {
    // console.log("Params: " + req.params.id);
    // console.log(req.body);
    let mytable = '';
    let appended = '';
    let query = '';
    const myfield = Object.keys (req.body) [1]
    // console.log("My field: " + myfield);
    switch (myfield) {
        case 'CAUSE_TEXT':
            mytable = 'CORRECTIVE_CTRL';
            appended = req.body.CAUSE_TEXT
            appended = appended.replace(/<br>/g, "\n");
            query = `insert into CORRECTIVE_CTRL (CORRECTIVE_ID, CAUSE_TEXT) values ('${req.params.id}','${appended}') on duplicate key update CAUSE_TEXT = '${appended}';`;
            break;
        case 'CONTROL_TEXT':
            mytable = 'CORRECTIVE_CTRL';
            appended = req.body.CONTROL_TEXT
            appended = appended.replace(/<br>/g, "\n");
            query = `insert into CORRECTIVE_CTRL (CORRECTIVE_ID, CONTROL_TEXT, MODIFIED_DATE) values ('${req.params.id}','${appended}', NOW()) on duplicate key update CONTROL_TEXT = '${appended}';`;
            break;
        case 'CORRECTION_TEXT':
            mytable = 'CORRECTION';
            let correctiondate = req.body.CORRECTION_DATE;
            let actionby = req.body.ACTION_BY;
            appended = req.body.CORRECTION_TEXT.replace(/<br>/g, "\n");
            // appended = appended.replace(/<br>/g, "\n");
            query = `insert into CORRECTION (CORRECTIVE_ID, CORRECTION_DATE, ACTION_BY, CORRECTION_TEXT) values ('${req.params.id}', '${correctiondate}', '${actionby}','${appended}') on duplicate key update CORRECTION_TEXT = '${appended}', CORRECTION_DATE = '${correctiondate}', ACTION_BY = '${actionby}';`;
            // console.log(query);
            break;
        default:
            mytable = 'CORRECTIVE';
            // if PROJECT is undefined, set it to zero length string
            if (typeof(req.body.PROJECT_ID) === 'undefined') {
                req.body.PROJECT_ID = '';
            }
            query = `UPDATE CORRECTIVE SET ASSIGNED_TO = '${req.body.ASSIGNED_TO}', REQUEST_BY = '${req.body.REQUEST_BY}', REFERENCE = '${req.body.REFERENCE}', PROJECT_ID = '${req.body.PROJECT_ID}' WHERE CORRECTIVE_ID = '${req.params.id}'`;
            // console.log(query);
    }
    // Replace the br with a newline
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
        // console.log(req.body);

        // q1 = `insert ignore into ${mytable} (CORRECTIVE_ID, CREATE_DATE) values ('${req.params.id}, now()')`
            connection.query(query, (err, rows, fields) => {
                if (err) {
                    console.log('321 Failed to query for corrective actions: ' + err);
                    res.sendStatus(500);
                    return;
                }
                res.json(rows);
            });

            if (myfield === 'CONTROL_TEXT') {
                // update the CORR_ACTION_DATE
                const updateQuery = `UPDATE CORRECTIVE SET CORR_ACTION_DATE = NOW() WHERE CORRECTIVE_ID = '${req.params.id}'`;
                connection.query(updateQuery, (err, rows, fields) => {
                    if (err) {
                        console.log('Failed to query for corr_action_date update: ' + err);
                        res.sendStatus(500);
                        return;
                    }
                });
            }
        connection.end();
        }
        );
        } catch (err) {
            console.log('Error connecting to Db 315');
        }
            return;
        }

);

// ==================================================CLOSE
router.put('/:id/close', (req, res) => {
    // console.log("Params: " + req.params.id);
    console.log(req.body);
    let query = '';
    // closed date is locale time string
    let myNow = new Date().toLocaleString();
    let myDate = myNow.split('/').reverse().join('-');


    console.log({myDate});

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

            const query = `UPDATE CORRECTIVE SET 
            CLOSED = '${req.body.CLOSED}'
            , CLOSED_DATE = '${req.body.CLOSED_DATE}'
            , MODIFIED_BY = '${req.body.MODIFIED_BY}'
            , MODIFIED_DATE = now() 
            WHERE CORRECTIVE_ID = '${req.params.id}'`;
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
        }
        );
        } catch (err) {
            console.log('Error connecting to Db 315');
        }
            return;
        }

    // alert('Put not implemented yet');

);



module.exports = router;