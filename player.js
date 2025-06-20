/**
 * Floating TTS player injected into the current page.
 * It streams audio via Media Source Extensions and provides
 * basic controls (play, pause, seek, volume, speed, close).
 */
(function () {
  if (window.TTSPlayerInitialized) return;
  window.TTSPlayerInitialized = true;

  const langUI = {
    en: {
      close: 'Close',
      speed: 'Speed',
      langSwitch: '中文'
    },
    zh: {
      close: '\u5173\u95ed',
      speed: '\u901f\u5ea6',
      langSwitch: 'English'
    }
  };

  let currentLang = navigator.language.startsWith('zh') ? 'zh' : 'en';

  function createFloatingPlayer() {
    if (document.getElementById('tts-floating-player')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'tts-floating-player';
    wrapper.style.cssText =
      'position:fixed;bottom:20px;right:20px;z-index:9999999;background:#fff;' +
      'padding:8px;width:320px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.15);font-family:sans-serif;';
    wrapper.innerHTML = `
      <div id="tts-header" style="cursor:move;display:flex;justify-content:space-between;align-items:center;">
        <button id="lang-switch" style="background:none;border:none;cursor:pointer;font-size:12px;">${langUI[currentLang].langSwitch}</button>
        <button id="tts-close" style="background:none;border:none;font-size:18px;cursor:pointer;">\u00d7</button>
      </div>
      <div style="display:flex;align-items:center;margin-top:4px;font-size:12px;">
        <span id="speed-label" style="margin-right:4px;">${langUI[currentLang].speed}</span>
        <input id="tts-speed" type="range" min="0.5" max="2" step="0.1" value="1" style="flex:1;margin-right:4px;">
        <span id="speed-val">1x</span>
      </div>
      <audio id="tts-audio" controls style="width:100%;margin-top:4px;border-radius:6px;"></audio>
      <div id="tts-duration" style="font-size:12px;text-align:right;margin-top:2px;"></div>`;
    document.body.appendChild(wrapper);

    const header = wrapper.querySelector('#tts-header');
    header.addEventListener('mousedown', startDrag);
    wrapper.querySelector('#tts-close').addEventListener('click', () => {
      const url = audio.src;
      wrapper.remove();
      window.TTSPlayerInitialized = false;
      try { URL.revokeObjectURL(url); } catch (e) {}
    });

    wrapper.querySelector('#lang-switch').addEventListener('click', () => {
      currentLang = currentLang === 'en' ? 'zh' : 'en';
      wrapper.querySelector('#lang-switch').textContent = langUI[currentLang].langSwitch;
      wrapper.querySelector('#speed-label').textContent = langUI[currentLang].speed;
    });

    const speedInput = wrapper.querySelector('#tts-speed');
    const speedVal = wrapper.querySelector('#speed-val');
    const audio = wrapper.querySelector('#tts-audio');
    const durationEl = wrapper.querySelector('#tts-duration');
    speedInput.addEventListener('input', () => {
      audio.playbackRate = speedInput.value;
      speedVal.textContent = speedInput.value + 'x';
    });
    audio.addEventListener('durationchange', () => {
      if (isFinite(audio.duration)) {
        const m = Math.floor(audio.duration / 60);
        const s = Math.floor(audio.duration % 60).toString().padStart(2, '0');
        durationEl.textContent = m + ':' + s;
      }
    });
  }

  let dragOffsetX = 0, dragOffsetY = 0;
  function startDrag(e) {
    e.preventDefault();
    const rect = this.parentElement.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  }
  function onDrag(e) {
    const wrapper = document.getElementById('tts-floating-player');
    if (!wrapper) return;
    wrapper.style.left = (e.clientX - dragOffsetX) + 'px';
    wrapper.style.top = (e.clientY - dragOffsetY) + 'px';
    wrapper.style.bottom = 'auto';
    wrapper.style.right = 'auto';
  }
  function stopDrag() {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  }

  window.createFloatingTTSPlayer = createFloatingPlayer;

  window.playTTS = async function(cfg, text) {
    createFloatingPlayer();
    const audio = document.getElementById('tts-audio');
    if (!text) return;
    const mediaSource = new MediaSource();
    audio.src = URL.createObjectURL(mediaSource);
    audio.playbackRate = document.getElementById('tts-speed').value;
    audio.play();

    const queue = [];
    let sourceBuffer = null;
    let mimeType = 'audio/mpeg';
    let streamEnded = false;

    function flushQueue() {
      if (!sourceBuffer || sourceBuffer.updating) return;
      if (queue.length) {
        const chunk = queue.shift();
        try {
          sourceBuffer.appendBuffer(chunk);
        } catch (err) {
          if (err.name === 'QuotaExceededError') {
            try {
              const cur = audio.currentTime;
              if (sourceBuffer.buffered.length && cur > 30) {
                sourceBuffer.remove(0, cur - 30);
              }
            } catch (_) {}
            queue.unshift(chunk);
          } else {
            console.error('appendBuffer failed', err);
            queue.unshift(chunk);
            streamEnded = true;
          }
        }
      }
      if (streamEnded && queue.length === 0 && !sourceBuffer.updating) {
        try { mediaSource.endOfStream(); } catch (_) {}
      }
    }

    mediaSource.addEventListener('sourceopen', () => {
      try {
        sourceBuffer = mediaSource.addSourceBuffer(mimeType);
        sourceBuffer.mode = 'sequence';
        sourceBuffer.addEventListener('updateend', () => {
          flushQueue();
        });
        flushQueue();
      } catch (e) {
        console.error('addSourceBuffer failed', e);
        audio.src = '';
      }
    });

    const port = chrome.runtime.connect({ name: 'tts-stream' });
    port.onMessage.addListener(msg => {
      if (msg.mime) {
        mimeType = msg.mime;
      } else if (msg.chunk) {
        queue.push(new Uint8Array(msg.chunk));
        flushQueue();
      } else if (msg.done) {
        streamEnded = true;
        flushQueue();
        port.disconnect();
      } else if (msg.error) {
        console.error('TTS stream error', msg.error);
        alert('TTS error: ' + msg.error);
        streamEnded = true;
        flushQueue();
        port.disconnect();
      }
    });

    port.postMessage({ cfg, text });
  };
})();
