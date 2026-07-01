import * as THREE from 'three';
import { scene } from './core/Scene.js';
import { camera } from './core/Camera.js';
import { renderer } from './core/Renderer.js';
import { setupLights } from './core/Lights.js';
import { createControls } from './core/Controls.js';
import { createFloor } from './objects/Floor.js';
import { createFrame } from './objects/Frame.js';
import { createPendulums } from './objects/PendulumFactory.js';
import { setupUI } from './ui/UIController.js';
import { UIElements as UI } from './ui/UIElements.js';
import { settings } from './config/SimulationConfig.js';
import { FIXED_DT, BALL_COUNT, PIVOT_Y } from './physics/Constants.js';
import { updatePendulumPhysics, updatePendulumTransform, solveCollisions } from './physics/PhysicsEngine.js';

export function initApp() {
    setupLights(scene);
    const controls = createControls(camera, renderer.domElement);
    scene.add(createFloor());
    scene.add(createFrame());

    const pendulums = createPendulums(scene);

    setupUI(pendulums);

    const clock = new THREE.Clock();
    let accumulator = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane();
    const intersectionPoint = new THREE.Vector3();
    let isDragging = false;
    let selectedPendulums = [];

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta() * 1.5;
        accumulator += delta;

        while (accumulator >= FIXED_DT) {
            for (const p of pendulums) {
                if (isDragging && selectedPendulums.includes(p)) {
                    p.angularVelocity = 0;
                    p.angularVelocityZ = 0;
                } else {
                    updatePendulumPhysics(p);
                }
            }
            for (const p of pendulums) {
                updatePendulumTransform(p);
            }
            solveCollisions(pendulums);
            accumulator -= FIXED_DT;
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.launch-panel') || event.target.closest('#controlPanel') || event.target.closest('#control-panel')) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const hits = raycaster.intersectObjects(pendulums.map(p => p.ball));
        if (hits.length === 0) return;

        isDragging = true;
        controls.enabled = false;

        const clickedBall = hits[0].object;
        const clickedIdx = pendulums.findIndex(p => p.ball === clickedBall);
        const launchCount = parseInt(UI.launchCountInput?.value || '1');
        selectedPendulums = [];

        if (clickedIdx < BALL_COUNT / 2) {
            for (let i = 0; i < launchCount; i++) {
                if (pendulums[i]) selectedPendulums.push(pendulums[i]);
            }
        } else {
            for (let i = 0; i < launchCount; i++) {
                const idx = BALL_COUNT - 1 - i;
                if (pendulums[idx]) selectedPendulums.push(pendulums[idx]);
            }
        }

        const refBall = selectedPendulums[0];
        if (settings.enableZDrag) {
            dragPlane.setFromNormalAndCoplanarPoint(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, PIVOT_Y - refBall.individualLength, 0)
            );
        } else {
            dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        }
    });

    window.addEventListener('pointermove', (event) => {
        if (!isDragging || selectedPendulums.length === 0) return;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
            const referencePendulum = selectedPendulums[0];
            const maxAngleRad = THREE.MathUtils.degToRad(80);

            if (settings.enableZDrag) {
                const dx = intersectionPoint.x - referencePendulum.pivotX;
                const dz = intersectionPoint.z;
                const dy = referencePendulum.individualLength;

                let targetAngleX = Math.atan2(dx, dy);
                let targetAngleZ = Math.atan2(dz, dy);
                targetAngleX = THREE.MathUtils.clamp(targetAngleX, -maxAngleRad, maxAngleRad);
                targetAngleZ = THREE.MathUtils.clamp(targetAngleZ, -maxAngleRad, maxAngleRad);

                selectedPendulums.forEach(p => {
                    p.angle = targetAngleX;
                    p.angleZ = targetAngleZ;
                    p.angularVelocity = 0;
                    p.angularVelocityZ = 0;
                    updatePendulumTransform(p);
                });

                if (UI.launchAngleInput && UI.launchAngleValue) {
                    const angleInDegreesX = Math.abs(THREE.MathUtils.radToDeg(targetAngleX));
                    UI.launchAngleInput.value = angleInDegreesX.toFixed(0);
                    UI.launchAngleValue.textContent = angleInDegreesX.toFixed(0);
                }
                if (UI.launchAngleZInput && UI.launchAngleZValue) {
                    const angleInDegreesZ = Math.abs(THREE.MathUtils.radToDeg(targetAngleZ));
                    UI.launchAngleZInput.value = angleInDegreesZ.toFixed(0);
                    UI.launchAngleZValue.textContent = angleInDegreesZ.toFixed(0) + '°';
                }
            } else {
                const dx = intersectionPoint.x - referencePendulum.pivotX;
                const dy = intersectionPoint.y - PIVOT_Y;
                let targetAngleX = Math.atan2(dx, -dy);
                targetAngleX = THREE.MathUtils.clamp(targetAngleX, -maxAngleRad, maxAngleRad);

                selectedPendulums.forEach(p => {
                    p.angle = targetAngleX;
                    p.angularVelocity = 0;
                    updatePendulumTransform(p);
                });

                if (UI.launchAngleInput && UI.launchAngleValue) {
                    const angleInDegrees = Math.abs(THREE.MathUtils.radToDeg(targetAngleX));
                    UI.launchAngleInput.value = angleInDegrees.toFixed(0);
                    UI.launchAngleValue.textContent = angleInDegrees.toFixed(0);
                }
            }
        }
    });

    window.addEventListener('pointerup', () => {
        if (isDragging) {
            isDragging = false;
            controls.enabled = true;
            selectedPendulums.forEach(p => {
                p.angularVelocity = 0;
                p.angularVelocityZ = 0;
            });
            selectedPendulums = [];
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}