import { SITE_FIREBASE_CONFIG, isFirebaseConfigured } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const postsContainer = document.getElementById('community-posts');
const postsEmpty = document.getElementById('community-posts-empty');

function renderPosts(posts) {
  postsContainer.innerHTML = '';

  if (!posts.length) {
    postsEmpty.style.display = 'block';
    return;
  }

  postsEmpty.style.display = 'none';

  for (const post of posts) {
    const article = document.createElement('article');
    article.className = 'card';

    const createdLabel = post.createdAt?.toDate
      ? post.createdAt.toDate().toLocaleDateString()
      : 'Recent';

    const tags = Array.isArray(post.tags) ? post.tags.slice(0, 6) : [];

    article.innerHTML = `
      <p class="text-muted" style="margin-bottom:0.35rem;">${createdLabel}</p>
      <h3>${post.title || 'Untitled post'}</h3>
      <p class="text-muted">${post.excerpt || ''}</p>
      <div style="display:flex;gap:0.42rem;flex-wrap:wrap;margin-top:0.65rem;">
        ${tags.map((tag) => `<span class="stack-tag">${tag}</span>`).join('')}
      </div>
    `;

    postsContainer.appendChild(article);
  }
}

async function loadCommunityPosts() {
  if (!isFirebaseConfigured()) {
    postsEmpty.textContent = 'Firebase not configured yet. Add your config to enable community posts.';
    postsEmpty.style.display = 'block';
    return;
  }

  try {
    const app = initializeApp(SITE_FIREBASE_CONFIG);
    const db = getFirestore(app);

    const postsRef = collection(db, 'blogPosts');
    const postsQuery = query(postsRef, orderBy('createdAt', 'desc'), limit(24));
    const snapshot = await getDocs(postsQuery);

    const posts = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((post) => post.published !== false);

    renderPosts(posts);
  } catch (error) {
    postsEmpty.textContent = `Unable to load community posts: ${error.message}`;
    postsEmpty.style.display = 'block';
  }
}

loadCommunityPosts();
