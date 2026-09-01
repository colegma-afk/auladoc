// ============================================================
// AulaDoc — Vista: Mi docencia (instructor)
// ============================================================
const Instructor = {
  async render() {
    const el = document.getElementById('view');
    el.innerHTML = `
      <div class="view-head">
        <h1>Mi docencia</h1>
        <p>Cursos que impartes, estudiantes inscritos y su progreso de aprendizaje.</p>
      </div>
      <div id="instWrap"><div class="empty-state">Cargando…</div></div>`;

    const courses = await API.get('/api/instructor/courses');
    const wrap = document.getElementById('instWrap');
    if (!courses.length) {
      wrap.innerHTML = UI.empty('grad', 'Aún no impartes cursos',
        'Cuando la administración te asigne cursos como instructor, aparecerán aquí.');
      return;
    }

    wrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:16px">
      ${courses.map(c => {
        const pct = c.enrolledCount ? Math.round((c.completedCount / c.enrolledCount) * 100) : 0;
        return `
        <div class="card instructor-course">
          <details>
            <summary class="ic-head" style="list-style:none">
              <img src="${c.cover}" alt="">
              <div class="ic-info">
                <b>${c.title}</b>
                <small>${c.category} · ${c.level} · ${c.hours} h · ${c.modules.reduce((n, m) => n + m.lessons.length, 0)} lecciones</small>
                <div style="margin-top:8px;max-width:320px">${UI.progressBar(pct, 'progress-coral')}</div>
                <small>${pct}% de los inscritos han completado el curso</small>
              </div>
              <div class="ic-stats">
                <div><b>${c.enrolledCount}</b><small>inscritos</small></div>
                <div><b>${c.completedCount}</b><small>completados</small></div>
              </div>
              <span style="color:var(--muted)">${UI.ICONS.chevDown}</span>
            </summary>
            <div class="ic-body">
              ${c.students.length
                ? `<div class="table-wrap"><table class="tbl">
                    <thead><tr><th>Estudiante</th><th>Correo</th><th>Inscrito</th><th style="width:200px">Progreso</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      ${c.students.map(s => `
                        <tr>
                          <td><div style="display:flex;align-items:center;gap:10px">${UI.avatar(s.student ? s.student.name : '?')}<b>${s.student ? s.student.name : '—'}</b></div></td>
                          <td style="color:var(--muted)">${s.student ? s.student.email : '—'}</td>
                          <td style="color:var(--muted)">${Domain.fmtDateShort(s.enrolledAt)}</td>
                          <td><div style="display:flex;align-items:center;gap:10px"><div style="flex:1">${UI.progressBar(s.pct, s.pct === 100 ? 'progress-green' : 'progress-coral')}</div><b style="font-size:13px;width:38px;text-align:right">${s.pct}%</b></div></td>
                          <td>${s.completedAt
                            ? '<span class="chip chip-green">' + UI.ICONS.checkCircle + ' Completado</span>'
                            : (s.done > 0 ? '<span class="chip chip-sky">En curso</span>' : '<span class="chip chip-gray">Sin empezar</span>')}</td>
                          <td><a class="btn btn-ghost btn-sm" href="#/admin/usuarios">${UI.ICONS.eye} Ver</a></td>
                        </tr>`).join('')}
                    </tbody>
                  </table></div>`
                : '<p style="color:var(--muted);padding:10px 4px">Aún no hay estudiantes inscritos en este curso.</p>'}
            </div>
          </details>
        </div>`;
      }).join('')}
    </div>`;
  }
};
