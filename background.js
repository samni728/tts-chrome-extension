chrome.runtime.onInstalled.addListener(() => {
  const lang = chrome.i18n.getUILanguage().startsWith('zh') ? 'zh' : 'en';
  const titleSel = lang === 'zh' ? '朗读选中文本' : 'Read Selected Text';
  const titlePage = lang === 'zh' ? '朗读整页内容' : 'Read Entire Page';
  chrome.contextMenus.create({
    id: 'read-selection',
    title: titleSel,
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'read-page',
    title: titlePage,
    contexts: ['page']
  });
});

async function capture(tabId, func) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func });
  return result;
}

async function playOrPrompt(tabId, text) {
  const cfg = await chrome.storage.local.get({
    apiUrl: '',
    apiToken: '',
    language: '',
    voice: ''
  });
  if (!cfg.apiUrl || !cfg.voice) {
    chrome.storage.local.set({ pendingText: text || '' }, () => chrome.runtime.openOptionsPage());
    return;
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ['player.js'] });
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (c, t) => window.playTTS(c, t),
    args: [cfg, text]
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'read-selection') {
    const text = await capture(tab.id, () => window.getSelection().toString());
    playOrPrompt(tab.id, text);
  } else if (info.menuItemId === 'read-page') {
    const text = await capture(tab.id, () => document.body.innerText);
    playOrPrompt(tab.id, text);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg.type === 'fetchVoices') {
    (async () => {
      try {
        const res = await fetch(`${msg.url}/v1/audio/all_voices`, {
          headers: msg.token ? { Authorization: 'Bearer ' + msg.token } : {}
        });
        if (!res.headers.get('content-type')?.includes('application/json'))
          throw new Error('Voice API returned non-JSON');
        const voices = await res.json();
        send({ voices });
      } catch (e) {
        send({ error: e.message });
      }
    })();
    return true;
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'tts-stream') return;
  port.onMessage.addListener(async msg => {
    const { cfg, text } = msg;
    try {
      const url = cfg.apiUrl.replace(/\/$/, '') + '/v1/audio/speech';
      const headers = { 'Content-Type': 'application/json' };
      if (cfg.apiToken) headers['Authorization'] = 'Bearer ' + cfg.apiToken;
      const body = JSON.stringify({ model: 'tts-1', input: text, voice: cfg.voice, stream: true });
      const res = await fetch(url, { method: 'POST', headers, body });
      const ctype = res.headers.get('content-type') || '';
      if (!res.ok || !ctype.includes('audio')) {
        const errText = await res.text();
        throw new Error(errText || 'Invalid response');
      }
      port.postMessage({ mime: ctype.split(';')[0] });
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        port.postMessage({ chunk: value.buffer }, [value.buffer]);
      }
      port.postMessage({ done: true });
    } catch (e) {
      port.postMessage({ error: e.message });
    }
  });
});
