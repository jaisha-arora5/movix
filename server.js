const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); 
app.use(express.static('public')); // Serves index.html

// --- DATABASE CONNECTION ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      
    password: '*Ja5is17ha#', // <--- CHECK THIS
    database: 'movix_db', 
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Connection on Startup
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database Connection Failed:', err.message);
    } else {
        console.log('✅ Connected to MySQL Database!');
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
        return res.status(400).send({ success: false, message: 'All fields required' });
    }
    const sql = `CALL add_user(?, ?, ?, ?)`;
    db.query(sql, [username, email, password, subscription_id], (err, result) => {
        if (err) {
            console.error("Register Error:", err);
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).send({ success: false, message: 'User already exists' });
            return res.status(500).send({ success: false, message: 'Database error' });
        }
        res.send({ success: true, message: 'User registered!' });
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
            return res.status(500).send({ success: false, message: 'Database error' });
        }
        if (result.length > 0) {
            res.send({ success: true, user: result[0] });
        } else {
            res.status(401).send({ success: false, message: 'Invalid credentials' });
        }
    });
});

// 4. USER DETAILS
app.get('/api/user/:id/details', (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT username, email, created_at FROM Users WHERE user_id = ?;
        SELECT subscription_name(?) AS sub_name;
        SELECT avg_watch_time(?) AS avg_time;
    `;
    db.query(sql, [userId, userId, userId], (err, results) => {
        if (err) return res.status(500).send(err);
        // Handle cases where stored procedures might return empty
        const info = results[0][0] || {};
        const sub = results[1][0] ? results[1][0].sub_name : 'None';
        const time = results[2][0] ? results[2][0].avg_time : 0;
        
        res.send({ info, subscription: sub, avgWatchTime: time });
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
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// 6. CONTENT
app.get('/api/content', (req, res) => {
    db.query("SELECT * FROM Content", (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// 7. REVIEWS (POST & GET)
app.post('/api/reviews', (req, res) => {
    const { user_id, content_id, rating, review_text } = req.body;
    const sql = "INSERT INTO Reviews (user_id, content_id, rating, review_text) VALUES (?, ?, ?, ?)";
    db.query(sql, [user_id, content_id, rating, review_text], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Review added successfully!' });
    });
});

app.get('/api/community/reviews', (req, res) => {
    const sql = `
        SELECT r.rating, r.review_text, u.username, c.title 
        FROM Reviews r
        JOIN Users u ON r.user_id = u.user_id
        JOIN Content c ON r.content_id = c.content_id
        ORDER BY r.created_at DESC LIMIT 10`;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

app.get('/api/community/top-users', (req, res) => {
    db.query("SELECT * FROM top_users LIMIT 5", (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// --- START SERVER ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 MOVIX Server running on http://localhost:${PORT}`);
});