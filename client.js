/**
 * Client half of the ChatGPT panel bundle.
 *
 * Adds one entry to the left sidebar and the `main` panel it opens. On the
 * desktop shell the panel hosts a native Electron guest through the shell's
 * lease-scoped browser bridge, so chatgpt.com is not subject to the site's
 * X-Frame-Options. In a plain browser it falls back to an iframe and explains
 * the restriction. The toolbar reloads the page.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-chatgpt-panel',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'chatgptPanel';
    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'chatgpt';
    /** Address opened by the embedded browser. */
    const CHATGPT_URL = 'https://chatgpt.com/';
    /** Address shown in the toolbar pill. */
    const CHATGPT_ADDRESS = 'chatgpt.com';

    /** Locale-owned copy for the panel and its toolbar. */
    const zh = {
      panel: 'ChatGPT',
      address: 'chatgpt.com',
      back: '后退',
      forward: '前进',
      reload: '刷新',
      openExternal: '在浏览器中打开',
      error: 'ChatGPT 加载失败，请刷新重试或使用浏览器打开。',
      'web.notice': '普通浏览器会因 X-Frame-Options 拒绝嵌入 ChatGPT。请在 DSH 桌面应用中使用内嵌浏览器，或在新标签页打开。',
      'web.open': '打开 ChatGPT',
    };

    /** English dictionary with the same keys. */
    const en = {
      panel: 'ChatGPT',
      address: 'chatgpt.com',
      back: 'Back',
      forward: 'Forward',
      reload: 'Reload',
      openExternal: 'Open in browser',
      error: 'ChatGPT could not load. Reload it or open it in your browser.',
      'web.notice':
        'A normal browser refuses to embed ChatGPT because of X-Frame-Options. Use the DSH desktop app, or open ChatGPT in a new tab.',
      'web.open': 'Open ChatGPT',
    };

    /**
     * The desktop shell exposes a lease-scoped guest browser bridge only to its
     * own authenticated application page. Its presence selects the native guest.
     */
    const desktopBrowser = (() => {
      try {
        const desktop = globalThis.dshDesktop;
        const browser = desktop && desktop.protocolVersion === 1 ? desktop.browser : undefined;
        if (
          browser &&
          typeof browser.acquire === 'function' &&
          typeof browser.release === 'function' &&
          typeof browser.onOpenRequested === 'function'
        ) {
          return browser;
        }
      } catch (error) {
        // A restricted page can throw when reading the bridge; use the iframe fallback.
      }
      return undefined;
    })();

    /**
     * The measured center-column box, shared between the main-panel anchor and
     * the always-mounted surface in `shell.overlay`. The surface hides while the
     * anchor is absent but keeps its guest alive, so returning to the panel shows
     * the same page instead of loading it again.
     */
    let measuredRect = null;
    const rectListeners = new Set();

    /** Publish the anchor's viewport box; identical boxes do not notify. */
    function publishSurfaceRect(rect) {
      if (
        rect === null
          ? measuredRect === null
          : measuredRect !== null &&
            rect.left === measuredRect.left &&
            rect.top === measuredRect.top &&
            rect.width === measuredRect.width &&
            rect.height === measuredRect.height
      ) {
        return;
      }
      measuredRect = rect;
      for (const listener of [...rectListeners]) listener();
    }

    /** Subscribe to center-column box changes (the useSyncExternalStore contract). */
    function subscribeSurfaceRect(listener) {
      rectListeners.add(listener);
      return () => {
        rectListeners.delete(listener);
      };
    }

    /** Current center-column box, or null while the ChatGPT panel is not mounted. */
    function surfaceRectSnapshot() {
      return measuredRect;
    }

    /** Read the current center-column box. */
    function useSurfaceRect() {
      const [rect, setRect] = React.useState(surfaceRectSnapshot);
      React.useEffect(() => {
        setRect(surfaceRectSnapshot());
        return subscribeSurfaceRect(() => setRect(surfaceRectSnapshot()));
      }, []);
      return rect;
    }

    /** Render a small line icon with the current text color. */
    function lineIcon(size, path) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', {
          d: path,
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    /** Back arrow. */
    function IconBack() {
      return lineIcon(16, 'M15 18l-6-6 6-6');
    }

    /** Forward arrow. */
    function IconForward() {
      return lineIcon(16, 'M9 6l6 6-6 6');
    }

    /** Reload arrow, optionally spinning while the page loads. */
    function IconReload({ spinning }) {
      return h(
        'svg',
        {
          width: 16,
          height: 16,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
          className: spinning ? 'dsh-chatgpt-spin' : undefined,
          style: { display: 'block' },
        },
        h('path', {
          d: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    /** External-link arrow. */
    function IconExternal() {
      return h(
        'svg',
        {
          width: 15,
          height: 15,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', {
          d: 'M14 5h5v5M19 5l-7 7M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    /** Small lock beside the address. */
    function IconLock() {
      return h(
        'svg',
        {
          width: 11,
          height: 11,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block', flex: 'none' },
        },
        h('rect', {
          x: 5,
          y: 10,
          width: 14,
          height: 10,
          rx: 2,
          stroke: 'currentColor',
          strokeWidth: 1.8,
        }),
        h('path', {
          d: 'M8 10V7a4 4 0 0 1 8 0v3',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
      );
    }

    /** Original ChatGPT-panel glyph: a speech bubble with a spark. */
    function PanelIcon({ size = 20 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('path', {
          d: 'M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M12 8.1l.85 2.25 2.25.85-2.25.85-.85 2.25-.85-2.25-2.25-.85 2.25-.85.85-2.25Z',
          fill: 'currentColor',
        }),
      );
    }

    /** One compact toolbar button. */
    function ToolButton({ label, onClick, disabled, spinning, children }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'dsh-chatgpt-tool',
          title: label,
          'aria-label': label,
          disabled: disabled === true,
          onClick,
        },
        spinning === true ? h(IconReload, { spinning: true }) : children,
      );
    }

    /** Shared toolbar: navigation, address pill, external link. */
    function Toolbar({ t, loading, canBack, canForward, onBack, onForward, onReload, onExternal }) {
      return h(
        'div',
        { className: 'dsh-chatgpt-bar' },
        h(ToolButton, { label: t('back'), onClick: onBack, disabled: !canBack }, h(IconBack)),
        h(ToolButton, { label: t('forward'), onClick: onForward, disabled: !canForward }, h(IconForward)),
        h(ToolButton, { label: t('reload'), onClick: onReload, spinning: loading === true, children: h(IconReload) }),
        h(
          'div',
          { className: 'dsh-chatgpt-pill', title: CHATGPT_ADDRESS },
          h(IconLock),
          h('span', { className: 'dsh-chatgpt-pillText' }, t('address')),
        ),
        h(ToolButton, { label: t('openExternal'), onClick: onExternal }, h(IconExternal)),
      );
    }

    /** Styles for the panel; rendered with the component so unmounting removes them. */
    const CSS = `
.dsh-chatgpt-root{display:flex;flex:1;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.dsh-chatgpt-anchor{flex:1;width:100%;height:100%;min-width:0;min-height:0;background:var(--dsw-alias-bg-base)}
.dsh-chatgpt-surface{position:fixed;z-index:0;box-sizing:border-box;overflow:hidden;background:var(--dsw-alias-bg-base)}
.dsh-chatgpt-bar{box-sizing:border-box;display:flex;flex:none;align-items:center;gap:4px;height:38px;padding:5px 8px;border-bottom:.5px solid var(--dsw-alias-border-l2);-webkit-app-region:drag}
.dsh-chatgpt-tool{display:inline-flex;flex:none;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;-webkit-app-region:no-drag}
.dsh-chatgpt-tool:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-chatgpt-tool:disabled{opacity:.4;cursor:default}
.dsh-chatgpt-tool:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:-1px}
.dsh-chatgpt-pill{display:flex;flex:1;align-items:center;gap:6px;min-width:0;height:28px;padding:0 10px;overflow:hidden;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);-webkit-app-region:no-drag}
.dsh-chatgpt-pillText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-chatgpt-notice{display:flex;flex:none;align-items:flex-start;gap:8px;padding:8px 10px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);line-height:1.45}
.dsh-chatgpt-noticeText{flex:1;min-width:0}
.dsh-chatgpt-noticeAction{flex:none;align-self:center;padding:2px 8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);cursor:pointer}
.dsh-chatgpt-noticeAction:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-chatgpt-stage{position:relative;display:flex;flex:1;min-width:0;min-height:0}
.dsh-chatgpt-host{position:relative;display:flex;flex:1;min-width:0;min-height:0}
.dsh-chatgpt-view{display:flex;flex:1;width:100%;height:100%;min-width:0;min-height:0;border:0;background:var(--dsw-alias-bg-base);-webkit-app-region:no-drag}
.dsh-chatgpt-overlay{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;padding:24px;background:color-mix(in srgb, var(--dsw-alias-bg-base) 82%, transparent)}
.dsh-chatgpt-card{box-sizing:border-box;display:flex;flex-direction:column;gap:8px;width:min(420px,100%);padding:18px 20px;border:.5px solid var(--dsw-alias-border-l2);border-radius:calc(var(--dsw-radius-sm) * 2);background:var(--dsw-alias-bg-overlay)}
.dsh-chatgpt-cardTitle{margin:0;font:var(--dsw-font-xs-13);font-weight:600;color:var(--dsw-alias-label-primary)}
.dsh-chatgpt-cardDetail{margin:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dsh-chatgpt-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.dsh-chatgpt-action{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);cursor:pointer}
.dsh-chatgpt-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-chatgpt-action.primary{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dsh-chatgpt-spin{animation:dsh-chatgpt-rotate .9s linear infinite}
@keyframes dsh-chatgpt-rotate{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.dsh-chatgpt-spin{animation:none}}
`;

    /** Open a URL through the shell's external-link handling. */
    function openExternal(url) {
      try {
        window.open(url, '_blank', 'noopener');
      } catch (error) {
        // The shell may block popups; the address remains visible in the toolbar.
      }
    }

    /** Read a displayable message from an Electron or arbitrary error. */
    function describe(error) {
      if (error && typeof error === 'object' && typeof error.message === 'string' && error.message !== '') {
        return error.message;
      }
      return typeof error === 'string' ? error : '';
    }

    /**
     * Main-panel seat. It owns no browser; it measures the center column and
     * publishes that box to the persistent surface in `shell.overlay`.
     */
    function PanelAnchor() {
      const ref = React.useRef(null);
      React.useLayoutEffect(() => {
        const element = ref.current;
        if (element === null) return undefined;
        let frame = null;
        const measure = () => {
          frame = null;
          const box = element.getBoundingClientRect();
          publishSurfaceRect({ left: box.left, top: box.top, width: box.width, height: box.height });
        };
        const schedule = () => {
          if (frame !== null) return;
          frame = requestAnimationFrame(measure);
        };
        measure();
        const observer = new ResizeObserver(schedule);
        observer.observe(element);
        window.addEventListener('resize', schedule);
        return () => {
          observer.disconnect();
          window.removeEventListener('resize', schedule);
          if (frame !== null) cancelAnimationFrame(frame);
          publishSurfaceRect(null);
        };
      }, []);
      return h('div', { ref, className: 'dsh-chatgpt-anchor', 'aria-hidden': 'true' });
    }

    /** Native Electron guest browser, kept alive in the shell overlay layer. */
    function NativeSurface({ t }) {
      const rect = useSurfaceRect();
      const lastRectRef = React.useRef(null);
      if (rect !== null) lastRectRef.current = rect;
      const [activated, setActivated] = React.useState(rect !== null);
      React.useLayoutEffect(() => {
        if (rect !== null && !activated) setActivated(true);
      }, [rect, activated]);

      const hostRef = React.useRef(null);
      const viewRef = React.useRef(null);
      const [generation, setGeneration] = React.useState(0);
      const [state, setState] = React.useState({
        phase: 'loading',
        loading: true,
        message: '',
        canBack: false,
        canForward: false,
      });

      React.useEffect(() => {
        if (!activated) return undefined;
        const host = hostRef.current;
        if (host === null) return undefined;

        const controller = new AbortController();
        const { signal } = controller;
        let view = null;
        let lease = null;
        let released = false;
        let failed = false;
        let started = false;
        let unsubscribeOpen = null;

        const set = (patch) => {
          if (signal.aborted) return;
          setState((current) => ({ ...current, ...patch }));
        };

        const release = (id) => {
          if (id === null || released) return;
          released = true;
          Promise.resolve()
            .then(() => desktopBrowser.release(id))
            .catch(() => {});
        };

        const attach = async () => {
          try {
            const reservation = await desktopBrowser.acquire('panel:chatgpt');
            lease = reservation.lease;
            if (signal.aborted) {
              release(lease);
              return;
            }

            const element = document.createElement('webview');
            view = element;
            element.setAttribute('name', lease);
            element.setAttribute('partition', reservation.partition);
            element.setAttribute('allowpopups', '');
            element.setAttribute('src', 'about:blank#' + lease);
            element.setAttribute('data-sidebar-browser-frame', 'webview');
            element.setAttribute('aria-label', 'ChatGPT');
            element.className = 'dsh-chatgpt-view';
            viewRef.current = element;

            unsubscribeOpen = desktopBrowser.onOpenRequested(lease, (url) => {
              if (signal.aborted) return;
              openExternal(url);
            });
            signal.addEventListener('abort', () => {
              if (unsubscribeOpen !== null) {
                try {
                  unsubscribeOpen();
                } catch (error) {
                  // The bridge may already be gone during shutdown.
                }
                unsubscribeOpen = null;
              }
            }, { once: true });

            element.addEventListener('dom-ready', () => {
              if (signal.aborted) return;
              failed = false;
              started = true;
              set({ phase: 'loading', loading: true, message: '' });
              let navigation;
              try {
                navigation = element.loadURL(CHATGPT_URL);
              } catch (error) {
                failed = true;
                set({ phase: 'error', loading: false, message: describe(error) });
                return;
              }
              if (navigation && typeof navigation.catch === 'function') {
                navigation.catch((error) => {
                  if (signal.aborted || (error && error.code === 'ERR_ABORTED')) return;
                  failed = true;
                  set({ phase: 'error', loading: false, message: describe(error) });
                });
              }
            }, { once: true });

            element.addEventListener('did-start-loading', () => {
              if (failed) return;
              set({ loading: true });
            }, { signal });

            element.addEventListener('did-stop-loading', () => {
              // The bootstrap about:blank document finishes before loadURL starts
              // the requested page; it must not publish a ready panel.
              if (!started) return;
              let canBack = false;
              let canForward = false;
              try {
                canBack = element.canGoBack();
                canForward = element.canGoForward();
              } catch (error) {
                // A replaced guest cannot answer history queries.
              }
              if (failed) {
                set({ loading: false, canBack, canForward });
                return;
              }
              set({ phase: 'ready', loading: false, canBack, canForward });
            }, { signal });

            const syncHistory = () => {
              let canBack = false;
              let canForward = false;
              try {
                canBack = element.canGoBack();
                canForward = element.canGoForward();
              } catch (error) {
                // A replaced guest cannot answer history queries.
              }
              set({ canBack, canForward });
            };
            element.addEventListener('did-navigate', syncHistory, { signal });
            element.addEventListener('did-navigate-in-page', (event) => {
              if (event.isMainFrame === true) syncHistory();
            }, { signal });

            element.addEventListener('did-fail-load', (event) => {
              if (event.isMainFrame !== true || event.errorCode === -3) return;
              failed = true;
              set({ phase: 'error', loading: false, message: event.errorDescription || '' });
            }, { signal });

            const lost = () => {
              failed = true;
              set({ phase: 'error', loading: false, message: '' });
            };
            element.addEventListener('render-process-gone', lost, { signal });
            element.addEventListener('destroyed', lost, { signal });

            host.appendChild(element);
            set({ phase: 'loading', loading: true, message: '', canBack: false, canForward: false });
          } catch (error) {
            if (signal.aborted) return;
            set({ phase: 'error', loading: false, message: describe(error) });
          }
        };

        attach();

        return () => {
          controller.abort();
          if (unsubscribeOpen !== null) {
            try {
              unsubscribeOpen();
            } catch (error) {
              // The bridge may already be gone during shutdown.
            }
            unsubscribeOpen = null;
          }
          const element = view;
          view = null;
          viewRef.current = null;
          if (element !== null) {
            try {
              element.remove();
            } catch (error) {
              // Removing an already destroyed guest is safe.
            }
          }
          release(lease);
        };
      }, [activated, generation]);

      // Leaving the panel hides the guest; it must not keep keyboard focus for
      // the panel the user switched to.
      React.useEffect(() => {
        if (rect !== null) return;
        const view = viewRef.current;
        if (view !== null && typeof view.blur === 'function') {
          try {
            view.blur();
          } catch (error) {
            // A destroyed guest has no focus to release.
          }
        }
      }, [rect]);

      const reload = () => {
        const view = viewRef.current;
        if (view === null || state.phase !== 'ready') {
          setGeneration((value) => value + 1);
          return;
        }
        try {
          view.reload();
          setState((current) => ({ ...current, loading: true }));
        } catch (error) {
          setGeneration((value) => value + 1);
        }
      };

      const goBack = () => {
        const view = viewRef.current;
        if (view === null) return;
        try {
          if (view.canGoBack()) view.goBack();
        } catch (error) {
          // Ignore history failures on a replaced guest.
        }
      };

      const goForward = () => {
        const view = viewRef.current;
        if (view === null) return;
        try {
          if (view.canGoForward()) view.goForward();
        } catch (error) {
          // Ignore history failures on a replaced guest.
        }
      };

      if (!activated) return null;
      const bounds = rect ?? lastRectRef.current;
      if (bounds === null) return null;
      const surfaceStyle = {
        position: 'fixed',
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        visibility: rect === null ? 'hidden' : 'visible',
        pointerEvents: rect === null ? 'none' : 'auto',
      };

      return h(
        'div',
        {
          className: 'dsh-chatgpt-root dsh-chatgpt-surface',
          style: surfaceStyle,
          role: 'region',
          'aria-label': t('panel'),
          'aria-hidden': rect === null ? 'true' : undefined,
        },
        h('style', null, CSS),
        h(Toolbar, {
          t,
          loading: state.loading,
          canBack: state.canBack,
          canForward: state.canForward,
          onBack: goBack,
          onForward: goForward,
          onReload: reload,
          onExternal: () => openExternal(CHATGPT_URL),
        }),
        h(
          'div',
          { className: 'dsh-chatgpt-stage' },
          h('div', { className: 'dsh-chatgpt-host', ref: hostRef }),
          state.phase === 'error'
            ? h(
                'div',
                { className: 'dsh-chatgpt-overlay' },
                h(
                  'div',
                  { className: 'dsh-chatgpt-card', role: 'alert' },
                  h('p', { className: 'dsh-chatgpt-cardTitle' }, t('error')),
                  state.message !== ''
                    ? h('p', { className: 'dsh-chatgpt-cardDetail' }, state.message)
                    : null,
                  h(
                    'div',
                    { className: 'dsh-chatgpt-actions' },
                    h(
                      'button',
                      { type: 'button', className: 'dsh-chatgpt-action primary', onClick: reload },
                      t('reload'),
                    ),
                    h(
                      'button',
                      { type: 'button', className: 'dsh-chatgpt-action', onClick: () => openExternal(CHATGPT_URL) },
                      t('openExternal'),
                    ),
                  ),
                ),
              )
            : null,
        ),
      );
    }

    /** Plain-browser fallback: iframe plus an explanation of the framing restriction. */
    function WebChatGptPage({ t }) {
      const [reloadKey, setReloadKey] = React.useState(0);
      const [loading, setLoading] = React.useState(true);

      const reload = () => {
        setLoading(true);
        setReloadKey((value) => value + 1);
      };

      return h(
        'div',
        { className: 'dsh-chatgpt-root', role: 'region', 'aria-label': t('panel') },
        h('style', null, CSS),
        h(Toolbar, {
          t,
          loading,
          canBack: false,
          canForward: false,
          onBack: () => {},
          onForward: () => {},
          onReload: reload,
          onExternal: () => openExternal(CHATGPT_URL),
        }),
        h(
          'div',
          { className: 'dsh-chatgpt-notice' },
          h('span', { className: 'dsh-chatgpt-noticeText' }, t('web.notice')),
          h(
            'button',
            { type: 'button', className: 'dsh-chatgpt-noticeAction', onClick: () => openExternal(CHATGPT_URL) },
            t('web.open'),
          ),
        ),
        h(
          'div',
          { className: 'dsh-chatgpt-stage' },
          h('iframe', {
            key: reloadKey,
            className: 'dsh-chatgpt-view',
            src: CHATGPT_URL,
            title: t('panel'),
            referrerPolicy: 'no-referrer',
            allow: 'clipboard-read; clipboard-write; microphone; camera; display-capture',
            'aria-busy': loading,
            onLoad: () => setLoading(false),
          }),
        ),
      );
    }

    /** Panel body; the desktop shell measures a seat while a persistent surface renders it. */
    function ChatGptPage(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;
      return desktopBrowser === undefined ? h(WebChatGptPage, { t }) : h(PanelAnchor, null);
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'chatgpt-panel: dictionaries');
        const t = ctx.locale.bind(NS);

        // The sidebar icon and the main panel share one id, so selecting the icon
        // dispatches the panel whose key is PANEL_ID.
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 20,
              label: () => t('panel'),
              locale: NS,
            },
            PanelIcon,
          ),
        );

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
            },
            ChatGptPage,
          ),
        );

        // The guest lives in the root overlay, not in the keyed main panel, so
        // changing the selected panel only hides it. The main-panel anchor above
        // publishes where the surface should be drawn.
        if (desktopBrowser !== undefined) {
          ctx.slots.inject('shell.overlay', () =>
            ctx.slots.register(
              {
                name: 'shell.overlay',
                id: 'chatgpt-surface',
                order: -99,
                locale: NS,
              },
              NativeSurface,
            ),
          );
        }
      },
    };
  },
});
