/* questions/*.txt (한국어·영어·일본어 질문 원본) →
 *   js/data-questions.js  (window.QSET, 한국어)
 *   js/i18n-en-q.js       (영어 제목·A안·B안)
 *   js/i18n-ja-q.js       (일본어 제목·A안·B안)
 * 사용법: node tools/build_questions.js        (생성 + 검사)
 *         node tools/build_questions.js --check (검사만)
 *
 * 원본 형식 (빈 줄로 질문 구분, #으로 시작하는 줄은 주석)
 *   == 분야 축 시점 A정당>B정당 : 정당=위치 정당=위치 …
 *   ko 제목 | A안 | B안
 *   en Title | Option A | Option B
 *   ja 題名 | A案 | B案
 *   분야: pol con dip eco wel soc reg / 축: e(경제) s(사회) .(없음) / 시점: 1927.6 또는 .
 *   위치: -1 = A안, 1 = B안. 적지 않은 정당은 그 정당의 성향값(l)을 씁니다. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const MIN = 27, MAX = 52, FIELDS = ['pol', 'con', 'dip', 'eco', 'wel', 'soc', 'reg'];

const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data-elections-early', 'data-elections']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx);
const byN = {}; ctx.DATA.forEach(a => byN[a.n] = a);

const errs = [], QSET = {}, EN = {}, JA = {};
const dir = path.join(ROOT, 'questions');
for (const file of fs.readdirSync(dir).filter(f => /^\d+-\d{4}\.txt$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b))) {
  const n = parseInt(file), a = byN[n];
  if (!a) { errs.push(`${file}: DATA에 제${n}회가 없음`); continue; }
  const keys = new Set(a.P.map(p => p.k));
  const blocks = fs.readFileSync(path.join(dir, file), 'utf8').split(/\r?\n/).filter(l => !l.startsWith('#'))
    .join('\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  QSET[n] = []; EN[n] = []; JA[n] = [];
  const seen = new Set();
  blocks.forEach((b, i) => {
    const where = `${file} #${i + 1}`;
    const lines = b.split('\n').map(l => l.trim());
    const m = /^==\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)>(\S+)\s*:\s*(.*)$/.exec(lines[0] || '');
    if (!m) { errs.push(`${where}: 첫 줄 형식 오류 → ${lines[0]}`); return; }
    const [, f, ax, w, L, R, ps] = m;
    if (!FIELDS.includes(f)) errs.push(`${where}: 분야 ${f}`);
    if (!['e', 's', '.'].includes(ax)) errs.push(`${where}: 축 ${ax}`);
    if (w !== '.' && !/^\d{4}(\.\d{1,2})?$/.test(w)) errs.push(`${where}: 시점 ${w}`);
    if (w !== '.') {
      const [wy, wm] = w.split('.').map(Number), [ey, em] = a.date.split('.').map(Number);
      if (wy > ey || (wy === ey && (wm || 0) > em)) errs.push(`${where}: 시점 ${w}이 선거(${a.date}) 뒤`);
    }
    for (const k of [L, R]) if (!keys.has(k)) errs.push(`${where}: 정당 키 ${k}`);
    const p = {};
    for (const kv of ps.split(/\s+/).filter(Boolean)) {
      const [k, v] = kv.split('=');
      if (!keys.has(k)) errs.push(`${where}: 위치 정당 키 ${k}`);
      const x = Number(v);
      if (!Number.isFinite(x) || x < -1 || x > 1) errs.push(`${where}: 위치 값 ${kv}`);
      p[k] = x;
    }
    if (p[L] != null && p[R] != null && !(p[L] < p[R])) errs.push(`${where}: A정당(${L}) 위치가 B정당(${R})보다 작아야 함`);
    const tri = {};
    for (const l of lines.slice(1)) {
      const lang = l.slice(0, 2), parts = l.slice(3).split('|').map(s => s.trim());
      if (!['ko', 'en', 'ja'].includes(lang) || parts.length !== 3 || parts.some(s => !s)) { errs.push(`${where}: 줄 형식 오류 → ${l.slice(0, 60)}`); continue; }
      tri[lang] = parts;
    }
    for (const lang of ['ko', 'en', 'ja']) if (!tri[lang]) { errs.push(`${where}: ${lang} 줄 없음`); return; }
    if (seen.has(tri.ko[0])) errs.push(`${where}: 같은 제목 중복 ${tri.ko[0]}`); seen.add(tri.ko[0]);
    if (/[가-힣]/.test(tri.en.join('') + tri.ja.join(''))) errs.push(`${where}: en/ja 줄에 한글`);
    QSET[n].push([tri.ko[0], L, R, tri.ko[1], tri.ko[2], p, ax === '.' ? '' : ax, f, w === '.' ? '' : w]);
    EN[n].push(tri.en); JA[n].push(tri.ja);
  });
  const c = QSET[n].length;
  if (c < MIN || c > MAX) errs.push(`${file}: 질문 ${c}개 (허용 ${MIN}–${MAX})`);
  const fs_ = new Set(QSET[n].map(q => q[7]));
  for (const f of FIELDS) if (!fs_.has(f)) errs.push(`${file}: 분야 ${f} 질문 없음`);
}
for (const a of ctx.DATA) if (!QSET[a.n]) errs.push(`제${a.n}회 질문 파일 없음`);

const total = Object.values(QSET).reduce((s, q) => s + q.length, 0);
const counts = Object.keys(QSET).map(n => `${n}:${QSET[n].length}`).join(' ');
if (errs.length) { console.error(errs.join('\n')); console.error(`\n오류 ${errs.length}개`); }
console.log(`총선 ${Object.keys(QSET).length}회 · 질문 ${total}개\n${counts}`);
if (process.argv.includes('--check')) process.exit(errs.length ? 1 : 0);
if (errs.length && !process.argv.includes('--force')) process.exit(1);

const J = v => JSON.stringify(v);
const head = '/* 자동 생성 파일 — 직접 고치지 말고 questions/*.txt를 고친 뒤 node tools/build_questions.js */\n';
let ko = head + '// [제목, A안 정당, B안 정당, A안, B안, {정당: -1(A)…1(B)}, 축, 분야, 시점]\nwindow.QSET = {\n';
for (const n in QSET) ko += `${n}: [\n` + QSET[n].map(q => ' ' + J(q)).join(',\n') + '\n],\n';
fs.writeFileSync(path.join(ROOT, 'js', 'data-questions.js'), ko + '};\n');
const tr = (obj) => head + '(function (E) {\n  const Q = {\n' +
  Object.keys(obj).map(n => `${n}: [\n` + obj[n].map(q => '  ' + J(q)).join(',\n') + '\n]').join(',\n') +
  '\n  };\n  for (const n in Q) (E[n] = E[n] || {}).Q = Q[n];\n})(I18N.data.E = I18N.data.E || {});\n';
fs.writeFileSync(path.join(ROOT, 'js', 'i18n-en-q.js'), tr(EN));
fs.writeFileSync(path.join(ROOT, 'js', 'i18n-ja-q.js'), tr(JA));
console.log('js/data-questions.js, js/i18n-en-q.js, js/i18n-ja-q.js 생성');
