/* 도도부현 지도 — jp.json(GeoJSON, 경위도)을 SVG 경로로 변환.
   오가사와라 제도(도쿄 남쪽 원격 섬)는 제외하고, 오키나와는 왼쪽 위 상자(인셋)로 옮겨 그립니다. */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const K = 34, COS = Math.cos(36 * Math.PI / 180);
  const OKI_SHIFT = [6.0, 15.0]; // 오키나와 이동량(경도, 위도)

  function proj(lon, lat) { return [(lon - 128) * COS * K, (46 - lat) * K]; }

  function polygonsOf(f) {
    const g = f.geometry;
    return g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  }

  function buildPaths(geo) {
    const out = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let insetBox = null;
    geo.features.forEach(f => {
      const code = f.properties.id;
      const isOki = code === 'JP47';
      let d = '';
      polygonsOf(f).forEach(poly => {
        const outer = poly[0];
        let lo = Infinity, la = Infinity; outer.forEach(p => { lo = Math.min(lo, p[0]); la = Math.min(la, p[1]); });
        if (code === 'JP13' && la < 32) return;        // 오가사와라 제외
        if (isOki && lo > 130) return;                  // 다이토 제도 제외
        poly.forEach(ring => {
          let last = null, seg = '';
          ring.forEach(p => {
            let lon = p[0], lat = p[1];
            if (isOki) { lon += OKI_SHIFT[0]; lat += OKI_SHIFT[1]; }
            const xy = proj(lon, lat);
            if (last && Math.abs(xy[0] - last[0]) + Math.abs(xy[1] - last[1]) < 0.6) return;
            seg += (seg ? 'L' : 'M') + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1);
            last = xy;
            minX = Math.min(minX, xy[0]); maxX = Math.max(maxX, xy[0]);
            minY = Math.min(minY, xy[1]); maxY = Math.max(maxY, xy[1]);
            if (isOki) {
              insetBox = insetBox || [Infinity, Infinity, -Infinity, -Infinity];
              insetBox[0] = Math.min(insetBox[0], xy[0]); insetBox[1] = Math.min(insetBox[1], xy[1]);
              insetBox[2] = Math.max(insetBox[2], xy[0]); insetBox[3] = Math.max(insetBox[3], xy[1]);
            }
          });
          if (seg.length > 20) d += seg + 'Z';
        });
      });
      out.push({ code, name: f.properties.name, d });
    });
    return { paths: out, box: [minX, minY, maxX, maxY], insetBox };
  }

  function draw(svg, built, onPick) {
    const [x0, y0, x1, y1] = built.box, pad = 14;
    svg.setAttribute('viewBox', `${(x0 - pad).toFixed(0)} ${(y0 - pad).toFixed(0)} ${(x1 - x0 + 2 * pad).toFixed(0)} ${(y1 - y0 + 2 * pad).toFixed(0)}`);
    svg.textContent = '';
    if (built.insetBox) {
      const b = built.insetBox, m = 10;
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', b[0] - m); r.setAttribute('y', b[1] - m - 6);
      r.setAttribute('width', b[2] - b[0] + 2 * m); r.setAttribute('height', b[3] - b[1] + 2 * m + 6);
      r.setAttribute('class', 'inset');
      svg.appendChild(r);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', b[0] - m + 4); t.setAttribute('y', b[1] - m + 6);
      t.textContent = '沖縄';
      svg.appendChild(t);
    }
    const els = {};
    built.paths.forEach(p => {
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('d', p.d);
      el.dataset.code = p.code;
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', () => onPick(p.code));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(p.code); } });
      svg.appendChild(el);
      els[p.code] = el;
    });
    return els;
  }

  root.JPMap = { buildPaths, draw };
})(window);
