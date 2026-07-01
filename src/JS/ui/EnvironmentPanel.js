import { UIElements as UI } from './UIElements.js';
import { settings } from '../config/SimulationConfig.js';

export function initEnvironmentPanel(checkPresetMatchCallback) {
    const planetPresets = {
        earth: { gravity: 9.81, damping: 0.0006 },
        moon: { gravity: 1.62, damping: 0.0000 },
        mars: { gravity: 3.71, damping: 0.0001 },
        jupiter: { gravity: 24.79, damping: 0.0150 },
        mercury: { gravity: 3.70, damping: 0.0000 },
        venus: { gravity: 8.87, damping: 0.0450 },
        saturn: { gravity: 10.44, damping: 0.0100 },
        uranus: { gravity: 8.69, damping: 0.0070 },
        neptune: { gravity: 11.15, damping: 0.0080 }
    };

    if (UI.gravityInput) {
        UI.gravityInput.addEventListener('input', () => {
            UI.gravityValue.textContent = parseFloat(UI.gravityInput.value).toFixed(2);
            checkPresetMatchCallback(planetPresets);
        });
    }

    if (UI.dampingInput) {
        UI.dampingInput.addEventListener('input', () => {
            UI.dampingValue.textContent = parseFloat(UI.dampingInput.value).toFixed(4);
            checkPresetMatchCallback(planetPresets);
        });
    }

    if (UI.planetSelect) {
        UI.planetSelect.addEventListener('change', () => {
            const planet = UI.planetSelect.value;
            if (planet !== 'custom' && planetPresets[planet]) {
                const preset = planetPresets[planet];
                UI.gravityInput.value = preset.gravity;
                UI.gravityValue.textContent = preset.gravity.toFixed(2);
                UI.dampingInput.value = preset.damping;
                UI.dampingValue.textContent = preset.damping.toFixed(4);
            }
        });
    }
}