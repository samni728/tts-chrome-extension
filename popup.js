let config = {};
let allVoices = [];

const serverInput = document.getElementById('server-url');
const apiKeyInput = document.getElementById('api-key');
const langSelect = document.getElementById('language-select');
const voiceSelect = document.getElementById('voice-select');
const textInput = document.getElementById('tts-text');
const playBtn = document.getElementById('play-text');
const uiSwitch = document.getElementById('ui-lang-switch');
let currentUILang = getCurrentUILang();

uiSwitch.addEventListener('click', () => {
    currentUILang = currentUILang === 'en' ? 'zh' : 'en';
    applyPopupI18n(currentUILang);
});

async function init() {
    applyPopupI18n(currentUILang);
    config = await chrome.storage.local.get({
        apiUrl: 'http://127.0.0.1:5050',
        apiToken: '',
        language: '',
        voice: ''
    });
    serverInput.value = config.apiUrl;
    apiKeyInput.value = config.apiToken;
    await fetchVoices();
    if (config.language) {
        langSelect.value = config.language;
        updateVoiceOptions(config.language);
        if (config.voice) voiceSelect.value = config.voice;
    }
}

async function fetchVoices() {
    const url = serverInput.value.replace(/\/$/, '');
    try {
        const res = await chrome.runtime.sendMessage({
            type: 'fetchVoices',
            url,
            token: apiKeyInput.value
        });
        if (res.error || !Array.isArray(res.voices)) {
            throw new Error(res.error || 'invalid');
        }
        allVoices = res.voices;
        const locales = [...new Set(allVoices.map(v => v.locale))];
        langSelect.innerHTML = locales.map(l => `<option value="${l}">${l}</option>`).join('');
    } catch (e) {
        console.error('Failed to fetch voices', e);
        langSelect.innerHTML = '';
        voiceSelect.innerHTML = '';
        alert(currentUILang === 'zh' ? '语音服务配置错误或无法连接' : 'Voice service misconfigured or unreachable');
    }
}

function updateVoiceOptions(locale) {
    const voices = allVoices.filter(v => v.locale === locale);
    voiceSelect.innerHTML = voices.map(v => `<option value="${v.name}">${v.short_name} (${v.gender})</option>`).join('');
}

serverInput.addEventListener('change', async () => {
    await chrome.storage.local.set({ apiUrl: serverInput.value });
    config.apiUrl = serverInput.value;
    fetchVoices();
});

apiKeyInput.addEventListener('change', async () => {
    await chrome.storage.local.set({ apiToken: apiKeyInput.value });
    config.apiToken = apiKeyInput.value;
    fetchVoices();
});

langSelect.addEventListener('change', async () => {
    updateVoiceOptions(langSelect.value);
    await chrome.storage.local.set({ language: langSelect.value });
    config.language = langSelect.value;
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
    if (!config.apiUrl || !config.voice) {
        chrome.action.openPopup();
        await chrome.storage.local.set({ pendingText: text });
        return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['player.js'] });
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cfg, t) => window.playTTS(cfg, t),
        args: [config, text]
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

if (playBtn) {
    playBtn.addEventListener('click', () => {
        speakText(textInput.value);
    });
}

chrome.storage.local.get('pendingText').then(data => {
    if (data.pendingText) {
        speakText(data.pendingText);
        chrome.storage.local.remove('pendingText');
    }
});

init();
