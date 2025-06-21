let cfg = {};
const fallbackVoices = [
  { name: 'alloy', short_name: 'alloy', locale: 'en-US', gender: 'male' },
  { name: 'echo', short_name: 'echo', locale: 'en-US', gender: 'male' },
  { name: 'fable', short_name: 'fable', locale: 'en-US', gender: 'female' },
  { name: 'onyx', short_name: 'onyx', locale: 'en-US', gender: 'male' },
  { name: 'nova', short_name: 'nova', locale: 'en-US', gender: 'female' },
  { name: 'shimmer', short_name: 'shimmer', locale: 'en-US', gender: 'female' }
];

async function fetchVoices(url, token) {
  try {
    const res = await fetch(`${url}/v1/audio/all_voices`, {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('invalid response');
    return data;
  } catch (e) {
    console.warn('Failed to fetch voices, using defaults:', e);
    return fallbackVoices;
  }
}

function populateLocales(voices, languageSelect) {
  const locales = [...new Set(voices.map(v => v.locale))];
  languageSelect.innerHTML = locales.map(l => `<option value="${l}">${l}</option>`).join('');
}

function populateVoices(voices, locale, voiceSelect) {
  const filtered = voices.filter(v => v.locale === locale);
  voiceSelect.innerHTML = filtered.map(v => `<option value="${v.name}">${v.short_name} (${v.gender})</option>`).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  applyOptionsI18n();
  const urlInput = document.getElementById('api-url');
  const tokenInput = document.getElementById('api-token');
  const languageSelect = document.getElementById('language-select');
  const voiceSelect = document.getElementById('voice-select');
  const saveBtn = document.getElementById('save-btn');
  const refreshBtn = document.getElementById('refresh-btn');

  let allVoices = [];

  async function loadConfig() {
    cfg = await chrome.storage.local.get({
      apiUrl: 'http://127.0.0.1:5050',
      apiToken: '',
      language: '',
      voice: ''
    });
    urlInput.value = cfg.apiUrl;
    tokenInput.value = cfg.apiToken;
    allVoices = await fetchVoices(cfg.apiUrl, cfg.apiToken);
    populateLocales(allVoices, languageSelect);
    if (!cfg.language && allVoices.length) {
      cfg.language = allVoices[0].locale;
    }
    languageSelect.value = cfg.language;
    populateVoices(allVoices, cfg.language, voiceSelect);
    if (!cfg.voice) {
      const def = allVoices.find(v => v.locale === cfg.language);
      if (def) cfg.voice = def.name;
    }
    voiceSelect.value = cfg.voice;
    chrome.storage.local.set(cfg);
  }

  languageSelect.addEventListener('change', async () => {
    populateVoices(allVoices, languageSelect.value, voiceSelect);
    const first = allVoices.find(v => v.locale === languageSelect.value);
    voiceSelect.value = first ? first.name : '';
    await chrome.storage.local.set({
      language: languageSelect.value,
      voice: voiceSelect.value
    });
    cfg.language = languageSelect.value;
    cfg.voice = voiceSelect.value;
  });

  refreshBtn.addEventListener('click', async () => {
    allVoices = await fetchVoices(urlInput.value, tokenInput.value);
    populateLocales(allVoices, languageSelect);
    populateVoices(allVoices, languageSelect.value, voiceSelect);
    const first = allVoices.find(v => v.locale === languageSelect.value);
    if (first) voiceSelect.value = first.name;
  });

  saveBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({
      apiUrl: urlInput.value,
      apiToken: tokenInput.value,
      language: languageSelect.value,
      voice: voiceSelect.value
    });
    cfg.apiUrl = urlInput.value;
    cfg.apiToken = tokenInput.value;
    cfg.language = languageSelect.value;
    cfg.voice = voiceSelect.value;
    const lang = getCurrentUILang();
    alert(lang === 'zh' ? '设置已保存' : 'Saved');
  });

  loadConfig();
});
