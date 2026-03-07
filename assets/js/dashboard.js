import { SITE_FIREBASE_CONFIG, isFirebaseConfigured } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const authStatus = document.getElementById('auth-status');
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const postForm = document.getElementById('post-form');
const postFormMessage = document.getElementById('post-form-message');
const userPostsContainer = document.getElementById('user-posts');
const userPostsEmpty = document.getElementById('user-posts-empty');
const projectList = document.getElementById('project-list');
const staticProjectsJson = document.getElementById('static-projects-json');

let auth = null;
let db = null;
let currentUser = null;

function setMessage(message, isError = false) {
  postFormMessage.textContent = message;
  postFormMessage.style.color = isError ? '#b42318' : '';
}

function parseTags(raw) {
  return String(raw || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function renderUserPosts(posts) {
  userPostsContainer.innerHTML = '';

  if (!posts.length) {
    userPostsEmpty.style.display = 'block';
    return;
  }

  userPostsEmpty.style.display = 'none';

  for (const post of posts) {
    const article = document.createElement('article');
    article.className = 'card';

    const postDate = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Draft date unavailable';
    const tags = Array.isArray(post.tags) ? post.tags : [];

    article.innerHTML = `
      <p class="text-muted" style="margin-bottom:0.35rem;">${postDate}</p>
      <h4>${post.title || 'Untitled post'}</h4>
      <p class="text-muted">${post.excerpt || ''}</p>
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.4rem;">
        ${tags.map((tag) => `<span class="stack-tag">${tag}</span>`).join('')}
      </div>
    `;

    userPostsContainer.appendChild(article);
  }
}

function renderProjects() {
  let projects = [];
  try {
    projects = JSON.parse(staticProjectsJson?.textContent || '[]');
  } catch {
    projects = [];
  }

  if (!projects.length) {
    projectList.innerHTML = '<div class="list-empty">No projects found.</div>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'blog-grid';

  projects.slice(0, 8).forEach((project) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <h4>${project.title || 'Untitled project'}</h4>
      <p class="text-muted">${project.description || ''}</p>
      <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-top:0.5rem;">
        ${(project.stack || []).map((tech) => `<span class="stack-tag">${tech}</span>`).join('')}
      </div>
    `;
    wrapper.appendChild(card);
  });

  projectList.innerHTML = '';
  projectList.appendChild(wrapper);
}

async function loadUserPosts() {
  if (!db || !currentUser) {
    renderUserPosts([]);
    return;
  }

  const postsRef = collection(db, 'blogPosts');
  const postsQuery = query(postsRef, where('authorUid', '==', currentUser.uid), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(postsQuery);
  const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderUserPosts(posts);
}

function applyAuthUiState() {
  const isAuthed = Boolean(currentUser);
  signInBtn.disabled = isAuthed;
  signOutBtn.disabled = !isAuthed;

  if (isAuthed) {
    const email = currentUser.email || 'Signed-in user';
    authStatus.innerHTML = `<span class="auth-badge">Signed in</span> ${email}`;
  } else {
    authStatus.textContent = 'Not signed in.';
  }
}

async function initFirebase() {
  if (!isFirebaseConfigured()) {
    authStatus.textContent = 'Firebase is not configured. Update assets/js/firebase-config.js to enable Google login.';
    signInBtn.disabled = true;
    signOutBtn.disabled = true;
    postForm.querySelector('button[type="submit"]').disabled = true;
    renderProjects();
    return;
  }

  const app = initializeApp(SITE_FIREBASE_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  signInBtn.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
      setMessage('Signed in successfully.');
    } catch (error) {
      setMessage(`Sign-in failed: ${error.message}`, true);
    }
  });

  signOutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      setMessage('Signed out.');
    } catch (error) {
      setMessage(`Sign-out failed: ${error.message}`, true);
    }
  });

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    applyAuthUiState();
    await loadUserPosts();
  });

  postForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentUser) {
      setMessage('Sign in first to publish.', true);
      return;
    }

    const formData = new FormData(postForm);
    const payload = {
      title: String(formData.get('title') || '').trim(),
      excerpt: String(formData.get('excerpt') || '').trim(),
      content: String(formData.get('content') || '').trim(),
      tags: parseTags(formData.get('tags')),
      authorUid: currentUser.uid,
      authorEmail: currentUser.email || '',
      published: true,
      createdAt: serverTimestamp()
    };

    if (!payload.title || !payload.excerpt || !payload.content) {
      setMessage('Title, excerpt, and content are required.', true);
      return;
    }

    try {
      await addDoc(collection(db, 'blogPosts'), payload);
      postForm.reset();
      setMessage('Post published. It will appear on Blog and your dashboard list.');
      await loadUserPosts();
    } catch (error) {
      setMessage(`Publish failed: ${error.message}`, true);
    }
  });

  renderProjects();
}

renderProjects();
initFirebase();
