// ==========================================================================
// Spatial LookDev Prompt Compositor - 2-Stage Pipeline Core
// ==========================================================================

// Auto-expanding textarea helper (expands dynamically to fit all lines without scrollbar)
function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.max(38, el.scrollHeight) + "px";
}

// ==========================================================================
// CMF & LookDev Color-to-Natural-Descriptor Engine (HEX to Structured Prompt)
// Decomposes into: Temperature (warm/cool/neutral), Brightness, Saturation, Hue
// ==========================================================================
const CMF_COLOR_PALETTE = [
  { name: "champagne gold", hex: "#b39761", r: 179, g: 151, b: 97, temp: "warm" },
  { name: "radiant yellow gold", hex: "#d4af37", r: 212, g: 175, b: 55, temp: "warm" },
  { name: "champagne sand", hex: "#d8c49d", r: 216, g: 196, b: 157, temp: "warm" },
  { name: "rose gold", hex: "#b76e79", r: 183, g: 110, b: 121, temp: "warm" },
  { name: "terracotta rose", hex: "#c25953", r: 194, g: 89, b: 83, temp: "warm" },
  { name: "coral blush", hex: "#d97d74", r: 217, g: 125, b: 116, temp: "warm" },
  { name: "brick terracotta", hex: "#8c4a45", r: 140, g: 74, b: 69, temp: "warm" },
  { name: "terracotta chocolate", hex: "#8b3a2b", r: 139, g: 58, b: 43, temp: "warm" },
  { name: "cocoa espresso", hex: "#6b3f3b", r: 107, g: 63, b: 59, temp: "warm" },
  { name: "peach pastel pink", hex: "#f3a89e", r: 243, g: 168, b: 158, temp: "warm" },
  { name: "rose magenta", hex: "#ec4899", r: 236, g: 72, b: 153, temp: "cool" },
  { name: "apricot coral", hex: "#e37060", r: 227, g: 112, b: 96, temp: "warm" },
  { name: "honey amber", hex: "#d97706", r: 217, g: 119, b: 6, temp: "warm" },
  { name: "peach beige", hex: "#f59e0b", r: 245, g: 158, b: 11, temp: "warm" },
  { name: "matcha sage green", hex: "#657e4e", r: 101, g: 126, b: 78, temp: "warm" },
  { name: "sage olive green", hex: "#5b7065", r: 91, g: 112, b: 101, temp: "warm" },
  { name: "forest jade green", hex: "#3e5c52", r: 62, g: 92, b: 82, temp: "cool" },
  { name: "slate blue", hex: "#4d6580", r: 77, g: 101, b: 128, temp: "cool" },
  { name: "navy ocean blue", hex: "#1e354d", r: 30, g: 53, b: 77, temp: "cool" },
  { name: "graphite titanium", hex: "#1e2129", r: 30, g: 33, b: 41, temp: "cool" },
  { name: "space gray", hex: "#475569", r: 71, g: 85, b: 105, temp: "cool" },
  { name: "space black", hex: "#0d0e12", r: 13, g: 14, b: 18, temp: "neutral" },
  { name: "neutral off-white", hex: "#f4f2ee", r: 244, g: 242, b: 238, temp: "warm" },
  { name: "snow white", hex: "#f8fafc", r: 248, g: 250, b: 252, temp: "neutral" },
  { name: "silver aluminum", hex: "#dce0e6", r: 220, g: 224, b: 230, temp: "cool" },
  { name: "desert sand travertine", hex: "#e8dfd5", r: 232, g: 223, b: 213, temp: "warm" },
  { name: "mocha taupe", hex: "#a38068", r: 163, g: 128, b: 104, temp: "warm" },
  { name: "burgundy wine red", hex: "#5e1924", r: 94, g: 25, b: 36, temp: "warm" },
  { name: "lavender lilac", hex: "#bca0dc", r: 188, g: 160, b: 220, temp: "cool" },
  { name: "pristine white", hex: "#ffffff", r: 255, g: 255, b: 255, temp: "neutral" },
  { name: "obsidian black", hex: "#000000", r: 0, g: 0, b: 0, temp: "neutral" },
  { name: "neutral gray", hex: "#808080", r: 128, g: 128, b: 128, temp: "neutral" }
];

// ==========================================================================
// Prompt-Safe CMF Color Engine (NTC Database + Safety Sanitizer + Procedural HSL)
// Translates any HEX/RGB into 100% Diffusion-Safe Color Descriptors (No artifact words)
// ==========================================================================

const UNSAFE_OBJECT_WORDS = [
  "turkey", "astronaut", "elephant", "apple", "cherry", "banana", "lemon", "bear",
  "porsche", "witch", "voodoo", "alligator", "alien", "gun", "grenade", "meat",
  "smoke", "blood", "fire", "ice", "water", "frog", "pig", "duck", "chicken",
  "mouse", "rat", "dog", "cat", "fish", "spider", "snake", "bug", "ant",
  "mud", "dirt", "skin", "flesh", "bone", "tooth", "fat", "grease", "oil",
  "poison", "zombie", "monster", "devil", "demon", "goblin", "corpse", "sludge"
];

function sanitizeNtcName(rawName) {
  if (!rawName || typeof rawName !== "string") return "";
  const lower = rawName.toLowerCase().trim();
  for (const bad of UNSAFE_OBJECT_WORDS) {
    if (lower.includes(bad)) return "";
  }
  return lower.replace(/[^a-zA-Z0-9\s\-]/g, "").trim();
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return { r: 128, g: 128, b: 128 };
  let clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  } else if (clean.length === 8) {
    clean = clean.substring(0, 6);
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return { r: isNaN(r) ? 128 : r, g: isNaN(g) ? 128 : g, b: isNaN(b) ? 128 : b };
  }
  return { r: 128, g: 128, b: 128 };
}

// Full Structured Color Decomposition (Temperature + Saturation + Brightness + Safe NTC / Hue)
function decomposeColorToPromptTokens(hex) {
  if (!hex) return { fullDescriptor: "", badgeText: "" };
  const { r, g, b } = hexToRgb(hex);

  // 1. Query NTC (Name That Color) Database with Safety Sanitizer
  let safeNtcName = "";
  if (typeof ntc !== "undefined" && ntc.name) {
    const match = ntc.name(hex);
    if (match && match[1] && !match[1].startsWith("Invalid")) {
      safeNtcName = sanitizeNtcName(match[1]);
    }
  }

  // 2. Compute Precision HSL Coordinates
  const rNorm = r / 255.0, gNorm = g / 255.0, bNorm = b / 255.0;
  const mx = Math.max(rNorm, gNorm, bNorm), mn = Math.min(rNorm, gNorm, bNorm);
  let h = 0.0, s = 0.0, l = (mx + mn) / 2.0;

  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
    if (mx === rNorm) {
      h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6.0 : 0.0);
    } else if (mx === gNorm) {
      h = (bNorm - rNorm) / d + 2.0;
    } else {
      h = (rNorm - gNorm) / d + 4.0;
    }
    h = (h * 60.0) % 360.0;
    if (h < 0) h += 360.0;
  }

  // 3. Temperature Descriptor
  let tempPrefix = "";
  if (s < 0.10 || l > 0.94 || l < 0.08) {
    tempPrefix = l > 0.85 ? "warm neutral" : (l < 0.2 ? "deep neutral" : "neutral");
  } else if ((h >= 0 && h < 75) || (h >= 340 && h <= 360)) {
    tempPrefix = "warm";
  } else if (h >= 165 && h < 290) {
    tempPrefix = "cool";
  } else if (h >= 75 && h < 165) {
    tempPrefix = "fresh organic";
  } else {
    tempPrefix = "warm";
  }

  // 4. Brightness & Saturation Prefix Qualifier (pale pastel, pale muted, vivid rich, deep intense, etc.)
  let prefixQualifier = "";
  if (l > 0.94 || l < 0.08 || s < 0.10) {
    if (l > 0.94) prefixQualifier = "pure";
    else if (l < 0.15) prefixQualifier = "deep dark";
    else prefixQualifier = "neutral";
  } else if (s < 0.35) {
    if (l > 0.70) prefixQualifier = "pale pastel";
    else if (l > 0.45) prefixQualifier = "pale muted";
    else prefixQualifier = "dark subdued";
  } else if (s < 0.65) {
    if (l > 0.75) prefixQualifier = "soft light";
    else if (l < 0.30) prefixQualifier = "deep rich";
    else prefixQualifier = "natural balanced";
  } else {
    // High saturation
    if (l > 0.75) prefixQualifier = "bright vivid";
    else if (l < 0.30) prefixQualifier = "deep intense";
    else prefixQualifier = "vivid rich";
  }

  // 5. Explicit Saturation / Chroma Postfix Clause (pale/low sat vs vivid/high sat)
  let saturationPhrase = "";
  let saturationBadge = "balanced";
  if (s < 0.10 || l > 0.94 || l < 0.08) {
    saturationPhrase = "monochromatic, zero saturation";
    saturationBadge = "monochrome";
  } else if (s < 0.22) {
    saturationPhrase = "ultra-low saturation, highly desaturated pale muted, washed-out subtle chroma";
    saturationBadge = "pale/ultra-low";
  } else if (s < 0.38) {
    saturationPhrase = "low saturation, desaturated pale muted chroma";
    saturationBadge = "pale/low-sat";
  } else if (s < 0.60) {
    saturationPhrase = "soft muted saturation, subtle subdued chroma";
    saturationBadge = "soft/subdued";
  } else if (s < 0.78) {
    saturationPhrase = "balanced natural saturation, medium chroma";
    saturationBadge = "balanced";
  } else if (s < 0.90) {
    saturationPhrase = "high saturation, rich vibrant pure chroma";
    saturationBadge = "vivid/rich";
  } else {
    saturationPhrase = "ultra-high vivid saturation, intense bold chroma";
    saturationBadge = "ultra-vivid";
  }

  // 6. Strict Physical Visual Color Name (Anchor Hue)
  let visualHue = "neutral tone";
  if (s < 0.10 || l > 0.94 || l < 0.08) {
    if (l > 0.94) visualHue = "pure snow white";
    else if (l > 0.82) visualHue = "off-white porcelain";
    else if (l > 0.40) visualHue = "neutral gray";
    else if (l > 0.18) visualHue = "graphite charcoal";
    else visualHue = "space black";
  } else if (h >= 355 || h < 15) {
    visualHue = s < 0.38 ? "dusty rose" : "crimson red";
  } else if (h < 38) {
    visualHue = s < 0.38 ? "terracotta beige" : "terracotta coral";
  } else if (h < 58) {
    if (s < 0.38) {
      visualHue = l > 0.65 ? "champagne beige" : "warm sand khaki";
    } else {
      visualHue = l > 0.65 ? "champagne gold" : "amber sand";
    }
  } else if (h < 78) {
    visualHue = s < 0.38 ? "ochre beige" : "ochre yellow gold";
  } else if (h < 105) {
    visualHue = s < 0.45 ? "sage olive" : (s < 0.7 ? "sage olive green" : "chartreuse lime");
  } else if (h < 145) {
    visualHue = s < 0.45 ? "botanical sage green" : "emerald jade green";
  } else if (h < 170) {
    visualHue = s < 0.45 ? "mint herbal" : (l < 0.45 ? "forest jade green" : "mint herbal green");
  } else if (h < 195) {
    visualHue = s < 0.45 ? "slate teal" : "cyan teal";
  } else if (h < 225) {
    visualHue = s < 0.45 ? "slate azure" : "cerulean azure blue";
  } else if (h < 255) {
    visualHue = s < 0.45 ? "slate blue" : (l < 0.35 ? "navy ocean blue" : (s > 0.6 ? "cobalt royal blue" : "slate blue"));
  } else if (h < 285) {
    visualHue = s < 0.45 ? "slate indigo" : "indigo sapphire blue";
  } else if (h < 315) {
    visualHue = s < 0.45 ? "dusty violet" : "violet purple";
  } else if (h < 340) {
    visualHue = s < 0.45 ? "dusty plum" : "magenta plum";
  } else {
    visualHue = s < 0.45 ? "dusty rose blush" : "rose blush pink";
  }

  // 7. Choose Primary Safe Color Name
  let colorName = visualHue;
  if (safeNtcName && safeNtcName.length > 2) {
    const recognizedWords = [
      "blue", "green", "red", "yellow", "gold", "orange", "purple", "pink", "violet", "cyan", "teal", 
      "gray", "white", "black", "brown", "amber", "coral", "rose", "sage", "jade", "emerald", "cobalt", 
      "navy", "indigo", "terracotta", "plum", "charcoal", "khaki", "beige", "taupe", "sand", "tan", 
      "ivory", "cream", "ochre", "olive", "bronze", "copper", "clay", "cocoa", "espresso", "nude", "peach"
    ];
    const hasColorWord = recognizedWords.some(w => safeNtcName.toLowerCase().includes(w));
    if (hasColorWord) {
      colorName = safeNtcName;
    } else {
      colorName = `${safeNtcName} ${visualHue}`;
    }
  }

  // 8. Assemble Diffusion-Optimized Structured Tokens with Pale / Vivid & Saturation Mentions
  const tokens = [];
  if (tempPrefix && !colorName.includes(tempPrefix) && tempPrefix !== "neutral") tokens.push(tempPrefix);
  if (prefixQualifier && !colorName.includes(prefixQualifier)) tokens.push(prefixQualifier);
  tokens.push(colorName);
  if (!colorName.includes("tone") && !colorName.includes("black") && !colorName.includes("white")) {
    tokens.push("tone");
  }
  if (saturationPhrase) {
    tokens.push(saturationPhrase);
  }

  // Clean deduplication
  const rawDesc = tokens.join(" ").replace(/\s+/g, " ").trim();
  const wordList = rawDesc.split(" ");
  const uniqueWords = wordList.filter((w, i) => wordList.indexOf(w) === i || w === "tone" || w === "saturation" || w === "chroma" || w === "pale" || w === "muted" || w === "vivid");
  const fullDescriptor = uniqueWords.join(" ");
  const badgeText = `${tempPrefix} • ${saturationBadge} • ${colorName}`;

  return {
    temperature: tempPrefix,
    brightness: prefixQualifier,
    saturation: saturationPhrase,
    hueName: colorName,
    safeNtcName,
    fullDescriptor,
    badgeText
  };
}

function hexToNaturalColorName(hex) {
  const result = decomposeColorToPromptTokens(hex);
  return result.fullDescriptor || "";
}

// Global Settings State (Shared by SDXL & FLUX + FLUX LoRA Modifier)
let globalState = {
  sharedStyle: "clean matte studio lookdev, minimalist commercial studio photography",
  fluxPrefix: "a photo in apple minimal craft style of",
  camera: "top-down flat lay view",
  lighting: "crisp directional studio spotlight from top-right at shallow 25-degree angle casting hard crisp drop shadows starting flush from the base with zero gap, zero floating, photorealistic commercial lookdev",
  lightingAzimuth: 45,
  lightingElevation: 25,
  shadowStyle: "auto",
  subjectType: "professional luxury skincare cosmetic swatches",
  bgDesc: "clean warm neutral off-white matte studio tabletop surface, seamless non-reflective finish, zero glare",
  bgMaterial: "clean matte studio tabletop surface",
  bgFinish: "seamless non-reflective finish, zero glare",
  bgMF: "clean matte studio tabletop surface, seamless non-reflective finish, zero glare",
  bgColor: "#f4f2ee",
  bgColorDesc: "warm neutral pale luminous off-white porcelain tone",
  useP0Image: true,
  useP0PosText: true,
  useP0NegText: false,
  p0ImageWeight: 0.95,
  p0PromptWeight: 1.00,
  useSdxlLora: false,
  sdxlLoraStrength: 0.95,
  p0NegativePrompt: "text, watermark, typography, logo, signature, letters, words, font, label, brand, sphere, perfect ball, 3D sphere, floating, hovering, levitating, airborne, detached shadow, gap beneath object, light bleed at contact base, sticker cutout, paper cutout, flat sticker, soap, rubber, silicone, plastic, metal, cracks, dry clay, wrinkled, pimples, blurry, noisy, low quality",
  negative: "text, watermark, typography, logo, signature, letters, words, font, label, brand, symbol, sphere, perfect ball, 3D sphere, floating, hovering, levitating, airborne, detached shadow, gap beneath object, light bleed at contact base, sticker cutout, paper cutout, flat sticker, 2D vector, soap, soap bar, soapy, rubber, silicone, latex, polymer, wax, solid plastic, plastic toy, metal, metallic, chrome, gadget, electronics, pimples, blemishes, stray drops, splatters, scattered droplets, side view, angled perspective, blurry, noisy, low quality, distorted, bad reflections, overexposed",
  depthStrength: 0.30,
  depthStart: 0.0,
  depthEnd: 0.35,
  normalStrength: 0.20,
  normalStart: 0.0,
  normalEnd: 0.35,
  sdxlCfg: 5.5,
  sdxlDenoise: 1.0,
  fluxCfg: 1.0,
  fluxLoraWeight: 0.55,
  fluxGuidance: 2.8,
  fluxDenoise: 0.21,
  depthPassFile: "Depth.png",
  normalPassFile: "Normal.png",
  p0MaskFile: "Mask_00.png",
  guideSlots: [
    { file: "Color.png", label: "Color Pass / Swatch Placement" },
    { file: "Normal.png", label: "Surface Normal Map" },
    { file: "Depth.png", label: "3D Depth Distance" }
  ],
  stage1Engine: localStorage.getItem("spatial_stage1_engine") || "vlm",
  seed: 7
};

// Swatch CMF Default Presets (Strict VCMF: Volume / Form, Color, Material / Substance, Finish / Surface)
const DOMAIN_PRESETS = {
  cosmetics: [
    {
      imageSrc: "",
      volume: "thick dollop of dense cosmetic balm, substantial volumetric convex mound resting firmly on tabletop surface",
      color: "#8b3a2b",
      colorDesc: "warm dark terracotta chocolate tone",
      mf: "terracotta cosmetic clay paste swatch, dense homogeneous spreadable paste with tactile ultra-matte finish",
      material: "dense organic cosmetic clay balm",
      finish: "ultra-smooth buttery texture, soft satin matte finish, no particles"
    },
    {
      imageSrc: "",
      volume: "thick dollop of sculpted cosmetic cream, volumetric raised sculptural peak resting firmly on tabletop surface",
      color: "#f8fafc",
      colorDesc: "clean bright snow white tone",
      mf: "dense whipped cosmetic cream dollop, rich buttery spatula swirl ridges with soft satin sheen",
      material: "dense whipped facial cream, smooth spatula swirl ridges",
      finish: "rich buttery texture with spatula ridges, luxurious satin glow"
    },
    {
      imageSrc: "",
      volume: "viscous translucent fluid droplet, volumetric high-domed rounded droplet resting firmly on tabletop surface",
      color: "#ec4899",
      colorDesc: "cool vibrant rose magenta tone",
      mf: "clear translucent cosmetic gel droplet, pure viscous fluid with glossy surface reflection and high refractive luster",
      material: "translucent hydrating cosmetic jelly serum droplet",
      finish: "glossy wet look, dewy luminous sheen with sparkling light reflections"
    },
    {
      imageSrc: "",
      volume: "thick dollop of dense cosmetic balm, substantial volumetric convex mound resting firmly on tabletop surface",
      color: "#657e4e",
      colorDesc: "warm muted matcha sage green tone",
      mf: "soothing botanical cosmetic paste, completely smooth silky refined cream paste with clean natural matte finish",
      material: "smooth soothing botanical cream paste, fine herbal suspension",
      finish: "smooth silky refined texture, soft organic matte finish, no grains"
    },
    {
      imageSrc: "",
      volume: "viscous translucent fluid droplet, volumetric high-domed rounded droplet resting firmly on tabletop surface",
      color: "#d97706",
      colorDesc: "warm golden honey amber tone",
      mf: "translucent cosmetic melting balm, rich golden honey viscous texture with luminous glowing gloss finish",
      material: "translucent facial melting balm, viscous glowing gel",
      finish: "glowing warm radiant luster, dewy glistening melted texture"
    },
    {
      imageSrc: "",
      volume: "smooth continuous cosmetic smear, flat ribbon stroke adhering to tabletop surface",
      color: "#f59e0b",
      colorDesc: "warm peach beige tone",
      mf: "smooth liquid foundation cosmetic swatch, velvety skincare makeup smear with soft-focus blurring semi-matte finish",
      material: "smooth liquid foundation, high-coverage cosmetic smear",
      finish: "soft velvety matte powdery finish, flawless cosmetic makeup texture"
    }
  ],

  hardware: [
    {
      imageSrc: "",
      color: "#475569",
      colorDesc: "cool space gray tone",
      material: "anodized aluminum metal chassis",
      finish: "fine sandblasted micro grain, crisp chamfered edge highlights, clean matte surface"
    },
    {
      imageSrc: "",
      color: "#cbd5e1",
      colorDesc: "cool light silver aluminum tone",
      material: "precision CNC milled brushed titanium enclosure",
      finish: "precision cnc milled edge, subtle metallic sheen, pristine clean geometry"
    },
    {
      imageSrc: "",
      color: "#1e1b4b",
      colorDesc: "deep dark navy ocean blue tone",
      material: "optical sapphire crystal glass lens",
      finish: "antireflective coating, clean sharp specular reflections, glossy polished finish"
    },
    {
      imageSrc: "",
      color: "#334155",
      colorDesc: "cool dark graphite titanium tone",
      material: "tactile knurled aluminum digital crown dial",
      finish: "precision micro diamond-cut grooves, clean solid metal"
    },
    {
      imageSrc: "",
      color: "#0f172a",
      colorDesc: "neutral deep space black tone",
      material: "monolithic ceramic shield glass panel",
      finish: "deep mirror gloss, solid monolithic precision manufactured"
    },
    {
      imageSrc: "",
      color: "#1e3a8a",
      colorDesc: "cool deep navy ocean blue tone",
      material: "smooth molded fluoroelastomer soft-touch surface",
      finish: "clean molded edges, velvety premium silicone finish"
    }
  ]
};

// Active Swatch List
let activeSwatches = JSON.parse(JSON.stringify(DOMAIN_PRESETS.cosmetics));
let currentShot = 1;
let currentMainTab = "global";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  if (typeof ntc !== "undefined" && ntc.init) {
    ntc.init();
  }

  document.getElementById("global-style-header").value = globalState.sharedStyle;
  document.getElementById("flux-specific-prefix").value = globalState.fluxPrefix;
  document.getElementById("global-camera-text").value = globalState.camera;
  document.getElementById("global-lighting-text").value = globalState.lighting;
  document.getElementById("global-subject-type").value = globalState.subjectType;
  
  const gP0ColorDesc = document.getElementById("global-p0-color-desc");
  if (gP0ColorDesc) gP0ColorDesc.value = globalState.bgColorDesc || hexToNaturalColorName(globalState.bgColor || "#f4f2ee");
  const gP0Picker = document.getElementById("global-bg-color-picker");
  if (gP0Picker) gP0Picker.value = globalState.bgColor || "#f4f2ee";
  const gP0Text = document.getElementById("global-bg-color-text");
  if (gP0Text) gP0Text.value = globalState.bgColor || "#f4f2ee";
  const gP0Mat = document.getElementById("global-p0-mat-text");
  if (gP0Mat) gP0Mat.value = globalState.bgMaterial || "clean matte studio tabletop surface";
  const gP0Fin = document.getElementById("global-p0-finish-text");
  if (gP0Fin) gP0Fin.value = globalState.bgFinish || "seamless non-reflective finish, zero glare";

  document.getElementById("global-negative-textarea").value = globalState.negative;

  renderSwatchRows();
  onLightAngleSliderChange(false);
  onBgColorChange(globalState.bgColor);
  syncComfyParamsToUI();
  updateSynthesizer();
  init3DRelightViewer();
  fetchPresetsList(true);

  // Restore ComfyUI Parameters collapsed state
  const isParamsCollapsed = localStorage.getItem("comfy_params_collapsed") === "true";
  if (isParamsCollapsed) {
    toggleComfyParamsCollapse(true);
  }

  setTimeout(() => {
    document.querySelectorAll(".cmf-textarea, .color-desc-textarea").forEach(el => autoResize(el));
  }, 100);
});

// ComfyUI Parameters Real-time State & UI Handlers
function onComfyParamChange(paramKey, value) {
  if (typeof value === "boolean") {
    globalState[paramKey] = value;
    updateComfyParamsSummaryBadge();
    return;
  }
  const num = parseFloat(value);
  if (!isNaN(num)) {
    globalState[paramKey] = num;
    updateComfyParamsSummaryBadge();
  }
}

// ==========================================================================
// ComfyUI Top Parameters Banner Expand / Collapse Controller
// ==========================================================================

function updateComfyParamsSummaryBadge() {
  const summaryEl = document.getElementById("comfy-params-collapsed-summary");
  if (!summaryEl) return;
  const lora = globalState.fluxLoraWeight !== undefined ? globalState.fluxLoraWeight : 0.55;
  const guid = globalState.fluxGuidance !== undefined ? globalState.fluxGuidance : 2.8;
  const denoise = globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.21;
  const seed = globalState.seed !== undefined ? globalState.seed : 7;
  summaryEl.textContent = `LoRA: ${lora} | Guidance: ${guid} | Denoise: ${denoise} | Seed: ${seed}`;
}

function toggleComfyParamsCollapse(forceState) {
  const banner = document.getElementById("comfy-params-banner");
  const btn = document.getElementById("btn-toggle-comfy-collapse");
  const summaryEl = document.getElementById("comfy-params-collapsed-summary");
  if (!banner) return;

  const isCurrentlyCollapsed = banner.classList.contains("collapsed");
  const shouldCollapse = (typeof forceState === "boolean") ? forceState : !isCurrentlyCollapsed;

  if (shouldCollapse) {
    banner.classList.add("collapsed");
    if (btn) btn.textContent = "▼ 펼치기";
    if (summaryEl) {
      updateComfyParamsSummaryBadge();
      summaryEl.style.display = "inline-flex";
    }
    localStorage.setItem("comfy_params_collapsed", "true");
  } else {
    banner.classList.remove("collapsed");
    if (btn) btn.textContent = "▲ 접기";
    if (summaryEl) summaryEl.style.display = "none";
    localStorage.setItem("comfy_params_collapsed", "false");
  }
}

function onP0WeightChange(weightKey, value) {
  const num = parseFloat(value);
  if (!isNaN(num)) {
    globalState[weightKey] = num;
  }
}

function onSwatchWeightChange(swatchIdx, weightKey, value) {
  const num = parseFloat(value);
  if (!isNaN(num) && activeSwatches[swatchIdx]) {
    activeSwatches[swatchIdx][weightKey] = num;
  }
}

function syncComfyParamsToUI() {
  const mapping = {
    "param-depth-strength": globalState.depthStrength !== undefined ? globalState.depthStrength : 0.30,
    "param-depth-start": globalState.depthStart !== undefined ? globalState.depthStart : 0.0,
    "param-depth-end": globalState.depthEnd !== undefined ? globalState.depthEnd : 0.35,
    "param-normal-strength": globalState.normalStrength !== undefined ? globalState.normalStrength : 0.20,
    "param-normal-start": globalState.normalStart !== undefined ? globalState.normalStart : 0.0,
    "param-normal-end": globalState.normalEnd !== undefined ? globalState.normalEnd : 0.35,
    "param-sdxl-lora-strength": globalState.sdxlLoraStrength !== undefined ? globalState.sdxlLoraStrength : 0.95,
    "param-sdxl-cfg": globalState.sdxlCfg !== undefined ? globalState.sdxlCfg : 5.5,
    "param-sdxl-denoise": globalState.sdxlDenoise !== undefined ? globalState.sdxlDenoise : 1.0,
    "param-flux-cfg": globalState.fluxCfg !== undefined ? globalState.fluxCfg : 1.0,
    "param-flux-lora-weight": globalState.fluxLoraWeight !== undefined ? globalState.fluxLoraWeight : 0.55,
    "param-flux-guidance": globalState.fluxGuidance !== undefined ? globalState.fluxGuidance : 2.8,
    "param-flux-denoise": globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.21,
    "p0-image-weight": globalState.p0ImageWeight !== undefined ? globalState.p0ImageWeight : 0.95,
    "p0-prompt-weight": globalState.p0PromptWeight !== undefined ? globalState.p0PromptWeight : 1.00
  };
  for (const [elemId, val] of Object.entries(mapping)) {
    const el = document.getElementById(elemId);
    if (el) el.value = val;
  }
  const loraToggle = document.getElementById("param-sdxl-lora-toggle");
  if (loraToggle) loraToggle.checked = !!globalState.useSdxlLora;
  updateComfyParamsSummaryBadge();
}

function resetComfyParamsToDefault() {
  globalState.depthStrength = 0.30;
  globalState.depthStart = 0.0;
  globalState.depthEnd = 0.35;
  globalState.normalStrength = 0.20;
  globalState.normalStart = 0.0;
  globalState.normalEnd = 0.35;
  globalState.useSdxlLora = false;
  globalState.sdxlLoraStrength = 0.95;
  globalState.sdxlCfg = 5.5;
  globalState.sdxlDenoise = 1.0;
  globalState.fluxCfg = 1.0;
  globalState.fluxLoraWeight = 0.55;
  globalState.fluxGuidance = 2.8;
  globalState.fluxDenoise = 0.21;
  globalState.p0ImageWeight = 0.95;
  globalState.p0PromptWeight = 1.00;
  syncComfyParamsToUI();
  updateComfyParamsSummaryBadge();
  showToast("🔄 Reset ComfyUI parameters to default values");
}

// Switch Main Top Tabs: Master Builder vs Swatch CMF
function switchMainTab(tabKey) {
  currentMainTab = tabKey;
  document.getElementById("nav-global").classList.toggle("active", tabKey === "global");
  document.getElementById("nav-cmf").classList.toggle("active", tabKey === "cmf");

  document.getElementById("view-global").classList.toggle("active", tabKey === "global");
  document.getElementById("view-cmf").classList.toggle("active", tabKey === "cmf");

  // Trigger resize on visible textareas
  setTimeout(() => {
    document.querySelectorAll(".cmf-textarea, .color-desc-textarea").forEach(el => autoResize(el));
  }, 50);
}

// Load Domain Quick Themes
function loadDomainTheme(domainKey) {
  document.getElementById("theme-cosmetics").classList.toggle("active", domainKey === "cosmetics");
  document.getElementById("theme-hardware").classList.toggle("active", domainKey === "hardware");

  if (domainKey === "cosmetics") {
    globalState.subjectType = "professional luxury skincare cosmetic swatches";
    globalState.bgMaterial = "clean matte studio tabletop surface";
    globalState.bgFinish = "seamless non-reflective finish, zero glare";
    globalState.sharedStyle = "clean matte studio lookdev, minimalist commercial studio photography";
    globalState.fluxPrefix = "a photo in apple minimal craft style of";
    globalState.bgColor = "#f4f2ee";
    globalState.bgColorDesc = "warm neutral off-white tone";
  } else {
    globalState.subjectType = "precision industrial design hardware components";
    globalState.bgMaterial = "anodized aluminum plate surface";
    globalState.bgFinish = "fine sandblasted matte finish, clean edge highlights";
    globalState.sharedStyle = "precision industrial design lookdev, bead-blasted studio photography";
    globalState.fluxPrefix = "a photo in apple minimal craft style of";
    globalState.bgColor = "#dce0e6";
    globalState.bgColorDesc = "cool light silver aluminum tone";
  }

  document.getElementById("global-style-header").value = globalState.sharedStyle;
  document.getElementById("global-subject-type").value = globalState.subjectType;
  document.getElementById("flux-specific-prefix").value = globalState.fluxPrefix;

  const gP0ColorDesc = document.getElementById("global-p0-color-desc");
  if (gP0ColorDesc) gP0ColorDesc.value = globalState.bgColorDesc;
  const gP0Picker = document.getElementById("global-bg-color-picker");
  if (gP0Picker) gP0Picker.value = globalState.bgColor;
  const gP0Text = document.getElementById("global-bg-color-text");
  if (gP0Text) gP0Text.value = globalState.bgColor;
  const gP0Mat = document.getElementById("global-p0-mat-text");
  if (gP0Mat) gP0Mat.value = globalState.bgMaterial;
  const gP0Fin = document.getElementById("global-p0-finish-text");
  if (gP0Fin) gP0Fin.value = globalState.bgFinish;

  syncBgDescFromCMF();

  activeSwatches = JSON.parse(JSON.stringify(DOMAIN_PRESETS[domainKey]));
  renderSwatchRows();
  updateSynthesizer();
  showToast(`Loaded ${domainKey.toUpperCase()} theme`);
}

// Render All Swatch Rows in CMF Manager Table (P1 ~ P6 Swatches)
function renderSwatchRows() {
  const container = document.getElementById("cmf-rows-container");
  container.innerHTML = "";

  // Render P1 ~ P6 Swatch Rows (P0 Floor is permanently on Card 0 at the top)
  activeSwatches.forEach((swatch, idx) => {
    const partNum = String(idx + 1).padStart(2, "0");
    const activeMask = swatch.maskFile || `Mask_${partNum}.png`;
    const shotStr = String(currentShot).padStart(4, "0");
    const maskUrl = `${getAssetBaseUrl()}/${shotStr}/${activeMask}?v=${Date.now()}`;
    const rowPrompt = buildSwatchPromptText(idx);
    const colorDesc = swatch.colorDesc || hexToNaturalColorName(swatch.color);
    const isImgEnabled = swatch.useImage !== false;
    const isPosTxtEnabled = swatch.usePosText !== false;
    const isNegTxtEnabled = !!swatch.useNegText;

    const row = document.createElement("div");
    row.className = "cmf-row";
    row.id = `cmf-row-${idx}`;

    row.innerHTML = `
      <!-- Row Header Bar: Part Tag + Mode Toggles on Left, Actions on Right -->
      <div class="cmf-row-header">
        <div class="cmf-row-header-left">
          <span class="part-tag" title="${activeMask}">P${idx + 1}</span>
          <span style="font-size:11.5px;font-weight:700;color:#f1f5f9;letter-spacing:0.3px;">Swatch ${idx + 1}</span>
          <!-- Mode Toggles for Swatch -->
          <div class="mode-toggle-group">
            <label class="toggle-chip ${isImgEnabled ? 'active-img' : ''}" id="toggle-img-chip-${idx}">
              <input type="checkbox" id="use-image-toggle-${idx}" ${isImgEnabled ? 'checked' : ''} onchange="toggleSwatchUseImage(${idx}, this.checked)">
              <span>📸 Use Image</span>
            </label>
            <label class="toggle-chip ${isPosTxtEnabled ? 'active-pos' : ''}" id="toggle-pos-chip-${idx}">
              <input type="checkbox" id="use-pos-toggle-${idx}" ${isPosTxtEnabled ? 'checked' : ''} onchange="toggleSwatchUsePosText(${idx}, this.checked)">
              <span>✍️ Use Pos Script</span>
            </label>
            <label class="toggle-chip ${isNegTxtEnabled ? 'active-neg' : ''}" id="toggle-neg-chip-${idx}">
              <input type="checkbox" id="use-neg-toggle-${idx}" ${isNegTxtEnabled ? 'checked' : ''} onchange="toggleSwatchUseNegText(${idx}, this.checked)">
              <span>🚫 Use Neg Script</span>
            </label>
          </div>

          <!-- Swatch IPAdapter & Script Weights -->
          <div class="weights-control-group" id="swatch-weights-group-${idx}">
            <div class="weight-item" title="P${idx + 1} IPAdapter Image Weight (Default: 0.95)">
              <label for="swatch-img-weight-${idx}">Img W</label>
              <input type="number" id="swatch-img-weight-${idx}" min="0.0" max="2.0" step="0.05" value="${swatch.imageWeight !== undefined ? swatch.imageWeight : 0.95}" oninput="onSwatchWeightChange(${idx}, 'imageWeight', this.value)">
            </div>
            <div class="weight-item weight-prompt" title="P${idx + 1} Prompt Weight / Mask Strength (Default: 1.00)">
              <label for="swatch-prompt-weight-${idx}">Txt W</label>
              <input type="number" id="swatch-prompt-weight-${idx}" min="0.0" max="2.0" step="0.05" value="${swatch.promptWeight !== undefined ? swatch.promptWeight : 1.00}" oninput="onSwatchWeightChange(${idx}, 'promptWeight', this.value)">
            </div>
          </div>
        </div>

        <!-- Row Header Actions: Move Up/Down, Duplicate & Delete -->
        <div class="cmf-row-header-right">
          <div class="reorder-btn-group">
            <button class="btn-row-action btn-reorder" onclick="moveSwatchRow(${idx}, -1)" ${idx === 0 ? "disabled" : ""} title="Move Up (Swap with P${idx})">
              <span>▲</span>
            </button>
            <button class="btn-row-action btn-reorder" onclick="moveSwatchRow(${idx}, 1)" ${idx === activeSwatches.length - 1 ? "disabled" : ""} title="Move Down (Swap with P${idx + 2})">
              <span>▼</span>
            </button>
          </div>
          <button class="btn-row-action" onclick="duplicateSwatchRow(${idx})" title="Duplicate this swatch row">
            <span>📋 Dup</span>
          </button>
          <button class="btn-row-action btn-del" onclick="deleteSwatchRow(${idx})" title="Delete this swatch row">
            <span>🗑️</span>
          </button>
        </div>
      </div>

      <div class="cmf-inputs-grid">
        <!-- Col 0: 3D Mask Pass Selector (Left of Ref Image) -->
        <div class="col-mask" id="col-mask-${idx}">
          <div class="mask-select-box" title="P${idx + 1} 3D Spatial Mask (${activeMask})">
            <img id="mask-preview-${idx}" src="${maskUrl}" alt="Mask P${idx + 1}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'80\\' height=\\'84\\' fill=\\'%23111\\'><rect width=\\'80\\' height=\\'84\\'/><text x=\\'50%25\\' y=\\'50%25\\' fill=\\'%23a855f7\\' font-size=\\'10\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${activeMask}</text></svg>'">
          </div>
          <select class="mask-select-dropdown" id="mask-select-${idx}" onchange="onSwatchMaskSelectChange(${idx}, this.value)" title="Choose Mask pass for P${idx + 1}">
            <option value="Mask_00.png" ${activeMask === 'Mask_00.png' ? 'selected' : ''}>Mask 00</option>
            <option value="Mask_01.png" ${activeMask === 'Mask_01.png' ? 'selected' : ''}>Mask 01</option>
            <option value="Mask_02.png" ${activeMask === 'Mask_02.png' ? 'selected' : ''}>Mask 02</option>
            <option value="Mask_03.png" ${activeMask === 'Mask_03.png' ? 'selected' : ''}>Mask 03</option>
            <option value="Mask_04.png" ${activeMask === 'Mask_04.png' ? 'selected' : ''}>Mask 04</option>
            <option value="Mask_05.png" ${activeMask === 'Mask_05.png' ? 'selected' : ''}>Mask 05</option>
            <option value="Mask_06.png" ${activeMask === 'Mask_06.png' ? 'selected' : ''}>Mask 06</option>
          </select>
        </div>

        <!-- Col 1: Ref Image Upload / Preview (Expanded Visual Box) -->
        <div class="col-img ${!isImgEnabled ? 'cmf-section-disabled' : ''}" id="col-img-${idx}">
          <div class="img-upload-box" onclick="triggerImageUpload(${idx})" title="Click to upload P${idx + 1} reference image">
            ${swatch.imageSrc ? `<img src="${swatch.imageSrc}" alt="Ref P${idx + 1}">` : `<span class="img-upload-placeholder">🖼️</span>`}
            <input type="file" id="file-input-${idx}" class="file-input-hidden" accept="image/*" onchange="handleImageFile(${idx}, event)">
          </div>
          <span class="img-upload-hint">1K Ref</span>
        </div>

        <!-- [V] Volume (Form / Mound) with Dropdown -->
        <div class="col-volume ${(!isPosTxtEnabled || swatch.isCustomPrompt) ? 'cmf-section-disabled' : ''}" id="col-vol-${idx}">
          <select class="volume-preset-select" onchange="onVolumeSelectChange(${idx}, this.value)" title="Choose quick volume / mound shape preset">
            <option value="">⚡ Volume / Form...</option>
            <option value="swiped cosmetic cream smear with thin smooth concave center and thick raised accumulated outer ridges, fluid pooling along edges, dimensional tactile smear resting firmly on tabletop surface">⭐ 1. Center Smear & Raised Outer Ridges (가운데 얇은 스미어 & 테두리 도톰 릿지 - 강추)</option>
            <option value="diagonal cosmetic cream smear tapering from thin translucent start to a thick raised dimensional edge ridge resting firmly on tabletop surface">⭐ 2. Tapered Smear with Thick Trailing Edge (스패출러 끝 도톰 둔덕)</option>
            <option value="smooth thin diagonal smear of creamy liquid, flat continuous layer adhering flush to tabletop surface with soft feathered edges">3. Thin Creamy Liquid Smear (얇게 펴 바른 리퀴드 스미어)</option>
            <option value="flat pressed cosmetic powder swatch, single flat swipe mark with crushed crumbly texture and textured powdery edges, flat matte finish spread flush on tabletop surface">4. Flat Crushed Powder Smear (납작하게 부서진 파우더 스미어)</option>
            <option value="thick dollop of dense cosmetic balm, substantial volumetric convex mound resting firmly on tabletop surface">5. Volumetric Convex Mound (도톰한 볼록 둔덕)</option>
            <option value="thick dollop of sculpted cosmetic cream, volumetric raised sculptural peak resting firmly on tabletop surface">6. Sculptural Peak (조각 같은 입체 피크)</option>
            <option value="viscous translucent fluid droplet, volumetric high-domed rounded droplet resting firmly on tabletop surface">7. Rounded Fluid Dome (도톰한 구형 돔 방울)</option>
          </select>
          <textarea class="cmf-textarea" id="volume-text-${idx}" list="volume-suggestions" placeholder="Volume / form (shape)..." oninput="autoResize(this); onVolumeChange(${idx}, this.value)">${escapeHtml(swatch.volume || 'thick dollop of dense cosmetic balm, substantial volumetric convex mound resting firmly on tabletop surface')}</textarea>
        </div>

        <!-- [C] Color (Textarea on top, picker & quick dots below) -->
        <div class="col-color ${(!isPosTxtEnabled || swatch.isCustomPrompt) ? 'cmf-section-disabled' : ''}" id="col-col-${idx}">
          <textarea class="color-desc-textarea" id="color-desc-${idx}" placeholder="Color prompt..." oninput="autoResize(this); onColorDescChange(${idx}, this.value)">${escapeHtml(colorDesc)}</textarea>
          <div class="color-picker-row">
            <input type="color" class="color-picker-input" value="${swatch.color}" oninput="onColorPickerChange(${idx}, this.value)" onchange="onColorPickerChange(${idx}, this.value)">
            <input type="text" class="color-text-input" value="${swatch.color}" placeholder="#RRGGBB" oninput="onColorTextChange(${idx}, this.value)" onchange="onColorTextChange(${idx}, this.value)">
          </div>
          <div class="quick-swatch-dots">
            <span class="swatch-dot" style="background:#dc2626" title="Crimson Red" onclick="onColorPickerChange(${idx}, '#dc2626')"></span>
            <span class="swatch-dot" style="background:#ea580c" title="Terracotta Coral" onclick="onColorPickerChange(${idx}, '#ea580c')"></span>
            <span class="swatch-dot" style="background:#d4af37" title="Champagne Gold" onclick="onColorPickerChange(${idx}, '#d4af37')"></span>
            <span class="swatch-dot" style="background:#657e4e" title="Sage Olive" onclick="onColorPickerChange(${idx}, '#657e4e')"></span>
            <span class="swatch-dot" style="background:#0284c7" title="Cerulean Cyan" onclick="onColorPickerChange(${idx}, '#0284c7')"></span>
            <span class="swatch-dot" style="background:#1e40af" title="Cobalt Royal Blue" onclick="onColorPickerChange(${idx}, '#1e40af')"></span>
            <span class="swatch-dot" style="background:#7c3aed" title="Violet Purple" onclick="onColorPickerChange(${idx}, '#7c3aed')"></span>
            <span class="swatch-dot" style="background:#f4f2ee" title="Off-White Cream" onclick="onColorPickerChange(${idx}, '#f4f2ee')"></span>
          </div>
        </div>

        <!-- [MF] Material & Finish (Texture, Refraction & Luster) with Pull-down Menu -->
        <div class="col-mf ${(!isPosTxtEnabled || swatch.isCustomPrompt) ? 'cmf-section-disabled' : ''}" id="col-mf-${idx}">
          <select class="mf-preset-select" onchange="onMFSelectChange(${idx}, this.value)" title="Choose quick Material & Finish preset">
            <option value="">⚡ Material & Finish (풀다운 제형 선택)...</option>
            <optgroup label="🧴 1. Creams & Whipped (크림 & 휘핑 영양 제형)">
              <option value="smooth cosmetic cream swatch, viscous smooth texture with creamy tactile surface and velvety smooth finish">1-1. Silky Cosmetic Cream & Velvety (실키 영양 크림 & 벨벳 마감)</option>
              <option value="dense whipped cosmetic cream dollop, rich buttery spatula swirl ridges with soft satin sheen">1-2. Dense Whipped Cream & Spatula Ridges (고밀도 휘핑 크림 & 스패출러 결)</option>
              <option value="comb textured cosmetic cream swatch, organic precise parallel comb ridges with elegant creamy luster">1-3. Comb-Textured Cream & Ridges (빗살 결 크림 & 조각 릿지)</option>
              <option value="rich soufflé cosmetic cream paste, airy soft-pillowy texture with delicate smooth barrier finish">1-4. Rich Soufflé Cream & Cloud Luster (수플레 크림 & 구름 윤광)</option>
            </optgroup>
            <optgroup label="🍯 2. Melting Balms & Nectars (농밀 멜팅 밤 & 넥타 제형)">
              <option value="translucent cosmetic melting balm, rich golden honey viscous texture with luminous glowing gloss finish">2-1. Translucent Melting Honey Balm (반투명 멜팅 허니 밤 & 고광택)</option>
              <option value="dense nourishing cosmetic oil balm, soft-solid lipid texture with melting high-gloss surface reflection">2-2. Nourishing Solid Oil Balm (고영양 오일 밤 & 체온 멜팅)</option>
              <option value="silky ceramide barrier balm paste, dense homogeneous texture with protective semi-gloss satin finish">2-3. Ceramide Barrier Balm (세라마이드 장벽 밤 & 새틴 씰)</option>
            </optgroup>
            <optgroup label="🔮 3. Translucent & Optical Refraction (반투명 & 빛 굴절/투명 젤 제형)">
              <option value="optically clear glass lip glaze cosmetic swatch, high-refractive viscous syrup with intense optical refraction, magnifying lens distortion of tabletop below, specular caustic highlights and pristine mirror gloss finish">3-1. High-Refractive Glass Glaze (고굴절 유리알 립 글레이즈 - 돋보기 굴절)</option>
              <option value="translucent golden amber cosmetic honey nectar, rich viscous fluid with deep optical refraction and internal light scattering, glowing subsurface amber caustic highlights with luminous high-shine finish">3-2. Amber Honey Nectar with Optical Depth (심도 굴절 골든 앰버 넥타 - 내부 산란광)</option>
              <option value="crystal clear hyaluronic water ampoule droplet, high-domed fluid lens with crisp optical refraction, sharp light bending rim edges, pure transparent water-clear finish with brilliant point specular highlights">3-3. Hyaluronic Water-Ampoule Droplet (크리스탈 수분 앰플 드롭 - 표면장력 렌즈)</option>
              <option value="semi-translucent frosted sorbet gel-cream cosmetic swatch, soft milky translucent texture with internal subsurface scattering, subtle optical light diffusion and dewy luminous satin-gloss finish">3-4. Frosted Sorbet Gel-Cream (반투명 프로스티드 소르베 - 은은한 속광)</option>
              <option value="translucent opalescent peptide gel serum droplet, high-refractive viscous fluid with subtle prismatic light refraction, glowing crystal-clear depth and wet refractive glassy finish">3-5. Opalescent Peptide Gel (오팔 프리즘 펩타이드 젤 - 젖은 유리알)</option>
              <option value="clear translucent cosmetic gel droplet, pure viscous fluid with glossy surface reflection and high refractive luster">3-6. Translucent Hydrating Gel Droplet (맑은 수분 젤 방울 & 유리알 광택)</option>
            </optgroup>
            <optgroup label="💥 4. Crushed Pigments & Dry Clay (부서진 피그먼트 가루 & 클레이 제형)">
              <option value="crushed mineral cosmetic pigment swatch, textured broken chunks and crumbly powder clumps with fine scattered mineral dust, velvety dry tactile texture, soft chalky matte finish with crisp fractured edges">4-1. Crushed Mineral Pigment Clumps (부서진 압축 피그먼트 덩어리 & 파우더 더스트)</option>
              <option value="fractured baked terracotta cosmetic pigment cake, dry crumbly mineral chunks with sharp broken fracture edges, porous granular earthy texture and ultra-matte dry clay finish">4-2. Fractured Baked Terracotta Tablet (균열된 테라코타 파우더 정제 & 파쇄 단면)</option>
              <option value="loose cosmetic pigment clump swatch, soft clumpy powder mound with delicate micro-powder fallout, dense saturated color payoff with rich velvety soft-focus matte luster">4-3. Loose Velvet Pigment Clumps (벨벳 고발색 루스 피그먼트 & 포슬포슬 가루)</option>
              <option value="crumbled metallic shimmer cosmetic pigment bar, chunky reflective foil flakes with fine luminous pearl dusting, multidimensional metallic luster with dry crumbly tactile surface">4-4. Crumbled Metallic Shimmer Flakes (부서진 메탈릭 쉬머 호일 & 펄 파편)</option>
              <option value="terracotta cosmetic clay paste swatch, dense homogeneous spreadable paste with tactile ultra-matte finish">4-5. Terracotta Clay Paste (매끄러운 테라코타 클레이 밤 - 균일 무광)</option>
              <option value="rich mineral cosmetic mud mask swatch, dense organic spreadable clay with soft earthy semi-matte finish">4-6. Deep Mineral Mud Mask (딥 미네랄 머드 마스크 - 촉각 새틴)</option>
              <option value="soothing botanical cosmetic paste, completely smooth silky refined cream paste with clean natural matte finish">4-7. Soothing Botanical Paste (진정 보태니컬 허브 페이스트 - 클린 무광)</option>
            </optgroup>
            <optgroup label="🎨 5. Foundations & Emulsions (파운데이션 & 로션 제형)">
              <option value="smooth liquid foundation cosmetic swatch, velvety skincare makeup smear with soft-focus blurring semi-matte finish">5-1. Liquid Foundation (실키 리퀴드 파운데이션 - 소프트포커스)</option>
              <option value="velvet matte foundation paste, high-coverage poreless liquid makeup smear with pure refined matte finish">5-2. Velvet Matte Foundation (벨벳 매트 고밀착 파운데이션 - 무모공 매트)</option>
              <option value="silky nourishing cosmetic lotion emulsion, soft spreadable fluid texture with natural healthy dewy sheen">5-3. Silky Nourishing Lotion (실키 영양 에멀전 - 촉촉한 윤광)</option>
            </optgroup>
            <optgroup label="✨ 6. Pearlescent & Shimmer (진주빛 펄 & 쉬머 제형)">
              <option value="thick pearlescent cosmetic cream swirl, glossy ribbon curve with soft ambient specular highlights and pearl luster">6-1. Pearlescent Cream Swirl (진주빛 펄 크림 스월 & 글로시 리본)</option>
              <option value="gold shimmering cosmetic gel swatch, glossy translucent fluid with ultra-fine luminous pearl particles and radiant finish">6-2. Gold Shimmering Gel (골드 쉬머 젤 & 미세 펄 반사)</option>
            </optgroup>
          </select>
          <textarea class="cmf-textarea" id="mf-text-${idx}" placeholder="Material & finish keywords (CMF)..." oninput="autoResize(this); onMFChange(${idx}, this.value)">${escapeHtml(swatch.mf || [swatch.material, swatch.finish].filter(Boolean).join(', ') || '')}</textarea>
        </div>
      </div>

      <!-- Separated Positive Script Editor Layout: Left Side Control Panel + Right Main Editor -->
      <div class="row-prompt-preview-bar ${!isPosTxtEnabled ? 'cmf-section-disabled' : ''}" id="row-prompt-bar-${idx}">
        <!-- Left Side Control Panel (P1 Badge + Edit) -->
        <div class="prompt-side-control">
          <span class="prompt-badge-tiny">✨ P${idx + 1} Pos</span>
          <label class="custom-prompt-toggle" title="Directly edit custom positive prompt for P${idx + 1}">
            <input type="checkbox" id="custom-prompt-toggle-${idx}" ${swatch.isCustomPrompt ? 'checked' : ''} onchange="toggleCustomPrompt(${idx}, this.checked)">
            <span>✏️ Edit</span>
          </label>
        </div>

        <!-- Right Main Script Editor Area -->
        <div class="prompt-main-editor">
          <div id="swatch-prompt-container-${idx}" style="flex: 1; min-width: 0;">
            ${swatch.isCustomPrompt ? `
              <textarea class="custom-prompt-textarea" id="custom-prompt-input-${idx}" rows="2" placeholder="Directly write custom prompt for P${idx + 1}..." oninput="autoResize(this); onCustomPromptChange(${idx}, this.value)">${escapeHtml(swatch.customPrompt || rowPrompt)}</textarea>
            ` : `
              <span class="live-prompt-text" id="live-prompt-${idx}">${escapeHtml(rowPrompt)}</span>
            `}
          </div>
          <button class="btn-copy-inline" onclick="copySwatchPrompt(${idx})" title="Copy P${idx + 1} Positive Prompt">📋 Copy</button>
        </div>
      </div>

      <!-- Separated Negative Script Editor Layout (Hidden by default unless Use Neg Script is checked) -->
      <div class="row-prompt-preview-bar neg-row mt-6 ${!isNegTxtEnabled ? 'cmf-section-disabled' : ''}" id="row-neg-prompt-bar-${idx}" style="${!isNegTxtEnabled ? 'display: none;' : ''}">
        <div class="prompt-side-control">
          <span class="prompt-badge-tiny badge-neg">🚫 P${idx + 1} Neg</span>
        </div>

        <div class="prompt-main-editor">
          <textarea class="custom-prompt-textarea neg-textarea" id="swatch-neg-prompt-input-${idx}" rows="2" placeholder="P${idx + 1} Negative prompt..." oninput="autoResize(this); onSwatchNegativePromptChange(${idx}, this.value)">${escapeHtml(swatch.negativePrompt || globalState.negative || '')}</textarea>
          <button class="btn-copy-inline" onclick="copySwatchNegativePrompt(${idx})" title="Copy P${idx + 1} Negative Prompt">📋 Copy</button>
        </div>
      </div>
    `;

    container.appendChild(row);
  });

  // Auto-resize all textareas (CMF, Color, and Custom Prompt Direct Edit) to fit initial content
  document.querySelectorAll(".cmf-textarea, .color-desc-textarea, .custom-prompt-textarea").forEach(el => autoResize(el));
}


function onP0MFSelectChange(presetVal) {
  if (!presetVal) return;
  globalState.bgMF = presetVal;
  globalState.bgMaterial = presetVal.split(",")[0].trim();
  globalState.bgFinish = presetVal.split(",").slice(1).join(",").trim() || "seamless non-reflective finish, zero glare";

  const gTextarea = document.getElementById("global-p0-mf-text");
  if (gTextarea) {
    gTextarea.value = presetVal;
    autoResize(gTextarea);
  }
  const gSelect = document.getElementById("global-p0-mf-select");
  if (gSelect && gSelect.value !== presetVal) gSelect.value = presetVal;

  syncBgDescFromCMF();
  updateSynthesizer();
  showToast("Applied Floor Material & Finish preset");
}

function onP0MFChange(val) {
  globalState.bgMF = val;
  globalState.bgMaterial = val.split(",")[0].trim();
  globalState.bgFinish = val.split(",").slice(1).join(",").trim() || "seamless non-reflective finish, zero glare";

  const gTextarea = document.getElementById("global-p0-mf-text");
  if (gTextarea && gTextarea.value !== val) {
    gTextarea.value = val;
    autoResize(gTextarea);
  }
  syncBgDescFromCMF();
  updateSynthesizer();
}

function onMFSelectChange(idx, presetVal) {
  if (!presetVal) return;
  activeSwatches[idx].mf = presetVal;
  activeSwatches[idx].material = presetVal.split(",")[0].trim();
  activeSwatches[idx].finish = presetVal.split(",").slice(1).join(",").trim() || "soft satin matte finish";
  
  const textarea = document.getElementById(`mf-text-${idx}`);
  if (textarea) {
    textarea.value = presetVal;
    autoResize(textarea);
  }
  updateSynthesizer();
  showToast(`Applied Material & Finish preset to P${idx + 1}`);
}

function onMFChange(idx, val) {
  activeSwatches[idx].mf = val;
  activeSwatches[idx].material = val.split(",")[0].trim();
  activeSwatches[idx].finish = val.split(",").slice(1).join(",").trim() || "soft satin matte finish";
  updateSynthesizer();
}

function onMaterialSelectChange(idx, presetVal) {
  if (!presetVal) return;
  activeSwatches[idx].material = presetVal;
  const textarea = document.getElementById(`material-text-${idx}`);
  if (textarea) {
    textarea.value = presetVal;
    autoResize(textarea);
  }
  updateSynthesizer();
  showToast(`Applied Material preset to P${idx + 1}`);
}

function onP0MaterialSelectChange(presetVal) {
  if (!presetVal) return;
  globalState.bgMaterial = presetVal;

  const textarea = document.getElementById("p0-mat-text");
  if (textarea) {
    textarea.value = presetVal;
    autoResize(textarea);
  }
  const gTextarea = document.getElementById("global-p0-mat-text");
  if (gTextarea) {
    gTextarea.value = presetVal;
    autoResize(gTextarea);
  }
  const gSelect = document.getElementById("global-p0-mat-select");
  if (gSelect && gSelect.value !== presetVal) gSelect.value = presetVal;
  const p0Select = document.querySelector("#cmf-row-p0 select.material-preset-select");
  if (p0Select && p0Select.value !== presetVal) p0Select.value = presetVal;

  syncBgDescFromCMF();
  updateSynthesizer();
  showToast("Applied Floor Material preset");
}

function onFinishSelectChange(idx, presetVal) {
  if (!presetVal) return;
  activeSwatches[idx].finish = presetVal;
  const textarea = document.getElementById(`finish-text-${idx}`);
  if (textarea) {
    textarea.value = presetVal;
    autoResize(textarea);
  }
  updateSynthesizer();
  showToast(`Applied Finish preset to P${idx + 1}`);
}

function onP0FinishSelectChange(presetVal) {
  if (!presetVal) return;
  globalState.bgFinish = presetVal;

  const textarea = document.getElementById("p0-finish-text");
  if (textarea) {
    textarea.value = presetVal;
    autoResize(textarea);
  }
  const gTextarea = document.getElementById("global-p0-finish-text");
  if (gTextarea) {
    gTextarea.value = presetVal;
    autoResize(gTextarea);
  }
  const gSelect = document.getElementById("global-p0-finish-select");
  if (gSelect && gSelect.value !== presetVal) gSelect.value = presetVal;
  const p0Select = document.querySelector("#cmf-row-p0 select.finish-preset-select");
  if (p0Select && p0Select.value !== presetVal) p0Select.value = presetVal;

  syncBgDescFromCMF();
  updateSynthesizer();
  showToast("Applied Floor Finish preset");
}

// Auto-Resize Textarea as text increases
function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.max(32, el.scrollHeight) + "px";
}

// Add New Swatch Row
function addSwatchRow() {
  const newIndex = activeSwatches.length + 1;
  const defaultHex = "#64748b";
  activeSwatches.push({
    imageSrc: "",
    color: defaultHex,
    colorDesc: hexToNaturalColorName(defaultHex),
    material: "smooth skincare cosmetic cream paste",
    finish: "soft satin matte finish, clean rounded shape, flawless surface"
  });
  renderSwatchRows();
  updateSynthesizer();
  showToast(`Added Swatch P${newIndex}`);
}

// Remove Last Swatch Row
function removeLastSwatchRow() {
  if (activeSwatches.length <= 1) {
    showToast("⚠️ At least 1 swatch row is required");
    return;
  }
  activeSwatches.pop();
  renderSwatchRows();
  updateSynthesizer();
  showToast("Removed last swatch");
}

// Move Swatch Row Up or Down (Swaps with neighbor in activeSwatches)
function moveSwatchRow(idx, dir) {
  const targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= activeSwatches.length) return;

  const temp = activeSwatches[idx];
  activeSwatches[idx] = activeSwatches[targetIdx];
  activeSwatches[targetIdx] = temp;

  renderSwatchRows();
  updateSynthesizer();
  if (typeof render3DLitViewport === "function") {
    render3DLitViewport();
  }

  // Update LookDev preset palette preview if active
  const summaryObj = {
    id: activePresetId,
    name: "Custom",
    description: "",
    isBuiltin: false,
    previewColors: [globalState.bgColor || "#f4f2ee", ...activeSwatches.map(s => s.color)]
  };
  if (typeof renderPresetPalettePreview === "function") {
    renderPresetPalettePreview(summaryObj);
  }

  showToast(`🔄 Swapped P${idx + 1} ↔ P${targetIdx + 1}`);
}

// Duplicate Swatch Row (Clones right below)
function duplicateSwatchRow(idx) {
  const original = activeSwatches[idx];
  const clone = JSON.parse(JSON.stringify(original));
  activeSwatches.splice(idx + 1, 0, clone);
  renderSwatchRows();
  updateSynthesizer();
  showToast(`Duplicated P${idx + 1} to P${idx + 2}`);
}

// Delete Specific Swatch Row
function deleteSwatchRow(idx) {
  if (activeSwatches.length <= 1) {
    showToast("⚠️ At least 1 swatch row is required");
    return;
  }
  activeSwatches.splice(idx, 1);
  renderSwatchRows();
  updateSynthesizer();
  showToast(`Deleted Swatch P${idx + 1}`);
}

// Image Upload Handlers
function triggerImageUpload(idx) {
  const fileInput = document.getElementById(`file-input-${idx}`);
  if (fileInput) fileInput.click();
}


// Client-side 1K WebP Image Optimizer (Compresses 5MB PNG/JPG down to ~300KB WebP Data URL)
function compressImageToWebP(file, maxDim = 1024, quality = 0.90) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        
        // Export to WebP with 90% quality
        const webpDataUrl = canvas.toDataURL("image/webp", quality);
        resolve(webpDataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function syncActiveImagesToDisk() {
  try {
    const payload = {
      p0_image_src: globalState.p0ImageSrc,
      swatches: activeSwatches.map(s => ({ imageSrc: s.imageSrc }))
    };
    await fetch("/api/sync_ref_images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn("Sync ref images failed:", e);
  }
}

async function handleImageFile(idx, event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    showToast(`⏳ Optimizing P${idx + 1} image to WebP (1K)...`);
    const webpUrl = await compressImageToWebP(file, 1024, 0.90);
    activeSwatches[idx].imageSrc = webpUrl;
    renderSwatchRows();
    updateSynthesizer();
    await syncActiveImagesToDisk();
    showToast(`✅ P${idx + 1} Ref Image ready & synced to ComfyUI!`);
  } catch (err) {
    console.error(err);
    showToast(`❌ Failed to process image: ${err}`);
  }
}

// Input Change Handlers for Swatch Rows & P0 Floor
function onP0ColorPickerChange(val) {
  onBgColorChange(val);
}

function onP0ColorTextChange(val) {
  onBgColorChange(val);
}

function onP0ColorDescChange(val) {
  globalState.bgColorDesc = val;
  const gDesc = document.getElementById("global-p0-color-desc");
  if (gDesc && gDesc.value !== val) {
    gDesc.value = val;
    autoResize(gDesc);
  }
  const p0Desc = document.getElementById("color-desc-p0");
  if (p0Desc && p0Desc.value !== val) {
    p0Desc.value = val;
    autoResize(p0Desc);
  }
  syncBgDescFromCMF();
  updateSynthesizer();
}

function onP0MaterialChange(val) {
  globalState.bgMaterial = val;
  const gMat = document.getElementById("global-p0-mat-text");
  if (gMat && gMat.value !== val) {
    gMat.value = val;
    autoResize(gMat);
  }
  const p0Mat = document.getElementById("p0-mat-text");
  if (p0Mat && p0Mat.value !== val) {
    p0Mat.value = val;
    autoResize(p0Mat);
  }
  syncBgDescFromCMF();
  updateSynthesizer();
}

function onP0FinishChange(val) {
  globalState.bgFinish = val;
  const gFin = document.getElementById("global-p0-finish-text");
  if (gFin && gFin.value !== val) {
    gFin.value = val;
    autoResize(gFin);
  }
  const p0Fin = document.getElementById("p0-finish-text");
  if (p0Fin && p0Fin.value !== val) {
    p0Fin.value = val;
    autoResize(p0Fin);
  }
  syncBgDescFromCMF();
  updateSynthesizer();
}

function syncBgDescFromCMF() {
  const gDescEl = document.getElementById("global-p0-color-desc");
  const gMFEl = document.getElementById("global-p0-mf-text");

  const colorPart = ((gDescEl ? gDescEl.value : globalState.bgColorDesc) || hexToNaturalColorName(globalState.bgColor || '#f4f2ee')).trim();
  const mfPart = (gMFEl ? gMFEl.value : (globalState.bgMF || [globalState.bgMaterial, globalState.bgFinish].filter(Boolean).join(", ") || 'clean matte studio tabletop surface, seamless non-reflective finish, zero glare')).trim();

  globalState.bgColorDesc = colorPart;
  globalState.bgMF = mfPart;
  globalState.bgMaterial = mfPart.split(",")[0].trim();
  globalState.bgFinish = mfPart.split(",").slice(1).join(",").trim() || "seamless non-reflective finish, zero glare";

  globalState.bgDesc = [colorPart, mfPart].filter(Boolean).join(", ");
}

function onColorPickerChange(idx, val) {
  activeSwatches[idx].color = val;
  const newDesc = hexToNaturalColorName(val);
  activeSwatches[idx].colorDesc = newDesc;

  const textInput = document.querySelector(`#cmf-row-${idx} .color-text-input`);
  if (textInput) textInput.value = val;

  const descEl = document.getElementById(`color-desc-${idx}`);
  if (descEl) {
    descEl.value = newDesc;
    autoResize(descEl);
  }

  updateSynthesizer();
}

function onColorTextChange(idx, val) {
  activeSwatches[idx].color = val;
  if (/^#[0-9A-F]{6}$/i.test(val)) {
    const newDesc = hexToNaturalColorName(val);
    activeSwatches[idx].colorDesc = newDesc;

    const picker = document.querySelector(`#cmf-row-${idx} .color-picker-input`);
    if (picker) picker.value = val;

    const descEl = document.getElementById(`color-desc-${idx}`);
    if (descEl) {
      descEl.value = newDesc;
      autoResize(descEl);
    }
  }
  updateSynthesizer();
}

function onColorDescChange(idx, val) {
  activeSwatches[idx].colorDesc = val;
  updateSynthesizer();
}

function onMaterialChange(idx, val) {
  activeSwatches[idx].material = val;
  updateSynthesizer();
}

function onFinishChange(idx, val) {
  activeSwatches[idx].finish = val;
  updateSynthesizer();
}

// Aggressively synchronize all DOM inputs to globalState & activeSwatches
function syncAllInputsToState() {
  const styleEl = document.getElementById("global-style-header");
  if (styleEl) globalState.sharedStyle = styleEl.value;

  const fluxPreEl = document.getElementById("flux-specific-prefix");
  if (fluxPreEl) globalState.fluxPrefix = fluxPreEl.value;

  const camEl = document.getElementById("global-camera-text");
  if (camEl) globalState.camera = camEl.value;

  const litEl = document.getElementById("global-lighting-text");
  if (litEl) globalState.lighting = litEl.value;

  const subEl = document.getElementById("global-subject-type");
  if (subEl) globalState.subjectType = subEl.value;

  const negEl = document.getElementById("global-negative-textarea");
  if (negEl) globalState.negative = negEl.value;

  const shadowEl = document.getElementById("shadow-style-select");
  if (shadowEl) globalState.shadowStyle = shadowEl.value;

  const azEl = document.getElementById("light-azimuth-slider");
  if (azEl) {
    globalState.lightingAzimuth = parseInt(azEl.value, 10);
    relightState.lightAzimuth = parseInt(azEl.value, 10);
  }

  const elEl = document.getElementById("light-elevation-slider");
  if (elEl) {
    globalState.lightingElevation = parseInt(elEl.value, 10);
    relightState.lightElevation = parseInt(elEl.value, 10);
  }

  const p0Color = document.getElementById("global-bg-color-picker") || document.getElementById("bg-color-picker");
  if (p0Color) globalState.bgColor = p0Color.value;

  const p0Desc = document.getElementById("global-p0-color-desc") || document.getElementById("color-desc-p0");
  if (p0Desc) globalState.bgColorDesc = p0Desc.value;

  const p0MF = document.getElementById("global-p0-mf-text");
  if (p0MF) { globalState.bgMF = p0MF.value; globalState.bgMaterial = p0MF.value.split(",")[0].trim(); globalState.bgFinish = p0MF.value.split(",").slice(1).join(",").trim() || "seamless non-reflective finish, zero glare"; }
  const p0Mat = document.getElementById("global-p0-mat-text") || document.getElementById("p0-mat-text");
  if (p0Mat) globalState.bgMaterial = p0Mat.value;

  const p0Fin = document.getElementById("global-p0-finish-text") || document.getElementById("p0-finish-text");
  if (p0Fin) globalState.bgFinish = p0Fin.value;

  const p0CustomToggle = document.getElementById("p0-custom-prompt-toggle");
  if (p0CustomToggle) globalState.isP0CustomPrompt = p0CustomToggle.checked;

  const p0CustomTa = document.getElementById("p0-custom-prompt-textarea");
  if (p0CustomTa) globalState.p0CustomPrompt = p0CustomTa.value;

  const p0UseImg = document.getElementById("p0-use-image-toggle");
  if (p0UseImg) globalState.useP0Image = p0UseImg.checked;

  const p0UsePos = document.getElementById("p0-use-pos-toggle") || document.getElementById("p0-use-text-toggle");
  if (p0UsePos) globalState.useP0PosText = p0UsePos.checked;

  const p0UseNeg = document.getElementById("p0-use-neg-toggle");
  if (p0UseNeg) globalState.useP0NegText = p0UseNeg.checked;

  const p0NegTa = document.getElementById("p0-negative-prompt-textarea");
  if (p0NegTa) globalState.p0NegativePrompt = p0NegTa.value;

  // Sync ComfyUI Top Banner Parameters
  const dStr = document.getElementById("param-depth-strength");
  if (dStr && !isNaN(parseFloat(dStr.value))) globalState.depthStrength = parseFloat(dStr.value);
  const dSta = document.getElementById("param-depth-start");
  if (dSta && !isNaN(parseFloat(dSta.value))) globalState.depthStart = parseFloat(dSta.value);
  const dEnd = document.getElementById("param-depth-end");
  if (dEnd && !isNaN(parseFloat(dEnd.value))) globalState.depthEnd = parseFloat(dEnd.value);

  const nStr = document.getElementById("param-normal-strength");
  if (nStr && !isNaN(parseFloat(nStr.value))) globalState.normalStrength = parseFloat(nStr.value);
  const nSta = document.getElementById("param-normal-start");
  if (nSta && !isNaN(parseFloat(nSta.value))) globalState.normalStart = parseFloat(nSta.value);
  const nEnd = document.getElementById("param-normal-end");
  if (nEnd && !isNaN(parseFloat(nEnd.value))) globalState.normalEnd = parseFloat(nEnd.value);

  const sCfg = document.getElementById("param-sdxl-cfg");
  if (sCfg && !isNaN(parseFloat(sCfg.value))) globalState.sdxlCfg = parseFloat(sCfg.value);
  const sDen = document.getElementById("param-sdxl-denoise");
  if (sDen && !isNaN(parseFloat(sDen.value))) globalState.sdxlDenoise = parseFloat(sDen.value);

  const fCfg = document.getElementById("param-flux-cfg");
  if (fCfg && !isNaN(parseFloat(fCfg.value))) globalState.fluxCfg = parseFloat(fCfg.value);
  const fLora = document.getElementById("param-flux-lora-weight");
  if (fLora && !isNaN(parseFloat(fLora.value))) globalState.fluxLoraWeight = parseFloat(fLora.value);
  const fGuid = document.getElementById("param-flux-guidance");
  if (fGuid && !isNaN(parseFloat(fGuid.value))) globalState.fluxGuidance = parseFloat(fGuid.value);
  const fDen = document.getElementById("param-flux-denoise");
  if (fDen && !isNaN(parseFloat(fDen.value))) globalState.fluxDenoise = parseFloat(fDen.value);

  // Active Swatches: read directly from any active DOM textareas & inputs
  if (Array.isArray(activeSwatches)) {
    activeSwatches.forEach((s, idx) => {
      const volEl = document.getElementById(`volume-text-${idx}`);
      if (volEl) s.volume = volEl.value;
      const descEl = document.getElementById(`color-desc-${idx}`);
      if (descEl) s.colorDesc = descEl.value;
      const mfEl = document.getElementById(`mf-text-${idx}`);
      if (mfEl) { s.mf = mfEl.value; s.material = mfEl.value.split(",")[0].trim(); s.finish = mfEl.value.split(",").slice(1).join(",").trim() || "soft satin matte finish"; }
      const matEl = document.getElementById(`material-text-${idx}`);
      if (matEl) s.material = matEl.value;
      const finEl = document.getElementById(`finish-text-${idx}`);
      if (finEl) s.finish = finEl.value;
      const customToggle = document.getElementById(`custom-prompt-toggle-${idx}`);
      if (customToggle) s.isCustomPrompt = customToggle.checked;
      const customTa = document.getElementById(`custom-prompt-input-${idx}`);
      if (customTa) s.customPrompt = customTa.value;
      const useImgToggle = document.getElementById(`use-image-toggle-${idx}`);
      if (useImgToggle) s.useImage = useImgToggle.checked;
      const usePosToggle = document.getElementById(`use-pos-toggle-${idx}`) || document.getElementById(`use-text-toggle-${idx}`);
      if (usePosToggle) s.usePosText = usePosToggle.checked;
      const useNegToggle = document.getElementById(`use-neg-toggle-${idx}`);
      if (useNegToggle) s.useNegText = useNegToggle.checked;
      const negTa = document.getElementById(`swatch-neg-prompt-input-${idx}`);
      if (negTa) s.negativePrompt = negTa.value;
    });
  }
}

// Global Settings Change Handler
function onGlobalChange() {
  syncAllInputsToState();
  updateSynthesizer();
}

function appendNegative(text) {
  const textarea = document.getElementById("global-negative-textarea");
  if (!textarea.value.includes(text)) {
    textarea.value = textarea.value.trim() ? `${textarea.value.trim()}, ${text}` : text;
    onGlobalChange();
    showToast("Appended filter to Negative Prompt");
  }
}

function onVolumeChange(idx, val) {
  if (activeSwatches[idx]) {
    activeSwatches[idx].volume = val;
    updateSynthesizer();
  }
}

function onVolumeSelectChange(idx, val) {
  if (!val) return;
  const ta = document.getElementById(`volume-text-${idx}`);
  if (ta) {
    ta.value = val;
    autoResize(ta);
  }
  onVolumeChange(idx, val);
}

// P0 Floor Image Upload Handlers
function triggerP0ImageUpload() {
  const fileInput = document.getElementById("file-input-p0");
  if (fileInput) fileInput.click();
}

async function handleP0ImageFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    showToast("⏳ Optimizing P0 Floor image to WebP (1K)...");
    const webpUrl = await compressImageToWebP(file, 1024, 0.90);
    globalState.p0ImageSrc = webpUrl;
    
    // Update preview in UI
    const preview = document.getElementById("p0-img-preview");
    const placeholder = document.getElementById("p0-img-placeholder");
    if (preview) {
      preview.src = webpUrl;
      preview.style.display = "block";
    }
    if (placeholder) placeholder.style.display = "none";
    updateSynthesizer();
    showToast("✅ P0 Floor Ref Image ready (Optimized WebP)");
  } catch (err) {
    console.error(err);
    showToast(`❌ Failed to process image: ${err}`);
  }
}

function toggleP0UseImage(checked) {
  globalState.useP0Image = checked;
  const chip = document.getElementById("p0-toggle-img-chip");
  if (chip) chip.classList.toggle("active-img", checked);
  const box = document.getElementById("p0-img-box");
  if (box) box.classList.toggle("cmf-section-disabled", !checked);
  updateSynthesizer();
  showToast(checked ? "📸 P0 Use Image ON" : "⚪ P0 Use Image OFF (Disabled)");
}

function toggleP0UsePosText(checked) {
  globalState.useP0PosText = checked;
  const chip = document.getElementById("p0-toggle-pos-chip") || document.getElementById("p0-toggle-txt-chip");
  if (chip) chip.classList.toggle("active-pos", checked);
  const elements = [
    document.getElementById("global-p0-color-desc"),
    document.getElementById("global-bg-color-picker"),
    document.getElementById("global-bg-color-text"),
    document.getElementById("global-p0-mf-select"),
    document.getElementById("global-p0-mf-text"),
    document.getElementById("p0-live-prompt-container")
  ];
  elements.forEach(el => {
    if (el) el.closest(".col-color, .col-mf, #p0-live-prompt-container")?.classList.toggle("cmf-section-disabled", !checked);
  });
  const bar = document.getElementById("p0-prompt-bar");
  if (bar) bar.classList.toggle("cmf-section-disabled", !checked);
  updateSynthesizer();
  showToast(checked ? "✍️ P0 Use Pos Script ON" : "⚪ P0 Use Pos Script OFF (Disabled)");
}

function toggleP0UseNegText(checked) {
  globalState.useP0NegText = checked;
  const chip = document.getElementById("p0-toggle-neg-chip");
  if (chip) chip.classList.toggle("active-neg", checked);
  const negBar = document.getElementById("p0-neg-prompt-bar");
  if (negBar) {
    negBar.style.display = checked ? "flex" : "none";
    negBar.classList.toggle("cmf-section-disabled", !checked);
    if (checked) {
      const ta = document.getElementById("p0-negative-prompt-textarea");
      if (ta) autoResize(ta);
    }
  }
  updateSynthesizer();
  showToast(checked ? "🚫 P0 Use Neg Script ON" : "⚪ P0 Use Neg Script OFF (Disabled)");
}

function onP0NegativePromptChange(val) {
  globalState.p0NegativePrompt = val;
  updateSynthesizer();
}

function copyP0NegativePrompt() {
  const text = (globalState.p0NegativePrompt !== undefined && globalState.p0NegativePrompt !== null) ? globalState.p0NegativePrompt : (globalState.negative || "");
  safeCopyToClipboard(text).then(() => {
    showToast("📋 P0 Floor Negative Prompt copied!");
  });
}

function onGuideDepthSelectChange(val) {
  globalState.depthPassFile = val;
  showToast(`🌐 Depth Pass set to: ${val}`);
}

function onGuideNormalSelectChange(val) {
  globalState.normalPassFile = val;
  showToast(`🧭 Normal Pass set to: ${val}`);
}

function setStage1Engine(engine) {
  globalState.stage1Engine = engine;
  localStorage.setItem("spatial_stage1_engine", engine);
  const btnVlm = document.getElementById("btn-engine-vlm");
  const btnSdxl = document.getElementById("btn-engine-sdxl");
  const btnSea = document.getElementById("btn-engine-seadance");
  const badge = document.getElementById("engine-mode-badge");

  [btnVlm, btnSdxl, btnSea].forEach(btn => {
    if (btn) {
      btn.className = "btn btn-engine";
      btn.style.border = "1px solid rgba(255,255,255,0.15)";
      btn.style.background = "rgba(255,255,255,0.05)";
      btn.style.color = "#94a3b8";
    }
  });

  if (engine === "vlm") {
    if (btnVlm) {
      btnVlm.className = "btn btn-engine active";
      btnVlm.style.border = "1px solid #c084fc";
      btnVlm.style.background = "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(236,72,153,0.25))";
      btnVlm.style.color = "#fdf4ff";
    }
    if (badge) {
      badge.textContent = "💎 VLM + FLUX";
      badge.style.color = "#f3e8ff";
      badge.style.borderColor = "#c084fc";
    }
    showToast("💎 Gemini VLM + FLUX Master Engine Active (No SDXL)!");
  } else if (engine === "seadance") {
    if (btnSea) {
      btnSea.className = "btn btn-engine active";
      btnSea.style.border = "1px solid #38bdf8";
      btnSea.style.background = "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(2,132,199,0.2))";
      btnSea.style.color = "#f8fafc";
    }
    if (badge) {
      badge.textContent = "SeaDance + FLUX";
      badge.style.color = "#38bdf8";
      badge.style.borderColor = "#38bdf8";
    }
    showToast("🌊 Stage 1 Spatial Engine: SeaDance + FLUX Active");
  } else {
    if (btnSdxl) {
      btnSdxl.className = "btn btn-engine active";
      btnSdxl.style.border = "1px solid #38bdf8";
      btnSdxl.style.background = "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(2,132,199,0.2))";
      btnSdxl.style.color = "#f8fafc";
    }
    if (badge) {
      badge.textContent = "SDXL + FLUX";
      badge.style.color = "#e0f2fe";
      badge.style.borderColor = "#38bdf8";
    }
    showToast("🚀 Stage 1 Spatial Engine: SDXL + FLUX Active");
  }
  updateSynthesizer();
}

// ==========================================================================
// Dynamic 3D Guide Passes & Custom Role Labels Engine
// ==========================================================================

const COMMON_GUIDE_PRESETS = [
  { file: "Color.png", label: "Color Pass / Swatch Placement" },
  { file: "Normal.png", label: "Surface Normal Map" },
  { file: "Depth.png", label: "3D Depth Distance" },
  { file: "Shading.png", label: "Shading Reference & Lighting" },
  { file: "Id.png", label: "Material ID Segmentation" },
  { file: "Mask_00.png", label: "Floor / Tabletop Background Mask" },
  { file: "Mask_01.png", label: "Part 01 Mask Region" },
  { file: "Mask_02.png", label: "Part 02 Mask Region" },
  { file: "Mask_03.png", label: "Part 03 Mask Region" }
];

function renderGuideSlots() {
  const container = document.getElementById("dynamic-guide-slots-list");
  if (!container) return;

  if (!globalState.guideSlots || !Array.isArray(globalState.guideSlots)) {
    globalState.guideSlots = [
      { file: "Color.png", label: "Color Pass / Swatch Placement" },
      { file: "Normal.png", label: "Surface Normal Map" },
      { file: "Depth.png", label: "3D Depth Distance" }
    ];
  }

  const badge = document.getElementById("guide-slots-count-badge");
  if (badge) {
    badge.textContent = `${globalState.guideSlots.length} Passes`;
  }

  const shotStr = String(currentShot || 1).padStart(4, "0");
  const base = getAssetBaseUrl();
  const cacheBuster = Date.now();

  container.innerHTML = "";

  globalState.guideSlots.forEach((slot, idx) => {
    const card = document.createElement("div");
    card.className = "guide-slot-card";

    const imgUrl = `${base}/${shotStr}/${slot.file}?v=${cacheBuster}`;

    card.innerHTML = `
      <img src="${imgUrl}" onerror="this.src='/guides/0001/${slot.file}?v=${cacheBuster}'" class="guide-slot-thumb" alt="${escapeHtml(slot.label)}">
      <div class="guide-slot-body">
        <div class="guide-slot-row-top">
          <input type="text" class="guide-slot-file-input" value="${escapeHtml(slot.file)}" placeholder="e.g. Color.png" onchange="updateGuideSlot(${idx}, 'file', this.value)" title="Guide image file name">
          <button type="button" class="guide-slot-del-btn" onclick="removeGuideSlot(${idx})" title="Remove this guide pass">✕</button>
        </div>
        <input type="text" class="guide-slot-label-input" value="${escapeHtml(slot.label)}" placeholder="Role/Label for Gemini VLM (e.g. Tangent Normal)" oninput="updateGuideSlot(${idx}, 'label', this.value)" title="Editable Role & Description for Gemini VLM Analysis">
      </div>
    `;

    container.appendChild(card);
  });
}

function addNewGuideSlot(file = "Color.png", label = "Custom Guide Pass") {
  if (!globalState.guideSlots) globalState.guideSlots = [];
  const existingFiles = globalState.guideSlots.map(s => s.file);
  let nextPreset = COMMON_GUIDE_PRESETS.find(p => !existingFiles.includes(p.file)) || {
    file: "Color.png",
    label: "Additional Visual Guide Pass"
  };
  globalState.guideSlots.push({ file: nextPreset.file, label: nextPreset.label });
  renderGuideSlots();
  showToast(`➕ Added Guide Slot: ${nextPreset.file}`);
}

function removeGuideSlot(idx) {
  if (!globalState.guideSlots || globalState.guideSlots.length <= 1) {
    showToast("⚠️ 최소 1개 이상의 가이드 이미지가 필요합니다.");
    return;
  }
  const removed = globalState.guideSlots.splice(idx, 1);
  renderGuideSlots();
  showToast(`🗑️ Removed: ${removed[0]?.file || "Guide pass"}`);
}

function updateGuideSlot(idx, field, val) {
  if (globalState.guideSlots && globalState.guideSlots[idx]) {
    globalState.guideSlots[idx][field] = val;
    if (field === "file") {
      renderGuideSlots();
    }
  }
}

async function callGeminiVlmSynthesizer() {
  const btnCenter = document.getElementById("btn-vlm-auto-synth");
  const btnLeft = document.getElementById("btn-vlm-auto-synth-left");
  const origTextCenter = btnCenter ? btnCenter.innerHTML : "";
  const origTextLeft = btnLeft ? btnLeft.innerHTML : "";

  [btnCenter, btnLeft].forEach(btn => {
    if (btn) {
      btn.innerHTML = `<span>⏳ Gemini Vision 3D 분석 중...</span>`;
      btn.disabled = true;
    }
  });

  showToast("🤖 Gemini VLM이 3D 가이드 패스와 스와치 재질을 분석 중입니다...");

  try {
    const payload = {
      shot: currentShot,
      guideSlots: globalState.guideSlots || [
        { file: "Color.png", label: "Color Pass / Swatch Placement" },
        { file: "Normal.png", label: "Surface Normal Map" },
        { file: "Depth.png", label: "3D Depth Distance" }
      ],
      swatches: globalState.swatches,
      tabletop: globalState.tabletopPrompt || "clean matte studio tabletop surface",
      lighting: globalState.lightingPrompt || "directional key light from top-right (1 o'clock direction) at a shallow 30-degree grazing angle",
      stylePrefix: "a photo in apple minimal craft style of, minimalist commercial studio photography, top-down flat lay view, professional luxury skincare cosmetic swatches"
    };

    const resp = await fetch("/api/vlm_synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();
    if (result.success && result.masterPrompt) {
      // Apply to custom textarea
      const customToggle = document.getElementById("flux-custom-prompt-toggle");
      if (customToggle && !customToggle.checked) {
        customToggle.checked = true;
        toggleFluxCustomPrompt(true);
      }
      const textarea = document.getElementById("flux-custom-prompt-textarea");
      if (textarea) {
        textarea.value = result.masterPrompt;
        onFLUXCustomPromptChange(result.masterPrompt);
      }
      
      if (result.negativePrompt) {
        const negEl = document.getElementById("p0-negative-prompt-textarea");
        if (negEl) {
          negEl.value = result.negativePrompt;
          onP0NegativePromptChange(result.negativePrompt);
        }
      }

      showToast("✨ Gemini VLM 분석 완료! 초정밀 룩뎁 프롬프트가 적용되었습니다! 💎");
    } else {
      showToast(`⚠️ VLM 분석 실패: ${result.error || "알 수 없는 오류"}`);
    }
  } catch (err) {
    console.error("VLM synthesis error:", err);
    showToast(`⚠️ VLM 호출 오류: ${err.message}`);
  } finally {
    if (btnCenter) {
      btnCenter.innerHTML = origTextCenter;
      btnCenter.disabled = false;
    }
    if (btnLeft) {
      btnLeft.innerHTML = origTextLeft;
      btnLeft.disabled = false;
    }
  }
}

function onSeedInputChange(val) {
  const seedNum = parseInt(val) || 7;
  globalState.seed = seedNum;
  const topEl = document.getElementById("top-seed-input");
  const leftEl = document.getElementById("global-seed-input");
  if (topEl && topEl.value !== String(seedNum)) topEl.value = seedNum;
  if (leftEl && leftEl.value !== String(seedNum)) leftEl.value = seedNum;
  showToast(`🎲 Seed locked to: ${seedNum}`);
}

function setSeedValue(val) {
  const seedNum = parseInt(val) || 7;
  globalState.seed = seedNum;
  const topEl = document.getElementById("top-seed-input");
  const leftEl = document.getElementById("global-seed-input");
  if (topEl) topEl.value = seedNum;
  if (leftEl) leftEl.value = seedNum;
  showToast(`🎲 Seed reset to: ${seedNum}`);
}

function randomizeSeedValue() {
  const newSeed = Math.floor(Math.random() * 1000000000);
  globalState.seed = newSeed;
  const topEl = document.getElementById("top-seed-input");
  const leftEl = document.getElementById("global-seed-input");
  if (topEl) topEl.value = newSeed;
  if (leftEl) leftEl.value = newSeed;
  showToast(`🎲 New Seed locked: ${newSeed}`);
}

function onP0MaskSelectChange(val) {
  globalState.p0MaskFile = val;
  const shotStr = String(currentShot).padStart(4, "0");
  const preview = document.getElementById("p0-mask-preview");
  if (preview) {
    preview.src = `${getAssetBaseUrl()}/${shotStr}/${val}?v=${Date.now()}`;
  }
  showToast(`🏛️ P0 Floor Mask set to: ${val}`);
}

function onSwatchMaskSelectChange(idx, val) {
  if (activeSwatches[idx]) {
    activeSwatches[idx].maskFile = val;
    const shotStr = String(currentShot).padStart(4, "0");
    const preview = document.getElementById(`mask-preview-${idx}`);
    if (preview) {
      preview.src = `${getAssetBaseUrl()}/${shotStr}/${val}?v=${Date.now()}`;
    }
    showToast(`🎭 P${idx + 1} Mask set to: ${val}`);
  }
}

function toggleSwatchUseImage(idx, checked) {
  if (activeSwatches[idx]) {
    activeSwatches[idx].useImage = checked;
    const chip = document.getElementById(`toggle-img-chip-${idx}`);
    if (chip) chip.classList.toggle("active-img", checked);
    const colImg = document.getElementById(`col-img-${idx}`);
    if (colImg) colImg.classList.toggle("cmf-section-disabled", !checked);
    const imgBox = document.getElementById(`img-box-${idx}`);
    if (imgBox) imgBox.classList.toggle("cmf-section-disabled", !checked);
    updateSynthesizer();
    showToast(checked ? `📸 P${idx + 1} Use Image ON` : `⚪ P${idx + 1} Use Image OFF (Disabled)`);
  }
}
const onToggleUseImage = toggleSwatchUseImage;

function toggleSwatchUsePosText(idx, checked) {
  if (activeSwatches[idx]) {
    activeSwatches[idx].usePosText = checked;
    const chip = document.getElementById(`toggle-pos-chip-${idx}`);
    if (chip) chip.classList.toggle("active-pos", checked);
    const targets = [
      document.getElementById(`col-vol-${idx}`),
      document.getElementById(`col-col-${idx}`),
      document.getElementById(`col-mf-${idx}`),
      document.getElementById(`row-prompt-bar-${idx}`)
    ];
    targets.forEach(el => {
      if (el) el.classList.toggle("cmf-section-disabled", !checked);
    });
    updateSynthesizer();
    showToast(checked ? `✍️ P${idx + 1} Use Pos Script ON` : `⚪ P${idx + 1} Use Pos Script OFF (Disabled)`);
  }
}

function toggleSwatchUseNegText(idx, checked) {
  if (activeSwatches[idx]) {
    activeSwatches[idx].useNegText = checked;
    const chip = document.getElementById(`toggle-neg-chip-${idx}`);
    if (chip) chip.classList.toggle("active-neg", checked);
    const negBar = document.getElementById(`row-neg-prompt-bar-${idx}`);
    if (negBar) {
      negBar.style.display = checked ? "flex" : "none";
      negBar.classList.toggle("cmf-section-disabled", !checked);
      if (checked) {
        const ta = document.getElementById(`swatch-neg-prompt-input-${idx}`);
        if (ta) autoResize(ta);
      }
    }
    updateSynthesizer();
    showToast(checked ? `🚫 P${idx + 1} Use Neg Script ON` : `⚪ P${idx + 1} Use Neg Script OFF (Disabled)`);
  }
}

function onSwatchNegativePromptChange(idx, val) {
  if (activeSwatches[idx]) {
    activeSwatches[idx].negativePrompt = val;
    updateSynthesizer();
  }
}

function copySwatchNegativePrompt(idx) {
  const s = activeSwatches[idx];
  const text = (s && s.negativePrompt !== undefined && s.negativePrompt !== null && s.negativePrompt.trim()) ? s.negativePrompt : (globalState.negative || "");
  safeCopyToClipboard(text).then(() => {
    showToast(`📋 P${idx + 1} Negative Prompt copied!`);
  });
}

function toggleCustomPrompt(idx, isCustom) {
  if (activeSwatches[idx]) {
    activeSwatches[idx].isCustomPrompt = isCustom;
    if (isCustom && (!activeSwatches[idx].customPrompt || !activeSwatches[idx].customPrompt.trim())) {
      activeSwatches[idx].customPrompt = buildAutoSwatchPromptText(idx);
    }
    renderSwatchRows();
    updateSynthesizer();
    showToast(isCustom ? `✏️ P${idx + 1} Edit Mode (VCMF Disabled)` : `🔄 P${idx + 1} Auto-Synthesis Mode`);
  }
}

function onCustomPromptChange(idx, val) {
  if (activeSwatches[idx]) {
    activeSwatches[idx].customPrompt = val;
    updateSynthesizer();
  }
}

function toggleP0CustomPrompt(isCustom) {
  globalState.isP0CustomPrompt = isCustom;
  const liveEl = document.getElementById("live-prompt-p0-global");
  const customTa = document.getElementById("p0-custom-prompt-textarea");
  if (isCustom && (!globalState.p0CustomPrompt || !globalState.p0CustomPrompt.trim())) {
    globalState.p0CustomPrompt = buildAutoP0PromptText();
  }
  if (liveEl) liveEl.style.display = isCustom ? "none" : "block";
  if (customTa) {
    customTa.style.display = isCustom ? "block" : "none";
    if (isCustom) {
      customTa.value = globalState.p0CustomPrompt || buildAutoP0PromptText();
      autoResize(customTa);
    }
  }

  // Toggle disabled state on P0 CMF columns
  const p0CmfCols = [
    document.getElementById("p0-col-color"),
    document.getElementById("p0-col-mf"),
    document.getElementById("p0-col-mat"),
    document.getElementById("p0-col-fin")
  ];
  p0CmfCols.forEach(col => {
    if (col) col.classList.toggle("cmf-section-disabled", isCustom || globalState.useP0Text === false);
  });

  updateSynthesizer();
  showToast(isCustom ? "✏️ P0 Floor Edit Mode (CMF Disabled)" : "🔄 P0 Floor Auto-Synthesis Mode");
}

function onP0CustomPromptChange(val) {
  globalState.p0CustomPrompt = val;
  updateSynthesizer();
}

function buildAutoGlobalScenePromptText() {
  const cam = (globalState.camera || "top-down flat lay view").trim();
  const grounding = "all cosmetic swatches resting firmly on tabletop surface with razor-sharp pitch-black contact shadow seams hugging all bottom edges";
  const lit = (globalState.lighting || "crisp directional studio spotlight from top-right at shallow 25-degree angle casting hard crisp drop shadows starting flush from the base with zero gap, zero floating, photorealistic commercial lookdev").trim();
  const inner = [cam, grounding, lit].filter(Boolean).join(", ");
  return `((${inner}):0.35)`;
}

function buildGlobalScenePromptText() {
  if (globalState.isSdxlGlobalCustomPrompt && globalState.sdxlGlobalCustomPrompt && globalState.sdxlGlobalCustomPrompt.trim()) {
    return globalState.sdxlGlobalCustomPrompt.trim();
  }
  return buildAutoGlobalScenePromptText();
}

function toggleSdxlGlobalCustomPrompt(isCustom) {
  globalState.isSdxlGlobalCustomPrompt = isCustom;
  const preEl = document.getElementById("sdxl-global-scene-prompt-text");
  const taEl = document.getElementById("sdxl-global-custom-prompt-textarea");
  if (isCustom && (!globalState.sdxlGlobalCustomPrompt || !globalState.sdxlGlobalCustomPrompt.trim())) {
    globalState.sdxlGlobalCustomPrompt = buildAutoGlobalScenePromptText();
  }
  if (preEl) preEl.style.display = isCustom ? "none" : "block";
  if (taEl) {
    taEl.style.display = isCustom ? "block" : "none";
    if (isCustom) {
      taEl.value = globalState.sdxlGlobalCustomPrompt || buildAutoGlobalScenePromptText();
      autoResize(taEl);
    }
  }
  updateSynthesizer();
  showToast(isCustom ? "✏️ SDXL Global Scene Edit Mode Enabled" : "🔄 SDXL Global Scene Auto-Synthesis Mode");
}

function onSDXLGlobalCustomPromptChange(val) {
  globalState.sdxlGlobalCustomPrompt = val;
  updateSynthesizer();
}

function buildAutoFLUXMasterPromptText() {
  const style = (globalState.sharedStyle || "").trim();
  const cam = (globalState.camera || "").trim();
  const sub = (globalState.subjectType || "").trim();
  const lit = (globalState.lighting || "").trim();
  const bg = (globalState.bgDesc || "").trim();
  const fluxPre = (globalState.fluxPrefix || "").trim();
  const cosmeticAnchor = "flawless cosmetic finish, clean cosmetic luxury swatch";

  const bgClause = bg ? `arranged on a ${bg}` : "";
  const fluxParts = [fluxPre, style, cam, sub, bgClause, lit, cosmeticAnchor].filter(Boolean);
  return fluxParts.join(", ");
}

function buildFLUXMasterPromptText() {
  if (globalState.isFluxCustomPrompt && globalState.fluxCustomPrompt && globalState.fluxCustomPrompt.trim()) {
    return globalState.fluxCustomPrompt.trim();
  }
  return buildAutoFLUXMasterPromptText();
}

function toggleFluxCustomPrompt(isCustom) {
  globalState.isFluxCustomPrompt = isCustom;
  const preEl = document.getElementById("flux-master-prompt-text");
  const taEl = document.getElementById("flux-custom-prompt-textarea");
  if (isCustom && (!globalState.fluxCustomPrompt || !globalState.fluxCustomPrompt.trim())) {
    globalState.fluxCustomPrompt = buildAutoFLUXMasterPromptText();
  }
  if (preEl) preEl.style.display = isCustom ? "none" : "block";
  if (taEl) {
    taEl.style.display = isCustom ? "block" : "none";
    if (isCustom) {
      taEl.value = globalState.fluxCustomPrompt || buildAutoFLUXMasterPromptText();
      autoResize(taEl);
    }
  }
  updateSynthesizer();
  showToast(isCustom ? "✏️ FLUX Master Edit Mode Enabled" : "🔄 FLUX Master Auto-Synthesis Mode");
}

function onFLUXCustomPromptChange(val) {
  globalState.fluxCustomPrompt = val;
  updateSynthesizer();
}

function buildAutoP0PromptText() {
  const colorDesc = (globalState.bgColorDesc !== undefined && globalState.bgColorDesc !== null ? globalState.bgColorDesc : hexToNaturalColorName(globalState.bgColor || '#f4f2ee')).trim();
  const colorPrefix = colorDesc ? `${colorDesc}, ` : "";
  const bgMF = (globalState.bgMF || [globalState.bgMaterial, globalState.bgFinish].filter(Boolean).join(", ") || "clean matte studio tabletop surface, seamless non-reflective finish, zero glare").trim();
  return `${colorPrefix}${bgMF}`.trim().replace(/^,\s*/, '');
}

function buildP0PromptText() {
  if (globalState.isP0CustomPrompt && globalState.p0CustomPrompt && globalState.p0CustomPrompt.trim()) {
    return globalState.p0CustomPrompt.trim();
  }
  return buildAutoP0PromptText();
}

function buildAutoSwatchPromptText(idx) {
  if (idx < 0 || idx >= activeSwatches.length) return "";
  const s = activeSwatches[idx];
  const vol = (s.volume || "thick dollop of dense cosmetic balm, substantial volumetric convex mound resting firmly on tabletop surface").trim();
  const colorDesc = (s.colorDesc !== undefined && s.colorDesc !== null ? s.colorDesc : hexToNaturalColorName(s.color)).trim();
  
  // Unified MF (Material & Finish)
  let mf = (s.mf || [s.material, s.finish].filter(Boolean).join(", ") || "smooth cosmetic swatch, soft satin matte finish").trim();

  // Automatic Floor Reflection / Transmission Injection for Translucent & Refractive materials
  const isTranslucent = /(translucent|transparent|optically clear|refraction|refractive|glass|water|jelly|honey|nectar|serum|droplet|glaze|sorbet)/i.test(mf);
  let floorTransmissionPrompt = "";
  if (isTranslucent) {
    const floorColor = (globalState.bgColorDesc || hexToNaturalColorName(globalState.bgColor || "#f4f2ee")).trim();
    const rawFloorMF = globalState.bgMF || [globalState.bgMaterial, globalState.bgFinish].filter(Boolean).join(", ") || "clean matte studio tabletop surface";
    const floorMat = rawFloorMF.split(",")[0].trim();
    
    if (!mf.includes("underlying") && !mf.includes("refracting") && !mf.includes("tabletop below")) {
      floorTransmissionPrompt = `optical transmission clearly refracting the underlying ${floorColor} ${floorMat} beneath, specular caustic highlights`;
    }
  }

  // Enforce flawless cosmetic finish and distinct swatch edges
  let anchorSuffix = "";
  if (!mf.includes("flawless cosmetic finish") && !mf.includes("flawless cosmetic makeup texture")) {
    anchorSuffix += ", flawless cosmetic finish";
  }
  if (!mf.includes("clean cosmetic luxury swatch") && !mf.includes("clean rounded cosmetic luxury swatch")) {
    anchorSuffix += ", clean cosmetic luxury swatch";
  }

  const parts = [vol, colorDesc, mf, floorTransmissionPrompt].filter(Boolean);
  return `${parts.join(", ")}${anchorSuffix}`.trim().replace(/^,\s*/, '').replace(/,\s*,/g, ', ');
}

function buildSwatchPromptText(idx) {
  if (idx < 0 || idx >= activeSwatches.length) return "";
  const s = activeSwatches[idx];
  if (s.isCustomPrompt && s.customPrompt && s.customPrompt.trim()) {
    return s.customPrompt.trim();
  }
  return buildAutoSwatchPromptText(idx);
}

function copyGlobalScenePrompt() {
  const text = buildGlobalScenePromptText();
  navigator.clipboard.writeText(text);
  showToast("📋 Global Scene (Camera + Light) Prompt copied!");
}

function copyP0Prompt() {
  const text = buildP0PromptText();
  navigator.clipboard.writeText(text);
  showToast("📋 P0 Floor Prompt copied!");
}

function copyLightingPrompt() {
  const textarea = document.getElementById("global-lighting-text");
  const text = textarea ? textarea.value.trim() : (globalState.lighting || "");
  navigator.clipboard.writeText(text);
  showToast("📋 Lighting Prompt copied to clipboard!");
}

function copySwatchPrompt(idx) {
  const text = buildSwatchPromptText(idx);
  navigator.clipboard.writeText(text);
  showToast(`📋 P${idx + 1} Prompt copied!`);
}

function copyFLUXMaster() {
  const text = buildFLUXMasterPromptText();
  navigator.clipboard.writeText(text);
  showToast("📋 FLUX Master Prompt copied to clipboard!");
}

function toggleAssemblyFormula() {
  const box = document.getElementById("assembly-blueprint-box");
  const btn = document.getElementById("btn-toggle-formula");
  if (!box) return;
  const isHidden = box.style.display === "none";
  box.style.display = isHidden ? "block" : "none";
  if (btn) btn.textContent = isHidden ? "🧩 Hide Formula ▲" : "🧩 View Formula ▼";
}

// Real-Time Prompt Synthesizer Core (Modular Assembly)
function updateSynthesizer() {
  syncBgDescFromCMF();

  // 1. Stage 1: SDXL Global Scene Prompt (Camera + Unified Studio Lighting & Shadows)
  const globalScene = buildGlobalScenePromptText();
  const sdxlSceneEl = document.getElementById("sdxl-global-scene-prompt-text");
  if (sdxlSceneEl) sdxlSceneEl.textContent = globalScene;
  const sdxlEl = document.getElementById("sdxl-master-prompt-text");
  if (sdxlEl) sdxlEl.textContent = globalScene;

  // 2. Stage 2: FLUX Global Master Positive
  const fluxMaster = buildFLUXMasterPromptText();
  const fluxEl = document.getElementById("flux-master-prompt-text");
  if (fluxEl) fluxEl.textContent = fluxMaster;

  // 3. Global Negative Display
  const negEl = document.getElementById("negative-prompt-display");
  if (negEl) negEl.textContent = globalState.negative;

  // 4. Update In-Row Live Prompt Previews (Tab 2 Swatch CMF & Tab 1 Master Builder)
  const p0Prompt = buildP0PromptText();
  const liveP0 = document.getElementById("live-prompt-p0");
  if (liveP0) liveP0.textContent = p0Prompt;
  const liveP0Global = document.getElementById("live-prompt-p0-global");
  if (liveP0Global) liveP0Global.textContent = p0Prompt;

  activeSwatches.forEach((_, idx) => {
    const liveEl = document.getElementById(`live-prompt-${idx}`);
    if (liveEl) liveEl.textContent = buildSwatchPromptText(idx);
  });
}

// Render SDXL Regional Breakdown Cards
function renderSDXLRegionalGrid() {
  const container = document.getElementById("stage1-regional-list");
  if (!container) return;
  container.innerHTML = "";

  // Background Card
  const bgCard = document.createElement("div");
  bgCard.className = "regional-card";
  const bgPrompt = buildP0PromptText();
  bgCard.innerHTML = `
    <div class="regional-header">
      <h4>🌐 Background (Mask_00.png)</h4>
      <button class="btn btn-xs" onclick="copyText('${escapeJs(bgPrompt)}')">Copy</button>
    </div>
    <p>${escapeHtml(bgPrompt)}</p>
  `;
  container.appendChild(bgCard);

  // Swatch Cards
  activeSwatches.forEach((s, idx) => {
    const card = document.createElement("div");
    card.className = "regional-card";
    const partNum = String(idx + 1).padStart(2, "0");
    const maskName = `Mask_${partNum}.png`;
    const regionalPrompt = buildSwatchPromptText(idx);

    card.innerHTML = `
      <div class="regional-header">
        <h4>🎨 Part ${partNum} (${maskName})</h4>
        <button class="btn btn-xs" onclick="copyText('${escapeJs(regionalPrompt)}')">Copy</button>
      </div>
      <p>${escapeHtml(regionalPrompt)}</p>
    `;
    container.appendChild(card);
  });
}

// Output Prompt Tabs Switcher
function switchPromptTab(tabKey) {
  document.querySelectorAll(".prompt-tabs .tab-link").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".output-card .tab-content").forEach(el => el.classList.remove("active"));

  if (tabKey === "sdxl") {
    document.querySelectorAll(".prompt-tabs .tab-link")[0].classList.add("active");
    document.getElementById("tab-content-sdxl").classList.add("active");
  } else if (tabKey === "flux") {
    document.querySelectorAll(".prompt-tabs .tab-link")[1].classList.add("active");
    document.getElementById("tab-content-flux").classList.add("active");
  } else {
    document.querySelectorAll(".prompt-tabs .tab-link")[2].classList.add("active");
    document.getElementById("tab-content-negative").classList.add("active");
  }
}

// Shot Controls (0001 ~ 0100)
function onShotSliderChange(val) {
  currentShot = parseInt(val, 10);
  document.getElementById("shot-input").value = currentShot;
  updateShotBadge();
}

function onShotInputChange(val) {
  let num = parseInt(val, 10);
  if (isNaN(num)) num = 1;
  num = Math.max(1, Math.min(100, num));
  currentShot = num;
  document.getElementById("shot-slider").value = currentShot;
  updateShotBadge();
}

function changeShot(delta) {
  let num = currentShot + delta;
  num = Math.max(1, Math.min(100, num));
  currentShot = num;
  document.getElementById("shot-slider").value = currentShot;
  document.getElementById("shot-input").value = currentShot;
  updateShotBadge();
}

// CDN & Asset Source Configuration
const DEFAULT_CDN_BASE = "https://dj-portfolio-teaser.b-cdn.net/Neural_Cosmetic_Swatches/3d_guides";
let assetSourceMode = localStorage.getItem("spatial_asset_source") || "local"; // "local" | "cdn"
let customCdnUrl = localStorage.getItem("spatial_custom_cdn") || DEFAULT_CDN_BASE;

function getAssetBaseUrl() {
  if (assetSourceMode === "local") {
    return "/guides";
  }
  return customCdnUrl || DEFAULT_CDN_BASE;
}

function updateShotBadge() {
  const shotStr = String(currentShot).padStart(4, "0");
  const cacheBuster = Date.now();
  const badge = document.getElementById("current-shot-badge");
  if (badge) badge.textContent = `Shot ${shotStr}`;
  const base = getAssetBaseUrl();
  const isCdn = base.startsWith("http");
  const statusEl = document.getElementById("shot-status-text");
  if (statusEl) {
    statusEl.innerHTML = isCdn
      ? `Active: <code>🐰 BunnyCDN (Shot ${shotStr})</code> <span style="color:#22c55e;font-size:11px;">● Connected</span>`
      : `Active: <code>3d_guides/${shotStr}</code> (Local)`;
  }
  
  // Refresh dynamic guide slots preview thumbnails
  renderGuideSlots();

  const normEl = document.getElementById("preview-normal");
  const depthEl = document.getElementById("preview-depth");
  const normalPass = globalState.normalPassFile || "Normal.png";
  const depthPass = globalState.depthPassFile || "Depth.png";
  if (normEl) normEl.src = `${base}/${shotStr}/${normalPass}?v=${cacheBuster}`;
  if (depthEl) depthEl.src = `${base}/${shotStr}/${depthPass}?v=${cacheBuster}`;

  // Update P0 Floor Mask Preview
  const p0Mask = globalState.p0MaskFile || "Mask_00.png";
  const p0MaskEl = document.getElementById("p0-mask-preview");
  if (p0MaskEl) p0MaskEl.src = `${base}/${shotStr}/${p0Mask}?v=${cacheBuster}`;

  // Update P1 ~ P6 Swatch Mask Previews
  activeSwatches.forEach((swatch, idx) => {
    const partNum = String(idx + 1).padStart(2, "0");
    const activeMask = swatch.maskFile || `Mask_${partNum}.png`;
    const maskEl = document.getElementById(`mask-preview-${idx}`);
    if (maskEl) maskEl.src = `${base}/${shotStr}/${activeMask}?v=${cacheBuster}`;
  });

  if (typeof update3DRelightShot === "function") {
    update3DRelightShot(shotStr);
  }
}

// Deploy Shot to ComfyUI Input Folder
async function deployShot() {
  const shotStr = String(currentShot).padStart(4, "0");
  const btn = document.getElementById("deploy-btn");
  btn.textContent = "⏳ Deploying...";
  
  try {
    const res = await fetch(`/api/deploy_shot?shot=${shotStr}`, { method: "POST" });
    if (res.ok) {
      showToast(`✅ Shot ${shotStr} deployed to ComfyUI input!`);
    } else {
      showToast(`🚀 Shot ${shotStr} selected (Run .\\select_shot.bat ${currentShot})`);
    }
  } catch (e) {
    showToast(`🚀 Shot ${shotStr} selected! Run: .\\select_shot.bat ${currentShot}`);
  } finally {
    btn.textContent = "🚀 Deploy Shot";
  }
}

// Copy Handlers
function copySDXLMaster() {
  const text = document.getElementById("sdxl-master-prompt-text").textContent;
  navigator.clipboard.writeText(text);
  showToast("SDXL Master Prompt copied!");
}

function copyFLUXMaster() {
  const text = document.getElementById("flux-master-prompt-text").textContent;
  navigator.clipboard.writeText(text);
  showToast("FLUX Master Prompt copied!");
}

function copyNegativePrompt() {
  const text = globalState.negative;
  navigator.clipboard.writeText(text);
  showToast("Global Negative Prompt copied!");
}

function copySDXLRegionalJSON() {
  const data = getSDXLRegionalData();
  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  showToast("SDXL Regional JSON copied!");
}

function copySDXLAll() {
  const payload = {
    sdxl_master_positive: document.getElementById("sdxl-master-prompt-text").textContent,
    global_negative: globalState.negative,
    sdxl_regional_prompts: getSDXLRegionalData()
  };
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  showToast("All SDXL Stage 1 Prompts copied!");
}

function copyAllPipelineJSON() {
  const payload = {
    pipeline: "2-Stage Spatial LookDev (SDXL Base + FLUX LoRA Refiner)",
    stage1_sdxl_base: {
      master_positive: document.getElementById("sdxl-master-prompt-text").textContent,
      negative: globalState.negative,
      regional_prompts: getSDXLRegionalData()
    },
    stage2_flux_refiner: {
      master_positive: document.getElementById("flux-master-prompt-text").textContent,
      negative: globalState.negative,
      denoise: "0.35 - 0.40"
    }
  };
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  showToast("Complete 2-Stage Pipeline JSON copied!");
}

function copyText(text) {
  navigator.clipboard.writeText(text);
  showToast("Prompt copied to clipboard!");
}

function getSDXLRegionalData() {
  syncAllInputsToState();
  const bgNegPrompt = (globalState.p0NegativePrompt !== undefined && globalState.p0NegativePrompt !== null) ? globalState.p0NegativePrompt : (globalState.negative || "");
  const data = {
    Background: {
      tag: "P0",
      mask: "Mask_00.png",
      mask_file: "Mask_00.png",
      color: globalState.bgColor || "#f4f2ee",
      colorDesc: globalState.bgColorDesc || hexToNaturalColorName(globalState.bgColor || "#f4f2ee"),
      color_desc: globalState.bgColorDesc || hexToNaturalColorName(globalState.bgColor || "#f4f2ee"),
      material: globalState.bgMaterial || "clean matte studio tabletop surface",
      finish: globalState.bgFinish || "seamless non-reflective finish, zero glare",
      mf: globalState.bgMF || "clean matte studio tabletop surface, seamless non-reflective finish, zero glare",
      prompt: buildP0PromptText(),
      negative_prompt: bgNegPrompt,
      imageSrc: globalState.p0ImageSrc || "",
      image_src: globalState.p0ImageSrc || "",
      image_weight: globalState.p0ImageWeight !== undefined ? globalState.p0ImageWeight : 0.95,
      imageWeight: globalState.p0ImageWeight !== undefined ? globalState.p0ImageWeight : 0.95,
      prompt_weight: globalState.p0PromptWeight !== undefined ? globalState.p0PromptWeight : 1.00,
      promptWeight: globalState.p0PromptWeight !== undefined ? globalState.p0PromptWeight : 1.00,
      useImage: globalState.useP0Image !== false,
      use_image: globalState.useP0Image !== false,
      usePosText: globalState.useP0PosText !== false,
      use_pos_text: globalState.useP0PosText !== false,
      useNegText: !!globalState.useP0NegText,
      use_neg_text: !!globalState.useP0NegText
    },
    Parts: {}
  };

  activeSwatches.forEach((s, idx) => {
    const partNum = String(idx + 1).padStart(2, "0");
    const colorDesc = s.colorDesc || hexToNaturalColorName(s.color);
    const posPrompt = buildSwatchPromptText(idx);
    const negPrompt = (s.negativePrompt !== undefined && s.negativePrompt !== null && s.negativePrompt.trim()) ? s.negativePrompt : (globalState.negative || "");

    data.Parts[`Part_${partNum}`] = {
      tag: `P${idx + 1}`,
      part_index: idx + 1,
      part_name: s.partName || `Part ${idx + 1}`,
      mask: `Mask_${partNum}.png`,
      mask_file: `Mask_${partNum}.png`,
      color: s.color,
      colorDesc: colorDesc,
      color_desc: colorDesc,
      volume: s.volume,
      material: s.material,
      finish: s.finish,
      mf: s.mf,
      prompt: posPrompt,
      negative_prompt: negPrompt,
      imageSrc: s.imageSrc || "",
      image_src: s.imageSrc || "",
      image_weight: s.imageWeight !== undefined ? s.imageWeight : 0.95,
      imageWeight: s.imageWeight !== undefined ? s.imageWeight : 0.95,
      prompt_weight: s.promptWeight !== undefined ? s.promptWeight : 1.00,
      promptWeight: s.promptWeight !== undefined ? s.promptWeight : 1.00,
      useImage: s.useImage !== false,
      use_image: s.useImage !== false,
      usePosText: s.usePosText !== false,
      use_pos_text: s.usePosText !== false,
      useNegText: !!s.useNegText,
      use_neg_text: !!s.useNegText
    };
  });

  return data;
}

// Utility Helpers
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeJs(str) {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

// Lighting Prompt Builder & Slider Callbacks
function buildLightingPrompt(azimuth, elevation, shadowStyle = "auto") {
  let dirName = "top-right (1 o'clock direction)";
  let shadowDir = "toward the bottom-left";

  if (azimuth >= 337.5 || azimuth < 22.5) {
    dirName = "top-overhead (12 o'clock direction)";
    shadowDir = "toward the bottom (6 o'clock direction)";
  } else if (azimuth >= 22.5 && azimuth < 67.5) {
    dirName = "top-right (1 o'clock direction)";
    shadowDir = "toward the bottom-left";
  } else if (azimuth >= 67.5 && azimuth < 112.5) {
    dirName = "direct right side (3 o'clock direction)";
    shadowDir = "toward the left side";
  } else if (azimuth >= 112.5 && azimuth < 157.5) {
    dirName = "bottom-right (5 o'clock direction)";
    shadowDir = "toward the upper-left";
  } else if (azimuth >= 157.5 && azimuth < 202.5) {
    dirName = "bottom-front (6 o'clock direction)";
    shadowDir = "toward the upper background";
  } else if (azimuth >= 202.5 && azimuth < 247.5) {
    dirName = "bottom-left (7 o'clock direction)";
    shadowDir = "toward the upper-right";
  } else if (azimuth >= 247.5 && azimuth < 292.5) {
    dirName = "direct left side (9 o'clock direction)";
    shadowDir = "toward the right side";
  } else if (azimuth >= 292.5 && azimuth < 337.5) {
    dirName = "top-left (10 o'clock direction)";
    shadowDir = "toward the bottom-right";
  }

  let elevDesc = `at a standard ${elevation}-degree studio elevation`;
  let shadowType = "";

  if (elevation <= 25) {
    elevDesc = `at an extreme low-angle ${elevation}-degree grazing angle emphasizing surface relief and micro-textures`;
  } else if (elevation <= 35) {
    elevDesc = `at a shallow ${elevation}-degree grazing angle emphasizing surface relief and micro-textures`;
  } else if (elevation <= 55) {
    elevDesc = `at a standard ${elevation}-degree studio elevation`;
  } else if (elevation <= 75) {
    elevDesc = `at a high ${elevation}-degree overhead studio spotlight`;
  } else {
    elevDesc = `at an ${elevation}-degree near-vertical top-down diffuse softbox angle`;
  }

  const activeShadow = shadowStyle || globalState.shadowStyle || "auto";

  if (activeShadow && activeShadow !== "auto") {
    if (activeShadow.includes("directly beneath") || activeShadow.includes("minimal cast")) {
      shadowType = `casting ${activeShadow}`;
    } else {
      shadowType = `casting ${activeShadow} ${shadowDir}`;
    }
  } else {
    // Auto calculate based on elevation angle
    if (elevation <= 25) {
      shadowType = `casting elongated dramatic contact cast shadows ${shadowDir}`;
    } else if (elevation <= 35) {
      shadowType = `casting soft subtle contact shadows ${shadowDir}`;
    } else if (elevation <= 55) {
      shadowType = `casting soft subtle contact shadows ${shadowDir}`;
    } else if (elevation <= 75) {
      shadowType = `casting soft compact contact shadows ${shadowDir}`;
    } else {
      shadowType = `casting soft tight ambient occlusion contact drop shadows directly beneath, zero harsh glare`;
    }
  }

  return `directional key light from ${dirName} ${elevDesc}, ${shadowType}, clean ambient occlusion fill`;
}

function onShadowStyleChange(val) {
  globalState.shadowStyle = val;
  const select = document.getElementById("light-shadow-select");
  if (select && select.value !== val) select.value = val;
  onLightAngleSliderChange();
  showToast(`🌑 Shadow Style: ${val === 'auto' ? 'Auto (입사각 연동)' : val.split(',')[0]}`);
}

function onLightAngleSliderChange(fromViewer = false) {
  const azEl = document.getElementById("light-azimuth-slider");
  const elEl = document.getElementById("light-elevation-slider");
  if (!azEl || !elEl) return;

  const azimuth = parseInt(azEl.value, 10);
  const elevation = parseInt(elEl.value, 10);

  globalState.lightingAzimuth = azimuth;
  globalState.lightingElevation = elevation;

  relightState.lightAzimuth = azimuth;
  relightState.lightElevation = elevation;

  // Update UI Labels
  const azLabel = getAzimuthLabel(azimuth);
  const elLabel = getElevationLabel(elevation);

  document.getElementById("val-azimuth").textContent = `${azimuth}° (${azLabel})`;
  document.getElementById("val-elevation").textContent = `${elevation}° (${elLabel})`;
  document.getElementById("lighting-vector-badge").textContent = `☀️ ${azimuth}° (${azLabel}) | ${elevation}°`;

  // Synthesize Natural Language Lighting Prompt
  const prompt = buildLightingPrompt(azimuth, elevation, globalState.shadowStyle);
  const textarea = document.getElementById("global-lighting-text");
  textarea.value = prompt;
  autoResize(textarea);

  onGlobalChange();
}

function getAzimuthLabel(deg) {
  if (deg >= 337.5 || deg < 22.5) return "12시 Top";
  if (deg >= 22.5 && deg < 67.5) return "1시 Top-Right";
  if (deg >= 67.5 && deg < 112.5) return "3시 Right";
  if (deg >= 112.5 && deg < 157.5) return "5시 Bot-Right";
  if (deg >= 157.5 && deg < 202.5) return "6시 Front";
  if (deg >= 202.5 && deg < 247.5) return "7시 Bot-Left";
  if (deg >= 247.5 && deg < 292.5) return "9시 Left";
  return "10시 Top-Left";
}

function getElevationLabel(deg) {
  if (deg <= 25) return "Low Rake";
  if (deg <= 35) return "Grazing";
  if (deg <= 55) return "Studio Std";
  if (deg <= 75) return "Overhead";
  return "Top-Down";
}

function setLightPreset(azimuth, elevation) {
  document.getElementById("light-azimuth-slider").value = azimuth;
  document.getElementById("light-elevation-slider").value = elevation;
  onLightAngleSliderChange();
  showToast(`☀️ Light Direction: ${azimuth}° Azimuth, ${elevation}° Elevation`);
}

function setLightElevation(elevation) {
  document.getElementById("light-elevation-slider").value = elevation;
  onLightAngleSliderChange();
  showToast(`📐 Elevation: ${elevation}°`);
}

function onGlobalLightingTextInput() {
  globalState.lighting = document.getElementById("global-lighting-text").value;
  onGlobalChange();
}

// Background / Floor Tabletop Color Handlers (Syncs Card 0 Floor controls, procedural color descriptions & textareas)
function onBgColorChange(val) {
  if (!val) return;
  globalState.bgColor = val;
  const newColorDesc = hexToNaturalColorName(val);
  globalState.bgColorDesc = newColorDesc;

  // Sync P0 Floor Card Inputs
  const gPicker = document.getElementById("global-bg-color-picker");
  const gText = document.getElementById("global-bg-color-text");
  const gDesc = document.getElementById("global-p0-color-desc");
  if (gPicker && gPicker.value !== val) gPicker.value = val;
  if (gText && gText.value !== val) gText.value = val;
  if (gDesc) {
    gDesc.value = newColorDesc;
    autoResize(gDesc);
  }

  syncBgDescFromCMF();
  updateSynthesizer();
}

function setBgColorPreset(colorHex, descText) {
  onBgColorChange(colorHex);
  if (descText) {
    globalState.bgDesc = descText;
    const bgTextarea = document.getElementById("global-bg-desc");
    if (bgTextarea) {
      bgTextarea.value = descText;
      autoResize(bgTextarea);
    }
    updateSynthesizer();
  }
}

// ==========================================================================
// Real-time 3D Normal Map Relighting Engine with Live Swatch CMF & Floor Color
// ==========================================================================
const RELIGHT_PRESETS = [
  { name: "Matte Studio Clay", base: [225, 220, 215], ambient: 0.18, diffMul: 0.85, specPow: 16, specMul: 0.45, rimMul: 0.25 },
  { name: "Space Gray Titanium", base: [145, 150, 160], ambient: 0.12, diffMul: 0.95, specPow: 32, specMul: 1.1, rimMul: 0.4 },
  { name: "Terracotta Cream", base: [185, 95, 75], ambient: 0.2, diffMul: 0.85, specPow: 22, specMul: 0.65, rimMul: 0.2 },
  { name: "Ceramic Shield White", base: [240, 242, 245], ambient: 0.15, diffMul: 0.9, specPow: 45, specMul: 0.9, rimMul: 0.3 },
  { name: "Warm Champagne Gold", base: [220, 185, 135], ambient: 0.16, diffMul: 0.9, specPow: 28, specMul: 0.85, rimMul: 0.35 }
];

let relightState = {
  canvas: null,
  ctx: null,
  width: 128,
  height: 128,
  normalData: null, // Float32Array: [nx, ny, nz, isForeground] per pixel
  partMasks: null,  // Int8Array: partIndex (0~5) per pixel, or -1
  colorMode: "swatch", // "swatch" | "clay"
  isLoaded: false,
  presetIdx: 0,
  lightAzimuth: 45,
  lightElevation: 30,
  isInteractingViewer: false,
  animTime: 0
};

function hexToRgbArray(hex) {
  if (!hex) return [210, 205, 200];
  let clean = String(hex).replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  } else if (clean.length === 8) {
    clean = clean.substring(0, 6);
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [210, 205, 200];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toggle3DColorMode() {
  relightState.colorMode = (relightState.colorMode === "swatch") ? "clay" : "swatch";
  const btn = document.getElementById("btn-toggle-color-mode");
  const hint = document.querySelector(".light-hint");
  if (relightState.colorMode === "swatch") {
    if (btn) {
      btn.textContent = "🎨 CMF Colors";
      btn.classList.remove("clay");
    }
    if (hint) hint.textContent = "💡 3D CMF Active";
    showToast("🎨 3D Mode: Live Swatch CMF Colors");
  } else {
    if (btn) {
      btn.textContent = "🏺 Clay Mode";
      btn.classList.add("clay");
    }
    const preset = RELIGHT_PRESETS[relightState.presetIdx];
    if (hint) hint.textContent = `💡 ${preset.name}`;
    showToast(`🏺 3D Mode: ${preset.name}`);
  }
}

function init3DRelightViewer() {
  const canvas = document.getElementById("canvas-3d-lit");
  if (!canvas) return;
  
  relightState.canvas = canvas;
  relightState.ctx = canvas.getContext("2d", { willReadFrequently: true });
  relightState.width = canvas.width = 256;
  relightState.height = canvas.height = 256;

  // Mouse interaction: dragging on 3D viewer directly updates Azimuth & Elevation & Lighting Prompt!
  const handlePointerLight = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to 1

    const r = Math.min(1.0, Math.sqrt(x * x + y * y));
    const azRad = Math.atan2(x, -y); // 0 at top (12 o'clock)
    let azDeg = Math.round(((azRad * 180 / Math.PI) + 360) % 360);
    let elDeg = Math.max(10, Math.min(90, Math.round(90 - r * 75)));

    // Snap to 5-deg steps
    azDeg = Math.round(azDeg / 5) * 5;
    elDeg = Math.round(elDeg / 5) * 5;

    document.getElementById("light-azimuth-slider").value = azDeg;
    document.getElementById("light-elevation-slider").value = elDeg;
    onLightAngleSliderChange(true);
  };

  canvas.addEventListener("mousedown", (e) => {
    relightState.isInteractingViewer = true;
    handlePointerLight(e);
  });

  window.addEventListener("mousemove", (e) => {
    if (relightState.isInteractingViewer) {
      handlePointerLight(e);
    }
  });

  window.addEventListener("mouseup", () => {
    relightState.isInteractingViewer = false;
  });

  // Double-click on canvas to cycle material presets (when in Clay mode) or switch modes
  canvas.addEventListener("dblclick", () => {
    if (relightState.colorMode === "swatch") {
      toggle3DColorMode();
    } else {
      relightState.presetIdx = (relightState.presetIdx + 1) % RELIGHT_PRESETS.length;
      if (relightState.presetIdx === 0) {
        toggle3DColorMode(); // Back to Swatch mode
      } else {
        const preset = RELIGHT_PRESETS[relightState.presetIdx];
        const hint = document.querySelector(".light-hint");
        if (hint) hint.textContent = `💡 ${preset.name}`;
        showToast(`🏺 Material: ${preset.name}`);
      }
    }
  });

  // Start Animation Render Loop
  requestAnimationFrame(renderRelightLoop);

  // Initial Shot Load
  const shotStr = String(currentShot).padStart(4, "0");
  update3DRelightShot(shotStr);
}

function update3DRelightShot(shotStr) {
  relightState.isLoaded = false;
  const width = relightState.width;   // 256
  const height = relightState.height; // 256
  const total = width * height;

  // Float32 multi-part continuous weights for subpixel anti-aliasing
  relightState.partWeights = new Float32Array(total * 6);
  relightState.fgAlpha = new Float32Array(total);

  // 1. Load Depth Map & construct smooth 3x3 Sobel surface normal field
  const depthImg = new Image();
  depthImg.crossOrigin = "anonymous";
  depthImg.onload = () => {
    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const octx = off.getContext("2d");
    octx.drawImage(depthImg, 0, 0, width, height);
    const imgData = octx.getImageData(0, 0, width, height);
    const pix = imgData.data;

    const depthGrid = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      depthGrid[i] = pix[i * 4]; // Grayscale height (0~255)
    }

    relightState.normalData = new Float32Array(total * 4);
    const scale = 0.055; // Calibrated for 256x256 smooth curvature

    for (let y = 0; y < height; y++) {
      const yPrev = Math.max(0, y - 1);
      const yNext = Math.min(height - 1, y + 1);

      for (let x = 0; x < width; x++) {
        const xPrev = Math.max(0, x - 1);
        const xNext = Math.min(width - 1, x + 1);
        const idx = (y * width + x) * 4;
        const dCenter = depthGrid[y * width + x];

        // Smoothstep continuous foreground coverage alpha for anti-aliased silhouettes
        const fa = Math.max(0.0, Math.min(1.0, (dCenter - 10) / 16.0));
        relightState.fgAlpha[y * width + x] = fa;

        if (fa <= 0.001) {
          relightState.normalData[idx + 3] = 0;
          continue;
        }

        // 3x3 Sobel Filter Kernel for silky smooth gradient estimation
        const tl = depthGrid[yPrev * width + xPrev];
        const tc = depthGrid[yPrev * width + x];
        const tr = depthGrid[yPrev * width + xNext];
        const ml = depthGrid[y * width + xPrev];
        const mr = depthGrid[y * width + xNext];
        const bl = depthGrid[yNext * width + xPrev];
        const bc = depthGrid[yNext * width + x];
        const br = depthGrid[yNext * width + xNext];

        const dx = (tr + 2.0 * mr + br - (tl + 2.0 * ml + bl)) * 0.125;
        const dy = (bl + 2.0 * bc + br - (tl + 2.0 * tc + tr)) * 0.125;

        let nx = -dx * scale;
        let ny = dy * scale;
        let nz = 1.0;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
        relightState.normalData[idx] = nx / len;
        relightState.normalData[idx + 1] = ny / len;
        relightState.normalData[idx + 2] = nz / len;
        relightState.normalData[idx + 3] = fa; // Continuous alpha
      }
    }

    relightState.isLoaded = true;

    // 2. Load Mask_01 ~ Mask_06 with Continuous Alpha Blending for Anti-Aliased Swatch Borders
    const base = getAssetBaseUrl();
    const cacheBuster = Date.now();
    for (let m = 1; m <= 6; m++) {
      const partIdx = m - 1;
      const maskNum = String(m).padStart(2, "0");
      const mImg = new Image();
      mImg.crossOrigin = "anonymous";
      mImg.onload = () => {
        const mOff = document.createElement("canvas");
        mOff.width = width;
        mOff.height = height;
        const moctx = mOff.getContext("2d");
        moctx.drawImage(mImg, 0, 0, width, height);
        const mData = moctx.getImageData(0, 0, width, height).data;
        for (let i = 0; i < total; i++) {
          const ma = mData[i * 4 + 3];
          // ComfyUI active cutout is transparent (Alpha < 240)
          // Convert to continuous weight (0.0 ~ 1.0) with smooth hermite curve
          let w = 1.0 - (ma / 255.0);
          w = Math.max(0.0, Math.min(1.0, (w - 0.15) / 0.7)); // Clean threshold ramp
          relightState.partWeights[i * 6 + partIdx] = w * w * (3.0 - 2.0 * w); // Smoothstep
        }
      };
      mImg.src = `${base}/${shotStr}/Mask_${maskNum}.png?v=${cacheBuster}`;
    }
  };

  depthImg.onerror = () => {
    relightState.isLoaded = false;
  };

  depthImg.src = `${getAssetBaseUrl()}/${shotStr}/Depth.png?v=${Date.now()}`;
}

function renderRelightLoop(timestamp) {
  if (relightState.ctx && relightState.isLoaded && relightState.normalData) {
    render3DFrame(timestamp);
  }
  requestAnimationFrame(renderRelightLoop);
}

function render3DFrame(time) {
  const { ctx, width, height, normalData, partWeights, fgAlpha, colorMode, presetIdx, lightAzimuth, lightElevation } = relightState;
  const preset = RELIGHT_PRESETS[presetIdx];
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // 1. Key Light Direction Vector
  const radAz = (lightAzimuth * Math.PI) / 180;
  const radEl = (lightElevation * Math.PI) / 180;
  const rxy = Math.cos(radEl);

  let lx = Math.sin(radAz) * rxy;
  let ly = Math.cos(radAz) * rxy; // Screen up is +Y
  let lz = Math.sin(radEl);
  const lLen = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1.0;
  lx /= lLen; ly /= lLen; lz /= lLen;

  // 2. Soft Rim / Fill Light
  let rx = -lx * 0.4;
  let ry = -ly * 0.4 + 0.3;
  let rz = 0.4;
  const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1.0;
  rx /= rLen; ry /= rLen; rz /= rLen;

  // 3. Half Vector for Specular Highlight
  let hx = lx, hy = ly, hz = lz + 1.0;
  const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1.0;
  hx /= hLen; hy /= hLen; hz /= hLen;

  // 4. Raymarched Soft Contact Shadows parameters
  const shStyle = (globalState.shadowStyle || "auto").toLowerCase();
  let baseDist = Math.round((Math.cos(radEl) / Math.sin(radEl)) * 14);
  if (shStyle.includes("elongated")) baseDist *= 1.6;
  if (shStyle.includes("tight") || shStyle.includes("directly beneath")) baseDist *= 0.5;
  const shadowDistMax = Math.min(42, Math.max(4, Math.round(baseDist)));
  const stepX = lx * 1.5;
  const stepY = -ly * 1.5; // Invert for canvas indexing
  const occPower = shStyle.includes("deep") ? 0.95 : (shStyle.includes("crisp") ? 0.9 : 0.82);

  const [bgBaseR, bgBaseG, bgBaseB] = hexToRgbArray(globalState.bgColor || "#f4f2ee");
  const total = width * height;

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const fa = fgAlpha ? fgAlpha[i] : 0;
    const px = i % width;
    const py = Math.floor(i / width);

    // --- Compute Background Tabletop Pixel with Soft Raymarched Contact Shadow ---
    let shadowOcclusion = 0;
    if (fa < 0.99) {
      // Multi-step raymarching with penumbra falloff
      for (let s = 2; s <= shadowDistMax; s += 3) {
        const sx = Math.round(px + stepX * s);
        const sy = Math.round(py + stepY * s);
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const sIdx = sy * width + sx;
          const sFa = fgAlpha[sIdx];
          if (sFa > 0.25) {
            const penumbra = 1.0 - (s / (shadowDistMax + 1));
            shadowOcclusion = Math.max(shadowOcclusion, sFa * penumbra * occPower);
            if (shadowOcclusion > 0.75) break;
          }
        }
      }
    }

    const cx = px / width - 0.5;
    const cy = py / height - 0.5;
    const dist = Math.sqrt(cx * cx + cy * cy) * 1.25;
    const vignette = Math.max(0.72, 1.0 - dist * 0.22);
    const shadowMult = Math.max(0.22, 1.0 - shadowOcclusion * 0.68);

    const bgR = Math.min(255, Math.max(0, Math.round(bgBaseR * vignette * shadowMult)));
    const bgG = Math.min(255, Math.max(0, Math.round(bgBaseG * vignette * shadowMult)));
    const bgB = Math.min(255, Math.max(0, Math.round(bgBaseB * vignette * shadowMult)));

    // If completely in background, output directly
    if (fa <= 0.001) {
      data[idx] = bgR;
      data[idx + 1] = bgG;
      data[idx + 2] = bgB;
      data[idx + 3] = 255;
      continue;
    }

    // --- Compute Foreground Lit 3D Shading ---
    let baseR = preset.base[0];
    let baseG = preset.base[1];
    let baseB = preset.base[2];
    let specPow = preset.specPow;
    let specMul = preset.specMul;
    let diffMul = preset.diffMul;
    let ambient = preset.ambient;
    let rimMul = preset.rimMul;

    if (colorMode === "swatch" && partWeights) {
      // Subpixel continuous multi-part color blending
      let sumW = 0;
      let accumR = 0, accumG = 0, accumB = 0;
      let accumSpecPow = 0, accumSpecMul = 0, accumDiff = 0, accumAmb = 0, accumRim = 0;

      for (let p = 0; p < activeSwatches.length; p++) {
        const pw = partWeights[i * 6 + p] || 0;
        if (pw > 0.001) {
          const swatch = activeSwatches[p];
          const [sR, sG, sB] = hexToRgbArray(swatch.color);
          const finish = (swatch.finish || "").toLowerCase();

          let pSpecPow = 24, pSpecMul = 0.8, pDiff = 0.9, pAmb = 0.18, pRim = 0.28;
          if (finish.includes("gloss") || finish.includes("jelly") || finish.includes("dewy") || finish.includes("wet") || finish.includes("mirror")) {
            pSpecPow = 48; pSpecMul = 1.35; pDiff = 0.82; pAmb = 0.15; pRim = 0.38;
          } else if (finish.includes("satin") || finish.includes("glow") || finish.includes("luster") || finish.includes("silky")) {
            pSpecPow = 26; pSpecMul = 0.85; pDiff = 0.9; pAmb = 0.18; pRim = 0.28;
          } else if (finish.includes("matte") || finish.includes("clay") || finish.includes("velvety") || finish.includes("soft-touch")) {
            pSpecPow = 10; pSpecMul = 0.35; pDiff = 0.96; pAmb = 0.22; pRim = 0.18;
          }

          accumR += sR * pw;
          accumG += sG * pw;
          accumB += sB * pw;
          accumSpecPow += pSpecPow * pw;
          accumSpecMul += pSpecMul * pw;
          accumDiff += pDiff * pw;
          accumAmb += pAmb * pw;
          accumRim += pRim * pw;
          sumW += pw;
        }
      }

      if (sumW > 0.001) {
        baseR = accumR / sumW;
        baseG = accumG / sumW;
        baseB = accumB / sumW;
        specPow = accumSpecPow / sumW;
        specMul = accumSpecMul / sumW;
        diffMul = accumDiff / sumW;
        ambient = accumAmb / sumW;
        rimMul = accumRim / sumW;
      } else {
        baseR = 220; baseG = 215; baseB = 210;
      }
    }

    const nx = normalData[idx];
    const ny = normalData[idx + 1];
    const nz = normalData[idx + 2];

    // Wrap Diffuse (Subsurface Scattering approximation for soft cosmetic cream/balm)
    const rawDotL = nx * lx + ny * ly + nz * lz;
    const nDotL = Math.max(0.0, (rawDotL + 0.22) / 1.22);

    // Rim / Fill Lighting
    const rawDotR = nx * rx + ny * ry + nz * rz;
    const nDotR = Math.max(0.0, rawDotR);

    // Blinn-Phong Specular
    const nDotH = Math.max(0.0, nx * hx + ny * hy + nz * hz);
    const spec = Math.pow(nDotH, specPow) * specMul;

    // Fresnel Edge Sheen (Apple luxury aesthetic)
    const fresnel = Math.pow(1.0 - Math.max(0.0, nz), 3.2) * rimMul * 0.85;

    // Curvature Crevice Ambient Occlusion (AO)
    const creviceAO = Math.max(0.55, Math.min(1.0, 0.75 + nz * 0.25));

    // Combined Light Factor
    const lightFactor = (ambient + (nDotL * diffMul) + (nDotR * rimMul) + fresnel) * creviceAO;

    const fgR = Math.min(255, Math.round(baseR * lightFactor + spec * 255));
    const fgG = Math.min(255, Math.round(baseG * lightFactor + spec * 255));
    const fgB = Math.min(255, Math.round(baseB * lightFactor + spec * 255));

    // --- Subpixel Anti-Aliased Blend between Foreground and Background ---
    data[idx] = Math.round(fgR * fa + bgR * (1.0 - fa));
    data[idx + 1] = Math.round(fgG * fa + bgG * (1.0 - fa));
    data[idx + 2] = Math.round(fgB * fa + bgB * (1.0 - fa));
    data[idx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}

// ==========================================================================
// ComfyUI Target & Workflow Deployment Manager
// ==========================================================================
let targetConfigState = {
  comfyInputDir: "",
  workflows: []
};

async function openTargetConfigModal() {
  const modal = document.getElementById("target-config-modal");
  if (!modal) return;
  modal.classList.add("open");

  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      targetConfigState.comfyInputDir = data.comfy_input_dir;
      targetConfigState.workflows = data.workflows || [];

      const pathInput = document.getElementById("cfg-comfy-input-path");
      if (pathInput) pathInput.value = data.comfy_input_dir;

      const dot = document.getElementById("cfg-comfy-status-dot");
      const statusText = document.getElementById("cfg-comfy-status-text");
      if (data.comfy_input_exists) {
        if (dot) dot.className = "status-dot green";
        if (statusText) statusText.textContent = "🟢 ComfyUI input folder verified and connected";
      } else {
        if (dot) dot.className = "status-dot";
        if (statusText) statusText.textContent = "⚠️ Path does not exist currently on disk";
      }

      // Populate Workflow Dropdown & Set Default Base
      const wfSelect = document.getElementById("workflow-base-select");
      if (wfSelect && data.workflows.length > 0) {
        wfSelect.innerHTML = "";
        const defaultWf = "apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json";
        
        data.workflows.forEach(wf => {
          const opt = document.createElement("option");
          opt.value = wf;
          opt.textContent = wf === defaultWf
            ? `⭐ ${wf} (2-Stage Production Master)`
            : wf;
          wfSelect.appendChild(opt);
        });

        if (data.workflows.includes(defaultWf)) {
          wfSelect.value = defaultWf;
        }
      }
    }
  } catch (e) {
    console.warn("Could not fetch deployment settings", e);
  }

  // Restore CDN inputs
  const cdnInput = document.getElementById("cfg-cdn-url");
  const sourceSelect = document.getElementById("cfg-asset-source");
  if (cdnInput) cdnInput.value = customCdnUrl || DEFAULT_CDN_BASE;
  if (sourceSelect) sourceSelect.value = assetSourceMode;
}

function onAssetSourceChange(val) {
  assetSourceMode = val;
  localStorage.setItem("spatial_asset_source", val);

  const directSelect = document.getElementById("direct-asset-source-select");
  if (directSelect && directSelect.value !== val) {
    directSelect.value = val;
  }
  const modalSelect = document.getElementById("cfg-asset-source");
  if (modalSelect && modalSelect.value !== val) {
    modalSelect.value = val;
  }

  const dot = document.getElementById("cfg-cdn-status-dot");
  const statusText = document.getElementById("cfg-cdn-status-text");
  if (val === "cdn") {
    if (dot) dot.className = "status-dot green";
    if (statusText) statusText.textContent = "🟢 BunnyCDN Active (Cloud Connected)";
    showToast("🌐 Switched to BunnyCDN Cloud");
  } else {
    if (dot) dot.className = "status-dot green";
    if (statusText) statusText.textContent = "💻 Local Server Active (/guides)";
    showToast("💻 Switched to Local PC Storage (/guides)");
  }
  updateShotBadge();
  renderSwatchRows();
  if (typeof updateLiveGuides === "function") updateLiveGuides();
}

function saveCdnSettings() {
  const cdnInput = document.getElementById("cfg-cdn-url");
  const sourceSelect = document.getElementById("cfg-asset-source");
  if (cdnInput) {
    customCdnUrl = cdnInput.value.trim().replace(/\/$/, "");
    localStorage.setItem("spatial_custom_cdn", customCdnUrl);
  }
  if (sourceSelect) {
    onAssetSourceChange(sourceSelect.value);
  }
  showToast("✅ Asset source updated!");
}

function closeTargetConfigModal(e) {
  if (e && e.target && e.target.classList.contains("modal-content")) return;
  const modal = document.getElementById("target-config-modal");
  if (modal) modal.classList.remove("open");
}

async function saveTargetInputPath() {
  const pathInput = document.getElementById("cfg-comfy-input-path");
  if (!pathInput) return;

  const newPath = pathInput.value.trim();
  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comfy_input_dir: newPath })
    });
    if (res.ok) {
      showToast("✅ Target ComfyUI input path saved!");
      openTargetConfigModal();
    }
  } catch (e) {
    showToast("⚠️ Failed to update target path");
  }
}

async function createNewShotFolder() {
  const numInput = document.getElementById("new-shot-number");
  const cloneSelect = document.getElementById("clone-shot-template");
  if (!numInput || !numInput.value) {
    showToast("⚠️ Please enter a shot number (e.g. 0101)");
    return;
  }

  const shotNum = parseInt(numInput.value, 10);
  const cloneFrom = cloneSelect ? cloneSelect.value : "";

  try {
    const res = await fetch("/api/create_shot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shot: shotNum, clone_from: cloneFrom })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`✅ Created Shot ${data.shot} directory!`);
      const slider = document.getElementById("shot-slider");
      if (slider && shotNum > parseInt(slider.max, 10)) {
        slider.max = shotNum;
      }
      onShotInputChange(shotNum);
      closeTargetConfigModal();
    } else {
      showToast("⚠️ Failed to create shot folder");
    }
  } catch (e) {
    showToast("⚠️ Error creating shot folder");
  }
}


async function injectAndExportWorkflow() {
  syncAllInputsToState();
  const baseSelect = document.getElementById("workflow-base-select");
  const outInput = document.getElementById("workflow-output-name");

  const baseWf = baseSelect ? baseSelect.value : "apple_spatial_hybrid_sdxl_flux_ipadapter_master_v3.json";
  let outName = outInput ? outInput.value.trim() : `custom_injected_lookdev_workflow.json`;
  if (!outName.endsWith(".json")) outName += ".json";

  const shotStr = String(currentShot).padStart(4, "0");
  const regionalData = getSDXLRegionalData();
  const payload = {
    base_workflow: baseWf,
    output_workflow: outName,
    shot: shotStr,
    sdxl_master: document.getElementById("sdxl-master-prompt-text")?.textContent || buildGlobalScenePromptText(),
    flux_master: document.getElementById("flux-master-prompt-text")?.textContent || buildFLUXMasterPromptText(),
    global_scene: buildGlobalScenePromptText(),
    negative: globalState.negative,
    p0_use_image: globalState.useP0Image !== false,
    p0_use_pos_text: globalState.useP0PosText !== false,
    p0_use_neg_text: !!globalState.useP0NegText,
    p0_image_src: globalState.p0ImageSrc || "",
    depth_strength: globalState.depthStrength !== undefined ? globalState.depthStrength : 0.65,
    depth_start: globalState.depthStart !== undefined ? globalState.depthStart : 0.0,
    depth_end: globalState.depthEnd !== undefined ? globalState.depthEnd : 0.55,
    normal_strength: globalState.normalStrength !== undefined ? globalState.normalStrength : 0.30,
    normal_start: globalState.normalStart !== undefined ? globalState.normalStart : 0.0,
    normal_end: globalState.normalEnd !== undefined ? globalState.normalEnd : 0.50,
    sdxl_cfg: globalState.sdxlCfg !== undefined ? globalState.sdxlCfg : 5.5,
    sdxl_denoise: globalState.sdxlDenoise !== undefined ? globalState.sdxlDenoise : 1.0,
    flux_cfg: globalState.fluxCfg !== undefined ? globalState.fluxCfg : 1.0,
    flux_lora_weight: globalState.fluxLoraWeight !== undefined ? globalState.fluxLoraWeight : 0.55,
    flux_guidance: globalState.fluxGuidance !== undefined ? globalState.fluxGuidance : 2.8,
    flux_denoise: globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.21,
    background: regionalData.Background,
    regional: regionalData.Parts
  };

  try {
    showToast(`⏳ Deploying Shot ${shotStr} & Injecting Workflow ${outName}...`);
    const res = await fetch("/api/inject_workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`🚀 Exported ${outName} & Deployed WebP images to ComfyUI input!`);

      const blob = new Blob([JSON.stringify(data.workflow_json, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = outName;
      a.click();

      closeTargetConfigModal();
    } else {
      showToast("⚠️ Failed to inject workflow");
    }
  } catch (e) {
    showToast("⚠️ Error generating injected workflow: " + e);
  }
}

// ==========================================================================
// LookDev Entire Preset Manager (Save, Load, Export JSON, Import JSON)
// ==========================================================================

let loadedPresets = [];
let activePresetId = localStorage.getItem("spatial_last_preset_id") || "apple_cosmetic_studio_master";

// Fetch list of presets from backend or local fallback
async function fetchPresetsList(autoLoadActive = false) {
  try {
    const res = await fetch("/api/presets");
    if (res.ok) {
      const data = await res.json();
      if (data.presets && Array.isArray(data.presets)) {
        loadedPresets = data.presets;
        renderPresetDropdown(loadedPresets);
        if (autoLoadActive && loadedPresets.length > 0) {
          const targetId = (activePresetId && loadedPresets.some(p => p.id === activePresetId)) ? activePresetId : loadedPresets[0].id;
          await onPresetDropdownChange(targetId);
        }
        return;
      }
    }
  } catch (e) {
    console.warn("Presets API offline, using local fallback");
  }

  // Fallback if offline
  loadedPresets = [
    {
      id: "apple_cosmetic_studio_master",
      name: "🍎 Apple Cosmetic Studio (0005 Master)",
      description: "Classic 6-part skincare lookdev: Terracotta, Pure Cream, Rose Gel, Matcha, Honey, Peach Foundation",
      isBuiltin: true,
      shot: 5,
      previewColors: ["#f4f2ee", "#8b3a2b", "#f8fafc", "#ec4899", "#657e4e", "#d97706", "#f59e0b"]
    }
  ];
  renderPresetDropdown(loadedPresets);
  if (autoLoadActive) {
    onPresetDropdownChange("apple_cosmetic_studio_master");
  }
}

function renderPresetDropdown(presets) {
  const select = document.getElementById("preset-main-select");
  const countBadge = document.getElementById("preset-count-badge");
  if (!select) return;

  if (countBadge) {
    countBadge.textContent = `${presets.length} Presets`;
  }

  select.innerHTML = "";
  presets.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === activePresetId) opt.selected = true;
    select.appendChild(opt);
  });

  const activeP = presets.find(p => p.id === activePresetId) || presets[0];
  if (activeP) {
    renderPresetPalettePreview(activeP);
    updateDeletePresetBtnState(activeP);
  }
}

function renderPresetPalettePreview(presetSummary) {
  const container = document.getElementById("preset-palette-preview");
  const descHint = document.getElementById("preset-desc-hint");
  if (!container) return;

  if (descHint && presetSummary.description) {
    descHint.textContent = presetSummary.description;
    descHint.title = presetSummary.description;
  }

  container.innerHTML = "";
  const colors = presetSummary.previewColors || [globalState.bgColor || "#f4f2ee", ...activeSwatches.map(s => s.color)];

  colors.forEach((col, idx) => {
    const chip = document.createElement("div");
    chip.className = `palette-chip ${idx === 0 ? "chip-floor" : ""}`;
    chip.style.backgroundColor = col;
    chip.title = idx === 0 ? `P0 Floor Tabletop: ${col}` : `P${idx} Swatch: ${col}`;

    const tag = document.createElement("span");
    tag.className = "palette-chip-tag";
    tag.textContent = idx === 0 ? "P0" : `P${idx}`;
    chip.appendChild(tag);

    container.appendChild(chip);
  });
}

function updateDeletePresetBtnState(preset) {
  const delBtn = document.getElementById("btn-delete-preset");
  if (!delBtn) return;
  // Builtin presets cannot be deleted
  delBtn.style.display = (preset && !preset.isBuiltin) ? "inline-flex" : "none";
}

async function onPresetDropdownChange(presetId) {
  if (!presetId) return;
  activePresetId = presetId;

  const select = document.getElementById("preset-main-select");
  if (select && select.value !== presetId) {
    select.value = presetId;
  }

  try {
    const res = await fetch(`/api/presets?id=${encodeURIComponent(presetId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.preset) {
        applyPresetData(data.preset);
        return;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch preset details via API", e);
  }

  // Fallback search in memory or localStorage
  const local = loadedPresets.find(p => p.id === presetId);
  if (local && local.activeSwatches) {
    applyPresetData(local);
    return;
  }

  const stored = localStorage.getItem(`lookdev_preset_${presetId}`);
  if (stored) {
    try {
      applyPresetData(JSON.parse(stored));
    } catch (err) {
      console.warn("Could not parse stored preset", err);
    }
  }
}

// Apply Full Preset Object to Studio State
function applyPresetData(preset) {
  if (!preset) return;
  activePresetId = preset.id || activePresetId;
  localStorage.setItem("spatial_last_preset_id", activePresetId);
  if (preset.name) localStorage.setItem("spatial_last_preset_name", preset.name);
  if (preset.description) localStorage.setItem("spatial_last_preset_desc", preset.description);

  // 1. Restore 3D Shot selection
  if (preset.shot !== undefined) {
    currentShot = parseInt(preset.shot, 10);
    const slider = document.getElementById("shot-slider");
    const input = document.getElementById("shot-input");
    if (slider) slider.value = currentShot;
    if (input) input.value = currentShot;
    updateShotBadge();
  }

  // 2. Restore Global State & Inputs
  if (preset.globalState) {
    globalState = Object.assign({}, globalState, preset.globalState);

    const elShared = document.getElementById("global-style-header");
    if (elShared) elShared.value = globalState.sharedStyle || "";

    const elFluxPrefix = document.getElementById("flux-specific-prefix");
    if (elFluxPrefix) elFluxPrefix.value = globalState.fluxPrefix || "";

    const elCamera = document.getElementById("global-camera-text");
    if (elCamera) elCamera.value = globalState.camera || "";

    const elSubject = document.getElementById("global-subject-type");
    if (elSubject) elSubject.value = globalState.subjectType || "";

    const elNeg = document.getElementById("global-negative-textarea");
    if (elNeg) elNeg.value = globalState.negative || "";

    const elShadow = document.getElementById("shadow-style-select");
    if (elShadow && globalState.shadowStyle) elShadow.value = globalState.shadowStyle;

    const az = globalState.lightingAzimuth !== undefined ? globalState.lightingAzimuth : 45;
    const el = globalState.lightingElevation !== undefined ? globalState.lightingElevation : 30;
    const elAz = document.getElementById("light-azimuth-slider");
    if (elAz) elAz.value = az;
    const elEl = document.getElementById("light-elevation-slider");
    if (elEl) elEl.value = el;

    const azLabel = getAzimuthLabel(az);
    const elLabel = getElevationLabel(el);
    const valAz = document.getElementById("val-azimuth");
    if (valAz) valAz.textContent = `${az}° (${azLabel})`;
    const valEl = document.getElementById("val-elevation");
    if (valEl) valEl.textContent = `${el}° (${elLabel})`;
    const badgeLit = document.getElementById("lighting-vector-badge");
    if (badgeLit) badgeLit.textContent = `☀️ ${az}° (${azLabel}) | ${el}°`;

    const elLitText = document.getElementById("global-lighting-text");
    if (elLitText) elLitText.value = globalState.lighting || buildLightingPrompt(az, el, globalState.shadowStyle);

    // Floor / P0 Color, Desc, Material, Finish (restores faithfully to BOTH tabs)
    const bgColor = globalState.bgColor || "#f4f2ee";
    const bgDesc = globalState.bgColorDesc || hexToNaturalColorName(bgColor);
    const bgMat = globalState.bgMaterial || "clean matte studio tabletop surface";
    const bgFin = globalState.bgFinish || "seamless non-reflective finish, zero glare";

    const gPicker = document.getElementById("global-bg-color-picker");
    const gText = document.getElementById("global-bg-color-text");
    const gDesc = document.getElementById("global-p0-color-desc");
    const gMat = document.getElementById("global-p0-mat-text");
    const gFin = document.getElementById("global-p0-finish-text");
    if (gPicker) gPicker.value = bgColor;
    if (gText) gText.value = bgColor;
    if (gDesc) gDesc.value = bgDesc;
    if (gMat) gMat.value = bgMat;
    if (gFin) gFin.value = bgFin;

    const p0Picker = document.getElementById("bg-color-picker");
    const p0Text = document.getElementById("bg-color-text");
    const p0Desc = document.getElementById("color-desc-p0");
    const p0Mat = document.getElementById("p0-mat-text");
    const p0Fin = document.getElementById("p0-finish-text");
    if (p0Picker) p0Picker.value = bgColor;
    if (p0Text) p0Text.value = bgColor;
    if (p0Desc) p0Desc.value = bgDesc;
    if (p0Mat) p0Mat.value = bgMat;
    if (p0Fin) p0Fin.value = bgFin;

    const p0CustomToggle = document.getElementById("p0-custom-prompt-toggle");
    const p0CustomTa = document.getElementById("p0-custom-prompt-textarea");
    const liveP0El = document.getElementById("live-prompt-p0-global");
    if (p0CustomToggle) p0CustomToggle.checked = !!globalState.isP0CustomPrompt;
    if (p0CustomTa) {
      p0CustomTa.value = globalState.p0CustomPrompt || "";
      p0CustomTa.style.display = globalState.isP0CustomPrompt ? "block" : "none";
    }
    if (liveP0El) {
      liveP0El.style.display = globalState.isP0CustomPrompt ? "none" : "block";
    }

    // P0 Image & Toggles Restore
    const p0Img = document.getElementById("p0-img-preview");
    const p0Ph = document.getElementById("p0-img-placeholder");
    if (globalState.p0ImageSrc && p0Img && p0Ph) {
      p0Img.src = globalState.p0ImageSrc;
      p0Img.style.display = "block";
      p0Ph.style.display = "none";
    }
    const p0UseImgToggle = document.getElementById("p0-use-image-toggle");
    const p0ImgChip = document.getElementById("p0-toggle-img-chip");
    if (p0UseImgToggle) {
      p0UseImgToggle.checked = globalState.useP0Image !== false;
      if (p0ImgChip) p0ImgChip.classList.toggle("active-img", p0UseImgToggle.checked);
    }
    const p0UsePosToggle = document.getElementById("p0-use-pos-toggle") || document.getElementById("p0-use-text-toggle");
    const p0PosChip = document.getElementById("p0-toggle-pos-chip") || document.getElementById("p0-toggle-txt-chip");
    if (p0UsePosToggle) {
      p0UsePosToggle.checked = globalState.useP0PosText !== false;
      if (p0PosChip) p0PosChip.classList.toggle("active-pos", p0UsePosToggle.checked);
    }
    const p0UseNegToggle = document.getElementById("p0-use-neg-toggle");
    const p0NegChip = document.getElementById("p0-toggle-neg-chip");
    const p0NegBar = document.getElementById("p0-neg-prompt-bar");
    const p0NegTa = document.getElementById("p0-negative-prompt-textarea");
    if (p0UseNegToggle) {
      p0UseNegToggle.checked = !!globalState.useP0NegText;
      if (p0NegChip) p0NegChip.classList.toggle("active-neg", p0UseNegToggle.checked);
    }
    if (p0NegBar) {
      p0NegBar.style.display = globalState.useP0NegText ? "flex" : "none";
    }
    if (p0NegTa && globalState.p0NegativePrompt) {
      p0NegTa.value = globalState.p0NegativePrompt;
      autoResize(p0NegTa);
    }

    syncComfyParamsToUI();
    syncBgDescFromCMF();
  }

  // 3. Restore Regional Swatches (P1 ~ P6)
  if (preset.activeSwatches && Array.isArray(preset.activeSwatches)) {
    activeSwatches = JSON.parse(JSON.stringify(preset.activeSwatches));
    renderSwatchRows();
  }

  // 4. Restore 3D Relighting & Viewport State
  if (preset.relightState) {
    if (preset.relightState.lightAzimuth !== undefined) relightState.lightAzimuth = preset.relightState.lightAzimuth;
    if (preset.relightState.lightElevation !== undefined) relightState.lightElevation = preset.relightState.lightElevation;
    if (preset.relightState.presetIdx !== undefined) relightState.presetIdx = preset.relightState.presetIdx;
    if (preset.relightState.colorMode) {
      relightState.colorMode = preset.relightState.colorMode;
      const btnColorMode = document.getElementById("btn-toggle-color-mode");
      if (btnColorMode) {
        btnColorMode.textContent = relightState.colorMode === "swatch" ? "🎨 CMF Colors" : "🏺 Clay Mode";
        btnColorMode.classList.toggle("clay", relightState.colorMode === "clay");
      }
    }
    render3DLitViewport();
  }

  // 5. Re-synthesize Prompts & Palette UI
  updateSynthesizer();
  const summaryObj = {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    isBuiltin: preset.isBuiltin,
    previewColors: [globalState.bgColor || "#f4f2ee", ...activeSwatches.map(s => s.color)]
  };
  renderPresetPalettePreview(summaryObj);
  updateDeletePresetBtnState(preset);

  // Sync Dropdown Selection
  const select = document.getElementById("preset-main-select");
  if (select && preset.id) select.value = preset.id;

  setTimeout(() => {
    document.querySelectorAll(".cmf-textarea, .color-desc-textarea").forEach(el => autoResize(el));
  }, 100);

  showToast(`✨ Loaded Preset: ${preset.name || "Custom Preset"}`);
}

// Modal Save Preset
function openSavePresetModal() {
  syncAllInputsToState();
  const modal = document.getElementById("save-preset-modal");
  const nameInput = document.getElementById("save-preset-name");
  const descInput = document.getElementById("save-preset-desc");

  let currentPreset = loadedPresets.find(p => p.id === activePresetId);
  if (!currentPreset) {
    const lastSavedId = localStorage.getItem("spatial_last_preset_id");
    if (lastSavedId) {
      currentPreset = loadedPresets.find(p => p.id === lastSavedId);
    }
  }

  const savedName = localStorage.getItem("spatial_last_preset_name");
  const savedDesc = localStorage.getItem("spatial_last_preset_desc");

  let defaultName = "";
  if (currentPreset) {
    defaultName = currentPreset.isBuiltin ? `${currentPreset.name} (Custom)` : currentPreset.name;
  } else if (savedName) {
    defaultName = savedName;
  } else {
    const selectText = document.getElementById("preset-main-select")?.selectedOptions[0]?.text;
    defaultName = selectText || `Custom LookDev ${new Date().toLocaleDateString("ko-KR")} #${loadedPresets.length + 1}`;
  }

  const defaultDesc = currentPreset ? (currentPreset.description || "") : (savedDesc || "");

  if (modal) modal.style.display = "flex";
  if (nameInput) {
    nameInput.value = defaultName;
    nameInput.focus();
    nameInput.select();
  }
  if (descInput) {
    descInput.value = defaultDesc;
  }
}

function closeSavePresetModal() {
  const modal = document.getElementById("save-preset-modal");
  if (modal) modal.style.display = "none";
}

async function confirmSavePreset() {
  syncAllInputsToState();
  const nameInput = document.getElementById("save-preset-name");
  const descInput = document.getElementById("save-preset-desc");
  const name = nameInput ? nameInput.value.trim() : "";
  const desc = descInput ? descInput.value.trim() : "";

  if (!name) {
    showToast("⚠️ Please enter a preset name");
    return;
  }

  const currentPreset = loadedPresets.find(p => p.id === activePresetId);
  const currentPresetName = currentPreset ? currentPreset.name : "";
  const targetId = (name === currentPresetName && activePresetId && !currentPreset?.isBuiltin) ? activePresetId : "";

  const presetData = {
    id: targetId,
    name: name,
    description: desc || `${activeSwatches.length} swatches lookdev setup`,
    shot: currentShot,
    isBuiltin: false,
    globalState: JSON.parse(JSON.stringify(globalState)),
    activeSwatches: JSON.parse(JSON.stringify(activeSwatches)),
    relightState: {
      lightAzimuth: relightState.lightAzimuth,
      lightElevation: relightState.lightElevation,
      presetIdx: relightState.presetIdx,
      colorMode: relightState.colorMode
    }
  };

  try {
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presetData)
    });

    if (res.ok) {
      const result = await res.json();
      activePresetId = result.id;
      localStorage.setItem("spatial_last_preset_id", activePresetId);
      localStorage.setItem("spatial_last_preset_name", name);
      localStorage.setItem("spatial_last_preset_desc", desc);
      await fetchPresetsList();
      closeSavePresetModal();
      showToast(`💾 Saved Preset: ${name}`);
    } else {
      showToast("⚠️ Failed to save preset to server");
    }
  } catch (e) {
    // Save to localStorage as fallback
    const localId = `custom_${Date.now()}`;
    presetData.id = localId;
    localStorage.setItem(`lookdev_preset_${localId}`, JSON.stringify(presetData));
    activePresetId = localId;
    localStorage.setItem("spatial_last_preset_id", activePresetId);
    localStorage.setItem("spatial_last_preset_name", name);
    localStorage.setItem("spatial_last_preset_desc", desc);
    await fetchPresetsList();
    closeSavePresetModal();
    showToast(`💾 Saved Preset locally: ${name}`);
  }
}

// Export Current Preset as Downloadable JSON File
function exportPresetJson() {
  syncAllInputsToState();
  const currentPresetName = document.getElementById("preset-main-select")?.selectedOptions[0]?.text || "LookDev_Preset";
  const cleanFileName = currentPresetName.replace(/[^a-zA-Z0-9가-힣_-]/g, "_").substring(0, 30);

  const exportObj = {
    version: "1.0",
    name: currentPresetName,
    description: "Exported Spatial LookDev Studio Preset",
    exportedAt: new Date().toISOString(),
    shot: currentShot,
    globalState: globalState,
    activeSwatches: activeSwatches,
    relightState: {
      lightAzimuth: relightState.lightAzimuth,
      lightElevation: relightState.lightElevation,
      presetIdx: relightState.presetIdx,
      colorMode: relightState.colorMode
    }
  };

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Preset_${cleanFileName}.json`;
  a.click();
  showToast(`📥 Exported Preset JSON: Preset_${cleanFileName}.json`);
}

// Trigger Import Preset JSON File Picker
function triggerImportPresetJson() {
  const fileInput = document.getElementById("preset-file-input");
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
}

function handlePresetFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      
      // Smart Auto-Detection: ComfyUI Workflow JSON format vs Prompt Compositor Preset JSON format
      if (parsed.nodes && Array.isArray(parsed.nodes)) {
        importFromComfyUIWorkflow(parsed);
        showToast(`🔄 Imported & Populated from ComfyUI Workflow: ${file.name}`);
        return;
      }
      
      if (!parsed.activeSwatches && !parsed.globalState) {
        showToast("⚠️ Unrecognized JSON format (expected ComfyUI Workflow or Preset JSON)");
        return;
      }
      
      applyPresetData(parsed);
      showToast(`📂 Successfully loaded preset: ${parsed.name || file.name}`);
    } catch (err) {
      showToast("⚠️ Failed to parse JSON file: " + err);
    }
  };
  reader.readAsText(file);
}

// Delete Currently Selected Preset
async function deleteCurrentPreset() {
  const currentPreset = loadedPresets.find(p => p.id === activePresetId) || { name: "current preset", id: activePresetId };
  if (!confirm(`정말 "${currentPreset.name}" 프리셋을 삭제하시겠습니까?`)) return;

  try {
    const res = await fetch("/api/delete_preset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activePresetId })
    });

    localStorage.removeItem(`lookdev_preset_${activePresetId}`);

    if (res.ok) {
      showToast(`🗑️ Deleted preset: ${currentPreset.name}`);
      await fetchPresetsList();
      activePresetId = loadedPresets.length > 0 ? loadedPresets[0].id : "apple_cosmetic_studio_master";
      onPresetDropdownChange(activePresetId);
    } else {
      // If server delete fails, still check local removal
      await fetchPresetsList();
      activePresetId = loadedPresets.length > 0 ? loadedPresets[0].id : "apple_cosmetic_studio_master";
      onPresetDropdownChange(activePresetId);
      showToast(`🗑️ Removed preset`);
    }
  } catch (e) {
    localStorage.removeItem(`lookdev_preset_${activePresetId}`);
    await fetchPresetsList();
    activePresetId = loadedPresets.length > 0 ? loadedPresets[0].id : "apple_cosmetic_studio_master";
    onPresetDropdownChange(activePresetId);
    showToast("🗑️ Removed preset locally");
  }
}

// Robust Clipboard Helper
async function safeCopyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn("navigator.clipboard failed, trying fallback textarea copy...", e);
    }
  }
  // Fallback using textarea
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  let successful = false;
  try {
    successful = document.execCommand("copy");
  } catch (err) {
    console.error("execCommand copy failed:", err);
  }
  document.body.removeChild(textArea);
  return successful;
}

// ==========================================================================
// Dynamic SeaDance 2.5 + FLUX 2-Stage LookDev Workflow Generator
// Uses ByteDance2ReferenceNode Cloud API with 3D Depth & Swatch Reference
// ==========================================================================

function buildDynamicSeaDanceFluxWorkflow() {
  const shotStr = String(currentShot).padStart(4, "0");
  const fluxPrompt = typeof buildFLUXMasterPromptText === "function" ? buildFLUXMasterPromptText() : "";
  const fluxDenoise = parseFloat(globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.21);
  const fluxGuidance = parseFloat(globalState.fluxGuidance !== undefined ? globalState.fluxGuidance : 2.8);
  const fluxLoraWeight = parseFloat(globalState.fluxLoraWeight !== undefined ? globalState.fluxLoraWeight : 0.55);
  const depthPassName = globalState.depthPassFile || "Depth.png";

  const nodes = [];
  const links = [];
  const nodeMap = {};
  let nodeIdCounter = 0;
  let linkIdCounter = 0;

  const nextNodeId = () => ++nodeIdCounter;
  const nextLinkId = () => ++linkIdCounter;

  const addLink = (fromNode, fromSlot, toNode, toSlot, linkType) => {
    const lid = nextLinkId();
    links.push([lid, fromNode, fromSlot, toNode, toSlot, linkType]);
    return lid;
  };

  // 1. Documentation Note Node
  const noteId = nextNodeId();
  nodes.push({
    id: noteId,
    type: "Note",
    pos: [-1180, -120],
    size: [1200, 120],
    title: `Spatial LookDev: ByteDance Seedance 2.5 + FLUX Hybrid Pipeline (Shot ${shotStr})`,
    widgets_values: [
      `Spatial LookDev 2-Stage Dynamic Pipeline (Shot ${shotStr}) [ByteDance Seedance 2.5 + FLUX]\n---------------------------------------------------------------------------------------------------------\n• Stage 1 (ByteDance Seedance 2.5): Cloud API Reference Node with 3D Depth Video & Texture Reference.\n• Stage 2 (FLUX.1-dev LoRA Refiner): Apple Minimal Craft CMF refinement on extracted Still Frame (Denoise: ${fluxDenoise}).`
    ],
    color: "#1e293b",
    bgcolor: "#0f172a"
  });

  // 2. Swatch 1 Texture Reference Loader
  const refImgId = nextNodeId();
  const refImgNode = {
    id: refImgId,
    type: "LoadImage",
    pos: [-1180, 50],
    size: [320, 320],
    title: "1. Swatch Texture Reference (ref_p1.webp)",
    widgets_values: ["ref_p1.webp", "image"],
    outputs: [
      { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 },
      { name: "MASK", type: "MASK", links: null, slot_index: 1 }
    ]
  };
  nodes.push(refImgNode);
  nodeMap[refImgId] = refImgNode;

  // 3. Background Reference Loader
  const bgImgId = nextNodeId();
  const bgImgNode = {
    id: bgImgId,
    type: "LoadImage",
    pos: [-1180, 420],
    size: [320, 320],
    title: "2. Floor Tabletop Reference (ref_p0_floor.webp)",
    widgets_values: ["ref_p0_floor.webp", "image"],
    outputs: [
      { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 },
      { name: "MASK", type: "MASK", links: null, slot_index: 1 }
    ]
  };
  nodes.push(bgImgNode);
  nodeMap[bgImgId] = bgImgNode;

  // 4. 3D Depth Image Loader & Video Packager
  const depthImgId = nextNodeId();
  const depthImgNode = {
    id: depthImgId,
    type: "LoadImage",
    pos: [-800, 50],
    size: [320, 320],
    title: `3. 3D Depth Pass (${depthPassName})`,
    widgets_values: [depthPassName, "image"],
    outputs: [
      { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 },
      { name: "MASK", type: "MASK", links: null, slot_index: 1 }
    ]
  };
  nodes.push(depthImgNode);
  nodeMap[depthImgId] = depthImgNode;

  // 4.1 Repeat Depth Image to 48 frames (2.0s at 24fps) to meet ByteDance 1.8s minimum requirement
  const repeatBatchId = nextNodeId();
  const repeatBatchNode = {
    id: repeatBatchId,
    type: "RepeatImageBatch",
    pos: [-480, 50],
    size: [240, 90],
    title: "Repeat Depth (48 Frames = 2.0s Video)",
    widgets_values: [48],
    inputs: [{ name: "image", type: "IMAGE", link: null }],
    outputs: [{ name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 }]
  };
  nodes.push(repeatBatchNode);
  nodeMap[repeatBatchId] = repeatBatchNode;
  const lDepthRep = addLink(depthImgId, 0, repeatBatchId, 0, "IMAGE");
  nodeMap[depthImgId].outputs[0].links.push(lDepthRep);
  repeatBatchNode.inputs[0].link = lDepthRep;

  const createVidId = nextNodeId();
  const createVidNode = {
    id: createVidId,
    type: "CreateVideo",
    pos: [-220, 50],
    size: [240, 120],
    title: "Package 3D Depth to Video Stream",
    widgets_values: [24, 8],
    inputs: [
      { name: "images", type: "IMAGE", link: null },
      { name: "audio", type: "AUDIO", link: null },
      { name: "fps", type: "FLOAT", link: null },
      { name: "bit_depth", type: "INT", link: null }
    ],
    outputs: [
      { name: "VIDEO", type: "VIDEO", links: [], slot_index: 0 }
    ]
  };
  nodes.push(createVidNode);
  nodeMap[createVidId] = createVidNode;
  const lDepthVid = addLink(repeatBatchId, 0, createVidId, 0, "IMAGE");
  nodeMap[repeatBatchId].outputs[0].links.push(lDepthVid);
  createVidNode.inputs[0].link = lDepthVid;

  // 5. ByteDance Seedance 2.5 Cloud Node
  const seedanceNodeId = nextNodeId();
  const seedanceNode = {
    id: seedanceNodeId,
    type: "ByteDance2ReferenceNode",
    pos: [50, 50],
    size: [480, 550],
    title: "ByteDance Seedance 2.5 (High Precision 3D Spatial Tracking)",
    widgets_values: [
      "Seedance 2.5",
      fluxPrompt,
      "720p",
      "adaptive",
      10,
      false,
      "reference",
      "mp4",
      true,
      false,
      parseInt(globalState.seed || 7),
      "fixed",
      false
    ],
    inputs: [
      { name: "model", type: "COMFY_DYNAMICCOMBO_V3", link: null },
      { name: "model.prompt", type: "STRING", link: null },
      { name: "model.resolution", type: "COMBO", link: null },
      { name: "model.ratio", type: "COMBO", link: null },
      { name: "model.duration", type: "INT", link: null },
      { name: "model.generate_audio", type: "BOOLEAN", link: null },
      { name: "model.task_type", type: "COMBO", link: null },
      { name: "model.output_format", type: "COMBO", link: null },
      { name: "model.reference_images.image_1", type: "IMAGE", link: null },
      { name: "model.reference_images.image_2", type: "IMAGE", link: null },
      { name: "model.reference_videos.video_1", type: "VIDEO", link: null },
      { name: "model.reference_videos.video_2", type: "VIDEO", link: null },
      { name: "model.reference_audios.audio_1", type: "AUDIO", link: null },
      { name: "model.reference_assets.asset_1", type: "STRING", link: null },
      { name: "model.auto_downscale", type: "BOOLEAN", link: null },
      { name: "model.auto_upscale", type: "BOOLEAN", link: null },
      { name: "seed", type: "INT", link: null },
      { name: "watermark", type: "BOOLEAN", link: null }
    ],
    outputs: [
      { name: "VIDEO", type: "VIDEO", links: [], slot_index: 0 }
    ]
  };
  nodes.push(seedanceNode);
  nodeMap[seedanceNodeId] = seedanceNode;

  // Link ref images and depth video to ByteDance node
  const lRef1 = addLink(refImgId, 0, seedanceNodeId, 8, "IMAGE");
  nodeMap[refImgId].outputs[0].links.push(lRef1);
  seedanceNode.inputs[8].link = lRef1;

  const lRef2 = addLink(bgImgId, 0, seedanceNodeId, 9, "IMAGE");
  nodeMap[bgImgId].outputs[0].links.push(lRef2);
  seedanceNode.inputs[9].link = lRef2;

  const lVid1 = addLink(createVidId, 0, seedanceNodeId, 10, "VIDEO");
  nodeMap[createVidId].outputs[0].links.push(lVid1);
  seedanceNode.inputs[10].link = lVid1;

  // 6. Extract Still Frame from Video Output
  const getCompId = nextNodeId();
  const getCompNode = {
    id: getCompId,
    type: "GetVideoComponents",
    pos: [430, 50],
    size: [240, 120],
    title: "Extract Frames from Seedance Video",
    widgets_values: [],
    inputs: [{ name: "video", type: "VIDEO", link: null }],
    outputs: [
      { name: "images", type: "IMAGE", links: [], slot_index: 0 },
      { name: "audio", type: "AUDIO", links: null, slot_index: 1 },
      { name: "fps", type: "FLOAT", links: null, slot_index: 2 },
      { name: "bit_depth", type: "INT", links: null, slot_index: 3 }
    ]
  };
  nodes.push(getCompNode);
  nodeMap[getCompId] = getCompNode;
  const lVidOut = addLink(seedanceNodeId, 0, getCompId, 0, "VIDEO");
  nodeMap[seedanceNodeId].outputs[0].links.push(lVidOut);
  getCompNode.inputs[0].link = lVidOut;

  const pickStillId = nextNodeId();
  const pickStillNode = {
    id: pickStillId,
    type: "ImageFromBatch",
    pos: [720, 50],
    size: [260, 110],
    title: "Pick Still Frame (LookDev Frame 0)",
    widgets_values: [0, 1],
    inputs: [{ name: "image", type: "IMAGE", link: null }],
    outputs: [{ name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 }]
  };
  nodes.push(pickStillNode);
  nodeMap[pickStillId] = pickStillNode;
  const lImgs = addLink(getCompId, 0, pickStillId, 0, "IMAGE");
  nodeMap[getCompId].outputs[0].links.push(lImgs);
  pickStillNode.inputs[0].link = lImgs;

  // 6.1 Preview Node for Stage 1 SeaDance Still Image
  const seedancePreviewId = nextNodeId();
  const seedancePreviewNode = {
    id: seedancePreviewId,
    type: "PreviewImage",
    pos: [720, 200],
    size: [300, 320],
    title: "🌊 1단계 SeaDance 2.5 원본 스틸 미리보기",
    inputs: [{ name: "images", type: "IMAGE", link: null }]
  };
  nodes.push(seedancePreviewNode);
  nodeMap[seedancePreviewId] = seedancePreviewNode;
  const lSeaPrev = addLink(pickStillId, 0, seedancePreviewId, 0, "IMAGE");
  nodeMap[pickStillId].outputs[0].links.push(lSeaPrev);
  seedancePreviewNode.inputs[0].link = lSeaPrev;

  // 7. Stage 2: FLUX.1-dev Refiner Pipeline
  const fluxUnetId = nextNodeId();
  nodes.push({
    id: fluxUnetId,
    type: "UNETLoader",
    pos: [1050, -100],
    size: [320, 80],
    title: "FLUX.1-dev UNET (Stage 2)",
    widgets_values: ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"],
    outputs: [{ name: "MODEL", type: "MODEL", links: [], slot_index: 0 }]
  });
  nodeMap[fluxUnetId] = nodes[nodes.length - 1];

  const fluxDualClipId = nextNodeId();
  nodes.push({
    id: fluxDualClipId,
    type: "DualCLIPLoader",
    pos: [1050, 0],
    size: [320, 110],
    title: "FLUX Dual CLIP (T5-XXL + CLIP-L)",
    widgets_values: ["clip_l.safetensors", "t5xxl_fp8_e4m3fn.safetensors", "flux"],
    outputs: [{ name: "CLIP", type: "CLIP", links: [], slot_index: 0 }]
  });
  nodeMap[fluxDualClipId] = nodes[nodes.length - 1];

  const fluxVaeId = nextNodeId();
  nodes.push({
    id: fluxVaeId,
    type: "VAELoader",
    pos: [1050, 130],
    size: [320, 80],
    title: "FLUX VAE Loader",
    widgets_values: ["ae.safetensors"],
    outputs: [{ name: "VAE", type: "VAE", links: [], slot_index: 0 }]
  });
  nodeMap[fluxVaeId] = nodes[nodes.length - 1];

  const fluxLoraId = nextNodeId();
  const fluxLoraNode = {
    id: fluxLoraId,
    type: "LoraLoader",
    pos: [1420, -100],
    size: [320, 120],
    title: "FLUX Apple LoRA Refiner",
    widgets_values: ["apple_minimal_craft_flux_v1.safetensors", fluxLoraWeight, fluxLoraWeight],
    inputs: [
      { name: "model", type: "MODEL", link: null },
      { name: "clip", type: "CLIP", link: null }
    ],
    outputs: [
      { name: "MODEL", type: "MODEL", links: [], slot_index: 0 },
      { name: "CLIP", type: "CLIP", links: [], slot_index: 1 }
    ]
  };
  nodes.push(fluxLoraNode);
  nodeMap[fluxLoraId] = fluxLoraNode;
  const lFU = addLink(fluxUnetId, 0, fluxLoraId, 0, "MODEL");
  nodeMap[fluxUnetId].outputs[0].links.push(lFU);
  fluxLoraNode.inputs[0].link = lFU;
  const lFC = addLink(fluxDualClipId, 0, fluxLoraId, 1, "CLIP");
  nodeMap[fluxDualClipId].outputs[0].links.push(lFC);
  fluxLoraNode.inputs[1].link = lFC;

  // FLUX Text Encode
  const fluxPosId = nextNodeId();
  const fluxPosNode = {
    id: fluxPosId,
    type: "CLIPTextEncode",
    pos: [1420, 40],
    size: [380, 180],
    title: "FLUX Master Positive Prompt",
    widgets_values: [fluxPrompt],
    inputs: [{ name: "clip", type: "CLIP", link: null }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  };
  nodes.push(fluxPosNode);
  nodeMap[fluxPosId] = fluxPosNode;
  const lFPosClip = addLink(fluxLoraId, 1, fluxPosId, 0, "CLIP");
  nodeMap[fluxLoraId].outputs[1].links.push(lFPosClip);
  fluxPosNode.inputs[0].link = lFPosClip;

  // FLUX Guidance
  const fluxGuidanceId = nextNodeId();
  const fluxGuidanceNode = {
    id: fluxGuidanceId,
    type: "FluxGuidance",
    pos: [1830, 40],
    size: [240, 80],
    title: "FLUX Guidance (2.8)",
    widgets_values: [fluxGuidance],
    inputs: [{ name: "conditioning", type: "CONDITIONING", link: null }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  };
  nodes.push(fluxGuidanceNode);
  nodeMap[fluxGuidanceId] = fluxGuidanceNode;
  const lFGuid = addLink(fluxPosId, 0, fluxGuidanceId, 0, "CONDITIONING");
  nodeMap[fluxPosId].outputs[0].links.push(lFGuid);
  fluxGuidanceNode.inputs[0].link = lFGuid;

  // FLUX Neg Empty Conditioning
  const fluxNegId = nextNodeId();
  const fluxNegNode = {
    id: fluxNegId,
    type: "CLIPTextEncode",
    pos: [1420, 240],
    size: [380, 90],
    title: "FLUX Neg (Empty)",
    widgets_values: [""],
    inputs: [{ name: "clip", type: "CLIP", link: null }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  };
  nodes.push(fluxNegNode);
  nodeMap[fluxNegId] = fluxNegNode;
  const lFNegClip = addLink(fluxLoraId, 1, fluxNegId, 0, "CLIP");
  nodeMap[fluxLoraId].outputs[1].links.push(lFNegClip);
  fluxNegNode.inputs[0].link = lFNegClip;

  // VAE Encode Seedance Still Image into FLUX Latent
  const vaeEncodeId = nextNodeId();
  const vaeEncodeNode = {
    id: vaeEncodeId,
    type: "VAEEncode",
    pos: [1830, 150],
    size: [240, 90],
    title: "Encode Seedance Frame to FLUX Latent",
    inputs: [
      { name: "pixels", type: "IMAGE", link: null },
      { name: "vae", type: "VAE", link: null }
    ],
    outputs: [{ name: "LATENT", type: "LATENT", links: [], slot_index: 0 }]
  };
  nodes.push(vaeEncodeNode);
  nodeMap[vaeEncodeId] = vaeEncodeNode;
  const lEncPix = addLink(pickStillId, 0, vaeEncodeId, 0, "IMAGE");
  nodeMap[pickStillId].outputs[0].links.push(lEncPix);
  vaeEncodeNode.inputs[0].link = lEncPix;
  const lEncVae = addLink(fluxVaeId, 0, vaeEncodeId, 1, "VAE");
  nodeMap[fluxVaeId].outputs[0].links.push(lEncVae);
  vaeEncodeNode.inputs[1].link = lEncVae;

  // FLUX KSampler
  const fluxSamplerId = nextNodeId();
  const fluxSamplerNode = {
    id: fluxSamplerId,
    type: "KSampler",
    pos: [2120, 50],
    size: [320, 380],
    title: "FLUX Stage 2 LoRA Refiner (Denoise 0.21)",
    widgets_values: [
      parseInt(globalState.seed || 7),
      "fixed",
      20,
      1.0,
      "euler",
      "simple",
      fluxDenoise
    ],
    inputs: [
      { name: "model", type: "MODEL", link: null },
      { name: "positive", type: "CONDITIONING", link: null },
      { name: "negative", type: "CONDITIONING", link: null },
      { name: "latent_image", type: "LATENT", link: null }
    ],
    outputs: [{ name: "LATENT", type: "LATENT", links: [], slot_index: 0 }]
  };
  nodes.push(fluxSamplerNode);
  nodeMap[fluxSamplerId] = fluxSamplerNode;
  const lFSampM = addLink(fluxLoraId, 0, fluxSamplerId, 0, "MODEL");
  nodeMap[fluxLoraId].outputs[0].links.push(lFSampM);
  fluxSamplerNode.inputs[0].link = lFSampM;
  const lFSampP = addLink(fluxGuidanceId, 0, fluxSamplerId, 1, "CONDITIONING");
  nodeMap[fluxGuidanceId].outputs[0].links.push(lFSampP);
  fluxSamplerNode.inputs[1].link = lFSampP;
  const lFSampN = addLink(fluxNegId, 0, fluxSamplerId, 2, "CONDITIONING");
  nodeMap[fluxNegId].outputs[0].links.push(lFSampN);
  fluxSamplerNode.inputs[2].link = lFSampN;
  const lFSampL = addLink(vaeEncodeId, 0, fluxSamplerId, 3, "LATENT");
  nodeMap[vaeEncodeId].outputs[0].links.push(lFSampL);
  fluxSamplerNode.inputs[3].link = lFSampL;

  // FLUX VAE Decode & Save
  const fluxDecodeId = nextNodeId();
  const fluxDecodeNode = {
    id: fluxDecodeId,
    type: "VAEDecode",
    pos: [2480, 50],
    size: [240, 90],
    title: "Decode Final FLUX Refined Image",
    inputs: [
      { name: "samples", type: "LATENT", link: null },
      { name: "vae", type: "VAE", link: null }
    ],
    outputs: [{ name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 }]
  };
  nodes.push(fluxDecodeNode);
  nodeMap[fluxDecodeId] = fluxDecodeNode;
  const lFDecL = addLink(fluxSamplerId, 0, fluxDecodeId, 0, "LATENT");
  nodeMap[fluxSamplerId].outputs[0].links.push(lFDecL);
  fluxDecodeNode.inputs[0].link = lFDecL;
  const lFDecV = addLink(fluxVaeId, 0, fluxDecodeId, 1, "VAE");
  nodeMap[fluxVaeId].outputs[0].links.push(lFDecV);
  fluxDecodeNode.inputs[1].link = lFDecV;

  const saveNodeId = nextNodeId();
  const saveNode = {
    id: saveNodeId,
    type: "SaveImage",
    pos: [2750, 50],
    size: [360, 420],
    title: "👑 Final Apple LookDev (Seedance + FLUX)",
    widgets_values: [`apple_spatial_shot${shotStr}_seedance_flux`],
    inputs: [{ name: "images", type: "IMAGE", link: null }]
  };
  nodes.push(saveNode);
  nodeMap[saveNodeId] = saveNode;
  const lSave = addLink(fluxDecodeId, 0, saveNodeId, 0, "IMAGE");
  nodeMap[fluxDecodeId].outputs[0].links.push(lSave);
  saveNode.inputs[0].link = lSave;

  return {
    last_node_id: nodeIdCounter,
    last_link_id: linkIdCounter,
    nodes,
    links,
    groups: [
      {
        title: "⚡ 1. BYTEDANCE SEEDANCE 2.5 (3D DEPTH + TEXTURE REFERENCE)",
        bounding: [-1210, -30, 2220, 800],
        color: "#1e293b",
        font_size: 24
      },
      {
        title: "✨ 2. FLUX.1-DEV APPLE LORA REFINER (CMF POLISH & STUDIO TONE)",
        bounding: [1030, -120, 2120, 890],
        color: "#0369a1",
        font_size: 24
      }
    ],
    config: {},
    extra: {},
    version: 0.4
  };
}

// ==========================================================================
// 💎 Dynamic Gemini VLM + FLUX.1-dev Direct LookDev Workflow Synthesizer
// Pure 1-Stage FLUX.1-dev (+ Apple LoRA) Generation with 3D Spatial Guidance (Zero Masks)
// ==========================================================================

function buildDynamicVlmFluxWorkflow() {
  syncAllInputsToState();
  const shotStr = String(currentShot || 1).padStart(4, "0");
  const fluxPrompt = typeof buildFLUXMasterPromptText === "function" ? buildFLUXMasterPromptText() : "";
  const globalNeg = globalState.negative || "blurry, noise, grain, low quality, artifacts, distorted geometry, petals, leaves, botanical, paper";

  const nodes = [];
  const links = [];
  const nodeMap = {};
  let nodeIdCounter = 0;
  let linkIdCounter = 0;

  function nextNodeId() { return ++nodeIdCounter; }
  function addLink(origId, origSlot, targetId, targetSlot, type) {
    const lid = ++linkIdCounter;
    links.push([lid, origId, origSlot, targetId, targetSlot, type]);
    return lid;
  }

  function registerNode(node) {
    nodes.push(node);
    nodeMap[node.id] = node;
    return node.id;
  }

  // 1. UNET Loader (FLUX.1-dev FP8)
  const unetId = registerNode({
    id: nextNodeId(),
    type: "UNETLoader",
    pos: [100, 100],
    size: [320, 100],
    title: "FLUX UNET Loader (flux1-dev-fp8.safetensors)",
    widgets_values: ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"],
    outputs: [{ name: "MODEL", type: "MODEL", links: [], slot_index: 0 }]
  });

  // 2. DualCLIPLoader (T5XXL + CLIP-L)
  const clipId = registerNode({
    id: nextNodeId(),
    type: "DualCLIPLoader",
    pos: [100, 240],
    size: [320, 120],
    title: "FLUX Dual CLIP Loader (T5XXL + CLIP-L)",
    widgets_values: ["t5xxl_fp8_e4m3fn.safetensors", "clip_l.safetensors", "flux"],
    outputs: [{ name: "CLIP", type: "CLIP", links: [], slot_index: 0 }]
  });

  // 3. VAE Loader (ae.safetensors)
  const vaeId = registerNode({
    id: nextNodeId(),
    type: "VAELoader",
    pos: [100, 400],
    size: [320, 90],
    title: "FLUX VAE Loader (ae.safetensors)",
    widgets_values: ["ae.safetensors"],
    outputs: [{ name: "VAE", type: "VAE", links: [], slot_index: 0 }]
  });

  // 4. Apple Minimal Craft FLUX LoRA
  const loraWeight = parseFloat(globalState.fluxLoraWeight || 0.55);
  const loraId = registerNode({
    id: nextNodeId(),
    type: "LoraLoaderModelOnly",
    pos: [480, 100],
    size: [320, 100],
    title: "Apple Minimal Craft FLUX LoRA (0.55)",
    widgets_values: ["apple_minimal_craft_flux_v1.safetensors", loraWeight],
    inputs: [{ name: "model", type: "MODEL", link: null }],
    outputs: [{ name: "MODEL", type: "MODEL", links: [], slot_index: 0 }]
  });

  const lUnetLora = addLink(unetId, 0, loraId, 0, "MODEL");
  nodeMap[unetId].outputs[0].links.push(lUnetLora);
  nodeMap[loraId].inputs[0].link = lUnetLora;

  // 5. 3D Visual Guides (Dynamic from globalState.guideSlots)
  const activeSlots = (globalState.guideSlots && globalState.guideSlots.length > 0)
    ? globalState.guideSlots
    : [
        { file: "Color.png", label: "Color Pass / Swatch Placement" },
        { file: "Normal.png", label: "Surface Normal Map" },
        { file: "Depth.png", label: "3D Depth Distance" }
      ];

  const guideNodeIds = [];
  activeSlots.forEach((slot, idx) => {
    const gid = registerNode({
      id: nextNodeId(),
      type: "LoadImage",
      pos: [100, 540 + idx * 280],
      size: [280, 260],
      title: `3D Guide ${idx+1}: ${slot.label || slot.file} (${shotStr})`,
      widgets_values: [`${shotStr}/${slot.file}`, "image"],
      outputs: [
        { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 },
        { name: "MASK", type: "MASK", links: [], slot_index: 1 }
      ]
    });
    guideNodeIds.push(gid);
  });

  // 6. Gemini 3.5 LookDev VLM Node (Native AI Synthesizer)
  const vlmId = registerNode({
    id: nextNodeId(),
    type: "GeminiLookDevVLMNode",
    pos: [480, 540],
    size: [460, 480],
    title: "💎 Gemini 3.5 LookDev VLM Analyzer",
    inputs: [
      { name: "color_guide", type: "IMAGE", link: null },
      { name: "normal_guide", type: "IMAGE", link: null },
      { name: "depth_guide", type: "IMAGE", link: null }
    ],
    widgets_values: [
      "",
      "a photo in apple minimal craft style of, minimalist commercial studio photography, top-down flat lay view, professional luxury skincare cosmetic swatches",
      "clean matte studio tabletop surface with soft contact ambient occlusion shadows",
      "directional key light from top-right (1 o'clock) at a shallow 30-degree grazing angle",
      "CRITICAL: Swatches are thick, high-viscosity cosmetic liquid gels with high surface tension and internal caustics. NOT flower petals, leaves, or paper."
    ],
    outputs: [
      { name: "flux_master_prompt", type: "STRING", links: [], slot_index: 0 },
      { name: "negative_prompt", type: "STRING", links: [], slot_index: 1 }
    ]
  });

  // Link available guide image outputs to VLM inputs (up to 3)
  guideNodeIds.slice(0, 3).forEach((gid, gIdx) => {
    const lVlm = addLink(gid, 0, vlmId, gIdx, "IMAGE");
    nodeMap[gid].outputs[0].links.push(lVlm);
    nodeMap[vlmId].inputs[gIdx].link = lVlm;
  });

  // 6.1 Live Gemini Prompt Text Inspector Node (ComfyUI Canvas Viewer)
  const inspectorId = registerNode({
    id: nextNodeId(),
    type: "GeminiShowTextNode",
    pos: [480, 1060],
    size: [460, 220],
    title: "👁️ Gemini Prompt Text Inspector (Live Result)",
    inputs: [
      { name: "text", type: "STRING", link: null }
    ],
    widgets_values: ["Waiting for Gemini VLM execution..."],
    outputs: [{ name: "text", type: "STRING", links: [], slot_index: 0 }]
  });

  const lInsp = addLink(vlmId, 0, inspectorId, 0, "STRING");
  nodeMap[vlmId].outputs[0].links.push(lInsp);
  nodeMap[inspectorId].inputs[0].link = lInsp;

  // 7. Gemini VLM Synthesized Master Text Prompt (Positive)
  const posClipId = registerNode({
    id: nextNodeId(),
    type: "CLIPTextEncode",
    pos: [1000, 100],
    size: [420, 220],
    title: "FLUX Positive Prompt (Gemini VLM LookDev)",
    inputs: [
      { name: "clip", type: "CLIP", link: null }
    ],
    widgets_values: [fluxPrompt || "a photo in apple minimal craft style of, minimalist luxury cosmetic swatches, high surface tension, glossy reflection, matte tabletop"],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  });

  const lClipPos = addLink(clipId, 0, posClipId, 0, "CLIP");
  nodeMap[clipId].outputs[0].links.push(lClipPos);
  nodeMap[posClipId].inputs[0].link = lClipPos;

  // 8. Negative Text Prompt
  const negClipId = registerNode({
    id: nextNodeId(),
    type: "CLIPTextEncode",
    pos: [1000, 360],
    size: [420, 150],
    title: "FLUX Negative Prompt",
    inputs: [
      { name: "clip", type: "CLIP", link: null }
    ],
    widgets_values: [globalNeg || "blurry, noise, grain, low quality, artifacts, distorted geometry, petals, leaves, botanical, paper"],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  });

  const lClipNeg = addLink(clipId, 0, negClipId, 0, "CLIP");
  nodeMap[clipId].outputs[0].links.push(lClipNeg);
  nodeMap[negClipId].inputs[0].link = lClipNeg;

  // 9. Flux Guidance Node (2.8)
  const guidanceVal = parseFloat(globalState.fluxGuidance || 2.8);
  const guideId = registerNode({
    id: nextNodeId(),
    type: "FluxGuidance",
    pos: [1460, 100],
    size: [240, 80],
    title: "FLUX Guidance Scale (2.8)",
    widgets_values: [guidanceVal],
    inputs: [{ name: "conditioning", type: "CONDITIONING", link: null }],
    outputs: [{ name: "conditioning", type: "CONDITIONING", links: [], slot_index: 0 }]
  });

  const lPosGuide = addLink(posClipId, 0, guideId, 0, "CONDITIONING");
  nodeMap[posClipId].outputs[0].links.push(lPosGuide);
  nodeMap[guideId].inputs[0].link = lPosGuide;

  // 10. EmptyLatentImage (1024x1024)
  const latentId = registerNode({
    id: nextNodeId(),
    type: "EmptyLatentImage",
    pos: [1460, 220],
    size: [240, 110],
    title: "Empty Latent (1024x1024)",
    widgets_values: [1024, 1024, 1],
    outputs: [{ name: "LATENT", type: "LATENT", links: [], slot_index: 0 }]
  });

  // 11. FLUX KSampler (Fixed Seed 7, Euler Simple, 20 Steps)
  const seedNum = parseInt(globalState.seed || 7);
  const ksId = registerNode({
    id: nextNodeId(),
    type: "KSampler",
    pos: [1750, 100],
    size: [320, 350],
    title: "FLUX KSampler (Direct VLM Master, Seed 7 Fixed)",
    widgets_values: [seedNum, "fixed", 20, 1.0, "euler", "simple", 1.0],
    inputs: [
      { name: "model", type: "MODEL", link: null },
      { name: "positive", type: "CONDITIONING", link: null },
      { name: "negative", type: "CONDITIONING", link: null },
      { name: "latent_image", type: "LATENT", link: null }
    ],
    outputs: [{ name: "LATENT", type: "LATENT", links: [], slot_index: 0 }]
  });

  const lLoraKs = addLink(loraId, 0, ksId, 0, "MODEL");
  nodeMap[loraId].outputs[0].links.push(lLoraKs);
  nodeMap[ksId].inputs[0].link = lLoraKs;

  const lGuideKs = addLink(guideId, 0, ksId, 1, "CONDITIONING");
  nodeMap[guideId].outputs[0].links.push(lGuideKs);
  nodeMap[ksId].inputs[1].link = lGuideKs;

  const lNegKs = addLink(negClipId, 0, ksId, 2, "CONDITIONING");
  nodeMap[negClipId].outputs[0].links.push(lNegKs);
  nodeMap[ksId].inputs[2].link = lNegKs;

  const lLatKs = addLink(latentId, 0, ksId, 3, "LATENT");
  nodeMap[latentId].outputs[0].links.push(lLatKs);
  nodeMap[ksId].inputs[3].link = lLatKs;

  // 12. VAE Decode
  const decId = registerNode({
    id: nextNodeId(),
    type: "VAEDecode",
    pos: [2110, 100],
    size: [240, 100],
    title: "FLUX VAE Decode",
    inputs: [
      { name: "samples", type: "LATENT", link: null },
      { name: "vae", type: "VAE", link: null }
    ],
    outputs: [{ name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 }]
  });

  const lKsDec = addLink(ksId, 0, decId, 0, "LATENT");
  nodes[10].outputs[0].links.push(lKsDec);
  nodes[11].inputs[0].link = lKsDec;

  const lVaeDec = addLink(vaeId, 0, decId, 1, "VAE");
  nodes[2].outputs[0].links.push(lVaeDec);
  nodes[11].inputs[1].link = lVaeDec;

  // 12. SaveImage
  const saveId = nextNode();
  nodes.push({
    id: saveId,
    type: "SaveImage",
    pos: [1900, 180],
    size: [360, 360],
    title: "Save Final VLM FLUX LookDev Master",
    widgets_values: [`Apple_Spatial_VLM_FLUX_${shotStr}_Master`],
    inputs: [{ name: "images", type: "IMAGE", link: null }]
  });

  const lDecSave = addLink(decId, 0, saveId, 0, "IMAGE");
  nodes[11].outputs[0].links.push(lDecSave);
  nodes[12].inputs[0].link = lDecSave;

  return {
    last_node_id: nodeId,
    last_link_id: linkId,
    nodes: nodes,
    links: links,
    groups: [
      {
        title: "💎 1. GEMINI VLM 3D SPATIAL & OPTICAL LOOKDEV INPUTS",
        bounding: [80, 480, 720, 400],
        color: "#8b5cf6",
        font_size: 22
      },
      {
        title: "✨ 2. FLUX.1-DEV + APPLE MINIMAL CRAFT LORA MASTER ENGINE (SEED 7 FIXED)",
        bounding: [80, 50, 2220, 850],
        color: "#0369a1",
        font_size: 24
      }
    ],
    config: {},
    extra: { ds: { scale: 0.85, offset: [50, 50] } },
    version: 0.4
  };
}

// ==========================================================================
// Dynamic Pure Workflow Synthesizer Engine
// Programmatically builds the full 2-Stage SDXL Regional + FLUX LoRA Node Graph
// Eliminates rigid master JSON file dependencies; 100% per-piece Pos & Neg isolation
// ==========================================================================

function buildDynamicHybridWorkflow() {
  syncAllInputsToState();

  const shotStr = String(currentShot).padStart(4, "0");
  const depthStrength = parseFloat(globalState.depthStrength !== undefined ? globalState.depthStrength : 0.30);
  const depthStart = parseFloat(globalState.depthStart !== undefined ? globalState.depthStart : 0.0);
  const depthEnd = parseFloat(globalState.depthEnd !== undefined ? globalState.depthEnd : 0.35);

  const normalStrength = parseFloat(globalState.normalStrength !== undefined ? globalState.normalStrength : 0.20);
  const normalStart = parseFloat(globalState.normalStart !== undefined ? globalState.normalStart : 0.0);
  const normalEnd = parseFloat(globalState.normalEnd !== undefined ? globalState.normalEnd : 0.35);

  const sdxlCfg = parseFloat(globalState.sdxlCfg !== undefined ? globalState.sdxlCfg : 5.5);
  const sdxlDenoise = parseFloat(globalState.sdxlDenoise !== undefined ? globalState.sdxlDenoise : 1.0);

  const fluxCfg = parseFloat(globalState.fluxCfg !== undefined ? globalState.fluxCfg : 1.0);
  const fluxDenoise = parseFloat(globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.55);

  const sdxlGlobalPos = typeof buildGlobalScenePromptText === "function" ? buildGlobalScenePromptText() : (globalState.lighting || "");
  const globalNeg = globalState.negative || "blurry, noise, grain, low quality, artifacts, distorted geometry, cracks, micro-cracks";
  const fluxPos = typeof buildFLUXMasterPromptText === "function" ? buildFLUXMasterPromptText() : "";

  // Assemble pieces list (P0 Floor + P1~P6 Swatches)
  const depthPassName = globalState.depthPassFile || "Depth.png";
  const normalPassName = globalState.normalPassFile || "Normal.png";
  const p0MaskName = globalState.p0MaskFile || "Mask_00.png";

  const p0PosPrompt = buildP0PromptText();
  const p0NegPrompt = (globalState.p0NegativePrompt !== undefined && globalState.p0NegativePrompt !== null && globalState.p0NegativePrompt.trim())
    ? globalState.p0NegativePrompt
    : globalNeg;

  const pieces = [
    {
      tag: "P0",
      name: "Floor",
      mask_file: p0MaskName,
      pos_prompt: p0PosPrompt,
      neg_prompt: p0NegPrompt,
      use_image: globalState.useP0Image !== false,
      use_pos: globalState.useP0PosText !== false,
      use_neg: !!globalState.useP0NegText,
      image_weight: globalState.p0ImageWeight !== undefined ? parseFloat(globalState.p0ImageWeight) : 0.95,
      prompt_weight: globalState.p0PromptWeight !== undefined ? parseFloat(globalState.p0PromptWeight) : 1.00,
      ref_file: "ref_p0.webp"
    }
  ];

  activeSwatches.forEach((s, idx) => {
    const pNum = idx + 1;
    const pTag = `P${pNum}`;
    const pName = s.partName || `Part ${pNum}`;
    const isImg = s.useImage !== false;
    const isPos = s.usePosText !== false;
    const isNeg = !!s.useNegText;

    // If both Image and Text are disabled, skip creating nodes for this part!
    if (!isImg && !isPos && !isNeg) return;

    const posPrompt = buildSwatchPromptText(idx);
    const negPrompt = (s.negativePrompt !== undefined && s.negativePrompt !== null && s.negativePrompt.trim())
      ? s.negativePrompt
      : globalNeg;

    const maskFile = s.maskFile || `Mask_${String(pNum).padStart(2, "0")}.png`;

    pieces.push({
      tag: pTag,
      name: pName,
      mask_file: maskFile,
      pos_prompt: posPrompt,
      neg_prompt: negPrompt,
      use_image: isImg,
      use_pos: isPos,
      use_neg: isNeg,
      image_weight: s.imageWeight !== undefined ? parseFloat(s.imageWeight) : 0.95,
      prompt_weight: s.promptWeight !== undefined ? parseFloat(s.promptWeight) : 1.00,
      ref_file: `ref_p${pNum}.webp`
    });
  });

  const nodes = [];
  const links = [];
  const nodeMap = {};
  let nodeIdCounter = 0;
  let linkIdCounter = 0;

  const nextNodeId = () => ++nodeIdCounter;
  const nextLinkId = () => ++linkIdCounter;

  const addLink = (fromNode, fromSlot, toNode, toSlot, linkType) => {
    const lid = nextLinkId();
    links.push([lid, fromNode, fromSlot, toNode, toSlot, linkType]);
    return lid;
  };

  const engine = globalState.stage1Engine || "sdxl";
  if (engine === "seadance") {
    return buildDynamicSeaDanceFluxWorkflow();
  }

  // 1. Documentation Note Node
  const noteId = nextNodeId();
  nodes.push({
    id: noteId,
    type: "Note",
    pos: [50, -180],
    size: [1200, 140],
    title: `Spatial LookDev Dynamic Synthesized Pipeline (SDXL + FLUX)`,
    widgets_values: [
      `Spatial LookDev 2-Stage Dynamic Pipeline (Shot ${shotStr}) [SDXL + FLUX]\n---------------------------------------------------------------------------------------------------------\n• Stage 1 (SDXL Base): 7-Part Regional conditioning with per-piece independent Positive & Negative prompts.\n  - Image-active pieces route through IP-Adapter regional conditioning.\n  - Text-only pieces route through native ConditioningSetMask (Zero VRAM, fast & native).\n  - Balanced Binary Tree combining for all positive & negative conditionings.\n• Stage 2 (FLUX.1-dev LoRA Refiner): Apple Minimal Craft CMF refinement (Denoise: ${fluxDenoise}).`
    ],
    color: "#234433",
    bgcolor: "#1e3a29"
  });

  // 2. SDXL Base Checkpoint Loader
  const sdxlCkptId = nextNodeId();
  const sdxlCkptNode = {
    id: sdxlCkptId,
    type: "CheckpointLoaderSimple",
    pos: [50, 0],
    size: [320, 110],
    title: `SDXL Base Checkpoint`,
    widgets_values: ["sd_xl_base_1.0.safetensors"],
    outputs: [
      { name: "MODEL", type: "MODEL", links: [], slot_index: 0 },
      { name: "CLIP", type: "CLIP", links: [], slot_index: 1 },
      { name: "VAE", type: "VAE", links: [], slot_index: 2 }
    ]
  };
  nodes.push(sdxlCkptNode);
  nodeMap[sdxlCkptId] = sdxlCkptNode;

  let activeSdxlModelSource = [sdxlCkptId, 0];
  let activeSdxlClipSource = [sdxlCkptId, 1];

  // 2.1 SDXL Apple LoRA Loader (Conditional)
  if (globalState.useSdxlLora) {
    const sdxlLoraStrength = parseFloat(globalState.sdxlLoraStrength !== undefined ? globalState.sdxlLoraStrength : 0.95);
    const sdxlLoraId = nextNodeId();
    const sdxlLoraNode = {
      id: sdxlLoraId,
      type: "LoraLoader",
      pos: [50, 140],
      size: [320, 120],
      title: "Load SDXL Apple LoRA",
      widgets_values: ["apple_minimal_craft_sdxl_v1.safetensors", sdxlLoraStrength, sdxlLoraStrength],
      inputs: [
        { name: "model", type: "MODEL", link: null },
        { name: "clip", type: "CLIP", link: null }
      ],
      outputs: [
        { name: "MODEL", type: "MODEL", links: [], slot_index: 0 },
        { name: "CLIP", type: "CLIP", links: [], slot_index: 1 }
      ]
    };
    nodes.push(sdxlLoraNode);
    nodeMap[sdxlLoraId] = sdxlLoraNode;

    const lLoraM = addLink(sdxlCkptId, 0, sdxlLoraId, 0, "MODEL");
    sdxlCkptNode.outputs[0].links.push(lLoraM);
    sdxlLoraNode.inputs[0].link = lLoraM;

    const lLoraC = addLink(sdxlCkptId, 1, sdxlLoraId, 1, "CLIP");
    sdxlCkptNode.outputs[1].links.push(lLoraC);
    sdxlLoraNode.inputs[1].link = lLoraC;

    activeSdxlModelSource = [sdxlLoraId, 0];
    activeSdxlClipSource = [sdxlLoraId, 1];
  }

  // 3. Empty Latent Image
  const latentId = nextNodeId();
  const latentNode = {
    id: latentId,
    type: "EmptyLatentImage",
    pos: [50, 450],
    size: [320, 110],
    title: "Empty Latent Image (1024x1024)",
    widgets_values: [1024, 1024, 1],
    outputs: [
      { name: "LATENT", type: "LATENT", links: [], slot_index: 0 }
    ]
  };
  nodes.push(latentNode);
  nodeMap[latentId] = latentNode;

  // 4. IP-Adapter Loaders (if any piece uses image)
  const hasImagePieces = pieces.some(p => p.use_image);
  let ipModelId = null;
  let clipVisionId = null;

  if (hasImagePieces) {
    ipModelId = nextNodeId();
    const ipModelNode = {
      id: ipModelId,
      type: "IPAdapterModelLoader",
      pos: [50, 240],
      size: [320, 90],
      title: "Load IPAdapter Model",
      widgets_values: ["ip-adapter-plus_sdxl_vit-h.safetensors"],
      outputs: [{ name: "IPADAPTER", type: "IPADAPTER", links: [], slot_index: 0 }]
    };
    nodes.push(ipModelNode);
    nodeMap[ipModelId] = ipModelNode;

    clipVisionId = nextNodeId();
    const clipVisionNode = {
      id: clipVisionId,
      type: "CLIPVisionLoader",
      pos: [50, 350],
      size: [320, 90],
      title: "Load CLIP Vision",
      widgets_values: ["CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"],
      outputs: [{ name: "CLIP_VISION", type: "CLIP_VISION", links: [], slot_index: 0 }]
    };
    nodes.push(clipVisionNode);
    nodeMap[clipVisionId] = clipVisionNode;
  }

  // 5. Global SDXL Positive & Negative Prompts
  const sdxlScenePosId = nextNodeId();
  const sdxlScenePosNode = {
    id: sdxlScenePosId,
    type: "CLIPTextEncode",
    pos: [50, 600],
    size: [380, 130],
    title: "SDXL Global Scene Positive",
    widgets_values: [sdxlGlobalPos],
    inputs: [{ name: "clip", type: "CLIP", link: null }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  };
  nodes.push(sdxlScenePosNode);
  nodeMap[sdxlScenePosId] = sdxlScenePosNode;
  const lClipScene = addLink(activeSdxlClipSource[0], activeSdxlClipSource[1], sdxlScenePosId, 0, "CLIP");
  nodeMap[activeSdxlClipSource[0]].outputs[activeSdxlClipSource[1]].links.push(lClipScene);
  sdxlScenePosNode.inputs[0].link = lClipScene;

  const sdxlSceneNegId = nextNodeId();
  const sdxlSceneNegNode = {
    id: sdxlSceneNegId,
    type: "CLIPTextEncode",
    pos: [50, 750],
    size: [380, 130],
    title: "SDXL Global Negative",
    widgets_values: [globalNeg],
    inputs: [{ name: "clip", type: "CLIP", link: null }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  };
  nodes.push(sdxlSceneNegNode);
  nodeMap[sdxlSceneNegId] = sdxlSceneNegNode;
  const lClipNeg = addLink(activeSdxlClipSource[0], activeSdxlClipSource[1], sdxlSceneNegId, 0, "CLIP");
  nodeMap[activeSdxlClipSource[0]].outputs[activeSdxlClipSource[1]].links.push(lClipNeg);
  sdxlSceneNegNode.inputs[0].link = lClipNeg;

  // 6. Regional Pieces Generation (P0 + P1~P6)
  const piecePosConds = [];
  const pieceNegConds = [];
  const ipParamOutputs = [];
  let yOffset = 0;

  pieces.forEach((piece, idx) => {
    const pTag = piece.tag;
    const pName = piece.name;
    const maskFile = piece.mask_file;
    const posPrompt = piece.pos_prompt;
    const negPrompt = piece.neg_prompt;
    const useImg = piece.use_image;
    const usePos = piece.use_pos;
    const useNeg = piece.use_neg;
    const imgW = piece.image_weight !== undefined ? parseFloat(piece.image_weight) : 0.95;
    const promptW = piece.prompt_weight !== undefined ? parseFloat(piece.prompt_weight) : 1.00;
    const refFile = piece.ref_file;

    const curY = yOffset;

    // Mask Loader
    const maskNodeId = nextNodeId();
    const maskNode = {
      id: maskNodeId,
      type: "LoadImage",
      pos: [500, curY],
      size: [260, 240],
      title: `[${pTag}] 3D Mask (${maskFile})`,
      widgets_values: [maskFile, "image"],
      outputs: [
        { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 },
        { name: "MASK", type: "MASK", links: [], slot_index: 1 }
      ]
    };
    nodes.push(maskNode);
    nodeMap[maskNodeId] = maskNode;

    // Pos Prompt Node
    const posNodeId = nextNodeId();
    const posNode = {
      id: posNodeId,
      type: "CLIPTextEncode",
      pos: [800, curY],
      size: [370, 130],
      title: `[${pTag}] Positive Prompt (${pName})`,
      widgets_values: [posPrompt],
      mode: usePos ? 0 : 4,
      inputs: [{ name: "clip", type: "CLIP", link: null }],
      outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
    };
    nodes.push(posNode);
    nodeMap[posNodeId] = posNode;
    const lPosClip = addLink(activeSdxlClipSource[0], activeSdxlClipSource[1], posNodeId, 0, "CLIP");
    nodeMap[activeSdxlClipSource[0]].outputs[activeSdxlClipSource[1]].links.push(lPosClip);
    posNode.inputs[0].link = lPosClip;

    // Neg Prompt Node
    const negNodeId = nextNodeId();
    const negNode = {
      id: negNodeId,
      type: "CLIPTextEncode",
      pos: [800, curY + 145],
      size: [370, 125],
      title: `[${pTag}] Negative Prompt (${pName})`,
      widgets_values: [negPrompt],
      mode: useNeg ? 0 : 4,
      inputs: [{ name: "clip", type: "CLIP", link: null }],
      outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
    };
    nodes.push(negNode);
    nodeMap[negNodeId] = negNode;
    const lNegClip = addLink(activeSdxlClipSource[0], activeSdxlClipSource[1], negNodeId, 0, "CLIP");
    nodeMap[activeSdxlClipSource[0]].outputs[activeSdxlClipSource[1]].links.push(lNegClip);
    negNode.inputs[0].link = lNegClip;

    if (useImg) {
      // Route through IP-Adapter Regional Conditioning
      const refNodeId = nextNodeId();
      const refNode = {
        id: refNodeId,
        type: "LoadImage",
        pos: [1200, curY],
        size: [260, 240],
        title: `[${pTag}] Ref Texture (${refFile})`,
        widgets_values: [refFile, "image"],
        outputs: [
          { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 },
          { name: "MASK", type: "MASK", links: [], slot_index: 1 }
        ]
      };
      nodes.push(refNode);
      nodeMap[refNodeId] = refNode;

      const ipregId = nextNodeId();
      const ipregNode = {
        id: ipregId,
        type: "IPAdapterRegionalConditioning",
        pos: [1500, curY],
        size: [280, 280],
        title: `[${pTag}] IPAdapter Regional Cond`,
        widgets_values: [imgW, usePos ? promptW : 0.0, "linear", 0.0, 1.0],
        inputs: [
          { name: "mask", type: "MASK", link: null },
          { name: "image", type: "IMAGE", link: null },
          { name: "positive", type: "CONDITIONING", link: null },
          { name: "negative", type: "CONDITIONING", link: null }
        ],
        outputs: [
          { name: "IPADAPTER_PARAMS", type: "IPADAPTER_PARAMS", links: [], slot_index: 0 },
          { name: "POSITIVE", type: "CONDITIONING", links: [], slot_index: 1 },
          { name: "NEGATIVE", type: "CONDITIONING", links: [], slot_index: 2 }
        ]
      };
      nodes.push(ipregNode);
      nodeMap[ipregId] = ipregNode;

      // Link mask
      const lMask = addLink(maskNodeId, 1, ipregId, 0, "MASK");
      maskNode.outputs[1].links.push(lMask);
      ipregNode.inputs[0].link = lMask;

      // Link ref image
      const lRef = addLink(refNodeId, 0, ipregId, 1, "IMAGE");
      refNode.outputs[0].links.push(lRef);
      ipregNode.inputs[1].link = lRef;

      // Link pos conditioning
      const lPos = addLink(posNodeId, 0, ipregId, 2, "CONDITIONING");
      posNode.outputs[0].links.push(lPos);
      ipregNode.inputs[2].link = lPos;

      // Link neg conditioning
      const lNeg = addLink(negNodeId, 0, ipregId, 3, "CONDITIONING");
      negNode.outputs[0].links.push(lNeg);
      ipregNode.inputs[3].link = lNeg;

      ipParamOutputs.push([ipregId, 0]);
      piecePosConds.push([ipregId, 1]);
      if (useNeg) {
        pieceNegConds.push([ipregId, 2]);
      }
    } else {
      // Pure Text Mode: ConditioningSetMask (Zero VRAM, native speed)
      const setmaskPosId = nextNodeId();
      const setmaskPosNode = {
        id: setmaskPosId,
        type: "ConditioningSetMask",
        pos: [1200, curY],
        size: [260, 110],
        title: `[${pTag}] Set Mask (Positive)`,
        widgets_values: [promptW],
        inputs: [
          { name: "conditioning", type: "CONDITIONING", link: null },
          { name: "mask", type: "MASK", link: null }
        ],
        outputs: [
          { name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }
        ]
      };
      nodes.push(setmaskPosNode);
      nodeMap[setmaskPosId] = setmaskPosNode;

      const lPosCond = addLink(posNodeId, 0, setmaskPosId, 0, "CONDITIONING");
      posNode.outputs[0].links.push(lPosCond);
      setmaskPosNode.inputs[0].link = lPosCond;

      const lPosMask = addLink(maskNodeId, 1, setmaskPosId, 1, "MASK");
      maskNode.outputs[1].links.push(lPosMask);
      setmaskPosNode.inputs[1].link = lPosMask;

      piecePosConds.push([setmaskPosId, 0]);

      if (useNeg) {
        const setmaskNegId = nextNodeId();
        const setmaskNegNode = {
          id: setmaskNegId,
          type: "ConditioningSetMask",
          pos: [1200, curY + 130],
          size: [260, 110],
          title: `[${pTag}] Set Mask (Negative)`,
          widgets_values: [promptW],
          inputs: [
            { name: "conditioning", type: "CONDITIONING", link: null },
            { name: "mask", type: "MASK", link: null }
          ],
          outputs: [
            { name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }
          ]
        };
        nodes.push(setmaskNegNode);
        nodeMap[setmaskNegId] = setmaskNegNode;

        const lNegCond = addLink(negNodeId, 0, setmaskNegId, 0, "CONDITIONING");
        negNode.outputs[0].links.push(lNegCond);
        setmaskNegNode.inputs[0].link = lNegCond;

        const lNegMask = addLink(maskNodeId, 1, setmaskNegId, 1, "MASK");
        maskNode.outputs[1].links.push(lNegMask);
        setmaskNegNode.inputs[1].link = lNegMask;

        pieceNegConds.push([setmaskNegId, 0]);
      }
    }

    yOffset += 300;
  });

  // 7. IP-Adapter Combine Tree (if images active)
  if (ipParamOutputs.length > 0) {
    let currentIpLayer = ipParamOutputs;
    let combineX = 1850;
    while (currentIpLayer.length > 1) {
      const nextIpLayer = [];
      for (let i = 0; i < currentIpLayer.length; i += 2) {
        if (i + 1 < currentIpLayer.length) {
          const p1 = currentIpLayer[i];
          const p2 = currentIpLayer[i + 1];
          const combId = nextNodeId();
          const combNode = {
            id: combId,
            type: "IPAdapterCombineParams",
            pos: [combineX, i * 150],
            size: [280, 90],
            title: `IPAdapter Combine (${i}+${i+1})`,
            inputs: [
              { name: "params_1", type: "IPADAPTER_PARAMS", link: null },
              { name: "params_2", type: "IPADAPTER_PARAMS", link: null }
            ],
            outputs: [
              { name: "IPADAPTER_PARAMS", type: "IPADAPTER_PARAMS", links: [], slot_index: 0 }
            ]
          };
          nodes.push(combNode);
          nodeMap[combId] = combNode;

          const l1 = addLink(p1[0], p1[1], combId, 0, "IPADAPTER_PARAMS");
          nodeMap[p1[0]].outputs[p1[1]].links.push(l1);
          combNode.inputs[0].link = l1;

          const l2 = addLink(p2[0], p2[1], combId, 1, "IPADAPTER_PARAMS");
          nodeMap[p2[0]].outputs[p2[1]].links.push(l2);
          combNode.inputs[1].link = l2;

          nextIpLayer.push([combId, 0]);
        } else {
          nextIpLayer.push(currentIpLayer[i]);
        }
      }
      currentIpLayer = nextIpLayer;
      combineX += 320;
    }

    const finalIpParams = currentIpLayer[0];

    const fromParamsId = nextNodeId();
    const fromParamsNode = {
      id: fromParamsId,
      type: "IPAdapterFromParams",
      pos: [combineX + 50, 300],
      size: [340, 180],
      title: "IPAdapter From Params",
      widgets_values: ["concat", "V only"],
      inputs: [
        { name: "model", type: "MODEL", link: null },
        { name: "ipadapter_params", type: "IPADAPTER_PARAMS", link: null },
        { name: "ipadapter", type: "IPADAPTER", link: null },
        { name: "clip_vision", type: "CLIP_VISION", link: null }
      ],
      outputs: [
        { name: "MODEL", type: "MODEL", links: [], slot_index: 0 }
      ]
    };
    nodes.push(fromParamsNode);
    nodeMap[fromParamsId] = fromParamsNode;

    const lMod = addLink(activeSdxlModelSource[0], activeSdxlModelSource[1], fromParamsId, 0, "MODEL");
    nodeMap[activeSdxlModelSource[0]].outputs[activeSdxlModelSource[1]].links.push(lMod);
    fromParamsNode.inputs[0].link = lMod;

    const lIpp = addLink(finalIpParams[0], finalIpParams[1], fromParamsId, 1, "IPADAPTER_PARAMS");
    nodeMap[finalIpParams[0]].outputs[finalIpParams[1]].links.push(lIpp);
    fromParamsNode.inputs[1].link = lIpp;

    const lIpm = addLink(ipModelId, 0, fromParamsId, 2, "IPADAPTER");
    nodeMap[ipModelId].outputs[0].links.push(lIpm);
    fromParamsNode.inputs[2].link = lIpm;

    const lCv = addLink(clipVisionId, 0, fromParamsId, 3, "CLIP_VISION");
    nodeMap[clipVisionId].outputs[0].links.push(lCv);
    fromParamsNode.inputs[3].link = lCv;

    activeSdxlModelSource = [fromParamsId, 0];
  }

  // 8. Balanced Binary Tree Conditioning Combiner Helper
  const buildCombineTree = (condList, startX, startY, labelPrefix) => {
    if (!condList || condList.length === 0) return null;
    let currentLayer = [...condList];
    let curX = startX;
    while (currentLayer.length > 1) {
      const nextLayer = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          const c1 = currentLayer[i];
          const c2 = currentLayer[i + 1];
          const combId = nextNodeId();
          const combNode = {
            id: combId,
            type: "ConditioningCombine",
            pos: [curX, startY + (i * 90)],
            size: [240, 80],
            title: `Combine ${labelPrefix} (${i}+${i+1})`,
            inputs: [
              { name: "conditioning_1", type: "CONDITIONING", link: null },
              { name: "conditioning_2", type: "CONDITIONING", link: null }
            ],
            outputs: [
              { name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }
            ]
          };
          nodes.push(combNode);
          nodeMap[combId] = combNode;

          const l1 = addLink(c1[0], c1[1], combId, 0, "CONDITIONING");
          nodeMap[c1[0]].outputs[c1[1]].links.push(l1);
          combNode.inputs[0].link = l1;

          const l2 = addLink(c2[0], c2[1], combId, 1, "CONDITIONING");
          nodeMap[c2[0]].outputs[c2[1]].links.push(l2);
          combNode.inputs[1].link = l2;

          nextLayer.push([combId, 0]);
        } else {
          nextLayer.push(currentLayer[i]);
        }
      }
      currentLayer = nextLayer;
      curX += 280;
    }
    return currentLayer[0];
  };

  // Combine Positive & Negative Trees (Global Scene Base + Regional Pieces)
  const allPosConds = [[sdxlScenePosId, 0], ...piecePosConds];
  const finalPosCond = buildCombineTree(allPosConds, 2200, 100, "Pos");

  const allNegConds = [[sdxlSceneNegId, 0], ...pieceNegConds];
  const finalNegCond = buildCombineTree(allNegConds, 2200, 700, "Neg");

  // 9. 3D Spatial Guides & ControlNet Pipeline
  // Depth Loader & Apply
  const depthCnId = nextNodeId();
  nodes.push({
    id: depthCnId,
    type: "ControlNetLoader",
    pos: [3100, 100],
    size: [320, 90],
    title: "Depth ControlNet Loader",
    widgets_values: ["controlnet-depth-sdxl-1.0.safetensors"],
    outputs: [{ name: "CONTROL_NET", type: "CONTROL_NET", links: [], slot_index: 0 }]
  });
  nodeMap[depthCnId] = nodes[nodes.length - 1];

  const depthImgId = nextNodeId();
  nodes.push({
    id: depthImgId,
    type: "LoadImage",
    pos: [3100, 210],
    size: [320, 240],
    title: `3D Depth Guide (${depthPassName})`,
    widgets_values: [depthPassName, "image"],
    outputs: [
      { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 },
      { name: "MASK", type: "MASK", links: [], slot_index: 1 }
    ]
  });
  nodeMap[depthImgId] = nodes[nodes.length - 1];

  const depthApplyId = nextNodeId();
  const depthApplyNode = {
    id: depthApplyId,
    type: "ControlNetApplyAdvanced",
    pos: [3500, 210],
    size: [320, 200],
    title: "Apply 3D Depth ControlNet",
    widgets_values: [depthStrength, depthStart, depthEnd],
    inputs: [
      { name: "positive", type: "CONDITIONING", link: null },
      { name: "negative", type: "CONDITIONING", link: null },
      { name: "control_net", type: "CONTROL_NET", link: null },
      { name: "image", type: "IMAGE", link: null }
    ],
    outputs: [
      { name: "positive", type: "CONDITIONING", links: [], slot_index: 0 },
      { name: "negative", type: "CONDITIONING", links: [], slot_index: 1 }
    ]
  };
  nodes.push(depthApplyNode);
  nodeMap[depthApplyId] = depthApplyNode;

  const lDpPos = addLink(finalPosCond[0], finalPosCond[1], depthApplyId, 0, "CONDITIONING");
  nodeMap[finalPosCond[0]].outputs[finalPosCond[1]].links.push(lDpPos);
  depthApplyNode.inputs[0].link = lDpPos;

  const lDpNeg = addLink(finalNegCond[0], finalNegCond[1], depthApplyId, 1, "CONDITIONING");
  nodeMap[finalNegCond[0]].outputs[finalNegCond[1]].links.push(lDpNeg);
  depthApplyNode.inputs[1].link = lDpNeg;

  const lDpCn = addLink(depthCnId, 0, depthApplyId, 2, "CONTROL_NET");
  nodeMap[depthCnId].outputs[0].links.push(lDpCn);
  depthApplyNode.inputs[2].link = lDpCn;

  const lDpImg = addLink(depthImgId, 0, depthApplyId, 3, "IMAGE");
  nodeMap[depthImgId].outputs[0].links.push(lDpImg);
  depthApplyNode.inputs[3].link = lDpImg;

  // Normal Loader & Apply
  const normCnId = nextNodeId();
  nodes.push({
    id: normCnId,
    type: "ControlNetLoader",
    pos: [3100, 480],
    size: [320, 90],
    title: "Normal ControlNet Loader",
    widgets_values: ["controlnet-normal-sdxl-1.0.safetensors"],
    outputs: [{ name: "CONTROL_NET", type: "CONTROL_NET", links: [], slot_index: 0 }]
  });
  nodeMap[normCnId] = nodes[nodes.length - 1];

  const normImgId = nextNodeId();
  nodes.push({
    id: normImgId,
    type: "LoadImage",
    pos: [3100, 590],
    size: [320, 240],
    title: `3D Normal Guide (${normalPassName})`,
    widgets_values: [normalPassName, "image"],
    outputs: [
      { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 },
      { name: "MASK", type: "MASK", links: [], slot_index: 1 }
    ]
  });
  nodeMap[normImgId] = nodes[nodes.length - 1];

  const normApplyId = nextNodeId();
  const normApplyNode = {
    id: normApplyId,
    type: "ControlNetApplyAdvanced",
    pos: [3500, 480],
    size: [320, 200],
    title: "Apply 3D Normal ControlNet",
    widgets_values: [normalStrength, normalStart, normalEnd],
    inputs: [
      { name: "positive", type: "CONDITIONING", link: null },
      { name: "negative", type: "CONDITIONING", link: null },
      { name: "control_net", type: "CONTROL_NET", link: null },
      { name: "image", type: "IMAGE", link: null }
    ],
    outputs: [
      { name: "positive", type: "CONDITIONING", links: [], slot_index: 0 },
      { name: "negative", type: "CONDITIONING", links: [], slot_index: 1 }
    ]
  };
  nodes.push(normApplyNode);
  nodeMap[normApplyId] = normApplyNode;

  const lNmPos = addLink(depthApplyId, 0, normApplyId, 0, "CONDITIONING");
  depthApplyNode.outputs[0].links.push(lNmPos);
  normApplyNode.inputs[0].link = lNmPos;

  const lNmNeg = addLink(depthApplyId, 1, normApplyId, 1, "CONDITIONING");
  depthApplyNode.outputs[1].links.push(lNmNeg);
  normApplyNode.inputs[1].link = lNmNeg;

  const lNmCn = addLink(normCnId, 0, normApplyId, 2, "CONTROL_NET");
  nodeMap[normCnId].outputs[0].links.push(lNmCn);
  normApplyNode.inputs[2].link = lNmCn;

  const lNmImg = addLink(normImgId, 0, normApplyId, 3, "IMAGE");
  nodeMap[normImgId].outputs[0].links.push(lNmImg);
  normApplyNode.inputs[3].link = lNmImg;

  // 10. SDXL Stage 1 KSampler
  const sdxlKsId = nextNodeId();
  const sdxlKsNode = {
    id: sdxlKsId,
    type: "KSampler",
    pos: [3900, 300],
    size: [330, 310],
    title: "SDXL Stage 1 KSampler (Regional 3D Base)",
    widgets_values: [parseInt(globalState.seed || 7), "fixed", 28, sdxlCfg, "dpmpp_2m", "karras", sdxlDenoise],
    inputs: [
      { name: "model", type: "MODEL", link: null },
      { name: "positive", type: "CONDITIONING", link: null },
      { name: "negative", type: "CONDITIONING", link: null },
      { name: "latent_image", type: "LATENT", link: null }
    ],
    outputs: [
      { name: "LATENT", type: "LATENT", links: [], slot_index: 0 }
    ]
  };
  nodes.push(sdxlKsNode);
  nodeMap[sdxlKsId] = sdxlKsNode;

  const lKsMod = addLink(activeSdxlModelSource[0], activeSdxlModelSource[1], sdxlKsId, 0, "MODEL");
  nodeMap[activeSdxlModelSource[0]].outputs[activeSdxlModelSource[1]].links.push(lKsMod);
  sdxlKsNode.inputs[0].link = lKsMod;

  const lKsPos = addLink(normApplyId, 0, sdxlKsId, 1, "CONDITIONING");
  normApplyNode.outputs[0].links.push(lKsPos);
  sdxlKsNode.inputs[1].link = lKsPos;

  const lKsNeg = addLink(normApplyId, 1, sdxlKsId, 2, "CONDITIONING");
  normApplyNode.outputs[1].links.push(lKsNeg);
  sdxlKsNode.inputs[2].link = lKsNeg;

  const lKsLat = addLink(latentId, 0, sdxlKsId, 3, "LATENT");
  latentNode.outputs[0].links.push(lKsLat);
  sdxlKsNode.inputs[3].link = lKsLat;

  // SDXL VAE Decode & Save
  const sdxlDecodeId = nextNodeId();
  const sdxlDecodeNode = {
    id: sdxlDecodeId,
    type: "VAEDecode",
    pos: [4300, 150],
    size: [260, 110],
    title: "SDXL VAE Decode",
    inputs: [
      { name: "samples", type: "LATENT", link: null },
      { name: "vae", type: "VAE", link: null }
    ],
    outputs: [
      { name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 }
    ]
  };
  nodes.push(sdxlDecodeNode);
  nodeMap[sdxlDecodeId] = sdxlDecodeNode;

  const lDecLat = addLink(sdxlKsId, 0, sdxlDecodeId, 0, "LATENT");
  sdxlKsNode.outputs[0].links.push(lDecLat);
  sdxlDecodeNode.inputs[0].link = lDecLat;

  const lDecVae = addLink(sdxlCkptId, 2, sdxlDecodeId, 1, "VAE");
  sdxlCkptNode.outputs[2].links.push(lDecVae);
  sdxlDecodeNode.inputs[1].link = lDecVae;

  const sdxlSaveId = nextNodeId();
  const sdxlSaveNode = {
    id: sdxlSaveId,
    type: "SaveImage",
    pos: [4300, 300],
    size: [340, 320],
    title: "Save SDXL Base Pass",
    widgets_values: ["SDXL_Stage1_Base_Pass"],
    inputs: [{ name: "images", type: "IMAGE", link: null }]
  };
  nodes.push(sdxlSaveNode);
  nodeMap[sdxlSaveId] = sdxlSaveNode;

  const lSaveSdxl = addLink(sdxlDecodeId, 0, sdxlSaveId, 0, "IMAGE");
  sdxlDecodeNode.outputs[0].links.push(lSaveSdxl);
  sdxlSaveNode.inputs[0].link = lSaveSdxl;

  // 12. Stage 2: FLUX.1-dev CMF Refiner
  const fluxUnetId = nextNodeId();
  nodes.push({
    id: fluxUnetId,
    type: "UNETLoader",
    pos: [4800, 0],
    size: [320, 90],
    title: "FLUX Diffusion Model (FP8)",
    widgets_values: ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"],
    outputs: [{ name: "MODEL", type: "MODEL", links: [], slot_index: 0 }]
  });
  nodeMap[fluxUnetId] = nodes[nodes.length - 1];

  const fluxClipId = nextNodeId();
  nodes.push({
    id: fluxClipId,
    type: "DualCLIPLoader",
    pos: [4800, 130],
    size: [320, 100],
    title: "FLUX Dual CLIP (T5XXL + CLIP-L)",
    widgets_values: ["t5xxl_fp8_e4m3fn.safetensors", "clip_l.safetensors", "flux"],
    outputs: [{ name: "CLIP", type: "CLIP", links: [], slot_index: 0 }]
  });
  nodeMap[fluxClipId] = nodes[nodes.length - 1];

  const fluxVaeId = nextNodeId();
  nodes.push({
    id: fluxVaeId,
    type: "VAELoader",
    pos: [4800, 270],
    size: [320, 90],
    title: "FLUX VAE Loader",
    widgets_values: ["ae.safetensors"],
    outputs: [{ name: "VAE", type: "VAE", links: [], slot_index: 0 }]
  });
  nodeMap[fluxVaeId] = nodes[nodes.length - 1];

  // FLUX LoRA
  const fluxLoraWeight = parseFloat(globalState.fluxLoraWeight !== undefined ? globalState.fluxLoraWeight : 0.55);
  const fluxGuidanceVal = parseFloat(globalState.fluxGuidance !== undefined ? globalState.fluxGuidance : 2.8);
  const fluxDenoiseVal = parseFloat(globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.21);

  const fluxLoraId = nextNodeId();
  const fluxLoraNode = {
    id: fluxLoraId,
    type: "LoraLoader",
    pos: [5180, 0],
    size: [320, 130],
    title: "Apple Minimal Craft FLUX LoRA",
    widgets_values: ["apple_minimal_craft_flux_v1.safetensors", fluxLoraWeight, 0.0],
    inputs: [
      { name: "model", type: "MODEL", link: null },
      { name: "clip", type: "CLIP", link: null }
    ],
    outputs: [
      { name: "MODEL", type: "MODEL", links: [], slot_index: 0 },
      { name: "CLIP", type: "CLIP", links: [], slot_index: 1 }
    ]
  };
  nodes.push(fluxLoraNode);
  nodeMap[fluxLoraId] = fluxLoraNode;

  const lFxMod = addLink(fluxUnetId, 0, fluxLoraId, 0, "MODEL");
  nodeMap[fluxUnetId].outputs[0].links.push(lFxMod);
  fluxLoraNode.inputs[0].link = lFxMod;

  const lFxClip = addLink(fluxClipId, 0, fluxLoraId, 1, "CLIP");
  nodeMap[fluxClipId].outputs[0].links.push(lFxClip);
  fluxLoraNode.inputs[1].link = lFxClip;

  // FLUX Pos Prompt & Guidance
  const fluxPosId = nextNodeId();
  const fluxPosNode = {
    id: fluxPosId,
    type: "CLIPTextEncode",
    pos: [5560, 0],
    size: [400, 190],
    title: "FLUX Stage 2 Master Prompt",
    widgets_values: [fluxPos],
    inputs: [{ name: "clip", type: "CLIP", link: null }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  };
  nodes.push(fluxPosNode);
  nodeMap[fluxPosId] = fluxPosNode;

  const lFlPosClip = addLink(fluxLoraId, 1, fluxPosId, 0, "CLIP");
  fluxLoraNode.outputs[1].links.push(lFlPosClip);
  fluxPosNode.inputs[0].link = lFlPosClip;

  const fluxGuideId = nextNodeId();
  const fluxGuideNode = {
    id: fluxGuideId,
    type: "FluxGuidance",
    pos: [6000, 0],
    size: [220, 90],
    title: "Flux Guidance",
    widgets_values: [fluxGuidanceVal],
    inputs: [{ name: "conditioning", type: "CONDITIONING", link: null }],
    outputs: [{ name: "conditioning", type: "CONDITIONING", links: [], slot_index: 0 }]
  };
  nodes.push(fluxGuideNode);
  nodeMap[fluxGuideId] = fluxGuideNode;

  const lFlGuid = addLink(fluxPosId, 0, fluxGuideId, 0, "CONDITIONING");
  fluxPosNode.outputs[0].links.push(lFlGuid);
  fluxGuideNode.inputs[0].link = lFlGuid;

  // FLUX Neg Prompt
  const fluxNegId = nextNodeId();
  const fluxNegNode = {
    id: fluxNegId,
    type: "CLIPTextEncode",
    pos: [5560, 230],
    size: [400, 150],
    title: "FLUX Negative Prompt",
    widgets_values: [globalNeg],
    inputs: [{ name: "clip", type: "CLIP", link: null }],
    outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [], slot_index: 0 }]
  };
  nodes.push(fluxNegNode);
  nodeMap[fluxNegId] = fluxNegNode;

  const lFlNegClip = addLink(fluxLoraId, 1, fluxNegId, 0, "CLIP");
  fluxLoraNode.outputs[1].links.push(lFlNegClip);
  fluxNegNode.inputs[0].link = lFlNegClip;

  // FLUX VAE Encode (Direct from SDXL Stage 1 Base Output)
  const fluxEncId = nextNodeId();
  const fluxEncNode = {
    id: fluxEncId,
    type: "VAEEncode",
    pos: [5560, 420],
    size: [300, 110],
    title: "FLUX VAE Encode (SDXL Base Output)",
    inputs: [
      { name: "pixels", type: "IMAGE", link: null },
      { name: "vae", type: "VAE", link: null }
    ],
    outputs: [{ name: "LATENT", type: "LATENT", links: [], slot_index: 0 }]
  };
  nodes.push(fluxEncNode);
  nodeMap[fluxEncId] = fluxEncNode;

  const lEncImg = addLink(sdxlDecodeId, 0, fluxEncId, 0, "IMAGE");
  sdxlDecodeNode.outputs[0].links.push(lEncImg);
  fluxEncNode.inputs[0].link = lEncImg;

  const lEncVae = addLink(fluxVaeId, 0, fluxEncId, 1, "VAE");
  nodeMap[fluxVaeId].outputs[0].links.push(lEncVae);
  fluxEncNode.inputs[1].link = lEncVae;

  // FLUX Stage 2 KSampler
  const fluxKsId = nextNodeId();
  const fluxKsNode = {
    id: fluxKsId,
    type: "KSampler",
    pos: [6280, 100],
    size: [330, 310],
    title: "FLUX Stage 2 KSampler (CMF Refiner)",
    widgets_values: [parseInt(globalState.seed || 7), "fixed", 20, parseFloat(globalState.fluxCfg || 1.0), "euler", "beta", fluxDenoiseVal],
    inputs: [
      { name: "model", type: "MODEL", link: null },
      { name: "positive", type: "CONDITIONING", link: null },
      { name: "negative", type: "CONDITIONING", link: null },
      { name: "latent_image", type: "LATENT", link: null }
    ],
    outputs: [{ name: "LATENT", type: "LATENT", links: [], slot_index: 0 }]
  };
  nodes.push(fluxKsNode);
  nodeMap[fluxKsId] = fluxKsNode;

  const lFlksMod = addLink(fluxLoraId, 0, fluxKsId, 0, "MODEL");
  fluxLoraNode.outputs[0].links.push(lFlksMod);
  fluxKsNode.inputs[0].link = lFlksMod;

  const lFlksPos = addLink(fluxGuideId, 0, fluxKsId, 1, "CONDITIONING");
  fluxGuideNode.outputs[0].links.push(lFlksPos);
  fluxKsNode.inputs[1].link = lFlksPos;

  const lFlksNeg = addLink(fluxNegId, 0, fluxKsId, 2, "CONDITIONING");
  fluxNegNode.outputs[0].links.push(lFlksNeg);
  fluxKsNode.inputs[2].link = lFlksNeg;

  const lFlksLat = addLink(fluxEncId, 0, fluxKsId, 3, "LATENT");
  fluxEncNode.outputs[0].links.push(lFlksLat);
  fluxKsNode.inputs[3].link = lFlksLat;

  // FLUX VAE Decode
  const fluxDecId = nextNodeId();
  const fluxDecNode = {
    id: fluxDecId,
    type: "VAEDecode",
    pos: [6660, 100],
    size: [260, 110],
    title: "FLUX VAE Decode",
    inputs: [
      { name: "samples", type: "LATENT", link: null },
      { name: "vae", type: "VAE", link: null }
    ],
    outputs: [{ name: "IMAGE", type: "IMAGE", links: [], slot_index: 0 }]
  };
  nodes.push(fluxDecNode);
  nodeMap[fluxDecId] = fluxDecNode;

  const lFdecLat = addLink(fluxKsId, 0, fluxDecId, 0, "LATENT");
  fluxKsNode.outputs[0].links.push(lFdecLat);
  fluxDecNode.inputs[0].link = lFdecLat;

  const lFdecVae = addLink(fluxVaeId, 0, fluxDecId, 1, "VAE");
  nodeMap[fluxVaeId].outputs[0].links.push(lFdecVae);
  fluxDecNode.inputs[1].link = lFdecVae;

  // Final Master Save Image
  const finalSaveId = nextNodeId();
  const finalSaveNode = {
    id: finalSaveId,
    type: "SaveImage",
    pos: [7620, 100],
    size: [380, 380],
    title: "Save Final Master LookDev Image",
    widgets_values: [`Apple_Spatial_LookDev_${shotStr}_Master`],
    inputs: [{ name: "images", type: "IMAGE", link: null }]
  };
  nodes.push(finalSaveNode);
  nodeMap[finalSaveId] = finalSaveNode;

  const lFsave = addLink(fluxDecId, 0, finalSaveId, 0, "IMAGE");
  fluxDecNode.outputs[0].links.push(lFsave);
  finalSaveNode.inputs[0].link = lFsave;

  return {
    last_node_id: nodeIdCounter,
    last_link_id: linkIdCounter,
    nodes: nodes,
    links: links,
    groups: [],
    config: {},
    extra: { ds: { scale: 0.8, offset: [100, 100] } },
    version: 0.4
  };
}

// ==========================================================================
// Dynamic Workflow Export & 1-Click Quick Copy Handler
// ==========================================================================

async function safeCopyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("[Clipboard] navigator.clipboard write failed, attempting textarea fallback:", err);
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    const success = document.execCommand("copy");
    document.body.removeChild(ta);
    return success;
  } catch (e) {
    console.error("[Clipboard] Fallback execCommand failed:", e);
    return false;
  }
}

function syncActiveImagesToDisk() {
  try {
    const payload = {
      p0_image_src: globalState.p0ImageSrc || "",
      swatches: (activeSwatches || []).map(s => ({ imageSrc: s.imageSrc || "" }))
    };
    fetch("/api/sync_ref_images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(e => console.warn("[Sync Images] Non-critical sync notice:", e));
  } catch (err) {
    console.warn("[Sync Images] Notice:", err);
  }
}

async function quickCopyWorkflow() {
  syncAllInputsToState();
  try {
    syncActiveImagesToDisk();
    let dynamicWf;
    if (globalState.stage1Engine === "vlm") {
      dynamicWf = buildDynamicVlmFluxWorkflow();
    } else if (globalState.stage1Engine === "seadance") {
      dynamicWf = buildDynamicSeaDanceFluxWorkflow();
    } else {
      dynamicWf = buildDynamicHybridWorkflow();
    }
    const jsonText = JSON.stringify(dynamicWf, null, 2);
    const success = await safeCopyToClipboard(jsonText);
    if (success) {
      showToast("⚡ 1-Click 복사 완료! ComfyUI에서 바로 Ctrl+V 하세요! 🚀");
    } else {
      showToast("⚠️ 클립보드 복사 실패. 톱니바퀴 버튼을 눌러 수동 복사하세요.");
    }
  } catch (err) {
    console.error("quickCopyWorkflow error:", err);
    showToast(`⚠️ 오류 발생: ${err.message}`);
  }
}

function openDynamicExportModal() {
  syncAllInputsToState();
  const shotStr = String(currentShot).padStart(4, "0");
  
  // 1. Auto-generate clean, recommended filename
  const defaultFilename = `lookdev_shot${shotStr}_dynamic_hybrid.json`;
  
  const inputEl = document.getElementById("dynamic-export-filename");
  if (inputEl) {
    if (!inputEl.value || inputEl.value === "apple_spatial_lookdev_dynamic_v1.json" || inputEl.value.startsWith("lookdev_shot")) {
      inputEl.value = defaultFilename;
    }
    inputEl.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeDynamicExport("save");
      }
    };
  }

  // 2. Render Real-time Summary Badges
  const badgesContainer = document.getElementById("dynamic-export-summary-badges");
  if (badgesContainer) {
    const badges = [];

    // Shot badge
    badges.push(`<span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 600;">🎬 Shot ${shotStr}</span>`);

    // Engine Badge
    const engineMode = globalState.stage1Engine || "vlm";
    if (engineMode === "vlm") {
      badges.push(`<span style="background: rgba(192, 132, 252, 0.2); color: #f3e8ff; border: 1px solid #c084fc; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 700;">💎 Gemini VLM + FLUX (No Masks)</span>`);
      badges.push(`<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; padding: 2px 8px; font-size: 11px;">🌐 ${(globalState.guideSlots || []).length} Guide Passes</span>`);
    } else {
      // P0 Floor badge
      const p0Img = globalState.useP0Image !== false;
      const p0Pos = globalState.useP0PosText !== false;
      const p0Neg = !!globalState.useP0NegText;
      const p0Mode = p0Img ? "🖼️ Image + Text" : "✍️ Pure Text";
      badges.push(`<span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 4px; padding: 2px 8px; font-size: 11px;">P0 Floor: <b>${p0Mode}</b>${p0Neg ? ' (+Neg)' : ''}</span>`);

      // P1 ~ P6 Swatch Badges
      activeSwatches.forEach((s, idx) => {
        const pNum = idx + 1;
        const sImg = s.useImage !== false;
        const sPos = s.usePosText !== false;
        const sNeg = !!s.useNegText;
        const sMode = sImg ? "🖼️ Image" : "✍️ Text";
        const badgeColor = sImg ? "#22c55e" : "#cbd5e1";
        const badgeBg = sImg ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.08)";
        const badgeBorder = sImg ? "rgba(34, 197, 94, 0.3)" : "rgba(255, 255, 255, 0.15)";
        badges.push(`<span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; border-radius: 4px; padding: 2px 8px; font-size: 11px;">P${pNum}: <b>${sMode}</b>${sNeg ? ' (+Neg)' : ''}</span>`);
      });

      // SDXL LoRA Specs
      const isLora = !!globalState.useSdxlLora;
      const loraStr = globalState.sdxlLoraStrength !== undefined ? globalState.sdxlLoraStrength : 0.95;
      badges.push(`<span style="background: ${isLora ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)'}; color: ${isLora ? '#34d399' : '#94a3b8'}; border: 1px solid ${isLora ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.15)'}; border-radius: 4px; padding: 2px 8px; font-size: 11px;">🍎 SDXL: <b>${isLora ? `LoRA (${loraStr})` : 'Base No-LoRA'}</b></span>`);
    }

    const fLora = globalState.fluxLoraWeight !== undefined ? globalState.fluxLoraWeight : 0.55;
    const fGuid = globalState.fluxGuidance !== undefined ? globalState.fluxGuidance : 2.8;
    const fDen = globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.21;
    badges.push(`<span style="background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 4px; padding: 2px 8px; font-size: 11px;">✨ FLUX: LoRA (${fLora}) · Guide (${fGuid}) · Denoise (${fDen})</span>`);

    badgesContainer.innerHTML = badges.join("");
  }

  const modal = document.getElementById("dynamic-export-modal");
  if (modal) {
    modal.style.display = "flex";
    if (inputEl) {
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 50);
    }
  }
}

function closeDynamicExportModal() {
  const modal = document.getElementById("dynamic-export-modal");
  if (modal) modal.style.display = "none";
}

async function executeDynamicExport(action) {
  syncAllInputsToState();
  const inputEl = document.getElementById("dynamic-export-filename");
  let filename = (inputEl && inputEl.value.trim()) ? inputEl.value.trim() : `lookdev_shot${String(currentShot).padStart(4, "0")}_dynamic.json`;
  if (!filename.endsWith(".json")) filename += ".json";

  let dynamicWf;
  if (globalState.stage1Engine === "vlm") {
    dynamicWf = buildDynamicVlmFluxWorkflow();
  } else if (globalState.stage1Engine === "seadance") {
    dynamicWf = buildDynamicSeaDanceFluxWorkflow();
  } else {
    dynamicWf = buildDynamicHybridWorkflow();
  }
  const jsonText = JSON.stringify(dynamicWf, null, 2);

  if (action === "copy") {
    const success = await safeCopyToClipboard(jsonText);
    if (success) {
      showToast(`📋 Copied '${filename}' to Clipboard! (Paste into ComfyUI)`);
    } else {
      showToast(`📋 JSON Ready for '${filename}'`);
    }
    // Background sync to server with chosen filename
    try {
      const regionalData = getSDXLRegionalData();
      fetch("/api/inject_workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_workflow: "dynamic_pure_synthesis",
          output_workflow: filename,
          shot: String(currentShot).padStart(4, "0"),
          use_sdxl_lora: !!globalState.useSdxlLora,
          sdxl_lora_strength: globalState.sdxlLoraStrength !== undefined ? globalState.sdxlLoraStrength : 0.95,
          p0_use_image: globalState.useP0Image !== false,
          p0_use_pos_text: globalState.useP0PosText !== false,
          p0_use_neg_text: !!globalState.useP0NegText,
          p0_image_weight: globalState.p0ImageWeight !== undefined ? globalState.p0ImageWeight : 0.95,
          p0_prompt_weight: globalState.p0PromptWeight !== undefined ? globalState.p0PromptWeight : 1.00,
          p0_image_src: globalState.p0ImageSrc || "",
          depth_strength: globalState.depthStrength !== undefined ? globalState.depthStrength : 0.30,
          depth_start: globalState.depthStart !== undefined ? globalState.depthStart : 0.0,
          depth_end: globalState.depthEnd !== undefined ? globalState.depthEnd : 0.35,
          normal_strength: globalState.normalStrength !== undefined ? globalState.normalStrength : 0.20,
          normal_start: globalState.normalStart !== undefined ? globalState.normalStart : 0.0,
          normal_end: globalState.normalEnd !== undefined ? globalState.normalEnd : 0.35,
          sdxl_cfg: globalState.sdxlCfg !== undefined ? globalState.sdxlCfg : 5.5,
          sdxl_denoise: globalState.sdxlDenoise !== undefined ? globalState.sdxlDenoise : 1.0,
          flux_cfg: globalState.fluxCfg !== undefined ? globalState.fluxCfg : 1.0,
          flux_denoise: globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.25,
          sdxl_global_pos: typeof buildGlobalScenePromptText === "function" ? buildGlobalScenePromptText() : (globalState.lighting || ""),
          global_neg: globalState.negative || "",
          flux_pos: typeof buildFLUXMasterPromptText === "function" ? buildFLUXMasterPromptText() : "",
          background: regionalData.Background,
          regional: regionalData.Parts
        })
      }).catch(e => console.warn(e));
    } catch (e) {}
    closeDynamicExportModal();
  } else if (action === "save") {
    showToast(`⏳ Saving '${filename}' to comfyui_workflows & deploying 3D passes...`);
    try {
      const regionalData = getSDXLRegionalData();
      const res = await fetch("/api/inject_workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_workflow: "dynamic_pure_synthesis",
          output_workflow: filename,
          shot: String(currentShot).padStart(4, "0"),
          use_sdxl_lora: !!globalState.useSdxlLora,
          sdxl_lora_strength: globalState.sdxlLoraStrength !== undefined ? globalState.sdxlLoraStrength : 0.95,
          p0_use_image: globalState.useP0Image !== false,
          p0_use_pos_text: globalState.useP0PosText !== false,
          p0_use_neg_text: !!globalState.useP0NegText,
          p0_image_weight: globalState.p0ImageWeight !== undefined ? globalState.p0ImageWeight : 0.95,
          p0_prompt_weight: globalState.p0PromptWeight !== undefined ? globalState.p0PromptWeight : 1.00,
          p0_image_src: globalState.p0ImageSrc || "",
          depth_strength: globalState.depthStrength !== undefined ? globalState.depthStrength : 0.30,
          depth_start: globalState.depthStart !== undefined ? globalState.depthStart : 0.0,
          depth_end: globalState.depthEnd !== undefined ? globalState.depthEnd : 0.35,
          normal_strength: globalState.normalStrength !== undefined ? globalState.normalStrength : 0.20,
          normal_start: globalState.normalStart !== undefined ? globalState.normalStart : 0.0,
          normal_end: globalState.normalEnd !== undefined ? globalState.normalEnd : 0.35,
          sdxl_cfg: globalState.sdxlCfg !== undefined ? globalState.sdxlCfg : 5.5,
          sdxl_denoise: globalState.sdxlDenoise !== undefined ? globalState.sdxlDenoise : 1.0,
          flux_cfg: globalState.fluxCfg !== undefined ? globalState.fluxCfg : 1.0,
          flux_denoise: globalState.fluxDenoise !== undefined ? globalState.fluxDenoise : 0.25,
          sdxl_global_pos: typeof buildGlobalScenePromptText === "function" ? buildGlobalScenePromptText() : (globalState.lighting || ""),
          global_neg: globalState.negative || "",
          flux_pos: typeof buildFLUXMasterPromptText === "function" ? buildFLUXMasterPromptText() : "",
          background: regionalData.Background,
          regional: regionalData.Parts
        })
      });
      if (res.ok) {
        showToast(`✅ Saved 'comfyui_workflows/${filename}' & deployed assets!`);
      } else {
        showToast(`⚠️ Server saved fallback for '${filename}'`);
      }
    } catch (e) {
      showToast(`❌ Save error: ${e}`);
    }
    closeDynamicExportModal();
  } else if (action === "download") {
    const blob = new Blob([jsonText], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    showToast(`📥 Downloaded '${filename}'!`);
    closeDynamicExportModal();
  }
}

// Quick Copy fallback
async function copyMasterWorkflowV3Json() {
  openDynamicExportModal();
}

function copySDXLAll() {
  const globalPrompt = typeof buildGlobalScenePromptText === "function" ? buildGlobalScenePromptText() : "";
  const regionalPrompts = activeSwatches.map((s, idx) => `[Part 0${idx + 1} (${s.partName || `Part ${idx+1}`})]: ${s.prompt}`).join("\n");
  const fullSDXL = `${globalPrompt}\n\n=== REGIONAL PROMPTS ===\n${regionalPrompts}`;
  safeCopyToClipboard(fullSDXL).then((success) => {
    if (success) {
      showToast("📋 Copied SDXL Master Prompts (Global + Regional) to Clipboard!");
    } else {
      showToast("📋 Copied SDXL Prompts!");
    }
  });
}

// ==========================================================================
// Reverse Sync / Import Engine: Populates the Tool from ComfyUI Workflow JSON
// ==========================================================================

async function syncFromMasterWorkflow() {
  try {
    showToast("⏳ Reading Master v3 Workflow JSON...");
    const res = await fetch("/api/workflow_json?name=apple_spatial_hybrid_sdxl_flux_ipadapter_master_v3.json");
    if (!res.ok) {
      showToast("❌ Could not load Master v3 Workflow JSON file");
      return;
    }
    const data = await res.json();
    if (data && data.workflow) {
      importFromComfyUIWorkflow(data.workflow);
      showToast("✅ Successfully synced tool from Master v3 Workflow!");
    } else {
      showToast("⚠️ Invalid workflow response from server");
    }
  } catch (e) {
    console.error(e);
    showToast(`❌ Sync failed: ${e}`);
  }
}

function importFromComfyUIWorkflow(wfData) {
  if (!wfData || !wfData.nodes || !Array.isArray(wfData.nodes)) {
    showToast("⚠️ Invalid ComfyUI Workflow JSON structure");
    return;
  }

  const nodeMap = {};
  wfData.nodes.forEach(n => {
    nodeMap[n.id] = n;
  });

  // 1. Detect 3D Guide Shot from Node 7 (Depth LoadImage) or Node 8 (Normal LoadImage)
  const depthNode = nodeMap[7];
  if (depthNode && depthNode.widgets_values && depthNode.widgets_values[0]) {
    const depthVal = String(depthNode.widgets_values[0]);
    const match = depthVal.match(/(\d{4})/);
    if (match && match[1]) {
      const shotId = match[1];
      const shotSelect = document.getElementById("shot-select");
      if (shotSelect) {
        shotSelect.value = shotId;
        onShotSelectChange(shotId);
      }
    }
  }

  // 2. Extract P0 Floor (Background) Prompts, Image, and Bypass state
  const p0ImgNode = nodeMap[10];
  const p0PosNode = nodeMap[11];
  const p0NegNode = nodeMap[12];
  const p0IpRegNode = nodeMap[13];
  
  if (p0ImgNode) {
    const isIpActive = p0IpRegNode && Array.isArray(p0IpRegNode.widgets_values) ? (parseFloat(p0IpRegNode.widgets_values[0]) > 0.001) : (p0ImgNode.mode !== 2 && p0ImgNode.mode !== 4);
    globalState.useP0Image = isIpActive;
    const p0UseImgToggle = document.getElementById("p0-use-image-toggle");
    if (p0UseImgToggle) p0UseImgToggle.checked = isIpActive;
    toggleP0UseImage(isIpActive);

    if (p0ImgNode.widgets_values && p0ImgNode.widgets_values[0]) {
      const imgVal = String(p0ImgNode.widgets_values[0]);
      if (imgVal && imgVal !== "image.png") {
        const preview = document.getElementById("p0-img-preview");
        const placeholder = document.getElementById("p0-img-placeholder");
        if (preview) {
          preview.src = imgVal.startsWith("data:") ? imgVal : `/input/${imgVal}`;
          preview.style.display = "block";
        }
        if (placeholder) placeholder.style.display = "none";
      }
    }
  }

  if (p0PosNode) {
    const isBypassed = p0PosNode.mode === 2 || p0PosNode.mode === 4;
    globalState.useP0PosText = !isBypassed;
    const p0UsePosToggle = document.getElementById("p0-use-pos-toggle");
    if (p0UsePosToggle) p0UsePosToggle.checked = !isBypassed;
    toggleP0UsePosText(!isBypassed);

    if (p0PosNode.widgets_values && p0PosNode.widgets_values[0]) {
      const p0Prompt = String(p0PosNode.widgets_values[0]).trim();
      globalState.p0CustomPrompt = p0Prompt;
      globalState.isP0CustomPrompt = true;
      const p0CustomToggle = document.getElementById("p0-custom-prompt-toggle");
      if (p0CustomToggle) p0CustomToggle.checked = true;
      const p0CustomTa = document.getElementById("p0-custom-prompt-textarea");
      if (p0CustomTa) {
        p0CustomTa.value = p0Prompt;
        p0CustomTa.style.display = "block";
        autoResize(p0CustomTa);
      }
      const liveP0 = document.getElementById("live-prompt-p0-global");
      if (liveP0) liveP0.style.display = "none";
    }
  }

  if (p0NegNode) {
    const isBypassed = p0NegNode.mode === 2 || p0NegNode.mode === 4;
    globalState.useP0NegText = !isBypassed;
    const p0UseNegToggle = document.getElementById("p0-use-neg-toggle");
    if (p0UseNegToggle) p0UseNegToggle.checked = !isBypassed;
    toggleP0UseNegText(!isBypassed);

    if (p0NegNode.widgets_values && p0NegNode.widgets_values[0]) {
      const p0NegPrompt = String(p0NegNode.widgets_values[0]).trim();
      globalState.p0NegativePrompt = p0NegPrompt;
      const p0NegTa = document.getElementById("p0-negative-prompt-textarea");
      if (p0NegTa) {
        p0NegTa.value = p0NegPrompt;
        autoResize(p0NegTa);
      }
    }
  }

  // 3. Extract P1 ~ P6 Swatch Prompts, Reference Images, and Bypass state
  const swatchMapping = [
    { idx: 0, posId: 16, negId: 17, refId: 15, maskId: 14, ipRegId: 18 },
    { idx: 1, posId: 21, negId: 22, refId: 20, maskId: 19, ipRegId: 23 },
    { idx: 2, posId: 26, negId: 27, refId: 25, maskId: 24, ipRegId: 28 },
    { idx: 3, posId: 31, negId: 32, refId: 30, maskId: 29, ipRegId: 33 },
    { idx: 4, posId: 36, negId: 37, refId: 35, maskId: 34, ipRegId: 38 },
    { idx: 5, posId: 41, negId: 42, refId: 40, maskId: 39, ipRegId: 43 },
  ];

  swatchMapping.forEach(({ idx, posId, negId, refId, ipRegId }) => {
    if (activeSwatches[idx]) {
      const refNode = nodeMap[refId];
      const posNode = nodeMap[posId];
      const negNode = nodeMap[negId];
      const ipRegNode = nodeMap[ipRegId];

      if (refNode) {
        const isIpActive = ipRegNode && Array.isArray(ipRegNode.widgets_values) ? (parseFloat(ipRegNode.widgets_values[0]) > 0.001) : (refNode.mode !== 2 && refNode.mode !== 4);
        activeSwatches[idx].useImage = isIpActive;
        const imgToggle = document.getElementById(`use-image-toggle-${idx}`);
        if (imgToggle) imgToggle.checked = isIpActive;
        toggleSwatchUseImage(idx, isIpActive);

        if (refNode.widgets_values && refNode.widgets_values[0]) {
          const imgName = String(refNode.widgets_values[0]).trim();
          if (imgName && imgName !== "image.png") {
            activeSwatches[idx].imageSrc = imgName.startsWith("data:") ? imgName : `/input/${imgName}`;
          }
        }
      }

      if (posNode) {
        const isBypassed = posNode.mode === 2 || posNode.mode === 4;
        activeSwatches[idx].usePosText = !isBypassed;
        const posToggle = document.getElementById(`use-pos-toggle-${idx}`);
        if (posToggle) posToggle.checked = !isBypassed;
        toggleSwatchUsePosText(idx, !isBypassed);

        if (posNode.widgets_values && posNode.widgets_values[0]) {
          const text = String(posNode.widgets_values[0]).trim();
          activeSwatches[idx].customPrompt = text;
          activeSwatches[idx].isCustomPrompt = true;
        }
      }

      if (negNode) {
        const isBypassed = negNode.mode === 2 || negNode.mode === 4;
        activeSwatches[idx].useNegText = !isBypassed;
        const negToggle = document.getElementById(`use-neg-toggle-${idx}`);
        if (negToggle) negToggle.checked = !isBypassed;
        toggleSwatchUseNegText(idx, !isBypassed);

        if (negNode.widgets_values && negNode.widgets_values[0]) {
          const text = String(negNode.widgets_values[0]).trim();
          activeSwatches[idx].negativePrompt = text;
        }
      }
    }
  });

  // 4. Extract Global Prompts
  // Node 68: SDXL Global Scene Prompt
  const sdxlSceneNode = nodeMap[68];
  if (sdxlSceneNode && sdxlSceneNode.widgets_values && sdxlSceneNode.widgets_values[0]) {
    const scenePrompt = String(sdxlSceneNode.widgets_values[0]).trim();
    globalState.lighting = scenePrompt;
    const litTa = document.getElementById("global-lighting-text");
    if (litTa) {
      litTa.value = scenePrompt;
      autoResize(litTa);
    }
  }

  // Node 69: SDXL Global Negative Prompt
  const negNode = nodeMap[69] || nodeMap[63];
  if (negNode && negNode.widgets_values && negNode.widgets_values[0]) {
    const negPrompt = String(negNode.widgets_values[0]).trim();
    globalState.negative = negPrompt;
    const negTa = document.getElementById("global-negative-textarea");
    if (negTa) {
      negTa.value = negPrompt;
      autoResize(negTa);
    }
  }

  // Node 61: FLUX Stage 2 Master Prompt
  const fluxPosNode = nodeMap[61];
  if (fluxPosNode && fluxPosNode.widgets_values && fluxPosNode.widgets_values[0]) {
    const fluxPrompt = String(fluxPosNode.widgets_values[0]).trim();
    globalState.fluxCustomPrompt = fluxPrompt;
    globalState.isFluxCustomPrompt = true;
    const fluxTa = document.getElementById("flux-custom-prompt-textarea");
    const fluxPre = document.getElementById("flux-master-prompt-text");
    const fluxToggle = document.getElementById("flux-custom-prompt-toggle");
    if (fluxToggle) fluxToggle.checked = true;
    if (fluxPre) fluxPre.style.display = "none";
    if (fluxTa) {
      fluxTa.style.display = "block";
      fluxTa.value = fluxPrompt;
      autoResize(fluxTa);
    }
  }

  // 5. Extract ControlNet & KSampler Parameters
  if (nodeMap[51] && Array.isArray(nodeMap[51].widgets_values)) {
    if (nodeMap[51].widgets_values[0] !== undefined) globalState.depthStrength = parseFloat(nodeMap[51].widgets_values[0]);
    if (nodeMap[51].widgets_values[1] !== undefined) globalState.depthStart = parseFloat(nodeMap[51].widgets_values[1]);
    if (nodeMap[51].widgets_values[2] !== undefined) globalState.depthEnd = parseFloat(nodeMap[51].widgets_values[2]);
  }
  if (nodeMap[52] && Array.isArray(nodeMap[52].widgets_values)) {
    if (nodeMap[52].widgets_values[0] !== undefined) globalState.normalStrength = parseFloat(nodeMap[52].widgets_values[0]);
    if (nodeMap[52].widgets_values[1] !== undefined) globalState.normalStart = parseFloat(nodeMap[52].widgets_values[1]);
    if (nodeMap[52].widgets_values[2] !== undefined) globalState.normalEnd = parseFloat(nodeMap[52].widgets_values[2]);
  }
  if (nodeMap[54] && Array.isArray(nodeMap[54].widgets_values)) {
    if (nodeMap[54].widgets_values[3] !== undefined) globalState.sdxlCfg = parseFloat(nodeMap[54].widgets_values[3]);
    if (nodeMap[54].widgets_values[6] !== undefined) globalState.sdxlDenoise = parseFloat(nodeMap[54].widgets_values[6]);
  }
  if (nodeMap[65] && Array.isArray(nodeMap[65].widgets_values)) {
    if (nodeMap[65].widgets_values[3] !== undefined) globalState.fluxCfg = parseFloat(nodeMap[65].widgets_values[3]);
    if (nodeMap[65].widgets_values[6] !== undefined) globalState.fluxDenoise = parseFloat(nodeMap[65].widgets_values[6]);
  }

  syncComfyParamsToUI();
  renderSwatchRows();
  updateSynthesizer();
}

// ==========================================================================
// Interactive Image Slot Tracking & Global Clipboard Paste (Ctrl+V) Engine
// ==========================================================================

let activeImageTargetSlot = "P0"; // "P0" or 0, 1, 2, 3, 4, 5
let lastHoveredImageSlot = null;

function setActiveImageTarget(slot) {
  activeImageTargetSlot = slot;
  document.querySelectorAll(".img-upload-box").forEach(el => el.classList.remove("slot-target-active"));
  if (slot === "P0") {
    document.getElementById("p0-img-box")?.classList.add("slot-target-active");
  } else {
    document.querySelector(`#col-img-${slot} .img-upload-box`)?.classList.add("slot-target-active");
  }
}

async function applyImageFileToSlot(slot, file) {
  if (!file || !file.type.startsWith("image/")) return;
  try {
    const isP0 = slot === "P0";
    const slotLabel = isP0 ? "P0 Floor" : `P${parseInt(slot, 10) + 1} Swatch`;
    showToast(`⏳ Optimizing pasted image for ${slotLabel} (WebP 1K)...`);
    
    const webpUrl = await compressImageToWebP(file, 1024, 0.90);
    
    if (isP0) {
      globalState.p0ImageSrc = webpUrl;
      globalState.useP0Image = true;
      const preview = document.getElementById("p0-img-preview");
      const placeholder = document.getElementById("p0-img-placeholder");
      if (preview) {
        preview.src = webpUrl;
        preview.style.display = "block";
      }
      if (placeholder) placeholder.style.display = "none";
      const chip = document.getElementById("p0-toggle-img-chip");
      if (chip) chip.classList.add("active-img");
      const box = document.getElementById("p0-img-box");
      if (box) box.classList.remove("cmf-section-disabled");
      const toggle = document.getElementById("p0-use-image-toggle");
      if (toggle) toggle.checked = true;
    } else {
      const idx = parseInt(slot, 10);
      if (activeSwatches[idx]) {
        activeSwatches[idx].imageSrc = webpUrl;
        activeSwatches[idx].useImage = true;
        const chip = document.getElementById(`toggle-img-chip-${idx}`);
        if (chip) chip.classList.add("active-img");
        const colImg = document.getElementById(`col-img-${idx}`);
        if (colImg) colImg.classList.remove("cmf-section-disabled");
        const toggle = document.getElementById(`use-image-toggle-${idx}`);
        if (toggle) toggle.checked = true;
      }
      renderSwatchRows();
    }
    
    updateSynthesizer();
    showToast(`✅ Pasted & Optimized image into ${slotLabel}!`);
  } catch (err) {
    console.error(err);
    showToast(`❌ Failed to process pasted image: ${err}`);
  }
}

// Global Paste Event Listener (Ctrl + V Image Support)
window.addEventListener("paste", async (e) => {
  const items = e.clipboardData?.items;
  if (!items || items.length === 0) return;

  // Check if clipboard contains an image item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (file) {
        // Prevent default only when handling image pasting
        e.preventDefault();
        e.stopPropagation();

        // Target Resolution:
        // 1. Mouse currently hovering over P0 or a specific swatch row
        // 2. Active target slot if selected
        // 3. Fallback: P0 if on global view, or P1 (idx 0) if on CMF view
        let targetSlot = lastHoveredImageSlot;
        
        if (targetSlot === null || targetSlot === undefined) {
          const hoveredElement = document.querySelector(":hover");
          const hoveredP0 = hoveredElement?.closest("#permanent-floor-card, #p0-img-box-wrapper, #p0-img-box");
          const hoveredSwatchRow = hoveredElement?.closest(".cmf-row");
          
          if (hoveredP0) {
            targetSlot = "P0";
          } else if (hoveredSwatchRow) {
            const rowId = hoveredSwatchRow.id || "";
            const match = rowId.match(/cmf-row-(\d+)/);
            if (match) {
              targetSlot = parseInt(match[1], 10);
            }
          }
        }

        if (targetSlot === null || targetSlot === undefined) {
          targetSlot = activeImageTargetSlot || (currentMainTab === "global" ? "P0" : 0);
        }

        await applyImageFileToSlot(targetSlot, file);
        return;
      }
    }
  }
});

// Global Drag & Drop Support for ComfyUI Workflow JSON, Presets, or Direct Reference Images
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

window.addEventListener("drop", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    
    // 1. JSON Workflow / Preset File Drop
    if (file.name.endsWith(".json")) {
      handlePresetFileImport({ target: { files: [file] } });
      return;
    }
    
    // 2. Image File Drop onto hovered slot or target
    if (file.type.startsWith("image/")) {
      const hoveredElement = document.querySelector(":hover");
      const hoveredP0 = hoveredElement?.closest("#permanent-floor-card, #p0-img-box-wrapper, #p0-img-box");
      const hoveredSwatchRow = hoveredElement?.closest(".cmf-row");
      
      let targetSlot = "P0";
      if (hoveredSwatchRow) {
        const rowId = hoveredSwatchRow.id || "";
        const match = rowId.match(/cmf-row-(\d+)/);
        if (match) targetSlot = parseInt(match[1], 10);
      } else if (!hoveredP0 && currentMainTab === "cmf") {
        targetSlot = 0;
      }
      
      await applyImageFileToSlot(targetSlot, file);
    }
  }
});

// Setup Mouse Hover Tracking for Image Slots
document.addEventListener("mouseover", (e) => {
  const p0Box = e.target.closest("#permanent-floor-card, #p0-img-box-wrapper, #p0-img-box");
  if (p0Box) {
    lastHoveredImageSlot = "P0";
    return;
  }
  const swatchRow = e.target.closest(".cmf-row");
  if (swatchRow) {
    const match = swatchRow.id?.match(/cmf-row-(\d+)/);
    if (match) {
      lastHoveredImageSlot = parseInt(match[1], 10);
      return;
    }
  }
  lastHoveredImageSlot = null;
});

