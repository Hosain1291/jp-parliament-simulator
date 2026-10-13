/* 계산 엔진 — 화면과 분리된 순수 함수 (node로도 테스트 가능).
   국회 시뮬레이터(national-assembly-simulator)와 같은 방식:
   1) 분야 중요도에 비례해 지역구·비례 의석을 분야별로 나눔
   2) 질문마다 답변 위치와 정당 입장의 거리로 종 모양(가우스) 득표를 냄
   3) 지역구는 승자독식에 가깝게(소선거구 득표의 2.5제곱, 중선거구 1.5제곱), 비례는 득표 비례로 배분
   4) 총리 지명선거: 1차 투표 과반(투표총수 기준) → 없으면 상위 2인 결선 */
(function (root) {
  'use strict';
  const SIG = 0.4, KX = 2.5, PE = 0.8, INDP = 0.4;
  const LV = [{ n: '관심 없음', w: 0 }, { n: '조금', w: 1 }, { n: '보통', w: 2 }, { n: '중요', w: 3.5 }, { n: '매우 중요', w: 5 }];
  const sum = a => a.reduce((s, v) => s + v, 0);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const maj = N => Math.floor(N / 2) + 1, two3 = N => Math.ceil(N * 2 / 3);

  /** 최대잉여 배분 */
  function lr(w, total) {
    const s = sum(w); if (!s || total <= 0) return w.map(() => 0);
    const raw = w.map(x => x / s * total), fl = raw.map(Math.floor);
    raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, total - sum(fl)).forEach(x => fl[x[1]]++);
    return fl;
  }
  /** 동트식 */
  function dhondt(w, seats) {
    const out = w.map(() => 0);
    for (let s = 0; s < seats; s++) {
      let b = -1, bq = 0; w.forEach((v, i) => { const q = v / (out[i] + 1); if (q > bq) { bq = q; b = i; } });
      if (b < 0) break; out[b]++;
    }
    return out;
  }

  function pos(q, p) { return q.p[p.k] != null ? q.p[p.k] : p.l; }

  function make(a, ctx) {
    // ctx: { fimp: {field: level}, prior: bool, FK: [field keys] }
    const fw = k => (LV[ctx.fimp[k]] || LV[0]).w;
    const qsOf = (k, n) => { const all = a.Q.map((q, i) => i).filter(i => a.Q[i].f === k); return n == null ? all : all.slice(0, n); };
    const fieldsOf = () => ctx.FK.filter(k => qsOf(k).length);
    const activeOf = () => fieldsOf().filter(k => fw(k) > 0);
    function chunks(act) {
      const w = ctx.FK.map(k => act.includes(k) ? fw(k) : 0), d = lr(w, a.D), l = lr(w, a.L), o = {};
      ctx.FK.forEach((k, j) => { o[k] = { d: d[j], l: l[j], t: d[j] + l[j] }; }); return o;
    }
    function prior() {
      const base = sum(a.P.map(p => p.s)) || 1;
      return a.P.map(p => (ctx.prior ? Math.pow(Math.max(p.s / base, 0.004), PE) : 1) * (p.k === 'ind' ? INDP : 1));
    }
    function fieldRes(k, C2, ans) {
      const P = a.P, pr = prior(), Z = () => P.map(() => 0);
      const qs = qsOf(k).filter(i => ans[i] !== undefined), ansd = qs.filter(i => ans[i] != null), per = {};
      if (!ansd.length) {
        const dd = lr(pr, C2.d), ll = lr(pr.map((x, f) => P[f].k === 'ind' ? 0 : x), C2.l), T = sum(pr) || 1;
        return { dist: dd, list: ll, tot: dd.map((x, f) => x + ll[f]), vs: pr.map(x => x / T), per, empty: true };
      }
      const dq = lr(qs.map(() => 1), C2.d), dist = Z(), vs = Z(); let spare = 0;
      qs.forEach((i, j) => {
        if (ans[i] == null) { spare += dq[j]; return; }
        const q = a.Q[i], g = P.map((p, f) => Math.exp(-Math.pow(ans[i] - pos(q, p), 2) / (2 * SIG * SIG)) * pr[f]), G = sum(g) || 1;
        g.forEach((x, f) => vs[f] += x / G / ansd.length);
        const d = lr(g.map(x => Math.pow(x / G, a.sys === 'mmd' ? 1.5 : KX)), dq[j]); d.forEach((x, f) => dist[f] += x); per[i] = { seats: dq[j], d };
      });
      let Lc = C2.l;
      if (a.L) Lc += spare; else lr(vs, spare).forEach((x, f) => dist[f] += x); // 비례가 없으면 건너뛴 질문 몫은 득표율대로 지역구에
      let lv = vs.map((x, f) => P[f].k === 'ind' ? 0 : x); if (!sum(lv)) lv = pr.slice();
      const list = lr(lv, Lc);
      return { dist, list, tot: dist.map((x, f) => x + list[f]), vs, per, empty: false };
    }
    function simAll(ans, upto) {
      const act = activeOf(), C2 = chunks(act), Z = () => a.P.map(() => 0), dist = Z(), list = Z(), vs = Z(), fields = {};
      act.forEach(k => {
        const r = fieldRes(k, C2[k], ans); fields[k] = r; vs.forEach((_, f) => vs[f] += r.vs[f] * fw(k));
        if (!upto || upto.includes(k)) r.dist.forEach((x, f) => { dist[f] += x; list[f] += r.list[f]; });
      });
      if (!act.length && !upto) { const pr = prior(); lr(pr, a.D).forEach((x, f) => dist[f] += x); lr(pr.map((x, f) => a.P[f].k === 'ind' ? 0 : x), a.L).forEach((x, f) => list[f] += x); }
      const VT = sum(vs);
      return { act, C: C2, fields, dist, list, vs: VT ? vs.map(x => x / VT) : vs, tot: dist.map((x, f) => x + list[f]) };
    }
    return { fw, qsOf, fieldsOf, activeOf, chunks, prior, fieldRes, simAll };
  }

  /** 정당의 두 축 좌표: 해당 축 질문 입장의 평균 */
  function partyAx(a) {
    return a.P.map(p => {
      const m = k => { const qs = a.Q.filter(q => q.ax === k); return qs.length ? sum(qs.map(q => pos(q, p))) / qs.length : p.l; };
      return { e: m('e'), s: m('s') };
    });
  }

  /** 총리 지명선거 */
  function pmVote(a, st, plan, runoff) {
    const cand = f => a.P[f] && a.P[f].pmc ? f : -1;
    const tally = {}, voters = {}; let blank = 0, cast = 0;
    a.P.forEach((p, f) => {
      const n = st[f]; if (!n) return; cast += n;
      let t = plan[p.k]; if (t == null) t = p.k; const tf = a.P.findIndex(x => x.k === t);
      if (t === 'blank' || tf < 0 || cand(tf) < 0) { blank += n; return; }
      tally[tf] = (tally[tf] || 0) + n; (voters[tf] = voters[tf] || []).push(f);
    });
    const need = maj(cast), order = Object.keys(tally).map(Number).sort((x, y) => tally[y] - tally[x]);
    const r1 = { tally, voters, blank, cast, need, order };
    if (!order.length) return { r1, r2: null, win: -1 };
    if (tally[order[0]] >= need || order.length < 2) return { r1, r2: null, win: order[0] };
    const fin = order.slice(0, 2), t2 = { [fin[0]]: 0, [fin[1]]: 0 }; let b2 = 0;
    a.P.forEach((p, f) => {
      const n = st[f]; if (!n) return;
      let t = plan[p.k]; if (t == null) t = p.k; let tf = a.P.findIndex(x => x.k === t);
      if (!fin.includes(tf)) { const r = runoff[p.k]; tf = r == null ? -1 : a.P.findIndex(x => x.k === r); }
      if (fin.includes(tf)) t2[tf] += n; else b2 += n;
    });
    return { r1, r2: { fin, tally: t2, blank: b2 }, win: t2[fin[0]] >= t2[fin[1]] ? fin[0] : fin[1] };
  }

  /** 연립 후보: 성향이 가까운(순위 차 3 이내) 정당끼리 과반을 만드는 최소 연합 */
  function coalitions(a, st, span) {
    const M = maj(a.N), ord = a.P.map((p, f) => f).filter(f => a.P[f].k !== 'ind').sort((x, y) => a.P[x].l - a.P[y].l || x - y), rank = {};
    ord.forEach((f, i) => { rank[f] = i; });
    const fs = ord.filter(f => st[f] > 0), res = [];
    (function rec(s, cur) {
      if (cur.length) {
        const sp = rank[cur[cur.length - 1]] - rank[cur[0]]; if (span && sp > 3) return;
        const t = sum(cur.map(f => st[f]));
        if (t >= M) { if (cur.every(f => t - st[f] < M)) res.push({ m: cur.slice(), t, sp }); return; }
      }
      if (cur.length >= 5) return;
      for (let k = s; k < fs.length; k++) { cur.push(fs[k]); rec(k + 1, cur); cur.pop(); }
    })(0, []);
    res.sort((x, y) => x.m.length - y.m.length || x.sp - y.sp || y.t - x.t);
    return res.slice(0, 6);
  }

  /** 지도용: 정당별 지역구 의석을 도도부현에 추정 배치 (행·열 합을 맞추는 반복 비례 조정 후 정수화) */
  function placeSeats(a, dist, prefs) {
    const D = sum(dist); if (!D) return {};
    const base = prefs.map(p => p[3]), seats = lr(base, D);
    const fam = a.P.map(p => p.fam || 'oth');
    let W = prefs.map((p, r) => a.P.map((_, f) => dist[f] ? (dist[f] / D) * (p[4][fam[f]] || 1) : 0));
    for (let it = 0; it < 40; it++) {
      W = W.map((row, r) => { const s = sum(row) || 1; return row.map(x => x / s * seats[r]); });
      const col = a.P.map((_, f) => sum(W.map(row => row[f])));
      W = W.map(row => row.map((x, f) => col[f] ? x / col[f] * dist[f] : 0));
    }
    const out = W.map(row => row.map(Math.floor));
    const rowLeft = seats.map((s, r) => s - sum(out[r])), colLeft = dist.map((d, f) => d - sum(out.map(row => row[f])));
    const cells = []; W.forEach((row, r) => row.forEach((x, f) => cells.push([x - Math.floor(x), r, f])));
    cells.sort((x, y) => y[0] - x[0]);
    cells.forEach(([, r, f]) => { if (rowLeft[r] > 0 && colLeft[f] > 0) { out[r][f]++; rowLeft[r]--; colLeft[f]--; } });
    // 남은 자리: 여유 있는 정당 중 그 지역 가중치가 큰 정당
    rowLeft.forEach((n, r) => { while (n > 0) { let b = -1; colLeft.forEach((c, f) => { if (c > 0 && (b < 0 || W[r][f] > W[r][b])) b = f; }); if (b < 0) break; out[r][b]++; colLeft[b]--; n--; } rowLeft[r] = n; });
    const res = {}; prefs.forEach((p, r) => { res[p[0]] = { n: seats[r], won: out[r] }; });
    return res;
  }

  root.JPEngine = { SIG, LV, lr, dhondt, sum, clamp, maj, two3, pos, make, partyAx, pmVote, coalitions, placeSeats };
  if (typeof module !== 'undefined') module.exports = root.JPEngine;
})(typeof window !== 'undefined' ? window : globalThis);
