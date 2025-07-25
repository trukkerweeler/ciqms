
const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
let test = false;

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

        const query = `select n.NCM_ID
        , n.NCM_DATE
        , n.NCM_TYPE
        , n.SUBJECT
        , n.ASSIGNED_TO
        , n.DUE_DATE        
        , n.PRODUCT_ID
        , n.PO_NUMBER
        , n.PROCESS_ID
        , ne.DESCRIPTION
        , n.CLOSED
        from NONCONFORMANCE n 
        left join NCM_DESCRIPTION ne on n.NCM_ID = ne.NCM_ID
        left join NCM_DISPOSITION ni on n.NCM_ID = ni.NCM_ID
        left join NCM_VERIFICATION nv on n.NCM_ID = nv.NCM_ID
        order by n.CLOSED, n.NCM_ID desc`;

        // from NONCONFORMANCE n left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID order by pi.INPUT_ID desc`;
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

        const query = 'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "NONCONFORMANCE"';
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for nonconformance: ' + err);
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
        console.log('Error connecting to Db 100');
        return;
    }
});

// ==================================================
// Send email using nodemailer
router.post("/email", async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: req.body.ASSIGNED_TO_EMAIL,
            subject: `Nonconformance Notification: ${req.body.NCM_ID} - ${req.body.PRODUCT_ID}`,
            text: `The following nonconformance has been issued. Please review and take timely action. If you have any questions, please contact the quality manager.\n\n Description:\n${req.body.DESCRIPTION} \n\n`,
        };

        const info = await transporter.sendMail(mailOptions);
        // console.log("Email sent:", info.response);
        res.status(200).send("Email sent successfully");
    } catch (error) {
        console.log("Error sending email:", error);
        res.status(500).send(error.toString());
    }
});

// ==================================================
// update INPUTS_NOTIFY table
router.post("/ncm_notify", (req, res) => {
    // console.log(req.body);
    try {
      const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        port: 3306,
        database: "quality",
      });
      connection.connect(function (err) {
        if (err) {
          console.error("Error connecting: " + err.stack);
          return;
        }
        // console.log('Connected to DB');
      const query = `INSERT INTO NCM_NOTIFY (NCM_ID, ACTION, NOTIFIED_DATE, ASSIGNED_TO ) VALUES (?, ?, NOW(), ?)`;
      const values = [
        req.body.NCM_ID,
        req.body.ACTION,
        req.body.ASSIGNED_TO,
      ];
        // console.log(query);
        // console.log(values);
        connection.query(query, values, (err) => {
          if (err) {
            console.log("Failed to query for ncm notify: " + err);
            res.sendStatus(500);
            return;
          }
          res.sendStatus(200);
        });
        connection.end();
      });
    } catch (err) {
      console.log("Error connecting to Db 140");
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
             
        const query = `insert into NONCONFORMANCE (NCM_ID
            , NCM_DATE
            , PEOPLE_ID
            , CUSTOMER_ID
            , SUPPLIER_ID
            , ASSIGNED_TO
            , DUE_DATE
            , NCM_TYPE
            , SUBJECT
            , CAUSE
            , PRODUCT_ID
            , PO_NUMBER
            , LOT_SIZE
            , LOT_NUMBER
            , USER_DEFINED_1
            , CLOSED
            , CREATE_DATE
            , CREATE_BY
            ) values (
                '${req.body.NCM_ID}'
                , '${req.body.NCM_DATE}'
                , '${req.body.PEOPLE_ID}'
                , '${req.body.CUSTOMER_ID}'
                , '${req.body.SUPPLIER_ID}'
                , '${req.body.ASSIGNED_TO}'
                , '${req.body.DUE_DATE}'
                , '${req.body.NCM_TYPE}'
                , '${req.body.SUBJECT}'
                , '${req.body.CAUSE}'
                , '${req.body.PRODUCT_ID}'
                , '${req.body.PO_NUMBER}'
                , '${req.body.LOT_SIZE}'
                , '${req.body.LOT_NUMBER}'
                , '${req.body.USER_DEFINED_1}'
                , '${req.body.CLOSED}'
                , '${req.body.CREATE_DATE}'
                , '${req.body.CREATE_BY}'
            )`;
        
        // console.log(query);

        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for PEOPLE_INPUT insert: ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });

        
        // escape the apostrophe
        const ncmDesc = req.body.DESCRIPTION.replace(/'/g, "\\'");
        // console.log(".post 167: " + ncmDesc);
        // escape the backslash
        const nid = req.body.NCM_ID;
        // const ncmDesc = req.body.DESCRIPTION.replace(/\\/g, "\\\\"); 
        const insertQuery = `insert into NCM_DESCRIPTION values ('${nid}', '${ncmDesc}')`;
        connection.query(insertQuery, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for NONCONFORMANCE insert: ' + err);
                res.sendStatus(500);
                return;
            }
        });

        const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.NCM_ID}' WHERE TABLE_NAME = 'NONCONFORMANCE'`;
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
        console.log('Error connecting to Db 205');
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
        n.NCM_ID
        , n.PEOPLE_ID
        , NCM_DATE
        , n.DUE_DATE
        , n.ASSIGNED_TO
        , n.CUSTOMER_ID
        , n.SUPPLIER_ID
        , NCM_TYPE
        , n.SUBJECT
        , n.CLOSED
        , n.CLOSED_DATE
        , n.PRODUCT_ID
        , n.PO_NUMBER
        , n.LOT_SIZE
        , n.LOT_NUMBER
        , n.USER_DEFINED_1
        , ne.DESCRIPTION
        , ni.DISPOSITION
        , nv.VERIFICATION
        , nn.NCM_NOTE
        FROM quality.NONCONFORMANCE n 
        left join NCM_DESCRIPTION ne on n.NCM_ID = ne.NCM_ID
        left join NCM_DISPOSITION ni on n.NCM_ID = ni.NCM_ID
        left join NCM_VERIFICATION nv on n.NCM_ID = nv.NCM_ID 
        left join NCM_NOTES nn on n.NCM_ID = nn.NCM_ID 
        where n.NCM_ID = '${req.params.id}'`;

        // console.log(query);

        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for nonconformance: ' + err);
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

router.put('/:id', (req, res) => {
    // console.log("Params: " + req.params.id);
    // console.log(req.body);
    test = false;
    let mytable = '';
    let appended = '';
    const myfield = Object.keys (req.body) [2]
    if (test) {
        console.log("279 - My field: " + myfield);
    }
    switch (myfield) {
        case 'DESCRIPTION':
            mytable = 'NCM_DESCRIPTION';
            appended = req.body.DESCRIPTION.replace(/'/g, "/''");
            break;
        case 'DISPOSITION':
            mytable = 'NCM_DISPOSITION';
            appended = req.body.DISPOSITION.replace(/'/g, "/''");
            break;
        case 'VERIFICATION':
            mytable = 'NCM_VERIFICATION';
            appended = req.body.VERIFICATION.replace(/'/g, "/''");
            break;
        case 'NCM_NOTE':
            mytable = 'NCM_NOTES';
            appended = req.body.NCM_NOTE.replace(/'/g, "/''");
            break;
        default:
            console.log('No match');
    }
    // Replace the br with a newline
    appended = appended.replace(/<br>/g, "\n");
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
        const query = `REPLACE INTO ${mytable} SET 
        NCM_ID = '${req.params.id}',
        ${myfield} = '${appended}'`;
        if (test) {
            console.log(query);
        }
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for nonconformance : ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });
    
        connection.end();
        });
    } catch (err) {
        console.log('Error connecting to Db 318');
        return;
    }

});

// ==================================================
// Update details
router.put('/details/:id', (req, res) => {
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
        const query = `UPDATE NONCONFORMANCE SET 
        NCM_DATE = '${req.body.NCM_DATE}',
        DUE_DATE = '${req.body.DUE_DATE}',
        PEOPLE_ID = '${req.body.PEOPLE_ID}',
        CUSTOMER_ID = '${req.body.CUSTOMER_ID}',
        SUPPLIER_ID = '${req.body.SUPPLIER_ID}',
        ASSIGNED_TO = '${req.body.ASSIGNED_TO}',
        NCM_TYPE = '${req.body.NCM_TYPE}',
        SUBJECT = '${req.body.SUBJECT}',
        PRODUCT_ID = '${req.body.PRODUCT_ID}',
        LOT_SIZE = '${req.body.LOT_SIZE}',
        LOT_NUMBER = '${req.body.LOT_NUMBER}',
        USER_DEFINED_1 = '${req.body.USER_DEFINED_1}',
        MODIFIED_DATE = '${req.body.MODIFIED_DATE}',
        MODIFIED_BY = '${req.body.MODIFIED_BY}'
        WHERE NCM_ID = '${req.params.id}'`;
        // console.log(query);

        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for nonconformance 346 : ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });

        connection.end();
        });
    } catch (err) {
        console.log('Error connecting to Db 376');
        return;
    }

});

// CLOSE THE NCM<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
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
        const query = `UPDATE NONCONFORMANCE SET CLOSED = 'Y', CLOSED_DATE = '${req.body.CLOSED_DATE}' WHERE NCM_ID = '${req.params.id}'`;
        // console.log(query);

        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for nonconformance 410 : ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });
    
        connection.end();
        });
    } catch (err) {
        console.log('Error connecting to Db 420');
        return;
    }

});

// ==================================================
// Get previous records
router.get('/previous/:id', (req, res) => {
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

        const query = `with subjects as (select * from PEOPLE_INPUT where SUBJECT = (select SUBJECT from PEOPLE_INPUT where INPUT_ID = '${req.params.id}')) select * from PPL_INPT_RSPN pir join subjects on pir.INPUT_ID = subjects.INPUT_ID order by pir.INPUT_ID desc limit 5`;

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
        console.log('Error connecting to Db 461');
        return;
    }
});


module.exports = router;