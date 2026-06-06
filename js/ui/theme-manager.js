import { state } from '../store/state.js';

// Curated & Locked UI Themes
export const themes = [
    { id: "terax", name: "Terax", desc: "The default Terax look — clean glass on pure dark.", colors: { bg: '#09090B', panel: '#0F0F13', border: '#27272A', text: '#FAFAFA', textMuted: '#A1A1AA', accent: '#FFFFFF', accentGlow: 'rgba(255,255,255,0.3)', gridPri: '#FB923C', gridSec: '#C084FC' } },
    { id: "tide", name: "Tide", desc: "Deep slate with muted teal.", colors: { bg: '#0B0F12', panel: '#10151A', border: '#1E2732', text: '#E6E6E6', textMuted: '#708291', accent: '#5E8B8B', accentGlow: 'rgba(94,139,139,0.3)', gridPri: '#5E8B8B', gridSec: '#826859' } },
    { id: "rose", name: "Rosé Pine", desc: "Deepened soho vibes, natural pine and rose.", colors: { bg: '#0A0811', panel: '#120F1C', border: '#1E1A2E', text: '#E0DEF4', textMuted: '#908CAA', accent: '#EBBCBA', accentGlow: 'rgba(235,188,186,0.3)', gridPri: '#FB923C', gridSec: '#C084FC' } },
    { id: "sage", name: "Sage", desc: "Muted forest green — calm and soft.", colors: { bg: '#0C120E', panel: '#111813', border: '#1E2922', text: '#E0E6E2', textMuted: '#89998F', accent: '#8B9E77', accentGlow: 'rgba(139,158,119,0.3)', gridPri: '#8B9E77', gridSec: '#6F8091' } },
    { id: "caffeine", name: "Caffeine", desc: "Warm coffee tones — cream and espresso.", colors: { bg: '#14100E', panel: '#1A1513', border: '#2B221E', text: '#E8DCD1', textMuted: '#A69285', accent: '#D4A373', accentGlow: 'rgba(212,163,115,0.3)', gridPri: '#D4A373', gridSec: '#8A6F62' } },
    { id: "gradient", name: "Gradient", desc: "Original app theme, deep obsidian and vivid accents.", colors: { bg: '#0d0f26', panel: 'rgba(40, 22, 66, 0.3)', border: 'rgba(128, 137, 255, 0.3)', text: '#e0e4ff', textMuted: '#a0a8d8', accent: '#a78bfa', accentGlow: 'rgba(160, 170, 255, 0.7)', gridPri: '#FB923C', gridSec: '#C084FC' } }
];

// Domain Phase Palettes logically mapped (Base -> Mid -> Peak -> Mid -> Base) for smooth 2PI wrap
export const domainPalettes = [
    {
        id: "analytic-base",
        name: "Analytic Base",
        colors: "hsl(0,70%,40%), hsl(60,70%,35%), hsl(120,70%,35%), hsl(180,70%,35%), hsl(240,70%,45%), hsl(300,70%,40%), hsl(360,70%,40%)",
        key: [
            { label: "Red", color: "hsl(0,70%,40%)", angle: "0° (Positive Real)" },
            { label: "Green", color: "hsl(120,70%,35%)", angle: "90° (Positive Imaginary)" },
            { label: "Cyan", color: "hsl(180,70%,35%)", angle: "180° (Negative Real)" },
            { label: "Blue", color: "hsl(240,70%,45%)", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "calming",
        name: "Calming",
        colors: "#d9c5c1, #c48b80, #ca9385, #ebdcd2, #9b7169, #956a63, #d9c5c1",
        key: [
            { label: "Cream", color: "#ebdcd2", angle: "0° (Positive Real)" },
            { label: "Caramel", color: "#733c34", angle: "90° (Positive Imaginary)" },
            { label: "Mahogany", color: "#d9c5c1", angle: "180° (Negative Real)" },
            { label: "Copper", color: "#b96e5f", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "purple",
        name: "Purple / Violet",
        colors: "#c3b5db, #8a6bc8, #9371d4, #dcc8ff, #b399ff, #aa93f3, #c3b5db",
        key: [
            { label: "Lavender", color: "#dcc8ff", angle: "0° (Positive Real)" },
            { label: "Indigo", color: "#9e82ff", angle: "90° (Positive Imaginary)" },
            { label: "Charcoal", color: "#c3b5db", angle: "180° (Negative Real)" },
            { label: "Violet", color: "#6e46be", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "green",
        name: "Green / Jade / Lime",
        colors: "#9bbda7, #3e8f77, #4da289, #c8f5dc, #b7f250, #a8df3e, #9bbda7",
        key: [
            { label: "Mint", color: "#c8f5dc", angle: "0° (Positive Real)" },
            { label: "Lime", color: "#aff00a", angle: "90° (Positive Imaginary)" },
            { label: "Forest", color: "#9bbda7", angle: "180° (Negative Real)" },
            { label: "Jade", color: "#0f785f", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "ocean-depth",
        name: "Ocean Depth",
        colors: "#0f172a, #0369a1, #0ea5e9, #38bdf8, #0ea5e9, #0369a1, #0f172a",
        key: [
            { label: "Dark Blue", color: "#0f172a", angle: "0° (Positive Real)" },
            { label: "Medium Teal", color: "#0369a1", angle: "90° (Positive Imaginary)" },
            { label: "Sky Blue", color: "#38bdf8", angle: "180° (Negative Real)" },
            { label: "Teal Blue", color: "#0ea5e9", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "midnight-flare",
        name: "Midnight Flare",
        colors: "#1e1b4b, #581c87, #9333ea, #e11d48, #9333ea, #581c87, #1e1b4b",
        key: [
            { label: "Deep Violet", color: "#1e1b4b", angle: "0° (Positive Real)" },
            { label: "Royal Purple", color: "#581c87", angle: "90° (Positive Imaginary)" },
            { label: "Rose Red", color: "#e11d48", angle: "180° (Negative Real)" },
            { label: "Vivid Purple", color: "#9333ea", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "forest-moss",
        name: "Forest Moss",
        colors: "#064e3b, #047857, #10b981, #34d399, #10b981, #047857, #064e3b",
        key: [
            { label: "Dark Forest", color: "#064e3b", angle: "0° (Positive Real)" },
            { label: "Emerald", color: "#047857", angle: "90° (Positive Imaginary)" },
            { label: "Mint Green", color: "#34d399", angle: "180° (Negative Real)" },
            { label: "Bright Green", color: "#10b981", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "arctic-frost",
        name: "Arctic Frost",
        colors: "#0f172a, #1e293b, #3b82f6, #93c5fd, #3b82f6, #1e293b, #0f172a",
        key: [
            { label: "Deep Slate", color: "#0f172a", angle: "0° (Positive Real)" },
            { label: "Steel Blue", color: "#1e293b", angle: "90° (Positive Imaginary)" },
            { label: "Ice Blue", color: "#93c5fd", angle: "180° (Negative Real)" },
            { label: "Frost Blue", color: "#3b82f6", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "nordic-twilight",
        name: "Nordic Twilight",
        colors: "#2e3440, #4c566a, #5e81ac, #b48ead, #5e81ac, #4c566a, #2e3440",
        key: [
            { label: "Nordic Dark", color: "#2e3440", angle: "0° (Positive Real)" },
            { label: "Slate Blue", color: "#4c566a", angle: "90° (Positive Imaginary)" },
            { label: "Pale Rose", color: "#b48ead", angle: "180° (Negative Real)" },
            { label: "Glacier Blue", color: "#5e81ac", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "lavender-ash",
        name: "Lavender Ash",
        colors: "#1a1025, #2e233c, #7e57c2, #b39ddb, #7e57c2, #2e233c, #1a1025",
        key: [
            { label: "Dark Plum", color: "#1a1025", angle: "0° (Positive Real)" },
            { label: "Muted Violet", color: "#2e233c", angle: "90° (Positive Imaginary)" },
            { label: "Pale Lavender", color: "#b39ddb", angle: "180° (Negative Real)" },
            { label: "Bright Violet", color: "#7e57c2", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "monochrome-topo",
        name: "Monochrome Topo",
        colors: "#0a0a0a, #262626, #525252, #737373, #525252, #262626, #0a0a0a",
        key: [
            { label: "Black", color: "#0a0a0a", angle: "0° (Positive Real)" },
            { label: "Dark Gray", color: "#262626", angle: "90° (Positive Imaginary)" },
            { label: "Light Gray", color: "#737373", angle: "180° (Negative Real)" },
            { label: "Medium Gray", color: "#525252", angle: "-90° (Negative Imaginary)" }
        ]
    },
    {
        id: "rose-gold",
        name: "Rose Gold",
        colors: "#1c1917, #78350f, #e11d48, #fda4af, #e11d48, #78350f, #1c1917",
        key: [
            { label: "Dark Stone", color: "#1c1917", angle: "0° (Positive Real)" },
            { label: "Amber Brown", color: "#78350f", angle: "90° (Positive Imaginary)" },
            { label: "Rose Pink", color: "#fda4af", angle: "180° (Negative Real)" },
            { label: "Sunset Rose", color: "#e11d48", angle: "-90° (Negative Imaginary)" }
        ]
    }
];

const hexToRgbStr = hex => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
};

export function applyTheme(themeId) {
    const theme = themes.find(t => t.id === themeId) || themes[0];
    const root = document.documentElement;
    root.style.setProperty('--bg-color', theme.colors.bg);
    root.style.setProperty('--bg-color-rgb', hexToRgbStr(theme.colors.bg));
    root.style.setProperty('--card-bg-color', theme.colors.panel);
    root.style.setProperty('--border-color', theme.colors.border);
    root.style.setProperty('--text-color', theme.colors.text);
    root.style.setProperty('--text-secondary-color', theme.colors.textMuted);
    root.style.setProperty('--accent-purple', theme.colors.accent);
    root.style.setProperty('--accent-purple-dark', theme.colors.accent);
    root.style.setProperty('--glow-color', theme.colors.accentGlow);
    root.style.setProperty('--accent-pink', theme.colors.gridSec);

    state.gridColor1 = theme.colors.gridPri;
    state.gridColor2 = theme.colors.gridSec;

    // Update the color inputs to reflect the new grid colors
    const grid1Input = document.getElementById('grid_color_1_input');
    const grid2Input = document.getElementById('grid_color_2_input');
    if (grid1Input) {
        grid1Input.value = state.gridColor1;
        const wrapper = document.getElementById('grid_color_1_picker_wrapper');
        if (wrapper) wrapper.style.backgroundColor = state.gridColor1;
    }
    if (grid2Input) {
        grid2Input.value = state.gridColor2;
        const wrapper = document.getElementById('grid_color_2_picker_wrapper');
        if (wrapper) wrapper.style.backgroundColor = state.gridColor2;
    }
}

export function renderThemesList(container) {
    if (!container) return;
    container.innerHTML = themes.map(theme => {
        const isActive = state.themeId === theme.id;
        const previewDots = [theme.colors.accent, theme.colors.gridPri, theme.colors.gridSec];
        return `
            <button class="theme-card ${isActive ? 'active' : ''}" data-theme-id="${theme.id}" type="button">
                <div class="theme-preview-pill">
                    ${previewDots.map(c => `<div class="theme-preview-dot" style="background-color: ${c};"></div>`).join('')}
                </div>
                <div class="theme-info">
                    <h3>${theme.name}</h3>
                    <p>${theme.desc}</p>
                </div>
            </button>
        `;
    }).join('');
}

export function renderDomainPalettesUI(container) {
    if (!container) return;
    container.innerHTML = domainPalettes.map((p) => {
        const isActive = state.domainPalette === p.id;
        return `
            <button class="domain-palette-circle-btn ${isActive ? 'active' : ''}" 
                data-palette-id="${p.id}" 
                type="button"
                style="background: conic-gradient(${p.colors});"
                title="${p.name}">
            </button>
        `;
    }).join('');

    const labelSpan = document.getElementById('active_domain_palette_name');
    if (labelSpan) {
        const activePalette = domainPalettes.find(p => p.id === state.domainPalette) || domainPalettes[0];
        labelSpan.textContent = activePalette.name;
    }
}
