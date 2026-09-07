// ============================================================
// AulaEdUC — Vista: Inicio (dashboard personal)
// ============================================================
const Dashboard = {
  async render() {
    const el = document.getElementById('view');
    el.innerHTML = '<div class="empty-state">Cargando…</div>';
    const d = await API.get('/api/me/dashboard');
    const me = API.user;

    const firstName = (me.name || '').split(' ')[0];
    const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

    let extraCards = '';
    if (me.role === 'admin') {
      extraCards = `
      <div class="section-title"><h2>Gestión de la plataforma</h2></div>
      <div class="stat-grid">
        <a class="card stat-card card-hover" href="#/admin" style="text-decoration:none;color:inherit">
          <div class="s-ico s-ico-indigo">${UI.ICONS.chart}</div>
          <div><div class="s-num">Panel general</div><div class="s-lab">Estadísticas de capacitación</div></div>
        </a>
        <a class="card stat-card card-hover" href="#/admin/usuarios" style="text-decoration:none;color:inherit">
          <div class="s-ico s-ico-coral">${UI.ICONS.users}</div>
          <div><div class="s-num">Usuarios</div><div class="s-lab">Gestionar cuentas e inscripciones</div></div>
        </a>
        <a class="card stat-card card-hover" href="#/admin/cursos" style="text-decoration:none;color:inherit">
          <div class="s-ico s-ico-green">${UI.ICONS.book}</div>
          <div><div class="s-num">Cursos</div><div class="s-lab">Crear y editar capacitaciones</div></div>
        </a>
      </div>`;
    } else if (me.role === 'instructor') {
      extraCards = `
      <div class="section-title"><h2>Tu docencia</h2></div>
      <a class="card stat-card card-hover" href="#/instructor" style="text-decoration:none;color:inherit">
        <div class="s-ico s-ico-coral">${UI.ICONS.grad}</div>
        <div><div class="s-num">Mis cursos</div><div class="s-lab">Ver estudiantes y progreso de tus capacitaciones</div></div>
      </a>`;
    }

    const contCards = d.inProgress.map(c => {
      const next = this._nextLesson(c);
      return `
      <div class="card course-card">
        <div class="cover" style="cursor:pointer" onclick="location.hash='#/curso/${c.id}/leccion/${next.id}'">
          <img src="${c.cover}" alt="">
          <span class="dur">${c.progress.done}/${c.progress.total} lecciones</span>
        </div>
        <div class="cc-body">
          <h3 class="cc-title" style="font-size:14.5px">${c.title}</h3>
          <div>${UI.progressBar(c.progress.pct, 'progress-coral')}<div style="font-size:12px;color:var(--muted);margin-top:5px">${c.progress.pct}% · continúa con «${next.title}»</div></div>
          <div class="cc-foot"><a class="btn btn-primary btn-sm btn-block" href="#/curso/${c.id}/leccion/${next.id}">${UI.ICONS.play} Continuar curso</a></div>
        </div>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="view-head">
        <p style="text-transform:capitalize;color:var(--muted)">${today}</p>
        <h1>Hola, ${firstName} 👋</h1>
        <p>${d.inProgress.length > 0 ? 'Tienes cursos en progreso. ¡Sigue avanzando en tu formación!' : 'Revisa el catálogo y elige tu próxima capacitación.'}</p>
      </div>

      <div class="stat-grid">
        <div class="card stat-card">
          <div class="s-ico s-ico-indigo">${UI.ICONS.play}</div>
          <div><div class="s-num">${d.stats.inProgress}</div><div class="s-lab">Cursos en progreso</div></div>
        </div>
        <div class="card stat-card">
          <div class="s-ico s-ico-green">${UI.ICONS.checkCircle}</div>
          <div><div class="s-num">${d.stats.completed}</div><div class="s-lab">Cursos completados</div></div>
        </div>
        <div class="card stat-card">
          <div class="s-ico s-ico-amber">${UI.ICONS.award}</div>
          <div><div class="s-num">${d.stats.certificates}</div><div class="s-lab">Certificados obtenidos</div></div>
        </div>
        <div class="card stat-card">
          <div class="s-ico s-ico-coral">${UI.ICONS.clock}</div>
          <div><div class="s-num">${d.stats.hoursDone}</div><div class="s-lab">Horas de formación</div></div>
        </div>
      </div>

      ${extraCards}

      ${d.inProgress.length ? `
        <div class="section-title"><h2>Continúa aprendiendo</h2><a href="#/catalogo">Ir al catálogo →</a></div>
        <div class="course-grid">${contCards}</div>
      ` : ''}

      ${d.notStarted.length ? `
        <div class="section-title"><h2>Inscrito, listo para empezar</h2></div>
        <div class="course-grid">${d.notStarted.map(c => UI.courseCard(c)).join('')}</div>
      ` : ''}

      ${d.completed.length ? `
        <div class="section-title"><h2>Completados 🎉</h2><a href="#/certificados">Ver certificados →</a></div>
        <div class="course-grid">${d.completed.map(c => UI.courseCard(c)).join('')}</div>
      ` : ''}

      <div class="section-title"><h2>Recomendados para ti</h2></div>
      ${d.recommended.length ? `<div class="course-grid">${d.recommended.map(c => UI.courseCard(c)).join('')}</div>`
        : UI.empty('book', 'Por ahora no hay más cursos disponibles')}
    `;
  },

  // Primera lección no completada del curso
  _nextLesson(course) {
    for (const m of course.modules || []) {
      for (const l of m.lessons) {
        if (!l.completed) return l;
      }
    }
    const all = (course.modules || []).flatMap(m => m.lessons);
    return all[all.length - 1];
  }
};
