const state = {
  portraitDataUrl: "",
  portraitFile: null,
  post: null,
  research: { trends: [], sources: [] },
  overlays: [],
  rendered: {},
};

const els = {
  apiKey: document.getElementById("apiKey"),
  portrait: document.getElementById("portrait"),
  portraitPreview: document.getElementById("portraitPreview"),
  thesis: document.getElementById("thesis"),
  audience: document.getElementById("audience"),
  sharpness: document.getElementById("sharpness"),
  sharpnessValue: document.getElementById("sharpnessValue"),
  cta: document.getElementById("cta"),
  researchToggle: document.getElementById("researchToggle"),
  profile: document.getElementById("profile"),
  status: document.getElementById("status"),
  postFinal: document.getElementById("postFinal"),
  hookA: document.getElementById("hookA"),
  hookB: document.getElementById("hookB"),
  comment1: document.getElementById("comment1"),
  dmBridge: document.getElementById("dmBridge"),
  wordCount: document.getElementById("wordCount"),
  qualityState: document.getElementById("qualityState"),
  overlay1: document.getElementById("overlay1"),
  overlay2: document.getElementById("overlay2"),
  overlay3: document.getElementById("overlay3"),
  overlaySelected: document.getElementById("overlaySelected"),
  trendList: document.getElementById("trendList"),
  sourceList: document.getElementById("sourceList"),
  assetsJson: document.getElementById("assetsJson"),
  canvas: document.getElementById("canvasPreview"),
  download45: document.getElementById("download45"),
  download11: document.getElementById("download11"),
};

const tabs = [...document.querySelectorAll(".tabs button")];
const tabPanels = {
  post: document.getElementById("tab-post"),
  visual: document.getElementById("tab-visual"),
  research: document.getElementById("tab-research"),
};

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabs.forEach((b) => b.classList.remove("active"));
    Object.values(tabPanels).forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    tabPanels[btn.dataset.tab].classList.add("active");
  });
});

els.sharpness.addEventListener("input", () => {
  const n = Number(els.sharpness.value);
  els.sharpnessValue.textContent = n < 33 ? "neutral" : n < 66 ? "direkt" : "kantig";
});

els.portrait.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  state.portraitFile = file;
  state.portraitDataUrl = await fileToDataUrl(file);
  els.portraitPreview.src = state.portraitDataUrl;
  els.portraitPreview.hidden = false;
  setStatus("Portrait geladen.");
});

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const id = btn.getAttribute("data-copy");
    await navigator.clipboard.writeText(els[id].value || "");
    setStatus(`In Zwischenablage kopiert: ${id}`);
  });
});

document.getElementById("generateAll").addEventListener("click", () => generate("all"));
document.getElementById("regenAll").addEventListener("click", () => generate("all"));
document.getElementById("regenHooks").addEventListener("click", () => generate("hooks"));
document.getElementById("regenCta").addEventListener("click", () => generate("cta"));
document.getElementById("render45").addEventListener("click", () => renderCanvas("4:5"));
document.getElementById("render11").addEventListener("click", () => renderCanvas("1:1"));

async function generate(mode = "all") {
  const apiKey = els.apiKey.value.trim();
  if (!apiKey) return setStatus("Bitte OpenAI API Key setzen.");
  if (!els.thesis.value.trim()) return setStatus("Bitte These/Draft ausfüllen.");

  try {
    setStatus("Generiere Inhalte mit GPT ...");
    if (els.researchToggle.checked && mode === "all") {
      state.research = await fetchResearch(apiKey);
      renderResearch();
    }

    const payload = await fetchPostBundle(apiKey, mode);
    state.post = payload;
    applyPost(payload);

    if (mode === "all") {
      const overlay = await fetchOverlayLines(apiKey);
      state.overlays = overlay;
      [els.overlay1.value, els.overlay2.value, els.overlay3.value] = overlay;
      els.overlaySelected.value = overlay[0] || "";
    }

    runQualityGates();
    updateAssetsJson();
    setStatus("Generierung abgeschlossen.");
  } catch (err) {
    console.error(err);
    setStatus(`Fehler: ${err.message}`);
  }
}

async function fetchResearch(apiKey) {
  const prompt = `Finde 3-5 aktuelle Trendpunkte (DACH/DE) zu KI-Workflows in Unternehmen.\nLiefere 3 belastbare Quellenlinks.\nAntwort NUR als JSON: {"trends":["..."],"sources":["https://..."]}`;
  const text = await gptGenerate(apiKey, prompt, { useWebSearch: true });
  const parsed = safeJson(text);
  return {
    trends: (parsed.trends || []).slice(0, 5),
    sources: (parsed.sources || []).slice(0, 3),
  };
}

async function fetchPostBundle(apiKey, mode) {
  const sharp = Number(els.sharpness.value);
  const limits = sharp > 66 ? "240-280" : "220-260";
  const prompt = `Du bist ein LinkedIn Ghostwriter in Niklas-Mode.
Schreibe NUR gültiges JSON, kein Markdown.
Schema:
{
  "finalPost":"...",
  "hookA":"...",
  "hookB":"...",
  "comment1":"...",
  "dmBridge":"...",
  "altText":"..."
}
Regeln:
- Deutsch, Du-Form, keine Emojis.
- Struktur: Hook -> Nutzen -> Mini-Beispiel -> Frage.
- Stil DNA: ${els.profile.value}
- Zielgruppe: ${els.audience.value}
- Schärfegrad 0-100: ${sharp}
- CTA-Typ: ${els.cta.value}
- Länge finalPost: ${limits} Wörter.
- Maximal EINEN konkreten Zahlen-/Trend-Claim. Sonst ohne Zahlen.
- Vermeide generische Floskeln.
- These: ${els.thesis.value}
- Mode: ${mode}
- Researchpunkte: ${JSON.stringify(state.research.trends)}
`;
  const text = await gptGenerate(apiKey, prompt);
  const parsed = safeJson(text);
  return {
    finalPost: parsed.finalPost || "",
    hookA: parsed.hookA || "",
    hookB: parsed.hookB || "",
    comment1: parsed.comment1 || "",
    dmBridge: parsed.dmBridge || "",
    altText: parsed.altText || "Portrait mit klarem Textoverlay im Corporate-Stil.",
  };
}

async function fetchOverlayLines(apiKey) {
  const prompt = `Erzeuge 3 Overlay-Texte (Deutsch), jeweils max. 6 Wörter, technisch-pragmatisch, ohne Buzzwords.
Antwort NUR als JSON: {"lines":["...","...","..."]}`;
  const text = await gptGenerate(apiKey, prompt);
  const parsed = safeJson(text);
  return (parsed.lines || []).slice(0, 3);
}

async function gptGenerate(apiKey, prompt, options = {}) {
  const payload = {
    model: "gpt-5",
    input: prompt,
    text: { verbosity: "medium" },
  };

  if (options.useWebSearch) {
    payload.tools = [{ type: "web_search_preview" }];
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API Fehler (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return (data.output_text || "").trim();
}

function applyPost(post) {
  els.postFinal.value = post.finalPost;
  els.hookA.value = post.hookA;
  els.hookB.value = post.hookB;
  els.comment1.value = post.comment1;
  els.dmBridge.value = post.dmBridge;
  els.wordCount.textContent = wordCount(post.finalPost);
}

function runQualityGates() {
  const genericPhrases = ["in der heutigen zeit", "gamechanger", "revolutionär", "letztendlich", "am ende des tages"];
  let post = els.postFinal.value;
  const found = genericPhrases.filter((p) => post.toLowerCase().includes(p));
  found.forEach((phrase) => {
    post = post.replace(new RegExp(phrase, "ig"), "konkret im Prozess");
  });

  const consistent = ensureConsistency(post, els.thesis.value);
  const brand = brandFitScore(consistent);
  els.postFinal.value = consistent;

  els.qualityState.textContent = [
    found.length ? `Anti-Generic: ${found.length} ersetzt` : "Anti-Generic: ok",
    consistent === post ? "Consistency: ok" : "Consistency: angepasst",
    `Brand Fit: ${brand}/5`,
  ].join(" | ");

  els.wordCount.textContent = wordCount(els.postFinal.value);
}

function ensureConsistency(post, thesis) {
  const trimmed = post.trim();
  if (!trimmed) return trimmed;
  const core = thesis.split(/[.!?]/)[0].trim();
  if (core && !trimmed.toLowerCase().includes(core.toLowerCase().slice(0, 25))) {
    return `${trimmed}\n\nKontextanker: ${core}.`;
  }
  return trimmed;
}

function brandFitScore(post) {
  const markers = ["workflow", "kontext", "präzision", "operationalisierung", "reibung", "werkzeug"];
  const lower = post.toLowerCase();
  const points = markers.reduce((acc, marker) => acc + (lower.includes(marker) ? 1 : 0), 0);
  return Math.max(1, Math.min(5, points));
}

function renderResearch() {
  els.trendList.innerHTML = "";
  els.sourceList.innerHTML = "";
  state.research.trends.forEach((trend) => {
    const li = document.createElement("li");
    li.textContent = trend;
    els.trendList.appendChild(li);
  });
  state.research.sources.forEach((source) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = source;
    a.textContent = source;
    a.target = "_blank";
    li.appendChild(a);
    els.sourceList.appendChild(li);
  });
}

async function renderCanvas(ratio) {
  if (!state.portraitDataUrl) return setStatus("Bitte zuerst Portrait hochladen.");
  const overlay = (els.overlaySelected.value || "").trim();
  if (!overlay) return setStatus("Bitte Overlay-Text wählen.");
  if (overlay.split(/\s+/).length > 6) return setStatus("Overlay darf maximal 6 Wörter haben.");

  const img = await loadImage(state.portraitDataUrl);
  const canvas = els.canvas;
  const ctx = canvas.getContext("2d");
  const [w, h] = ratio === "4:5" ? [1080, 1350] : [1080, 1080];
  canvas.width = w;
  canvas.height = h;

  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, dx, dy, dw, dh);

  const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);

  const words = overlay.split(/\s+/);
  const accentIdx = words.length > 2 ? 1 : 0;
  const textX = w * 0.07;
  const textY = h * 0.88;
  const fontSize = Math.round(w * 0.056);
  ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;

  let x = textX;
  words.forEach((word, i) => {
    ctx.fillStyle = i === accentIdx ? "#425CF0" : "#ffffff";
    ctx.fillText(word, x, textY);
    x += ctx.measureText(`${word} `).width;
  });

  const pngUrl = canvas.toDataURL("image/png");
  if (ratio === "4:5") {
    els.download45.href = pngUrl;
    els.download45.hidden = false;
  } else {
    els.download11.href = pngUrl;
    els.download11.hidden = false;
  }
  state.rendered[ratio] = pngUrl;
  updateAssetsJson();
  setStatus(`Visual gerendert (${ratio}).`);
}

function updateAssetsJson() {
  els.assetsJson.value = JSON.stringify(
    {
      post: els.postFinal.value,
      hooks: [els.hookA.value, els.hookB.value],
      comment1: els.comment1.value,
      dmBridge: els.dmBridge.value,
      overlayText: [els.overlay1.value, els.overlay2.value, els.overlay3.value],
      selectedOverlay: els.overlaySelected.value,
      altText: state.post?.altText || "",
      researchLinks: state.research.sources,
    },
    null,
    2,
  );
}

function safeJson(str) {
  const cleaned = str.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

function wordCount(text) {
  return (text.trim().match(/\S+/g) || []).length;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function setStatus(msg) {
  els.status.textContent = msg;
}

updateAssetsJson();
