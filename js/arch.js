/* 반원 부채꼴(arch) 의석 차트.
   좌석을 동심원 줄에 배치한 뒤 각도순으로 정렬해 정당을 채우므로 정당별로 부채꼴 조각이 됩니다. */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function layout(n, rows, inner) {
    const radii = [];
    for (let i = 0; i < rows; i++) radii.push(inner + (1 - inner) * i / (rows - 1));
    const sumR = radii.reduce((a, b) => a + b, 0);
    const per = radii.map(r => Math.round(n * r / sumR));
    let diff = n - per.reduce((a, b) => a + b, 0);
    for (let i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) { per[i] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1; }
    const seats = [];
    radii.forEach((r, i) => {
      const s = per[i];
      for (let j = 0; j < s; j++) {
        const t = s === 1 ? Math.PI / 2 : Math.PI * (1 - j / (s - 1));
        seats.push({ r, t });
      }
    });
    seats.sort((a, b) => (b.t - a.t) || (a.r - b.r));
    return { seats, dot: (1 - inner) / (rows - 1) * 0.42 };
  }

  /**
   * @param svg SVG 요소
   * @param groups [{id, color, label, n}] 왼쪽→오른쪽 순서
   * @param opts {total, need}
   */
  function draw(svg, groups, opts) {
    const total = opts.total;
    const R = 300, cx = 320, cy = 318;
    const L = layout(total, 13, 0.4);
    svg.setAttribute('viewBox', '0 0 640 340');
    svg.textContent = '';
    const g = document.createElementNS(NS, 'g');
    let k = 0;
    groups.forEach(grp => {
      for (let i = 0; i < grp.n && k < L.seats.length; i++, k++) {
        const s = L.seats[k];
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', (cx + Math.cos(s.t) * s.r * R).toFixed(2));
        c.setAttribute('cy', (cy - Math.sin(s.t) * s.r * R).toFixed(2));
        c.setAttribute('r', (L.dot * R).toFixed(2));
        c.setAttribute('fill', grp.color);
        c.setAttribute('class', 'seat');
        c.dataset.party = grp.id;
        g.appendChild(c);
      }
    });
    svg.appendChild(g);

    // 과반선 (중앙 수직)
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', cx); line.setAttribute('x2', cx);
    line.setAttribute('y1', cy - R * 0.36); line.setAttribute('y2', cy - R * 1.04);
    line.setAttribute('stroke', 'currentColor'); line.setAttribute('stroke-dasharray', '3 4');
    line.setAttribute('opacity', '.45');
    svg.appendChild(line);

    const t1 = document.createElementNS(NS, 'text');
    t1.setAttribute('x', cx); t1.setAttribute('y', cy - 40); t1.setAttribute('text-anchor', 'middle');
    t1.setAttribute('class', 'arch-total'); t1.setAttribute('font-size', '54');
    t1.textContent = total;
    const t2 = document.createElementNS(NS, 'text');
    t2.setAttribute('x', cx); t2.setAttribute('y', cy - 12); t2.setAttribute('text-anchor', 'middle');
    t2.setAttribute('class', 'arch-sub');
    t2.textContent = '정수 · 과반 ' + opts.need;
    svg.appendChild(t1); svg.appendChild(t2);
  }

  function highlight(svg, partyId) {
    if (!partyId) { svg.classList.remove('dim'); svg.querySelectorAll('.on').forEach(c => c.classList.remove('on')); return; }
    svg.classList.add('dim');
    svg.querySelectorAll('circle.seat').forEach(c => c.classList.toggle('on', c.dataset.party === partyId));
  }

  root.JPArch = { draw, highlight, layout };
})(window);
