#!/usr/bin/env python3
"""No-dependency static site generator. Generated pages go to _dist/."""
from __future__ import annotations
import argparse
import datetime as dt
import html
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import urlsplit, quote
from xml.sax.saxutils import escape as xml_escape

ROOT = Path(__file__).resolve().parent
OUT = ROOT / '_dist'
CONF = json.loads((ROOT / '_site_config.json').read_text(encoding='utf-8'))
parser = argparse.ArgumentParser()
parser.add_argument('--base-path', default='', help='e.g. /repository (leave blank for local preview)')
parser.add_argument('--site-url', default='', help='e.g. https://username.github.io')
parser.add_argument('--preview-drafts', action='store_true', help='Only for LOCAL_PREVIEW: include unpublished reports for review')
args = parser.parse_args()
BASE = ('/' + args.base_path.strip('/')) if args.base_path.strip('/') else ''
ORIGIN = args.site_url.rstrip('/')
if ORIGIN and (not urlsplit(ORIGIN).scheme == 'https' or not urlsplit(ORIGIN).netloc):
    raise SystemExit('--site-url must be an HTTPS URL')


def h(v): return html.escape(str(v or ''), quote=True)

def path(url='/'):
    url = '/' + str(url).lstrip('/')
    return (BASE + url) or '/'

def absolute(url='/'):
    return (ORIGIN + path(url)) if ORIGIN else ''

def link(text, url, class_name='', external=False):
    attrs = ' target="_blank" rel="noopener noreferrer"' if external else ''
    cls = f' class="{h(class_name)}"' if class_name else ''
    return f'<a href="{h(url)}"{cls}{attrs}>{h(text)}</a>'

NAV = [('どんな人？','/about/','about'),('何を考えてる？','/ideas/','ideas'),('議会で何してる？','/council/','council'),('遊んで学ぶ','/games/','games'),('お問い合わせ','/contact/','contact')]


def json_ld(data):
    """Machine-readable identity only; never hide keyword text in the visual DOM."""
    serialized = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', r'\u003c')
    return '<script type="application/ld+json">' + serialized + '</script>'


def person_identity():
    """Public identity variants that describe the person who actually appears on this site."""
    person = {
        '@type': 'Person',
        'name': '村川たくと',
        'alternateName': ['村川拓人', 'むらかわたくと', 'むらかわ拓人'],
        'jobTitle': '佐渡市議会議員',
        'description': '佐渡市議として佐渡で議会活動に取り組む地方議員。',
        'affiliation': {'@type': 'Organization', 'name': '佐渡市議会'},
        'workLocation': {'@type': 'Place', 'name': '新潟県佐渡市'},
        'sameAs': [CONF['x_url'], CONF['facebook_url'], CONF['instagram_url']],
    }
    if ORIGIN:
        person['@id'] = absolute('/about/') + '#person'
        person['url'] = absolute('/about/')
    return person


def identity_metadata(page):
    person = person_identity()
    if page == 'home':
        data = {'@context': 'https://schema.org', '@type': 'WebSite',
                'name': '村川たくと公式サイト', 'inLanguage': 'ja', 'about': person}
        if ORIGIN:
            data['url'] = absolute('/')
    elif page == 'about':
        data = {'@context': 'https://schema.org', '@type': 'ProfilePage', 'mainEntity': person}
        if ORIGIN:
            data['url'] = absolute('/about/')
    else:
        raise ValueError('Unsupported identity metadata page')
    return json_ld(data)


def layout(*, title, desc, body, current='', url='/', extra_head='', noindex=False):
    # Search-facing titles only. Keep visible headings, branding, and text untouched.
    if title == '村川たくと':
        ttl = '村川拓人（村川たくと）｜佐渡市議会議員 公式ホームページ'
    elif title == 'どんな人？':
        ttl = 'プロフィール・経歴｜村川拓人（村川たくと）・佐渡市議会議員'
    else:
        ttl = f'{title}｜村川拓人（村川たくと）'
    nav = ''.join(f'<a href="{h(path(to))}"{(" aria-current=\"page\"" if key == current else "")}>{h(name)}</a>' for name,to,key in NAV)
    canonical = f'<link rel="canonical" href="{h(absolute(url))}">' if ORIGIN else ''
    sharing = (f'<meta property="og:url" content="{h(absolute(url))}">\n' if ORIGIN else '')
    sharing += (f'<meta property="og:image" content="{h(absolute("/assets/og.png"))}">\n' if ORIGIN else '')
    robot = '<meta name="robots" content="noindex,follow">' if noindex else ''
    # Compact return-to-top button on all site pages; standalone games use separate HTML.
    back_to_top = (
        '<button type="button" class="council-back-to-top" data-back-to-top hidden '
        'aria-label="ページの先頭へ戻る" title="ページの先頭へ戻る">'
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
        '<path d="m6 14 6-6 6 6" fill="none" stroke="currentColor" '
        'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
        '</svg></button>'
    )
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{h(ttl)}</title><meta name="description" content="{h(desc)}">{canonical}{robot}
<meta name="theme-color" content="#fffdf6"><meta property="og:type" content="website"><meta property="og:site_name" content="村川たくと公式サイト"><meta property="og:title" content="{h(ttl)}"><meta property="og:description" content="{h(desc)}">{sharing}
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="{h(path('/assets/favicon.png'))}" type="image/png"><link rel="apple-touch-icon" href="{h(path('/assets/apple-touch-icon.png'))}"><link rel="stylesheet" href="{h(path('/assets/site.css'))}">
{extra_head}</head><body><a class="skip" href="#main">本文へ移動</a>
<header class="site-header"><div class="wrap header-inner">
<a class="brand" href="{h(path('/'))}" aria-label="村川たくと トップページ"><span class="brand-icon" aria-hidden="true"><img src="{h(path('/assets/brand-mark.png'))}" alt="" width="44" height="44" decoding="async"></span><span class="brand-name"><span class="brand-sup">佐渡市議会議員</span>村川たくと</span></a>
<button type="button" class="menu-toggle" data-menu-toggle aria-expanded="false" aria-controls="main-nav" aria-label="メニューを開閉する">☰ メニュー</button>
<nav class="site-nav" data-site-nav id="main-nav" aria-label="メインメニュー">{nav}</nav></div></header>
<div class="site-scroll-progress" aria-hidden="true"></div><main id="main">{body}</main>
<footer class="site-footer"><div class="wrap"><div class="footer-top"><div><div class="footer-heading">村川たくと</div><div style="font-size:13px">佐渡の未来を開拓！！</div></div><nav class="footer-nav" aria-label="フッターメニュー">{''.join(link(name,path(to)) for name,to,_ in NAV)} {link('個人情報の取り扱い',path('/privacy/'))}</nav></div><div class="footer-bottom"><span>© 村川たくと</span></div></div></footer>{back_to_top}<script src="{h(path('/assets/site.js'))}" defer></script></body></html>'''


def write_page(url, text):
    relative = url.strip('/')
    target = OUT / relative / 'index.html' if relative else OUT / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')
    return url


def hero():
    portrait = CONF.get('photo','').lstrip('/')
    if portrait:
        if not (ROOT / portrait).is_file():
            raise ValueError(f'指定した写真が見つかりません：{portrait}')
        photo = f'<img src="{h(path("/" + portrait))}" alt="佐渡市議会議員・村川たくと" fetchpriority="high" decoding="async">'
        artclass = 'hero-art photo'
    else:
        photo = f'<img src="{h(path("/assets/hero-art.svg"))}" alt="島と海をイメージしたイラスト" fetchpriority="high" decoding="async">'
        artclass = 'hero-art'
    return f'''<section class="hero" aria-labelledby="home-title"><div class="wrap hero-inner">
<div class="hero-text"><span class="hero-pill">佐渡市議会議員</span><h1 class="hero-name" id="home-title">村川たくと<span class="dot">。</span></h1><p class="hero-catch">佐渡の未来を開拓！！</p></div>
<div class="{artclass}">{photo}<span class="art-stamp">SADO / TAKUTO MURAKAWA</span></div></div></section>'''


def social_links():
    """Share the exact same accessible SNS cards across home, profile and contact."""
    sns = [
        ('𝕏','X',CONF['x_url'],'social-x'),
        ('f','Facebook',CONF['facebook_url'],'social-facebook'),
        ('◎','Instagram',CONF['instagram_url'],'social-instagram')]
    links = ''.join(f'<a class="social-link" href="{h(url)}" target="_blank" rel="noopener noreferrer" aria-label="{h(label)}を開く（外部サイト）"><span class="social-icon {ic}" aria-hidden="true">{symbol}</span><span>{h(label)}</span></a>' for symbol,label,url,ic in sns)
    return f'<div class="social-grid">{links}</div>'


def social_home():
    return f'<section class="wrap top-social" aria-labelledby="sns-title"><div class="section-kicker">FOLLOW</div><h2 class="section-title" id="sns-title">SNSはこちら</h2>{social_links()}</section>'

GAMES = [
    dict(name='島おこし！ミライ島',kind='島づくりシミュレーション',description='島の人口や仕事，暮らしを考えながら，6年間（24ターン）の島づくりに挑戦。',img='game-island.svg',url='/games/mirai-island/',number='01',open_new_tab=True)]



def games_cards():
    result = ''
    for game in GAMES:
        open_new_tab = game.get('open_new_tab', False)
        tab_attrs = ' target="_blank" rel="noopener noreferrer"' if open_new_tab else ''
        accessible_label = f"{game['name']}を遊ぶ"
        action_label = '遊んでみる'
        result += f'''<a class="game-card" href="{h(path(game['url']))}"{tab_attrs} aria-label="{h(accessible_label)}"><div class="game-visual"><img src="{h(path('/assets/'+game['img']))}" loading="lazy" alt="" decoding="async"></div><div class="game-info"><div class="game-category">{h(game['kind'])}</div><h3 class="game-title">{h(game.get('short_name',game['name']))}</h3><p class="game-desc">{h(game['description'])}</p><span class="game-action">{h(action_label)} <span aria-hidden="true">↗</span></span></div></a>'''
    return result


def home_page(reports):
    latest_url = reports[0]['url'] if reports else '/council/'
    more = ''.join(f'<a class="more-link" href="{h(path(to))}">{h(label)} <span aria-hidden="true">→</span></a>' for label,to in [('どんな人？','/about/'),('何を考えてる？','/ideas/'),('議会で何してる？','/council/')])
    latest_link = f'<p class="latest-council-link">{link("最新の議会報告を見る →",path(latest_url),"latest-report-btn")}</p>'
    body = hero()+social_home()+f'''<section class="wrap home-games" aria-labelledby="home-games-title"><div class="section-head"><div><div class="section-kicker">PLAY & LEARN</div><h2 class="section-title" id="home-games-title">遊んで学ぶ</h2><p class="section-desc">登録不要・無料。スマホでも遊べます。</p></div></div><div class="game-grid">{games_cards()}</div></section><section class="wrap home-more" aria-labelledby="more-title"><div class="section-kicker">MORE</div><h2 class="section-title" id="more-title">もっと見る</h2>{latest_link}<div class="more-links">{more}</div></section>'''
    return layout(title='村川たくと',desc=CONF['description'],body=body,url='/',extra_head=identity_metadata('home'))


def heading(label,title,lead):
    return f'<section class="wrap page-top"><div class="eyebrow">{h(label)}</div><h1 class="page-title">{h(title)}</h1><p class="page-lead">{h(lead)}</p></section>'


def about_page():
    # Source: existing public biography; company/facility names are not disclosed. Work history is explicitly permitted by user.
    milestones = [
        ('1989','佐渡で生まれる','7月16日，旧両津市で生まれました。'),
        ('学校時代','両津で育つ','夷保育園，両津小学校，南中学校を経て，両津高等学校へ。'),
        ('2008','社会人として働き始める','インフラ関連の企業に事務職として入社。石油・ガス，保税，港湾・船舶などに関わる仕事を経験しました。'),
        ('2011年〜','労働組合での活動','2011年に青年部役員となり，その後，労働組合の支部副委員長を経て，連合新潟・下越地域協議会で青年女性委員を務めました。'),
        ('2018','佐渡へ戻る','佐渡に戻り，防災・環境・防火・管財・広報などの業務に携わりました。'),
        ('2019','佐渡支部の執行委員長','2019年から2023年まで，労働組合の佐渡支部執行委員長を務めました。連合新潟・佐渡地域協議会の副議長も歴任しました。'),
        ('2022','放送大学に入学','教養学部・心理と教育コースで，心理学や教育，福祉などを学びました。'),
        ('2024','佐渡市議会議員に初当選','市議会での活動を始めました。'),
        ('2026','放送大学を卒業','教養学部・心理と教育コースを卒業しました。'),
    ]
    timeline = ''.join(f'<li class="timeline-item"><span class="timeline-date">{h(y)}</span><div class="timeline-text"><h3>{h(title)}</h3><p>{h(description)}</p></div></li>' for y,title,description in milestones)
    # Qualification cards: one tall combined card at left, two stacked at right.
    # Keep all fourteen names/grades from Ver.1.34 without adding a degree as a credential.
    qualifications = [
        ('安全・環境／設備・技術',[
            '公害防止管理者（水質関係第1種）',
            '危険物取扱者（甲種）',
            '第1種衛生管理者',
            '消防設備士（乙種6類）',
            '甲種防火管理者',
            '高圧ガス製造保安責任者（乙種化学）',
            '第二種電気工事士',
            'スマートマスター',
        ]),
        ('心理・教育・実務',[
            '認定心理士',
            '生涯学習コーディネーター',
            '秘書技能検定 準1級',
        ]),
        ('文化・趣味',[
            '日本将棋連盟 初段',
            'ラーメンプロフェッサー',
            'アロマテラピー検定1級',
        ]),
    ]
    # The ramen title has a brief, smaller annotation; other credentials remain plain text.
    qual_html = ''
    for label, items in qualifications:
        list_items = ''
        for item in items:
            if item == 'ラーメンプロフェッサー':
                contents = f'{h(item)} <small class="credential-detail">（日本ラーメンファンクラブの最上位資格）</small>'
            else:
                contents = h(item)
            list_items += f'<li>{contents}</li>'
        qual_html += f'<div class="qualification-group"><h3>{h(label)}</h3><ul>{list_items}</ul></div>'
    body = heading('PROFILE','どんな人？','1989年7月16日，佐渡（旧両津市）生まれ。') + f'''<section class="wrap profile-main">
<div class="profile-intro">
  <div class="panel soft profile-basic"><span class="eyebrow">ABOUT</span><h2>村川たくと</h2><dl class="profile-facts"><div><dt>生年月日</dt><dd>1989年7月16日</dd></div><div><dt>出身</dt><dd>新潟県佐渡市（旧両津市）</dd></div><div><dt>市議会議員</dt><dd>2024年 初当選・1期目</dd></div><div><dt>党派</dt><dd>無所属</dd></div><div><dt>会派</dt><dd>リベラル佐渡</dd></div></dl></div>
  <div class="panel warm profile-intro-note"><h2>佐渡で育って，いまも佐渡で。</h2><p>両津小学校，南中学校，両津高校を卒業。島外で働いたのち，2018年に佐渡へ戻りました。</p><p>社会でさまざまな経験を重ねる中で，差別や偏見など，世の中には理不尽なことが少なくないと感じてきました。正直者が報われ，誰もが自分の可能性を信じて前に進める社会にしたい。そんな思いを抱き続けてきました。</p><p>2024年，その思いを行動に移し，皆さまに支えていただき，佐渡市議会議員に初当選しました。</p></div>
</div>
<section class="profile-section"><div class="profile-section-heading"><span class="eyebrow">HISTORY</span><h2>これまでの歩み</h2></div><ol class="profile-timeline">{timeline}</ol></section>
<section class="profile-section profile-details"><div class="profile-section-heading"><span class="eyebrow">ACTIVITIES</span><h2>議会での活動</h2></div><div class="profile-roles"><div class="panel"><h3>総務文教常任委員会</h3><p>副委員長</p></div><div class="panel"><h3>議会広報特別委員会</h3><p>委員長</p></div></div><p class="smallnote">役職は2026年9月時点のものです。</p>
<div class="past-committees" aria-label="所属委員会の記録"><h3>所属委員会の記録</h3><dl><div><dt>2024〜2026年</dt><dd>市民厚生常任委員会，議会広報特別委員会</dd></div><div><dt>2025年・2026年</dt><dd>決算審査特別委員会</dd></div></dl></div>
<div class="profile-sns panel"><div><h3>日々の活動はSNSでも</h3><p>議会のことや日々のできごとを投稿しています。</p></div>{social_links()}</div></section>
<section class="profile-section profile-activities" aria-labelledby="activities-title">
  <div class="profile-section-heading"><span class="eyebrow">IN THE COMMUNITY</span><h2 id="activities-title">こんな活動も</h2></div>
  <div class="activity-photo-grid">
    <figure class="activity-photo-card"><img src="{h(path('/assets/activity-beach.webp'))}" alt="佐渡の海岸で，ごみ拾いの道具とごみ袋を持っている様子" loading="lazy" decoding="async" width="540" height="540"><figcaption>海岸清掃</figcaption></figure>
    <figure class="activity-photo-card"><img src="{h(path('/assets/activity-blood-donation.webp'))}" alt="献血ルームの椅子に座って献血している様子" loading="lazy" decoding="async" width="1000" height="1000"><figcaption>献血</figcaption></figure>
    <figure class="activity-photo-card"><img src="{h(path('/assets/activity-walking-event.webp'))}" alt="大山祇神社で衣装を着てウォーキングイベントに参加したときの様子" loading="lazy" decoding="async" width="660" height="660"><figcaption>衣装を着てウォーキングイベントに参加</figcaption></figure>
  </div>
</section>
<section class="profile-section profile-personal" aria-label="趣味・特技・好きなものと経験したこと">
  <div class="personal-grid">
    <section class="personal-card personal-likes" aria-labelledby="likes-title">
      <div class="personal-icon" aria-hidden="true">♡</div><h2 id="likes-title">趣味・特技・好きなもの</h2>
      <ul class="personal-tags"><li>将棋（観戦）</li><li>読書</li><li>昭和の懐メロ</li><li>佐渡の魚・山野菜</li><li>動物（特に猫）</li><li>ラーメン</li><li>焼き鳥</li><li>佐久間宣行プロデュースアイドル「ラフ×ラフ」<br><span style="white-space:nowrap">（日比野芽奈推し）</span></li></ul>
    </section>
    <section class="personal-card personal-experiences" aria-labelledby="experiences-title">
      <div class="personal-icon" aria-hidden="true">↗</div><h2 id="experiences-title">経験したこと</h2>
      <div class="experience-groups">
        <div class="experience-group"><h3>燃料・港湾・船舶</h3><ul class="experience-list">
          <li>石油やガスの受入れや貯蔵管理に関する業務</li>
          <li>保税蔵置場や地方税に関する業務</li>
          <li>船舶，港湾，陸上設備の保全に関する業務</li>
          <li>計量設備，計算機に関する業務</li>
        </ul></div>
        <div class="experience-group"><h3>防災・安全・環境</h3><ul class="experience-list">
          <li>国民保護，港湾BCP（災害時に港の機能を維持・早期再開するための計画），非常災害対策に関する業務</li>
          <li>公害対策，海洋汚染防止，防火などの安全管理</li>
          <li>2012年，新潟東港でのロシア船沈没事故に伴い，海上に漏れた油の回収や施設の防護に従事</li>
          <li>2022年，佐渡の大雪でのインフラ復旧支援と，新潟県・佐渡市との情報連絡</li>
        </ul></div>
        <div class="experience-group"><h3>事務・労務・お客さま対応</h3><ul class="experience-list">
          <li>庶務，労務，労使間の調整</li>
          <li>契約変更などのお客さま対応</li>
          <li>財産管理，損害賠償・和解に関する調整</li>
        </ul></div>
        <div class="experience-group"><h3>広報・業務改善</h3><ul class="experience-list">
          <li>広報対応や地域のボランティア活動への協力</li>
          <li>Excelマクロを使った作業の自動化や業務改善</li>
          <li>生成AIを活用した情報整理や業務の効率化</li>
        </ul></div>
      </div>
    </section>
  </div>
</section>
<section class="profile-section qualification-section" aria-labelledby="qualifications-title"><div class="profile-section-heading"><span class="eyebrow">QUALIFICATIONS</span><h2 id="qualifications-title">資格・検定など</h2></div><div class="qualification-grid">{qual_html}</div></section>
</section>'''
    return layout(title='どんな人？',desc='村川拓人（村川たくと）のプロフィール。佐渡での生い立ち、これまでの歩み、趣味・特技・好きなもの、経験、資格・検定などを紹介します。',body=body,current='about',url='/about/',extra_head=identity_metadata('about'))


def ideas_page():
    """Six equally presented policy fields, followed by a brief philosophy note.

    This page describes directions and questions; council actions and meeting records
    remain on their own pages. Wording confirmed by the site owner, October 2026.
    """
    principles = [
        (
            '01', '社会福祉の充実と差別の撤廃',
            '必要な支援が届き，誰もが自分らしく暮らせる佐渡へ。',
            [
                '医療や介護を島内で支え続けるためには，利用する人の安心と，現場で働く人の環境の両方が大切です。',
                '障がいの有無や性のあり方などによる差別や偏見をなくし，必要なときに安心して相談できる環境をつくりたいと考えています。'
            ]
        ),
        (
            '02', '防災',
            '島の条件を踏まえた，実際に使える備えを。',
            [
                '原子力災害が起きたとき，島外へ避難する船や港をどう確保するのか。UPZ（原発からおおむね30km圏）外である佐渡の放射線監視や避難体制には，まだ検討すべき課題があります。',
                '2022年の大雪の経験や，ペットとの避難なども踏まえ，公助・共助・自助を組み合わせた備えを考えます。'
            ]
        ),
        (
            '03', 'インフラ・環境',
            '環境への配慮と，暮らしを支える現実的な選択を。',
            [
                '水道施設の再編では，地域ごとの水質の違いも踏まえて考える必要があります。島内でのエネルギー生産や森林資源の活用についても，事業を続けられるかどうかが重要です。',
                '脱炭素を進めるうえでも，安全性，安定供給，費用，環境への影響を丁寧に検証し，将来にわたって維持できる仕組みを考えます。'
            ]
        ),
        (
            '04', '産業・文化',
            '企業も働く人も，ともに前へ進める佐渡に。',
            [
                '若者が佐渡で働き続けたり，島へ戻ってきたりするには，仕事の選択肢と所得の向上が欠かせません。',
                '企業が利益を生み出すことと，働く人の所得や権利を守ることを両立させたいと考えています。',
                '佐渡産品の販路を広げることや，地域の祭りや文化を次の世代につなぐことも大切です。'
            ]
        ),
        (
            '05', '子育て・学校教育',
            '子どもたちが，自分の将来を描ける教育を。',
            [
                '子どもたちに「なぜこれを勉強するのか」が伝わり，一つの教科にとらわれず，さまざまな切り口から物事を見る目を養える環境をつくりたいと考えています。自らの力で夢をかなえられる教育のあり方を考えています。',
                '学校と地域のつながりを深めるとともに，学校施設の環境，教職員の働き方，保護者の負担にも目を向け，安心して学び育つことのできる環境を考えます。'
            ]
        ),
        (
            '06', '生涯学習・生きがい',
            '島にいても，いくつになっても，新しいことに挑戦できる。',
            [
                '通信制大学などを活用すれば，佐渡に暮らしながら学び直すこともできます。そうした機会をもっと身近なものにしたいと考えています。',
                '学校を卒業してからも，仕事や趣味，地域活動を通じて学び続け，学んだことや得意なことを生かせる佐渡にしたいと考えています。年齢に関係なく，それぞれが生きがいを持てる地域を目指します。'
            ]
        ),
    ]
    cards = ''.join(
        f'<article class="principle-card"><div class="principle-card-top">'
        f'<span class="principle-n" aria-hidden="true">{h(no)}</span><h3>{h(title)}</h3></div>'
        f'<p class="principle-catch">{h(catch)}</p>'
        f'<div class="principle-copy">{"".join(f"<p>{h(p)}</p>" for p in paras)}</div></article>'
        for no,title,catch,paras in principles
    )
    intro = ('佐渡で暮らし続けていくためには，医療や交通，仕事，教育など，さまざまな課題があります。'
             '一人ひとりの選択肢を広げ，佐渡で自分らしく暮らせるように，'
             '地域の実情に合った政策を考えています。')
    body = heading('IDEAS','何を考えてる？',intro) + f"""<section class="wrap policy-page">
    <section class="policy-section" aria-labelledby="principle-title">
      <div class="policy-section-heading"><span class="eyebrow">POLICY</span><h2 id="principle-title">大切にしている6つのこと</h2></div>
      <div class="principle-grid">{cards}</div>
    </section>
    <section class="policy-thinking" aria-labelledby="thinking-title">
      <div class="eyebrow">THINKING</div><h2 id="thinking-title">考え方の根っこ</h2>
      <p class="thinking-lead">誰もが自分らしく生きられ，誰の権利も侵害されない社会へ。</p>
      <p>人それぞれ，考え方も，価値観も，望む生き方も違います。その違いを尊重しながら，お互いの自由と権利を守れる社会であってほしいと思っています。</p>
      <p>ルールや制度には，人の自由を制約する側面もあれば，権利を守る役割もあります。</p>
      <p>だからこそ，一つの立場や考え方だけで判断せず，異なる意見にも耳を傾けながら，守るべきものは守り，変えるべきところは変えていきたいと考えています。</p>
    </section>
    </section>"""
    return layout(title='何を考えてる？',desc='佐渡市議会議員・村川拓人（村川たくと）の政策と考え方。福祉、防災、インフラ、産業・文化、教育、生涯学習などを紹介します。',body=body,current='ideas',url='/ideas/')


def report_data():
    files = sorted((ROOT/'content/reports').glob('*.json'))
    reports=[]
    seen=set()
    for f in files:
        data=json.loads(f.read_text(encoding='utf-8'))
        if not data.get('published',False) and not args.preview_drafts: continue
        date = data.get('date','')[:10]
        try: dt.date.fromisoformat(date)
        except ValueError: raise ValueError(f'報告の日付が正しくありません：{f.name}')
        slug=date[:7]
        if slug in seen:
            raise ValueError(f'同じ年月の公開報告が複数あります：{slug}。一つに統合してください。')
        seen.add(slug)
        reports.append(dict(data,slug=slug,url=f'/council/{slug}/', preview_only=not data.get('published',False)))
    reports.sort(key=lambda a:a['date'],reverse=True)
    return reports


def past_questions_data():
    '''History kept distinct from the monthly 2026-09+ reports.'''
    filename=ROOT/'content/past-questions/2024-2026.json'
    data=json.loads(filename.read_text(encoding='utf-8'))
    entries=data.get('questions',[])
    ids=[q.get('id') for q in entries]
    if len(entries)!=97 or len(ids)!=len(set(ids)):
        raise ValueError('過去の一般質問：論点の重複・欠落を確認してください')
    return data


def past_question_categories(entries):
    """Explicit editorial tags. One primary category per topic, plus optional secondary matches."""
    data=json.loads((ROOT/'content/past-questions/categories.json').read_text(encoding='utf-8'))
    categories=data['categories']
    keys=[c['id'] for c in categories]
    assignments=data['assignments']
    ids={q['id'] for q in entries}
    if set(assignments)!=ids or len(set(keys))!=len(keys):
        raise ValueError('一般質問のカテゴリに未分類・重複があります')
    for question_id, tags in assignments.items():
        if not tags or len(tags)!=len(set(tags)) or any(t not in keys for t in tags):
            raise ValueError(f'カテゴリ指定を確認してください：{question_id}')
    return categories, assignments


def past_questions_page():
    # Source: official-transcript-based 2026-10-28 editorial manuscript (97 topics).
    data = past_questions_data()
    entries = data['questions']
    categories, assignments = past_question_categories(entries)
    by_period = {}
    for q in entries:
        by_period.setdefault(q['meeting_key'], []).append(q)
    # 注目6件：本文は公式会議録に基づく掲載用原稿を踏まえた短い要約。
    # 実施済みの訂正・対策と，今後の対応方針として示された答弁を混同しない。
    highlights = [
        ('2025-12-08', '公民館の県報告を訂正', '公的資料の訂正を確認',
         '公民館運営審議会の委員数が0人となっていた2024年度の報告は誤りで，県の資料が10人に訂正されたことを確認しました。'),
        ('2024-12-10', '消防ポンプの起動遅れと再発防止策', '原因と実施済み対策を確認',
         '両津春日の火災で消防ポンプの起動が遅れた原因を確認。消防はマニュアルの見直しと基本操作の訓練を実施済みと説明し，小さな事象も上司へ報告する方針を示しました。'),
        ('2024-09-10', '高額療養費，郵送で申請できる案内に改善', '市民の声から申請方法の案内を見直し',
         '高額療養費は郵送申請が可能なのに，通知は窓口への来庁を促す内容でした。市民の声を受け，県内他市の事例を示して改善を提案。市は変更できないとされていた様式を見直し，郵送・窓口それぞれの申請方法と必要書類が分かる案内に改めました。'),
        ('2026-03-02', '2026年4月，佐渡にIT系4年制学科が新設', '島内で大学の学位も目指せる道',
         '佐渡に暮らしながら大学の学位を目指せる環境について質問。市は，京都芸術大学との併修で学士を取得できる仕組みと，2026年4月に開設予定のIT系4年制学科を説明しました。さらに他の分野でも，大学側の条件や指導体制を調べると答えました。'),
        ('2025-06-08', '指定ごみ袋の処理券化を再検討', '再協議と試行の検討を答弁',
         '市長は当初の検討が十分でなかったとして，関係者と議論するよう指示したと説明。範囲を限った試行も含めて検討し，開始時期を改めて設定すると答弁しました。'),
        ('2026-06-02', '水道事故の広報文例を見直し', '分かりやすい広報への答弁',
         '水道へのガス混入事故で，作業経過の広報も必要だったとの答弁がありました。上下水道課長は既存の広報文例を，意見も踏まえて分かりやすくすると答えました。'),
    ]
    feat=[]
    for item_id,short_title,overline,copy in highlights:
        q=next((q for q in entries if q['id']==item_id),None)
        if not q:
            raise ValueError(f'注目テーマが見つかりません: {item_id}')
        feat.append(f'<a class="past-highlight" href="#past-q-{h(q["id"])}"><span class="past-high-kicker">{h(overline)} · {q["year"]}年{q["month"]}月</span><h3>{h(short_title)} <span aria-hidden="true">↗</span></h3><p>{h(copy)}</p></a>')
    parts=[]
    for key in sorted(by_period,reverse=True):
        items=by_period[key]
        y,m=map(int,key.split('-'))
        vid=items[0].get('youtube')
        video_html=(f'<a class="past-video-link" href="{h(vid)}" rel="noopener noreferrer" target="_blank">一般質問の動画を見る <span aria-hidden="true">↗</span></a>') if vid else ''
        html_items=[]
        for i,q in enumerate(items,1):
            official=f'<a href="{h(q["evidence"])}" rel="noopener noreferrer" target="_blank">佐渡市議会の会議録を読む <span aria-hidden="true">↗</span></a>'
            tags=assignments[q['id']]
            tags_html=''.join(f'<span>{h(next(c["label"] for c in categories if c["id"]==tag))}</span>' for tag in tags)
            video_link=(f'<a href="{h(q["youtube"])}" rel="noopener noreferrer" target="_blank">一般質問の動画を見る <span aria-hidden="true">↗</span></a>' if q.get('youtube') else '')
            html_items.append(f'''<details class="past-question" id="past-q-{h(q['id'])}" data-question-id="{h(q['id'])}" data-primary-category="{h(tags[0])}" data-categories="{h(' '.join(tags))}" data-meeting="{h(key)}"><summary><span class="past-question-field">{i:02d}<span class="past-question-date">{q['year']}年{q['month']}月</span></span><span class="past-question-title">{h(q['title'])}</span><span class="past-detail-arrow" aria-hidden="true">＋</span></summary><div class="past-detail"><div class="past-question-tags" aria-label="関連カテゴリ">{tags_html}</div><dl class="past-qa"><div class="past-qa-entry"><dt>何を質問した？</dt><dd>{h(q['question'])}</dd></div><div class="past-qa-entry"><dt>市の答弁・確認したこと</dt><dd>{h(q['answer'])}</dd></div></dl><div class="past-source-links">{official}{video_link}</div></div></details>''')
        period_label=(f'{y}年{m}月定例会' if key!='2025-02' else '2025年2月定例会 <small class="past-meeting-note">一般質問は3月6日</small>')
        parts.append(f'''<section class="past-period" aria-labelledby="past-period-{key}"><div class="past-period-head" id="past-period-{key}"><div><span class="eyebrow">{y} / {m:02d}</span><h3>{period_label}</h3></div>{video_html}</div><div class="past-question-list" data-month-list="{h(key)}">{''.join(html_items)}</div></section>''')
    category_cards=['<button type="button" class="past-category-card is-active" data-category-choice="all" aria-pressed="true"><span class="past-category-icon" aria-hidden="true">▦</span><span class="past-category-name">すべてのカテゴリ</span><span class="past-category-count">97テーマ</span></button>']
    category_groups=[]
    for category in categories:
        cat_id=category['id']
        relevant=sum(cat_id in assignments[q['id']] for q in entries)
        primary_count=sum(assignments[q['id']][0]==cat_id for q in entries)
        category_cards.append(f'<button type="button" class="past-category-card" data-category-choice="{h(cat_id)}" aria-pressed="false"><span class="past-category-name">{h(category["label"])}</span><span class="past-category-count">{relevant}テーマ</span></button>')
        category_groups.append(f'<section class="past-category-group" data-category-group="{h(cat_id)}" aria-labelledby="past-category-heading-{h(cat_id)}"><div class="past-category-group-head"><h3 id="past-category-heading-{h(cat_id)}">{h(category["label"])}</h3><span class="past-category-group-count" data-primary-count="{primary_count}">{primary_count}テーマ</span></div><div class="past-question-list" data-category-list="{h(cat_id)}"></div></section>')
    intro=heading('COUNCIL ARCHIVE','これまでの一般質問','2024年6月から2026年6月までの質問内容と市の答弁を，関心のあるカテゴリや定例会から探せます。')
    intro+='<div class="wrap past-find-jump"><a href="#past-all-title" class="past-find-jump-link">一般質問をカテゴリ・年月から探す <span aria-hidden="true">↓</span></a></div>'
    body=intro+f'''<section class="wrap past-archive"><section class="past-highlights" aria-labelledby="past-highlight-title"><div class="profile-section-heading"><span class="eyebrow">CONFIRMED RECORDS</span><h2 id="past-highlight-title">議会で確認できたこと</h2></div><div class="past-highlights-grid">{''.join(feat)}</div></section>
    <section class="past-all" aria-labelledby="past-all-title"><div class="profile-section-heading"><span class="eyebrow">2024—2026</span><h2 id="past-all-title">これまでの質問一覧 <span class="past-count">全97テーマ</span></h2></div>
    <p class="past-info-small">興味のある分野からも，質問した年月からも探せます。質問を開くと市の答弁と公式会議録を確認できます。</p>
    <div class="past-view-switch" data-past-switch hidden role="tablist" aria-label="一般質問の探し方">
      <button type="button" class="past-view-tab" id="past-tab-category" data-past-view="category" role="tab" aria-controls="past-panel-category" aria-selected="false" tabindex="-1"><span aria-hidden="true">▦</span> カテゴリ別で探す</button>
      <button type="button" class="past-view-tab is-active" id="past-tab-month" data-past-view="month" role="tab" aria-controls="past-panel-month" aria-selected="true" tabindex="0"><span aria-hidden="true">▤</span> 年月別で探す</button>
    </div>
    <div id="past-panel-category" data-past-category-panel role="tabpanel" aria-labelledby="past-tab-category" hidden>
       <p class="past-category-guide">カテゴリを選ぶと関連する質問が表示されます。複数の分野に関わる質問は，どちらからでも探せます。</p>
       <div class="past-category-grid" aria-label="カテゴリを選ぶ">{''.join(category_cards)}</div>
       <div class="past-category-results" aria-live="polite" aria-atomic="false"><div class="past-category-results-head"><h3 data-category-results-title>カテゴリ別の質問</h3><p data-category-results-count>全97テーマ</p></div>{''.join(category_groups)}</div>
    </div>
    <div id="past-panel-month" data-past-month-panel role="tabpanel" aria-labelledby="past-tab-month"><p class="past-info-small">定例会ごとに新しい順で表示しています。各定例会の動画もこちらから見られます。</p>{''.join(parts)}</div></section>
    <div class="panel past-bottom-links"><h2>2026年9月以降の報告</h2><p>2026年9月以降は，一般質問や委員会での活動を定例会レポートにまとめています。</p><p>{link('定例会レポート一覧へ →',path('/council/'),'text-link')}</p></div></section>'''
    return layout(title='これまでの一般質問',desc='村川拓人（村川たくと）が佐渡市議会で行った2024年6月～2026年6月の一般質問を、9定例会・97テーマに整理。質問内容と市の答弁、公式会議録や動画を掲載します。',body=body,current='council',url='/council/past/')


def council_index(reports):
    if reports:
        latest = reports[0]
        latest_card = f'''<a class="report-card latest-archive-card" href="{h(path(latest['url']))}"><div class="report-date">最新の報告 / {h(str(int(latest['date'][:4]))+'年'+str(int(latest['date'][5:7]))+'月')}</div><h2>{h(latest['title'])} <span aria-hidden="true">↗</span></h2><p>{h(latest.get('summary',''))}</p></a>'''
        older = reports[1:]
        if older:
            cards = ''.join(f'''<a class="report-card" href="{h(path(r['url']))}"><div class="report-date">{h(str(int(r['date'][:4]))+'年'+str(int(r['date'][5:7]))+'月')}</div><h2>{h(r['title'])} <span aria-hidden="true">↗</span></h2><p>{h(r.get('summary',''))}</p></a>''' for r in older)
            archive=f'<h2 class="archive-heading">過去の議会報告</h2><div class="report-list">{cards}</div>'
        else:
            archive=''
        main = f'<h2 class="archive-heading">定例会レポート（2026年9月以降）</h2>{latest_card}{archive}'
    else:
        main = '<div class="empty-state"><strong>定例会ごとの報告を準備しています。</strong><p>内容を確認できたものから公開します。</p></div>'
    body = heading('COUNCIL','議会で何してる？','2026年9月以降の定例会レポートと，それ以前の一般質問を掲載しています。') + f'''<section class="wrap council-archive"><figure class="council-hero-photo"><img src="{h(path('/assets/council-speaking.webp'))}" alt="佐渡市議会の議場で一般質問を行う村川たくと" width="480" height="270" decoding="async" loading="eager"></figure>{main}<a class="past-index-entry" href="{h(path('/council/past/'))}"><div><span class="eyebrow">2024—2026</span><h2>これまでの一般質問 <span aria-hidden="true">↗</span></h2><p>2024年6月から2026年6月の一般質問を定例会ごとに紹介します。質問内容，市の答弁，公式会議録や動画を見ることができます。</p></div></a><div class="panel"><h2>佐渡市議会の記録</h2><p>会議録や定例会の資料は佐渡市議会の公式ホームページで確認できます。</p><p>{link('佐渡市議会の公式ページへ ↗','https://www.city.sado.niigata.jp/site/gikai/',external=True)}</p></div></section>'''
    return layout(title='議会で何してる？',desc='佐渡市議会議員・村川拓人（村川たくと）の議会活動報告。定例会ごとの一般質問、委員会活動、2024年以降の質問記録を紹介します。',body=body,current='council',url='/council/')


def committee_impression_html(raw):
    """Render a six-item report from ONE free-text field; otherwise show raw text safely.

    Blocks follow the simple format:
      01｜title
      私の確認：question
      市の答弁：answer
    Empty-line-separated blocks can be pasted together into the CMS's 所感 field.
    Other free text falls back to an ordinary pre-line paragraph without loss.
    """
    text = str(raw or '').strip()
    if not text:
        return ''
    blocks = [part.strip() for part in re.split(r'\n\s*\n', text) if part.strip()]
    cards=[]
    notes=[]
    for block in blocks:
        if block.startswith('※'):
            notes.append(block)
            continue
        lines = block.splitlines()
        if len(lines) != 3:
            return f'<p class="committee-freeform">{h(text)}</p>'
        match = re.fullmatch(r'([0-9]{2})[｜|]\s*(.+)', lines[0].strip())
        if not match or not lines[1].startswith('私の確認：') or not lines[2].startswith('市の答弁：'):
            return f'<p class="committee-freeform">{h(text)}</p>'
        number,title = match.groups()
        question=lines[1].split('：',1)[1].strip()
        answer=lines[2].split('：',1)[1].strip()
        cards.append(f'<article class="committee-question-card"><div class="committee-card-head"><span class="committee-number" aria-hidden="true">{h(number)}</span><h4>{h(title)}</h4></div><div class="committee-qa"><div class="committee-qa-label">私の確認</div><p>{h(question)}</p><div class="committee-qa-label">市の答弁</div><p>{h(answer)}</p></div></article>')
    if not cards:
        return f'<p class="committee-freeform">{h(text)}</p>'
    note_html=''.join(f'<p class="committee-context-note">{h(note)}</p>' for note in notes)
    return '<div class="committee-question-grid">'+''.join(cards)+'</div>'+note_html


def report_page(r):
    topics=''
    for topic in r.get('topics',[]):
        pieces=[]
        # Newspaper-style concise bullet summary, with the original report layout as fallback.
        body=topic.get('body','').strip()
        if body:
            paragraphs=[line.strip() for line in body.splitlines() if line.strip()]
            for line in paragraphs:
                if line.startswith(('・','●','- ')):
                    cleaned=line[1:].strip() if line[0] in '・●' else line[2:].strip()
                    pieces.append(f'<p class="report-bullet">{h(cleaned)}</p>')
                else:
                    pieces.append(f'<p class="report-copy">{h(line)}</p>')
            if topic.get('impression'):
                pieces.append(f'<div class="impression-box"><div class="label">所感</div><p>{h(topic["impression"])}</p></div>')
        else:
            for label,key,cls in [('質問したこと','question',''),('市の答弁','answer','answer-box'),('所感','impression','impression-box'),('再質問・補足','followup','followup-box'),('現在の状況','status','')]:
                value=topic.get(key,'')
                if value:
                    pieces.append(f'<div class="{cls}"><div class="label">{h(label)}</div><p>{h(value)}</p></div>')
        if pieces:
            topics+=f'<article class="topic"><h3>{h(topic.get("title","議題"))}</h3>{"".join(pieces)}</article>'
    extras=''
    committee_items=r.get('committee_items',[])
    if committee_items:
        com_html=''.join(f'<div class="committee-entry"><h3>{h(c.get("name","委員会"))}</h3>{committee_impression_html(c.get("impression",""))}</div>' for c in committee_items if c.get('name') or c.get('impression'))
        if com_html:extras+=f'<section><h2>委員会で確認したこと</h2>{com_html}</section>'
    elif r.get('committee'):
        extras+=f'<section><h2>委員会で取り上げたこと</h2><p style="white-space:pre-line">{h(r["committee"])}</p></section>'
    if r.get('note'):
        extras+=f'<section><h2>補足</h2><p style="white-space:pre-line">{h(r["note"])}</p></section>'
    links=''.join(f'<li>{link(i.get("label","関連資料"),i["url"],external=True)}</li>' for i in r.get('links',[]) if i.get('url','').startswith('https://'))
    if links:extras+=f'<section><h2>議事録・動画・資料</h2><ul class="source-list">{links}</ul></section>'
    if not topics: topics='<div class="empty-state">詳細は確認できたものから掲載します。</div>'
    draft_notice = '<div class="draft-notice" role="status">確認用の下書きです。公開サイトにはまだ掲載していません。</div>' if r.get('preview_only') else ''
    body=heading('COUNCIL REPORT',r['title'],r.get('summary',''))+f'<section class="wrap report-body">{draft_notice}<p class="report-date">開催：{h(str(int(r["date"][:4]))+"年"+str(int(r["date"][5:7]))+"月")}</p><h2>一般質問</h2>{topics}{extras}<div class="round-links">{link("← 議会報告の一覧・アーカイブへ",path("/council/"))}</div></section>'
    return layout(title=r['title'],desc=r.get('summary') or r['title'],body=body,current='council',url=r['url'],noindex=r.get('preview_only',False))


def games_page():
    body=heading('PLAY & LEARN','遊んで学ぶ','架空の島を育てるシミュレーションゲーム。無料で遊べます。')+f'''<section class="wrap game-list-page"><div class="game-grid">{games_cards()}</div><div class="panel soft"><h2>このゲームについて</h2><p>舞台は架空の島「ミライ島」です。</p><p>遊び方はゲームのスタート画面で確認できます。</p></div></section>'''
    return layout(title='遊んで学ぶ',desc='無料ブラウザゲーム「島おこし！ミライ島」。架空の島づくりを通じて、地域の仕事や暮らし、公共サービスを考えるシミュレーションゲームです。',body=body,current='games',url='/games/')


def contact_page():
    email=h(CONF['email'])
    body=heading('CONTACT','お問い合わせ','活動へのご意見やご連絡はこちらから。')+f'''<section class="wrap"><div class="panel contact-box"><h2>メールで連絡する</h2><p class="contact-mail"><a href="mailto:{email}">{email}</a></p><p>お送りいただいた内容は，確認のうえ必要に応じてお返事します。</p><p class="smallnote">氏名・連絡先など，必要以上の個人情報は書かないようお願いします。</p></div><section class="contact-social" aria-labelledby="contact-social-title"><div class="section-kicker">FOLLOW</div><h2 class="section-title" id="contact-social-title">SNSはこちら</h2>{social_links()}</section></section>'''
    return layout(title='お問い合わせ',desc='佐渡市議会議員・村川拓人（村川たくと）へのお問い合わせと、X・Instagram・Facebookの公式SNSアカウントの案内です。',body=body,current='contact',url='/contact/')


def privacy_page():
    body=heading('PRIVACY','個人情報の取り扱い','このサイトの利用と，お問い合わせについて。')+'''<section class="wrap"><div class="panel report-body"><h2>サイトの閲覧</h2><p>このサイト独自のアクセス解析や広告による閲覧履歴の追跡は行っていません。公開サービス側で通信記録が処理される場合があります。</p><h2>お問い合わせ</h2><p>メール等で受け取った氏名・メールアドレス・相談内容は，返信や相談への対応に必要な範囲で取り扱います。法令上必要な場合などを除き，本人の同意なく別の目的で利用しません。</p><h2>ゲーム</h2><p>「島おこし！ミライ島」はブラウザで動き，進行状況を利用中の端末内に保存します。サイト側でゲームの成績や個人情報を収集する機能は設けていません。</p><h2>外部サイト</h2><p>SNSや佐渡市議会などの外部サイトへ移動した後は，移動先の規約や個人情報の取り扱いが適用されます。</p></div></section>'''
    return layout(title='個人情報の取り扱い',desc='村川たくと公式サイトの個人情報の取り扱いについて。',body=body,url='/privacy/')


def not_found():
    body=f'<section class="wrap not-found"><div><h1>404</h1><h2>ページが見つかりません</h2><p>アドレスが変わったか，ページが移動した可能性があります。</p>{link("トップへ戻る →",path("/"),"text-link")}</div></section>'
    return layout(title='ページが見つかりません',desc='404',body=body,url='/404.html',noindex=True)


def build():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copytree(ROOT/'assets',OUT/'assets')
    for game in GAMES:
        game_dir = game['url'].strip('/').split('/')[-1]
        shutil.copytree(ROOT/'games'/game_dir, OUT/'games'/game_dir)
    reports=report_data()
    urls=[]
    for url,func in [('/',lambda:home_page(reports)),('/about/',about_page),('/ideas/',ideas_page),('/games/',games_page),('/contact/',contact_page),('/privacy/',privacy_page)]:
        write_page(url,func());urls.append(url)
    write_page('/council/',council_index(reports));urls.append('/council/')
    write_page('/council/past/',past_questions_page());urls.append('/council/past/')
    for report in reports:
        write_page(report['url'],report_page(report));urls.append(report['url'])
    (OUT/'404.html').write_text(not_found(),encoding='utf-8')
    (OUT/'.nojekyll').write_text('',encoding='utf-8')
    if ORIGIN:
        sitemap=''.join(f'<url><loc>{xml_escape(absolute(u))}</loc></url>' for u in urls+[g['url'] for g in GAMES])
        (OUT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+sitemap+'</urlset>',encoding='utf-8')
        (OUT/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+absolute('/sitemap.xml')+'\n',encoding='utf-8')
    else:
        # Preview is for local use; don't register a nonexistent URL with crawlers.
        (OUT/'robots.txt').write_text('User-agent: *\nDisallow: /\n',encoding='utf-8')
    print(f'Built {len(urls)} pages, {len(reports)} published reports and {len(GAMES)} games at {OUT}')

if __name__ == '__main__': build()
