// ============================================================
// AulaEdUC — Aplicación principal (enrutador + shell)
// ============================================================
(async function init() {
  // Sesión
  if (!API.token) location.href = '/';
  try {
    await API.me();
  } catch (e) {
    location.href = '/';
    return;
  }
  document.getElementById('appShell').style.display = 'flex';

  // Logo
  document.getElementById('logoBadge').innerHTML = UI.ICONS.logo;

  // Sidebar: usuario
  const me = API.user;
  document.getElementById('sideUser').innerHTML = `
    ${UI.avatar(me.name)}
    <div style="min-width:0">
      <div class="u-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${me.name}</div>
      <div class="u-role" style="text-transform:capitalize">${me.role === 'admin' ? 'Administración' : me.role === 'instructor' ? 'Instructor/a' : 'Colaborador/a'}</div>
    </div>
    <button class="logout-btn" id="logoutBtn" title="Cerrar sesión">${UI.ICONS.logout}</button>`;
  document.getElementById('logoutBtn').addEventListener('click', () => API.logout());

  // Sidebar: navegación por rol
  const nav = [];
  nav.push({ label: 'Principal', items: [
    { id: 'dashboard', icon: 'home', text: 'Inicio', href: '#/dashboard' },
    { id: 'catalogo', icon: 'book', text: 'Catálogo de cursos', href: '#/catalogo' }
  ]});
  nav.push({ label: 'Mi formación', items: [
    { id: 'certificados', icon: 'award', text: 'Certificados', href: '#/certificados' }
  ]});
  if (me.role === 'instructor') {
    nav.push({ label: 'Docencia', items: [
      { id: 'instructor', icon: 'grad', text: 'Mis cursos', href: '#/instructor' }
    ]});
  }
  if (me.role === 'admin') {
    nav.push({ label: 'Administración', items: [
      { id: 'admin', icon: 'chart', text: 'Panel general', href: '#/admin' },
      { id: 'admin-usuarios', icon: 'users', text: 'Usuarios', href: '#/admin/usuarios' },
      { id: 'admin-cursos', icon: 'book', text: 'Cursos', href: '#/admin/cursos' }
    ]});
  }
  document.getElementById('sideNav').innerHTML = nav.map(sec => `
    <div class="nav-label">${sec.label}</div>
    ${sec.items.map(it => `
      <a class="nav-item" data-id="${it.id}" href="${it.href}">
        ${UI.ICONS[it.icon]}<span>${it.text}</span>
      </a>`).join('')}`).join('');

  // Menú móvil
  const sidebar = document.getElementById('sidebar');
  document.getElementById('menuBtn').addEventListener('click', () => sidebar.classList.toggle('open'));
  sidebar.addEventListener('click', e => { if (e.target.closest('.nav-item')) sidebar.classList.remove('open'); });

  // ---------- Enrutador ----------
  const routes = {
    'dashboard': () => Dashboard.render(),
    'catalogo': () => Catalog.render(),
    'curso': (p) => Course.detail(p[1]),
    'leccion': (p) => Course.player(p[1], p[2]),
    'certificados': () => Certificates.list(),
    'certificado': (p) => Certificates.show(p[1]),
    'instructor': () => Instructor.render(),
    'admin': () => Admin.stats(),
    'admin-usuarios': () => Admin.users(),
    'admin-cursos': () => Admin.courses()
  };

  async function router() {
    document.body.classList.remove('print-mode');
    UI.closeModal();
    const hash = location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
    const parts = hash.split('/').filter(Boolean);
    const base = parts[0] || 'dashboard';
    let handler = routes[base];
    if (base === 'curso' && parts[2] === 'leccion') handler = () => Course.player(parts[1], parts[3]);
    if (!handler) { location.hash = '#/dashboard'; return; }
    // Resaltar nav
    const activeId = base === 'curso' ? 'catalogo' : base === 'certificado' ? 'certificados' : base;
    document.querySelectorAll('.nav-item').forEach(a =>
      a.classList.toggle('active', a.dataset.id === activeId));
    try {
      await handler(parts);
    } catch (err) {
      if (!/Sesi|permisos/.test(err.message)) console.error(err);
      const view = document.getElementById('view');
      view.innerHTML = `<div class="empty-state">${UI.ICONS.alert}<b>Ocurrió un error</b><span>${err.message}</span>
        <div style="margin-top:14px"><a class="btn btn-ghost btn-sm" href="#/dashboard">Volver al inicio</a></div></div>`;
    }
  }

  window.addEventListener('hashchange', router);
  router();
})();
