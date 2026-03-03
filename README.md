# LinkedIn Post + Visual Generator (Niklas Mode)

Single-Page-Web-App in Vanilla HTML/CSS/JS.

## Start

```bash
python3 -m http.server 4173
```

Dann im Browser öffnen: `http://localhost:4173`

## Hinweise

- Für Text/Research wird die Gemini API direkt im Browser verwendet (`generateContent`).
- Research-Modus nutzt Google Search Grounding über `tools: [{ google_search: {} }]`.
- Visual-Rendering passiert lokal auf Canvas (PNG 4:5 und 1:1), inkl. dunklem Verlauf unten links und Akzentfarbe `#425CF0`.
- Export enthält Copy-Buttons sowie ein `Assets JSON`-Feld.
