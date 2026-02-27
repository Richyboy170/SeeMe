/**
 * User detail page logic
 */
let userId = null;
let userData = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initSidebar('users');

  const params = new URLSearchParams(window.location.search);
  userId = params.get('id');

  if (!userId) {
    window.location.href = '/admin/users.html';
    return;
  }

  // Set up modal handlers FIRST so they're ready
  setupActionButtons();
  setupModalHandlers();

  await loadUserDetails();
});

async function loadUserDetails() {
  try {
    const data = await AdminAPI.get(`/users/${userId}`);
    userData = data;
    renderUserInfo(data.user);
    renderUserStats(data.stats);
    renderRecentPosts(data.recentPosts);
    renderAuditHistory(data.auditHistory);
    renderActions(data.user);

    document.getElementById('page-title').textContent = data.user.username;
    document.getElementById('breadcrumb-name').textContent = data.user.username;
  } catch (err) {
    document.getElementById('user-info').innerHTML =
      `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function renderUserInfo(user) {
  const el = document.getElementById('user-info');
  el.innerHTML = `
    <h2>Account Information</h2>
    <div class="detail-row"><span class="label">User ID</span><span class="value" style="font-size:11px">${user.id}</span></div>
    <div class="detail-row"><span class="label">Username</span><span class="value">${escapeHtml(user.username)}</span></div>
    <div class="detail-row"><span class="label">Email</span><span class="value">${escapeHtml(user.email)}</span></div>
    <div class="detail-row"><span class="label">Role</span><span class="value">${roleBadge(user.role)}</span></div>
    <div class="detail-row"><span class="label">Status</span><span class="value">${statusBadge(user.status)}</span></div>
    <div class="detail-row"><span class="label">Auth Provider</span><span class="value">${user.authProvider}</span></div>
    <div class="detail-row"><span class="label">Age Verified</span><span class="value">${user.ageVerified ? 'Yes' : 'No'}</span></div>
    <div class="detail-row"><span class="label">Private Account</span><span class="value">${user.isPrivate ? 'Yes' : 'No'}</span></div>
    <div class="detail-row"><span class="label">Joined</span><span class="value">${formatDate(user.createdAt)}</span></div>
    ${user.suspendedUntil ? `<div class="detail-row"><span class="label">Suspended Until</span><span class="value" style="color:var(--warning)">${formatDate(user.suspendedUntil)}</span></div>` : ''}
    ${user.suspendReason ? `<div class="detail-row"><span class="label">Suspend Reason</span><span class="value" style="color:var(--warning)">${escapeHtml(user.suspendReason)}</span></div>` : ''}
    ${user.banReason ? `<div class="detail-row"><span class="label">Ban Reason</span><span class="value" style="color:var(--danger)">${escapeHtml(user.banReason)}</span></div>` : ''}
  `;
}

function renderUserStats(stats) {
  const el = document.getElementById('user-stats');
  el.innerHTML = `
    <h2>Statistics</h2>
    <div class="detail-row"><span class="label">Posts</span><span class="value">${stats.postsCount}</span></div>
    <div class="detail-row"><span class="label">Comments</span><span class="value">${stats.commentsCount}</span></div>
    <div class="detail-row"><span class="label">Followers</span><span class="value">${stats.followersCount}</span></div>
    <div class="detail-row"><span class="label">Following</span><span class="value">${stats.followingCount}</span></div>
    <div class="detail-row"><span class="label">Current Coins</span><span class="value" style="color:var(--success)">${stats.coins.totalCoins || 0}</span></div>
    <div class="detail-row"><span class="label">Lifetime Earned</span><span class="value">${stats.coins.lifetimeEarned || 0}</span></div>
    <div class="detail-row"><span class="label">Lifetime Given</span><span class="value">${stats.coins.lifetimeGiven || 0}</span></div>
    <div class="detail-row"><span class="label">Sky Coins</span><span class="value" style="color:var(--info)">${stats.coins.skyCoins || 0}</span></div>
  `;
}

function renderRecentPosts(posts) {
  const tbody = document.getElementById('recent-posts');
  if (!posts || posts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>No posts</p></td></tr>';
    return;
  }
  tbody.innerHTML = posts.map(p => `
    <tr>
      <td>${escapeHtml(p.caption || '(no caption)')}</td>
      <td>${p.likesCount}</td>
      <td>${p.commentsCount}</td>
      <td style="color:var(--text-muted)">${timeAgo(p.createdAt)}</td>
    </tr>
  `).join('');
}

function renderAuditHistory(history) {
  const tbody = document.getElementById('audit-history');
  if (!history || history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>No admin actions recorded</p></td></tr>';
    return;
  }
  tbody.innerHTML = history.map(h => {
    let details = '';
    try { details = h.details ? JSON.stringify(JSON.parse(h.details)) : ''; } catch { details = h.details || ''; }
    return `
      <tr>
        <td><span class="badge badge-admin">${h.action}</span></td>
        <td>${h.adminUser ? escapeHtml(h.adminUser.username) : 'System'}</td>
        <td style="color:var(--text-secondary);font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(details)}</td>
        <td style="color:var(--text-muted)">${timeAgo(h.createdAt)}</td>
      </tr>
    `;
  }).join('');
}

function renderActions(user) {
  const bar = document.getElementById('actions-bar');

  // Show/hide buttons based on status
  const suspendBtn = document.getElementById('action-suspend');
  const banBtn = document.getElementById('action-ban');
  const unsuspendBtn = document.getElementById('action-unsuspend');
  const unbanBtn = document.getElementById('action-unban');
  const resetBtn = document.getElementById('action-reset');

  // Hide all first
  [suspendBtn, banBtn, unsuspendBtn, unbanBtn].forEach(b => b.style.display = 'none');

  if (user.status === 'active') {
    suspendBtn.style.display = '';
    banBtn.style.display = '';
  } else if (user.status === 'suspended') {
    unsuspendBtn.style.display = '';
    banBtn.style.display = '';
  } else if (user.status === 'banned') {
    unbanBtn.style.display = '';
  }

  resetBtn.style.display = '';
}

function setupActionButtons() {
  const bar = document.getElementById('actions-bar');

  // Create all buttons upfront with proper event listeners (no inline onclick)
  bar.innerHTML = `
    <button class="btn btn-warning btn-sm" id="action-suspend" style="display:none">Suspend</button>
    <button class="btn btn-danger btn-sm" id="action-ban" style="display:none">Ban</button>
    <button class="btn btn-success btn-sm" id="action-unsuspend" style="display:none">Unsuspend</button>
    <button class="btn btn-success btn-sm" id="action-unban" style="display:none">Unban</button>
    <button class="btn btn-primary btn-sm" id="action-reset" style="display:none">Reset Password</button>
  `;

  document.getElementById('action-suspend').addEventListener('click', () => {
    document.getElementById('suspend-reason').value = '';
    document.getElementById('suspend-duration').value = '24';
    openModal('suspend-modal');
  });

  document.getElementById('action-ban').addEventListener('click', () => {
    document.getElementById('ban-reason').value = '';
    openModal('ban-modal');
  });

  document.getElementById('action-unsuspend').addEventListener('click', async () => {
    if (!confirm('Unsuspend this user?')) return;
    try {
      await AdminAPI.post(`/users/${userId}/unsuspend`, {});
      showAlert(document.getElementById('alert-area'), 'User unsuspended', 'success');
      await loadUserDetails();
    } catch (err) {
      showAlert(document.getElementById('alert-area'), err.message, 'error');
    }
  });

  document.getElementById('action-unban').addEventListener('click', async () => {
    if (!confirm('Unban this user?')) return;
    try {
      await AdminAPI.post(`/users/${userId}/unban`, {});
      showAlert(document.getElementById('alert-area'), 'User unbanned', 'success');
      await loadUserDetails();
    } catch (err) {
      showAlert(document.getElementById('alert-area'), err.message, 'error');
    }
  });

  document.getElementById('action-reset').addEventListener('click', () => {
    document.getElementById('new-password').value = '';
    openModal('reset-modal');
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('show');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('show');
  }
}

function setupModalHandlers() {
  // Cancel buttons
  document.querySelectorAll('[data-dismiss]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-dismiss'));
    });
  });

  // Close modals when clicking on the overlay background
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
      }
    });
  });

  // Confirm suspend
  document.getElementById('confirm-suspend').addEventListener('click', async () => {
    const reason = document.getElementById('suspend-reason').value.trim();
    const hours = parseInt(document.getElementById('suspend-duration').value);
    if (!reason) { showAlert(document.getElementById('alert-area'), 'Reason is required', 'error'); return; }
    if (!hours || hours < 1) { showAlert(document.getElementById('alert-area'), 'Duration must be at least 1 hour', 'error'); return; }

    const btn = document.getElementById('confirm-suspend');
    btn.disabled = true;
    btn.textContent = 'Suspending...';

    try {
      await AdminAPI.post(`/users/${userId}/suspend`, { reason, durationHours: hours });
      closeModal('suspend-modal');
      showAlert(document.getElementById('alert-area'), 'User suspended successfully', 'success');
      await loadUserDetails();
    } catch (err) {
      showAlert(document.getElementById('alert-area'), err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Suspend';
    }
  });

  // Confirm ban
  document.getElementById('confirm-ban').addEventListener('click', async () => {
    const reason = document.getElementById('ban-reason').value.trim();
    if (!reason) { showAlert(document.getElementById('alert-area'), 'Reason is required', 'error'); return; }

    const btn = document.getElementById('confirm-ban');
    btn.disabled = true;
    btn.textContent = 'Banning...';

    try {
      await AdminAPI.post(`/users/${userId}/ban`, { reason });
      closeModal('ban-modal');
      showAlert(document.getElementById('alert-area'), 'User banned permanently', 'success');
      await loadUserDetails();
    } catch (err) {
      showAlert(document.getElementById('alert-area'), err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ban Permanently';
    }
  });

  // Confirm reset password
  document.getElementById('confirm-reset').addEventListener('click', async () => {
    const newPassword = document.getElementById('new-password').value;
    if (!newPassword || newPassword.length < 8) {
      showAlert(document.getElementById('alert-area'), 'Password must be at least 8 characters', 'error');
      return;
    }

    const btn = document.getElementById('confirm-reset');
    btn.disabled = true;
    btn.textContent = 'Resetting...';

    try {
      await AdminAPI.post(`/users/${userId}/reset-password`, { newPassword });
      closeModal('reset-modal');
      showAlert(document.getElementById('alert-area'), 'Password reset successfully', 'success');
    } catch (err) {
      showAlert(document.getElementById('alert-area'), err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Reset Password';
    }
  });
}
