const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let isLoginMode = true;

// --- NAVIGATION & AUTH ---

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show selected
    const selected = document.getElementById(`${pageId}-page`);
    if (selected) {
        selected.classList.remove('hidden');
        selected.classList.add('active');
    }

    // Update Nav
    const nav = document.getElementById('navbar');
    if (pageId === 'login') {
        nav.classList.add('hidden');
    } else {
        nav.classList.remove('hidden');
        loadPageData(pageId);
    }
}

// TOGGLE LOGIN / REGISTER
function toggleAuth() {
    isLoginMode = !isLoginMode;
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const toggleText = document.getElementById('toggleText');
    const msg = document.getElementById('authMessage');

    msg.innerText = ""; // Clear errors

    if (isLoginMode) {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        title.innerText = "Welcome back";
        subtitle.innerText = "Sign in to your Movix account";
        toggleText.innerHTML = 'New to Movix? <a href="#" onclick="toggleAuth()">Sign Up here</a>';
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        title.innerText = "Create Account";
        subtitle.innerText = "Join the Movix community";
        toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuth()">Sign In here</a>';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('movixUser');
    showPage('login');
}

// Check if already logged in on page load
window.onload = () => {
    const saved = localStorage.getItem('movixUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        showPage('home'); 
    }
};

// Handle Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;
    const msg = document.getElementById('authMessage');

    msg.innerText = "Logging in...";

    try {
        const res = await fetch(`http://localhost:3000/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('movixUser', JSON.stringify(currentUser));
            msg.innerText = "";
            showPage('home');
        } else {
            msg.innerText = data.message || "Login failed.";
        }
    } catch (err) {
        console.error(err);
        msg.innerText = "Server Error. Check console.";
    }
});

// Handle Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPass').value;
    const subscription_id = document.getElementById('regPlan').value;
    const msg = document.getElementById('authMessage');

    msg.innerText = "Creating account...";

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, subscription_id })
        });
        const data = await res.json();

        if (data.success) {
            alert("Account created! Please log in.");
            toggleAuth(); // Switch back to login
            msg.innerText = "";
        } else {
            msg.innerText = data.message || "Registration failed.";
        }
    } catch (err) {
        console.error(err);
        msg.innerText = "Server Error.";
    }
});

// --- DATA LOADING ---

function loadPageData(page) {
    if (!currentUser) return;

    if (page === 'home') loadHome();
    if (page === 'movies') loadMovies();
    if (page === 'profile') loadProfile();
}

// 1. LOAD HOME (Community)
async function loadHome() {
    try {
        // Recent Reviews
        const resRev = await fetch(`${API_URL}/community/reviews`);
        const revData = await resRev.json();
        const reviews = revData.data || revData || [];
        const reviewHTML = reviews.map(r => `
            <div class="review-card">
                <div class="review-header"><strong>${r.username}</strong> watched <strong>${r.title}</strong></div>
                <div class="stars">${'★'.repeat(r.rating)}</div>
                <p>"${r.review_text}"</p>
            </div>
        `).join('');
        document.getElementById('communityReviews').innerHTML = reviewHTML || 'No reviews yet.';

        // Top Users (View)
        const resTop = await fetch(`${API_URL}/community/top-users`);
        const topData = await resTop.json();
        const users = topData.data || topData || [];
        const userHTML = users.map((u, index) => `
            <div class="leaderboard-item">
                <span>#${index + 1} ${u.username}</span>
                <span>${u.total_watch_time || 0} mins</span>
            </div>
        `).join('');
        document.getElementById('topUsersList').innerHTML = userHTML || 'Loading leaderboard...';
    } catch (err) {
        console.error("Error loading home:", err);
    }
}

// 2. LOAD PROFILE
async function loadProfile() {
    try {
        // Details + Functions
        const res = await fetch(`${API_URL}/user/${currentUser.user_id}/details`);
        const data = await res.json();

        if (data.success) {
            document.getElementById('profileName').innerText = data.info.username || 'User';
            document.getElementById('profileEmail').innerText = data.info.email || 'N/A';
            document.getElementById('profilePlan').innerText = data.subscription || 'No Plan';
            document.getElementById('statAvgTime').innerText = data.avgWatchTime || '0';
        }

        // History
        const hRes = await fetch(`${API_URL}/user/${currentUser.user_id}/history`);
        const histData = await hRes.json();
        const history = histData.data || histData || [];
        
        const rows = history.map(h => `
            <tr>
                <td>${h.title}</td>
                <td>${h.genre}</td>
                <td>${new Date(h.watched_on).toLocaleDateString()}</td>
                <td>${h.watch_duration_minutes}m</td>
            </tr>
        `).join('');
        document.getElementById('historyList').innerHTML = rows || '<tr><td colspan="4">No history found.</td></tr>';
    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

// 3. LOAD MOVIES
async function loadMovies() {
    try {
        const res = await fetch(`${API_URL}/content`);
        const contentData = await res.json();
        const movies = contentData.data || contentData || [];
        
        const html = movies.map(m => `
            <div class="movie-card" onclick="openReviewModal(${m.content_id}, '${m.title.replace(/'/g, "\\'")}')">
                <div class="poster-placeholder">${m.title.substring(0,2)}</div>
                <h4>${m.title}</h4>
                <p>${m.genre} (${m.release_year})</p>
                <button class="btn-sm">Log / Review</button>
            </div>
        `).join('');
        document.getElementById('moviesGrid').innerHTML = html || 'No movies available.';
    } catch (err) {
        console.error("Error loading movies:", err);
    }
}

// --- REVIEW MODAL LOGIC ---

const modal = document.getElementById('reviewModal');

function openReviewModal(contentId, title) {
    document.getElementById('modalContentId').value = contentId;
    document.getElementById('modalTitle').innerText = 'Review ' + title;
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

// Close modal if clicking outside content
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const contentId = document.getElementById('modalContentId').value;
    const rating = document.getElementById('modalRating').value;
    const text = document.getElementById('modalText').value;

    const body = {
        user_id: currentUser.user_id,
        content_id: contentId,
        rating: rating,
        review_text: text
    };

    try {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });

        const data = await response.json();
        closeModal();
        alert('Review submitted!');
        document.getElementById('modalText').value = '';
    } catch (err) {
        console.error("Error submitting review:", err);
        alert("Failed to submit review");
    }
});