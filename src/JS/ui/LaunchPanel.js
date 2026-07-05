import * as THREE from 'three';
import { UIElements as UI } from './UIElements.js';
import { settings } from '../config/SimulationConfig.js';

export function initLaunchPanel() {
    const setInteractionMode = (mode) => {
        settings.interactionMode = mode;
        if (UI.customModeBtn) UI.customModeBtn.classList.toggle('active', mode === 'custom');
        if (UI.singleSideBtn) UI.singleSideBtn.classList.toggle('active', mode !== 'custom' && settings.launchMode === 'single');
        if (UI.doubleSideBtn) UI.doubleSideBtn.classList.toggle('active', mode !== 'custom' && settings.launchMode === 'double');
    };

    UI.launchCountInput?.addEventListener('input', () => {
        settings.launchCount = parseInt(UI.launchCountInput.value);
        UI.launchCountValue.textContent = settings.launchCount;
    });

    UI.launchAngleInput?.addEventListener('input', () => {
        const degrees = parseFloat(UI.launchAngleInput.value);
        settings.launchAngle = THREE.MathUtils.degToRad(degrees);
        UI.launchAngleValue.textContent = degrees.toFixed(0);
    });

    UI.launchAngleZInput?.addEventListener('input', (event) => {
        const degrees = parseFloat(event.target.value);
        settings.launchAngleZ = THREE.MathUtils.degToRad(degrees);
        if (UI.launchAngleZValue) {
            UI.launchAngleZValue.textContent = degrees.toFixed(0) + '°';
        }
    });

    UI.enableZDrag?.addEventListener('change', () => {
        settings.enableZDrag = UI.enableZDrag.checked;
    });

    UI.singleSideBtn?.addEventListener('click', () => {
        UI.singleSideBtn.classList.add('active');
        UI.doubleSideBtn.classList.remove('active');
        UI.customModeBtn?.classList.remove('active');
        settings.launchMode = 'single';
        settings.interactionMode = 'group';
    });

    UI.doubleSideBtn?.addEventListener('click', () => {
        UI.doubleSideBtn.classList.add('active');
        UI.singleSideBtn.classList.remove('active');
        UI.customModeBtn?.classList.remove('active');
        settings.launchMode = 'double';
        settings.interactionMode = 'group';
    });

    UI.customModeBtn?.addEventListener('click', () => {
        UI.customModeBtn.classList.add('active');
        UI.singleSideBtn?.classList.remove('active');
        UI.doubleSideBtn?.classList.remove('active');
        setInteractionMode('custom');
    });

    UI.soundToggle?.addEventListener('change', () => {
        settings.sound = UI.soundToggle.checked;
    });
}