(function () {
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

  var key = script.getAttribute('data-key') || script.getAttribute('data-script-key') || '';
  var droidId = script.getAttribute('data-droid-id') || '202';
  var baseUrl = script.getAttribute('data-base-url') || (function () {
    try {
      return new URL(script.src).origin;
    } catch (e) {
      return '';
    }
  })();

  if (!baseUrl) return;

  var host = document.createElement('div');
  host.id = 'dealdroid-chat-widget-host';
  host.style.position = 'fixed';
  host.style.right = '24px';
  host.style.bottom = '24px';
  host.style.zIndex = '2147483647';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open chat');
  btn.style.width = '56px';
  btn.style.height = '56px';
  btn.style.borderRadius = '9999px';
  btn.style.border = '0';
  btn.style.cursor = 'pointer';
  btn.style.background = 'linear-gradient(135deg, #111827, #000000)';
  btn.style.color = 'white';
  btn.style.boxShadow = '0 12px 30px rgba(17,24,39,0.35)';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.11 0-2.18-.21-3.17-.6L3 21l1.1-6.33c-.39-.99-.6-2.06-.6-3.17A8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" stroke="white" stroke-width="1.7" stroke-linejoin="round"/></svg>';

  var panel = document.createElement('div');
  panel.style.width = '380px';
  panel.style.height = '600px';
  panel.style.marginBottom = '12px';
  panel.style.borderRadius = '16px';
  panel.style.overflow = 'hidden';
  panel.style.boxShadow = '0 18px 60px rgba(17,24,39,0.25)';
  panel.style.border = '1px solid rgba(229,231,235,1)';
  panel.style.background = 'white';
  panel.style.display = 'none';

  var iframe = document.createElement('iframe');
  iframe.title = 'DJI 13 STORE Chat';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.allow = 'clipboard-write';

  var url = baseUrl + '/embed/' + encodeURIComponent(key || 'default') + '?droidId=' + encodeURIComponent(droidId);
  iframe.src = url;

  panel.appendChild(iframe);

  var isOpen = false;
  btn.addEventListener('click', function () {
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'block' : 'none';
    btn.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
  });

  host.appendChild(panel);
  host.appendChild(btn);
  document.body.appendChild(host);
})();
