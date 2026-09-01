// ============================================================
// AulaDoc — Cliente API + estado
// ============================================================
const API = {
  token: localStorage.getItem('ad_token') || '',
  user: JSON.parse(localStorage.getItem('ad_user') || 'null'),

  async request(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) { /* sin cuerpo */ }
    if (res.status === 401 && location.pathname.endsWith('app.html')) {
      this.logout();
      throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
    }
    if (!res.ok) throw new Error((data && data.error) || 'Error del servidor');
    return data;
  },

  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  patch(url, body) { return this.request('PATCH', url, body); },
  del(url) { return this.request('DELETE', url); },

  logout() {
    this.token = '';
    this.user = null;
    localStorage.removeItem('ad_token');
    localStorage.removeItem('ad_user');
    location.href = '/';
  },

  async me() {
    const user = await this.get('/api/me');
    this.user = user;
    localStorage.setItem('ad_user', JSON.stringify(user));
    return user;
  }
};

// Pequeños helpers de dominio
const Domain = {
  fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  },
  fmtDateShort(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  initials(name) {
    const parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  },
  avatarColor(name) {
    const pal = ['#4F46E5', '#7C3AED', '#F97316', '#059669', '#0284C7', '#DB2777', '#D97706', '#0D9488'];
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return pal[h % pal.length];
  },
  plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }
};
