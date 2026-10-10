/**
 * Site-wide behaviour.
 *
 * One module, no framework. Everything here is progressive enhancement: the
 * page is fully usable with JavaScript disabled.
 *
 *   1. Header elevation on scroll
 *   2. Scroll reveal via a single shared IntersectionObserver
 *   3. Dropdown menus (language, theme) with click-outside + Escape
 *   4. Theme switching with system preference tracking
 *   5. Mobile navigation drawer with focus trapping
 *   6. Count-up statistics (skipped when reduced motion is requested)
 */

const doc = document;
const root = doc.documentElement;

/* ------------------------------------------------------------------ *
 * 1 · Header elevation
 * ------------------------------------------------------------------ */
const header = doc.querySelector<HTMLElement>('[data-header]');
if (header) {
  const paint = () => {
    if (window.scrollY > 8) {
      header.classList.add(
        'bg-[var(--color-surface)]/85',
        'backdrop-blur-xl',
        'border-[var(--color-line)]',
        'shadow-[var(--shadow-sm)]'
      );
    } else {
      header.classList.remove(
        'bg-[var(--color-surface)]/85',
        'backdrop-blur-xl',
        'border-[var(--color-line)]',
        'shadow-[var(--shadow-sm)]'
      );
    }
  };
  paint();
  window.addEventListener('scroll', paint, { passive: true });
}

/* ------------------------------------------------------------------ *
 * 2 · Scroll reveal
 *
 * Any element marked `data-reveal` (optionally `data-reveal="80"` for a
 * custom delay) is promoted to a `.gh-reveal` and animated in. Siblings under
 * the same parent are staggered automatically so grids cascade evenly.
 * ------------------------------------------------------------------ */
doc.querySelectorAll<HTMLElement>('[data-reveal]:not(.gh-reveal)').forEach((el, i) => {
  el.classList.add('gh-reveal');
  const explicit = el.dataset.reveal;
  if (explicit && !Number.isNaN(Number(explicit))) {
    el.style.setProperty('--reveal-delay', `${explicit}ms`);
  } else {
    const siblings = Array.from(el.parentElement?.children ?? []).filter(
      (c) => c instanceof HTMLElement && (c.hasAttribute('data-reveal') || c.classList.contains('gh-reveal'))
    );
    const pos = siblings.indexOf(el);
    el.style.setProperty('--reveal-delay', `${Math.min(Math.max(pos, 0), 6) * 70}ms`);
  }
  void i;
});

const revealables = doc.querySelectorAll<HTMLElement>('.gh-reveal');
if (revealables.length) {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealables.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
    );
    revealables.forEach((el) => io.observe(el));
  }
}

/* ------------------------------------------------------------------ *
 * 3 · Dropdown menus
 * ------------------------------------------------------------------ */
type MenuName = 'lang' | 'theme';

function setupMenu(name: MenuName, toggleSel: string, panelSel: string) {
  const wrap = doc.querySelector<HTMLElement>(`[data-${name}-menu]`);
  if (!wrap) return;
  const toggle = wrap.querySelector<HTMLElement>(toggleSel);
  const panel = wrap.querySelector<HTMLElement>(panelSel);
  if (!toggle || !panel) return;

  let open = false;

  const show = (state: boolean) => {
    open = state;
    toggle.setAttribute('aria-expanded', String(state));
    panel.classList.toggle('invisible', !state);
    panel.classList.toggle('opacity-0', !state);
    panel.classList.toggle('scale-95', !state);
    if (state) {
      const first = panel.querySelector<HTMLElement>('a, button');
      // Let the panel become visible before moving focus into it.
      requestAnimationFrame(() => first?.focus());
    }
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    show(!open);
  });

  wrap.addEventListener('click', (e) => e.stopPropagation());
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      show(false);
      toggle.focus();
    }
  });
}

setupMenu('lang', '[data-lang-toggle]', '[data-lang-panel]');
setupMenu('theme', '[data-theme-toggle]', '[data-theme-panel]');

doc.addEventListener('click', () => {
  doc.querySelectorAll<HTMLElement>('[data-lang-panel], [data-theme-panel]').forEach((panel) => {
    panel.classList.add('invisible', 'opacity-0', 'scale-95');
  });
  doc
    .querySelectorAll<HTMLElement>('[data-lang-toggle], [data-theme-toggle]')
    .forEach((b) => b.setAttribute('aria-expanded', 'false'));
});

/* ------------------------------------------------------------------ *
 * 4 · Theme
 * ------------------------------------------------------------------ */
const THEME_KEY = 'gh-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(mode: 'light' | 'dark' | 'system') {
  const dark = mode === 'system' ? media.matches : mode === 'dark';
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* storage blocked */
  }
  doc.querySelectorAll<HTMLElement>('[data-theme-check]').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.themeCheck !== mode);
  });
}

function currentTheme(): 'light' | 'dark' | 'system' {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage blocked */
  }
  return 'system';
}

applyTheme(currentTheme());

doc.querySelectorAll<HTMLElement>('[data-theme-set]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.themeSet as 'light' | 'dark' | 'system';
    applyTheme(mode);
  });
});

media.addEventListener('change', () => {
  if (currentTheme() === 'system') applyTheme('system');
});

/* ------------------------------------------------------------------ *
 * 5 · Mobile navigation drawer
 * ------------------------------------------------------------------ */
const navPanel = doc.querySelector<HTMLElement>('[data-nav-panel]');
if (navPanel) {
  const sheet = navPanel.querySelector<HTMLElement>('[data-nav-sheet]');
  const openBtn = doc.querySelector<HTMLElement>('[data-open-nav]');
  const closeBtn = navPanel.querySelector<HTMLElement>('[data-close-nav]');
  const scrim = navPanel.querySelector<HTMLElement>('[data-nav-scrim]');
  let navOpen = false;
  let navReturn: HTMLElement | null = null;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  const setNav = (state: boolean) => {
    navOpen = state;
    navPanel.classList.toggle('invisible', !state);
    navPanel.setAttribute('aria-hidden', String(!state));
    sheet?.classList.toggle('opacity-0', !state);
    sheet?.classList.toggle('translate-y-[-2%]', !state);
    openBtn?.setAttribute('aria-expanded', String(state));
    doc.body.classList.toggle('overflow-hidden', state);
    if (state) {
      navReturn = doc.activeElement as HTMLElement;
      requestAnimationFrame(() => sheet?.querySelector<HTMLElement>('[data-close-nav]')?.focus());
    } else {
      navReturn?.focus();
    }
  };

  openBtn?.addEventListener('click', () => setNav(true));
  closeBtn?.addEventListener('click', () => setNav(false));
  scrim?.addEventListener('click', () => setNav(false));

  // Close when a link inside the sheet is followed (same-page anchors too).
  sheet?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a[href]')) setNav(false);
  });

  doc.addEventListener('keydown', (e) => {
    if (!navOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setNav(false);
      return;
    }
    if (e.key !== 'Tab' || !sheet) return;
    // Trap focus inside the drawer while it is open.
    const focusables = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && doc.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && doc.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

/* ------------------------------------------------------------------ *
 * 6 · Count-up statistics
 * ------------------------------------------------------------------ */
const counters = doc.querySelectorAll<HTMLElement>('[data-count-to]');
if (counters.length) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const render = (el: HTMLElement, value: number) => {
    const prefix = el.dataset.countPrefix ?? '';
    const suffix = el.dataset.countSuffix ?? '';
    const decimals = Number(el.dataset.countDecimals ?? 0);
    try {
      el.textContent =
        prefix +
        new Intl.NumberFormat(doc.documentElement.lang || 'en', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value) +
        suffix;
    } catch {
      el.textContent = prefix + value.toFixed(decimals) + suffix;
    }
  };

  if (reduce || !('IntersectionObserver' in window)) {
    counters.forEach((el) => render(el, Number(el.dataset.countTo ?? 0)));
  } else {
    const cio = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const target = Number(el.dataset.countTo ?? 0);
          const duration = 1100;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            render(el, target * eased);
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          cio.unobserve(el);
        }
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => {
      render(el, 0);
      cio.observe(el);
    });
  }
}

/* ------------------------------------------------------------------ *
 * Back to top
 * ------------------------------------------------------------------ */
doc.querySelectorAll<HTMLElement>('[data-back-to-top]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    doc.getElementById('main')?.focus({ preventScroll: true });
  });
});
