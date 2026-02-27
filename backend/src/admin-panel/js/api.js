/**
 * Admin API wrapper with JWT authentication
 */
const AdminAPI = {
  baseUrl: '/api/admin',

  getToken() {
    return localStorage.getItem('admin_token');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      // Don't redirect if we're already on the login page
      const isLoginPage = window.location.pathname === '/admin/' || window.location.pathname === '/admin/index.html';
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (!isLoginPage) {
        window.location.href = '/admin/';
      }
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
