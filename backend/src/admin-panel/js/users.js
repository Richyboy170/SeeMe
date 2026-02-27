/**
 * Users page logic
 */
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initSidebar('users');
  loadUsers();

  document.getElementById('search-btn').addEventListener('click', () => {
    currentPage = 1;
    loadUsers();
  });

  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { currentPage = 1; loadUsers(); }
  });

  document.getElementById('filter-status').addEventListener('change', () => {
    currentPage = 1;
    loadUsers();
  });

  document.getElementById('filter-role').addEventListener('change', () => {
    currentPage = 1;
    loadUsers();
  });
});

async function loadUsers() {
  const search = document.getElementById('search-input').value;
  const status = document.getElementById('filter-status').value;
  const role = document.getElementById('filter-role').value;

  const params = new URLSearchParams({
    page: currentPage,
    limit: 20,
    ...(search && { search }),
    ...(status && { status }),
    ...(role && { role }),
  });

  const tbody = document.getElementById('users-table');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>';

  try {
    const data = await AdminAPI.get(`/users?${params}`);
    renderUsers(data.users, tbody);
    buildPagination(
      document.getElementById('pagination'),
      data.page,
      data.totalPages,
      (p) => { currentPage = p; loadUsers(); }
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="alert alert-error">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderUsers(users, tbody) {
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>No users found</p></td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <a href="/admin/user-detail.html?id=${u.id}" style="font-weight:500">${escapeHtml(u.username)}</a>
      </td>
      <td style="color:var(--text-secondary)">${escapeHtml(u.email)}</td>
      <td>${roleBadge(u.role)}</td>
      <td>${statusBadge(u.status)}</td>
      <td style="color:var(--text-muted)">${formatDateShort(u.createdAt)}</td>
      <td>
        <a href="/admin/user-detail.html?id=${u.id}" class="btn btn-sm btn-primary">View</a>
      </td>
    </tr>
  `).join('');
}
