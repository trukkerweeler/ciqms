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

        const query = 'select DOCUMENT_ID, NAME, TYPE, STATUS, REVISION_LEVEL, ISSUE_DATE, REFERENCE, CREATE_BY, CREATE_DATE from DOCUMENTS order by REFERENCE asc, TYPE desc, DOCUMENT_ID asc';
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for document selection: ' + err);
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
// Get a single record
router.get('/:id', (req, res) => {
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

        const query = 'select d.*, da.CTRL_DOC, da.DIST_DOC from DOCUMENTS d left join DOCS_AVAIL da on d.DOCUMENT_ID = da.DOCUMENT_ID where d.DOCUMENT_ID = ?';
        connection.query(query, [req.params.id], (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for document: ' + err);
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
        // console.log('Connected to DB');

        const query = 'insert into DOCUMENTS (DOCUMENT_ID, NAME, TYPE, SUBJECT, REFERENCE, STATUS, REVISION_LEVEL, ISSUE_DATE, CHECKED_OUT, AUDIT_RESPONSIBLE, CREATE_BY, CREATE_DATE) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        let document_id = req.body.document_id.toUpperCase();
        // console.log(mysql.format(query, [document_id, req.body.document_name, req.body.DOCUMENT_TYPE, req.body.document_name, req.body.reference, req.body.status, req.body.doc_rev, req.body.issue_date, req.body.CHECKED_OUT, req.body.AUDIT_RESPONSIBLE, req.body.CREATE_BY, req.body.CREATE_DATE]));
        connection.query(query, [document_id, req.body.document_name, req.body.DOCUMENT_TYPE, req.body.document_name, req.body.reference, req.body.status, req.body.doc_rev, req.body.issue_date, req.body.CHECKED_OUT, req.body.AUDIT_RESPONSIBLE, req.body.CREATE_BY, req.body.CREATE_DATE], (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for new document: ' + err);
                res.sendStatus(500)
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

// update doc
router.put('/:id', (req, res) => {
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
        
        const query = 'update DOCUMENTS set NAME = ?, TYPE = ?, SUBJECT = ?, STATUS = ?, REVISION_LEVEL = ?, ISSUE_DATE = ?, MODIFIED_BY = ?, MODIFIED_DATE = ? where DOCUMENT_ID = ?';
        connection.query(query, [req.body.NAME, req.body.TYPE.toUpperCase(), req.body.SUBJECT, req.body.STATUS.toUpperCase(), req.body.REVISION_LEVEL, req.body.ISSUE_DATE, req.body.MODIFIED_BY, req.body.MODIFIED_DATE, req.params.id], (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for document update: ' + err);
                res.sendStatus(500)
                return;
            }
            // res.json(rows);
        });

        const query2 = 'update DOCS_AVAIL set CTRL_DOC = ?, DIST_DOC = ? where DOCUMENT_ID = ?';
        connection.query(query2, [req.body.CTRL_DOC, req.body.DIST_DOC, req.params.id], (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for document avail update: ' + err);
                res.sendStatus(500)
                return;
            }
            // res.json(rows);
        });

        // send completion status
        res.sendStatus(200);

        connection.end();
        });

    } catch (err) {
        console.log('Error connecting to Db');
        return;
    }

});

module.exports = router;