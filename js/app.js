/* 화면 조립: 데이터 불러오기 → 상태 → 계산(JPSim) → 반원 차트 / 총리 지명 / 의석표 / 지도 */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'style') el.style.cssText = attrs[k];
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    kids.flat().forEach(c => c != null && el.append(c.nodeType ? c : String(c)));
    return el;
  };
  const fmt = n => n.toLocaleString('ko-KR');
  const STORE = 'jp-sim-v1';

  const SKINS = [
    { id: 'auto', label: '자동', sw: 'linear-gradient(90deg,#fff 50%,#15171c 50%)' },
    { id: 'light', label: '라이트', sw: '#F3F4F7' },
    { id: 'dark', label: '다크', sw: '#171A20' },
    { id: 'pink', label: '핑크', sw: '#7B1C4F' },
    { id: 'paper', label: '올드페이퍼', sw: '#E6DBC1' },
    { id: 'win95', label: '윈도우 95', sw: '#008080' }
  ];

  let cfg, byId, state, result, mapEls = {}, built;

  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }

  function applySkin(id) {
    if (id === 'auto') document.documentElement.removeAttribute('data-skin');
    else document.documentElement.setAttribute('data-skin', id);
    document.querySelectorAll('.skins button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.skin === id)));
  }

  function defaultState(preset) {
    const p = preset || cfg.presets[0];
    const plan = {}; cfg.parties.forEach(x => plan[x.id] = x.pm_vote);
    return { preset: p.id, smd: { ...p.smd }, pr: { ...p.pr }, tab: 'smd', bias: {}, vol: 0.32, seed: 0,
             plan, runoff: {}, mapMode: 'smd', sel: 'JP13', skin: (state && state.skin) || 'auto' };
  }

  async function getJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(path + ' (' + r.status + ')');
    return r.json();
  }

  async function init() {
    try {
      const [p, f, b, geo] = await Promise.all([
        getJSON('data/parties.json'), getJSON('data/prefectures.json'), getJSON('data/blocks.json'), getJSON('jp.json')
      ]);
      cfg = { parties: p.parties, presets: p.presets, actual: p.actual_2026, prefectures: f.prefectures, blocks: b.blocks };
      built = JPMap.buildPaths(geo);
    } catch (e) {
      $('#app').prepend(h('div', { class: 'err' },
        '데이터를 불러오지 못했습니다: ' + e.message + '. 파일을 직접 열었다면(file://) GitHub Pages나 로컬 서버(예: python -m http.server)로 열어 주세요.'));
      return;
    }
    byId = {}; cfg.parties.forEach(p => byId[p.id] = p);
    const saved = load();
    state = saved && saved.smd ? Object.assign(defaultState(), saved) : defaultState();
    buildSkins(); applySkin(state.skin);
    buildControls();
    mapEls = JPMap.draw($('#map'), built, code => { state.sel = code; save(); renderMap(); });
    attachMapTips();
    run();
  }

  /* ── 테마 ── */
  function buildSkins() {
    const box = $('#skins'); box.textContent = '';
    SKINS.forEach(s => box.append(h('button', { type: 'button', 'data-skin': s.id, 'aria-pressed': 'false',
      onclick: () => { state.skin = s.id; applySkin(s.id); save(); } },
      h('span', { class: 'sw', style: 'background:' + s.sw }), s.label)));
  }

  /* ── 조작 패널 ── */
  function buildControls() {
    const sel = $('#preset'); sel.textContent = '';
    cfg.presets.forEach(p => sel.append(h('option', { value: p.id }, p.name)));
    sel.append(h('option', { value: 'custom' }, '사용자 설정'));
    sel.value = state.preset;
    sel.onchange = () => {
      const p = cfg.presets.find(x => x.id === sel.value);
      if (p) { state.preset = p.id; state.smd = { ...p.smd }; state.pr = { ...p.pr }; buildSliders(); run(); }
    };
    document.querySelectorAll('#voteTabs button').forEach(b => b.onclick = () => {
      state.tab = b.dataset.tab; buildSliders(); save();
    });
    $('#vol').value = state.vol;
    $('#vol').oninput = e => { state.vol = +e.target.value; $('#volOut').textContent = volLabel(state.vol); run(); };
    $('#volOut').textContent = volLabel(state.vol);
    $('#reroll').onclick = () => { state.seed++; run(); };
    $('#reset').onclick = () => { state = defaultState(); applySkin(state.skin); buildControls(); run(); };
    $('#copyPr').onclick = () => {
      const src = state.tab === 'smd' ? state.smd : state.pr, dst = state.tab === 'smd' ? 'pr' : 'smd';
      state[dst] = { ...src }; if (dst === 'pr') state.pr.ind = 0; state.preset = 'custom'; sel.value = 'custom'; run();
    };
    $('#copyPr').textContent = state.tab === 'smd' ? '지역구 값을 비례에 복사' : '비례 값을 지역구에 복사';
    document.querySelectorAll('#mapMode button').forEach(b => b.onclick = () => { state.mapMode = b.dataset.mode; save(); renderMap(); });
    buildSliders();
  }
  function volLabel(v) { return v < 0.2 ? '낮음' : v < 0.4 ? '보통' : '높음'; }

  function buildSliders() {
    document.querySelectorAll('#voteTabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
    $('#copyPr').textContent = state.tab === 'smd' ? '지역구 값을 비례에 복사' : '비례 값을 지역구에 복사';
    const box = $('#sliders'); box.textContent = '';
    const vals = state[state.tab];
    cfg.parties.forEach(p => {
      if (state.tab === 'pr' && p.id === 'ind') return; // 무소속은 비례 없음
      const v = vals[p.id] || 0;
      const rid = 's-' + state.tab + '-' + p.id;
      const num = h('input', { type: 'number', min: 0, max: 80, step: 0.1, value: v, id: rid + '-n', 'aria-label': p.name_ko + ' 득표율' });
      const rng = h('input', { type: 'range', min: 0, max: 60, step: 0.1, value: v, id: rid, 'aria-label': p.name_ko + ' 득표율' });
      const set = x => { vals[p.id] = Math.max(0, +x || 0); rng.value = vals[p.id]; num.value = vals[p.id]; state.preset = 'custom'; $('#preset').value = 'custom'; schedule(); };
      rng.oninput = e => set(e.target.value);
      num.onchange = e => set(e.target.value);
      box.append(h('div', { class: 'srow' },
        h('span', { class: 'chip', style: 'background:' + p.color }),
        h('label', { class: 'pn', for: rid, title: p.name_ja }, p.name_ko), rng, num));
    });
    updateSum();
  }
  function updateSum() {
    const vals = state[state.tab]; let s = 0; for (const k in vals) s += +vals[k] || 0;
    $('#sum').innerHTML = '';
    $('#sum').append(h('span', null, '입력 합계 ', h('b', { class: 'num' }, s.toFixed(1) + '%')), h('span', null, '100%로 자동 환산'));
  }

  let raf = 0;
  function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); }

  /* ── 계산 & 그리기 ── */
  function run() {
    updateSum();
    result = JPSim.simulate(cfg, { smd: state.smd, pr: state.pr, bias: state.bias, volatility: state.vol, seed: 'jp' + state.seed });
    renderArch(); renderPM(); renderTable(); renderMap();
    save();
  }

  function renderArch() {
    const groups = cfg.parties.map(p => ({ id: p.id, color: p.color, n: result.seats[p.id].total })).filter(g => g.n > 0);
    const need = Math.floor(result.total / 2) + 1;
    JPArch.draw($('#arch'), groups, { total: result.total, need });
    const lg = $('#legend'); lg.textContent = '';
    groups.forEach(g => {
      const p = byId[g.id];
      const el = h('span', { tabindex: '0', title: p.name_ja },
        h('i', { class: 'chip', style: 'background:' + p.color }), p.name_ko, h('b', null, g.n));
      el.onmouseenter = el.onfocus = () => JPArch.highlight($('#arch'), g.id);
      el.onmouseleave = el.onblur = () => JPArch.highlight($('#arch'), null);
      lg.append(el);
    });
  }

  function candLabel(pid) {
    const p = byId[pid]; return p.pm_candidate_ko + ' (' + p.short + ')';
  }

  function renderPM() {
    const seats = {}; cfg.parties.forEach(p => seats[p.id] = result.seats[p.id]);
    const pm = JPSim.pmVote(cfg, seats, state.plan, state.runoff);
    const r1 = pm.round1, ro = pm.runoff;
    const body = $('#pmBody'); body.textContent = '';
    const head = $('#pmHead'); head.textContent = '';
    head.append(h('tr', null, h('th', null, '후보'), h('th', null, '추천 정당'), h('th', { style: 'text-align:right' }, '1차'),
      ro ? h('th', { style: 'text-align:right' }, '결선') : null, h('th', { style: 'width:32%' }, '득표 (과반선 표시)')));
    r1.order.forEach(cid => {
      const p = byId[cid];
      const v1 = r1.tally[cid], v2 = ro && ro.tally[cid] != null ? ro.tally[cid] : null;
      const shown = v2 != null ? v2 : v1;
      const denom = ro ? r1.cast : r1.cast;
      const isWin = pm.winner === cid;
      const backers = (r1.voters[cid] || []).filter(x => x !== cid).map(x => byId[x].short);
      body.append(h('tr', { class: isWin ? 'win' : '' },
        h('td', null, h('div', { class: 'pm-name' },
          h('span', { class: 'chip', style: 'background:' + p.color }),
          h('div', null, h('div', { class: 'ja' }, p.pm_candidate), h('div', { class: 'ko' }, p.pm_candidate_ko)),
          isWin ? h('span', { class: 'badge' }, '지명') : null)),
        h('td', null, p.name_ko, backers.length ? h('div', { class: 'ko', style: 'color:var(--muted);font-size:12px' }, '+ ' + backers.join('·') + ' 지지') : null),
        h('td', { class: 'num', style: 'text-align:right' }, fmt(v1)),
        ro ? h('td', { class: 'num', style: 'text-align:right' }, v2 == null ? '—' : fmt(v2)) : null,
        h('td', null, h('div', { class: 'pm-bar' },
          h('i', { style: `width:${(shown / denom * 100).toFixed(1)}%;background:${p.color}` }),
          h('span', { class: 'need', style: `left:${(r1.need / denom * 100).toFixed(1)}%` })))
      ));
    });
    body.append(h('tr', null, h('td', { style: 'color:var(--muted)' }, '백지·무효'), h('td', null, ''),
      h('td', { class: 'num', style: 'text-align:right;color:var(--muted)' }, fmt(r1.blank)),
      ro ? h('td', { class: 'num', style: 'text-align:right;color:var(--muted)' }, fmt(ro.blank)) : null, h('td', null, '')));

    const res = $('#pmResult'); res.textContent = '';
    if (pm.winner) {
      const w = byId[pm.winner];
      const how = ro ? `1차 투표에서 과반(${r1.need}표)을 얻은 후보가 없어 상위 2인 결선투표에서 ${fmt(ro.tally[pm.winner])}표로 지명`
                     : `1차 투표에서 ${fmt(r1.tally[pm.winner])}표로 과반(${r1.need}표) 확보`;
      res.append(h('strong', null, w.pm_candidate), ` ${w.pm_candidate_ko} (${w.name_ko}) — ${how}. 투표총수 ${fmt(r1.cast)}.`);
    } else res.append('지명할 후보가 없습니다. 투표 방침을 확인하세요.');

    // 연립 블록 (지명 지지 정당)
    const bloc = pm.winner ? (r1.voters[pm.winner] || []) : [];
    const blocSeats = bloc.reduce((a, id) => a + result.seats[id].total, 0);
    const pills = $('#pills'); pills.textContent = '';
    if (bloc.length) {
      pills.append(h('span', { class: 'pill yes' }, '지명 지지 블록 ' + bloc.map(id => byId[id].short).join('+') + ' ' + blocSeats + '석'));
      [[233, '과반'], [244, '안정다수'], [261, '절대안정다수'], [310, '3분의 2']].forEach(([n, l]) =>
        pills.append(h('span', { class: 'pill' + (blocSeats >= n ? ' yes' : '') }, l + ' ' + n + (blocSeats >= n ? ' ✓' : ''))));
    }
    buildPlan(pm);
  }

  function buildPlan(pm) {
    const grid = $('#planGrid'); grid.textContent = '';
    const cands = cfg.parties.filter(p => p.pm_candidate);
    cfg.parties.forEach(p => {
      if (!result.seats[p.id].total) return;
      const id = 'plan-' + p.id;
      const s = h('select', { id, onchange: e => { state.plan[p.id] = e.target.value; state.runoff = {}; run(); } });
      if (p.pm_candidate) s.append(h('option', { value: 'self' }, '자당 ' + p.pm_candidate_ko));
      cands.forEach(c => { if (c.id !== p.id) s.append(h('option', { value: c.id }, candLabel(c.id))); });
      s.append(h('option', { value: 'blank' }, '백지 투표'));
      s.value = state.plan[p.id] || (p.pm_candidate ? 'self' : 'blank');
      grid.append(h('div', { class: 'pr' }, h('span', { class: 'chip', style: 'background:' + p.color }),
        h('label', { for: id }, p.name_ko + ' ', h('span', { class: 'num', style: 'color:var(--muted)' }, result.seats[p.id].total)), s));
    });
    const rbox = $('#runoffGrid'); rbox.textContent = '';
    $('#runoffWrap').hidden = !pm.runoff;
    if (pm.runoff) {
      const fin = pm.runoff.finalists;
      cfg.parties.forEach(p => {
        if (!result.seats[p.id].total) return;
        const t = state.plan[p.id] === 'self' ? p.id : state.plan[p.id];
        if (fin.includes(t)) return;
        const id = 'run-' + p.id;
        const s = h('select', { id, onchange: e => { state.runoff[p.id] = e.target.value; run(); } });
        fin.forEach(f => s.append(h('option', { value: f }, candLabel(f))));
        s.append(h('option', { value: 'blank' }, '백지 투표'));
        s.value = state.runoff[p.id] || 'blank';
        rbox.append(h('div', { class: 'pr' }, h('span', { class: 'chip', style: 'background:' + p.color }),
          h('label', { for: id }, p.name_ko), s));
      });
    }
  }

  function renderTable() {
    const body = $('#seatBody'); body.textContent = '';
    const rows = cfg.parties.map(p => ({ p, s: result.seats[p.id] })).sort((a, b) => b.s.total - a.s.total || b.s.pr - a.s.pr);
    rows.forEach(({ p, s }) => {
      const act = cfg.actual[p.id] ? cfg.actual[p.id][0] + cfg.actual[p.id][1] : 0;
      const d = s.total - act;
      if (!s.total && !act) return;
      body.append(h('tr', null,
        h('td', null, h('span', { class: 'chip', style: 'background:' + p.color + ';margin-right:8px;vertical-align:-1px' }), p.name_ko,
          h('span', { style: 'color:var(--muted);margin-left:6px;font-size:12px' }, p.name_ja)),
        h('td', { class: 'num' }, s.smd), h('td', { class: 'num' }, s.pr), h('td', { class: 'num' }, h('b', null, s.total)),
        h('td', { class: 'num' }, (s.total / result.total * 100).toFixed(1) + '%'),
        h('td', { class: 'num ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') }, (d > 0 ? '+' : '') + d)));
    });
    $('#seatFoot').textContent = '';
    $('#seatFoot').append(h('tr', null, h('td', null, '합계'), h('td', { class: 'num' }, 289), h('td', { class: 'num' }, 176),
      h('td', { class: 'num' }, result.total), h('td', null, ''), h('td', null, '')));
  }

  /* ── 지도 ── */
  function prefColor(code) {
    if (state.mapMode === 'pr') {
      const pf = cfg.prefectures.find(x => x.code === code);
      const br = result.blockResults[pf.block];
      return { color: byId[br.top].color, op: 0.45 + 0.55 * (br.alloc[br.top] / cfg.blocks.find(b => b.id === pf.block).seats) };
    }
    const r = result.prefResults[code];
    const pf = cfg.prefectures.find(x => x.code === code);
    return { color: byId[r.top].color, op: 0.4 + 0.6 * (r.won[r.top] / pf.seats) };
  }

  function renderMap() {
    document.querySelectorAll('#mapMode button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === state.mapMode)));
    for (const code in mapEls) {
      const c = prefColor(code);
      mapEls[code].setAttribute('fill', c.color);
      mapEls[code].style.opacity = c.op.toFixed(2);
      mapEls[code].classList.toggle('sel', code === state.sel);
    }
    renderPref();
  }

  function renderPref() {
    const pf = cfg.prefectures.find(x => x.code === state.sel) || cfg.prefectures[12];
    const box = $('#prefDetail'); box.textContent = '';
    const blk = cfg.blocks.find(b => b.id === pf.block);
    box.append(h('h3', null, pf.name_ja), h('p', { class: 'meta' }, `${pf.name_ko} · 지역구 ${pf.seats}석 · 비례 ${blk.name_ko} 블록(${blk.seats}석)`));
    if (state.mapMode === 'pr') {
      const br = result.blockResults[pf.block];
      const ul = h('ul', { class: 'dlist' });
      Object.keys(br.alloc).filter(k => br.alloc[k] > 0).sort((a, b) => br.alloc[b] - br.alloc[a]).forEach(id => {
        ul.append(h('li', null, h('span', { class: 'num' }, br.alloc[id] + '석'), h('span', { class: 'chip', style: 'background:' + byId[id].color }),
          byId[id].name_ko, h('span', { class: 'num', style: 'color:var(--muted)' }, (br.share[id] * 100).toFixed(1) + '%')));
      });
      box.append(h('div', { class: 'lbl' }, blk.name_ja + ' 블록 배분 (동트식)'), ul);
      return;
    }
    const r = result.prefResults[pf.code];
    const ul = h('ul', { class: 'dlist' });
    r.districts.forEach(d => {
      const w = byId[d.winner];
      ul.append(h('li', { title: `2위 ${byId[d.runner].name_ko} ${(d.share[d.runner] * 100).toFixed(1)}%` },
        h('span', { class: 'num' }, d.no + '구'), h('span', { class: 'chip', style: 'background:' + w.color }), w.name_ko,
        h('span', { class: 'num', style: 'color:var(--muted)' }, (d.share[d.winner] * 100).toFixed(1) + '% · 차 ' + (d.margin * 100).toFixed(1))));
    });
    box.append(h('div', { class: 'lbl' }, '선거구별 당선 (득표율 · 2위와 격차 %p)'), ul);

    const bias = state.bias[pf.code] || {};
    const wrap = h('div', { class: 'bias' }, h('div', { class: 'lbl' }, '이 지역 성향 보정 (전국 득표율에 곱하는 배수)'));
    cfg.parties.forEach(p => {
      if (!(state.smd[p.id] > 0)) return;
      const v = bias[p.id] == null ? 1 : bias[p.id];
      const id = 'b-' + pf.code + '-' + p.id;
      const out = h('span', { class: 'num', style: 'font-size:12px;text-align:right' }, '×' + v.toFixed(2));
      const rng = h('input', { type: 'range', id, min: 0.2, max: 3, step: 0.05, value: v, 'aria-label': p.name_ko + ' 보정' });
      rng.oninput = e => {
        const nv = +e.target.value; state.bias[pf.code] = state.bias[pf.code] || {};
        state.bias[pf.code][p.id] = nv; out.textContent = '×' + nv.toFixed(2);
        cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { result = JPSim.simulate(cfg, { smd: state.smd, pr: state.pr, bias: state.bias, volatility: state.vol, seed: 'jp' + state.seed }); renderArch(); renderPM(); renderTable(); refreshMapOnly(); updateDistricts(pf); save(); });
      };
      wrap.append(h('div', { class: 'srow' }, h('span', { class: 'chip', style: 'background:' + p.color }),
        h('label', { class: 'pn', for: id }, p.name_ko), rng, out));
    });
    wrap.append(h('button', { class: 'btn', type: 'button', style: 'margin-top:8px', onclick: () => { delete state.bias[pf.code]; run(); } }, '이 지역 보정 초기화'));
    box.append(wrap);
  }
  function refreshMapOnly() {
    for (const code in mapEls) { const c = prefColor(code); mapEls[code].setAttribute('fill', c.color); mapEls[code].style.opacity = c.op.toFixed(2); }
  }
  function updateDistricts(pf) {
    const ul = $('#prefDetail .dlist'); if (!ul) return;
    const r = result.prefResults[pf.code];
    ul.textContent = '';
    r.districts.forEach(d => {
      const w = byId[d.winner];
      ul.append(h('li', null, h('span', { class: 'num' }, d.no + '구'), h('span', { class: 'chip', style: 'background:' + w.color }), w.name_ko,
        h('span', { class: 'num', style: 'color:var(--muted)' }, (d.share[d.winner] * 100).toFixed(1) + '% · 차 ' + (d.margin * 100).toFixed(1))));
    });
  }

  function attachMapTips() {
    const tip = $('#tip');
    $('#map').addEventListener('mousemove', e => {
      const code = e.target.dataset && e.target.dataset.code;
      if (!code) { tip.hidden = true; return; }
      const pf = cfg.prefectures.find(x => x.code === code);
      let txt;
      if (state.mapMode === 'pr') {
        const br = result.blockResults[pf.block];
        txt = pf.name_ja + ' · ' + cfg.blocks.find(b => b.id === pf.block).name_ko + ' 블록 1위 ' + byId[br.top].name_ko + ' ' + br.alloc[br.top] + '석';
      } else {
        const r = result.prefResults[code];
        txt = pf.name_ja + ' ' + pf.name_ko + ' · ' + Object.keys(r.won).filter(k => r.won[k]).sort((a, b) => r.won[b] - r.won[a]).map(k => byId[k].short + ' ' + r.won[k]).join(', ');
      }
      tip.textContent = txt; tip.hidden = false;
      tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 250) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
    });
    $('#map').addEventListener('mouseleave', () => tip.hidden = true);
  }

  init();
})();
