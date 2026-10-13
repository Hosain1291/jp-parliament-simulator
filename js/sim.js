/* 선거 계산 엔진 — 화면과 분리된 순수 함수 모음.
   지역구 289석: 도도부현별 정원만큼 선거구를 만들고, 각 선거구 득표율 =
   전국 득표율 × 도도부현 성향(lean) × 사용자 보정(bias) × 선거구 고유 변동(seed)
   → 최다 득표자 당선(단순다수제).
   비례 176석: 11개 블록별 득표율 = 전국 비례 득표율 × 블록 성향 → 동트식 배분. */
(function (root) {
  'use strict';

  // 문자열 시드 → 0~1 난수 (선거구마다 항상 같은 값)
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  }
  // 시드 기반 정규분포 근사 (Box–Muller)
  function gauss(seed) {
    const u = Math.max(1e-9, hash(seed + 'a'));
    const v = hash(seed + 'b');
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function normalize(obj) {
    let s = 0; for (const k in obj) s += Math.max(0, obj[k] || 0);
    const out = {}; for (const k in obj) out[k] = s > 0 ? Math.max(0, obj[k] || 0) / s : 0;
    return out;
  }

  /** 동트식(D'Hondt) 배분 */
  function dhondt(votes, seats) {
    const res = {}; Object.keys(votes).forEach(k => res[k] = 0);
    for (let s = 0; s < seats; s++) {
      let best = null, bestQ = -1;
      for (const k in votes) {
        const q = votes[k] / (res[k] + 1);
        if (q > bestQ) { bestQ = q; best = k; }
      }
      if (best === null || bestQ <= 0) break;
      res[best]++;
    }
    return res;
  }

  /**
   * @param cfg { parties, prefectures, blocks }
   * @param input { smd:{id:%}, pr:{id:%}, bias:{prefCode:{id:mult}}, volatility, seed }
   */
  function simulate(cfg, input) {
    const ids = cfg.parties.map(p => p.id);
    const vol = input.volatility == null ? 0.32 : input.volatility;
    const seed = input.seed || 'jp';
    const smdN = normalize(input.smd);
    const prN = normalize(input.pr);

    const seats = {}; ids.forEach(id => seats[id] = { smd: 0, pr: 0, total: 0 });
    const prefResults = {};

    cfg.prefectures.forEach(pf => {
      const bias = (input.bias && input.bias[pf.code]) || {};
      const base = {};
      ids.forEach(id => {
        base[id] = (smdN[id] || 0) * (pf.lean[id] || 1) * (bias[id] == null ? 1 : bias[id]);
      });
      const prefShare = normalize(base);
      const districts = [];
      const won = {}; ids.forEach(id => won[id] = 0);
      for (let d = 1; d <= pf.seats; d++) {
        const raw = {};
        ids.forEach(id => {
          // 무소속은 지역 인물 변수가 커서 변동 폭을 크게
          const v = id === 'ind' ? vol * 3.0 : vol;
          raw[id] = prefShare[id] * Math.exp(v * gauss(seed + pf.code + d + id));
        });
        const share = normalize(raw);
        const ranked = ids.slice().sort((a, b) => share[b] - share[a]);
        const winner = ranked[0];
        won[winner]++;
        seats[winner].smd++;
        districts.push({ no: d, winner, runner: ranked[1], share, margin: share[winner] - share[ranked[1]] });
      }
      let top = ids[0];
      ids.forEach(id => { if (won[id] > won[top] || (won[id] === won[top] && prefShare[id] > prefShare[top])) top = id; });
      prefResults[pf.code] = { won, top, prefShare, districts };
    });

    const blockResults = {};
    cfg.blocks.forEach(b => {
      const v = {};
      ids.forEach(id => { if (id !== 'ind') v[id] = (prN[id] || 0) * (b.lean[id] || 1); });
      const share = normalize(v);
      const alloc = dhondt(share, b.seats);
      Object.keys(alloc).forEach(id => seats[id].pr += alloc[id]);
      let top = null; Object.keys(alloc).forEach(id => { if (top === null || alloc[id] > alloc[top]) top = id; });
      blockResults[b.id] = { share, alloc, top };
    });

    let total = 0;
    ids.forEach(id => { seats[id].total = seats[id].smd + seats[id].pr; total += seats[id].total; });
    return { seats, total, prefResults, blockResults };
  }

  /**
   * 내각총리대신 지명선거 (중의원). 1차 투표에서 투표총수 과반 득표자가 없으면 상위 2인 결선.
   * @param votePlan {partyId: targetPartyId | 'blank'}  (1차)
   * @param runoffPlan {partyId: targetPartyId | 'blank'} (결선, 지지 후보가 탈락한 정당용)
   */
  function pmVote(cfg, seats, votePlan, runoffPlan) {
    const byId = {}; cfg.parties.forEach(p => byId[p.id] = p);
    const tally = {}; let blank = 0, cast = 0;
    const voters = {}; // 후보(정당 id) → 투표한 정당 목록
    cfg.parties.forEach(p => {
      const n = seats[p.id].total; if (!n) return;
      cast += n;
      let t = votePlan[p.id] || 'blank';
      if (t === 'self') t = p.id;
      if (t !== 'blank' && !(byId[t] && byId[t].pm_candidate)) t = 'blank';
      if (t === 'blank') { blank += n; return; }
      tally[t] = (tally[t] || 0) + n;
      (voters[t] = voters[t] || []).push(p.id);
    });
    const need = Math.floor(cast / 2) + 1;
    const order = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
    const r1 = { tally, blank, cast, need, order, voters };
    if (order.length && tally[order[0]] >= need) {
      return { round1: r1, runoff: null, winner: order[0] };
    }
    if (order.length < 2) return { round1: r1, runoff: null, winner: order[0] || null };

    const finalists = order.slice(0, 2);
    const t2 = {}; finalists.forEach(f => t2[f] = 0); let blank2 = 0;
    cfg.parties.forEach(p => {
      const n = seats[p.id].total; if (!n) return;
      let t = votePlan[p.id] === 'self' ? p.id : votePlan[p.id];
      if (!finalists.includes(t)) t = (runoffPlan && runoffPlan[p.id]) || 'blank';
      if (finalists.includes(t)) t2[t] += n; else blank2 += n;
    });
    const winner = t2[finalists[0]] >= t2[finalists[1]] ? finalists[0] : finalists[1];
    return { round1: r1, runoff: { finalists, tally: t2, blank: blank2 }, winner };
  }

  root.JPSim = { simulate, pmVote, dhondt, normalize, hash };
  if (typeof module !== 'undefined') module.exports = root.JPSim;
})(typeof window !== 'undefined' ? window : globalThis);
