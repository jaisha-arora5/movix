const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serves the frontend files

// Database Connection Configuration
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Default XAMPP/MySQL user
    password: '*Ja5is17ha#', // CHANGE THIS TO YOUR MYSQL PASSWORD
    database: 'movix_db', // Ensure this matches your specific database name
    multipleStatements: true // Required for calling stored procedures
});

// Check Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MOVIX Database successfully!');
        connection.release();
    }
});

// API ROUTE 1: Get All Users (Tests Basic SELECT)
app.get('/api/users', (req, res) => {
    const sql = "SELECT * FROM Users";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// API ROUTE 2: Add User (Tests Stored Procedure 'add_user')
app.post('/api/users', (req, res) => {
    const { username, email, password, subscription_id } = req.body;
    // Calling the stored procedure defined in your SQL
    const sql = `CALL add_user(?, ?, ?, ?)`; 
    
    db.query(sql, [username, email, password, subscription_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'User added successfully via Stored Procedure!' });
    });
});

// API ROUTE 3: Get Top Rated by Genre (Tests Stored Procedure 'top_rated_by_genre')
app.get('/api/content/top/:genre', (req, res) => {
    const genre = req.params.genre;
    const sql = `CALL top_rated_by_genre(?)`;

    db.query(sql, [genre], (err, result) => {
        if (err) return res.status(500).send(err);
        // Stored procedures return an array of arrays, so we take the first index
        res.send(result[0]); 
    });
});

// API ROUTE 4: Get Top Users (Tests VIEW 'top_users')
app.get('/api/analytics/top-users', (req, res) => {
    const sql = "SELECT * FROM top_users";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});