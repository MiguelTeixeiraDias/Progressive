import { Platform } from 'react-native';

/**
 * Wire up PWA behaviour at runtime. This app uses React Navigation (not Expo
 * Router), so there's no `+html.tsx` to put `<head>` tags in — instead we inject
 * the manifest link, iOS "add to home screen" meta tags, and register the
 * service worker from JS when running on web. No-op on native.
 */
export function registerPWA(): void {
  if (Platform.OS !== 'web') return;
  if (typeof document === 'undefined') return;

  setViewport();
  injectBaseStyles();

  ensureLink('manifest', { rel: 'manifest', href: '/manifest.json' });
  ensureLink('apple-touch-icon', { rel: 'apple-touch-icon', href: '/apple-touch-icon-180.png' });

  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  ensureMeta('apple-mobile-web-app-title', 'Progressive');
  ensureMeta('theme-color', '#0B0F14');

  registerServiceWorker();
}

/**
 * Overwrite Expo's generated viewport meta. The key bit is
 * `interactive-widget=resizes-content`: without it, the on-screen keyboard only
 * shrinks the visual viewport, so our full-height flex shell keeps its size —
 * the bottom tab bar drops below the fold and the page can't reflow/scroll for a
 * moment after the keyboard closes. `resizes-content` resizes the layout
 * viewport so the shell (and tab bar) track the keyboard and restore instantly.
 *
 * We deliberately do NOT use `viewport-fit=cover`: on iOS it extends the layout
 * into the bottom safe area, and after the keyboard dismisses that inset isn't
 * always reclaimed — leaving a stubborn blank band below the tab bar.
 * Unlike ensureMeta, this replaces the existing tag rather than skipping it.
 */
function setViewport(): void {
  const content = 'width=device-width, initial-scale=1, interactive-widget=resizes-content';
  let meta = document.head.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/**
 * Pin the page to the dynamic viewport and paint everything behind the app the
 * app's dark background. The document's default background is white, so any gap
 * the browser leaves below the app shell (e.g. a viewport that doesn't fully
 * snap back after the keyboard closes) shows through as a white band. Using
 * `100dvh` makes the root track the *current* viewport — including keyboard and
 * browser-toolbar changes — and `overflow: hidden` stops the document itself
 * from scrolling (our own ScrollViews handle scrolling), so no blank strip can
 * be revealed below the tab bar.
 */
function injectBaseStyles(): void {
  if (document.getElementById('progressive-base-styles')) return;
  const style = document.createElement('style');
  style.id = 'progressive-base-styles';
  style.textContent = `
    html, body, #root {
      margin: 0;
      height: 100%;
      min-height: 100dvh;
      background-color: #0B0F14;
    }
    body { overflow: hidden; overscroll-behavior: none; }
  `;
  document.head.appendChild(style);
}

function ensureLink(key: string, attrs: { rel: string; href: string }): void {
  const selector = `link[rel="${attrs.rel}"]`;
  if (document.head.querySelector(selector)) return;
  const link = document.createElement('link');
  link.rel = attrs.rel;
  link.href = attrs.href;
  document.head.appendChild(link);
}

function ensureMeta(name: string, content: string): void {
  if (document.head.querySelector(`meta[name="${name}"]`)) return;
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
}

function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // Register after load so it never competes with the initial app bundle.
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('[pwa] service worker registration failed:', err?.message ?? err));
  });
}
