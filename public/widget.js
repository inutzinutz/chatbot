/**
 * DroidMind Chat Widget v2
 *
 * Floating bubble mode:
 *   <script src="https://YOUR_DOMAIN/widget.js"
 *           data-key="dji13store"
 *           data-delay="4000"
 *           data-position="bottom-right">
 *   </script>
 *
 * Inline embed mode:
 *   <div id="droidmind-inline" style="height:600px;"></div>
 *   <script src="https://YOUR_DOMAIN/widget.js"
 *           data-key="dji13store"
 *           data-mode="inline"
 *           data-target="droidmind-inline">
 *   </script>
 */
(function () {
  // ── Find own <script> tag ──────────────────────────────────────────
  function getScript() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (!s || !s.src) continue;
      if (s.src.indexOf('widget.js') !== -1) return s;
    }
    return null;
  }

  var script = getScript();
  if (!script) return;

  // ── Read attributes ────────────────────────────────────────────────
  var key      = script.getAttribute('data-key') || script.getAttribute('data-script-key') || 'dji13store';
  var droidId  = script.getAttribute('data-droid-id') || '202';
  var delay    = parseInt(script.getAttribute('data-delay') || '4000', 10);
  var position = script.getAttribute('data-position') || 'bottom-right'; // 'bottom-right' | 'bottom-left'
  var mode     = script.getAttribute('data-mode') || 'bubble';           // 'bubble' | 'inline'
  var target   = script.getAttribute('data-target') || '';               // element id for inline mode
  var baseUrl  = script.getAttribute('data-base-url') || (function () {
    try { return new URL(script.src).origin; } catch (e) { return ''; }
  })();

  if (!baseUrl) return;

  // ── Key → branding config ──────────────────────────────────────────
  var KEY_CONFIG = {
    'dji13store':          { color: '#3b82f6', shadow: 'rgba(59,130,246,0.35)',  title: 'DJI 13 STORE' },
    'script_4x9xsyeyuk8': { color: '#3b82f6', shadow: 'rgba(59,130,246,0.35)',  title: 'DJI 13 STORE' },
    'script_demo':         { color: '#3b82f6', shadow: 'rgba(59,130,246,0.35)',  title: 'DJI 13 STORE' },
    'script_test':         { color: '#3b82f6', shadow: 'rgba(59,130,246,0.35)',  title: 'DJI 13 STORE' },
    'evlifethailand':      { color: '#f97316', shadow: 'rgba(249,115,22,0.35)',  title: 'EV Life Thailand' },
    'evlife_demo':         { color: '#f97316', shadow: 'rgba(249,115,22,0.35)',  title: 'EV Life Thailand' },
    'script_dji13support': { color: '#ef4444', shadow: 'rgba(239,68,68,0.35)',   title: 'DJI 13 Service Plus' },
    'dji13support_demo':   { color: '#ef4444', shadow: 'rgba(239,68,68,0.35)',   title: 'DJI 13 Service Plus' },
  };
  var cfg = KEY_CONFIG[key] || { color: '#4f46e5', shadow: 'rgba(99,102,241,0.35)', title: 'Chat' };

  // ── Build iframe URL ───────────────────────────────────────────────
  var iframeSrc = baseUrl + '/embed/' + encodeURIComponent(key) + '?droidId=' + encodeURIComponent(droidId);

  // ══════════════════════════════════════════════════════════════════
  //  INLINE MODE — render inside a target container element
  // ══════════════════════════════════════════════════════════════════
  if (mode === 'inline') {
    var container = target ? document.getElementById(target) : null;
    if (!container) {
      console.warn('[DroidMind] Inline mode: target element "' + target + '" not found.');
      return;
    }
    container.style.cssText += [
      'overflow:hidden',
      'border-radius:16px',
      'border:1px solid #e5e7eb',
      'box-shadow:0 4px 24px rgba(17,24,39,0.12)',
    ].join(';');

    var inlineIframe = document.createElement('iframe');
    inlineIframe.title = cfg.title + ' Chat';
    inlineIframe.src = iframeSrc;
    inlineIframe.allow = 'clipboard-write';
    inlineIframe.style.cssText = 'width:100%;height:100%;border:0;display:block;';
    container.appendChild(inlineIframe);
    return; // done — no bubble needed
  }

  // ══════════════════════════════════════════════════════════════════
  //  BUBBLE MODE — floating FAB + popup panel
  // ══════════════════════════════════════════════════════════════════

  // Prevent duplicate widgets
  if (document.getElementById('dealdroid-chat-widget-host')) return;

  var host = document.createElement('div');
  host.id = 'dealdroid-chat-widget-host';
  host.style.cssText = [
    'position:fixed',
    position === 'bottom-left' ? 'left:24px' : 'right:24px',
    'bottom:24px',
    'z-index:2147483647',
    'display:flex',
    'flex-direction:column',
    position === 'bottom-left' ? 'align-items:flex-start' : 'align-items:flex-end',
  ].join(';');

  // ── Chat panel (iframe container) ─────────────────────────────────
  var panel = document.createElement('div');
  panel.style.cssText = [
    'width:380px',
    'max-width:calc(100vw - 48px)',
    'height:600px',
    'max-height:calc(100dvh - 100px)',
    'margin-bottom:12px',
    'border-radius:16px',
    'overflow:hidden',
    'box-shadow:0 18px 60px rgba(17,24,39,0.25)',
    'border:1px solid rgba(229,231,235,1)',
    'background:white',
    'display:none',
    'transition:opacity 0.2s,transform 0.2s',
  ].join(';');

  var iframe = document.createElement('iframe');
  iframe.title = cfg.title + ' Chat';
  iframe.style.cssText = 'width:100%;height:100%;border:0;';
  iframe.allow = 'clipboard-write';
  // Lazy-load: set src only on first open to avoid unnecessary network request
  var iframeLoaded = false;

  panel.appendChild(iframe);

  // ── Unread badge ──────────────────────────────────────────────────
  var btnWrap = document.createElement('div');
  btnWrap.style.cssText = 'position:relative;display:inline-flex;';

  var badge = document.createElement('span');
  badge.style.cssText = [
    'position:absolute',
    'top:-4px',
    'right:-4px',
    'width:20px',
    'height:20px',
    'border-radius:9999px',
    'background:#ef4444',
    'color:white',
    'font-size:10px',
    'font-weight:700',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'box-shadow:0 2px 6px rgba(0,0,0,0.3)',
    'font-family:sans-serif',
    'line-height:1',
  ].join(';');
  badge.textContent = '1';

  // ── FAB button ────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open chat');
  btn.style.cssText = [
    'width:56px',
    'height:56px',
    'border-radius:9999px',
    'border:0',
    'cursor:pointer',
    'color:white',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'transition:transform 0.15s,box-shadow 0.15s',
    'outline:none',
  ].join(';');

  var CHAT_ICON  = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.11 0-2.18-.21-3.17-.6L3 21l1.1-6.33c-.39-.99-.6-2.06-.6-3.17A8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" stroke="white" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  var CLOSE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>';

  var isOpen = false;

  function setOpenState(open) {
    isOpen = open;
    panel.style.display = open ? 'block' : 'none';
    btn.innerHTML = open ? CLOSE_ICON : CHAT_ICON;
    btn.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    btn.style.background = open
      ? '#374151'
      : 'linear-gradient(135deg,' + cfg.color + 'dd,' + cfg.color + ')';
    btn.style.boxShadow = open
      ? '0 8px 25px rgba(55,65,81,0.3)'
      : '0 8px 25px ' + cfg.shadow;
    if (open) {
      badge.style.display = 'none';
      // Lazy load iframe
      if (!iframeLoaded) {
        iframe.src = iframeSrc;
        iframeLoaded = true;
      }
    }
  }

  setOpenState(false);

  btn.addEventListener('click', function () { setOpenState(!isOpen); });
  btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.1)'; });
  btn.addEventListener('mouseleave', function () { btn.style.transform = 'scale(1)'; });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) setOpenState(false);
  });

  btnWrap.appendChild(badge);
  btnWrap.appendChild(btn);
  host.appendChild(panel);
  host.appendChild(btnWrap);
  document.body.appendChild(host);

  // ── Auto-popup after delay (once per session) ─────────────────────
  if (delay > 0) {
    var storageKey = 'chatwidget_popped_' + key;
    try {
      if (!sessionStorage.getItem(storageKey)) {
        setTimeout(function () {
          if (!isOpen) {
            setOpenState(true);
            try { sessionStorage.setItem(storageKey, '1'); } catch (e) {}
          }
        }, delay);
      }
    } catch (e) { /* sessionStorage blocked */ }
  }

  // ── Unread dot after 30s if widget not opened ─────────────────────
  setTimeout(function () {
    if (!isOpen) {
      badge.style.display = 'flex';
    }
  }, 30000);

})();
