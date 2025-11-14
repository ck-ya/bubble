// State
// Get Firebase instances
const auth = window.auth;
const db = window.db;

// State
let currentUser = null;
let posts = [];
let currentFilter = 'latest';
let authMode = 'login';
let selectedPostId = null;
let selectedImages = [];

// Auth state observer
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        db.ref('users/' + user.uid).once('value').then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                document.getElementById('username').textContent = userData.username;
            } else {
                document.getElementById('username').textContent = user.email.split('@')[0];
            }
        });
        document.getElementById('authBtns').classList.add('hidden');
        document.getElementById('userInfo').classList.remove('hidden');
    } else {
        currentUser = null;
        document.getElementById('authBtns').classList.remove('hidden');
        document.getElementById('userInfo').classList.add('hidden');
    }
});

// Load posts from Firebase
function loadPosts() {
    db.ref('posts').on('value', snapshot => {
        posts = [];
        snapshot.forEach(child => {
            posts.push({
                id: child.key,
                ...child.val()
            });
        });
        renderPosts();
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
});

// Auth functions
function showModal(type) {
    if (type === 'auth') {
        document.getElementById('authModal').classList.add('active');
    } else if (type === 'newPost') {
        if (!currentUser) {
            alert('Yo, login first');
            showModal('auth');
            return;
        }
        document.getElementById('newPostModal').classList.add('active');
    } else if (type === 'post') {
        document.getElementById('postModal').classList.add('active');
    }
}

function closeModal(type) {
    if (type === 'auth') {
        document.getElementById('authModal').classList.remove('active');
    } else if (type === 'newPost') {
        document.getElementById('newPostModal').classList.remove('active');
        document.getElementById('imagePreview').innerHTML = '';
        selectedImages = [];
    } else if (type === 'post') {
        document.getElementById('postModal').classList.remove('active');
    }
}

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    document.getElementById('authTitle').textContent = authMode === 'login' ? 'Login' : 'Sign Up';
    document.getElementById('authToggle').textContent = authMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Login';
    document.getElementById('usernameField').classList.toggle('hidden');
}

async function handleAuth() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const username = document.getElementById('signupUsername').value;

    if (!email || !password) {
        alert('Fill all fields bro');
        return;
    }

    try {
        if (authMode === 'signup') {
            if (!username) {
                alert('Username required');
                return;
            }
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await db.ref('users/' + userCredential.user.uid).set({
                username: username,
                email: email
            });
            alert('Account created! Welcome aboard');
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }

        closeModal('auth');
        document.getElementById('authEmail').value = '';
        document.getElementById('authPassword').value = '';
        document.getElementById('signupUsername').value = '';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function logout() {
    auth.signOut();
    showPage('dreams');
}

// Navigation
function showPage(page) {
    document.getElementById('dreamsPage').classList.add('hidden');
    document.getElementById('userPage').classList.add('hidden');
    document.getElementById('aboutPage').classList.add('hidden');

    document.querySelectorAll('.nav button').forEach(btn => btn.classList.remove('active'));

    if (page === 'dreams') {
        document.getElementById('dreamsPage').classList.remove('hidden');
        document.querySelectorAll('.nav button')[0].classList.add('active');
    } else if (page === 'user') {
        if (!currentUser) {
            alert('Login first mate');
            showModal('auth');
            return;
        }
        document.getElementById('userPage').classList.remove('hidden');
        document.querySelectorAll('.nav button')[1].classList.add('active');
        renderProfile();
    } else if (page === 'about') {
        document.getElementById('aboutPage').classList.remove('hidden');
        document.querySelectorAll('.nav button')[2].classList.add('active');
    }
}

function toggleMenu() {
    document.getElementById('nav').classList.toggle('active');
}

// Posts
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btns button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderPosts();
}

function previewImages(event) {
    const files = event.target.files;
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    selectedImages = [];

    Array.from(files).forEach((file, index) => {
        if (index < 5) { // Max 5 images
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
                selectedImages.push(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
}

async function createPost() {
    if (!currentUser) return;

    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) {
        alert('Fill everything');
        return;
    }

    const userData = await db.ref('users/' + currentUser.uid).once('value');
    const username = userData.val()?.username || currentUser.email.split('@')[0];

    const newPost = {
        title: title,
        content: content,
        author: username,
        authorId: currentUser.uid,
        likes: 0,
        views: 0,
        timestamp: Date.now(),
        likedBy: {},
        comments: {},
        images: selectedImages.length > 0 ? selectedImages : null
    };

    try {
        await db.ref('posts').push(newPost);
        closeModal('newPost');
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
        document.getElementById('imageUpload').value = '';
        alert('Dream posted!');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function renderPosts() {
    const container = document.getElementById('postsContainer');

    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No dreams yet</h3><p>Be the first to share!</p></div>';
        return;
    }

    const sorted = [...posts].sort((a, b) => {
        if (currentFilter === 'popular') return b.likes - a.likes;
        return b.timestamp - a.timestamp;
    });

    container.innerHTML = sorted.map(post => {
        const isLiked = currentUser && post.likedBy && post.likedBy[currentUser.uid];
        const commentCount = post.comments ? Object.keys(post.comments).length : 0;
        const hasImages = post.images && post.images.length > 0;

        return `
            <div class="post" onclick="openPost('${post.id}')">
                <div class="post-header">
                    <div>
                        <div class="post-title">${escapeHtml(post.title)}</div>
                        <div class="post-author">by ${escapeHtml(post.author)}</div>
                    </div>
                </div>
                <div class="post-content">${escapeHtml(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}</div>
                ${hasImages ? '<div style="color: #888; font-size: 13px; margin-top: 10px;">📷 ' + post.images.length + ' image' + (post.images.length > 1 ? 's' : '') + '</div>' : ''}
                <div class="post-actions" onclick="event.stopPropagation()">
                    <div class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                        ❤️ ${post.likes || 0}
                    </div>
                    <div class="post-action no-click">
                        👁️ ${post.views || 0}
                    </div>
                    <div class="post-action no-click">
                        💬 ${commentCount}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function toggleLike(postId) {
    if (!currentUser) {
        alert('Login to like');
        showModal('auth');
        return;
    }

    const postRef = db.ref('posts/' + postId);
    const snapshot = await postRef.once('value');
    const post = snapshot.val();

    if (!post) return;

    const likedBy = post.likedBy || {};
    const isLiked = likedBy[currentUser.uid];

    if (isLiked) {
        delete likedBy[currentUser.uid];
        await postRef.update({
            likes: (post.likes || 0) - 1,
            likedBy: likedBy
        });
    } else {
        likedBy[currentUser.uid] = true;
        await postRef.update({
            likes: (post.likes || 0) + 1,
            likedBy: likedBy
        });
    }
}

async function openPost(postId) {
    selectedPostId = postId;
    const snapshot = await db.ref('posts/' + postId).once('value');
    const post = snapshot.val();

    if (!post) return;

    // Increment views
    await db.ref('posts/' + postId + '/views').set((post.views || 0) + 1);

    document.getElementById('modalPostTitle').textContent = post.title;
    document.getElementById('modalPostAuthor').textContent = 'by ' + post.author;
    document.getElementById('modalPostContent').textContent = post.content;

    // Display images at the end
    const imagesContainer = document.getElementById('modalPostImages');
    if (post.images && post.images.length > 0) {
        imagesContainer.innerHTML = post.images.map((img, idx) =>
            `<img src="${img}" alt="Dream image ${idx + 1}" onclick="window.open('${img}', '_blank')">`
        ).join('');
        imagesContainer.style.display = 'grid';
    } else {
        imagesContainer.innerHTML = '';
        imagesContainer.style.display = 'none';
    }

    const commentCount = post.comments ? Object.keys(post.comments).length : 0;
    document.getElementById('commentCount').textContent = '(' + commentCount + ')';

    const commentsContainer = document.getElementById('commentsContainer');
    if (post.comments) {
        const commentsArray = Object.entries(post.comments).map(([id, comment]) => ({
            id,
            ...comment
        })).sort((a, b) => a.timestamp - b.timestamp);

        commentsContainer.innerHTML = commentsArray.map(c => `
            <div class="comment">
                <div class="comment-author">${escapeHtml(c.author)}</div>
                <div class="comment-content">${escapeHtml(c.content)}</div>
            </div>
        `).join('');
    } else {
        commentsContainer.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No comments yet</p>';
    }

    if (!currentUser) {
        document.getElementById('commentInputDiv').style.display = 'none';
    } else {
        document.getElementById('commentInputDiv').style.display = 'flex';
    }

    document.getElementById('commentInput').value = '';
    showModal('post');
}

async function addComment() {
    if (!currentUser) {
        alert('Login to comment');
        return;
    }

    const input = document.getElementById('commentInput');
    const content = input.value.trim();

    if (!content) return;

    const userData = await db.ref('users/' + currentUser.uid).once('value');
    const username = userData.val()?.username || currentUser.email.split('@')[0];

    const newComment = {
        author: username,
        content: content,
        timestamp: Date.now()
    };

    try {
        await db.ref('posts/' + selectedPostId + '/comments').push(newComment);
        input.value = '';
        openPost(selectedPostId); // Refresh
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Profile
async function renderProfile() {
    const userPosts = posts.filter(p => p.authorId === currentUser.uid);
    const userData = await db.ref('users/' + currentUser.uid).once('value');
    const username = userData.val()?.username || currentUser.email.split('@')[0];

    let postsHtml = '';
    if (userPosts.length === 0) {
        postsHtml = '<div class="empty-state"><h3>No dreams yet</h3><p>Share your first dream!</p></div>';
    } else {
        postsHtml = userPosts.map(post => {
            const commentCount = post.comments ? Object.keys(post.comments).length : 0;
            return `
                <div class="post" onclick="openPost('${post.id}')" style="cursor: pointer;">
                    <div class="post-title">${escapeHtml(post.title)}</div>
                    <div class="post-content">${escapeHtml(post.content.substring(0, 150))}...</div>
                    <div class="post-actions" onclick="event.stopPropagation();">
                        <span>❤️ ${post.likes || 0}</span>
                        <span>👁️ ${post.views || 0}</span>
                        <span>💬 ${commentCount}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    const content = `
        <div class="profile-header">
            <div class="profile-avatar">${username[0].toUpperCase()}</div>
            <div class="profile-info">
                <h2>${escapeHtml(username)}</h2>
                <p>${escapeHtml(currentUser.email)}</p>
            </div>
        </div>
        <h3 style="margin-bottom: 20px; font-size: 20px;">My Dreams (${userPosts.length})</h3>
        <div class="posts">
            ${postsHtml}
        </div>
    `;

    document.getElementById('profileContent').innerHTML = content;
}

// Utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
