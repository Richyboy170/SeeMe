/**
 * Posts page logic
 */
let currentPage = 1;
let deletePostId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initSidebar('posts');
  loadPosts();

  document.getElementById('search-btn').addEventListener('click', () => {
    currentPage = 1;
    loadPosts();
  });

  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { currentPage = 1; loadPosts(); }
  });

  document.getElementById('confirm-delete').addEventListener('click', async () => {
    if (!deletePostId) return;
    try {
      await AdminAPI.delete(`/posts/${deletePostId}`);
      hideModal('delete-modal');
      showAlert(document.getElementById('alert-area'), 'Post deleted successfully', 'success');
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  });
});

async function loadPosts() {
  const search = document.getElementById('search-input').value;
  const params = new URLSearchParams({
    page: currentPage,
    limit: 12,
    ...(search && { search }),
  });

  const container = document.getElementById('posts-container');
  container.innerHTML = '<div class="loading">Loading posts...</div>';

  try {
    const data = await AdminAPI.get(`/posts?${params}`);
    renderPosts(data.posts, container);
    buildPagination(
      document.getElementById('pagination'),
      data.page,
      data.totalPages,
      (p) => { currentPage = p; loadPosts(); }
    );
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function renderPosts(posts, container) {
  if (posts.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No posts found</p></div>';
    return;
  }

  container.innerHTML = posts.map(p => {
    const imageUrl = p.processedImageUrl || p.originalImageUrl || '';
    const author = p.user ? p.user.username : 'Unknown';
    return `
      <div class="post-card">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Post image" onerror="this.style.display='none'">` : '<div style="height:200px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;color:var(--text-muted)">No image</div>'}
        <div class="post-info">
          <div class="post-author">
            <a href="/admin/user-detail.html?id=${p.userId}">${escapeHtml(author)}</a>
          </div>
          <div class="post-caption">${escapeHtml(p.caption || '(no caption)')}</div>
          <div class="post-meta">
            <span>${p.likesCount} likes &middot; ${p.commentsCount} comments</span>
            <span>${timeAgo(p.createdAt)}</span>
          </div>
          <div style="margin-top:8px">
            <button class="btn btn-danger btn-sm" onclick="confirmDelete('${p.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function confirmDelete(postId) {
  deletePostId = postId;
  showModal('delete-modal');
}
