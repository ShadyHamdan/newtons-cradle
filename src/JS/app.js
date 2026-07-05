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

// دالة مساعدة لحل قيود المسافات والروابط لعقد الحبال الفيزيائية
function solveRopeConstraints(rope) {
    if (!rope || !rope.constraints) return;

    const tmpVec = new THREE.Vector3();
    for (const c of rope.constraints) {
        if (!c.nodeA || !c.nodeB || !c.nodeA.position || !c.nodeB.position) continue;

        const posA = new THREE.Vector3(c.nodeA.position.x, c.nodeA.position.y, c.nodeA.position.z);
        const posB = new THREE.Vector3(c.nodeB.position.x, c.nodeB.position.y, c.nodeB.position.z);

        tmpVec.copy(posB).sub(posA);
        const currentLength = tmpVec.length();
        if (currentLength === 0) continue;

        const diff = c.length - currentLength;
        const invMassA = c.nodeA.isPinned || c.nodeA.isGrabbed ? 0 : 1.0 / c.nodeA.mass;
        const invMassB = c.nodeB.isPinned || c.nodeB.isGrabbed ? 0 : 1.0 / c.nodeB.mass;
        const sumInvMass = invMassA + invMassB;
        if (sumInvMass === 0) continue;

        const delta = diff / sumInvMass;
        tmpVec.normalize().multiplyScalar(delta);

        if (!c.nodeA.isPinned && !c.nodeA.isGrabbed) {
            c.nodeA.position.x -= tmpVec.x * invMassA;
            c.nodeA.position.y -= tmpVec.y * invMassA;
            c.nodeA.position.z -= tmpVec.z * invMassA;
        }
        if (!c.nodeB.isPinned && !c.nodeB.isGrabbed) {
            c.nodeB.position.x += tmpVec.x * invMassB;
            c.nodeB.position.y += tmpVec.y * invMassB;
            c.nodeB.position.z += tmpVec.z * invMassB;
        }
    }
}

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

    // إعدادات ضبط ثبات واستقامة حبال الـ Verlet البصرية
    const ROPE_ITERATIONS = 15;
    const ropeDamping = 0.95;
    const ropeGravity = { x: 0, y: 0, z: 0 };
    const ballWorldPos = new THREE.Vector3();

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta() * 1.5;
        accumulator += delta;

        while (accumulator >= FIXED_DT) {

            // 1. تحديث فيزياء الحبال المستقلة أولاً (الجاذبية ودمج قيود المسافات العادية)
            for (const p of pendulums) {
                const currentWireCount = p.wireCount ?? 2;

                // جلب مركز الكرة في الفضاء العالمي الحالي
                p.ball.getWorldPosition(ballWorldPos);

                p.ropesPhysics.forEach((rope, ropeIdx) => {
                    if (!rope || !rope.nodes) return;

                    // نقطة التثبيت الفعلية لهذا الإطار
                    const pinPoint = new THREE.Vector3(rope.startPoint.x, rope.startPoint.y, rope.startPoint.z);

                    // التحكم الذكي والآمن في الإظهار والإخفاء البصري للخيوط
                    if (currentWireCount === 1) {
                        if (ropeIdx === 1) {
                            if (p.ropesRender[1]?.ropeMesh) p.ropesRender[1].ropeMesh.visible = false;
                            return;
                        }
                        if (p.ropesRender[0]?.ropeMesh) p.ropesRender[0].ropeMesh.visible = true;
                        pinPoint.z = 0;
                    } else {
                        if (p.ropesRender[ropeIdx]?.ropeMesh) p.ropesRender[ropeIdx].ropeMesh.visible = true;
                    }

                    // حساب الطول المستهدف ديناميكياً بناءً على بُعد الكرة الحالي لتفادي الالتواء
                    const dir = new THREE.Vector3().subVectors(ballWorldPos, pinPoint).normalize();
                    const totalDist = new THREE.Vector3().subVectors(ballWorldPos, pinPoint).length();
                    const targetRopeLength = totalDist - 0.5; // التوقف الصارم عند قشرة الكرة

                    const surfacePoint = new THREE.Vector3()
                        .copy(pinPoint)
                        .addScaledVector(dir, targetRopeLength);

                    // استدعاء دالة التحديث الديناميكي للطول المتواجدة في ملف PhysicsRope
                    if (typeof rope.updateLength === 'function') {
                        rope.updateLength(targetRopeLength, pinPoint, surfacePoint);
                    } else {
                        if (rope.nodes[0] && rope.nodes[0].position) {
                            rope.nodes[0].position.copy(pinPoint);
                            rope.nodes[0].isPinned = true;
                        }
                        const endNode = rope.getEndNode();
                        if (endNode && endNode.position) {
                            endNode.position.copy(surfacePoint);
                        }
                    }

                    // استدعاء دالة المحرك الفيزيائي للحبل المحدثة والموحدة (تغنيك عن تكرار كود حساب الـ Verlet والـ Constraints يدوياً هنا)
                    if (typeof rope.update === 'function') {
                        rope.update(FIXED_DT);
                    }
                });
            }

            // 2. تحديث فيزياء زوايا البندولات والكرات بناءً على معادلاتها الدورانية
            for (const p of pendulums) {
                if (isDragging && selectedPendulums.includes(p)) {
                    p.angularVelocity = 0;
                    p.angularVelocityZ = 0;
                } else {
                    updatePendulumPhysics(p);
                }
            }

            // 3. تحديث مصفوفات التحويل للكرات في الفضاء العالمي تمهيداً لحساب التصادمات
            for (const p of pendulums) {
                updatePendulumTransform(p);
            }

            // 4. حل التصادمات (الكرات مع بعضها، ثم الكرات مع الحبال)
            // يتم استدعاؤها في نهاية الحلقة لفرض الإزاحات وقوى الارتداد والاهتزاز بشكل نهائي وصارم فوق كل الحركات السابقة
            solveCollisions(pendulums);

            accumulator -= FIXED_DT;
        }

        // 5. رسم وتحديث الأنابيب البصرية للحبال النشطة في المشهد (Visual Rendering)
        for (const p of pendulums) {
            const currentWireCount = p.wireCount ?? 2;
            for (let i = 0; i < p.ropesPhysics.length; i++) {
                if (currentWireCount === 1 && i === 1) continue;

                if (p.ropesRender[i] && p.ropesPhysics[i]) {
                    p.ropesRender[i].update(p.ropesPhysics[i].nodes);
                }
            }
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