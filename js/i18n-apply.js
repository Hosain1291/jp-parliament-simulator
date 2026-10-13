/* 번역 적용 — en.html·ja.html에서 I18N.data(번역 데이터)를 DATA·QSET·ERAS에 덮어씁니다.
   I18N.data 구조:
     eras: [시대 이름…]                      ERAS 순서대로
     parties: { 키: 이름, '키@회차': 이름 }    정당 이름(회차별로 다를 때는 '키@회차')
     people: { 일본어 이름: 로마자 }          영어판의 대표·후보 이름
     sysName, sysName22                       중선거구·대선거구 제한연기제 이름
     E: { 회차: { era, pm, desc, pmReal, P: { 키: 설명 }, Q: [[제목, A안, B안]…] } }
   일본어판은 정당 이름과 인물 이름을 원래 일본어 그대로 씁니다. */
(function () {
  const I = window.I18N, D = I && I.data;
  if (!D) return;
  const ja = I.lang === 'ja', R = D.people || {}, PN = D.parties || {};
  if (D.eras) window.ERAS.forEach((e, i) => { if (D.eras[i]) e[0] = D.eras[i]; });
  window.DATA.forEach(a => {
    const x = (D.E || {})[a.n] || {};
    ['era', 'pm', 'desc', 'pmReal', 'term'].forEach(k => { if (x[k] != null) a[k] = x[k]; });
    if (a.sys === 'mmd') a.sysName = a.n === 22 ? D.sysName22 : D.sysName;
    a.P.forEach(p => {
      p.n = ja ? p.ja : (PN[p.k + '@' + a.n] || PN[p.k] || p.n);
      p.d = (x.P && x.P[p.k] != null) ? x.P[p.k] : (p.k === 'ind' ? D.indDesc : p.k === 'etc' ? D.etcDesc : '');
      if (ja) { p.ldk = p.ld; if (p.pmc) p.pmc = [p.pmc[0], p.pmc[0]]; }
      else { p.ldk = p.ld ? (R[p.ld] || p.ld) : ''; if (p.pmc) p.pmc = [p.pmc[0], R[p.pmc[0]] || p.pmc[0]]; }
    });
    (window.QSET[a.n] || []).forEach((row, i) => { const q = x.Q && x.Q[i]; if (q) { row[0] = q[0]; row[3] = q[1]; row[4] = q[2]; } });
  });
})();
