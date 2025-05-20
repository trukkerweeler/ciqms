
const express = require('express');
const router = express.Router();
const mysql = require('mysql');

// ==================================================
// increment the ID
router.put("/incrementId", (req, res) => {
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

      const query = `UPDATE SYSTEM_IDS SET CURRENT_ID = LPAD(CAST(CAST(CURRENT_ID AS UNSIGNED) + 1 AS CHAR), 7, '0') WHERE TABLE_NAME = 'NINETYONETWENTY'`;
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for system id update: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 37");
    return;
  }
});

// ==================================================
router.post('/:iid', (req, res) => {
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

        let key = Object.keys(req.body)[0];
        // console.log('key: ' + key['CUSTOMER_ID']);
        // let cid = req.body[key].CUSTOMER_ID;
        // let unit = req.body[key].UNIT;
             
        const query = `insert into NINETYONETWENTY (COLLECT_ID
            , INPUT_ID
            , CUSTOMER_ID
            , UNIT
            , VALUE
            , SAMPLE_DATE
            , PEOPLE_ID
            ) values ('${req.body[key].COLLECT_ID}'
                , '${req.params.iid}'
                , '${req.body[key].CUSTOMER_ID}'
                , '${req.body[key].UNIT}'
                , '${req.body[key].VALUE}'
                , '${req.body[key].SAMPLE_DATE}'
                , '${req.body[key].INPUT_USER}'
            )`;

            // console.log(query);

        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for NINETYONETWENTY insert: ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });

        const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body[key].COLLECT_ID}' WHERE TABLE_NAME = 'NINETYONETWENTY'`;

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
        console.log('Error connecting to Db (changes 65)');
        return;
    }

});


// Get the next ID for a new record
router.get('/nextCSRId', (req, res) => {
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

        const query = 'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "NINETYONETWENTY"';
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for SYSTEM_IDS NINETYONETWENTY: ' + err);
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
        console.log('Error connecting to Db 111');
        return;
    }
});


module.exports = router;