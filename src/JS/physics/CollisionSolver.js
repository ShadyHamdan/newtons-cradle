// /physics/PhysicsEngine.js
import * as THREE from 'three';
import { DIAMETER, BALL_COUNT } from './Constants.js';
import { settings } from '../config/SimulationConfig.js';
import { playCollisionSound } from '../core/AudioManager.js';
import { updatePendulumTransform } from './PendulumDynamics.js';
import { safeCos } from '../utils/MathUtils.js';
import { solveFrameCollisions } from './FrameCollision.js';

// متجه مؤقت لنقطة اتصال الحبل العلوية بالكرة
const tempLocalTop = new THREE.Vector3(0, 0.5, 0);
const tempBallWorldPos = new THREE.Vector3();

/**
 * دالة فرعية متطورة لحل تصادم كرات البندولات مع عقد الحبال الحرة
 * تمنع الاختراق عن طريق التأثير المتبادل وتمرير الطاقة عبر نظام نسيج الحبل (Verlet Soft Physics)
 */
function solveRopeCollisions(pendulums) {
    const ballRadius = DIAMETER / 2; // 0.5
    const ropeRadius = 0.015; 
    const minDistance = ballRadius + ropeRadius;
    
    const currentBallPos = new THREE.Vector3();
    const nodeVec = new THREE.Vector3();
    const pushDir = new THREE.Vector3();

    for (let i = 0; i < BALL_COUNT; i++) {
        const pBall = pendulums[i];
        pBall.ball.getWorldPosition(currentBallPos);

        for (let j = 0; j < BALL_COUNT; j++) {
            if (i === j) continue; 

            const pRope = pendulums[j];
            const currentWireCount = pRope.wireCount ?? 2;

            pRope.ropesPhysics.forEach((rope, ropeIdx) => {
                if (!rope || !rope.nodes || (currentWireCount === 1 && ropeIdx === 1)) return;

                for (let k = 1; k < rope.nodes.length - 1; k++) {
                    const node = rope.nodes[k];

                    nodeVec.set(node.position.x, node.position.y, node.position.z);
                    const dist = nodeVec.distanceTo(currentBallPos);

                    if (dist < minDistance) {
                        const penetration = minDistance - dist;
                        // الناظم n يشير من الكرة المصطدمة (pBall) نحو عقدة الحبل (بنفس اتفاق تصادم كرة-كرة أعلاه)
                        pushDir.subVectors(nodeVec, currentBallPos).normalize();

                        // --- 1. دفع جسدي بسيط لتصحيح الاختراق البصري للعقدة (تجميلي فقط) ---
                        node.position.x += pushDir.x * penetration;
                        node.position.y += pushDir.y * penetration;
                        node.position.z += pushDir.z * penetration;

                        // --- 2. سرعة الكرة المصطدمة (pBall) ---
                        const L1 = pBall.individualLength;
                        const cosX1 = safeCos(pBall.angle);
                        const cosZ1 = safeCos(pBall.angleZ || 0);
                        const v1x = cosX1 * cosZ1 * L1 * pBall.angularVelocity;
                        const v1z = cosZ1 * L1 * (pBall.angularVelocityZ || 0);

                        // --- 3. سرعة الكرة "صاحبة" الحبل (pRope) ---
                        // *** هذا كان مصدر المشكلة: الكود القديم لم يحسب هذه السرعة إطلاقاً وتعامل معها كصفر دائم،
                        // لذلك لم يكن هناك أي تبادل حقيقي للزخم بين الكرتين عبر الحبل ***
                        const L2 = pRope.individualLength;
                        const cosX2 = safeCos(pRope.angle);
                        const cosZ2 = safeCos(pRope.angleZ || 0);
                        const v2x = cosX2 * cosZ2 * L2 * pRope.angularVelocity;
                        const v2z = cosZ2 * L2 * (pRope.angularVelocityZ || 0);

                        // السرعة النسبية الحقيقية بين الكرتين (وليس بين الكرة والعقدة فقط) على طول الناظم n
                        const relVelX = v1x - v2x;
                        const relVelZ = v1z - v2z;
                        const relativeNormalVel = (relVelX * pushDir.x) + (relVelZ * pushDir.z);

                        // إذا كانت الكرة تقترب فعلاً من الحبل (وليست مبتعدة عنه أصلاً)
                        if (relativeNormalVel > 0) {
                            const restitution = 0.85;
                            const m1 = pBall.individualMass || 1.0;
                            const m2 = pRope.individualMass || 1.0;

                            // معامل "قبضة" نقطة الاصطدام على الحبل: الاصطدام قرب الكرة (k قريب من طرف الحبل)
                            // ينقل الطاقة بقوة شبه كاملة، والاصطدام قرب نقطة التعليق (k قريب من 0)
                            // ينقل جزءاً أقل بكثير لأن ذراع العزم حول محور التعليق أقصر هناك
                            const grip = Math.max(0.15, k / (rope.nodes.length - 1));
                            const m2Effective = m2 / grip; // كتلة "ظاهرية" أكبر كلما اقتربت النقطة من محور التعليق

                            // معادلة الاصطدام المرن القياسية (نفس معادلة تصادم كرة-كرة الموجودة أعلاه بالضبط)
                            // تضمن حفظ الزخم والطاقة معاً بدلاً من "ارتداد مصطنع" لكرة واحدة فقط
                            const impulse = ((1 + restitution) * relativeNormalVel) / ((1 / m1) + (1 / m2Effective));

                            const dv1x = -(impulse / m1) * pushDir.x;
                            const dv1z = -(impulse / m1) * pushDir.z;
                            const dv2x = (impulse / m2Effective) * pushDir.x;
                            const dv2z = (impulse / m2Effective) * pushDir.z;

                            // أ) ارتداد الكرة المصطدمة
                            pBall.angularVelocity += dv1x / (L1 * cosX1 || 1);
                            pBall.angularVelocityZ += dv1z / (L1 * cosZ1 || 1);

                            // ب) *** التصحيح الجوهري ***: نقل الطاقة فعلياً إلى الكرة صاحبة الحبل نفسها
                            pRope.angularVelocity += dv2x / (L2 * cosX2 || 1);
                            pRope.angularVelocityZ += dv2z / (L2 * cosZ2 || 1);

                            // ج) دفع زاوي بسيط لمنع الالتصاق البصري بين الكرة والحبل في نفس الإطار
                            pBall.angle -= (penetration * pushDir.x * 0.5) / L1;
                            pBall.angleZ -= (penetration * pushDir.z * 0.5) / L1;
                            updatePendulumTransform(pBall);

                            // د) دفع بصري خفيف إضافي لعقدة الحبل نفسها (تموّج جمالي فقط، لا يحمل الطاقة الأساسية بعد الآن)
                            const mNode = node.mass || 0.1;
                            const nodeKick = (impulse * 0.15) / mNode;
                            node.oldPosition.x -= pushDir.x * nodeKick * 0.016;
                            node.oldPosition.y -= pushDir.y * nodeKick * 0.016;
                            node.oldPosition.z -= pushDir.z * nodeKick * 0.016;

                        }
                    }
                }
            });
        }
    }
}

/**
 * تصادم الحبال مع بعضها البعض (String-to-String Collision)
 * يمنع اختراق (Clipping) الحبال لبعضها عندما تتقارب أو تتشابك أثناء التأرجح، وذلك عبر
 * دفع عقد الحبال الحرة (غير المثبتة والمتصلة بالكرة) بعيداً عن بعضها بمجرد تلامسها.
 * يتم تجاهل حبلي نفس البندول الواحد (V-Shape) لأنهما يلتقيان عمداً بجوار الكرة نفسها.
 */
function solveRopeToRopeCollisions(pendulums) {
    const ropeRadius = 0.015;
    const minDistance = ropeRadius * 2 + 0.015; // نصف قطر مضاعف + هامش أمان بصري بسيط

    // تجميع كل الحبال الفيزيائية في قائمة واحدة مسطّحة مع معرف البندول المالك لها
    const allRopes = [];
    pendulums.forEach((p, pendulumIndex) => {
        p.ropesPhysics.forEach(rope => {
            if (rope && rope.nodes && rope.nodes.length > 2) {
                allRopes.push({ pendulumIndex, rope });
            }
        });
    });

    for (let a = 0; a < allRopes.length; a++) {
        const ropeA = allRopes[a];
        for (let b = a + 1; b < allRopes.length; b++) {
            const ropeB = allRopes[b];

            // تجاهل حبلي البندول نفسه (يلتقيان طبيعياً عند سقف الكرة)
            if (ropeA.pendulumIndex === ropeB.pendulumIndex) continue;

            const nodesA = ropeA.rope.nodes;
            const nodesB = ropeB.rope.nodes;

            // نتجاهل العقدة الأولى (مثبتة بنقطة التعليق) والأخيرة (مثبتة بسطح الكرة)
            // في كل حبل، ونفحص فقط العقد الحرة الوسطى المرنة
            for (let i = 1; i < nodesA.length - 1; i++) {
                const nodeA = nodesA[i];
                for (let j = 1; j < nodesB.length - 1; j++) {
                    const nodeB = nodesB[j];

                    const dx = nodeB.position.x - nodeA.position.x;
                    const dy = nodeB.position.y - nodeA.position.y;
                    const dz = nodeB.position.z - nodeA.position.z;
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq < minDistance * minDistance && distSq > 1e-10) {
                        const dist = Math.sqrt(distSq);
                        const penetration = (minDistance - dist) * 0.5;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const nz = dz / dist;

                        // دفع متماثل: كل عقدة تبتعد نصف مسافة التداخل عن الأخرى لمنع الاختراق
                        nodeA.position.x -= nx * penetration;
                        nodeA.position.y -= ny * penetration;
                        nodeA.position.z -= nz * penetration;

                        nodeB.position.x += nx * penetration;
                        nodeB.position.y += ny * penetration;
                        nodeB.position.z += nz * penetration;
                    }
                }
            }
        }
    }
}

export function solveCollisions(pendulums) {
    // 1. حل تصادم الكرات مع بعضها البعض أولاً
    for (let i = 0; i < BALL_COUNT; i++) {
        for (let j = i + 1; j < BALL_COUNT; j++) {
            const p1 = pendulums[i];
            const p2 = pendulums[j];

            const diffX = p2.worldPosition.x - p1.worldPosition.x;
            const diffY = p2.worldPosition.y - p1.worldPosition.y;
            const diffZ = p2.worldPosition.z - p1.worldPosition.z;
            const distance = Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ);

            if (distance < DIAMETER) {
                const nx = diffX / (distance || 1);
                const ny = diffY / (distance || 1);
                const nz = diffZ / (distance || 1);

                const L1 = p1.individualLength;
                const angVelX1 = p1.angularVelocity;
                const angVelZ1 = p1.angularVelocityZ || 0;
                const cosX1 = safeCos(p1.angle);
                const cosZ1 = safeCos(p1.angleZ || 0);

                const v1x = cosX1 * cosZ1 * L1 * angVelX1;
                const v1y = Math.sin(p1.angle) * L1 * angVelX1;
                const v1z = cosZ1 * L1 * angVelZ1;

                const L2 = p2.individualLength;
                const angVelX2 = p2.angularVelocity;
                const angVelZ2 = p2.angularVelocityZ || 0;
                const cosX2 = safeCos(p2.angle);
                const cosZ2 = safeCos(p2.angleZ || 0);

                const v2x = cosX2 * cosZ2 * L2 * angVelX2;
                const v2y = Math.sin(p2.angle) * L2 * angVelX2;
                const v2z = cosZ2 * L2 * angVelZ2;

                const relVelX = v1x - v2x;
                const relVelY = v1y - v2y;
                const relVelZ = v1z - v2z;
                const relativeNormalVelocity = relVelX * nx + relVelY * ny + relVelZ * nz;

                const m1 = p1.individualMass;
                const m2 = p2.individualMass;

                if (relativeNormalVelocity > 0) {
                    const e = settings.restitution;
                    const impulse = ((1 + e) * relativeNormalVelocity) / ((1 / m1) + (1 / m2));

                    const dv1x = -(impulse / m1) * nx;
                    const dv1z = -(impulse / m1) * nz;
                    const dv2x = (impulse / m2) * nx;
                    const dv2z = (impulse / m2) * nz;

                    p1.angularVelocity += dv1x / (L1 * cosX1 || 1);
                    p1.angularVelocityZ += dv1z / (L1 * cosZ1 || 1);
                    p2.angularVelocity += dv2x / (L2 * cosX2 || 1);
                    p2.angularVelocityZ += dv2z / (L2 * cosZ2 || 1);

                    playCollisionSound(Math.abs(relativeNormalVelocity));
                }

                const overlap = DIAMETER - distance;
                const totalMass = m1 + m2;
                const ratio1 = m2 / totalMass;
                const ratio2 = m1 / totalMass;

                p1.angle -= (overlap * ratio1 * nx) / L1;
                p1.angleZ -= (overlap * ratio1 * nz) / L1;
                p2.angle += (overlap * ratio2 * nx) / L2;
                p2.angleZ += (overlap * ratio2 * nz) / L2;

                p1.worldPosition.x -= overlap * ratio1 * nx;
                p1.worldPosition.z -= overlap * ratio1 * nz;
                p2.worldPosition.x += overlap * ratio2 * nx;
                p2.worldPosition.z += overlap * ratio2 * nz;

                updatePendulumTransform(p1);
                updatePendulumTransform(p2);

                // --- التصحيح الدوراني الديناميكي للحبال ---
                [p1, p2].forEach(p => {
                    if (p.ropesPhysics && p.ropesPhysics.length > 0) {
                        tempBallWorldPos.copy(tempLocalTop);
                        p.ball.localToWorld(tempBallWorldPos); 

                        p.ropesPhysics.forEach(rope => {
                            if (!rope) return;
                            const endNode = rope.getEndNode();
                            if (endNode && endNode.position) {
                                endNode.position.x = tempBallWorldPos.x;
                                endNode.position.y = tempBallWorldPos.y;
                                endNode.position.z = tempBallWorldPos.z;
                            }
                        });
                    }
                });
            }
        }
    }

    // 2. استدعاء الدالة المحدثة كلياً لمعالجة تصادم الكرات مع الحبال المرنة الحرّة
    solveRopeCollisions(pendulums);

    // 3. تصادم الحبال مع بعضها البعض لمنع اختراقها/تشابكها البصري (Clipping)
    solveRopeToRopeCollisions(pendulums);

    // 4. منع اختراق الكرات والحبال لهيكل الحامل الخارجي (الأعمدة والقضبان الصلبة)
    solveFrameCollisions(pendulums);
}