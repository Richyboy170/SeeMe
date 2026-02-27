/**
 * Audit log page logic
 */
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initSidebar('audit');
  loadAuditLog();

  document.getElementById('filter-action').addEventListener('change', () => {
    currentPage = 1;
    loadAuditLog();
  });
});

async function loadAuditLog() {
  const action = document.getElementById('filter-action').value;
  const params = new URLSearchParams({
    page: currentPage,
    limit: 50,
    ...(action && { action }),
  });

  const tbody = document.getElementById('audit-table');
  tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading...</td></tr>';

  try {
    const data = await AdminAPI.get(`/audit-log?${params}`);
    renderAuditLog(data.logs, tbody);
    buildPagination(
      document.getElementById('pagination'),
      data.page,
      data.totalPages,
      (p) => { currentPage = p; loadAuditLog(); }
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="alert alert-error">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderAuditLog(logs, tbody) {
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>No audit entries found</p></td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => {
    let details = '';
    try {
      if (log.details) {
        const parsed = JSON.parse(log.details);
        details = Object.entries(parsed)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
      }
    } catch {
      details = log.details || '';
    }

    const targetLink = log.targetType === 'user' && log.targetId
      ? `<a href="/admin/user-detail.html?id=${log.targetId}">${log.targetType}:${log.targetId.substring(0, 8)}...</a>`
      : (log.targetType && log.targetId ? `${log.targetType}:${log.targetId.substring(0, 8)}...` : '-');

    return `
      <tr>
        <td><span class="badge badge-admin">${escapeHtml(log.action)}</span></td>
        <td>${log.adminUser ? escapeHtml(log.adminUser.username) : 'System'}</td>
        <td>${targetLink}</td>
        <td style="color:var(--text-secondary);font-size:12px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(details)}</td>
        <td style="color:var(--text-muted);font-size:12px">${log.ipAddress || '-'}</td>
        <td style="color:var(--text-muted)">${formatDate(log.createdAt)}</td>
      </tr>
    `;
  }).join('');
}
