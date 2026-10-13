"""index.html / en.html / ja.html 을 같은 틀로 만든다.
화면 문구를 바꿀 때는 이 파일의 L 사전을 고치고 `python tools/build_pages.py` 실행."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA = ['data-elections-early', 'data-elections', 'data-questions', 'data-questions-early',
        'data-prefs', 'data-map']

L = {
  'ko': dict(file='index.html', title='중의원 시뮬레이터',
    desc='1928–2026 일본 중의원 총선 36회를 내 입장으로 다시 치르는 시뮬레이터. 반원 의석, 내각총리대신 지명선거, 도도부현 지도.',
    brand='중의원 시뮬레이터', themeAria='테마', langAria='언어',
    skins=['자동', '라이트', '다크', '핑크', '올드 페이퍼', '윈도우 95'], home='총선 다시 고르기',
    i18n=['i18n-ko'],
    foot='질문과 정당 위치는 각 총선의 대표 쟁점을 단순화한 것으로, 실제 당론·표결과 다를 수 있습니다. 1928–1993년은 중선거구(1946년은 대선거구 제한연기제)로 비례대표가 없고, 1996년 이후 비례대표는 11개 블록 대신 전국 단위로 계산합니다. 무소속은 한 묶음으로 계산합니다. 전전·1946년 총리는 의회가 아니라 천황이 임명했으므로 지명선거는 가상입니다. 정당 색은 위키백과 정당색을 따랐고, 확인하지 못한 일부(전전·점령기 정당 등)는 근사값입니다. 도도부현 지도는 <a href="https://github.com/Hosain1291/jp-parliament-simulator/blob/main/jp.json" target="_blank" rel="noopener">jp.json</a>(simplemaps)을 썼습니다.'),
  'en': dict(file='en.html', title='House of Representatives Simulator',
    desc="Re-run 36 Japanese general elections (1928–2026) with your own positions: hemicycle seats, the Prime Minister nomination vote and a prefecture map.",
    brand='House of Representatives Simulator', themeAria='Theme', langAria='Language',
    skins=['Auto', 'Light', 'Dark', 'Pink', 'Old paper', 'Windows 95'], home='Pick another election',
    i18n=['i18n-en', 'i18n-en-data-1', 'i18n-en-data-2'],
    foot='Questions and party positions simplify the main issues of each election and may differ from actual party lines and votes. 1928–1993 used multi-member districts (1946: limited-vote large districts) with no proportional tier; from 1996 the PR tier is computed nationally instead of in 11 blocks. Independents are counted as one group. Before the war and in 1946 the Emperor appointed the Prime Minister, so the nomination vote shown is hypothetical. Party colours follow Wikipedia; a few unverified ones (prewar and occupation-era parties) are approximations. The prefecture map uses <a href="https://github.com/Hosain1291/jp-parliament-simulator/blob/main/jp.json" target="_blank" rel="noopener">jp.json</a> (simplemaps).'),
  'ja': dict(file='ja.html', title='衆議院シミュレーター',
    desc='1928–2026年の衆議院総選挙36回を自分の立場でやり直すシミュレーター。半円の議席図、内閣総理大臣指名選挙、都道府県地図。',
    brand='衆議院シミュレーター', themeAria='テーマ', langAria='言語',
    skins=['自動', 'ライト', 'ダーク', 'ピンク', '古紙', 'Windows 95'], home='総選挙を選び直す',
    i18n=['i18n-ja', 'i18n-ja-data-1', 'i18n-ja-data-2'],
    foot='質問と政党の立場は各総選挙の主な争点を単純化したもので、実際の党議・採決とは異なる場合があります。1928–1993年は中選挙区制(1946年は大選挙区制限連記制)で比例代表はなく、1996年以降の比例代表は11ブロックではなく全国単位で計算しています。無所属は一つにまとめて計算します。戦前と1946年の首相は議会ではなく天皇が任命したため、指名選挙は仮想です。政党色はウィキペディアの政党色に従い、確認できなかった一部(戦前・占領期の政党など)は近似値です。都道府県地図は<a href="https://github.com/Hosain1291/jp-parliament-simulator/blob/main/jp.json" target="_blank" rel="noopener">jp.json</a>(simplemaps)を使用しています。'),
}

SKIN_KEYS = ['auto', 'light', 'dark', 'pink', 'paper', 'win95']
SWATCH = [None, '#f1f2f5', '#181b21', '#7B1C4F', '#d9c49a', '#008080;border-color:#c0c0c0']
LANGS = [('ko', '한국어', './'), ('en', 'English', 'en.html'), ('ja', '日本語', 'ja.html')]


def page(lang):
    c = L[lang]
    skins = []
    for k, label, sw in zip(SKIN_KEYS, c['skins'], SWATCH):
        i = f'<i style="background:{sw}"></i>' if sw else ''
        skins.append(f'        <button type="button" data-skin="{k}">{i}{label}</button>')
    nav = []
    for k, label, href in LANGS:
        cur = ' aria-current="page"' if k == lang else ''
        nav.append(f'<a href="{href}" hreflang="{k}" lang="{k}"{cur}>{label}</a>')
    scripts = [f'js/{n}.js' for n in DATA + c['i18n'] + ['i18n-apply', 'engine', 'app']]
    alts = '\n'.join(f'<link rel="alternate" hreflang="{k}" href="{href}">' for k, _, href in LANGS)
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{c['title']}</title>
<meta name="description" content="{c['desc']}">
{alts}
<link rel="icon" type="image/svg+xml" href="favicon/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Shippori+Mincho+B1:wght@600;800&family=Gowun+Batang:wght@400;700&family=DotGothic16&display=swap">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<!--APP-->
<div class="wrap">
  <div class="top">
    <div class="brand">
      <svg viewBox="0 0 30 24" aria-hidden="true"><path d="M3 22h24M6 22v-8M10 22v-8M14 22v-8M16 22v-8M20 22v-8M24 22v-8M4 14h22M7 14l8-5 8 5M13 9V5h4v4M15 5V2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div>{c['brand']}<small>衆議院 · 1928 — 2026</small></div>
    </div>
    <div class="topr">
      <nav class="lang" aria-label="{c['langAria']}">{''.join(nav)}</nav>
      <div class="skin" id="skin" role="group" aria-label="{c['themeAria']}">
{chr(10).join(skins)}
      </div>
      <button type="button" class="link" id="toHome" hidden>{c['home']}</button>
    </div>
  </div>
  <main id="app"></main>
  <p class="foot">{c['foot']}</p>
</div>
{chr(10).join(f'<script src="{s}"></script>' for s in scripts)}
<!--/APP-->
</body>
</html>
'''


if __name__ == '__main__':
    for lang, c in L.items():
        with open(os.path.join(ROOT, c['file']), 'w', encoding='utf-8') as f:
            f.write(page(lang))
        print('wrote', c['file'])
