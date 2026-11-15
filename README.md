# AudioPhraser Studio

A web app for creating and playing Yamaha keyboard audio styles — built as a single-page HTML/Web Audio app that runs fully offline in Chrome/Edge.

**Live:** https://audiophraser-studio.web.app

## What it does

- **WAV Editor** — record, trim and edit audio; tempo 50–150% with WSOLA time-stretching; gapless playback.
- **Style Arranger** — build styles from 15 sections (Intro, Main A–D, Fill In AA–DD, Break, Ending) with per-part mute; plays keyboard-saved `.aus` MIDI.
- **Sample Library** — organise samples and reuse them across styles.
- **Export Manager** — export a genuine Yamaha Audio Style in Audio Phraser dialect as `.aus` (byte-identical to a real fixture — verified), plus WAV, sections ZIP, project ZIP and a report. It does **not** write `.sty` MIDI styles.
- **Player** — play styles with sections, chords and files views; opened styles save to your Google Drive "My Files" collection (signed-in members only).

Chords: in Minor mode all three chords are MINOR. The scale defaults to the auto-detected recorded key; drums never transpose. ZIP/RAR files unpack in the browser.

## Tech

- Plain HTML/CSS/JavaScript + Web Audio API. No build step, no framework.
- Firebase Auth + Firestore for login (super admin) and member accounts. The Player is never gated by auth.
- Google Apps Script backend for Drive Collections (verifies the caller's Firebase ID token server-side).
- PWA installable.

## Run it

Open `index.html` in Chrome or Edge, or serve the folder with any static host:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. For the login and Drive features, deploy to Firebase Hosting with your own Firebase project config in `firebase-config.js`.

## Notes

- The final on-keyboard load test is on a Yamaha PSR-S975.
- `.aus` export is verified byte-identical to a real Audio Phraser fixture.
