#!/usr/bin/env python3
"""Render the canonical Gujarati pitch as gapless, exactly timed scene audio.

Setup: python -m pip install -r scripts/requirements-pitch.txt
Run:   python scripts/generate_pitch_audio.py

Microsoft Gujarati Neural TTS provides the speech. PCM sample counts, not TTS
estimates, determine the final 300-second master timeline. MP3 gapless metadata
preserves those samples; the player clamps its master clock to 300 seconds.
"""

import argparse
import asyncio
import hashlib
import html
import json
import re
import subprocess
import sys
import unicodedata
import wave
from datetime import datetime, timezone
from pathlib import Path

try:
    import edge_tts
    import imageio_ffmpeg
except ImportError as exc:
    raise SystemExit("Install audio dependencies first: python -m pip install -r scripts/requirements-pitch.txt") from exc

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".pitch_audio_cache"
PUBLIC = ROOT / "public" / "audio"
RATE = 48000
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def command(args):
    result = subprocess.run([FFMPEG, "-hide_banner", *args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-5000:])
    return result


def pcm(path):
    with wave.open(str(path), "rb") as audio:
        assert audio.getframerate() == RATE and audio.getnchannels() == 1 and audio.getsampwidth() == 2
        return audio.readframes(audio.getnframes())


def write_pcm(path, samples):
    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(samples)


def expanded(text):
    for source, replacement in [("આઈ.ટી.આઈ.", "આઈ ટી આઈ"), ("એ.પી.આઈ.", "એ પી આઈ"),
                                ("એ.આઈ.", "એ આઈ"), ("યુ.આઈ.", "યુ આઈ"), ("માયએસક્યુએલ", "માય એસ ક્યુ એલ")]:
        text = text.replace(source, replacement)
    return text


def compact(text):
    return " ".join(text.split())


def word_key(text):
    return "".join(char for char in html.unescape(text).lower() if char.isalnum() or unicodedata.category(char).startswith("M"))


def pause_value(marker):
    normalized = marker.translate(str.maketrans("૦૧૨૩૪૫૬૭૮૯", "0123456789"))
    match = re.search(r"(\d+(?:\.\d+)?)\s*સેકન્ડ", normalized)
    if match:
        return float(match.group(1))
    for word, value in {"એક": 1, "બે": 2, "ત્રણ": 3, "ચાર": 4}.items():
        if re.search(rf"{word}\s+સેકન્ડ", normalized):
            return value
    raise ValueError(f"Unrecognized Gujarati pause marker: {marker}")


def validate_sources():
    project = json.loads((ROOT / "docs/PITCH_5_MIN_SCENES.json").read_text(encoding="utf-8"))
    voice = (ROOT / "docs/GUJARATI_VOICEOVER_5_MIN.txt").read_text(encoding="utf-8")
    paragraphs = [compact(part) for part in re.split(r"\[[^\]]+\]", voice) if part.strip()]
    markers = re.findall(r"\[([^\]]+)\]", voice)
    scenes = project["scenes"]
    assert len(scenes) == len(paragraphs) == len(markers) == 12, "Exactly 12 scene paragraphs and pause markers are required."
    previous = 0
    for scene, paragraph, marker in zip(scenes, paragraphs, markers):
        assert compact(" ".join(scene["sentences"])) == paragraph, f"Voiceover text differs from JSON in scene {scene['id']}."
        assert scene["start"] == previous, "Scene boundaries must be contiguous."
        assert scene["end"] - scene["start"] == scene["voice_seconds"] + pause_value(marker), f"Pause mismatch in scene {scene['id']}."
        assert all(len(sentence.split()) <= 18 for sentence in scene["sentences"])
        previous = scene["end"]
    assert previous == project["duration_seconds"] == 300
    return project


async def request_speech(scene, voice, initial_rate, semaphore):
    text = expanded(" ".join(scene["sentences"]))
    digest = hashlib.sha256((voice + text + str(scene["voice_seconds"])).encode()).hexdigest()
    source = CACHE / f"scene_{scene['id']}_source.mp3"
    meta_path = CACHE / f"scene_{scene['id']}_source.json"
    if source.exists() and meta_path.exists():
        cached = json.loads(meta_path.read_text(encoding="utf-8"))
        if cached.get("hash") == digest and cached.get("boundary") == "WordBoundary":
            return source, cached
    async with semaphore:
        last_error = None
        for attempt in range(3):
            try:
                metadata = {"voice": voice, "rate": initial_rate, "hash": digest, "boundary": "WordBoundary", "words": []}
                stream = edge_tts.Communicate(text, voice, rate=initial_rate, boundary="WordBoundary")
                with source.open("wb") as destination:
                    async for chunk in stream.stream():
                        if chunk["type"] == "audio":
                            destination.write(chunk["data"])
                        elif chunk["type"] == "WordBoundary":
                            metadata["words"].append(chunk)
                assert source.stat().st_size > 1000 and metadata["words"], "TTS did not return speech and word timings."
                meta_path.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
                print(f"Neural Gujarati voice generated: scene {scene['id']}", flush=True)
                return source, metadata
            except Exception as error:
                last_error = error
                await asyncio.sleep(1 + attempt)
        raise RuntimeError(f"Gujarati TTS failed for scene {scene['id']}: {last_error}")


def render_scene(scene, source, metadata):
    number = scene["id"]
    trimmed = CACHE / f"scene_{number}_trim.wav"
    spoken = CACHE / f"scene_{number}_spoken.wav"
    output_wav = CACHE / f"scene_{number}_timed.wav"
    trim = "silenceremove=start_periods=1:start_duration=0.015:start_threshold=-52dB,areverse,silenceremove=start_periods=1:start_duration=0.015:start_threshold=-52dB,areverse"
    command(["-loglevel", "error", "-y", "-i", str(source), "-af", trim, "-ar", str(RATE), "-ac", "1", str(trimmed)])
    trimmed_seconds = len(pcm(trimmed)) / (RATE * 2)
    target = scene["voice_seconds"] - .36
    tempo = trimmed_seconds / target
    command(["-loglevel", "error", "-y", "-i", str(trimmed), "-af",
             f"atempo={tempo:.9f},loudnorm=I=-17:TP=-2:LRA=7,aresample={RATE},asetpts=N/SR/TB",
             "-ar", str(RATE), "-ac", "1", "-c:a", "pcm_s16le", str(spoken)])
    speech = pcm(spoken)
    head = round(.18 * RATE) * 2
    samples = bytearray(round(scene["voice_seconds"] * RATE) * 2)
    assert head + len(speech) <= len(samples), f"Scene {number} needs a slightly faster synthesis rate."
    samples[head:head + len(speech)] = speech
    write_pcm(output_wav, samples)
    output_mp3 = PUBLIC / "scenes" / f"scene_{number}.mp3"
    command(["-loglevel", "error", "-y", "-i", str(output_wav), "-c:a", "libmp3lame", "-b:a", "128k", "-ar", str(RATE), "-write_xing", "1", str(output_mp3)])
    detection = command(["-i", str(source), "-t", "2", "-af", "silencedetect=noise=-52dB:d=0.015", "-f", "null", "-"]).stderr
    match = re.search(r"silence_start: 0(?:\.0+)?\s.*?silence_end: ([0-9.]+)", detection, re.S)
    leading = float(match.group(1)) if match else 0
    events = [event for event in metadata["words"] if word_key(event["text"])]
    roman = re.split(r"(?<=[.!?])\s+", scene["roman"].strip())
    assert len(roman) == len(scene["sentences"]), f"Roman sentence count mismatch in scene {number}."
    cursor, cues = 0, []
    for index, sentence in enumerate(scene["sentences"]):
        expected = [word_key(word) for word in expanded(sentence).split() if word_key(word)]
        actual = events[cursor:cursor + len(expected)]
        if [word_key(word["text"]) for word in actual] != expected:
            raise RuntimeError(f"TTS word alignment differs in scene {number}, sentence {index + 1}. No mismatched audio is published.")
        start = scene["start"] + .18 + max(0, actual[0]["offset"] / 1e7 - leading) / tempo
        end = scene["start"] + .18 + max(0, (actual[-1]["offset"] + actual[-1]["duration"]) / 1e7 - leading) / tempo
        cues.append({"scene": number, "sentence": index, "start": round(start, 3), "end": round(min(end, scene["start"] + scene["voice_seconds"]), 3), "gu": sentence, "roman": roman[index]})
        cursor += len(expected)
    assert cursor == len(events), f"Unmatched spoken words in scene {number}."
    pause = scene["end"] - scene["start"] - scene["voice_seconds"]
    print(f"Scene {number:02d}: {scene['voice_seconds']}s narration + {pause}s hold; speech tempo {tempo:.3f}", flush=True)
    return bytes(samples) + bytes(round(pause * RATE) * 2), cues, {"id": number, "start": scene["start"], "end": scene["end"], "voice_seconds": scene["voice_seconds"], "pause_seconds": pause, "src": f"/audio/scenes/scene_{number}.mp3", "tempo_adjustment": round(tempo, 5)}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--voice", default="gu-IN-NiranjanNeural", choices=["gu-IN-NiranjanNeural", "gu-IN-DhwaniNeural"])
    parser.add_argument("--rate", default="+18%", help="Neural speaking rate, e.g. +18%%")
    args = parser.parse_args()
    project = validate_sources()
    CACHE.mkdir(exist_ok=True)
    (PUBLIC / "scenes").mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(2)
    inputs = await asyncio.gather(*(request_speech(scene, args.voice, args.rate, semaphore) for scene in project["scenes"]))
    master, cues, scene_meta = bytearray(), [], []
    for scene, (source, metadata) in zip(project["scenes"], inputs):
        samples, sentence_cues, info = render_scene(scene, source, metadata)
        master.extend(samples)
        cues.extend(sentence_cues)
        scene_meta.append(info)
    assert len(master) == 300 * RATE * 2, "The master must have exactly 300 seconds of PCM samples."
    master_wav = CACHE / "pitch_5_min_gu.wav"
    write_pcm(master_wav, master)
    command(["-loglevel", "error", "-y", "-i", str(master_wav), "-c:a", "libmp3lame", "-b:a", "128k", "-ar", str(RATE), "-write_xing", "1", "-metadata", "title=Sahay — Five-minute Gujarati pitch", "-metadata", "artist=Gujarati Neural narration", str(PUBLIC / "pitch_5_min_gu.mp3")])
    manifest = {"version": 1, "duration": 300, "sample_rate": RATE, "sample_count": 300 * RATE, "voice": args.voice, "synthetic": True, "language": "gu-IN", "generated_at": datetime.now(timezone.utc).isoformat(), "scenes": scene_meta, "cues": cues}
    (PUBLIC / "pitch_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Published {PUBLIC / 'pitch_5_min_gu.mp3'} — exactly 300 decoded seconds, 12 scene clips, {len(cues)} aligned subtitle cues.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (AssertionError, RuntimeError, ValueError) as error:
        print(f"Audio generation failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
