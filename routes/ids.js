const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

// Get the next ID for a new record
router.get('/', async (_, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            port: 3306,
            database: 'calibration'
        });

        const [rows] = await connection.execute(
            'SELECT CURRENT_ID FROM calibration.SYSTEM_IDS WHERE TABLE_NAME = "CALIBRATION"'
        );

        if (rows.length === 0) {
            console.log('No records found in SYSTEM_IDS for CALIBRATION');
            res.status(404).send('No records found');
            return;
        }

        const nextId = parseInt(rows[0].CURRENT_ID) + 1;
        const dbNextId = nextId.toString().padStart(7, '0');
        res.json(dbNextId);

        await connection.end();
    } catch (err) {
        console.log('Error connecting to calibrate:', err);
        res.sendStatus(500);
    }
});

// Update the next ID in the database
router.post('/', async (req, res) => {
    let { nextId } = req.body;

    if (nextId.toString().length < 7) {
        nextId = nextId.toString().padStart(7, '0');
    }

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            port: 3306,
            database: 'calibration'
        });

        const [result] = await connection.execute(
            'UPDATE calibration.SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = "CALIBRATION"',
            [nextId]
        );

        if (result.affectedRows === 0) {
            console.log('No rows updated in SYSTEM_IDS for CALIBRATION');
            res.status(404).send('No rows updated');
            return;
        }

        res.sendStatus(200);

        await connection.end();
    } catch (err) {
        console.log('Error connecting to calibrate:', err);
        res.sendStatus(500);
    }
});

module.exports = router;
