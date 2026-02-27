/**
 * Admin authentication handler
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  // Only on the login page: if already logged in, redirect to dashboard
  if (form && localStorage.getItem('admin_token')) {
    window.location.href = '/admin/dashboard.html';
    return;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      errorEl.style.display = 'none';

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const btn = form.querySelector('button');

      btn.disabled = true;
      btn.textContent = 'Signing in...';

      try {
        const data = await AdminAPI.post('/login', { email, password });
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        window.location.href = '/admin/dashboard.html';
      } catch (err) {
        errorEl.textContent = err.message || 'Login failed';
        errorEl.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }
});

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.href = '/admin/';
}

function requireAuth() {
  if (!localStorage.getItem('admin_token')) {
    window.location.href = '/admin/';
    return false;
  }
  return true;
}

function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem('admin_user'));
  } catch {
    return null;
  }
}
