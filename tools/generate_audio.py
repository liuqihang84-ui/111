#!/usr/bin/env python3
"""Reproduce Lumenfall's original demonstration soundtrack from its score.

The renderer uses NumPy for offline synthesis only; the game plays baked PCM WAV.
All melodies, chord voicings, envelopes and effects below are original to this
project. The short arrangements are replaceable production placeholders, not
recordings of acoustic instruments. Run: python3 tools/generate_audio.py
"""

from pathlib import Path
import json
import math
import wave

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets" / "audio"
RATE = 22050
RNG = np.random.default_rng(20261003)


def hz(midi):
    return 440.0 * 2.0 ** ((midi - 69.0) / 12.0)


def tone(midi, seconds, instrument="bell", velocity=1.0):
    n = max(2, round(seconds * RATE))
    t = np.arange(n, dtype=np.float64) / RATE
    frequency = hz(midi)
    phase = 2.0 * np.pi * frequency * t
    if instrument == "bell":
        # A soft mallet transient with three independently decaying partials.
        sound = (np.sin(phase) * np.exp(-t * 1.7)
                 + 0.25 * np.sin(phase * 2.01) * np.exp(-t * 3.6)
                 + 0.10 * np.sin(phase * 3.97) * np.exp(-t * 6.0))
        attack, release = 0.007, 0.16
    elif instrument == "flute":
        phase += 0.024 * np.sin(2 * np.pi * 4.8 * t)
        breath = RNG.normal(0, 1, n)
        breath = np.convolve(breath, np.ones(21) / 21, "same")
        sound = np.sin(phase) + 0.17 * np.sin(phase * 2) + 0.05 * breath
        attack, release = 0.11, 0.22
    elif instrument == "strings":
        phase += 0.05 * np.sin(2 * np.pi * 4.2 * t)
        sound = (np.sin(phase) + 0.30 * np.sin(phase * 2)
                 + 0.13 * np.sin(phase * 3) + 0.055 * np.sin(phase * 4))
        attack, release = 0.24, 0.34
    elif instrument == "bass":
        sound = np.sin(phase) + 0.16 * np.sin(phase * 2)
        attack, release = 0.05, 0.22
    else:
        sound = np.sin(phase) + 0.30 * np.sin(phase * 2) * np.exp(-t * 4.0)
        attack, release = 0.015, 0.18
    envelope = np.minimum(1.0, t / attack)
    envelope *= np.minimum(1.0, np.maximum(0.0, (seconds - t) / release))
    return sound * envelope * velocity


def add_circular(buffer, samples, start):
    """Wrap note/reverb tails across a musical loop, instead of cutting them."""
    indices = (np.arange(len(samples)) + round(start * RATE)) % len(buffer)
    np.add.at(buffer, indices, samples)


def write_wav(name, samples, ceiling=0.72):
    peak = max(float(np.max(np.abs(samples))), 0.0001)
    samples = samples / peak * ceiling
    samples = np.clip(samples, -0.99, 0.99)
    data = (samples * 32767).astype("<i2")
    file_path = DEST / (name + ".wav")
    with wave.open(str(file_path), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes(data.tobytes())
    return {"file": file_path.relative_to(ROOT).as_posix(),
            "seconds": round(len(data) / RATE, 3), "bytes": file_path.stat().st_size,
            "sample_rate": RATE, "channels": 1, "bits": 16,
            "peak": round(float(np.max(np.abs(data))) / 32767, 4),
            "loop_seam_delta": round(abs(int(data[0]) - int(data[-1])) / 32767, 6)}


# A score consists of twelve four-beat bars. Degrees are in an original
# seven-note mode and can reach the next octave; no external MIDI is used.
SCORES = {
    "title": {
        "bpm": 76, "root": 62, "mode": [0, 2, 3, 5, 7, 9, 10],
        "instrument": "bell", "chords": [0, 5, 2, 6, 0, 3, 5, 6, 2, 3, 5, 0],
        "phrases": [
            [(0, 4, 1.4), (2, 6, .8), (3, 7, .8)],
            [(0, 9, 1.2), (1.5, 8, .7), (2.5, 6, 1.2)],
            [(0, 7, 1.3), (2, 4, .8), (3, 3, .8)],
            [(0, 2, 1.7), (2.5, 1, .8), (3.5, 0, .4)]],
    },
    "village": {
        "bpm": 88, "root": 60, "mode": [0, 2, 4, 5, 7, 9, 11],
        "instrument": "flute", "chords": [0, 3, 4, 0, 5, 3, 1, 4, 0, 5, 3, 0],
        "phrases": [
            [(0, 2, .6), (1, 4, .6), (2, 5, 1.5)],
            [(0, 4, .7), (1, 2, .7), (2.5, 1, 1.0)],
            [(0, 0, .7), (1, 1, .7), (2, 2, .7), (3, 4, .7)],
            [(0, 3, 1.2), (1.5, 2, .7), (2.5, 0, 1.2)]],
    },
    "forest": {
        "bpm": 78, "root": 62, "mode": [0, 2, 3, 5, 7, 9, 10],
        "instrument": "flute", "chords": [0, 3, 5, 0, 2, 6, 3, 0, 5, 3, 6, 0],
        "phrases": [
            [(0, 0, 1.4), (2, 2, .6), (3, 4, .6)],
            [(0, 5, 1.5), (2.5, 4, 1.1)],
            [(0, 6, .7), (1, 4, .7), (2, 3, 1.3)],
            [(0, 2, 1.6), (2.5, 1, .6), (3.5, 0, .4)]],
    },
    "marsh": {
        "bpm": 68, "root": 57, "mode": [0, 2, 3, 5, 7, 8, 10],
        "instrument": "bell", "chords": [0, 5, 3, 6, 0, 2, 5, 3, 6, 5, 3, 0],
        "phrases": [
            [(0, 7, 1.5), (2.5, 9, .9)],
            [(0, 8, 2.3), (3, 6, .8)],
            [(0, 4, 1.5), (2, 5, .8), (3, 3, .7)],
            [(0, 2, 1.8), (2.5, 0, 1.0)]],
    },
    "ruins": {
        "bpm": 74, "root": 64, "mode": [0, 1, 3, 5, 7, 8, 10],
        "instrument": "bell", "chords": [0, 1, 5, 3, 0, 5, 2, 6, 3, 5, 1, 0],
        "phrases": [
            [(0, 0, 1.0), (1.5, 4, 1.0), (3, 7, .8)],
            [(0, 8, 1.2), (2, 7, 1.5)],
            [(0, 5, .8), (1, 4, .8), (2.5, 2, 1.0)],
            [(0, 1, 1.6), (2, 0, 1.6)]],
    },
    "city": {
        "bpm": 82, "root": 59, "mode": [0, 2, 3, 5, 7, 8, 10],
        "instrument": "strings", "chords": [0, 6, 5, 3, 0, 2, 3, 6, 5, 3, 6, 0],
        "phrases": [
            [(0, 4, 1.2), (1.5, 2, .8), (2.5, 0, 1.0)],
            [(0, 3, 1.3), (2, 5, 1.3)],
            [(0, 6, 1.0), (1.5, 5, .7), (2.5, 4, 1.0)],
            [(0, 2, 1.3), (2, 1, 1.3)]],
    },
    "sanctuary": {
        "bpm": 70, "root": 65, "mode": [0, 2, 4, 5, 7, 9, 11],
        "instrument": "flute", "chords": [0, 5, 3, 4, 0, 2, 3, 4, 5, 3, 4, 0],
        "phrases": [
            [(0, 4, 1.5), (2, 7, 1.5)],
            [(0, 9, 1.0), (1.5, 8, .8), (2.5, 7, 1.0)],
            [(0, 5, 1.5), (2, 4, 1.5)],
            [(0, 2, 1.5), (2, 0, 1.5)]],
    },
    "battle": {
        "bpm": 108, "root": 62, "mode": [0, 2, 3, 5, 7, 9, 10],
        "instrument": "plucked", "chords": [0, 5, 3, 6, 0, 3, 5, 6, 2, 3, 6, 0],
        "phrases": [
            [(0, 0, .4), (.5, 4, .4), (1, 7, .6), (2, 6, .6), (3, 4, .6)],
            [(0, 5, .6), (1, 4, .6), (2, 2, .4), (2.5, 3, .4), (3, 4, .6)],
            [(0, 7, .6), (1, 9, .6), (2, 8, .6), (3, 6, .6)],
            [(0, 5, .6), (1, 4, .6), (2, 2, .6), (3, 0, .6)]],
    },
    "ending": {
        "bpm": 76, "root": 62, "mode": [0, 2, 4, 5, 7, 9, 11],
        "instrument": "flute", "chords": [0, 3, 5, 4, 0, 2, 3, 4, 5, 3, 4, 0],
        "phrases": [
            [(0, 4, 1.4), (2, 6, .8), (3, 7, .8)],
            [(0, 9, 1.2), (1.5, 8, .7), (2.5, 7, 1.2)],
            [(0, 5, 1.3), (2, 4, .8), (3, 2, .8)],
            [(0, 1, 1.5), (2, 0, 1.7)]],
    },
}


def compose(name, score):
    beat = 60.0 / score["bpm"]
    total = round(48 * beat * RATE)
    mix = np.zeros(total)
    root, mode = score["root"], score["mode"]

    def pitch(degree, octave=0):
        return root + mode[degree % 7] + 12 * (degree // 7 + octave)

    for bar, chord in enumerate(score["chords"]):
        offset = bar * 4 * beat
        # Warm upper voices and a separate quiet low string foundation.
        for voice in (chord, chord + 2, chord + 4):
            add_circular(mix, tone(pitch(voice, -1), beat * 4.8,
                                   "strings", .055), offset)
        add_circular(mix, tone(pitch(chord, -2), beat * 3.7, "bass", .09), offset)
        for step in range(8):
            degree = chord + (0, 2, 4, 2)[step % 4]
            add_circular(mix, tone(pitch(degree), beat * 1.8, "bell", .038),
                         offset + step * beat * .5)
        phrase = score["phrases"][bar % 4]
        for position, degree, length in phrase:
            # Middle phrase answers the first one, final phrase returns home.
            variation = 2 if 4 <= bar < 8 and bar % 4 < 2 else 0
            melody_pitch = pitch(degree + variation)
            add_circular(mix, tone(melody_pitch, beat * (length + .35),
                                   score["instrument"], .19), offset + position * beat)
            if bar >= 8 and name in ("title", "sanctuary", "ending"):
                add_circular(mix, tone(melody_pitch + 12, beat * (length + .4),
                                       "bell", .04), offset + position * beat)
        if name == "battle":
            for drum_beat in (0, 2):
                t = np.arange(round(.25 * RATE)) / RATE
                soft_drum = np.sin(2 * np.pi * (74 * t - 48 * t * t))
                soft_drum *= np.exp(-t * 17) * .05
                add_circular(mix, soft_drum, offset + drum_beat * beat)

    # A circular, small room tail remains periodic at the loop boundary.
    dry = mix.copy()
    for delay, amount in ((.13, .12), (.27, .09), (.47, .04)):
        mix += np.roll(dry, round(delay * RATE)) * amount
    mix -= np.mean(mix)
    # Keep ordinary short-term level variation, avoid compressing everything.
    return write_wav("music_" + name, mix, .55)


def effect(event):
    durations = {"attack": .23, "dash": .30, "pulse": .65, "hurt": .28,
                 "collect": .46, "interact": .26, "save": .76, "win": 1.60}
    duration = durations[event]
    n = round(duration * RATE)
    mix = np.zeros(n)
    t = np.arange(n) / RATE
    if event in ("attack", "dash", "hurt"):
        noise = RNG.normal(0, 1, n)
        noise = np.convolve(noise, np.ones(17) / 17, "same")
        envelope = np.sin(np.pi * t / duration) ** 1.8
        if event == "hurt":
            phase = 2 * np.pi * (190 * t - 120 * t * t)
            mix = (.6 * np.sin(phase) + noise * .28) * envelope
        else:
            carrier = 220 if event == "attack" else 130
            mix = (noise * .85 + .09 * np.sin(2 * np.pi * carrier * t)) * envelope
    else:
        sequences = {
            "pulse": [(0, 74), (.08, 81), (.16, 86)],
            "collect": [(0, 74), (.09, 78), (.18, 81)],
            "interact": [(0, 69), (.08, 74)],
            "save": [(0, 62), (.15, 69), (.30, 74), (.44, 78)],
            "win": [(0, 62), (.22, 66), (.44, 69), (.66, 74), (.90, 78)]}
        for start, midi in sequences[event]:
            start_frame = round(start * RATE)
            samples = tone(midi, duration - start, "bell", .23)
            available = min(len(samples), n - start_frame)
            mix[start_frame:start_frame + available] += samples[:available]
    # Ensure every one-shot returns to silence exactly.
    ramp = min(round(.007 * RATE), n // 2)
    mix[:ramp] *= np.linspace(0, 1, ramp)
    mix[-ramp:] *= np.linspace(1, 0, ramp)
    return write_wav("sfx_" + event, mix, .52)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    tracks = {name: compose(name, score) for name, score in SCORES.items()}
    effects = {event: effect(event) for event in
               ("attack", "dash", "pulse", "hurt", "collect", "interact", "save", "win")}
    report = {"generator": "tools/generate_audio.py", "seed": 20261003,
              "music": tracks, "effects": effects,
              "total_wav_bytes": sum(x["bytes"] for x in [*tracks.values(), *effects.values()])}
    (DEST / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    for name, data in tracks.items():
        print(f"{name:10} {data['seconds']:6.3f}s {data['bytes']:9,d} bytes seam={data['loop_seam_delta']}")
    print(f"8 effects; total WAV bytes: {report['total_wav_bytes']:,}")


if __name__ == "__main__":
    main()
