// ============================================================
// AulaDoc — Vistas: Certificados (lista + documento imprimible)
// ============================================================
const Certificates = {
  async list() {
    const el = document.getElementById('view');
    el.innerHTML = `
      <div class="view-head">
        <h1>Mis certificados</h1>
        <p>Certificados digitales emitidos al completar cada curso. Puedes imprimirlos o guardarlos en PDF.</p>
      </div>
      <div id="certWrap"><div class="empty-state">Cargando…</div></div>`;

    const certs = await API.get('/api/me/certificates');
    const wrap = document.getElementById('certWrap');
    if (!certs.length) {
      wrap.innerHTML = UI.empty('award', 'Aún no tienes certificados',
        'Completa un curso al 100% y tu certificado aparecerá aquí automáticamente.');
      return;
    }
    wrap.innerHTML = `
      <div class="cert-grid">
        ${certs.map(ct => `
          <div class="card cert-card card-hover">
            <div class="cert-ico">${UI.ICONS.award}</div>
            <div style="flex:1;min-width:0">
              <h3>${ct.course ? ct.course.title : 'Curso'}</h3>
              <div class="c-meta">${UI.ICONS.grad} ${ct.course ? ct.course.instructorName : ''}</div>
              <div class="c-meta">Emitido el ${Domain.fmtDate(ct.issuedAt)}</div>
              <div class="c-meta" style="font-family:monospace;color:var(--indigo-600)">${ct.code}</div>
            </div>
            <a class="btn btn-primary btn-sm" href="#/certificado/${ct.id}">${UI.ICONS.eye} Ver</a>
          </div>`).join('')}
      </div>`;
  },

  async show(certId) {
    const certs = await API.get('/api/me/certificates');
    const ct = certs.find(x => x.id === certId);
    if (!ct) return location.hash = '#/certificados';
    const me = API.user;
    const instructor = ct.course ? ct.course.instructorName : 'Dirección Académica';

    document.body.classList.add('print-mode');
    const el = document.getElementById('view');
    el.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:18px">
        <a class="btn btn-ghost btn-sm" href="#/certificados">${UI.ICONS.chevLeft} Volver</a>
        <button class="btn btn-primary btn-sm" onclick="window.print()">${UI.ICONS.print} Imprimir / Guardar PDF</button>
      </div>

      <div class="cert-page">
        <div class="cert-inner">
          <div class="cert-logo">${UI.ICONS.logo}</div>
          <div class="cert-kicker">AulaDoc · Plataforma de Capacitación Docente</div>
          <div class="cert-kicker" style="letter-spacing:.18em;font-size:11px;color:var(--indigo-600)">Certificado de Finalización</div>
          <p class="cert-for" style="margin-top:10px">Se certifica que</p>
          <div class="cert-name">${me.name}</div>
          <p class="cert-for">ha completado satisfactoriamente el curso</p>
          <div class="cert-course">${ct.course ? ct.course.title : ''}</div>
          <p>con una duración de ${ct.course ? ct.course.hours : '—'} horas, en el marco del plan de capacitación docente.</p>
          <div class="cert-foot">
            <div class="cert-sign">
              <div class="line"></div>
              <b>${instructor}</b>
              <small>Instructora / Instructor del curso</small>
            </div>
            <div class="cert-sign">
              <div class="line"></div>
              <b>Dirección Académica</b>
              <small>AulaDoc</small>
            </div>
          </div>
          <div class="cert-code">CÓDIGO: ${ct.code} · EMITIDO EL ${new Date(ct.issuedAt).toLocaleDateString('es-CL').toUpperCase()} · VALIDABLE EN AULADOC.CL</div>
        </div>
      </div>`;
    window.scrollTo(0, 0);
  }
};
