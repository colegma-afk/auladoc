// ============================================================
// AulaDoc — Vistas: Detalle de curso + Reproductor de lecciones
// ============================================================
const Course = {
  // ---------- Detalle ----------
  async detail(courseId) {
    const el = document.getElementById('view');
    el.innerHTML = '<div class="empty-state">Cargando curso…</div>';
    const c = await API.get('/api/courses/' + courseId);
    const lessons = c.modules.reduce((n, m) => n + m.lessons.length, 0);
    const isMine = c.instructorId === API.user.id;

    let sideActions = '';
    if (c.enrolled) {
      if (c.progress.pct < 100) {
        const next = this._nextLesson(c);
        sideActions += `<a class="btn btn-primary btn-lg btn-block" href="#/curso/${c.id}/leccion/${next.id}">${UI.ICONS.play} Continuar curso</a>`;
      } else {
        sideActions += `<a class="btn btn-green btn-lg btn-block" style="background:var(--green-100);color:var(--green-600);border:none" href="#/curso/${c.id}">${UI.ICONS.checkCircle} Curso completado</a>`;
        sideActions += `<a class="btn btn-ghost btn-block" href="#/certificados">${UI.ICONS.award} Ver mi certificado</a>`;
      }
      if (!isMine) sideActions += `<button class="btn btn-ghost btn-block btn-sm" onclick="Course.unenroll('${c.id}')">${UI.ICONS.x} Retirarme del curso</button>`;
    } else {
      sideActions = `<button class="btn btn-coral btn-lg btn-block" onclick="Course.enroll('${c.id}')">${UI.ICONS.plus} Inscribirme al curso</button>`;
    }

    el.innerHTML = `
      <a href="#/catalogo" style="display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;margin-bottom:14px">${UI.ICONS.chevLeft} Volver al catálogo</a>

      <div class="course-hero">
        <div class="hero-cover" style="background-image:url('${c.cover}')"></div>
        <div class="hero-inner">
          <div class="hero-chips">
            <span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${c.category}</span>
            <span class="chip" style="background:rgba(255,255,255,.2);color:#fff">Nivel ${c.level}</span>
            ${c.published ? '' : '<span class="chip" style="background:var(--amber-100);color:var(--amber-600)">Borrador</span>'}
          </div>
          <h1>${c.title}</h1>
          <p class="hero-desc">${c.description}</p>
          <div class="hero-meta">
            <span>${UI.ICONS.clock} ${c.hours} horas</span>
            <span>${UI.ICONS.video} ${lessons} ${Domain.plural(lessons, 'lección', 'lecciones')}</span>
            <span>${UI.ICONS.users} ${c.enrolledCount} inscritos</span>
            <span>${UI.ICONS.grad} ${c.instructorName}</span>
          </div>
        </div>
      </div>

      <div class="course-layout">
        <div>
          <div class="card card-pad" style="margin-top:24px">
            <h2 style="margin-bottom:10px">Sobre este curso</h2>
            <p style="color:var(--ink-2)">${c.description}</p>
          </div>
          <div class="syllabus">
            <h2 style="margin-bottom:12px">Contenido del curso</h2>
            ${c.modules.map((m, i) => this._moduleBlock(m, i, c.id)).join('')}
          </div>
        </div>

        <aside class="course-side">
          <div class="card">
            <h3 style="margin-bottom:6px">Información</h3>
            <div class="side-stat"><span>Duración</span><b>${c.hours} horas</b></div>
            <div class="side-stat"><span>Nivel</span><b>${c.level}</b></div>
            <div class="side-stat"><span>Lecciones</span><b>${lessons}</b></div>
            <div class="side-stat"><span>Categoría</span><b>${c.category}</b></div>
            <div class="side-stat"><span>Instructor/a</span><b>${c.instructorName}</b></div>
            <div class="side-stat"><span>Inscritos</span><b>${c.enrolledCount}</b></div>
          </div>

          <div class="card">
            ${c.enrolled ? `
              <h3 style="margin-bottom:10px">Tu progreso</h3>
              <div style="font-size:26px;font-weight:800">${c.progress.pct}%</div>
              <div style="font-size:13px;color:var(--muted);margin-bottom:10px">${c.progress.done} de ${c.progress.total} lecciones</div>
              ${UI.progressBar(c.progress.pct, c.progress.pct === 100 ? 'progress-green' : '')}
            ` : `<p style="font-size:14px;color:var(--muted)">Inscríbete para llevar registro de tu avance y obtener tu certificado.</p>`}
            <div style="margin-top:16px;display:flex;flex-direction:column;gap:9px">${sideActions}</div>
          </div>
        </aside>
      </div>
    `;

    document.querySelectorAll('.module-head').forEach(h =>
      h.addEventListener('click', () => h.parentElement.classList.toggle('open')));
  },

  _moduleBlock(m, i, courseId) {
    return `
    <div class="module-block">
      <button class="module-head">
        <span class="m-icon">${i + 1}</span>
        <span class="m-info"><b>${m.title}</b><small>${m.lessons.length} ${Domain.plural(m.lessons.length, 'lección', 'lecciones')}</small></span>
        <span class="chev">${UI.ICONS.chevDown}</span>
      </button>
      <div class="module-lessons" style="display:none">
        ${m.lessons.map(l => `
          <a class="lesson-row ${l.completed ? 'done' : ''}" href="#/curso/${courseId}/leccion/${l.id}">
            <span class="l-icon">${l.completed ? UI.ICONS.check : UI.ICONS.play}</span>
            <span class="l-title">${l.title}</span>
            <span class="l-min">${UI.ICONS.clock} ${l.minutes} min</span>
          </a>`).join('')}
      </div>
    </div>`;
  },

  // ---------- Reproductor ----------
  async player(courseId, lessonId) {
    const el = document.getElementById('view');
    el.innerHTML = '<div class="empty-state">Cargando lección…</div>';
    const c = await API.get('/api/courses/' + courseId);
    const all = c.modules.flatMap(m => m.lessons);
    const idx = all.findIndex(l => l.id === lessonId);
    if (idx === -1) return location.hash = `#/curso/${courseId}`;
    const lesson = all[idx];
    const prev = all[idx - 1] || null;
    const next = all[idx + 1] || null;
    const done = lesson.completed;

    el.innerHTML = `
      <div class="player-layout">
        <div class="player-main">
          <a href="#/curso/${courseId}" style="display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;margin-bottom:12px">${UI.ICONS.chevLeft} Volver al curso</a>

          <div class="video-box">
            ${lesson.video
              ? `<video controls playsinline preload="metadata" poster="${c.cover}">
                   <source src="${lesson.video}" type="video/mp4">
                   Tu navegador no soporta video HTML5.
                 </video>`
              : `<div class="video-ph">${UI.ICONS.video}<b>Video disponible próximamente</b><span style="font-size:13px">Lee el resumen y el material de esta lección.</span></div>`}
          </div>

          <div class="player-head">
            <div style="flex:1;min-width:0">
              <h1>${lesson.title}</h1>
              <div class="player-meta">
                <span>${UI.ICONS.clock} ${lesson.minutes} min</span>
                <span>${UI.ICONS.book} ${c.title}</span>
                <span>${UI.ICONS.grad} ${c.instructorName}</span>
              </div>
            </div>
            <button class="complete-toggle ${done ? 'is-done' : ''}" id="toggleComplete" data-lesson="${lesson.id}" data-state="${done}">
              ${done ? UI.ICONS.checkCircle : UI.ICONS.check}
              <span>${done ? 'Completada' : 'Marcar como completada'}</span>
            </button>
          </div>

          <div class="tabs" id="playerTabs">
            <button data-tab="resumen" class="active">Resumen</button>
            <button data-tab="material">Material de apoyo</button>
          </div>
          <div class="tab-pane active" id="pane-resumen"><p>${lesson.description || 'Sin descripción.'}</p></div>
          <div class="tab-pane" id="pane-material">
            <div class="material-box">${lesson.material || 'Esta lección no tiene material de apoyo.'}</div>
            <div style="margin-top:14px">
              <a class="btn btn-ghost btn-sm" href="/api/courses/${courseId}/material.txt" target="_blank" download>${UI.ICONS.download} Descargar guía completa del curso</a>
            </div>
          </div>

          <div class="player-nav">
            ${prev ? `<a class="btn btn-ghost" href="#/curso/${courseId}/leccion/${prev.id}">${UI.ICONS.chevLeft} Anterior: ${this._short(prev.title)}</a>` : '<span></span>'}
            ${next ? `<a class="btn btn-primary" href="#/curso/${courseId}/leccion/${next.id}">Siguiente: ${this._short(next.title)} ${UI.ICONS.chevRight}</a>` : `<a class="btn btn-primary" href="#/curso/${courseId}">${UI.ICONS.checkCircle} Finalizar curso</a>`}
          </div>
        </div>

        <aside class="player-side">
          <div class="card player-progress">
            <div class="pp-top"><span>Tu progreso</span><span id="ppNum">${c.progress.pct}%</span></div>
            <div id="ppBar">${UI.progressBar(c.progress.pct)}</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:7px" id="ppText">${c.progress.done} de ${c.progress.total} lecciones</div>
          </div>
          <div class="card">
            <div style="padding:14px 16px 6px"><b style="font-size:14.5px">Contenido del curso</b></div>
            <div class="player-lessons">
              ${c.modules.map(m => `
                <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:10px 10px 4px">${m.title}</div>
                ${m.lessons.map(l => `
                  <a class="lesson-pill ${l.id === lesson.id ? 'current' : ''} ${l.completed ? 'done' : ''}" href="#/curso/${courseId}/leccion/${l.id}">
                    <span class="l-ico">${l.completed ? UI.ICONS.check : (l.id === lesson.id ? UI.ICONS.play : UI.ICONS.play)}</span>
                    <span class="l-t">${l.title}</span>
                    <span class="l-d">${l.minutes} min</span>
                  </a>`).join('')}
              `).join('')}
            </div>
          </div>
        </aside>
      </div>
    `;

    // Tabs
    document.querySelectorAll('#playerTabs button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('#playerTabs button').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + b.dataset.tab));
    }));

    // Completar / descompletar
    document.getElementById('toggleComplete').addEventListener('click', async e => {
      const btn = e.currentTarget;
      const state = btn.dataset.state === 'true';
      btn.disabled = true;
      try {
        const r = await API.post(`/api/lessons/${lesson.id}/complete`, { completed: !state });
        btn.dataset.state = r.completed;
        btn.classList.toggle('is-done', r.completed);
        btn.querySelector('span').textContent = r.completed ? 'Completada' : 'Marcar como completada';
        btn.innerHTML = (r.completed ? UI.ICONS.checkCircle : UI.ICONS.check) + btn.innerHTML.slice(btn.innerHTML.indexOf('<span>'));
        document.getElementById('ppNum').textContent = r.progress.pct + '%';
        document.getElementById('ppBar').innerHTML = UI.progressBar(r.progress.pct, r.progress.pct === 100 ? 'progress-green' : '');
        document.getElementById('ppText').textContent = `${r.progress.done} de ${r.progress.total} lecciones`;
        if (r.completedAt) UI.toast('🎉 ¡Felicidades! Completaste el curso. Tu certificado ya está disponible.', 'success');
        else if (r.completed) UI.toast('Lección completada', 'success');
        else UI.toast('Lección marcada como pendiente', 'info');
      } catch (err) { UI.toast(err.message, 'error'); }
      btn.disabled = false;
    });

    // Scroll al inicio
    window.scrollTo({ top: 0 });
  },

  _short(t) { return t.length > 34 ? t.slice(0, 34) + '…' : t; },
  _nextLesson(c) {
    for (const m of c.modules) for (const l of m.lessons) if (!l.completed) return l;
    return c.modules.flatMap(m => m.lessons).slice(-1)[0];
  },

  // ---------- Acciones ----------
  async enroll(courseId) {
    try {
      await API.post(`/api/courses/${courseId}/enroll`);
      UI.toast('¡Inscripción exitosa! Ya puedes comenzar el curso.', 'success');
      location.hash = `#/curso/${courseId}`;
    } catch (err) { UI.toast(err.message, 'error'); }
  },
  async unenroll(courseId) {
    if (!confirm('¿Seguro que deseas retirarte del curso? Perderás tu registro de progreso.')) return;
    try {
      await API.del(`/api/courses/${courseId}/enroll`);
      UI.toast('Te retiraste del curso.', 'info');
      location.reload();
    } catch (err) { UI.toast(err.message, 'error'); }
  }
};
