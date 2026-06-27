import { state } from '../store/state.js';
import { domainPalettes } from '../constants/domain-palettes.js';

export { domainPalettes };

// Curated & Locked UI Themes
export const themes = [
    { id: "terax", name: "Terax", desc: "The default Terax look — clean glass on pure dark.", colors: { bg: '#09090B', panel: '#0F0F13', border: '#27272A', text: '#FAFAFA', textMuted: '#A1A1AA', accent: '#FFFFFF', accentGlow: 'rgba(255,255,255,0.3)', gridPri: '#FB923C', gridSec: '#C084FC' } },
    { id: "tide", name: "Tide", desc: "Deep slate with muted teal.", colors: { bg: '#0B0F12', panel: '#10151A', border: '#1E2732', text: '#E6E6E6', textMuted: '#708291', accent: '#5E8B8B', accentGlow: 'rgba(94,139,139,0.3)', gridPri: '#5E8B8B', gridSec: '#826859' } },
    { id: "rose", name: "Rosé Pine", desc: "Deepened soho vibes, natural pine and rose.", colors: { bg: '#000000', panel: '#070707', border: '#1E1A2E', text: '#E0DEF4', textMuted: '#908CAA', accent: '#EBBCBA', accentGlow: 'rgba(235,188,186,0.3)', gridPri: '#FB923C', gridSec: '#C084FC' } },
    { id: "sage", name: "Sage", desc: "Muted forest green — calm and soft.", colors: { bg: '#0C120E', panel: '#111813', border: '#1E2922', text: '#E0E6E2', textMuted: '#89998F', accent: '#8B9E77', accentGlow: 'rgba(139,158,119,0.3)', gridPri: '#8B9E77', gridSec: '#6F8091' } },
    { id: "caffeine", name: "Caffeine", desc: "Warm coffee tones — cream and espresso.", colors: { bg: '#14100E', panel: '#1A1513', border: '#2B221E', text: '#E8DCD1', textMuted: '#A69285', accent: '#D4A373', accentGlow: 'rgba(212,163,115,0.3)', gridPri: '#D4A373', gridSec: '#8A6F62' } },
    { id: "gradient", name: "Gradient", desc: "Original app theme, deep obsidian and vivid accents.", colors: { bg: '#0d0f26', panel: 'rgba(40, 22, 66, 0.3)', border: 'rgba(128, 137, 255, 0.3)', text: '#e0e4ff', textMuted: '#a0a8d8', accent: '#a78bfa', accentGlow: 'rgba(160, 170, 255, 0.7)', gridPri: '#FB923C', gridSec: '#C084FC' } }
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

// 3D Real Plots Palettes mapped for linear/conic gradient
export const realPlotsPalettes = [
    {
        id: "sunset",
        name: "Sunset Glow",
        colors: "#1a0b36, #880e4f, #ff5722, #ffeb3b"
    },
    {
        id: "ocean",
        name: "Ocean Breeze",
        colors: "#004d40, #00acc1, #80cbc4"
    },
    {
        id: "cyberpunk",
        name: "Cyberpunk Glow",
        colors: "#4a148c, #d81b60, #00e5ff"
    },
    {
        id: "copper",
        name: "Classic Copper",
        colors: "#3e2723, #d84315, #ffe0b2"
    },
    {
        id: "forest",
        name: "Forest Mist",
        colors: "#0e3a14, #2e7d32, #a5d6a7, #fff9c4"
    },
    {
        id: "viridis",
        name: "Viridis Scientific",
        colors: "#440154, #3b528b, #21908d, #5dc963, #fde725"
    }
];

export function renderRealPlotsPalettesUI(container) {
    if (!container) return;
    container.innerHTML = realPlotsPalettes.map((p) => {
        const isActive = state.realPlotsPalette === p.id;
        return `
            <button class="domain-palette-circle-btn ${isActive ? 'active' : ''}" 
                data-palette-id="${p.id}" 
                type="button"
                style="background: conic-gradient(from 270deg, ${p.colors});"
                title="${p.name}">
            </button>
        `;
    }).join('');
}
