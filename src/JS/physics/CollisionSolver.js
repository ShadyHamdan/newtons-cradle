// /physics/PhysicsEngine.js
import * as THREE from 'three';
import { DIAMETER, BALL_COUNT } from './Constants.js';
import { settings } from '../config/SimulationConfig.js';
import { playCollisionSound } from '../core/AudioManager.js';
import { updatePendulumTransform } from './PendulumDynamics.js';
import { safeCos } from '../utils/MathUtils.js';
import { solveFrameCollisions } from './FrameCollision.js';
import {
    pillarPositions,
    PILLAR_Y_MIN,
    PILLAR_Y_MAX,
    PILLAR_RADIUS,
    beamPositions,
    BEAM_HALF_HEIGHT,
    BEAM_HALF_DEPTH,
    FRAME_WIDTH,
} from '../objects/FrameGeometry.js';

const tempLocalTop = new THREE.Vector3(0, 0.5, 0);
const tempBallWorldPos = new THREE.Vector3();

// ==================== solveRopeCollisions (كرة-حبل) ====================

function solveRopeCollisions(pendulums) {
    const ballRadius = DIAMETER / 2;
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
                        pushDir.subVectors(nodeVec, currentBallPos).normalize();

                        node.position.x += pushDir.x * penetration;
                        node.position.y += pushDir.y * penetration;
                        node.position.z += pushDir.z * penetration;

                        const L1 = pBall.individualLength;
                        const cosX1 = safeCos(pBall.angle);
                        const cosZ1 = safeCos(pBall.angleZ || 0);
                        const v1x = cosX1 * cosZ1 * L1 * pBall.angularVelocity;
                        const v1z = cosZ1 * L1 * (pBall.angularVelocityZ || 0);

                        const L2 = pRope.individualLength;
                        const cosX2 = safeCos(pRope.angle);
                        const cosZ2 = safeCos(pRope.angleZ || 0);
                        const v2x = cosX2 * cosZ2 * L2 * pRope.angularVelocity;
                        const v2z = cosZ2 * L2 * (pRope.angularVelocityZ || 0);

                        const relVelX = v1x - v2x;
                        const relVelZ = v1z - v2z;
                        const relativeNormalVel = (relVelX * pushDir.x) + (relVelZ * pushDir.z);

                        if (relativeNormalVel > 0) {
                            const restitution = 0.85;
                            const m1 = pBall.individualMass || 1.0;
                            const m2 = pRope.individualMass || 1.0;

                            const grip = Math.max(0.15, k / (rope.nodes.length - 1));
                            const m2Effective = m2 / grip;

                            const impulse = ((1 + restitution) * relativeNormalVel) / ((1 / m1) + (1 / m2Effective));

                            const dv1x = -(impulse / m1) * pushDir.x;
                            const dv1z = -(impulse / m1) * pushDir.z;
                            const dv2x = (impulse / m2Effective) * pushDir.x;
                            const dv2z = (impulse / m2Effective) * pushDir.z;

                            pBall.angularVelocity += dv1x / (L1 * cosX1 || 1);
                            pBall.angularVelocityZ += dv1z / (L1 * cosZ1 || 1);
                            pRope.angularVelocity += dv2x / (L2 * cosX2 || 1);
                            pRope.angularVelocityZ += dv2z / (L2 * cosZ2 || 1);

                            pBall.angle -= (penetration * pushDir.x * 0.5) / L1;
                            pBall.angleZ -= (penetration * pushDir.z * 0.5) / L1;
                            updatePendulumTransform(pBall);

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

// ==================== solveRopeToRopeCollisions - مُلغاة (الآن داخل PhysicsRope) ====================
// function solveRopeToRopeCollisions(pendulums) { ... } // أُلغيت

// ==================== prepareRopeCollisions - تجهيز المصادمات للحبال ====================

function prepareRopeCollisions(pendulums) {
    // تجميع كل الحبال
    const allRopes = [];
    pendulums.forEach((p, idx) => {
        p.ropesPhysics.forEach(rope => {
            if (rope && rope.nodes) {
                allRopes.push({ rope, pendulum: p, index: idx });
            }
        });
    });

    // تجهيز مصادمات الإطار لكل حبل
    for (const { rope } of allRopes) {
        rope.clearExternalColliders();

        // إضافة الأعمدة كمصادمات
        for (const pillar of pillarPositions) {
            rope.addExternalCollider('pillar', {
                x: pillar.x,
                z: pillar.z,
                radius: PILLAR_RADIUS,
                yMin: PILLAR_Y_MIN,
                yMax: PILLAR_Y_MAX,
            });
        }

        // إضافة القضبان كمصادمات
        for (const beam of beamPositions) {
            rope.addExternalCollider('beam', {
                y: beam.y,
                z: beam.z,
                halfWidth: FRAME_WIDTH / 2,
                halfHeight: BEAM_HALF_HEIGHT,
                halfDepth: BEAM_HALF_DEPTH,
            });
        }
    }

    // إضافة الحبال الأخرى كمصادمات (حبل-حبل)
    for (let i = 0; i < allRopes.length; i++) {
        for (let j = i + 1; j < allRopes.length; j++) {
            // لا نضيف حبلي نفس البندول
            if (allRopes[i].index === allRopes[j].index) continue;

            allRopes[i].rope.addExternalCollider('rope', allRopes[j].rope);
            allRopes[j].rope.addExternalCollider('rope', allRopes[i].rope);
        }
    }
}

// ==================== solveCollisions الرئيسية ====================

export function solveCollisions(pendulums) {
    // 0. تجهيز مصادمات الحبال (قبل كل شيء)
    prepareRopeCollisions(pendulums);

    // 1. تصادم كرة-كرة
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

    // 2. تصادم كرة-حبل
    solveRopeCollisions(pendulums);

    // 3. تصادم حبل-حبل وحبل-إطار (الآن داخل PhysicsRope.update!)
    // لا حاجة لاستدعاء solveRopeToRopeCollisions هنا

    // 4. تصادم كرة-إطار
    solveFrameCollisions(pendulums);
}