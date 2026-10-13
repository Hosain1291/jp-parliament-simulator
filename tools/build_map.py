"""jp.json(도도부현 경계 GeoJSON) → js/data-map.js (SVG 경로) 변환.

사용법:  python tools/build_map.py
- 경위도를 등장방형 투영(위도 36° 기준)으로 바꾸고, 0.7 단위보다 가까운 점은 생략해 용량을 줄입니다.
- 오가사와라 제도(도쿄 남쪽 원격 섬)와 다이토 제도는 지도에서 뺍니다.
- 오키나와는 왼쪽 위 상자(인셋)로 옮겨 그립니다.
jp.json을 고친 뒤에는 이 스크립트를 다시 실행해 data-map.js를 새로 만드세요.
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K, COS = 34, math.cos(math.radians(36))
OKI = (6.0, 15.0)  # 오키나와 이동량(경도, 위도)


def proj(lon, lat):
    return ((lon - 128) * COS * K, (46 - lat) * K)


def main():
    geo = json.load(open(os.path.join(ROOT, 'jp.json'), encoding='utf-8'))
    paths, box, inset = {}, [1e9, 1e9, -1e9, -1e9], [1e9, 1e9, -1e9, -1e9]
    for f in geo['features']:
        code = f['properties']['id']
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        d = []
        for poly in polys:
            lo = min(p[0] for p in poly[0]); la = min(p[1] for p in poly[0])
            if code == 'JP13' and la < 32:
                continue
            if code == 'JP47' and lo > 130:
                continue
            for ring in poly:
                seg, last = [], None
                for lon, lat in ring:
                    if code == 'JP47':
                        lon += OKI[0]; lat += OKI[1]
                    x, y = proj(lon, lat)
                    if last and abs(x - last[0]) + abs(y - last[1]) < 0.7:
                        continue
                    seg.append('%.1f %.1f' % (x, y)); last = (x, y)
                    box[0] = min(box[0], x); box[1] = min(box[1], y); box[2] = max(box[2], x); box[3] = max(box[3], y)
                    if code == 'JP47':
                        inset[0] = min(inset[0], x); inset[1] = min(inset[1], y); inset[2] = max(inset[2], x); inset[3] = max(inset[3], y)
                if len(seg) >= 4:
                    d.append('M' + 'L'.join(seg) + 'Z')
        paths[code] = ''.join(d)
    pad = 14
    vb = [round(box[0] - pad), round(box[1] - pad), round(box[2] - box[0] + 2 * pad), round(box[3] - box[1] + 2 * pad)]
    out = {'vb': vb, 'inset': [round(v, 1) for v in inset], 'P': paths}
    js = '/* 자동 생성 파일 — tools/build_map.py 로 jp.json에서 만듭니다. 직접 고치지 마세요. */\n'
    js += 'window.JPMAP=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(os.path.join(ROOT, 'js', 'data-map.js'), 'w', encoding='utf-8').write(js)
    print('data-map.js', len(js) // 1024, 'KB, prefectures', len(paths))


if __name__ == '__main__':
    main()
