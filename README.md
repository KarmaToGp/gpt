# LinkedIn Post + Visual Generator (Niklas Mode)

Single-Page-Web-App in Vanilla HTML/CSS/JS.

## Start

```bash
python3 -m http.server 4173
```

Dann im Browser öffnen: `http://localhost:4173`

## Hinweise

- Für Text, Hooks, Kommentar/DM und Research wird die OpenAI Responses API direkt im Browser verwendet (`model: gpt-5`).
- Optionaler Research-Modus nutzt Websuche über `tools: [{ type: "web_search_preview" }]`.
- Visual-Rendering passiert lokal auf Canvas (PNG 4:5 und 1:1), inkl. dunklem Verlauf unten links und Akzentfarbe `#425CF0`.
- Export enthält Copy-Buttons sowie ein `Assets JSON`-Feld.
