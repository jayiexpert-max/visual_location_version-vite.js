/**
 * SpeechSynthesis voice picker — TV / 3D kiosk TTS.
 * Thai: prefer local Microsoft Pattara. English: prefer local Microsoft (Zira/David) — not cloud Google (offline LAN).
 */
(function (global) {
    /** Default speech rate — Thai slightly faster than before (was 0.35). English unchanged. */
    const THAI_SPEECH_RATE = 0.42;
    const EN_SPEECH_RATE = 0.65;

    const THAI_FEMALE_HINTS = [
        'pattara', 'narisa', 'kanya', 'female', 'woman', 'หญิง', 'ผู้หญิง'
    ];
    const THAI_MALE_HINTS = ['athiti', 'male', 'man', 'ชาย', 'ผู้ชาย', 'hemlata'];
    const ENGLISH_PREFERRED = [
        'zira', 'aria', 'jenny', 'samantha', 'karen', 'susan', 'hazel',
        'david', 'mark', 'guy', 'ryan', 'george', 'microsoft'
    ];

    function normLang(lang) {
        return String(lang || '').toLowerCase().replace('_', '-');
    }

    function voiceBlob(v) {
        return (String(v.name || '') + ' ' + String(v.voiceURI || '')).toLowerCase();
    }

    function isThaiVoice(v) {
        return normLang(v.lang).includes('th');
    }

    function isEnglishVoice(v) {
        return normLang(v.lang).includes('en');
    }

    function isOnlineOnlyVoice(v) {
        const b = voiceBlob(v);
        return (
            v.localService === false ||
            b.includes('online') ||
            (b.includes('google') && !b.includes('desktop'))
        );
    }

    function isMaleThaiVoice(v) {
        const blob = voiceBlob(v);
        return THAI_MALE_HINTS.some((h) => blob.includes(h));
    }

    function isPattaraVoice(v) {
        const blob = voiceBlob(v);
        return blob.includes('pattara') || blob.includes('mstts_v110_thth_pattara');
    }

    function femaleHintScore(v) {
        if (isMaleThaiVoice(v)) {
            return -100;
        }
        const n = voiceBlob(v);
        let score = 0;
        if (isPattaraVoice(v)) {
            score += 100;
        }
        THAI_FEMALE_HINTS.forEach((h, i) => {
            if (n.includes(h)) {
                score += 20 - i;
            }
        });
        if (n.includes('microsoft') && v.localService === true) {
            score += 20;
        }
        if (n.includes('microsoft')) {
            score += 5;
        }
        if (v.localService === true) {
            score += 10;
        }
        if (isOnlineOnlyVoice(v)) {
            score -= 30;
        }
        return score;
    }

    function englishHintScore(v) {
        const n = voiceBlob(v);
        let score = 0;
        ENGLISH_PREFERRED.forEach((h, i) => {
            if (n.includes(h)) {
                score += 30 - i;
            }
        });
        if (v.localService === true) {
            score += 25;
        }
        if (n.includes('microsoft') && n.includes('desktop')) {
            score += 20;
        }
        if (normLang(v.lang) === 'en-us') {
            score += 5;
        }
        if (isOnlineOnlyVoice(v)) {
            score -= 40;
        }
        return score;
    }

    function pickThaiFemale(pool) {
        if (!pool.length) {
            return null;
        }

        const eligible = pool.filter((v) => !isMaleThaiVoice(v));
        if (!eligible.length) {
            return null;
        }

        const pattara = eligible.find(isPattaraVoice);
        if (pattara) {
            return pattara;
        }

        const ranked = eligible
            .map((v) => ({ v, score: femaleHintScore(v) }))
            .sort((a, b) => b.score - a.score);

        return ranked[0].v;
    }

    /**
     * Prefer local Microsoft voices — Google/Natural often need internet on factory LAN.
     */
    function pickEnglish(pool) {
        if (!pool.length) {
            return null;
        }

        const local = pool.filter((v) => v.localService === true);
        const candidates = local.length ? local : pool.filter((v) => !isOnlineOnlyVoice(v));
        const work = candidates.length ? candidates : pool;

        const ranked = work
            .map((v) => ({ v, score: englishHintScore(v) }))
            .sort((a, b) => b.score - a.score);

        return ranked[0].v;
    }

    function pick(voices, forThai) {
        if (!voices || !voices.length) {
            return null;
        }
        const pool = voices.filter(forThai ? isThaiVoice : isEnglishVoice);
        if (forThai) {
            return pickThaiFemale(pool);
        }
        const chosen = pickEnglish(pool);
        if (chosen) {
            return chosen;
        }
        // No en-* voice — try any local non-Thai voice (Windows default English desktop).
        const localOther = voices.find((v) => v.localService === true && !isThaiVoice(v));
        return localOther || null;
    }

    function loadVoices() {
        if (!('speechSynthesis' in global)) {
            return [];
        }
        return global.speechSynthesis.getVoices();
    }

    let resumeTimer = null;

    function clearResumeTimer() {
        if (resumeTimer) {
            clearInterval(resumeTimer);
            resumeTimer = null;
        }
    }

    function armResumeWatch() {
        clearResumeTimer();
        if (!('speechSynthesis' in global)) {
            return;
        }
        resumeTimer = setInterval(function () {
            if (!global.speechSynthesis.speaking) {
                clearResumeTimer();
                return;
            }
            global.speechSynthesis.resume();
        }, 4000);
    }

    /**
     * @param {string} text
     * @param {SpeechSynthesisVoice[]} voices
     * @param {boolean} forThai — page language mode (not text sniffing)
     * @param {{rate?: number, pitch?: number, onError?: function}} [opts]
     */
    function speak(text, voices, forThai, opts) {
        opts = opts || {};
        if (!text || !('speechSynthesis' in global)) {
            return false;
        }

        if (!voices || !voices.length) {
            voices = loadVoices();
        }

        global.speechSynthesis.cancel();
        global.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = forThai ? 'th-TH' : 'en-US';
        utterance.rate = opts.rate != null ? opts.rate : (forThai ? THAI_SPEECH_RATE : EN_SPEECH_RATE);
        utterance.volume = 1.0;
        utterance.pitch = opts.pitch != null ? opts.pitch : (forThai ? 1.05 : 1.0);

        const voice = pick(voices, forThai);
        if (voice) {
            utterance.voice = voice;
            console.log(
                '[TTS] ' + (forThai ? 'TH' : 'EN') +
                ' → ' + voice.name + ' (' + voice.lang + ', local=' + voice.localService + ')'
            );
        } else {
            console.warn('[TTS] No ' + (forThai ? 'Thai' : 'English') + ' voice — using lang default (' + utterance.lang + ')');
        }

        utterance.onstart = function () {
            armResumeWatch();
        };
        utterance.onend = clearResumeTimer;
        utterance.onerror = function (e) {
            clearResumeTimer();
            console.error('[TTS] Speech error:', e.error || e);
            if (typeof opts.onError === 'function') {
                opts.onError(e);
            }
        };

        global.speechSynthesis.speak(utterance);
        return true;
    }

    function logThaiVoices(voices) {
        logVoices(voices, 'th');
    }

    function logVoices(voices, filter) {
        if (!voices || !voices.length) {
            console.warn('[TTS] No voices loaded yet. Reload after voiceschanged.');
            return;
        }
        let list = voices;
        if (filter === 'th') {
            list = voices.filter(isThaiVoice);
        } else if (filter === 'en') {
            list = voices.filter(isEnglishVoice);
        }
        console.table(
            list.map((v) => ({
                name: v.name,
                lang: v.lang,
                local: v.localService,
                online: isOnlineOnlyVoice(v),
                uri: (v.voiceURI || '').slice(0, 60),
            }))
        );
        console.log('[TTS] Thai pick:', pick(voices, true) ? pick(voices, true).name : '(none)');
        console.log('[TTS] English pick:', pick(voices, false) ? pick(voices, false).name : '(none)');
    }

    global.TtsVoicePicker = {
        THAI_SPEECH_RATE,
        EN_SPEECH_RATE,
        pick,
        speak,
        loadVoices,
        logThaiVoices,
        logVoices,
        femaleHintScore,
        isPattaraVoice,
        isEnglishVoice,
        isThaiVoice,
    };
})(typeof window !== 'undefined' ? window : globalThis);
