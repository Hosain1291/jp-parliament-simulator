/* 화면: 1 총선 고르기 → 2 분야 중요도 → 3 질문(막대) → 4 분야별 의석 발표 → 5 결과
   결과: 반원 의석 → 내각총리대신 지명선거 → 선거 결과 인포박스 → 도도부현 지도 → 분야별 의석 → 스펙트럼 → 정족수 → 연립·내각 → 일치도 → 질문별 표결 */
(function () {
'use strict';
const E = window.JPEngine, { lr, sum, clamp, maj, two3, pos, LV } = E;

const FIELDS = [
  { k: 'pol', n: '정치·행정', c: '#5b6fa8', d: '선거제도·정치자금·행정개혁·스캔들' },
  { k: 'con', n: '헌법·안보', c: '#9a4a4a', d: '헌법 9조·자위대·미일동맹·오키나와 기지' },
  { k: 'dip', n: '외교·역사', c: '#3f7fa8', d: '중국·한반도·역사 인식·야스쿠니' },
  { k: 'eco', n: '경제·재정', c: '#3e8a6e', d: '소비세·재정·금융·민영화·무역' },
  { k: 'wel', n: '사회보장·노동', c: '#b0753a', d: '연금·의료·육아·고용·최저임금' },
  { k: 'soc', n: '사회·인권', c: '#9a5fa0', d: '부부별성·동성혼·치안·외국인·황실' },
  { k: 'reg', n: '지역·에너지', c: '#7a8a3a', d: '원전·공공사업·지방분권·농업·카지노' }];
const FK = FIELDS.map(F => F.k), fld = k => FIELDS.find(F => F.k === k);

// 내각 부처(시기별). 분야와 연결해 연립 정당이 강한 분야의 부처를 먼저 고릅니다.
const MINS = {
  old: '내각총리대신 내각관방장관 법무대신 외무대신 대장대신 문부대신 후생대신 농림수산대신 통상산업대신 운수대신 우정대신 노동대신 건설대신 자치대신 국가공안위원장 방위청장관 경제기획청장관 과학기술청장관 환경청장관 국토청장관 홋카이도·오키나와개발청장관',
  y2001: '내각총리대신 내각관방장관 총무대신 법무대신 외무대신 재무대신 문부과학대신 후생노동대신 농림수산대신 경제산업대신 국토교통대신 환경대신 국가공안위원장 방위청장관 금융담당대신 경제재정담당대신 오키나와·북방담당대신',
  y2007: '내각총리대신 내각관방장관 총무대신 법무대신 외무대신 재무대신 문부과학대신 후생노동대신 농림수산대신 경제산업대신 국토교통대신 환경대신 방위대신 국가공안위원장 금융담당대신 경제재정담당대신 오키나와·북방담당대신',
  y2012: '내각총리대신 내각관방장관 총무대신 법무대신 외무대신 재무대신 문부과학대신 후생노동대신 농림수산대신 경제산업대신 국토교통대신 환경대신 방위대신 부흥대신 국가공안위원장 금융담당대신 경제재정담당대신 오키나와·북방담당대신',
  y2021: '내각총리대신 내각관방장관 총무대신 법무대신 외무대신 재무대신 문부과학대신 후생노동대신 농림수산대신 경제산업대신 국토교통대신 환경대신 방위대신 디지털대신 부흥대신 국가공안위원장 경제안보담당대신 경제재정담당대신 오키나와·북방담당대신'
};
const MINF = m => /관방|총무|디지털/.test(m) ? 'pol' : /외무/.test(m) ? 'dip' : /방위/.test(m) ? 'con' : /대장|재무|통상|경제|금융|우정/.test(m) ? 'eco'
  : /후생|노동/.test(m) ? 'wel' : /법무|문부|과학|공안/.test(m) ? 'soc' : 'reg';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app'), toHome = $('#toHome');
const ld = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

const S = { ai: DATA.length - 1, ans: [], fimp: {}, fcnt: {}, order: [], seq: [], qi: 0, prior: true, view: 'mine', plan: null, runoff: {}, pick: [], cab: null, cabSt: null, sel: 'JP13', pickTouched: false };
{ const v = +ld('jp-sel', -1); if (v >= 0 && v < DATA.length) S.ai = v; }

let A = null, M = null;
function load() {
  const d = DATA[S.ai];
  A = Object.assign({}, d, { Q: (QSET[d.n] || []).map(([t, L, R, Aa, B, p, ax, f, w]) => ({ t, L, R, A: Aa, B, p, ax, f, w })) });
  M = E.make(A, { fimp: S.fimp, prior: S.prior, FK });
  S.plan = null; S.runoff = {}; S.pick = []; S.cab = null; S.cabSt = null; S.pickTouched = false;
}
const remake = () => { M = E.make(A, { fimp: S.fimp, prior: S.prior, FK }); };
const party = k => A.P.find(p => p.k === k);
const actual = () => A.P.map(p => p.s);
const plain = st => ({ dist: A.P.map(p => p.sd), list: A.P.map(p => p.sp), tot: st });
const PA = { n: 'A안', c: 'var(--pa)' }, PB = { n: 'B안', c: 'var(--pb)' };
const asmName = a => '제' + a.n + '회 총선';
const fmtDate = d => d.replace(/^(\d+)\.(\d+)\.(\d+)$/, '$1년 $2월 $3일');
const leanOrder = () => A.P.map((p, f) => f).sort((x, y) => A.P[x].l - A.P[y].l || x - y);
const mark = (p, sz) => '<i class="dot" style="background:' + p.c + (sz ? ';width:' + sz + 'px;height:' + sz + 'px' : '') + '"></i>';
function whenTxt(q) {
  if (!q.w) return '선거 당시 쟁점';
  const [y, m] = q.w.split('.').map(Number), [ey, em] = A.date.split('.').map(Number), d = (ey - y) * 12 + (em - (m || em));
  return y + '년' + (m ? ' ' + m + '월' : '') + ' · ' + (d <= 0 ? '선거 직전' : d < 12 ? '선거 ' + d + '개월 전' : '선거 ' + Math.floor(d / 12) + '년' + (d % 12 ? ' ' + (d % 12) + '개월' : '') + ' 전');
}
const stable = N => N === 465 ? [244, 261] : N === 475 ? [249, 266] : N === 480 ? [252, 269] : null;

/* ── 테마 */
function setSkin(v) {
  if (v === 'auto') document.documentElement.removeAttribute('data-skin'); else document.documentElement.setAttribute('data-skin', v);
  $$('#skin button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.skin === v))); sv('jp-skin', v);
}
$('#skin').addEventListener('click', e => { const b = e.target.closest('button[data-skin]'); if (b) setSkin(b.dataset.skin); });
setSkin(ld('jp-skin', 'auto'));
toHome.addEventListener('click', () => viewHome());
document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="jp-sketch" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter></defs></svg><div class="tip" id="tip" hidden></div>');

/* ── 반원 부채꼴 의석: 동심원 줄에 좌석을 놓고 각도 순으로 정렬해 정당마다 부채꼴 조각이 되게 합니다 */
function layout(N) {
  const inner = 0.36, cap = R => { let s = 0; const sp = (1 - inner) / R; for (let i = 0; i < R; i++) s += Math.floor(Math.PI * (inner + sp * (i + 0.5)) / sp); return s; };
  let R = 1; while (cap(R) < N && R < 60) R++;
  const sp = (1 - inner) / R, radii = [...Array(R)].map((_, i) => inner + sp * (i + 0.5)), counts = lr(radii, N), seats = [];
  radii.forEach((r, i) => { const n = counts[i]; for (let j = 0; j < n; j++) seats.push({ t: n === 1 ? Math.PI / 2 : Math.PI * (1 - j / (n - 1)), r }); });
  seats.sort((a, b) => b.t - a.t || a.r - b.r);
  return { seats, rad: sp * 0.4 };
}
function hemiSvg(N) {
  const L = layout(N), K = 290, r = K * L.rad;
  return '<svg viewBox="0 0 600 312" role="img" aria-label="본회의장 의석 배치" data-rw="' + (r * 0.42).toFixed(2) + '"><g class="seatg">' +
    L.seats.map(s => '<circle class="seat" cx="' + (300 + K * s.r * Math.cos(s.t)).toFixed(1) + '" cy="' + (302 - K * s.r * Math.sin(s.t)).toFixed(1) + '" r="' + r.toFixed(2) + '" fill="var(--line)"/>').join('') + '</g>' +
    '<line class="mj" x1="300" y1="' + (302 - K * 0.33) + '" x2="300" y2="6"/>' +
    '<text class="big" x="300" y="268" text-anchor="middle">' + N + '</text><text class="sm" x="300" y="296" text-anchor="middle">석</text></svg>';
}
const SEATPREV = {};
const noMo = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return true; } };
const ringFill = c => 'color-mix(in srgb, ' + c + ' 24%, var(--surface))';
function seatAnim(el, keys) {
  const id = el.id || '', prev = SEATPREV[id], same = prev && prev.length === keys.length, seats = $$('.seat', el), ch = [];
  SEATPREV[id] = keys; seats.forEach(c => { c.classList.remove('s-in', 's-out', 's-sw'); c.style.animationDelay = ''; });
  if (noMo()) return;
  const fillOf = k => { const [c, r] = k.split('|'); return r ? ringFill(c) : c; };
  keys.forEach((k, i) => { const p = same ? prev[i] : ''; if (k && p && k !== p) ch.push([i, 's-sw', p]); else if (k && k !== p) ch.push([i, 's-in']); else if (!k && p) ch.push([i, 's-out']); });
  if (!ch.length) return; void el.getBoundingClientRect();
  const span = Math.min(750, ch.length * 18);
  ch.forEach(([i, cl, p], j) => { const c = seats[i]; if (p) { c.style.setProperty('--old', fillOf(p)); c.style.setProperty('--new', fillOf(keys[i])); } c.style.animationDelay = (ch.length > 1 ? Math.round(j / (ch.length - 1) * span) : 0) + 'ms'; c.classList.add(cl); });
}
function paint(el, R, label, big) {
  const seq = []; leanOrder().forEach(f => { const c = A.P[f].c; for (let k = 0; k < R.dist[f]; k++) seq.push({ c, ring: false }); for (let k = 0; k < R.list[f]; k++) seq.push({ c, ring: true }); });
  const rw = $('svg', el).dataset.rw;
  $$('.seat', el).forEach((c, i) => {
    const s = seq[i];
    if (!s) { c.setAttribute('fill', 'var(--line)'); c.setAttribute('stroke', 'none'); return; }
    if (s.ring) { c.setAttribute('fill', ringFill(s.c)); c.setAttribute('stroke', s.c); c.setAttribute('stroke-width', rw * 2.2); }
    else { c.setAttribute('fill', s.c); c.setAttribute('stroke', 'var(--seat-edge)'); c.setAttribute('stroke-width', rw); }
  });
  seatAnim(el, $$('.seat', el).map((c, i) => seq[i] ? seq[i].c + (seq[i].ring ? '|r' : '') : ''));
  if (label != null) $('.sm', el).textContent = label;
  if (big != null) $('.big', el).textContent = big;
}
function tweenNum(n, from, to) {
  if (!n) return; if (from === to || noMo()) { n.textContent = to; return; }
  const t0 = performance.now(), D = 900; n.textContent = from;
  const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); n.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ── 1. 총선 고르기 */
function sysBar(a) {
  const seg = [[a.D, 'var(--ink2)', '소선거구'], [a.L, 'var(--accent)', '비례대표(11개 블록)']];
  return '<div class="sysbar">' + seg.map(s => '<span style="width:' + (s[0] / a.N * 100) + '%;background:' + s[1] + '"></span>').join('') + '</div><div class="syslg">' + seg.map(s => '<span><i class="dot" style="background:' + s[1] + '"></i>' + s[2] + ' <b class="num">' + s[0] + '</b></span>').join('') + '</div>';
}
function viewHome() {
  toHome.hidden = true; window.scrollTo(0, 0);
  app.innerHTML = '<div class="stack">' +
    '<div class="intro"><h1>내가 뽑는 일본 중의원</h1><p>1996년 소선거구비례대표병립제 도입 이후 11번의 총선 가운데 하나를 고르세요. 분야마다 중요도를 정하면 그만큼 의석과 질문이 걸리고, 쟁점마다 막대를 움직여 답하면 당신의 입장대로 중의원이 다시 구성됩니다. 마지막에는 그 의석으로 내각총리대신 지명선거를 치릅니다.</p></div>' +
    '<section class="box"><div class="eras">' + ERAS.map(([nm, ns]) => '<div class="era"><span>' + esc(nm) + '</span><div class="row">' + ns.map(n => { const i = DATA.findIndex(d => d.n === n), d = DATA[i]; return '<button type="button" class="asm" data-ai="' + i + '" aria-pressed="' + (i === S.ai) + '"><b>제' + n + '회</b><small>' + d.y + '</small></button>'; }).join('') + '</div></div>').join('') + '</div></section>' +
    '<section class="box detail" id="detail"></section></div>';
  $$('.asm', app).forEach(b => b.addEventListener('click', () => { S.ai = +b.dataset.ai; sv('jp-sel', S.ai); load(); $$('.asm', app).forEach(x => x.setAttribute('aria-pressed', String(x === b))); detail(); }));
  detail();
}
function detail() {
  const a = A, el = $('#detail'), sorted = a.P.map((p, f) => f).sort((x, y) => a.P[y].s - a.P[x].s), ax = E.partyAx(a);
  el.innerHTML = '<span class="eyebrow">' + esc(a.era) + '</span><h2>제' + a.n + '회 중의원 의원 총선거</h2>' +
    '<dl class="facts"><div><dt>총선일</dt><dd class="num">' + a.date + '</dd></div><div><dt>임기</dt><dd class="num">' + a.term + '</dd></div><div><dt>총리</dt><dd>' + esc(a.pm) + '</dd></div><div><dt>의원 정수</dt><dd><span class="num">' + a.N + '</span>석 · 과반 <span class="num">' + maj(a.N) + '</span></dd></div></dl>' +
    '<p class="desc">' + esc(a.desc) + '</p>' +
    '<h3 style="margin-top:18px">정당 성향</h3><p class="hint sub">막대는 쟁점 입장 평균으로 계산한 위치입니다(왼쪽 리버럴·분배, 오른쪽 보수·시장). 숫자는 실제 의석(지역구+비례)입니다.</p>' +
    '<div class="plist">' + sorted.map(f => { const p = a.P[f], x = (ax[f].e + ax[f].s) / 2;
      return '<div class="prow">' + mark(p) + '<div><b>' + esc(p.n) + '</b><span class="ja">' + esc(p.ja) + '</span>' + (p.ldk ? ' <span class="hint">대표 ' + esc(p.ldk) + '</span>' : '') + (p.d ? '<small>' + esc(p.d) + '</small>' : '') +
        (p.k !== 'ind' ? '<div class="lean"><i style="left:' + ((clamp(x, -1, 1) + 1) / 2 * 100) + '%;background:' + p.c + '"></i></div>' : '') + '</div><span class="num">' + p.s + (p.s ? ' <small style="display:inline">(' + p.sd + '+' + p.sp + ')</small>' : '') + '</span></div>'; }).join('') + '</div>' +
    '<h3 style="margin-top:18px">선거제도와 실제 결과</h3>' + sysBar(a) +
    '<p class="hint" style="margin-top:8px">소선거구는 1위만 당선되고, 비례는 11개 블록에서 동트식으로 나눕니다. 이 시뮬레이터는 비례를 전국 단위로 단순화합니다.</p>' +
    '<div class="hemi" id="dh" style="margin-top:12px">' + hemiSvg(a.N) + '</div><div class="hlg"><span><i class="dot" style="background:var(--ink2)"></i>지역구</span><span><i class="ring"></i>비례</span></div>' +
    '<div class="opts" style="margin-top:16px"><label class="chk"><input type="checkbox" id="opt-prior"' + (S.prior ? ' checked' : '') + '><span>당시 지지 기반 반영<small>실제 의석이 많았던 정당이 같은 거리에서 조금 더 많은 표를 받습니다. 끄면 답변만으로 정해집니다.</small></span></label></div>' +
    '<div class="launch" style="margin-top:16px"><button type="button" class="cta" id="start">분야 정하고 시작하기</button><span>질문 ' + a.Q.length + '개 · 분야 ' + M.fieldsOf().length + '개</span></div>';
  paint($('#dh'), plain(actual()), '석 · 실제 결과', a.N);
  $('#opt-prior').addEventListener('change', e => { S.prior = e.target.checked; remake(); });
  $('#start').addEventListener('click', () => { FK.forEach(k => { S.fimp[k] = 2; }); viewPrio(); });
}

/* ── 2. 분야별 중요도 */
const segHtml = (k, lv, mini) => '<div class="seg5' + (mini ? ' mini' : '') + '" role="radiogroup" aria-label="' + esc(fld(k).n) + ' 중요도">' + LV.map((L, j) => '<button type="button" role="radio" data-f="' + k + '" data-l="' + j + '" aria-checked="' + (j === lv) + '">' + L.n + '</button>').join('') + '</div>';
const QR = [0, 0.4, 0.6, 0.8, 1];
function autoCount() { FK.forEach(k => { const max = M.qsOf(k).length, r = QR[S.fimp[k]] || 0; S.fcnt[k] = r ? Math.min(max, Math.max(1, Math.round(max * r))) : 0; }); }
const seatTxt = c => '지역구 ' + c.d + ' · 비례 ' + c.l;
function viewPrio() {
  toHome.hidden = false; window.scrollTo(0, 0); remake();
  const a = A, fs = M.fieldsOf(); FK.forEach(k => { if (S.fimp[k] == null) S.fimp[k] = 2; });
  app.innerHTML = '<section class="stack"><div><span class="eyebrow">' + asmName(a) + ' · ' + a.y + '</span><h2 style="font-size:clamp(24px,6vw,30px);margin-top:4px">분야별 중요도</h2>' +
    '<p class="lead">매우 중요한 분야일수록 많은 의석과 많은 질문이, 덜 중요한 분야일수록 적은 의석과 적은 질문이 걸립니다. “관심 없음”으로 둔 분야는 질문 없이 건너뜁니다.</p></div>' +
    '<div class="box"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--ink2)"><span>전체 ' + a.N + '석 배분</span><span class="num" id="ptot"></span></div><div class="fbar" id="pbar"></div><div class="syslg" id="plg"></div></div>' +
    '<div class="box" id="frows">' + fs.map(k => '<div class="frow" data-k="' + k + '"><div class="fh"><div><span class="fchip"><i class="dot" style="background:' + fld(k).c + '"></i>' + esc(fld(k).n) + '</span><small>' + esc(fld(k).d) + '</small></div><div class="fseats" data-s="' + k + '"></div></div>' + segHtml(k, S.fimp[k]) +
      '<div class="hint">질문 <b class="num" data-n="' + k + '"></b> <span>(중요도에 따라 자동)</span></div></div>').join('') + '</div>' +
    '<div class="launch"><button type="button" class="cta" id="go">질문 시작</button><span id="goinfo"></span></div></section>';
  const upd = () => {
    remake(); autoCount(); const act = fs.filter(k => M.fw(k) > 0 && S.fcnt[k] > 0), C2 = M.chunks(act), nq = sum(act.map(k => S.fcnt[k]));
    fs.forEach(k => { const on = act.includes(k); $('.frow[data-k="' + k + '"]', app).classList.toggle('off', !on);
      $('[data-s="' + k + '"]', app).innerHTML = on ? C2[k].t + '석<small>' + seatTxt(C2[k]) + '</small>' : '0석<small>건너뜀</small>';
      $('[data-n="' + k + '"]', app).textContent = on ? S.fcnt[k] + '개' : '없음';
      $$('[data-f="' + k + '"]', app).forEach(b => b.setAttribute('aria-checked', String(+b.dataset.l === S.fimp[k]))); });
    const segs = act.map(k => [C2[k].t, fld(k).c, fld(k).n]);
    $('#pbar').innerHTML = segs.map(s => '<span style="width:' + (s[0] / a.N * 100) + '%;background:' + s[1] + '"></span>').join('');
    $('#plg').innerHTML = segs.map(s => '<span><i class="dot" style="background:' + s[1] + '"></i>' + esc(s[2]) + ' <b class="num">' + s[0] + '</b></span>').join('');
    $('#ptot').textContent = act.length ? '분야 ' + act.length + '개 · 질문 ' + nq + '개' : '';
    $('#go').disabled = !act.length; $('#goinfo').textContent = act.length ? '질문 ' + nq + '개 · 덜 중요한 분야부터 묻습니다' : '최소 한 분야는 중요도를 정해 주세요';
  };
  $('#frows').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (!b) return; S.fimp[b.dataset.f] = +b.dataset.l; upd(); });
  $('#go').addEventListener('click', () => {
    autoCount(); const act = fs.filter(k => M.fw(k) > 0 && S.fcnt[k] > 0);
    FK.forEach(k => { if (!act.includes(k)) S.fimp[k] = 0; }); remake();
    S.order = act.slice().sort((x, y) => M.fw(x) - M.fw(y) || FK.indexOf(x) - FK.indexOf(y));
    S.seq = []; S.order.forEach(k => M.qsOf(k, S.fcnt[k]).forEach(i => S.seq.push(i)));
    S.ans = a.Q.map(() => undefined); S.qi = 0; S.plan = null; S.runoff = {}; S.pick = []; S.cab = null; S.cabSt = null; S.pickTouched = false; viewQuiz();
  });
  upd();
}

/* ── 3. 질문 */
const ICON = { prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9.5 12z"/></svg>', next: '<svg viewBox="0 0 24 24"><path d="M7 5v14l11-7z"/></svg>', end: '<svg viewBox="0 0 24 24"><path d="M4 5v14l9.5-7zM16 5h2v14h-2z"/></svg>' };
function chgHtml(B, R2) {
  const ord = A.P.map((p, f) => f).filter(f => R2.tot[f] || B.tot[f]).sort((x, y) => R2.tot[y] - R2.tot[x]);
  return ord.map(f => { const d = R2.tot[f] - B.tot[f]; return '<span>' + mark(A.P[f]) + esc(A.P[f].n) + ' <b>' + R2.tot[f] + '</b>' + (d ? '<em class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '−') + Math.abs(d) + '</em>' : '') + '</span>'; }).join('');
}
function viewQuiz() {
  toHome.hidden = false; window.scrollTo(0, 0);
  const a = A, i = S.seq[S.qi], q = a.Q[i], k = q.f, F = fld(k);
  const fq = S.seq.filter(j => a.Q[j].f === k), n = fq.indexOf(i), C2 = M.chunks(S.order)[k];
  const nxt = S.seq[S.qi + 1], endField = nxt == null || a.Q[nxt].f !== k, fi = S.order.indexOf(k);
  let cur = S.ans[i] == null ? null : S.ans[i], drag = false;
  const done = S.order.slice(0, fi + 1), base = M.simAll(S.ans.map((v, j) => j === i ? undefined : v), done);
  app.innerHTML = '<section>' +
    '<div class="qhead"><span class="eyebrow">' + asmName(a) + ' · 분야 ' + (fi + 1) + ' / ' + S.order.length + '</span><span class="eyebrow num">' + (S.qi + 1) + ' / ' + S.seq.length + '</span></div>' +
    '<div class="prog" aria-hidden="true">' + S.seq.map((j, x) => '<i class="' + (x === S.qi ? 'cur' : S.ans[j] === null ? 'skip' : S.ans[j] !== undefined ? 'done' : '') + '"' + (x && a.Q[S.seq[x - 1]].f !== a.Q[j].f ? ' style="margin-left:6px"' : '') + '></i>').join('') + '</div>' +
    '<div class="stakebox"><span class="fchip"><i class="dot" style="background:' + F.c + '"></i>' + esc(F.n) + '</span><span>이 분야에 걸린 의석 <b>' + C2.t + '석</b> (' + seatTxt(C2) + ')</span><span>분야 질문 <b>' + (n + 1) + ' / ' + fq.length + '</b></span></div>' +
    '<div class="qmeta" style="margin-top:12px"><b>질문 ' + (S.qi + 1) + '</b><span>' + esc(whenTxt(q)) + '</span></div>' +
    '<h2 class="qtitle">' + esc(q.t) + '</h2>' +
    '<div class="poles"><button type="button" class="pole l" style="--pc:' + PA.c + '" data-v="-1"><span class="pn"><i></i>A안</span><span class="ps">' + esc(q.A) + '</span><em>◂ 왼쪽 끝</em></button>' +
    '<button type="button" class="pole r" style="--pc:' + PB.c + '" data-v="1"><span class="pn">B안<i></i></span><span class="ps">' + esc(q.B) + '</span><em>오른쪽 끝 ▸</em></button></div>' +
    '<div class="player"><div class="track" id="track"><div class="rail"></div>' + [-1, -0.5, 0, 0.5, 1].map(t => '<div class="tick' + (t === 0 ? ' c' : '') + '" style="left:' + ((t + 1) / 2 * 100) + '%"></div>').join('') +
    '<div class="fill"></div><div class="bubble"></div><div class="thumb" role="slider" tabindex="0" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0" aria-label="' + esc(q.t) + ': 왼쪽 A안, 오른쪽 B안"></div></div>' +
    '<div class="time"><span>A안</span><span>중립</span><span>B안</span></div><p class="read" id="read" aria-live="polite"></p>' +
    '<div class="controls"><button type="button" class="ic" id="prev" aria-label="이전 질문"' + (S.qi ? '' : ' disabled') + '>' + ICON.prev + '</button>' +
    '<button type="button" class="play" id="next">' + (endField ? ICON.end + esc(F.n) + ' 결과' : ICON.next + '다음 질문') + '</button>' +
    '<button type="button" class="ic" id="skip" aria-label="잘 모르겠음, 건너뛰기" title="잘 모르겠음">?</button></div>' +
    '<div class="kbd">키보드: ← → 로 이동, Enter 로 다음 · ? 는 “잘 모르겠음”(이 질문의 지역구는 분야 비례 몫으로 넘어갑니다)</div></div>' +
    '<div class="box live"><div class="lvh"><b>지금까지 예상 의석</b><small>답한 분야까지의 의석입니다. 막대를 움직이면 이 질문의 몫이 바로 다시 계산됩니다.</small></div><div class="hemi" id="lh">' + hemiSvg(a.N) + '</div><div class="lv" id="lv"></div></div></section>';
  const tr = $('#track'), th = $('.thumb', tr), fill = $('.fill', tr), bub = $('.bubble', tr), lp = $('.pole.l', app), rp = $('.pole.r', app);
  const txt = v => { if (v === null) return '막대를 움직여 입장을 정하세요'; const m = Math.abs(v), side = v < 0 ? 'A안' : 'B안'; return m < 0.08 ? '정확히 가운데' : m < 0.4 ? side + ' 쪽으로 조금' : m < 0.8 ? side + ' 쪽으로 상당히' : side + '에 완전히 동의'; };
  let lt = 0;
  const live = () => { cancelAnimationFrame(lt); lt = requestAnimationFrame(() => { const ans = S.ans.slice(); ans[i] = cur; const R2 = M.simAll(ans, done); paint($('#lh'), R2, '석 중 ' + sum(R2.tot) + '석', a.N); $('#lv').innerHTML = chgHtml(base, R2); }); };
  const draw = anim => {
    const v = cur === null ? 0 : cur, x = (v + 1) / 2 * 100, col = cur === null || Math.abs(v) < 0.08 ? 'var(--ink3)' : (v < 0 ? PA.c : PB.c);
    tr.classList.toggle('anim', !!anim); tr.classList.toggle('set', cur !== null); tr.style.setProperty('--fc', col);
    th.style.left = x + '%'; bub.style.left = x + '%'; fill.style.left = Math.min(50, x) + '%'; fill.style.width = Math.abs(x - 50) + '%';
    bub.textContent = cur === null ? '' : (Math.abs(v) < 0.08 ? '0' : (v < 0 ? '◂ ' : '') + Math.round(Math.abs(v) * 100) + (v > 0 ? ' ▸' : ''));
    th.setAttribute('aria-valuenow', Math.round(v * 100)); th.setAttribute('aria-valuetext', txt(cur)); $('#read').textContent = txt(cur);
    lp.style.setProperty('--o', cur === null || v <= 0.08 ? 1 : Math.max(0.5, 1 - v * 0.55)); rp.style.setProperty('--o', cur === null || v >= -0.08 ? 1 : Math.max(0.5, 1 + v * 0.55));
    lp.classList.toggle('on', cur !== null && v <= -0.08); rp.classList.toggle('on', cur !== null && v >= 0.08);
    $('#next').disabled = cur === null; live();
  };
  const set = (v, anim) => { v = clamp(v, -1, 1); if (Math.abs(v) < 0.04) v = 0; cur = Math.round(v * 100) / 100; draw(anim); };
  const fromX = cx => { const b = tr.getBoundingClientRect(); return (cx - b.left) / b.width * 2 - 1; };
  tr.addEventListener('pointerdown', e => { drag = true; try { tr.setPointerCapture(e.pointerId); } catch (_) {} set(fromX(e.clientX), e.target !== th); th.focus({ preventScroll: true }); e.preventDefault(); });
  tr.addEventListener('pointermove', e => { if (drag) set(fromX(e.clientX), false); });
  const end = () => { drag = false; }; tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
  th.addEventListener('keydown', e => { const v = cur === null ? 0 : cur, st = e.shiftKey ? 0.25 : 0.1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(v - st, true); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(v + st, true); }
    else if (e.key === 'Home') { e.preventDefault(); set(-1, true); } else if (e.key === 'End') { e.preventDefault(); set(1, true); }
    else if (e.key === 'Enter' && cur !== null) { e.preventDefault(); go(cur); } });
  [lp, rp].forEach(b => b.addEventListener('click', () => set(+b.dataset.v * 0.85, true)));
  const go = v => { S.ans[i] = v; if (endField) viewBoard(k); else { S.qi++; viewQuiz(); } };
  $('#next').addEventListener('click', () => { if (cur !== null) go(cur); });
  $('#skip').addEventListener('click', () => go(null));
  $('#prev').addEventListener('click', () => { if (cur !== null) S.ans[i] = cur; S.qi--; viewQuiz(); });
  draw(false); th.focus({ preventScroll: true });
}

/* ── 4. 분야별 의석 발표 */
function viewBoard(k) {
  window.scrollTo(0, 0);
  const a = A, fi = S.order.indexOf(k), done = S.order.slice(0, fi + 1), last = fi === S.order.length - 1, F = fld(k);
  const R = M.simAll(S.ans, done), fr = R.fields[k], C2 = R.C[k], given = sum(R.tot), R0 = M.simAll(S.ans, done.slice(0, -1));
  const base = M.simAll(S.ans.map((v, j) => a.Q[j] && a.Q[j].f === k ? undefined : v), done).fields[k];
  const ord = a.P.map((p, f) => f).filter(f => R.tot[f] || fr.tot[f]).sort((x, y) => R.tot[y] - R.tot[x] || fr.tot[y] - fr.tot[x]), mx = Math.max(1, ...ord.map(f => R.tot[f]));
  const up = ord.filter(f => fr.tot[f] > base.tot[f]).sort((x, y) => (fr.tot[y] - base.tot[y]) - (fr.tot[x] - base.tot[x])), dn = ord.filter(f => fr.tot[f] < base.tot[f]).sort((x, y) => (fr.tot[x] - base.tot[x]) - (fr.tot[y] - base.tot[y]));
  app.innerHTML = '<section class="stack"><div class="box">' +
    '<span class="eyebrow">분야 ' + (fi + 1) + ' / ' + S.order.length + '</span><h2 style="font-size:clamp(22px,5.5vw,28px);margin:4px 0 6px">‘' + esc(F.n) + '’ 분야가 <span class="num">' + C2.t + '</span>석을 나눠 줍니다</h2>' +
    '<p class="hint">' + (fr.empty ? '답한 질문이 없어 실제 지지율대로 나눴습니다.' : seatTxt(C2) + ' · 오른쪽 숫자는 지금까지 누적 의석입니다.') + '</p>' +
    '<div class="hemi" id="bh" style="margin-top:10px">' + hemiSvg(a.N) + '</div>' +
    '<div>' + ord.map(f => { const p = a.P[f], d = fr.tot[f] - base.tot[f];
      return '<div class="brow">' + mark(p) + '<div><b style="font-weight:600">' + esc(p.n) + '</b><small style="display:block;color:var(--ink3);font-size:12px;line-height:1.3">이 분야 ' + fr.tot[f] + '석' + (d ? ' · 실제 지지율대로였다면 ' + base.tot[f] + '석' : '') + '</small><div class="bar"><span data-f="' + f + '" style="width:0;background:' + p.c + '"></span></div></div><span class="add" data-f="' + f + '"></span><span class="cum" data-f="' + f + '">0</span></div>'; }).join('') + '</div>' +
    '<p class="lead" style="margin-top:10px">' + (up.length ? '<b>' + up.slice(0, 2).map(f => esc(a.P[f].n)).join('·') + '</b>은(는) 실제 지지율 몫보다 늘었고' : '') + (up.length && dn.length ? ', ' : '') + (dn.length ? '<b>' + dn.slice(0, 2).map(f => esc(a.P[f].n)).join('·') + '</b>은(는) 줄었습니다.' : up.length ? '.' : '실제 지지율 몫과 거의 같습니다.') + '</p></div>' +
    '<div class="launch"><button type="button" class="cta" id="cont">' + (last ? '최종 결과 보기' : '다음 분야: ' + esc(fld(S.order[fi + 1]).n)) + '</button>' + (!last ? '<span>' + esc(fld(S.order[fi + 1]).n) + '에 ' + R.C[S.order[fi + 1]].t + '석이 걸려 있습니다</span>' : '') + '</div></section>';
  const el = $('#bh');
  paint(el, R0, null, null);
  const stage = () => { paint(el, R, '석 중 ' + given + '석 배분', a.N);
    ord.forEach((f, j) => { const v = fr.tot[f], ad = $('.add[data-f="' + f + '"]', app); $('.bar span[data-f="' + f + '"]', app).style.width = (R.tot[f] / mx * 100) + '%'; tweenNum($('.cum[data-f="' + f + '"]', app), R0.tot[f], R.tot[f]);
      ad.className = 'add' + (v > 0 ? ' popin' : ' zero'); ad.textContent = v > 0 ? '+' + v : '0'; ad.style.animationDelay = (j * 60) + 'ms'; }); };
  if (noMo()) stage(); else requestAnimationFrame(() => requestAnimationFrame(stage));
  $('#cont').addEventListener('click', () => { if (last) viewResult(); else { S.qi++; viewQuiz(); } });
}

/* ── 5. 결과 */
function bills(q, st) { let l = 0, r = 0, ab = 0; A.P.forEach((p, f) => { const x = pos(q, p); if (x <= -0.25) l += st[f]; else if (x >= 0.25) r += st[f]; else ab += st[f]; }); return { l, r, ab }; }
const flagSvg = () => '<svg class="wb-flag" viewBox="0 0 90 60" role="img" aria-label="일장기"><rect width="90" height="60" fill="#ffffff"/><circle cx="45" cy="30" r="18" fill="#bc002d"/></svg>';
function defaultPlan() {
  const bloc = (A.pmBloc || A.gov).filter(k => party(k)), lead = bloc[0], pl = {};
  A.P.forEach(p => { pl[p.k] = p.k === 'ind' ? 'blank' : bloc.includes(p.k) ? lead : p.k; });
  return pl;
}
function viewResult(keep) {
  const sy = window.scrollY; toHome.hidden = false;
  const a = A, R = M.simAll(S.ans), mine = R.tot, real = actual(), asked = a.Q.map((q, i) => i).filter(i => S.ans[i] !== undefined), answered = asked.filter(i => S.ans[i] != null).length, Mj = maj(a.N);
  if (!S.plan) S.plan = defaultPlan();
  const order = a.P.map((p, f) => f).sort((x, y) => mine[y] - mine[x] || real[y] - real[x]), L = order[0];
  const govF = a.gov.map(k => a.P.findIndex(p => p.k === k)).filter(f => f >= 0), govSeats = sum(govF.map(f => mine[f]));
  app.innerHTML = '<section class="stack">' +
    '<div class="rhead"><div class="pills"><span class="pill strong">' + a.y + '</span><span class="pill">소선거구 ' + a.D + ' · 비례 ' + a.L + '</span><span class="pill">' + (govSeats >= Mj ? '여당 과반' : '여당 과반 미달') + '</span><span class="pill">답변 ' + answered + ' / ' + asked.length + '</span></div>' +
    '<h2>나의 제' + a.n + '회 중의원</h2><p class="lead" id="lead"></p></div>' +
    '<div class="box"><div style="display:flex;justify-content:center;margin-bottom:6px"><div class="seg" role="group" aria-label="보기 전환"><button type="button" data-v="mine" aria-pressed="true">나의 결과</button><button type="button" data-v="real" aria-pressed="false">실제 결과</button></div></div>' +
    '<div class="hemi" id="rh">' + hemiSvg(a.N) + '</div><div class="hlg"><span><i class="dot" style="background:var(--ink2)"></i>지역구</span><span><i class="ring"></i>비례</span><span>점선: 과반 ' + Mj + '석</span></div>' +
    '<div class="tw"><table class="tbl"><thead><tr><th>정당</th><th>지역구</th><th>비례</th><th>합계</th><th>실제</th><th>차이</th></tr></thead><tbody id="tb"></tbody></table></div></div>' +
    '<div class="box" id="pmbox"><h3>내각총리대신 지명선거</h3><p class="hint sub" id="pmhint"></p><div class="tw"><table class="pm"><thead id="pmh"></thead><tbody id="pmb"></tbody></table></div><p class="vote" id="pmres"></p><p class="hint" id="pmreal" style="margin-top:4px"></p>' +
    '<details class="mv" style="margin-top:12px" open><summary>정당별 투표 방침</summary><p class="hint" style="margin-top:6px">각 정당이 1차 투표에서 누구를 찍을지 고릅니다. 기본값은 실제 연립·협력 관계입니다.</p><div class="plan" id="plan"></div><div id="ro"></div></details>' +
    '<p class="hint" style="margin-top:10px">일본국 헌법 제67조에 따라 중의원과 참의원의 지명이 다르면 중의원의 지명이 국회의 의결이 됩니다. 지명된 사람은 천황이 임명합니다.</p></div>' +
    '<div class="box"><h3>선거 결과</h3><p class="hint sub">위키백과 선거 인포박스 형식입니다. 득표율은 답변으로 계산한 가상 비례 득표율입니다. 화살표를 누르면 앞뒤 총선으로 이동합니다.</p><div class="wb-wrap" id="wb"></div></div>' +
    '<div class="box"><h3>도도부현 지도</h3><p class="hint sub">정당별 지역구 의석을 지역 성향(js/data-prefs.js)에 따라 도도부현에 나눠 놓은 추정 배치입니다. 지역을 누르면 내용을 볼 수 있습니다.</p><div class="mapw"><div class="map" id="map"></div><div class="pd" id="pd"></div></div></div>' +
    '<div class="box"><h3>분야별 의석</h3><p class="hint sub">분야마다 걸린 의석과 정당별 획득 의석입니다. 중요도를 바꾸면 분야 의석이 다시 나뉩니다.</p><div class="fbar" id="fsum"></div><div class="syslg" id="fslg"></div><div id="fres" style="margin-top:10px"></div></div>' +
    '<div class="box"><h3>정당 스펙트럼 맵</h3><p class="hint sub">가로는 경제, 세로는 정치·안보 성향입니다. 원 크기는 나의 결과 의석수, 흰 원이 나의 위치입니다.</p><div id="cmp"></div></div>' +
    '<div class="box"><h3>의결 정족수로 본 나의 중의원</h3><p class="hint sub">검은 선은 과반, 금색 선은 3분의 2(참의원이 부결한 법안 재가결·헌법 개정 발의)입니다.</p><div class="thr" id="thr"></div></div>' +
    '<div class="box" id="cobox"><h3>연립 정권 구성</h3><p class="hint sub">중의원 과반(' + Mj + '석)을 만드는 연립 후보입니다. 성향이 너무 먼 정당끼리는 묶지 않았습니다.</p><div class="coal" id="coal"></div><span class="hint" style="display:block;margin:14px 0 6px">직접 연립 만들기</span><div class="chips" id="copick"></div><div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px" id="cogo"></div><div id="cab"></div></div>' +
    '<div class="box"><h3>나와 가까운 정당</h3><p class="hint sub">답변한 질문에서 각 정당 입장과의 평균 일치도입니다. 중요한 분야일수록 크게 반영됩니다.</p><div class="match" id="match"></div></div>' +
    '<div class="box"><h3>질문별 의석과 표결</h3><p class="hint sub">각 입장이 어느 정당의 것이었는지 여기서 공개됩니다.</p><div id="bills"></div></div>' +
    '<div class="acts"><button type="button" class="cta" id="again">같은 총선 다시 하기</button><button type="button" class="cta ghost" id="other">다른 총선 고르기</button></div>' +
    '<details class="box how"><summary>계산 방식</summary>' +
    '<p>분야 중요도(관심 없음 0 · 조금 1 · 보통 2 · 중요 3.5 · 매우 중요 5)에 비례해 지역구 ' + a.D + '석과 비례 ' + a.L + '석을 분야별로 나누고, 질문 수도 중요도에 따라 정합니다.</p>' +
    '<p>각 질문에서 막대 위치와 정당 입장 사이 거리로 종 모양(가우스) 득표를 냅니다. 소선거구라 가장 가까운 정당이 지역구를 거의 독차지하도록 득표의 2.5제곱으로 나눕니다. 비례 몫은 그 분야 질문의 평균 득표율로 나눕니다(실제는 11개 블록 동트식).</p>' +
    '<p>“당시 지지 기반 반영”이 켜져 있으면 실제 의석 비율의 0.8제곱을 곱해, 같은 거리라도 큰 정당이 더 받습니다. 무소속은 한 덩어리 정당이 아니므로 0.4배로 계산하고 비례를 받지 않습니다.</p>' +
    '<p>총리 지명선거: 각 정당 의원 전원이 투표 방침대로 찍는다고 가정합니다. 투표총수의 과반을 얻은 후보가 없으면 상위 2인 결선투표를 하고, 결선에서 지지 후보가 없는 정당은 백지로 둡니다(방침에서 바꿀 수 있음).</p>' +
    '<p>내각: 총리는 연립 제1당이 맡고, 나머지 부처는 의석에 비례한 순번(동트 방식)으로 나누며 각 정당은 자기가 의석을 많이 얻은 분야의 부처를 먼저 고릅니다.</p></details></section>';

  // 반원 + 표
  const show = v => { S.view = v; const st = v === 'mine' ? mine : real; paint($('#rh'), v === 'mine' ? R : plain(real), v === 'mine' ? '석 · 나의 결과' : '석 · 실제 결과', a.N);
    $$('.seg button[data-v]', app).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); drawPM(st); drawMap(v === 'mine' ? R.dist : a.P.map(p => p.sd)); };
  $$('.seg button[data-v]', app).forEach(b => b.addEventListener('click', () => show(b.dataset.v)));
  $('#tb').innerHTML = order.filter(f => mine[f] || real[f]).map(f => { const p = a.P[f], d = mine[f] - real[f];
    return '<tr><td><span>' + mark(p) + esc(p.n) + '</span></td><td>' + R.dist[f] + '</td><td>' + R.list[f] + '</td><td><b>' + mine[f] + '</b></td><td>' + real[f] + '</td><td class="' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d > 0 ? '+' : '') + d + '</td></tr>'; }).join('');
  $('#lead').innerHTML = '제1당은 <b>' + esc(a.P[L].n) + '</b> ' + mine[L] + '석(지역구 ' + R.dist[L] + ' · 비례 ' + R.list[L] + ')입니다. ' +
    (mine[L] >= two3(a.N) ? '혼자서 3분의 2를 넘었습니다.' : mine[L] >= Mj ? '단독 과반입니다.' : '단독 과반에는 ' + (Mj - mine[L]) + '석이 모자랍니다.') + ' 실제 선거 뒤 내각은 ' + a.gov.map(k => esc(party(k).n)).join('·') + (a.gov.length > 1 ? ' 연립' : ' 단독') + '이었습니다.';

  // 총리 지명선거
  function drawPM(st) {
    const pm = E.pmVote(a, st, S.plan, S.runoff), r1 = pm.r1, r2 = pm.r2;
    $('#pmhint').textContent = (S.view === 'mine' ? '나의 결과' : '실제 결과') + ' 의석으로 치른 중의원 지명 투표입니다. 투표총수 ' + r1.cast + '표 중 ' + r1.need + '표 이상이면 1차에서 지명됩니다.';
    $('#pmh').innerHTML = '<tr><th>후보</th><th>추천</th><th class="r">1차</th>' + (r2 ? '<th class="r">결선</th>' : '') + '<th style="width:30%">득표 (선: 과반)</th></tr>';
    $('#pmb').innerHTML = r1.order.map(f => { const p = a.P[f], v1 = r1.tally[f], v2 = r2 && r2.tally[f] != null ? r2.tally[f] : null, shown = v2 != null ? v2 : v1, back = (r1.voters[f] || []).filter(x => x !== f).map(x => a.P[x].n);
      return '<tr class="' + (pm.win === f ? 'win' : '') + '"><td><div class="who"><span class="ph" style="background:' + p.c + '">' + esc(p.pmc[0].slice(0, 1)) + '</span><div><div class="jn">' + esc(p.pmc[0]) + (pm.win === f ? ' <span class="badge">지명</span>' : '') + '</div><div class="kn">' + esc(p.pmc[1]) + '</div></div></div></td>' +
        '<td>' + esc(p.n) + (back.length ? '<div class="bk">+ ' + back.map(esc).join('·') + '</div>' : '') + '</td><td class="r num">' + v1 + '</td>' + (r2 ? '<td class="r num">' + (v2 == null ? '—' : v2) + '</td>' : '') +
        '<td><div class="vb"><span style="width:' + (shown / r1.cast * 100).toFixed(1) + '%;background:' + p.c + '"></span><em style="left:' + (r1.need / r1.cast * 100).toFixed(1) + '%"></em></div></td></tr>'; }).join('') +
      '<tr><td colspan="2" class="hint">백지·무효</td><td class="r num">' + r1.blank + '</td>' + (r2 ? '<td class="r num">' + r2.blank + '</td>' : '') + '<td></td></tr>';
    if (pm.win >= 0) { const w = a.P[pm.win]; $('#pmres').innerHTML = '<b>' + esc(w.pmc[0]) + '</b> ' + esc(w.pmc[1]) + '(' + esc(w.n) + ') 지명 — ' + (r2 ? '1차에서 과반 후보가 없어 결선투표에서 ' + r2.tally[pm.win] + '표 대 ' + r2.tally[r2.fin.find(x => x !== pm.win)] + '표로 승리' : '1차 투표에서 ' + r1.tally[pm.win] + '표로 과반(' + r1.need + ') 확보'); }
    else $('#pmres').textContent = '지명할 후보가 없습니다. 투표 방침을 확인하세요.';
    $('#pmreal').textContent = '실제: ' + a.pmReal;
    // 방침
    const cands = a.P.filter(p => p.pmc && p.k !== 'ind');
    $('#plan').innerHTML = a.P.map((p, f) => st[f] ? '<label>' + mark(p) + '<span>' + esc(p.n) + ' <span class="num hint">' + st[f] + '</span></span><select class="in" data-pl="' + p.k + '">' +
      cands.map(c => '<option value="' + c.k + '"' + (S.plan[p.k] === c.k ? ' selected' : '') + '>' + (c.k === p.k ? '자당 ' : '') + esc(c.pmc[1]) + (c.k === p.k ? '' : ' (' + esc(c.n) + ')') + '</option>').join('') +
      '<option value="blank"' + (S.plan[p.k] === 'blank' ? ' selected' : '') + '>백지 투표</option></select></label>' : '').join('');
    if (r2) { const fin = r2.fin;
      $('#ro').innerHTML = '<p class="hint" style="margin:12px 0 0">결선투표 — 지지 후보가 탈락한 정당의 선택</p><div class="plan">' + a.P.map((p, f) => { if (!st[f]) return ''; const t = a.P.findIndex(x => x.k === S.plan[p.k]); if (fin.includes(t)) return '';
        return '<label>' + mark(p) + '<span>' + esc(p.n) + '</span><select class="in" data-ro="' + p.k + '">' + fin.map(x => '<option value="' + a.P[x].k + '"' + (S.runoff[p.k] === a.P[x].k ? ' selected' : '') + '>' + esc(a.P[x].pmc[1]) + '</option>').join('') + '<option value="blank"' + (!S.runoff[p.k] || S.runoff[p.k] === 'blank' ? ' selected' : '') + '>백지 투표</option></select></label>'; }).join('') + '</div>'; }
    else $('#ro').innerHTML = '';
  }
  $('#pmbox').addEventListener('change', e => { const t = e.target; if (t.dataset.pl) { S.plan[t.dataset.pl] = t.value; S.runoff = {}; } else if (t.dataset.ro) S.runoff[t.dataset.ro] = t.value; else return;
    drawPM(S.view === 'mine' ? mine : real); });

  // 인포박스
  const pct = v => (v * 100).toFixed(1) + '%';
  (function () {
    const st = mine, ord = order.filter(f => st[f] > 0), top = ord.slice(0, 6), rest = ord.slice(6), i = DATA.findIndex(d => d.n === a.n), prv = DATA[i - 1], nxt = DATA[i + 1];
    let rows = '';
    for (let k = 0; k < top.length; k += 3) { const g = top.slice(k, k + 3), pad = '<td></td>'.repeat(3 - g.length), row = (th, fn) => '<tr><th scope="row">' + th + '</th>' + g.map(f => '<td>' + fn(f, a.P[f]) + '</td>').join('') + pad + '</tr>';
      rows += row('', (f, p) => '<div class="wb-ph" style="--c:' + p.c + '"><span>' + esc((p.ld || p.ja).slice(0, 1)) + '</span></div>') +
        row('대표', (f, p) => p.ldk ? (f === ord[0] ? '<b>' + esc(p.ldk) + '</b>' : esc(p.ldk)) : '—') +
        row('정당', (f, p) => '<span style="color:var(--link)">' + esc(p.n) + '</span>') +
        row('비례 득표율', f => pct(R.vs[f])) +
        row('의석', f => f === ord[0] ? '<b>' + st[f] + '</b>' : String(st[f])) +
        row('지역구 / 비례', f => R.dist[f] + ' / ' + R.list[f]) +
        row('실제 의석', (f, p) => { const d = st[f] - p.s; return p.s + ' <small class="' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">(' + (d > 0 ? '▲' + d : d < 0 ? '▼' + (-d) : '±0') + ')</small>'; }) +
        '<tr><td colspan="4" class="wb-hr"></td></tr>'; }
    $('#wb').innerHTML = '<table class="wb"><tbody><tr><th colspan="4" class="wb-title">제' + a.n + '회 중의원 의원 총선거<div>답변 기준 가상 결과</div></th></tr>' +
      '<tr><td colspan="4">' + flagSvg() + '</td></tr>' +
      '<tr><td colspan="4"><div class="wb-nav"><span>' + (prv ? '<button type="button" class="wb-a" data-go="' + (i - 1) + '">← ' + prv.y + '</button>' : '') + '</span><b>' + fmtDate(a.date) + '</b><span>' + (nxt ? '<button type="button" class="wb-a" data-go="' + (i + 1) + '">' + nxt.y + ' →</button>' : '') + '</span></div></td></tr>' +
      '<tr><th scope="row">의원 정수</th><td colspan="3" class="wb-r">' + a.N + '석 (소선거구 ' + a.D + ' · 비례 ' + a.L + ')</td></tr>' +
      '<tr><th scope="row">과반</th><td colspan="3" class="wb-r">' + Mj + '석 · 3분의 2 ' + two3(a.N) + '석</td></tr><tr><td colspan="4" class="wb-hr"></td></tr>' + rows +
      '<tr><td colspan="4"><div class="hemi" id="wbh">' + hemiSvg(a.N) + '</div><div class="wb-cap">답변 기준 의석 분포</div></td></tr>' +
      (rest.length ? '<tr><th scope="row">기타</th><td colspan="3" class="wb-r">' + rest.map(f => esc(a.P[f].n) + ' ' + st[f]).join(', ') + '</td></tr>' : '') +
      '<tr><th scope="row">제1당</th><td colspan="3" class="wb-r">' + esc(a.P[L].n) + ' (' + st[L] + '석, ' + (st[L] >= Mj ? '단독 과반' : '과반 미달') + ')</td></tr>' +
      '<tr><th scope="row">실제 내각</th><td colspan="3" class="wb-r">' + a.gov.map(k => esc(party(k).n)).join('·') + ' · 이번 결과로는 ' + govSeats + '석(' + (govSeats >= Mj ? '과반' : '소수 여당') + ')</td></tr>' +
      '<tr><th scope="row">실제 총리</th><td colspan="3" class="wb-r">' + esc(a.pm) + '</td></tr></tbody></table>';
    paint($('#wbh'), R, '', ''); $('#wbh .big').textContent = ''; $('#wbh .sm').textContent = '';
    $('#wb').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; S.ai = +b.dataset.go; sv('jp-sel', S.ai); load(); viewHome(); });
  })();

  // 지도
  const P = window.JPMAP, PR = window.PREFS, tip = $('#tip');
  $('#map').innerHTML = '<svg viewBox="' + P.vb.join(' ') + '" role="img" aria-label="도도부현별 지역구 1위 정당">' +
    '<rect class="inset" x="' + (P.inset[0] - 10) + '" y="' + (P.inset[1] - 16) + '" width="' + (P.inset[2] - P.inset[0] + 20) + '" height="' + (P.inset[3] - P.inset[1] + 26) + '"/><text x="' + (P.inset[0] - 6) + '" y="' + (P.inset[1] - 4) + '">沖縄</text>' +
    PR.map(p => '<path d="' + P.P[p[0]] + '" data-c="' + p[0] + '" tabindex="0"><title>' + p[1] + '</title></path>').join('') + '</svg>';
  let place = {};
  function drawMap(dist) {
    place = E.placeSeats(a, dist, PR);
    PR.forEach(p => { const r = place[p[0]], top = r.won.indexOf(Math.max(...r.won)), el = $('path[data-c="' + p[0] + '"]', app);
      el.setAttribute('fill', a.P[top].c); el.style.opacity = (0.4 + 0.6 * r.won[top] / Math.max(1, r.n)).toFixed(2); el.classList.toggle('sel', p[0] === S.sel); });
    drawPref();
  }
  function drawPref() {
    const p = PR.find(x => x[0] === S.sel) || PR[12], r = place[p[0]], fs = a.P.map((_, f) => f).filter(f => r.won[f]).sort((x, y) => r.won[y] - r.won[x]);
    $('#pd').innerHTML = '<h4>' + esc(p[1]) + '</h4><p class="meta">' + esc(p[2]) + ' · 지역구 약 ' + r.n + '석 (' + (S.view === 'mine' ? '나의 결과' : '실제 결과') + ' 추정 배치)</p>' +
      '<div class="wbar">' + fs.map(f => '<span style="width:' + (r.won[f] / r.n * 100) + '%;background:' + a.P[f].c + '"></span>').join('') + '</div>' +
      '<div class="syslg" style="flex-direction:column;gap:4px">' + fs.map(f => '<span>' + mark(a.P[f]) + esc(a.P[f].n) + ' <b class="num">' + r.won[f] + '</b></span>').join('') + '</div>' +
      '<p class="hint" style="margin-top:8px">실제 선거구별 당선자가 아니라, 정당별 지역구 의석을 지역 강세에 맞춰 나눈 값입니다.</p>';
  }
  $('#map').addEventListener('click', e => { const c = e.target.closest('path'); if (!c) return; S.sel = c.dataset.c; $$('#map path').forEach(x => x.classList.toggle('sel', x === c)); drawPref(); });
  $('#map').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.c) { S.sel = e.target.dataset.c; drawMap(S.view === 'mine' ? R.dist : a.P.map(p => p.sd)); } });
  $('#map').addEventListener('mousemove', e => { const c = e.target.closest('path'); if (!c) { tip.hidden = true; return; } const p = PR.find(x => x[0] === c.dataset.c), r = place[p[0]];
    tip.textContent = p[1] + ' · ' + a.P.map((x, f) => [x, r.won[f]]).filter(x => x[1]).sort((x, y) => y[1] - x[1]).map(x => x[0].n + ' ' + x[1]).join(', ');
    tip.hidden = false; tip.style.left = Math.min(e.clientX + 12, innerWidth - 250) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; });
  $('#map').addEventListener('mouseleave', () => { tip.hidden = true; });

  // 분야별
  const lean = leanOrder(), fsAll = M.fieldsOf();
  $('#fsum').innerHTML = R.act.map(k => '<span style="width:' + (R.C[k].t / a.N * 100) + '%;background:' + fld(k).c + '"></span>').join('');
  $('#fslg').innerHTML = R.act.map(k => '<span><i class="dot" style="background:' + fld(k).c + '"></i>' + esc(fld(k).n) + ' <b class="num">' + R.C[k].t + '</b></span>').join('');
  $('#fres').innerHTML = fsAll.map(k => { const on = R.act.includes(k), fr = R.fields[k], C2 = R.C[k], nq = asked.filter(i => a.Q[i].f === k).length, top = on ? a.P.map((p, f) => f).filter(f => fr.tot[f] > 0).sort((x, y) => fr.tot[y] - fr.tot[x]).slice(0, 4) : [];
    return '<div class="frow' + (on ? '' : ' off') + '"><div class="fh"><div><span class="fchip"><i class="dot" style="background:' + fld(k).c + '"></i>' + esc(fld(k).n) + '</span><small>질문 ' + nq + '개 답변' + (on && fr.empty ? ' · 답이 없어 실제 지지율대로' : '') + '</small></div><div class="fseats">' + (on ? C2.t + '석<small>' + seatTxt(C2) + '</small>' : '0석<small>관심 없음</small>') + '</div></div>' + segHtml(k, S.fimp[k] || 0, true) +
      (on ? '<div class="fbar">' + lean.map(f => '<span style="width:' + (fr.tot[f] / Math.max(1, C2.t) * 100) + '%;background:' + a.P[f].c + '" title="' + esc(a.P[f].n) + ' ' + fr.tot[f] + '"></span>').join('') + '</div><div class="syslg">' + top.map(f => '<span>' + mark(a.P[f]) + esc(a.P[f].n) + ' <b class="num">' + fr.tot[f] + '</b></span>').join('') + '</div>' : '') + '</div>'; }).join('');
  $('#fres').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (!b) return; S.fimp[b.dataset.f] = +b.dataset.l; remake(); S.cab = null; S.cabSt = null; viewResult(true); });

  // 스펙트럼 맵
  (function () {
    const W = 380, p0 = 40, p1 = W - 40, sc = v => p0 + (clamp(v, -1, 1) + 1) / 2 * (p1 - p0), mid = W / 2, xy = E.partyAx(a);
    const pts = a.P.map((p, f) => ({ x: sc(xy[f].e), y: sc(-xy[f].s), c: p.c, n: p.n, r: mine[f] ? 4 + 13 * Math.sqrt(mine[f] / a.N) : 3, o: mine[f] ? 1 : 0.35 })).filter((_, f) => a.P[f].k !== 'ind');
    const o = [0, 0], w = [0, 0]; a.Q.forEach((q, i) => { const v = S.ans[i]; if (v == null || !q.ax) return; const k = q.ax === 'e' ? 0 : 1, ww = Math.max(1, M.fw(q.f)); o[k] += v * ww; w[k] += ww; });
    if (w[0] + w[1]) pts.push({ x: sc(w[0] ? o[0] / w[0] : 0), y: sc(-(w[1] ? o[1] / w[1] : 0)), you: true, n: '나', r: 7 });
    let g = '<rect x="' + p0 + '" y="' + p0 + '" width="' + (p1 - p0) + '" height="' + (p1 - p0) + '" fill="var(--sunk)" stroke="var(--line2)"/><line x1="' + mid + '" y1="' + p0 + '" x2="' + mid + '" y2="' + p1 + '" stroke="var(--line2)"/><line x1="' + p0 + '" y1="' + mid + '" x2="' + p1 + '" y2="' + mid + '" stroke="var(--line2)"/>' +
      '<text x="' + mid + '" y="' + (p0 - 12) + '" text-anchor="middle" class="ax">보수 · 안보 · 전통</text><text x="' + mid + '" y="' + (p1 + 22) + '" text-anchor="middle" class="ax">리버럴 · 평화 · 인권</text>' +
      '<text x="' + (p0 - 14) + '" y="' + mid + '" text-anchor="middle" class="ax" transform="rotate(-90 ' + (p0 - 14) + ' ' + mid + ')">분배 · 큰 정부</text><text x="' + (p1 + 14) + '" y="' + mid + '" text-anchor="middle" class="ax" transform="rotate(90 ' + (p1 + 14) + ' ' + mid + ')">시장 · 작은 정부</text>';
    pts.slice().sort((x, y) => y.r - x.r).forEach(p => { g += p.you ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="var(--surface)" stroke="var(--ink)" stroke-width="3"/>' : '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + p.r.toFixed(1) + '" fill="' + p.c + '" fill-opacity="' + (0.85 * p.o) + '" stroke="var(--surface)"/>'; });
    const placed = []; let lab = '';
    pts.slice().sort((x, y) => x.y - y.y).forEach(p => { const t = p.n.length > 9 ? p.n.slice(0, 8) + '…' : p.n, wd = t.length * 10 + 4, left = p.x > W * 0.62, gap = p.r + 4, x0 = left ? p.x - gap - wd : p.x + gap; let y = p.y + 4;
      for (let k = 0; k < 8 && placed.some(b => Math.abs(b.y - y) < 12 && x0 < b.x1 && x0 + wd > b.x0); k++) y += 12;
      placed.push({ x0, x1: x0 + wd, y }); lab += '<text x="' + (left ? p.x - gap : p.x + gap).toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + (left ? 'end' : 'start') + '" class="lb' + (p.you ? ' you' : '') + '">' + esc(t) + '</text>'; });
    $('#cmp').innerHTML = '<div class="cmp"><svg viewBox="0 0 ' + W + ' ' + (W + 6) + '" role="img" aria-label="정당 스펙트럼 맵">' + g + lab + '</svg></div>';
  })();

  // 정족수
  (function () {
    const N = a.N, T = two3(N), sb = stable(N);
    const row = (lab, need, hint) => { const ok = mine[L] >= need, okg = govSeats >= need; return '<div class="t"><b>' + lab + '</b><span class="num">' + need + '석</span><small>' + hint + ' · 제1당 ' + esc(a.P[L].n) + ' ' + (ok ? '단독 확보' : '단독으로는 ' + (need - mine[L]) + '석 부족') + ' · 실제 여당(' + a.gov.map(k => esc(party(k).n)).join('·') + ') ' + (okg ? '확보' : (need - govSeats) + '석 부족') + '</small></div>'; };
    let h = '<div><div class="meter">' + lean.map(f => '<span style="width:' + (mine[f] / N * 100) + '%;background:' + a.P[f].c + '"></span>').join('') + '<i class="mk" style="left:' + (Mj / N * 100) + '%"></i><i class="mk l2" style="left:' + (T / N * 100) + '%"></i></div>' +
      '<div class="mlab"><span style="left:' + (Mj / N * 100) + '%">' + Mj + '</span><span style="left:' + (T / N * 100) + '%">' + T + '</span></div></div>';
    h += row('과반', Mj, '법안·예산 의결, 총리 지명');
    if (sb) { h += row('안정다수', sb[0], '모든 상임위원장을 맡고 각 위원회에서도 과반'); h += row('절대안정다수', sb[1], '모든 상임위원회에서 위원 과반을 차지'); }
    h += row('3분의 2', T, '참의원이 부결한 법안의 재가결 · 헌법 개정 발의(참의원도 3분의 2 필요)');
    $('#thr').innerHTML = h;
  })();

  // 연립·내각
  const coBar = m => '<div class="vbar">' + m.map(f => '<span style="width:' + (mine[f] / a.N * 100) + '%;background:' + a.P[f].c + '"></span>').join('') + '<em style="left:' + (Mj / a.N * 100) + '%"></em></div>';
  const coRow = (m, label) => '<div class="co"><div class="t"><span>' + (label ? '<b>' + esc(label) + '</b> ' : '') + m.map(f => esc(a.P[f].n)).join(' + ') + '</span><em class="num">' + sum(m.map(f => mine[f])) + '석</em></div>' + coBar(m) + '<div style="margin-top:6px"><button type="button" class="chip" data-co="' + m.join(',') + '">이 구성으로 내각</button></div></div>';
  const cos = mine[L] >= Mj ? [] : E.coalitions(a, mine, true);
  $('#coal').innerHTML = (mine[L] >= Mj ? coRow([L], '단독 내각') : '') + (govF.length && govSeats >= Mj && !(govF.length === 1 && govF[0] === L) ? coRow(govF, '실제 연립') : '') + cos.map(c => coRow(c.m)).join('') +
    (!cos.length && mine[L] < Mj ? '<p class="hint">조건을 지키며 과반을 만드는 연립이 없습니다. 아래에서 소수 내각을 꾸려 보세요.</p>' : '');
  if (!S.pick.length && !S.pickTouched) S.pick = govF.filter(f => mine[f] > 0);
  const drawPick = () => { S.pick = S.pick.filter(f => mine[f] > 0); const t = sum(S.pick.map(f => mine[f]));
    $('#copick').innerHTML = a.P.map((p, f) => mine[f] && p.k !== 'ind' ? '<button type="button" class="chip" data-pk="' + f + '" aria-pressed="' + S.pick.includes(f) + '">' + mark(p, 9) + esc(p.n) + ' · ' + mine[f] + '</button>' : '').join('');
    $('#cogo').innerHTML = '<button type="button" class="chip" data-co="' + S.pick.join(',') + '"' + (S.pick.length ? '' : ' disabled') + '>이 구성으로 내각</button><button type="button" class="chip" id="toPM"' + (S.pick.length ? '' : ' disabled') + '>이 연립으로 총리 지명 투표</button><span class="hint">' + t + '석 · ' + (t >= Mj ? '과반' : '과반에 ' + (Mj - t) + '석 부족') + '</span>'; };
  const drawCab = () => {
    if (!S.cab) { $('#cab').innerHTML = ''; return; } const m = S.cab.filter(f => mine[f] > 0); if (!m.length) { $('#cab').innerHTML = ''; return; }
    const lead = m.slice().sort((x, y) => mine[y] - mine[x]), key = lead.join(','), ML = MINS[a.mins].split(' ');
    if (!S.cabSt || S.cabSt.key !== key) {
      const k = {}, out = [], left = ML.slice(); lead.forEach(f => { k[f] = 0; });
      for (let n = 0; left.length; n++) { let f = lead[0]; if (n > 0) lead.forEach(x => { if (mine[x] / (k[x] + 1) > mine[f] / (k[f] + 1) + 1e-9) f = x; });
        let pick = left[0]; if (n > 0) { const aff = mn => { const fk = MINF(mn); return R.fields[fk] && R.C[fk] && R.C[fk].t ? R.fields[fk].tot[f] / R.C[fk].t : 0; }; pick = left.slice().sort((x, y) => aff(y) - aff(x) || ML.indexOf(x) - ML.indexOf(y))[0]; }
        out.push({ min: pick, f }); left.splice(left.indexOf(pick), 1); k[f]++; }
      out.sort((x, y) => ML.indexOf(x.min) - ML.indexOf(y.min)); S.cabSt = { key, list: out };
    }
    const st = S.cabSt, t = sum(m.map(f => mine[f])), cnt = {}; st.list.forEach(x => { cnt[x.f] = (cnt[x.f] || 0) + 1; });
    const PMp = a.P[lead[0]];
    $('#cab').innerHTML = '<div class="cabbox"><h4>' + (m.length > 1 ? m.map(f => esc(a.P[f].n)).join('·') + ' 연립 내각' : esc(a.P[m[0]].n) + ' 단독 내각') + ' · ' + t + '석</h4>' +
      '<p class="vote">총리 <b>' + esc(PMp.pmc ? PMp.pmc[1] : PMp.n) + '</b>' + (PMp.pmc ? ' (' + esc(PMp.pmc[0]) + ')' : '') + ' · 중의원 ' + (t >= Mj ? '과반 확보' : '소수 내각, ' + (Mj - t) + '석 부족') + '</p>' +
      '<div class="syslg" style="margin:6px 0 4px">' + m.filter(f => cnt[f]).map(f => '<span>' + mark(a.P[f]) + esc(a.P[f].n) + ' 각료 <b class="num">' + cnt[f] + '</b></span>').join('') + '</div>' +
      '<p class="hint">' + a.y + '년 무렵 내각 기준 ' + st.list.length + '자리입니다. 부처를 다른 연립 정당에 넘길 수 있습니다.</p><div class="cabg">' +
      st.list.map((x, j) => { const p = a.P[x.f]; return '<div class="cabr" style="--c:' + p.c + '"><span class="num">' + (j + 1) + '</span><b>' + esc(x.min) + '</b>' +
        (m.length > 1 && x.min !== '내각총리대신' ? '<select class="in" data-cp="' + j + '" aria-label="' + esc(x.min) + ' 맡을 정당">' + m.map(f => '<option value="' + f + '"' + (f === x.f ? ' selected' : '') + '>' + esc(a.P[f].n) + '</option>').join('') + '</select>' : '<span class="hint">' + esc(p.n) + (x.min === '내각총리대신' && PMp.pmc ? ' · ' + esc(PMp.pmc[1]) : '') + '</span>') + '</div>'; }).join('') + '</div></div>';
  };
  $('#cobox').addEventListener('click', e => {
    const pk = e.target.closest('[data-pk]'); if (pk) { S.pickTouched = true; const f = +pk.dataset.pk, i = S.pick.indexOf(f); if (i >= 0) S.pick.splice(i, 1); else S.pick.push(f); drawPick(); return; }
    if (e.target.closest('#toPM')) { const m = S.pick.slice().sort((x, y) => mine[y] - mine[x]), lk = a.P[m[0]].k; a.P.forEach((p, f) => { if (m.includes(f)) S.plan[p.k] = lk; else if (S.plan[p.k] === lk) S.plan[p.k] = p.k === 'ind' ? 'blank' : p.k; }); S.runoff = {}; drawPM(S.view === 'mine' ? mine : real); $('#pmbox').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const b = e.target.closest('[data-co]'); if (b && b.dataset.co && !b.disabled) { S.cab = b.dataset.co.split(',').map(Number); S.cabSt = null; drawCab(); $('#cab').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
  $('#cab').addEventListener('change', e => { const t = e.target; if (t.dataset.cp == null || !S.cabSt) return; S.cabSt.list[+t.dataset.cp].f = +t.value; drawCab(); });
  drawPick(); drawCab();

  // 일치도
  const done = asked.filter(i => S.ans[i] != null);
  if (!done.length) $('#match').innerHTML = '<p class="hint">답변한 질문이 없어 일치도를 계산할 수 없습니다.</p>';
  else { const m = a.P.filter(p => p.k !== 'ind').map(p => { let s = 0, w = 0; done.forEach(i => { const k = Math.max(0.5, M.fw(a.Q[i].f)); s += k * (1 - Math.abs(S.ans[i] - pos(a.Q[i], p)) / 2); w += k; }); return { p, v: s / w }; }).sort((x, y) => y.v - x.v);
    $('#match').innerHTML = m.map(x => '<div class="m">' + mark(x.p) + '<div><div style="font-size:14px;font-weight:600">' + esc(x.p.n) + '</div><div class="bar"><span style="width:' + (x.v * 100) + '%;background:' + x.p.c + '"></span></div></div><span class="num" style="text-align:right">' + Math.round(x.v * 100) + '%</span></div>').join(''); }

  // 질문별
  const seqAll = FK.flatMap(k => asked.filter(i => a.Q[i].f === k));
  $('#bills').innerHTML = seqAll.length ? seqAll.map(i => { const q = a.Q[i], Lp = party(q.L) || PA, Rp = party(q.R) || PB, v = S.ans[i], fr = R.fields[q.f], pr = fr && !fr.empty ? fr.per[i] : null;
    const you = v == null ? '잘 모르겠음' : Math.abs(v) < 0.08 ? '가운데' : (v < 0 ? 'A안' : 'B안') + ' 쪽 ' + Math.round(Math.abs(v) * 100);
    let st = ''; if (!R.act.includes(q.f)) st = '<span>관심 없음 분야: 의석이 걸리지 않았습니다</span>'; else if (v == null) st = '<span>답하지 않아 이 질문의 지역구는 분야 비례 몫으로 넘어갔습니다</span>';
    else if (pr) { const win = pr.d.map((x, f) => f).filter(f => pr.d[f] > 0).sort((x, y) => pr.d[y] - pr.d[x]).slice(0, 3); st = '<span>지역구 <b class="num">' + pr.seats + '</b>석</span>' + (win.length ? '<span>' + win.map(f => mark(a.P[f]) + ' ' + esc(a.P[f].n) + ' ' + pr.d[f]).join(' · ') + '</span>' : ''); }
    const row = (lab, s) => { const b = bills(q, s), vd = b.l >= Mj ? 'A안(' + esc(Lp.n) + ') 가결 (' + b.l + '표)' : b.r >= Mj ? 'B안(' + esc(Rp.n) + ') 가결 (' + b.r + '표)' : '어느 쪽도 과반 실패';
      return '<div class="vrow"><span>' + lab + '</span><div class="vbar"><span style="width:' + (b.l / a.N * 100) + '%;background:var(--pa)"></span><span style="width:' + (b.ab / a.N * 100) + '%;background:var(--line2)"></span><span style="width:' + (b.r / a.N * 100) + '%;background:var(--pb)"></span><em style="left:' + (Mj / a.N * 100) + '%"></em></div><span></span><div class="vnum"><span>A ' + b.l + '</span><span class="verdict">' + vd + '</span><span>B ' + b.r + '</span></div></div>'; };
    return '<div class="bill"><h4>' + esc(q.t) + ' <span class="tag">' + esc(fld(q.f).n) + '</span> <span class="tag">' + esc(whenTxt(q)) + '</span></h4><p class="hint" style="margin:0 0 6px">A안(' + esc(Lp.n) + ' 쪽): ' + esc(q.A) + '<br>B안(' + esc(Rp.n) + ' 쪽): ' + esc(q.B) + '</p><p class="you">나의 답: <b>' + you + '</b></p><div class="stake">' + st + '</div>' + row('나의 결과', mine) + row('실제 의석', real) + '</div>'; }).join('') : '<p class="hint">답한 질문이 없습니다.</p>';

  $('#again').addEventListener('click', () => viewPrio());
  $('#other').addEventListener('click', () => viewHome());
  show(keep ? S.view : 'mine');
  window.scrollTo(0, keep ? sy : 0);
}

load(); viewHome();
})();
