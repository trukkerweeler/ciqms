const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// ==================================================
// Get all records
router.get("/", (req, res) => {
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

      const query =
        "select SUPPLIER_ID, NAME, WEBSITE, CITY, STATE, STATUS, CREATE_DATE from SUPPLIER order by SUPPLIER_ID";
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective actions: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// ==================================================
// Get single supplier by ID
router.get("/:id", (req, res) => {
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

      const query =
        "select SUPPLIER_ID, NAME, WEBSITE, CITY, STATE, ZIP, STATUS, CREATE_DATE, CREATE_BY, MODIFIED_DATE, MODIFIED_BY from SUPPLIER where SUPPLIER_ID = ?";
      connection.query(query, [req.params.id], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for supplier: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }
        if (rows.length === 0) {
          res.status(404).json({ message: "Supplier not found" });
          connection.end();
          return;
        }

        // Fetch scope from SUPPLIER_SCOPE table
        const scopeQuery =
          "select SCOPE from SUPPLIER_SCOPE where SUPPLIER_ID = ?";
        connection.query(
          scopeQuery,
          [req.params.id],
          (err, scopeRows, fields) => {
            const supplier = rows[0];
            supplier.SCOPE =
              scopeRows && scopeRows.length > 0 ? scopeRows[0].SCOPE : "";
            res.json(supplier);
            connection.end();
          },
        );
      });
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// ==================================================
// Update supplier
router.put("/:id", (req, res) => {
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

      const query = `update SUPPLIER set NAME = ?, WEBSITE = ?, CITY = ?, STATE = ?, ZIP = ?, STATUS = ?, MODIFIED_BY = ?, MODIFIED_DATE = ? where SUPPLIER_ID = ?`;

      connection.query(
        query,
        [
          req.body.NAME,
          req.body.WEBSITE,
          req.body.CITY,
          req.body.STATE,
          req.body.ZIP,
          req.body.STATUS,
          req.body.MODIFIED_BY,
          req.body.MODIFIED_DATE,
          req.params.id,
        ],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to update supplier: " + err);
            connection.end();
            res.sendStatus(500);
            return;
          }

          // Update SCOPE in SUPPLIER_SCOPE table
          const scopeQuery = `update SUPPLIER_SCOPE set SCOPE = ? where SUPPLIER_ID = ?`;
          connection.query(
            scopeQuery,
            [req.body.SCOPE, req.params.id],
            (err, scopeRows) => {
              if (err) {
                // If SCOPE record doesn't exist, try to insert it
                const insertScopeQuery = `insert into SUPPLIER_SCOPE (SUPPLIER_ID, SCOPE) values (?, ?)`;
                connection.query(
                  insertScopeQuery,
                  [req.params.id, req.body.SCOPE],
                  (err, insertRows) => {
                    connection.end();
                    if (err) {
                      console.log("Failed to insert scope: " + err);
                      res.sendStatus(500);
                    } else {
                      res.status(200).json({
                        message: "Supplier updated successfully",
                        data: rows,
                      });
                    }
                  },
                );
              } else {
                connection.end();
                res.status(200).json({
                  message: "Supplier updated successfully",
                  data: rows,
                });
              }
            },
          );
        },
      );
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// ==================================================
// post new supplier
router.post("/", (req, res) => {
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

      const query = `insert into SUPPLIER (SUPPLIER_ID, NAME, WEBSITE, CITY, STATE, ZIP, STATUS, CREATE_BY, CREATE_DATE) 
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      // console.log('Query: ' + query);
      // console.log('Body: ' + JSON.stringify(req.body));

      connection.query(
        query,
        [
          req.body.SUPPLIER_ID,
          req.body.NAME,
          req.body.WEBSITE,
          req.body.CITY,
          req.body.STATE,
          req.body.ZIP,
          req.body.STATUS,
          req.body.CREATE_BY,
          req.body.CREATE_DATE,
        ],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for supplier insert: " + err);
            res.sendStatus(500);
            return;
          }
          res
            .status(201)
            .json({ message: "Supplier added successfully", data: rows });
        },
      );

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// post new qms record
router.post("/qms", (req, res) => {
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

      const query = `insert into SUPPLIER_QMS (SUPPLIER_ID, QMS, CERTIFICATE, EXPIRY_DATE) 
                values (?, ?, ?, ?)`;

      connection.query(
        query,
        [
          req.body.SUPPLIER_ID,
          req.body.QMS,
          req.body.CERTIFICATE,
          req.body.EXPIRY_DATE,
        ],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for supplier qms insert: " + err);
            res.sendStatus(500);
            return;
          }
          res
            .status(201)
            .json({ message: "Supplier QMS added successfully", data: rows });
        },
      );

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// post new scope record
router.post("/scope", (req, res) => {
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

      const query = `insert into SUPPLIER_SCOPE (SUPPLIER_ID, SCOPE) 
            values (?, ?)`;

      connection.query(
        query,
        [req.body.SUPPLIER_ID, req.body.SCOPE],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for supplier scope insert: " + err);
            res.sendStatus(500);
            return;
          }
          res
            .status(201)
            .json({ message: "Supplier scope added successfully", data: rows });
        },
      );

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// ==================================================
// post new supplier contact
router.post("/contact", (req, res) => {
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

      const query = `insert into SUPPLIER_CONTACT (SUPPLIER_ID, SUPP_CONT_NO, LAST_NAME, FIRST_NAME, WORK_EMAIL_ADDRESS, CREATE_BY, CREATE_DATE) 
            values (?, ?, ?, ?, ?, ?, ?)`;

      connection.query(
        query,
        [
          req.body.SUPPLIER_ID,
          req.body.SUPP_CONT_NO,
          req.body.LAST_NAME,
          req.body.FIRST_NAME,
          req.body.WORK_EMAIL_ADDRESS,
          req.body.CREATE_BY,
          req.body.CREATE_DATE,
        ],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for supplier contact insert: " + err);
            res.sendStatus(500);
            return;
          }
          res.status(201).json({
            message: "Supplier contact added successfully",
            data: rows,
          });
        },
      );

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

module.exports = router;
