/* =====================================================================
   Voice: read text aloud (text-to-speech) and listen to the mic
   (speech-to-text), using the phone's own voice in the chosen language.
   ===================================================================== */

const Voice = (() => {
  const LOCALE = { hi: 'hi-IN', en: 'en-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN' };
  const synth = window.speechSynthesis || null;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let voices = [];
  let currentBtn = null;      // the Listen button that is playing now
  let speaking = false;
  let rec = null;             // the mic that is listening now
  let onSpeakChange = () => {};

  function loadVoices() { if (synth) voices = synth.getVoices() || []; }
  if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
    else synth.onvoiceschanged = loadVoices;
  }

  const norm = l => String(l || '').replace('_', '-').toLowerCase();

  /* Best voice for a language: Indian accent first, phone's own voice first */
  function voiceFor(lang) {
    if (!voices.length) loadVoices();
    const list = voices.filter(v => norm(v.lang).startsWith(lang));
    const indian = list.filter(v => norm(v.lang).endsWith('-in'));
    return indian.find(v => v.localService) || indian[0] || list.find(v => v.localService) || list[0] || null;
  }

  /* true = has a voice, false = no voice, null = phone has not told us yet */
  function hasVoice(lang) {
    if (!synth) return false;
    loadVoices();
    if (!voices.length) return null;
    return !!voiceFor(lang);
  }

  function setState(on, btn) {
    if (currentBtn && currentBtn !== btn) currentBtn.setAttribute('aria-pressed', 'false');
    currentBtn = on ? (btn || null) : null;
    if (currentBtn) currentBtn.setAttribute('aria-pressed', 'true');
    speaking = on;
    onSpeakChange(on);
  }

  function stop() {
    if (synth) synth.cancel();
    setState(false, null);
  }

  /* Speak text. Pressing the same button again stops it. */
  function speak(text, lang, btn) {
    if (!synth) return false;
    if (btn && currentBtn === btn && speaking) { stop(); return true; }
    synth.cancel();
    // Long text is split into sentences, because some phones stop after ~15 seconds.
    const parts = String(text).split(/(?<=[।.?!:])\s+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return true;
    const v = voiceFor(lang);
    setState(true, btn);
    const myBtn = btn || null;
    setTimeout(() => {
      if (currentBtn !== myBtn) return;   // something else started meanwhile
      if (synth.paused) synth.resume();
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        if (v) { u.voice = v; u.lang = norm(v.lang).replace(/-(\w+)$/, (m, r) => '-' + r.toUpperCase()); }
        else u.lang = LOCALE[lang] || 'en-IN';
        u.rate = 0.95;
        if (i === parts.length - 1) {
          u.onend = () => { if (currentBtn === myBtn) setState(false, null); };
        }
        u.onerror = () => { if (i === parts.length - 1 && currentBtn === myBtn) setState(false, null); };
        synth.speak(u);
      });
    }, 60);
    return true;
  }

  /* Listen to the mic once. onText gets what was said. */
  function listen(lang, onText, onError, onActive) {
    if (!Recognition) { onError('none'); return false; }
    stopListening();
    try {
      rec = new Recognition();
      rec.lang = LOCALE[lang] || 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      const me = rec;
      rec.onresult = e => { const said = e.results[0][0].transcript || ''; onText(digitsToEnglish(said.trim())); };
      rec.onerror = e => { if (e.error !== 'aborted' && e.error !== 'no-speech') onError(e.error); };
      rec.onend = () => { if (rec === me) rec = null; onActive(false); };
      rec.start();
      onActive(true);
      return true;
    } catch (e) {
      rec = null; onActive(false); onError('start');
      return false;
    }
  }
  function stopListening() { try { if (rec) rec.stop(); } catch (e) {} rec = null; }

  /* Hindi/Marathi, Telugu and Tamil digits → 0-9 (so phone numbers work) */
  function digitsToEnglish(s) {
    return String(s)
      .replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x0966))
      .replace(/[౦-౯]/g, d => String(d.charCodeAt(0) - 0x0C66))
      .replace(/[௦-௯]/g, d => String(d.charCodeAt(0) - 0x0BE6));
  }

  return {
    speak, stop, listen, stopListening, hasVoice, digitsToEnglish,
    canSpeak: !!synth, canListen: !!Recognition,
    isSpeaking: () => speaking,
    onChange(fn) { onSpeakChange = fn; }
  };
})();
