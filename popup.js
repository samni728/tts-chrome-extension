let config = {};
let allVoices = [];
const fallbackVoices = [
    { name: 'alloy', short_name: 'alloy', locale: 'en-US', gender: 'male' },
    { name: 'echo', short_name: 'echo', locale: 'en-US', gender: 'male' },
    { name: 'fable', short_name: 'fable', locale: 'en-US', gender: 'female' },
    { name: 'onyx', short_name: 'onyx', locale: 'en-US', gender: 'male' },
    { name: 'nova', short_name: 'nova', locale: 'en-US', gender: 'female' },
    { name: 'shimmer', short_name: 'shimmer', locale: 'en-US', gender: 'female' }
];

const serverInput = document.getElementById('server-url');
const apiKeyInput = document.getElementById('api-key');
const langSelect = document.getElementById('language-select');
const voiceSelect = document.getElementById('voice-select');

async function init() {
    applyPopupI18n();
    config = await chrome.storage.local.get({
        apiUrl: 'http://127.0.0.1:5050',
        apiToken: '',
        language: '',
        voice: ''
    });
    serverInput.value = config.apiUrl;
    apiKeyInput.value = config.apiToken;
    await fetchVoices();
    if (!config.language && allVoices.length) {
        config.language = allVoices[0].locale;
    }
    langSelect.value = config.language;
    updateVoiceOptions(config.language);
    if (!config.voice) {
        const def = allVoices.find(v => v.locale === config.language);
        if (def) config.voice = def.name;
    }
    voiceSelect.value = config.voice;
    chrome.storage.local.set(config);
}

async function fetchVoices() {
    const url = serverInput.value.replace(/\/$/, '');
    try {
        const res = await fetch(`${url}/v1/audio/all_voices`, {
            headers: apiKeyInput.value ? { 'Authorization': 'Bearer ' + apiKeyInput.value } : {}
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('invalid response');
        allVoices = data;
    } catch (e) {
        console.warn('Failed to fetch voices, using defaults:', e);
        allVoices = fallbackVoices;
    }
    const locales = [...new Set(allVoices.map(v => v.locale))];
    langSelect.innerHTML = locales.map(l => `<option value="${l}">${l}</option>`).join('');
}

function updateVoiceOptions(locale) {
    const voices = allVoices.filter(v => v.locale === locale);
    voiceSelect.innerHTML = voices.map(v => `<option value="${v.name}">${v.short_name} (${v.gender})</option>`).join('');
}

serverInput.addEventListener('change', async () => {
    await chrome.storage.local.set({ apiUrl: serverInput.value });
    config.apiUrl = serverInput.value;
    await fetchVoices();
    if (!config.language && allVoices.length) {
        config.language = allVoices[0].locale;
    }
    langSelect.value = config.language;
    updateVoiceOptions(config.language);
    const def = allVoices.find(v => v.locale === config.language);
    if (!config.voice && def) config.voice = def.name;
    voiceSelect.value = config.voice;
    chrome.storage.local.set(config);
});

apiKeyInput.addEventListener('change', async () => {
    await chrome.storage.local.set({ apiToken: apiKeyInput.value });
    config.apiToken = apiKeyInput.value;
    await fetchVoices();
    if (!config.language && allVoices.length) {
        config.language = allVoices[0].locale;
    }
    langSelect.value = config.language;
    updateVoiceOptions(config.language);
    const def = allVoices.find(v => v.locale === config.language);
    if (!config.voice && def) config.voice = def.name;
    voiceSelect.value = config.voice;
    chrome.storage.local.set(config);
});

langSelect.addEventListener('change', async () => {
    updateVoiceOptions(langSelect.value);
    const first = allVoices.find(v => v.locale === langSelect.value);
    voiceSelect.value = first ? first.name : '';
    await chrome.storage.local.set({
        language: langSelect.value,
        voice: voiceSelect.value
    });
    config.language = langSelect.value;
    config.voice = voiceSelect.value;
});

voiceSelect.addEventListener('change', async () => {
    await chrome.storage.local.set({ voice: voiceSelect.value });
    config.voice = voiceSelect.value;
});

async function capture(tabId, func) {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func });
    return result;
}

async function speakText(text) {
    if (!text) return;
    if (!config.voice && allVoices.length) {
        config.voice = allVoices.find(v => v.locale === config.language)?.name || allVoices[0].name;
        chrome.storage.local.set({ voice: config.voice });
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['player.js'],
        world: 'ISOLATED'
    });
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cfg, t) => window.playTTS(cfg, t),
        args: [config, text],
        world: 'ISOLATED'
    });
}

document.getElementById('read-selection').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const text = await capture(tab.id, () => window.getSelection().toString());
    speakText(text);
});

document.getElementById('read-page').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const text = await capture(tab.id, () => document.body.innerText);
    speakText(text);
});

chrome.storage.local.get('pendingText').then(data => {
    if (data.pendingText) {
        speakText(data.pendingText);
        chrome.storage.local.remove('pendingText');
    }
});

init();
