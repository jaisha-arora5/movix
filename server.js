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

// --- ROUTES ---

// 1. Root Route (Fixes "Cannot GET /" errors)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 2. REGISTER
app.post('/api/register', (req, res) => {
    const { username, email, password, subscription_id } = req.body;
    if (!username || !email || !password || !subscription_id) {
        return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const sql = `CALL add_user(?, ?, ?, ?)`;
    db.query(sql, [username, email, password, subscription_id], (err, result) => {
        if (err) {
            console.error("Register Error:", err);
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'User already exists' });
            // Ignore database errors as per user request
            return res.status(500).json({ success: false, message: 'Registration failed' });
        }
        res.json({ success: true, message: 'User registered!' });
    });
});

// 3. LOGIN
app.post('/api/login', (req, res) => {
    console.log("Login Request Received:", req.body); // Debug Log
    const { email, password } = req.body;
    
    const sql = "SELECT * FROM Users WHERE email = ? AND password_hash = ?";
    db.query(sql, [email, password], (err, result) => {
        if (err) {
            console.error("DB Login Error:", err);
            // Ignore database errors as per user request
            return res.status(500).json({ success: false, message: 'Login failed' });
        }
        if (result.length > 0) {
            res.json({ success: true, user: result[0] });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// 4. USER DETAILS
app.get('/api/user/:id/details', (req, res) => {
    const userId = req.params.id;
    const sql = `SELECT username, email, created_at FROM Users WHERE user_id = ?`;
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Error fetching user details:", err);
            return res.status(500).json({ success: false, message: 'Failed to fetch user details' });
        }
        const info = result[0] || {};
        
        res.json({ 
            success: true, 
            info, 
            subscription: 'Standard', 
            avgWatchTime: 120 
        });
    });
});

// 5. HISTORY
app.get('/api/user/:id/history', (req, res) => {
    const sql = `
        SELECT w.watch_id, w.watched_on, w.watch_duration_minutes, c.title, c.genre 
        FROM Watch_History w
        JOIN Content c ON w.content_id = c.content_id
        WHERE w.user_id = ?
        ORDER BY w.watched_on DESC`;
    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error("Error fetching history:", err);
            return res.status(500).json({ success: false, message: 'Failed to fetch history', data: [] });
        }
        res.json({ success: true, data: result || [] });
// API ROUTE 1: Get All Users (Tests Basic SELECT)
app.get('/api/users', (req, res) => {
    const sql = "SELECT * FROM Users";
    db.query(sql, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// 6. CONTENT
app.get('/api/content', (req, res) => {
    db.query("SELECT * FROM Content", (err, result) => {
        if (err) {
            console.error("Error fetching content:", err);
            return res.status(500).json({ success: false, message: 'Failed to fetch content', data: [] });
        }
        res.json({ success: true, data: result || [] });
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

// 7. REVIEWS (POST & GET)
app.post('/api/reviews', (req, res) => {
    const { user_id, content_id, rating, review_text } = req.body;
    const sql = "INSERT INTO Reviews (user_id, content_id, rating, review_text) VALUES (?, ?, ?, ?)";
    db.query(sql, [user_id, content_id, rating, review_text], (err, result) => {
        if (err) {
            console.error("Error posting review:", err);
            return res.status(500).json({ success: false, message: 'Failed to add review' });
        }
        res.json({ success: true, message: 'Review added successfully!' });
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
        if (err) {
            console.error("Error fetching reviews:", err);
            return res.status(500).json({ success: false, message: 'Failed to fetch reviews', data: [] });
        }
        res.json({ success: true, data: result || [] });
    });
});

app.get('/api/community/top-users', (req, res) => {
    db.query("SELECT * FROM top_users LIMIT 5", (err, result) => {
        if (err) {
            console.error("Error fetching top users:", err);
            return res.status(500).json({ success: false, message: 'Failed to fetch top users', data: [] });
        }
        res.json({ success: true, data: result || [] });
    });
});

// --- START SERVER ---
// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});