// ============================================================
// AulaDoc — Servidor (API REST + archivos estáticos)
// ============================================================
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Videos de la serie "Neurociencia en el Aula" (clase-neurociencia/)
app.use('/media', express.static(path.join(__dirname, 'clase-neurociencia'), {
  setHeaders: (res) => res.setHeader('Accept-Ranges', 'bytes')
}));

const PORT = process.env.PORT || 3000;

// ---------- Base de datos (JSON persistente) ----------
const DB_FILE = path.join(__dirname, 'data', 'db.json');

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { console.error('db corrupta, usando seed:', e.message); }
  }
  return require('./data/seed');
}
let db = loadDb();

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) { console.error('Error guardando db:', e.message); }
  }, 150);
}
const uid = p => `${p}-${crypto.randomBytes(4).toString('hex')}`;

// ---------- Sesiones ----------
const sessions = new Map(); // token -> userId

function publicUser(u) { const { password, ...rest } = u; return rest; }
function findUser(email) { return db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase().trim()); }

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const userId = sessions.get(token);
  const user = userId && db.users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ error: 'Sesión no válida. Inicia sesión nuevamente.' });
  req.user = user;
  next();
}
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'No tienes permisos para esta acción.' });

// ---------- Helpers de dominio ----------
const totalLessons = c => c.modules.reduce((n, m) => n + m.lessons.length, 0);
const allLessons = c => c.modules.flatMap(m => m.lessons);
const everyLesson = () => db.courses.flatMap(c => c.modules.flatMap(m => m.lessons));
const getEnrollment = (userId, courseId) => db.enrollments.find(e => e.userId === userId && e.courseId === courseId);

function courseProgress(course, enrollment) {
  const total = totalLessons(course);
  const done = enrollment ? enrollment.completedLessons.length : 0;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function syncCourseCompletion(enrollment) {
  const course = db.courses.find(c => c.id === enrollment.courseId);
  if (!course) return;
  const { done, total } = courseProgress(course, enrollment);
  if (total > 0 && done >= total && !enrollment.completedAt) {
    enrollment.completedAt = new Date().toISOString();
    if (!db.certificates.some(ct => ct.userId === enrollment.userId && ct.courseId === enrollment.courseId)) {
      const seq = String(db.certificates.length + 1).padStart(4, '0');
      db.certificates.push({
        id: uid('cert'), userId: enrollment.userId, courseId: enrollment.courseId,
        issuedAt: enrollment.completedAt, code: `AD-${new Date().getFullYear()}-${seq}`
      });
    }
  } else if (done < total && enrollment.completedAt) {
    enrollment.completedAt = null;
    db.certificates = db.certificates.filter(ct => !(ct.userId === enrollment.userId && ct.courseId === enrollment.courseId));
  }
  save();
}

function decorateCourse(course, user) {
  const enr = user ? getEnrollment(user.id, course.id) : null;
  const prog = courseProgress(course, enr);
  const instructor = db.users.find(u => u.id === course.instructorId);
  const enrolledCount = db.enrollments.filter(e => e.courseId === course.id).length;
  const completedCount = db.enrollments.filter(e => e.courseId === course.id && e.completedAt).length;
  return {
    ...course,
    instructorName: instructor ? instructor.name : '—',
    enrolledCount,
    completedCount,
    progress: prog,
    enrolled: !!enr,
    completedAt: enr ? enr.completedAt : null
  };
}

function validCourseBody(body) {
  const need = ['title', 'description', 'category', 'level', 'hours'];
  for (const k of need) if (!body[k] || !String(body[k]).trim()) return `Falta el campo "${k}".`;
  if (!Array.isArray(body.modules) || body.modules.length === 0) return 'El curso debe tener al menos un módulo.';
  for (const [i, m] of body.modules.entries()) {
    if (!m.title || !String(m.title).trim()) return `El módulo ${i + 1} no tiene título.`;
    if (!Array.isArray(m.lessons) || m.lessons.length === 0) return `El módulo "${m.title}" debe tener al menos una lección.`;
    for (const l of m.lessons) if (!l.title || !String(l.title).trim()) return 'Hay una lección sin título.';
  }
  return null;
}

// ============================================================
// AUTH
// ============================================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = findUser(email);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Completa todos los campos.' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  if (findUser(email)) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  const user = { id: uid('u'), name: name.trim(), email: email.trim().toLowerCase(), password, role: 'colaborador', createdAt: new Date().toISOString() };
  db.users.push(user);
  save();
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));

// ============================================================
// CATÁLOGO Y CURSOS
// ============================================================
app.get('/api/catalog', auth, (req, res) => {
  const courses = db.courses.filter(c => c.published || req.user.role === 'admin' || c.instructorId === req.user.id)
    .map(c => decorateCourse(c, req.user));
  res.json(courses);
});

app.get('/api/courses/:id', auth, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado.' });
  if (!course.published && req.user.role !== 'admin' && course.instructorId !== req.user.id)
    return res.status(404).json({ error: 'Curso no encontrado.' });
  const enr = getEnrollment(req.user.id, course.id);
  const data = decorateCourse(course, req.user);
  // Estado de cada lección para el usuario actual
  const doneSet = new Set(enr ? enr.completedLessons : []);
  data.modules = course.modules.map(m => ({
    ...m,
    lessons: m.lessons.map(l => ({ ...l, completed: doneSet.has(l.id) }))
  }));
  res.json(data);
});

app.get('/api/courses/:id/material.txt', auth, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado.' });
  const lines = [];
  lines.push(`GUÍA DEL CURSO — ${course.title.toUpperCase()}`);
  lines.push(`Instructora/or: ${db.users.find(u => u.id === course.instructorId)?.name}`);
  lines.push(`Duración: ${course.hours} horas | Nivel: ${course.level} | ${course.category}`);
  lines.push('='.repeat(60), '');
  for (const m of course.modules) {
    lines.push(`\n## ${m.title}`);
    for (const l of m.lessons) {
      lines.push(`\n### ${l.title} (${l.minutes} min)`);
      lines.push(l.description);
      if (l.material) lines.push(`\nMaterial: ${l.material}`);
    }
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="guia-${course.id}.txt"`);
  res.send(lines.join('\n'));
});

// ============================================================
// INSCRIPCIONES Y PROGRESO
// ============================================================
app.post('/api/courses/:id/enroll', auth, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado.' });
  if (getEnrollment(req.user.id, course.id)) return res.status(409).json({ error: 'Ya estás inscrito/a en este curso.' });
  if (course.instructorId === req.user.id && req.user.role === 'instructor')
    return res.status(400).json({ error: 'Un instructor no puede inscribirse en su propio curso.' });
  db.enrollments.push({ id: uid('e'), userId: req.user.id, courseId: course.id, enrolledAt: new Date().toISOString(), completedLessons: [], completedAt: null });
  save();
  res.json(decorateCourse(course, req.user));
});

app.delete('/api/courses/:id/enroll', auth, (req, res) => {
  const idx = db.enrollments.findIndex(e => e.userId === req.user.id && e.courseId === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'No estás inscrito/a en este curso.' });
  db.enrollments.splice(idx, 1);
  db.certificates = db.certificates.filter(ct => !(ct.userId === req.user.id && ct.courseId === req.params.id));
  save();
  res.json({ ok: true });
});

app.post('/api/lessons/:lessonId/complete', auth, (req, res) => {
  const { lessonId } = req.params;
  const { completed = true } = req.body || {};
  const lesson = everyLesson().find(l => l.id === lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lección no encontrada.' });
  const course = db.courses.find(c => c.modules.some(m => m.lessons.some(l => l.id === lessonId)));
  const enr = getEnrollment(req.user.id, course.id);
  if (!enr) return res.status(403).json({ error: 'Debes inscribirte al curso primero.' });
  enr.completedLessons = enr.completedLessons.filter(x => x !== lessonId);
  if (completed) enr.completedLessons.push(lessonId);
  syncCourseCompletion(enr);
  const prog = courseProgress(course, enr);
  res.json({ lessonId, completed, progress: prog, completedAt: enr.completedAt });
});

// ============================================================
// PANELES PERSONALES
// ============================================================
app.get('/api/me/dashboard', auth, (req, res) => {
  const myEnr = db.enrollments.filter(e => e.userId === req.user.id);
  const courses = db.courses.filter(c => c.published);
  const enrolledCourses = myEnr.map(e => {
    const c = courses.find(x => x.id === e.courseId);
    if (!c) return null;
    const dec = decorateCourse(c, req.user);
    const doneSet = new Set(e.completedLessons || []);
    dec.modules = dec.modules.map(m => ({ ...m, lessons: m.lessons.map(l => ({ ...l, completed: doneSet.has(l.id) })) }));
    return dec;
  }).filter(Boolean);
  const inProgress = enrolledCourses.filter(c => !c.completedAt && c.progress.total > 0 && c.progress.done > 0);
  const completed = enrolledCourses.filter(c => c.completedAt);
  const notStarted = enrolledCourses.filter(c => c.progress.done === 0);
  // Recomendados: no inscritos, priorizando misma categoría que los cursos en curso
  const myCats = new Set(enrolledCourses.map(c => c.category));
  const recommended = courses.filter(c => !myEnr.some(e => e.courseId === c.id))
    .map(c => decorateCourse(c, req.user))
    .sort((a, b) => (myCats.has(b.category) ? 1 : 0) - (myCats.has(a.category) ? 1 : 0))
    .slice(0, 4);
  const certs = db.certificates.filter(ct => ct.userId === req.user.id);
  res.json({
    stats: {
      inProgress: inProgress.length,
      completed: completed.length,
      certificates: certs.length,
      hoursDone: completed.reduce((n, c) => n + c.hours, 0)
    },
    inProgress, completed, notStarted, recommended
  });
});

app.get('/api/me/certificates', auth, (req, res) => {
  const certs = db.certificates.filter(ct => ct.userId === req.user.id).map(ct => {
    const c = db.courses.find(x => x.id === ct.courseId);
    return { ...ct, course: c ? { id: c.id, title: c.title, hours: c.hours, cover: c.cover, instructorName: db.users.find(u => u.id === c.instructorId)?.name } : null };
  });
  res.json(certs);
});

// ============================================================
// INSTRUCTOR
// ============================================================
app.get('/api/instructor/courses', auth, allow('instructor', 'admin'), (req, res) => {
  const mine = db.courses.filter(c => c.instructorId === req.user.id);
  res.json(mine.map(c => {
    const enrs = db.enrollments.filter(e => e.courseId === c.id);
    const students = enrs.map(e => {
      const u = db.users.find(x => x.id === e.userId);
      const prog = courseProgress(c, e);
      return { id: e.id, student: u ? { id: u.id, name: u.name, email: u.email } : null, enrolledAt: e.enrolledAt, ...prog, completedAt: e.completedAt };
    });
    const completed = students.filter(s => s.completedAt).length;
    return decorateCourse(c, req.user) && { ...c, progress: courseProgress(c, null), students, completedCount: completed, enrolledCount: students.length };
  }));
});

// ============================================================
// ADMIN — ESTADÍSTICAS
// ============================================================
app.get('/api/admin/stats', auth, allow('admin'), (req, res) => {
  const totalUsers = db.users.length;
  const totalCourses = db.courses.length;
  const totalEnrollments = db.enrollments.length;
  const totalCerts = db.certificates.length;
  const byRole = {};
  for (const u of db.users) byRole[u.role] = (byRole[u.role] || 0) + 1;
  const perCourse = db.courses.map(c => {
    const enrs = db.enrollments.filter(e => e.courseId === c.id);
    const completed = enrs.filter(e => e.completedAt).length;
    return {
      id: c.id, title: c.title, cover: c.cover, published: c.published,
      enrolled: enrs.length, completed, rate: enrs.length ? Math.round((completed / enrs.length) * 100) : 0
    };
  }).sort((a, b) => b.enrolled - a.enrolled);
  const recentCerts = [...db.certificates].sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)).slice(0, 5)
    .map(ct => ({ ...ct, user: db.users.find(u => u.id === ct.userId)?.name, course: db.courses.find(c => c.id === ct.courseId)?.title }));
  res.json({ totalUsers, totalCourses, totalEnrollments, totalCerts, byRole, perCourse, recentCerts });
});

// ============================================================
// ADMIN — USUARIOS
// ============================================================
app.get('/api/admin/users', auth, allow('admin'), (req, res) => {
  res.json(db.users.map(u => {
    const enrs = db.enrollments.filter(e => e.userId === u.id);
    const coursesDone = enrs.filter(e => e.completedAt).length;
    return {
      ...publicUser(u),
      coursesEnrolled: enrs.length,
      coursesDone,
      courses: enrs.map(e => ({ id: e.courseId, completedAt: e.completedAt }))
    };
  }));
});

app.post('/api/admin/users', auth, allow('admin'), (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Completa nombre, correo y contraseña.' });
  if (findUser(email)) return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
  const user = { id: uid('u'), name: name.trim(), email: email.trim().toLowerCase(), password, role: ['colaborador', 'instructor', 'admin'].includes(role) ? role : 'colaborador', createdAt: new Date().toISOString() };
  db.users.push(user);
  save();
  res.status(201).json(publicUser(user));
});

app.patch('/api/admin/users/:id', auth, allow('admin'), (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (req.body.role && ['colaborador', 'instructor', 'admin'].includes(req.body.role)) user.role = req.body.role;
  if (req.body.name && String(req.body.name).trim()) user.name = req.body.name.trim();
  save();
  res.json(publicUser(user));
});

app.delete('/api/admin/users/:id', auth, allow('admin'), (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const [removed] = db.users.splice(idx, 1);
  db.enrollments = db.enrollments.filter(e => e.userId !== removed.id);
  db.certificates = db.certificates.filter(ct => ct.userId !== removed.id);
  save();
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/enroll', auth, allow('admin'), (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  const course = db.courses.find(c => c.id === req.body.courseId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (!course) return res.status(404).json({ error: 'Curso no encontrado.' });
  if (getEnrollment(user.id, course.id)) return res.status(409).json({ error: 'Ya está inscrito/a.' });
  db.enrollments.push({ id: uid('e'), userId: user.id, courseId: course.id, enrolledAt: new Date().toISOString(), completedLessons: [], completedAt: null });
  save();
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id/enroll/:courseId', auth, allow('admin'), (req, res) => {
  db.enrollments = db.enrollments.filter(e => !(e.userId === req.params.id && e.courseId === req.params.courseId));
  db.certificates = db.certificates.filter(ct => !(ct.userId === req.params.id && ct.courseId === req.params.courseId));
  save();
  res.json({ ok: true });
});

// ============================================================
// ADMIN — CURSOS (CRUD)
// ============================================================
app.post('/api/admin/courses', auth, allow('admin'), (req, res) => {
  const err = validCourseBody(req.body);
  if (err) return res.status(400).json({ error: err });
  const instructor = db.users.find(u => u.id === req.body.instructorId && u.role === 'instructor');
  if (!instructor) return res.status(400).json({ error: 'Selecciona un instructor válido.' });
  const course = {
    id: uid('c'), title: req.body.title.trim(), description: req.body.description.trim(),
    category: req.body.category.trim(), level: req.body.level, hours: Number(req.body.hours) || 1,
    cover: req.body.cover || '/img/covers/c1.jpg', instructorId: instructor.id,
    published: !!req.body.published, createdAt: new Date().toISOString(),
    modules: req.body.modules.map(m => ({ id: uid('m'), title: m.title.trim(), lessons: m.lessons.map(l => ({ id: uid('l'), title: l.title.trim(), minutes: Number(l.minutes) || 5, video: l.video || '', description: l.description || '', material: l.material || '' })) }))
  };
  db.courses.push(course);
  save();
  res.status(201).json(course);
});

app.put('/api/admin/courses/:id', auth, allow('admin'), (req, res) => {
  const idx = db.courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Curso no encontrado.' });
  const err = validCourseBody(req.body);
  if (err) return res.status(400).json({ error: err });
  const instructor = db.users.find(u => u.id === req.body.instructorId && ['instructor', 'admin'].includes(u.role));
  if (!instructor) return res.status(400).json({ error: 'Selecciona un instructor válido.' });
  const old = db.courses[idx];
  db.courses[idx] = {
    ...old, title: req.body.title.trim(), description: req.body.description.trim(),
    category: req.body.category.trim(), level: req.body.level, hours: Number(req.body.hours) || 1,
    cover: req.body.cover || old.cover, instructorId: instructor.id, published: !!req.body.published,
    modules: req.body.modules.map(m => ({ id: uid('m'), title: m.title.trim(), lessons: m.lessons.map(l => ({ id: uid('l'), title: l.title.trim(), minutes: Number(l.minutes) || 5, video: l.video || '', description: l.description || '', material: l.material || '' })) }))
  };
  // Limpiar progreso obsoleto de lecciones que ya no existen
  const lessonIds = new Set(allLessons(db.courses[idx]).map(l => l.id));
  for (const e of db.enrollments.filter(e => e.courseId === old.id)) {
    e.completedLessons = e.completedLessons.filter(id => lessonIds.has(id));
    syncCourseCompletion(e);
  }
  save();
  res.json(db.courses[idx]);
});

app.delete('/api/admin/courses/:id', auth, allow('admin'), (req, res) => {
  const idx = db.courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Curso no encontrado.' });
  const [removed] = db.courses.splice(idx, 1);
  db.enrollments = db.enrollments.filter(e => e.courseId !== removed.id);
  db.certificates = db.certificates.filter(ct => ct.courseId !== removed.id);
  save();
  res.json({ ok: true });
});

// ============================================================
// Arranque
// ============================================================
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AulaDoc corriendo en http://0.0.0.0:${PORT}`);
  console.log(`Usuarios demo: admin@auladoc.cl/1234B · maria@auladoc.cl/docente123 · carlos@auladoc.cl/alumno123`);
});
