const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium, devices } = require('playwright');

const ROOT = process.cwd();
const DEFAULT_FILE = 'index.html';
const OUT_DIR = path.join(ROOT, 'qa-logs');
const SCREEN_DIR = path.join(ROOT, 'qa-screenshots');
const PAGE_ROUTE_MAP = Object.freeze({
  'home-page': '',
  'about-page': 'about',
  'contact-page': 'contact',
  'service-ai-page': 'services/ai-software-solutions',
  'service-3d-page': 'services/3d-visualization',
  'service-books-page': 'services/2d-plans',
  'service-graphics-page': 'services/graphic-social-design',
  'service-logos-page': 'services/logo-identity',
  'service-motion-page': 'services/video-editing',
  'service-pack-page': 'services/motion-graphics',
  'service-reels-page': 'services/short-video-production',
  'service-voice-page': 'services/voice-over',
  'service-web-page': 'services/software-development-agency',
  'branded-official-page': 'brand/vexus-official',
  'branded-about-page': 'brand/about-vexus',
  'branded-3d-page': 'brand/vexus-3d-services',
  'branded-video-page': 'brand/vexus-video-motion',
  'branded-voice-page': 'brand/vexus-voice-over',
  'branded-branding-page': 'brand/vexus-brand-identity',
  'branded-app-page': 'brand/vexus-app-development',
  'branded-web-page': 'brand/vexus-web-seo'
});

function buildLangPath(lang, pageId) {
  const safeLang = lang === 'ar' ? 'ar' : 'en';
  const slug = PAGE_ROUTE_MAP[pageId];
  if (slug === undefined) return `/${safeLang}/`;
  return slug ? `/${safeLang}/${slug}/` : `/${safeLang}/`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
  };
  return map[ext] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '').split('?')[0]);
        const requestedPath = urlPath === '/' || urlPath === '' ? `/${DEFAULT_FILE}` : urlPath;
        const filePath = path.normalize(path.join(ROOT, requestedPath.replace(/^\/+/, '')));
        if (!filePath.startsWith(ROOT)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) {
            if (!path.extname(requestedPath)) {
              const fallbackPath = path.join(ROOT, DEFAULT_FILE);
              res.writeHead(200, { 'Content-Type': getMime(fallbackPath) });
              fs.createReadStream(fallbackPath).pipe(res);
              return;
            }
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': getMime(filePath) });
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
        });
      } catch (e) {
        res.writeHead(500);
        res.end('Server Error');
      }
    });
    server.listen(0, () => resolve(server));
  });
}

function slugify(value) {
  return String(value).replace(/[^a-zA-Z0-9-_]+/g, '-');
}

function summarizeAxe(axeResults) {
  return {
    violations: axeResults.violations || [],
    passes: (axeResults.passes || []).length,
    incomplete: (axeResults.incomplete || []).length,
    inapplicable: (axeResults.inapplicable || []).length
  };
}

async function runAxe(page) {
  const axePath = path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js');
  if (!(await page.evaluate(() => !!window.axe))) {
    await page.addScriptTag({ path: axePath });
  }
  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
    });
  });
  return summarizeAxe(results);
}
async function collectPageData(page, pageId) {
  return await page.evaluate((pageId) => {
    const activePage = document.querySelector('.page.active');
    const scope = activePage || document;
    const lang = document.documentElement.lang || 'en';
    const translationsMap = typeof translations !== 'undefined' ? translations : {};

    const trim = (value) => (value || '').replace(/\s+/g, ' ').trim();

    const i18nElements = Array.from(scope.querySelectorAll('[data-i18n]')).map(el => ({
      key: el.dataset.i18n,
      text: trim(el.textContent || ''),
      tag: el.tagName.toLowerCase(),
      classes: el.className || ''
    }));
    const i18nAria = Array.from(scope.querySelectorAll('[data-i18n-aria]')).map(el => ({
      key: el.dataset.i18nAria,
      aria: trim(el.getAttribute('aria-label') || ''),
      tag: el.tagName.toLowerCase(),
      classes: el.className || ''
    }));
    const i18nAlt = Array.from(scope.querySelectorAll('[data-i18n-alt]')).map(el => ({
      key: el.dataset.i18nAlt,
      alt: trim(el.getAttribute('alt') || ''),
      tag: el.tagName.toLowerCase(),
      classes: el.className || ''
    }));

    const visibilityTargets = Array.from(scope.querySelectorAll('[data-i18n], button, a, input, textarea, select, .interactive-card'));
    const hiddenElements = visibilityTargets
      .filter(el => {
        const style = window.getComputedStyle(el);
        return el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.visibility === 'hidden';
      })
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: el.className || '',
        text: trim(el.textContent || ''),
        dataI18n: el.dataset.i18n || null
      }));

    const docEl = document.documentElement;
    const overflow = docEl.scrollWidth > window.innerWidth + 2;
    const overflowElements = Array.from(scope.querySelectorAll('*'))
      .map(el => {
        const rect = el.getBoundingClientRect();
        return { el, rect };
      })
      .filter(({ rect }) => rect.width > 0 && rect.right > window.innerWidth + 2)
      .slice(0, 8)
      .map(({ el, rect }) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: el.className || '',
        right: Math.round(rect.right),
        width: Math.round(rect.width)
      }));

    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '';
    const title = document.title || '';

    const allH1 = Array.from(document.querySelectorAll('h1')).map(h1 => trim(h1.textContent || ''));
    const activeH1 = Array.from(scope.querySelectorAll('h1')).map(h1 => trim(h1.textContent || ''));

    const imagesMissingAlt = Array.from(scope.querySelectorAll('img'))
      .filter(img => !img.hasAttribute('alt') || trim(img.getAttribute('alt')) === '')
      .map(img => ({
        src: img.getAttribute('src') || '',
        classes: img.className || ''
      }));

    const inputsMissingLabel = Array.from(scope.querySelectorAll('input, textarea, select'))
      .filter(input => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim()) return false;
        if (id && document.querySelector(`label[for="${id}"]`)) return false;
        return true;
      })
      .map(input => ({
        tag: input.tagName.toLowerCase(),
        id: input.getAttribute('id') || null,
        name: input.getAttribute('name') || null
      }));

    const metaViewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';

    return {
      lang,
      pageId: activePage ? activePage.id : pageId,
      title,
      metaDescription,
      canonical,
      ogTitle,
      ogDescription,
      twitterTitle,
      twitterDescription,
      allH1,
      activeH1,
      metaViewport,
      i18nElements,
      i18nAria,
      i18nAlt,
      translationsMap,
      hiddenElements,
      overflow,
      overflowElements,
      imagesMissingAlt,
      inputsMissingLabel
    };
  }, pageId);
}

async function collectPerformance(page) {
  return await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = performance.getEntriesByType('paint') || [];
    const resources = performance.getEntriesByType('resource') || [];
    return {
      navigation: {
        domContentLoaded: nav.domContentLoadedEventEnd || null,
        loadEventEnd: nav.loadEventEnd || null,
        responseEnd: nav.responseEnd || null,
        startTime: nav.startTime || null
      },
      paints: paints.map(p => ({ name: p.name, startTime: p.startTime })),
      resources: resources.map(r => ({
        name: r.name,
        initiatorType: r.initiatorType,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        duration: r.duration
      }))
    };
  });
}

function analyzeI18n(pageData, language) {
  const translations = pageData.translationsMap || {};
  const langKeys = new Set(Object.keys(translations[language] || {}));
  const missingKeys = [];
  const missingText = [];
  const mismatches = [];
  const missingAria = [];
  const missingAlt = [];

  pageData.i18nElements.forEach(item => {
    if (!langKeys.has(item.key)) {
      missingKeys.push(item.key);
    }
    if (!item.text) {
      missingText.push(item.key);
    }
    if (langKeys.has(item.key)) {
      const expected = translations[language][item.key];
      if (expected && item.text && item.text !== expected) {
        mismatches.push({ key: item.key, expected, actual: item.text });
      }
    }
  });

  pageData.i18nAria.forEach(item => {
    if (!langKeys.has(item.key)) missingAria.push(item.key);
    if (langKeys.has(item.key)) {
      const expected = translations[language][item.key];
      if (expected && item.aria && item.aria !== expected) {
        mismatches.push({ key: item.key, expected, actual: item.aria, kind: 'aria-label' });
      }
    }
  });

  pageData.i18nAlt.forEach(item => {
    if (!langKeys.has(item.key)) missingAlt.push(item.key);
  });

  return {
    missingKeys: Array.from(new Set(missingKeys)),
    missingText: Array.from(new Set(missingText)),
    missingAria: Array.from(new Set(missingAria)),
    missingAlt: Array.from(new Set(missingAlt)),
    mismatches
  };
}

function analyzePerformance(perf) {
  const heavyResources = (perf.resources || [])
    .map(r => {
      const size = r.transferSize || r.encodedBodySize || 0;
      return { ...r, size };
    })
    .filter(r => r.size > 2 * 1024 * 1024)
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  return { ...perf, heavyResources };
}
async function runFunctionalChecks(page, contextName, language) {
  const results = [];

  const record = (name, status, details) => {
    results.push({ name, status, details: details || null });
  };

  try {
    await page.evaluate(() => {
      const el = document.querySelector('[data-target="home-page"]');
      if (el) el.click();
    });
    await page.waitForFunction(() => document.querySelector('.page.active')?.id === 'home-page');
    record('Navigate to home page', 'pass');
  } catch (e) {
    record('Navigate to home page', 'fail', e.message);
  }

  try {
    await page.evaluate((lang) => {
      const btn = document.querySelector(`.lang-switcher button[data-lang="${lang}"]`);
      if (btn) btn.click();
    }, language);
    await page.waitForFunction((lang) => document.documentElement.lang === lang, language);
    record('Switch language via UI', 'pass');
  } catch (e) {
    record('Switch language via UI', 'fail', e.message);
  }

  try {
    await page.evaluate(() => {
      const card = document.querySelector('.service-card[data-target="service-3d-page"]');
      if (card) card.click();
    });
    await page.waitForFunction(() => document.querySelector('.page.active')?.id === 'service-3d-page');
    record('Open service page from card', 'pass');
  } catch (e) {
    record('Open service page from card', 'fail', e.message);
  }

  try {
    await page.waitForTimeout(400);
    const hasItem = await page.evaluate(() => {
      const item = document.querySelector('.page.active .portfolio-item');
      if (!item) return false;
      item.click();
      return true;
    });
    if (!hasItem) {
      record('Open portfolio modal', 'skip', 'No portfolio items found on service page');
    } else {
      await page.waitForFunction(() => document.getElementById('portfolio-modal')?.classList.contains('visible'));
      record('Open portfolio modal', 'pass');
      await page.evaluate(() => {
        const btn = document.querySelector('#portfolio-modal .close-button');
        if (btn) btn.click();
      });
      await page.waitForFunction(() => !document.getElementById('portfolio-modal')?.classList.contains('visible'));
      record('Close portfolio modal', 'pass');
    }
  } catch (e) {
    record('Open/Close portfolio modal', 'fail', e.message);
  }

  try {
    await page.evaluate(() => {
      const link = document.querySelector('[data-target="contact-page"]');
      if (link) link.click();
    });
    await page.waitForFunction(() => document.querySelector('.page.active')?.id === 'contact-page');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'invalid-email');
    await page.fill('#message', 'Test message');
    await page.click('#contact-form button[type="submit"]');
    await page.waitForTimeout(200);
    const statusText = await page.textContent('#form-status');
    if (statusText && statusText.trim().length > 0) {
      record('Contact form validation', 'pass', statusText.trim());
    } else {
      record('Contact form validation', 'fail', 'No validation message');
    }
  } catch (e) {
    record('Contact form validation', 'fail', e.message);
  }

  if (contextName === 'mobile') {
    try {
      await page.click('.mobile-nav-toggle');
      await page.waitForTimeout(200);
      await page.click('.mobile-nav a[data-target="about-page"]');
      await page.waitForFunction(() => document.querySelector('.page.active')?.id === 'about-page');
      record('Mobile nav flow', 'pass');
    } catch (e) {
      record('Mobile nav flow', 'fail', e.message);
    }
  }

  return results;
}

async function navigateToPage(page, pageId) {
  const clicked = await page.evaluate((id) => {
    const el = document.querySelector(`[data-target="${id}"]`);
    if (!el) return false;
    el.click();
    return true;
  }, pageId);
  if (!clicked) {
    const lang = await page.evaluate(() => document.documentElement.lang || 'en');
    const nextUrl = new URL(buildLangPath(lang, pageId), page.url()).toString();
    await page.goto(nextUrl, { waitUntil: 'networkidle' });
  }
  await page.waitForFunction((id) => document.querySelector('.page.active')?.id === id, pageId);
}

async function main() {
  ensureDir(OUT_DIR);
  ensureDir(SCREEN_DIR);

  const server = await startServer();
  const port = server.address().port;
  const filePathEncoded = encodeURIComponent(DEFAULT_FILE).replace(/%20/g, '%20');
  const baseUrl = `http://127.0.0.1:${port}/${filePathEncoded}`;

  const browser = await chromium.launch({ headless: true });

  const contexts = [
    { name: 'desktop', options: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', options: { ...devices['iPhone 12'] } }
  ];

  const summary = [];

  for (const ctx of contexts) {
    const context = await browser.newContext(ctx.options);
    const page = await context.newPage();

    const consoleMessages = [];
    const pageErrors = [];
    const networkEvents = [];

    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      });
    });
    page.on('pageerror', error => {
      pageErrors.push({
        message: error.message,
        stack: error.stack || null,
        timestamp: new Date().toISOString()
      });
    });
    page.on('requestfailed', req => {
      networkEvents.push({
        type: 'requestfailed',
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        errorText: req.failure()?.errorText || 'unknown',
        timestamp: new Date().toISOString()
      });
    });
    page.on('response', res => {
      if (res.status() >= 400) {
        networkEvents.push({
          type: 'http',
          url: res.url(),
          status: res.status(),
          statusText: res.statusText(),
          resourceType: res.request().resourceType(),
          timestamp: new Date().toISOString()
        });
      }
    });

    for (const language of ['en', 'ar']) {
      await page.goto(baseUrl, { waitUntil: 'load' });
      await page.waitForSelector('.lang-switcher button', { state: 'attached' });
      await page.evaluate((lang) => {
        const btn = document.querySelector(`.lang-switcher button[data-lang="${lang}"]`);
        if (btn) btn.click();
      }, language);
      await page.waitForFunction((lang) => document.documentElement.lang === lang, language);

      const pageIds = await page.evaluate(() => Array.from(document.querySelectorAll('.page')).map(p => p.id));

      const functionalResults = await runFunctionalChecks(page, ctx.name, language);
      const funcFile = path.join(OUT_DIR, `functional-${ctx.name}-${language}.json`);
      fs.writeFileSync(funcFile, JSON.stringify({
        meta: { viewport: ctx.name, language, timestamp: new Date().toISOString() },
        results: functionalResults
      }, null, 2));

      for (const pageId of pageIds) {
        const startIndexes = {
          console: consoleMessages.length,
          pageErrors: pageErrors.length,
          network: networkEvents.length
        };

        await navigateToPage(page, pageId);
        await page.waitForTimeout(1000);

        const pageData = await collectPageData(page, pageId);
        const perfData = analyzePerformance(await collectPerformance(page));
        const i18nData = analyzeI18n(pageData, language);
        const axeData = await runAxe(page);

        const log = {
          meta: {
            timestamp: new Date().toISOString(),
            viewport: ctx.name,
            language,
            pageId: pageData.pageId,
            url: page.url()
          },
          console: {
            messages: consoleMessages.slice(startIndexes.console)
          },
          pageErrors: pageErrors.slice(startIndexes.pageErrors),
          network: networkEvents.slice(startIndexes.network),
          i18n: i18nData,
          visibility: {
            hiddenElements: pageData.hiddenElements,
            horizontalOverflow: pageData.overflow,
            overflowElements: pageData.overflowElements
          },
          seo: {
            title: pageData.title,
            titleLength: pageData.title.length,
            metaDescription: pageData.metaDescription,
            metaDescriptionLength: pageData.metaDescription.length,
            canonical: pageData.canonical,
            ogTitle: pageData.ogTitle,
            ogDescription: pageData.ogDescription,
            twitterTitle: pageData.twitterTitle,
            twitterDescription: pageData.twitterDescription,
            allH1Count: pageData.allH1.length,
            activeH1Count: pageData.activeH1.length,
            activeH1: pageData.activeH1,
            imagesMissingAlt: pageData.imagesMissingAlt,
            inputsMissingLabel: pageData.inputsMissingLabel,
            metaViewport: pageData.metaViewport
          },
          performance: perfData,
          accessibility: axeData
        };

        const hasIssues = (
          log.pageErrors.length ||
          log.console.messages.some(m => m.type === 'error') ||
          log.network.length ||
          log.i18n.missingKeys.length ||
          log.i18n.missingText.length ||
          log.visibility.horizontalOverflow ||
          (log.accessibility.violations && log.accessibility.violations.length) ||
          log.seo.imagesMissingAlt.length ||
          log.seo.inputsMissingLabel.length
        );

        if (hasIssues) {
          const screenshotPath = path.join(SCREEN_DIR, `${slugify(ctx.name)}-${slugify(language)}-${slugify(pageId)}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          log.screenshot = path.relative(ROOT, screenshotPath);
        }

        const fileName = `page-${ctx.name}-${language}-${pageId}.json`;
        fs.writeFileSync(path.join(OUT_DIR, fileName), JSON.stringify(log, null, 2));

        summary.push({
          viewport: ctx.name,
          language,
          pageId,
          issues: {
            consoleErrors: log.console.messages.filter(m => m.type === 'error').length,
            pageErrors: log.pageErrors.length,
            networkFailures: log.network.length,
            i18nMissing: log.i18n.missingKeys.length + log.i18n.missingText.length,
            a11y: log.accessibility.violations ? log.accessibility.violations.length : 0,
            overflow: log.visibility.horizontalOverflow
          }
        });
      }
    }

    await page.close();
    await context.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({
    meta: { timestamp: new Date().toISOString() },
    summary
  }, null, 2));

  await browser.close();
  server.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
