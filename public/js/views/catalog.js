// ============================================================
// AulaDoc — Vista: Catálogo de cursos
// ============================================================
const Catalog = {
  state: { q: '', cat: 'Todas', level: 'Todos' },

  async render() {
    const el = document.getElementById('view');
    el.innerHTML = `
      <div class="view-head">
        <h1>Catálogo de capacitaciones</h1>
        <p>Explora los cursos de formación docente disponibles. Inscríbete y avanza a tu ritmo.</p>
      </div>
      <div class="toolbar">
        <div class="search">
          ${UI.ICONS.search}
          <input class="input" id="catSearch" placeholder="Buscar curso…" value="${this.state.q}">
        </div>
        <select class="select" id="catFilter" style="max-width:200px"></select>
        <select class="select" id="levelFilter" style="max-width:180px">
          <option>Todos</option>
          <option>Básico</option>
          <option>Intermedio</option>
          <option>Avanzado</option>
        </select>
      </div>
      <div class="course-grid" id="catGrid">Cargando…</div>
    `;

    const courses = await API.get('/api/catalog');
    const cats = ['Todas', ...new Set(courses.map(c => c.category))];
    const catSel = document.getElementById('catFilter');
    catSel.innerHTML = cats.map(c => `<option ${c === this.state.cat ? 'selected' : ''}>${c}</option>`).join('');

    const apply = () => {
      const q = this.state.q.toLowerCase();
      const list = courses.filter(c =>
        (this.state.cat === 'Todas' || c.category === this.state.cat) &&
        (this.state.level === 'Todos' || c.level === this.state.level) &&
        (!q || (c.title + ' ' + c.description + ' ' + c.instructorName).toLowerCase().includes(q))
      );
      document.getElementById('catGrid').innerHTML = list.length
        ? list.map(c => UI.courseCard(c)).join('')
        : UI.empty('search', 'Sin resultados', 'Prueba con otra búsqueda o filtro.');
    };

    document.getElementById('catSearch').addEventListener('input', e => { this.state.q = e.target.value; apply(); });
    catSel.addEventListener('change', e => { this.state.cat = e.target.value; apply(); });
    document.getElementById('levelFilter').addEventListener('change', e => { this.state.level = e.target.value; apply(); });
    document.getElementById('levelFilter').value = this.state.level;
    apply();
  }
};
