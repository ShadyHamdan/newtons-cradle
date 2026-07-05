import * as THREE from 'three';
import { UIElements as UI } from './UIElements.js';
import { settings, pendingBallsSettings } from '../config/SimulationConfig.js';
import { visualMaterials } from '../objects/Materials.js';
import { applyLaunchConfiguration, resetPhysicsSimulation } from '../physics/LaunchManager.js';

import { initEnvironmentPanel } from './EnvironmentPanel.js';
import { initPendulumPanel } from './PendulumPanel.js';
import { initLaunchPanel } from './LaunchPanel.js';

export function setupUI(pendulums) {
    let controlModeRef = { value: 'all' };

    initEnvironmentPanel((planetPresets) => {
        const currentG = parseFloat(UI.gravityInput.value);
        const currentD = parseFloat(UI.dampingInput.value);
        const matchingPlanet = Object.keys(planetPresets).find(key => {
            const preset = planetPresets[key];
            return Math.abs(preset.gravity - currentG) < 0.01 && Math.abs(preset.damping - currentD) < 0.0001;
        });
        if (UI.planetSelect) UI.planetSelect.value = matchingPlanet || 'custom';
    });

    initPendulumPanel(
        controlModeRef,
        () => {
            const selectedIdx = parseInt(UI.ballSelect.value);
            const currentBallSettings = pendingBallsSettings[selectedIdx];
            UI.lengthInput.value = currentBallSettings.stringLength;
            UI.lengthValue.textContent = currentBallSettings.stringLength.toFixed(1);
            UI.massInput.value = currentBallSettings.mass;
            UI.massValue.textContent = currentBallSettings.mass.toFixed(1);
            UI.wireSelect.value = currentBallSettings.wireCount;

            const ballRestitution = currentBallSettings.restitution ?? 0.98;
            const formattedRestitution = ballRestitution.toFixed(2);
            if (["0.98", "0.92", "0.80", "0.50"].includes(formattedRestitution)) {
                UI.materialSelect.value = formattedRestitution;
                UI.customRestitutionGroup.style.display = 'none';
            } else {
                UI.materialSelect.value = 'custom';
                UI.customRestitutionGroup.style.display = 'block';
                UI.restitutionInput.value = ballRestitution;
                UI.restitutionValue.textContent = ballRestitution.toFixed(3);
            }
        },
        (val) => {
            if (controlModeRef.value === 'all') {
                pendingBallsSettings.forEach(b => b.restitution = val);
            } else {
                const selectedIdx = parseInt(UI.ballSelect.value);
                pendingBallsSettings[selectedIdx].restitution = val;
            }
        }
    );

    initLaunchPanel();

    UI.applyBtn.addEventListener('click', () => {
        settings.gravity = parseFloat(UI.gravityInput.value);
        settings.airDamping = 1.0 - parseFloat(UI.dampingInput.value);
        settings.restitution = parseFloat(UI.restitutionInput.value);
        settings.launchCount = parseInt(UI.launchCountInput.value);
        settings.launchAngle = THREE.MathUtils.degToRad(parseFloat(UI.launchAngleInput.value));
        if (UI.customModeBtn?.classList.contains('active')) {
            settings.interactionMode = 'custom';
        } else {
            settings.launchMode = UI.singleSideBtn.classList.contains('active') ? 'single' : 'double';
            settings.interactionMode = 'group';
        }
        settings.sound = UI.soundToggle.checked;

// 🆕 نتحقق أولًا: هل كل الكرات من نفس المادة (نفس restitution)؟
        const allSameMaterial = pendingBallsSettings.every(
            b => (b.restitution ?? 0.98) === (pendingBallsSettings[0].restitution ?? 0.98)
        );

        pendulums.forEach((p, index) => {
            const ballSettings = pendingBallsSettings[index];
            p.individualLength = ballSettings.stringLength;
            p.individualMass = ballSettings.mass;
            p.individualRestitution = ballSettings.restitution ?? 0.98;
            p.wireCount = ballSettings.wireCount;
            p.ball.position.y = -ballSettings.stringLength;

            if (typeof p.updateMaterial === 'function') {
                p.updateMaterial(ballSettings.restitution);
            } else {
                const currentRest = ballSettings.restitution;
                p.ball.material = visualMaterials[currentRest] ? visualMaterials[currentRest] : visualMaterials['custom'];
            }

            // 🆕 الحجم يتغير بالكتلة فقط إذا كل الكرات من نفس المادة، وإلا يبقى طبيعيًا
            if (typeof p.updateBallSize === 'function') {
                if (allSameMaterial) {
                    p.updateBallSize(ballSettings.mass);
                } else {
                    p.updateBallSize(1.0); // إرجاع الحجم الطبيعي لو فيه اختلاف بالمواد
                }
            }
        });

        applyLaunchConfiguration(pendulums);
    });

    UI.resetBtn.addEventListener('click', () => {
        if (UI.launchCountInput) UI.launchCountInput.value = 1;
        if (UI.launchCountValue) UI.launchCountValue.textContent = '1';
        if (UI.launchAngleInput) UI.launchAngleInput.value = 45;
        if (UI.launchAngleValue) UI.launchAngleValue.textContent = '45';
        if (UI.launchAngleZInput) UI.launchAngleZInput.value = 0;
        if (UI.launchAngleZValue) UI.launchAngleZValue.textContent = '0°';
        if (UI.enableZDrag) UI.enableZDrag.checked = false;

        if (UI.singleSideBtn) UI.singleSideBtn.classList.add('active');
        if (UI.doubleSideBtn) UI.doubleSideBtn.classList.remove('active');
        if (UI.customModeBtn) UI.customModeBtn.classList.remove('active');
        if (UI.planetSelect) UI.planetSelect.value = 'earth';
        if (UI.gravityInput) UI.gravityInput.value = 9.81;
        if (UI.gravityValue) UI.gravityValue.textContent = '9.81';
        if (UI.dampingInput) UI.dampingInput.value = 0.0006;
        if (UI.dampingValue) UI.dampingValue.textContent = '0.0006';

        if (UI.materialSelect) UI.materialSelect.value = '0.98';
        if (UI.customRestitutionGroup) UI.customRestitutionGroup.style.display = 'none';
        if (UI.restitutionInput) UI.restitutionInput.value = 0.98;
        if (UI.restitutionValue) UI.restitutionValue.textContent = '0.980';

        pendingBallsSettings.forEach(b => {
            b.stringLength = 5.0;
            b.mass = 1.0;
            b.wireCount = 2;
            b.restitution = 0.98;
        });

        if (UI.allBallsModeBtn) UI.allBallsModeBtn.classList.add('active');
        if (UI.singleBallModeBtn) UI.singleBallModeBtn.classList.remove('active');
        if (UI.ballSelectGroup) {
            UI.ballSelectGroup.style.opacity = '0.5';
            UI.ballSelectGroup.style.pointerEvents = 'none';
        }
        if (UI.ballSelect) UI.ballSelect.value = '0';
        if (UI.lengthInput) UI.lengthInput.value = 5;
        if (UI.lengthValue) UI.lengthValue.textContent = '5.0';
        if (UI.massInput) UI.massInput.value = 1;
        if (UI.massValue) UI.massValue.textContent = '1.0';
        if (UI.wireSelect) UI.wireSelect.value = '2';
        if (UI.soundToggle) UI.soundToggle.checked = true;

        settings.gravity = 9.81;
        settings.airDamping = 0.9994;
        settings.restitution = 0.98;
        settings.launchCount = 1;
        settings.launchAngle = THREE.MathUtils.degToRad(45);
        settings.launchAngleZ = 0;
        settings.launchMode = 'single';
        settings.interactionMode = 'group';
        settings.sound = true;
        settings.enableZDrag = false;

        pendulums.forEach(p => {
            p.wireCount = 2;
            p.ball.material = p.initialMaterial || visualMaterials[0.98];
       if (typeof p.updateBallSize === 'function') {
                p.updateBallSize(1.0);
            }
            if (typeof p.updateWires === 'function') {
                p.updateWires(p.individualLength, 1.4, p.wireCount);
            }
        });

        resetPhysicsSimulation(pendulums);
    });

    UI.launchBtn.addEventListener('click', () => {
        applyLaunchConfiguration(pendulums);
    });
}