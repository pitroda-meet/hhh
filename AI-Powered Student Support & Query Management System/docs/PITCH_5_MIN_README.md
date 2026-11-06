# Exactly five-minute Gujarati video package

## Source status

The attachment titled **Project Idea & Complete Technical Architecture** was not available in the conversation or project folder. This is a provisional recording package based on the user's detailed brief and verified prototype. Reconcile it with the original document when supplied.

## Files

- `PITCH_5_MIN_SCENES.json`: canonical Gujarati sentences, Roman transliteration, scene timing, and the 60-second pitch.
- `GUJARATI_VOICEOVER_5_MIN.txt`: continuous Gujarati narration with non-spoken pause markers.
- `ROMAN_GUJARATI_5_MIN.txt`: equivalent Roman Gujarati narration.
- `PITCH_SUBTITLES_GU.srt`: Gujarati subtitle cues.
- `PITCH_SUBTITLES_EN.srt`: equivalent English subtitle cues.

Subtitle cues follow the planned delivery windows. Fine-align their internal timing to the recorded voice; preserve the scene boundaries and final 05:00 endpoint.

## Timing lock

The main narration has **535 whitespace-delimited words**, excluding pause instructions and the English end-card text. The longest Gujarati sentence has 15 words. Spoken windows total **275 seconds**; scene-end pauses/holds total **25 seconds**. Required delivery is approximately **116–118 words per minute**.

| Scene | Start–end | Voice | Hold | Gujarati words |
|---|---|---:|---:|---:|
| 1 | 00:00–00:20 | 18s | 2s | 35 |
| 2 | 00:20–00:40 | 18s | 2s | 35 |
| 3 | 00:40–01:00 | 18s | 2s | 35 |
| 4 | 01:00–01:25 | 23s | 2s | 45 |
| 5 | 01:25–02:05 | 37s | 3s | 72 |
| 6 | 02:05–02:35 | 28s | 2s | 54 |
| 7 | 02:35–02:55 | 18s | 2s | 35 |
| 8 | 02:55–03:20 | 23s | 2s | 45 |
| 9 | 03:20–03:45 | 23s | 2s | 45 |
| 10 | 03:45–04:15 | 28s | 2s | 54 |
| 11 | 04:15–04:40 | 23s | 2s | 45 |
| 12 | 04:40–05:00 | 18s | 2s | 35 |
| **Total** | **00:00–05:00** | **275s** | **25s** | **535** |

Actual reading pace must be rehearsed. Word counts are a delivery budget, not a measurement of an unrecorded voice. Record individual scenes to the allocated windows and lock the edit to **1920×1080, 16:9, 30 fps, 9,000 frames**.

The short pitch has **106 Gujarati words**: target 56 seconds of narration and a 4-second end card (approximately 114 words/minute).

## Exact closing treatment

Speak this Gujarati closing; display both versions on the final card. The English version is on-screen text/subtitles, preserving an entirely Gujarati voiceover.

> એક વેબસાઇટ. એક ઇન્ટેલિજન્ટ સપોર્ટ એજન્ટ. એક સેન્ટ્રલાઇઝ્ડ સ્ટુડન્ટ સપોર્ટ સિસ્ટમ.

> One Website. One Intelligent Support Agent. One Centralized Student Support System.

## Recording accuracy

1. Use one application tab and the role switcher; keep architecture slides and backup footage separately. Current demo authentication is shared in localStorage.
2. Reset with **Ctrl+Shift+D → Reset & start demo** so the next ticket is **ITI-2026-00125**.
3. Keep the optional Gemini key empty for repeatable mock-engine footage. The narration states that the current demonstration uses mock services.
4. Label FAQ examples and dashboard statistics as **Demo data**. They are not official scholarship or examination policy evidence.
5. For administrator approval, use the seeded staff-suggested duplicate-registration FAQ with all three translations already completed. Label it **Prepared demo FAQ**. New staff suggestions need their missing translations before publication.
6. The student's resolved ticket stays resolved when they submit a rating. Rating does not automatically close it.
7. Demonstrate escalation on a different overdue ticket, such as **ITI-2026-00112**. The resolved student ticket should not be escalated.
8. Describe 24h/48h as **proposed configurable thresholds**, and the time-passing action as a simulation.
9. Label the Laravel 12 / MySQL / FastAPI / Gemini / Ubuntu VPS / Nginx / HTTPS diagram **Planned production architecture**.
10. The mock visibly supports `search_faq`, `get_departments`, `create_ticket`, `get_ticket_status` and `request_human_support`. The additional tools in the supplied brief—`search_knowledge`, `get_ticket_history`, `get_student_profile`—belong in the planned tool registry, not fabricated live logs.
11. `Pending` is a dashboard grouping in the current prototype, not a selectable ticket status. The prototype's statuses are Open, Assigned, In Progress, Waiting for Student, Escalated, Resolved and Closed.

## Production process map from the supplied brief

Submitted → AI Classification → Department Identification → Staff Assignment → In Progress → Staff Response → Student Review → Resolved → Closed.

For the actual recorded MVP journey, show the implementation's real order: ticket creation and assignment → staff reply → Resolved → student review/rating. Do not add an automatic Closed transition.

## Eight query categories

Academic, Examination, Scholarship, Administrative, Technical, Workshop/Trade, Student Welfare, General.

The first-version assignment is rule-based. Category maps to department, and the prototype chooses eligible staff by active workload.
