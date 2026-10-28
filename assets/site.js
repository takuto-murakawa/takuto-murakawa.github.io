(() => {
  const button = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-site-nav]');
  if (button && nav) {
    const close = () => { button.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); };
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    document.addEventListener('click', e => { if (!nav.contains(e.target) && !button.contains(e.target)) close(); });
  }
})();


/* Ver.1.21 — Progressive enhancement; leave all text readable without JavaScript. */
(() => {
  const motion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion && motion.matches) return;
  const selectors = [
    '.top-social', '.section-head', '.game-card', '.home-more', '.more-link',
    '.page-top', '.profile-intro>.panel', '.profile-section-heading',
    '.timeline-item', '.profile-roles .panel', '.profile-sns', '.personal-card',
    '.qualification-group', '.policy-thinking', '.principle-card',
    '.report-card', '.report-body .topic', '.report-body .committee-entry',
    '.contact-box', '.topic-card', '.panel:not(.profile-sns):not(.profile-intro .panel)'
  ];
  if ('IntersectionObserver' in window) {
    const nodes = [...new Set([...document.querySelectorAll(selectors.join(','))])];
    const observer = new IntersectionObserver((entries, ob) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        ob.unobserve(entry.target);
      });
    }, {rootMargin: '0px 0px -22px 0px', threshold: 0.07});
    nodes.forEach((node, i) => {
      node.classList.add('reveal-item');
      node.style.setProperty('--reveal-delay', `${(i % 3) * 65}ms`);
      observer.observe(node);
    });
    document.body.classList.add('motion-ready');
  }
  const bar = document.querySelector('.site-scroll-progress');
  if (bar) {
    let queued = false;
    const update = () => {
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      const p = maximum > 0 ? Math.max(0, Math.min(1, window.scrollY / maximum)) : 0;
      bar.style.transform = `scaleX(${p})`;
      queued = false;
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', queue, {passive: true});
    window.addEventListener('resize', queue, {passive: true});
    update();
  }
})();

/* Council archive: deep links from highlight cards open their details on arrival. */
(() => {
  if (!document.querySelector('.past-archive')) return;
  function openLinkedQuestion() {
    const id=decodeURIComponent(location.hash.slice(1));
    if (!id.startsWith('past-q-')) return;
    const node=document.getElementById(id);
    if (node && node.tagName==='DETAILS') node.open=true;
  }
  window.addEventListener('hashchange', openLinkedQuestion);
  openLinkedQuestion();
})();

/* Ver.1.41 — One source of truth for 97 questions: accessible category / date switch. */
(() => {
  const archive = document.querySelector('.past-archive');
  if (!archive) return;
  const switcher = archive.querySelector('[data-past-switch]');
  const categoryPanel = archive.querySelector('[data-past-category-panel]');
  const monthPanel = archive.querySelector('[data-past-month-panel]');
  if (!switcher || !categoryPanel || !monthPanel) return;
  const tabs = [...switcher.querySelectorAll('[data-past-view]')];
  const choices = [...categoryPanel.querySelectorAll('[data-category-choice]')];
  const groups = [...categoryPanel.querySelectorAll('[data-category-group]')];
  const questions = [...monthPanel.querySelectorAll('.past-question[data-question-id]')];
  const monthLists = new Map([...monthPanel.querySelectorAll('[data-month-list]')].map(el => [el.dataset.monthList, el]));
  const categoryLists = new Map(groups.map(el => [el.dataset.categoryGroup, el.querySelector('[data-category-list]')]));
  if (!questions.length || questions.length !== 97) return; // Readable month view remains the fallback.

  let currentView = 'month';
  let selectedCategory = 'all';
  const resultsTitle = categoryPanel.querySelector('[data-category-results-title]');
  const resultsCount = categoryPanel.querySelector('[data-category-results-count]');
  const categoryName = new Map(choices.filter(el => el.dataset.categoryChoice !== 'all').map(el => [el.dataset.categoryChoice, el.querySelector('.past-category-name').textContent.trim()]));

  function showCategory(key) {
    selectedCategory = key;
    choices.forEach(button => {
      const selected = button.dataset.categoryChoice === key;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    groups.forEach(group => {
      const id = group.dataset.categoryGroup;
      const visible = key === 'all' || id === key;
      group.hidden = !visible;
      if (visible) {
        const amount = questions.filter(q => key === 'all' ? q.dataset.primaryCategory === id : q.dataset.categories.split(' ').includes(key)).length;
        group.querySelector('.past-category-group-count').textContent = `${amount}テーマ`;
      }
    });
    questions.forEach(question => {
      const id = key === 'all' ? question.dataset.primaryCategory : key;
      if (key === 'all' || question.dataset.categories.split(' ').includes(key)) {
        categoryLists.get(id).appendChild(question);
      } else {
        // Keep non-matching records in the hidden month panel, rather than losing them.
        monthLists.get(question.dataset.meeting).appendChild(question);
      }
    });
    const count = key === 'all' ? questions.length : questions.filter(q => q.dataset.categories.split(' ').includes(key)).length;
    resultsTitle.textContent = key === 'all' ? 'カテゴリ別の質問一覧' : `${categoryName.get(key)}に関する質問`;
    resultsCount.textContent = `${count}テーマ`;
  }

  function showMonth() {
    questions.forEach(question => monthLists.get(question.dataset.meeting).appendChild(question));
  }

  function selectView(next) {
    if (next !== 'category' && next !== 'month') return;
    currentView = next;
    tabs.forEach(tab => {
      const selected = tab.dataset.pastView === next;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    if (next === 'category') showCategory(selectedCategory);
    else showMonth();
    categoryPanel.hidden = next !== 'category';
    monthPanel.hidden = next !== 'month';
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectView(tab.dataset.pastView));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      selectView(tabs[next].dataset.pastView);
    });
  });
  choices.forEach(button => button.addEventListener('click', () => showCategory(button.dataset.categoryChoice)));

  // Activate only when JS can actually switch panels. Without JS, the full chronological list stays visible.
  switcher.hidden = false;
  selectView('category');

  function openLinkedQuestion() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    if (!id.startsWith('past-q-')) return;
    const question = document.getElementById(id);
    if (!question || !question.matches('.past-question')) return;
    if (currentView === 'category' && selectedCategory !== 'all' && !question.dataset.categories.split(' ').includes(selectedCategory)) {
      showCategory(question.dataset.primaryCategory);
    }
    question.open = true;
    requestAnimationFrame(() => question.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange', openLinkedQuestion);
  if (location.hash) openLinkedQuestion();
})();
