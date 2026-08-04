/**
 * Tiny dependency-free audio cues for the QR scanner, generated on the fly via
 * the Web Audio API — no asset files to host, works offline.
 */
function playTone(frequencies: number[], noteDuration: number) {
    if (typeof window === 'undefined') {
        return;
    }

    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
        return;
    }

    const ctx = new AudioContextCtor();
    let time = ctx.currentTime;

    frequencies.forEach((frequency) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.2, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + noteDuration);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(time);
        oscillator.stop(time + noteDuration + 0.02);

        time += noteDuration;
    });

    setTimeout(() => ctx.close(), (time + 0.1) * 1000);
}

/** Fresh success — quick ascending two-note chime. */
export function playSuccessTone() {
    playTone([880, 1174.66], 0.12);
}

/** Soft notice (e.g. already checked in) — single mid tone, less alarming than an error. */
export function playNoticeTone() {
    playTone([660], 0.15);
}

/** Not found / rejected / invalid — descending low buzz. */
export function playErrorTone() {
    playTone([300, 220], 0.18);
}
