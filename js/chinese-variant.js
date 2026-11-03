(() => {
  'use strict';
  const control = document.getElementById('chinese-variant');
  if (!control) return;
  // Cupertino builds its TOC before this deferred script runs.
  const toc = document.querySelector('.post > aside > .toc');
  if (toc) toc.after(control);

  const storageKey = 'blog-chinese-variant';
  const buttons = [...control.querySelectorAll('button')];
  const status = control.querySelector('[role="status"]');
  const originalLanguage = control.dataset.originalLang;
  const originalTitle = document.title;
  const originals = new Map();
  // Never rewrite markup, identifiers, URLs, code, or math renderer output.
  const excluded = 'script, style, pre, code, kbd, samp, textarea, svg, math, mjx-container, .MathJax, .MathJax_Preview, .MathJax_Display, .katex, .math, .notranslate, [translate="no"], [lang]:not([lang|="zh"])';
  const roots = document.querySelectorAll('.post > .meta > .title, .post > .content, .post .toc');
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement.closest(excluded) || !/[\u3400-\u9fff]/.test(node.data)
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) originals.set(walker.currentNode, walker.currentNode.data);
  }

  let converter;
  let loading;
  function loadConverter() {
    if (converter) return Promise.resolve(converter);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = control.dataset.converterSrc;
      script.onload = () => {
        try {
          converter = window.OpenCC.Converter({ from: 'tw', to: 'cn' });
          resolve(converter);
        } catch (error) {
          script.remove();
          loading = null;
          reject(error);
        }
      };
      script.onerror = () => {
        script.remove();
        loading = null;
        reject(new Error('Unable to load OpenCC'));
      };
      document.head.append(script);
    });
    return loading;
  }

  async function select(variant, remember = true) {
    buttons.forEach(button => { button.disabled = true; });
    control.setAttribute('aria-busy', 'true');
    status.textContent = '';
    try {
      const simplified = variant === 'simplified';
      const convert = simplified ? await loadConverter() : value => value;
      for (const [node, original] of originals) {
        // Some posts keep inline TeX as text until MathJax finishes loading.
        node.data = simplified
          ? original.split(/(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g)
            .map((part, index) => index % 2 ? part : convert(part)).join('')
          : original;
      }
      document.title = convert(originalTitle);
      document.documentElement.lang = simplified ? 'zh-CN' : originalLanguage;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variant === variant)));
      if (remember) {
        try { localStorage.setItem(storageKey, variant); } catch (_) { /* Storage may be disabled. */ }
      }
    } catch (_) {
      status.textContent = '轉換載入失敗，請稍後重試。';
    } finally {
      buttons.forEach(button => { button.disabled = false; });
      control.removeAttribute('aria-busy');
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.variant)));
  control.hidden = false;
  try {
    if (localStorage.getItem(storageKey) === 'simplified') select('simplified', false);
  } catch (_) { /* The switch also works without persistent storage. */ }
})();
