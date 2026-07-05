import { UIElements as UI } from './UIElements.js';
import { pendingBallsSettings } from '../config/SimulationConfig.js';

export function initPendulumPanel(controlModeRef, updateSlidersCallback, saveRestitutionCallback) {
    
    UI.allBallsModeBtn.addEventListener('click', () => {
        controlModeRef.value = 'all';
        UI.allBallsModeBtn.classList.add('active');
        UI.singleBallModeBtn.classList.remove('active');
        UI.ballSelectGroup.style.opacity = '0.5';
        UI.ballSelectGroup.style.pointerEvents = 'none';
    });

    UI.singleBallModeBtn.addEventListener('click', () => {
        controlModeRef.value = 'single';
        UI.singleBallModeBtn.classList.add('active');
        UI.allBallsModeBtn.classList.remove('active');
        UI.ballSelectGroup.style.opacity = '1';
        UI.ballSelectGroup.style.pointerEvents = 'auto';
        updateSlidersCallback();
    });

    UI.ballSelect.addEventListener('change', updateSlidersCallback);

    UI.lengthInput.addEventListener('input', () => {
        const val = parseFloat(UI.lengthInput.value);
        UI.lengthValue.textContent = val.toFixed(1);
        if (controlModeRef.value === 'all') {
            pendingBallsSettings.forEach(b => b.stringLength = val);
        } else {
            const selectedIdx = parseInt(UI.ballSelect.value);
            pendingBallsSettings[selectedIdx].stringLength = val;
        }
    });

    UI.massInput.addEventListener('input', () => {
        const val = parseFloat(UI.massInput.value);
        UI.massValue.textContent = val.toFixed(1);
        if (controlModeRef.value === 'all') {
            pendingBallsSettings.forEach(b => b.mass = val);
        } else {
            const selectedIdx = parseInt(UI.ballSelect.value);
            pendingBallsSettings[selectedIdx].mass = val;
        }
    });

    UI.wireSelect.addEventListener('change', () => {
        const val = parseInt(UI.wireSelect.value);
        if (controlModeRef.value === 'all') {
            pendingBallsSettings.forEach(b => b.wireCount = val);
        } else {
            const selectedIdx = parseInt(UI.ballSelect.value);
            pendingBallsSettings[selectedIdx].wireCount = val;
        }
    });

    UI.ropeTypeSelect?.addEventListener('change', () => {
        const val = UI.ropeTypeSelect.value;
        if (controlModeRef.value === 'all') {
            pendingBallsSettings.forEach(b => b.ropeType = val);
        } else {
            const selectedIdx = parseInt(UI.ballSelect.value);
            pendingBallsSettings[selectedIdx].ropeType = val;
        }
    });

    UI.restitutionInput.addEventListener('input', () => {
        const val = parseFloat(UI.restitutionInput.value);
        UI.restitutionValue.textContent = val.toFixed(3);
        saveRestitutionCallback(val);
    });

    UI.materialSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            UI.customRestitutionGroup.style.display = 'block';
            const val = parseFloat(UI.restitutionInput.value);
            saveRestitutionCallback(val);
        } else {
            UI.customRestitutionGroup.style.display = 'none';
            const val = parseFloat(e.target.value);
            UI.restitutionInput.value = val;
            UI.restitutionValue.textContent = val.toFixed(2);
            saveRestitutionCallback(val);
        }
    });
}