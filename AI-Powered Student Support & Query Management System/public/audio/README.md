# Gujarati pitch audio

`pitch_5_min_gu.mp3` is the 300-second master used by the in-browser Auto-Pilot runner. It contains standard Microsoft Gujarati Neural TTS narration, not a cloned personal voice.

`scenes/scene_1.mp3` through `scene_12.mp3` contain their individual narration windows. Scene-end pauses are added when building the master. `pitch_manifest.json` stores the exact PCM timeline and speech-aligned Gujarati/Roman subtitle cues.

Regenerate with `python scripts/generate_pitch_audio.py` after installing `scripts/requirements-pitch.txt`. The script validates both canonical JSON and the Gujarati voiceover text before publishing audio.
