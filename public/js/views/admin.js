// ============================================================
// AulaEdUC — Vistas de administración (stats, usuarios, cursos)
// ============================================================
const Admin = {
  // ================= Panel de estadísticas =================
  async stats() {
    const el = document.getElementById('view');
    el.innerHTML = '<div class="empty-state">Cargando…</div>';
    const s = await API.get('/api/admin/stats');

    const roleLabel = { admin: 'Administradores', instructor: 'Instructores', colaborador: 'Colaboradores' };
    const roles = Object.entries(s.byRole).map(([r, n]) =>
      `<span class="chip ${r === 'admin' ? '' : r === 'instructor' ? 'chip-coral' : 'chip-sky'}">${roleLabel[r] || r}: <b>${n}</b></span>`).join('');

    el.innerHTML = `
      <div class="view-head">
        <h1>Panel de administración</h1>
        <p>Visibilidad general de la plataforma de capacitación docente.</p>
      </div>

      <div class="stat-grid">
        <div class="card stat-card">
          <div class="s-ico s-ico-indigo">${UI.ICONS.users}</div>
          <div><div class="s-num">${s.totalUsers}</div><div class="s-lab">Usuarios registrados</div></div>
        </div>
        <div class="card stat-card">
          <div class="s-ico s-ico-coral">${UI.ICONS.book}</div>
          <div><div class="s-num">${s.totalCourses}</div><div class="s-lab">Cursos disponibles</div></div>
        </div>
        <div class="card stat-card">
          <div class="s-ico s-ico-green">${UI.ICONS.play}</div>
          <div><div class="s-num">${s.totalEnrollments}</div><div class="s-lab">Inscripciones totales</div></div>
        </div>
        <div class="card stat-card">
          <div class="s-ico s-ico-amber">${UI.ICONS.award}</div>
          <div><div class="s-num">${s.totalCerts}</div><div class="s-lab">Certificados emitidos</div></div>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:24px">
        <h3 style="margin-bottom:10px">Composición de usuarios</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap">${roles}</div>
      </div>

      <div class="admin-grid">
        <div class="card card-pad">
          <h3 style="margin-bottom:14px">Inscripciones por curso</h3>
          ${s.perCourse.map(c => `
            <div class="bar-row">
              <span class="bar-lab" title="${c.title}">${c.title}</span>
              <div class="progress ${c.rate >= 60 ? 'progress-green' : c.rate > 0 ? 'progress-coral' : ''}"><i style="width:${Math.max(4, c.rate)}%"></i></div>
              <span class="bar-num">${c.enrolled} · ${c.rate}%</span>
            </div>`).join('')}
          <div class="legend" style="margin-top:12px">
            <span><i style="background:var(--indigo-500)"></i> % de finalización (verde = ≥60%)</span>
          </div>
        </div>

        <div class="card card-pad">
          <h3 style="margin-bottom:14px">Certificados recientes</h3>
          ${s.recentCerts.length ? `<div class="table-wrap"><table class="tbl">
            <thead><tr><th>Estudiante</th><th>Curso</th><th>Fecha</th></tr></thead>
            <tbody>
              ${s.recentCerts.map(ct => `
                <tr>
                  <td><div style="display:flex;align-items:center;gap:9px">${UI.avatar(ct.user || '?', 'avatar-sm')}<b>${ct.user || '—'}</b></div></td>
                  <td style="font-size:13px">${ct.course || '—'}</td>
                  <td style="color:var(--muted);white-space:nowrap">${Domain.fmtDateShort(ct.issuedAt)}</td>
                </tr>`).join('')}
            </tbody>
          </table></div>`
          : '<p style="color:var(--muted)">Aún no se emiten certificados.</p>'}
        </div>
      </div>`;
  },

  // ================= Gestión de usuarios =================
  async users() {
    const el = document.getElementById('view');
    el.innerHTML = `
      <div class="view-head">
        <h1>Usuarios</h1>
        <p>Gestiona cuentas, roles e inscripciones de todo el equipo.</p>
      </div>
      <div class="toolbar">
        <div class="search">${UI.ICONS.search}<input class="input" id="userSearch" placeholder="Buscar por nombre o correo…"></div>
        <button class="btn btn-primary" onclick="Admin.userModal()">${UI.ICONS.plus} Nuevo usuario</button>
      </div>
      <div class="card" id="userTable"><div class="empty-state">Cargando…</div></div>`;

    const users = await API.get('/api/admin/users');
    const courses = await API.get('/api/catalog');
    const draw = (q = '') => {
      const list = users.filter(u => !q || (u.name + ' ' + u.email).toLowerCase().includes(q.toLowerCase()));
      document.getElementById('userTable').innerHTML = list.length ? `
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Inscritos</th><th>Completados</th><th>Miembro desde</th><th class="actions" style="text-align:right">Acciones</th></tr></thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td><div style="display:flex;align-items:center;gap:10px">${UI.avatar(u.name)}<div><b>${u.name}</b><div style="font-size:12.5px;color:var(--muted)">${u.email}</div></div></div></td>
                <td>
                  <select class="select role-pill" style="width:auto;padding:5px 10px;font-size:12px;font-weight:700;border-radius:999px;${this._roleStyle(u.role)}" onchange="Admin.setRole('${u.id}', this.value)">
                    <option value="colaborador" ${u.role === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                    <option value="instructor" ${u.role === 'instructor' ? 'selected' : ''}>Instructor</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                </td>
                <td>${u.coursesEnrolled}</td>
                <td>${u.coursesDone > 0 ? `<span class="chip chip-green">${UI.ICONS.checkCircle} ${u.coursesDone}</span>` : '—'}</td>
                <td style="color:var(--muted);white-space:nowrap">${Domain.fmtDateShort(u.createdAt)}</td>
                <td>
                  <div class="actions">
                    <button class="ico-btn" title="Asignar cursos" onclick="Admin.assignModal('${u.id}')">${UI.ICONS.book}</button>
                    <button class="ico-btn danger" title="Eliminar" onclick="Admin.deleteUser('${u.id}','${u.name.replace(/'/g, '')}')">${UI.ICONS.trash}</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>`
        : UI.empty('users', 'Sin resultados', 'Prueba con otro término de búsqueda.');
    };
    document.getElementById('userSearch').addEventListener('input', e => draw(e.target.value));
    draw();
  },

  _roleStyle(role) {
    return role === 'admin' ? 'background:var(--indigo-100);color:var(--indigo-700);border:none'
      : role === 'instructor' ? 'background:var(--coral-100);color:#C2410C;border:none'
      : 'background:var(--sky-100);color:var(--sky-600);border:none';
  },

  async setRole(userId, role) {
    try {
      await API.patch('/api/admin/users/' + userId, { role });
      UI.toast('Rol actualizado.', 'success');
    } catch (err) { UI.toast(err.message, 'error'); location.reload(); }
  },

  async deleteUser(userId, name) {
    if (!confirm(`¿Eliminar a ${name}? Se perderán sus inscripciones y certificados.`)) return;
    try {
      await API.del('/api/admin/users/' + userId);
      UI.toast('Usuario eliminado.', 'info');
      Admin.users();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  userModal() {
    UI.openModal('Nuevo usuario', `
      <div class="field"><label>Nombre completo</label><input class="input" id="nuName" placeholder="Ej: Paula Soto"></div>
      <div class="field"><label>Correo electrónico</label><input class="input" id="nuEmail" type="email" placeholder="correo@aulaeduc.cl"></div>
      <div class="row">
        <div class="field"><label>Contraseña</label><input class="input" id="nuPass" type="text" placeholder="mínimo 6 caracteres"></div>
        <div class="field"><label>Rol</label>
          <select class="select" id="nuRole">
            <option value="colaborador">Colaborador/a</option>
            <option value="instructor">Instructor/a</option>
            <option value="admin">Administrador/a</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
       <button class="btn btn-primary" id="nuSave">${UI.ICONS.plus} Crear usuario</button>`);
    document.getElementById('nuSave').addEventListener('click', async () => {
      try {
        await API.post('/api/admin/users', {
          name: document.getElementById('nuName').value.trim(),
          email: document.getElementById('nuEmail').value.trim(),
          password: document.getElementById('nuPass').value,
          role: document.getElementById('nuRole').value
        });
        UI.closeModal();
        UI.toast('Usuario creado.', 'success');
        Admin.users();
      } catch (err) { UI.toast(err.message, 'error'); }
    });
  },

  async assignModal(userId) {
    const users = await API.get('/api/admin/users');
    const u = users.find(x => x.id === userId);
    const courses = await API.get('/api/catalog');
    if (!u) return;
    const enrolled = new Set(u.courses.map(c => c.id));
    UI.openModal(`Asignar cursos a ${u.name}`, `
      <p class="hint" style="margin-bottom:14px">Marca los cursos que deseas asignar o desasignar.</p>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${courses.map(c => `
          <label style="display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:10px;border:1px solid var(--line);cursor:pointer;margin-bottom:2px">
            <input type="checkbox" class="assign-chk" value="${c.id}" ${enrolled.has(c.id) ? 'checked' : ''}>
            <img src="${c.cover}" style="width:52px;height:30px;object-fit:cover;border-radius:6px">
            <span style="flex:1;font-size:13.5px;font-weight:600">${c.title}</span>
            ${enrolled.has(c.id) ? '<span class="chip chip-green">Inscrito</span>' : ''}
          </label>`).join('')}
      </div>`,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
       <button class="btn btn-primary" id="asSave">Guardar asignaciones</button>`);

    document.getElementById('asSave').addEventListener('click', async () => {
      try {
        const checked = [...document.querySelectorAll('.assign-chk:checked')].map(x => x.value);
        for (const cId of courses.map(c => c.id)) {
          const isNow = checked.includes(cId), isBefore = enrolled.has(cId);
          if (isNow && !isBefore) await API.post(`/api/admin/users/${userId}/enroll`, { courseId: cId });
          if (!isNow && isBefore) await API.del(`/api/admin/users/${userId}/enroll/${cId}`);
        }
        UI.closeModal();
        UI.toast('Asignaciones actualizadas.', 'success');
        Admin.users();
      } catch (err) { UI.toast(err.message, 'error'); }
    });
  },

  // ================= Gestión de cursos =================
  async courses() {
    const el = document.getElementById('view');
    el.innerHTML = `
      <div class="view-head">
        <h1>Cursos</h1>
        <p>Crea, edita y publica las capacitaciones de la plataforma.</p>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary" onclick="Admin.courseEditor()">${UI.ICONS.plus} Nuevo curso</button>
      </div>
      <div class="card" id="courseTable"><div class="empty-state">Cargando…</div></div>`;

    const courses = await API.get('/api/catalog');
    document.getElementById('courseTable').innerHTML = courses.length ? `
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Curso</th><th>Instructor/a</th><th>Estado</th><th>Inscritos</th><th>Finalización</th><th class="actions" style="text-align:right">Acciones</th></tr></thead>
        <tbody>
          ${courses.map(c => {
            const rate = c.enrolledCount ? Math.round((c.completedCount || 0) / c.enrolledCount * 100) : 0;
            return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:12px">
                  <img class="cover-thumb" src="${c.cover}" alt="">
                  <div><b>${c.title}</b><div style="font-size:12.5px;color:var(--muted)">${c.category} · ${c.level} · ${c.hours} h</div></div>
                </div>
              </td>
              <td style="color:var(--muted)">${c.instructorName}</td>
              <td>${c.published ? '<span class="chip chip-green">Publicado</span>' : '<span class="chip chip-amber">Borrador</span>'}</td>
              <td>${c.enrolledCount}</td>
              <td style="min-width:120px">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="flex:1">${UI.progressBar(rate, rate >= 60 ? 'progress-green' : 'progress-coral')}</div>
                  <b style="font-size:12.5px">${rate}%</b>
                </div>
              </td>
              <td><div class="actions">
                <a class="ico-btn" title="Ver curso" href="#/curso/${c.id}">${UI.ICONS.eye}</a>
                <button class="ico-btn" title="Editar" onclick="Admin.courseEditor('${c.id}')">${UI.ICONS.edit}</button>
                <button class="ico-btn danger" title="Eliminar" onclick="Admin.deleteCourse('${c.id}','${c.title.replace(/'/g, '')}')">${UI.ICONS.trash}</button>
              </div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`
      : UI.empty('book', 'No hay cursos aún', 'Crea el primero con el botón "Nuevo curso".');
  },

  async deleteCourse(id, title) {
    if (!confirm(`¿Eliminar el curso "${title}"? Se perderán inscripciones y certificados asociados.`)) return;
    try {
      await API.del('/api/admin/courses/' + id);
      UI.toast('Curso eliminado.', 'info');
      Admin.courses();
    } catch (err) { UI.toast(err.message, 'error'); }
  },

  // ---------- Editor de cursos ----------
  ceDraft: null,
  ceEditId: null,
  CE_COVERS: ['/img/covers/c1.jpg', '/img/covers/c2.jpg', '/img/covers/c3.jpg', '/img/covers/c4.jpg', '/img/covers/c5.jpg', '/img/covers/c6.jpg'],

  async courseEditor(courseId) {
    let draft = null;
    // Lista de instructores para el selector
    try {
      const users = await API.get('/api/admin/users');
      this.ceInstructors = users.filter(u => u.role === 'instructor');
    } catch (e) { this.ceInstructors = []; }
    if (courseId) {
      const c = await API.get('/api/courses/' + courseId);
      draft = {
        title: c.title, description: c.description, category: c.category, level: c.level,
        hours: c.hours, cover: c.cover, instructorId: c.instructorId, published: c.published,
        modules: c.modules.map(m => ({ title: m.title, lessons: m.lessons.map(l => ({ title: l.title, minutes: l.minutes, video: l.video, description: l.description, material: l.material })) }))
      };
    } else {
      draft = {
        title: '', description: '', category: 'Pedagogía', level: 'Básico', hours: 8,
        cover: this.CE_COVERS[0], instructorId: '', published: false,
        modules: [{ title: 'Módulo 1', lessons: [{ title: '', minutes: 10, video: '', description: '', material: '' }] }]
      };
    }
    this.ceDraft = draft;
    this.ceEditId = courseId || null;
    this._ceRender();
  },

  _ceRender() {
    const d = Admin.ceDraft;
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const instructors = Admin.ceInstructors || [];
    const mBlock = (m, mi) => `
      <div class="card" style="padding:16px;margin-bottom:14px;border-color:var(--indigo-100)">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
          <span class="m-icon" style="width:30px;height:30px;border-radius:8px;background:var(--indigo-50);color:var(--indigo-600);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">${mi + 1}</span>
          <input class="input" style="flex:1" placeholder="Título del módulo" value="${esc(m.title)}" data-path="modules.${mi}.title" oninput="Admin.ceSet(this.dataset.path, this.value)">
          <button class="ico-btn danger" title="Quitar módulo" onclick="Admin.ceDelModule(${mi})">${UI.ICONS.trash}</button>
        </div>
        ${m.lessons.map((l, li) => `
          <div style="border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
              <span class="chip chip-sky">Lección ${li + 1}</span>
              <button class="ico-btn danger" title="Quitar lección" onclick="Admin.ceDelLesson(${mi},${li})">${UI.ICONS.x}</button>
            </div>
            <div class="row" style="margin-bottom:8px">
              <input class="input" placeholder="Título de la lección" value="${esc(l.title)}" data-path="modules.${mi}.lessons.${li}.title" oninput="Admin.ceSet(this.dataset.path, this.value)">
              <input class="input" style="max-width:110px" type="number" min="1" placeholder="min" value="${esc(l.minutes)}" data-path="modules.${mi}.lessons.${li}.minutes" oninput="Admin.ceSet(this.dataset.path, this.value)">
            </div>
            <input class="input" style="margin-bottom:8px" placeholder="URL del video (MP4, opcional)" value="${esc(l.video)}" data-path="modules.${mi}.lessons.${li}.video" oninput="Admin.ceSet(this.dataset.path, this.value)">
            <textarea class="textarea" style="margin-bottom:8px;min-height:54px" placeholder="Resumen de la lección" data-path="modules.${mi}.lessons.${li}.description" oninput="Admin.ceSet(this.dataset.path, this.value)">${esc(l.description)}</textarea>
            <textarea class="textarea" style="min-height:54px" placeholder="Material de apoyo (opcional)" data-path="modules.${mi}.lessons.${li}.material" oninput="Admin.ceSet(this.dataset.path, this.value)">${esc(l.material)}</textarea>
          </div>`).join('')}
        <button class="btn btn-ghost btn-sm" onclick="Admin.ceAddLesson(${mi})">${UI.ICONS.plus} Agregar lección</button>
      </div>`;

    const body = `
      <div class="row">
        <div class="field" style="flex:2"><label>Título del curso *</label><input class="input" id="ce_title" value="${esc(d.title)}" oninput="Admin.ceDraft.title=this.value" placeholder="Ej: Metodologías Activas"></div>
        <div class="field"><label>Horas *</label><input class="input" type="number" min="1" id="ce_hours" value="${esc(d.hours)}" oninput="Admin.ceDraft.hours=+this.value||0"></div>
      </div>
      <div class="field"><label>Descripción *</label><textarea class="textarea" id="ce_desc" oninput="Admin.ceDraft.description=this.value" placeholder="¿De qué trata la capacitación?">${esc(d.description)}</textarea></div>
      <div class="row">
        <div class="field"><label>Categoría *</label><input class="input" id="ce_cat" list="catList" value="${esc(d.category)}" oninput="Admin.ceDraft.category=this.value"><datalist id="catList"><option>Pedagogía</option><option>Tecnología Educativa</option><option>Evaluación</option><option>Inclusión</option><option>Neuroeducación</option><option>Convivencia</option></datalist></div>
        <div class="field"><label>Nivel *</label>
          <select class="select" id="ce_level" onchange="Admin.ceDraft.level=this.value">
            ${['Básico', 'Intermedio', 'Avanzado'].map(l => `<option ${d.level === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Portada</label>
          <select class="select" id="ce_cover" onchange="Admin.ceDraft.cover=this.value">
            ${Admin.CE_COVERS.map(cv => `<option value="${cv}" ${d.cover === cv ? 'selected' : ''}>Portada ${Admin.CE_COVERS.indexOf(cv) + 1}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="row">
        <div class="field"><label>Instructor/a *</label>
          <select class="select" id="ce_instructor" onchange="Admin.ceDraft.instructorId=this.value">
            <option value="">Seleccionar…</option>
            ${instructors.map(u => `<option value="${u.id}" ${d.instructorId === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="display:flex;align-items:flex-end"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600"><input type="checkbox" id="ce_pub" ${d.published ? 'checked' : ''} onchange="Admin.ceDraft.published=this.checked"> Publicar curso</label></div>
      </div>
      <h3 style="margin:6px 0 12px">Módulos y lecciones</h3>
      <div id="ce_modules">${d.modules.map(mBlock).join('')}</div>
      <button class="btn btn-ghost" onclick="Admin.ceAddModule()">${UI.ICONS.plus} Agregar módulo</button>`;

    UI.openModal(d.title ? 'Editar curso' : 'Nuevo curso', body,
      `<button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
       <button class="btn btn-primary" id="ceSave">${UI.ICONS.check} Guardar curso</button>`, { lg: true });

    document.getElementById('ceSave').addEventListener('click', () => Admin.ceSave());
  },

  ceSet(path, value) {
    const keys = path.split('.');
    let o = this.ceDraft;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  },
  ceAddModule() { this.ceDraft.modules.push({ title: `Módulo ${this.ceDraft.modules.length + 1}`, lessons: [{ title: '', minutes: 10, video: '', description: '', material: '' }] }); this._ceRender(); },
  ceDelModule(i) { if (confirm('¿Quitar este módulo y sus lecciones?')) { this.ceDraft.modules.splice(i, 1); this._ceRender(); } },
  ceAddLesson(mi) { this.ceDraft.modules[mi].lessons.push({ title: '', minutes: 10, video: '', description: '', material: '' }); this._ceRender(); },
  ceDelLesson(mi, li) { if (confirm('¿Quitar esta lección?')) { this.ceDraft.modules[mi].lessons.splice(li, 1); this._ceRender(); } },

  async ceSave() {
    const d = this.ceDraft;
    if (!d.title.trim() || !d.description.trim() || !d.instructorId) {
      return UI.toast('Completa título, descripción e instructor/a.', 'error');
    }
    const emptyLessons = d.modules.some(m => m.lessons.some(l => !l.title.trim()));
    if (emptyLessons) return UI.toast('Todas las lecciones deben tener título.', 'error');
    try {
      if (this.ceEditId) {
        await API.put('/api/admin/courses/' + this.ceEditId, d);
        UI.toast('Curso actualizado.', 'success');
      } else {
        await API.post('/api/admin/courses', d);
        UI.toast('Curso creado.', 'success');
      }
      UI.closeModal();
      Admin.courses();
    } catch (err) { UI.toast(err.message, 'error'); }
  }
};
