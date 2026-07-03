// /physics/FrameCollision.js
// حل تصادم متطور وقوي للإطار - منع الاختراق والتعليق نهائياً

import * as THREE from 'three';
import { BALL_RADIUS, PIVOT_Y } from './Constants.js';
import { updatePendulumTransform } from './PendulumDynamics.js';
import { playCollisionSound } from '../core/AudioManager.js';
import { safeCos } from '../utils/MathUtils.js';
import {
    pillarPositions,
    PILLAR_RADIUS,
    PILLAR_Y_MIN,
    PILLAR_Y_MAX,
    beamPositions,
    BEAM_HALF_HEIGHT,
    BEAM_HALF_DEPTH,
    FRAME_WIDTH,
} from '../objects/FrameGeometry.js';

const ropeCollisionRadius = 0.02;
const _ballWorldPos = new THREE.Vector3();
const _tempPos = new THREE.Vector3();

function resolvePointVsPillar(point, pillar, pointRadius) {
    if (point.y < PILLAR_Y_MIN || point.y > PILLAR_Y_MAX) return null;

    const dx = point.x - pillar.x;
    const dz = point.z - pillar.z;
    const distSq = dx * dx + dz * dz;
    const minDist = PILLAR_RADIUS + pointRadius;

    if (distSq >= minDist * minDist) return null;

    const dist = Math.sqrt(distSq) || 0.0001;
    const penetration = minDist - dist;

    return {
        x: (dx / dist) * penetration,
        y: 0,
        z: (dz / dist) * penetration,
        nx: dx / dist,
        ny: 0,
        nz: dz / dist,
        penetration: penetration,
    };
}

function resolvePointVsBeam(point, beam, pointRadius) {
    const halfWidth = FRAME_WIDTH / 2;
    if (Math.abs(point.x) > halfWidth + pointRadius) return null;

    const dy = point.y - beam.y;
    const dz = point.z - beam.z;
    const halfY = BEAM_HALF_HEIGHT + pointRadius;
    const halfZ = BEAM_HALF_DEPTH + pointRadius;

    if (Math.abs(dy) > halfY || Math.abs(dz) > halfZ) return null;

    const penY = halfY - Math.abs(dy);
    const penZ = halfZ - Math.abs(dz);

    if (penY < penZ) {
        return {
            x: 0,
            y: Math.sign(dy || 1) * penY,
            z: 0,
            nx: 0,
            ny: Math.sign(dy || 1),
            nz: 0,
            penetration: penY,
        };
    }
    return {
        x: 0,
        y: 0,
        z: Math.sign(dz || 1) * penZ,
        nx: 0,
        ny: 0,
        nz: Math.sign(dz || 1),
        penetration: penZ,
    };
}

export function solveFrameCollisions(pendulums) {
    for (const p of pendulums) {
        p.ball.getWorldPosition(_ballWorldPos);

        let totalPushX = 0, totalPushY = 0, totalPushZ = 0;
        let collisionNormalX = 0, collisionNormalY = 0, collisionNormalZ = 0;
        let hasCollision = false;
        let maxPenetration = 0;
        let collisionCount = 0;

        for (const pillar of pillarPositions) {
            const hit = resolvePointVsPillar(_ballWorldPos, pillar, BALL_RADIUS);
            if (hit) {
                totalPushX += hit.x;
                totalPushZ += hit.z;
                collisionNormalX += hit.nx;
                collisionNormalY += hit.ny;
                collisionNormalZ += hit.nz;
                hasCollision = true;
                maxPenetration = Math.max(maxPenetration, hit.penetration);
                collisionCount++;
            }
        }

        for (const beam of beamPositions) {
            const hit = resolvePointVsBeam(_ballWorldPos, beam, BALL_RADIUS);
            if (hit) {
                totalPushY += hit.y;
                totalPushZ += hit.z;
                collisionNormalX += hit.nx;
                collisionNormalY += hit.ny;
                collisionNormalZ += hit.nz;
                hasCollision = true;
                maxPenetration = Math.max(maxPenetration, hit.penetration);
                collisionCount++;
            }
        }

        if (hasCollision && collisionCount > 0) {
            const normalLen = Math.sqrt(
                collisionNormalX * collisionNormalX +
                collisionNormalY * collisionNormalY +
                collisionNormalZ * collisionNormalZ
            ) || 1;

            const nx = collisionNormalX / normalLen;
            const ny = collisionNormalY / normalLen;
            const nz = collisionNormalZ / normalLen;

            const safetyMargin = 0.005;
            const pushMultiplier = 1.0 + (safetyMargin / (maxPenetration || 0.001));

            _ballWorldPos.x += totalPushX * pushMultiplier;
            _ballWorldPos.y += totalPushY * pushMultiplier;
            _ballWorldPos.z += totalPushZ * pushMultiplier;

            const L = p.individualLength;
            const cosX = safeCos(p.angle);
            const cosZ = safeCos(p.angleZ || 0);

            const vx = cosX * cosZ * L * p.angularVelocity;
            const vy = Math.sin(p.angle) * L * p.angularVelocity;
            const vz = cosZ * L * (p.angularVelocityZ || 0);

            const vDotN = vx * nx + vy * ny + vz * nz;

            if (vDotN < 0) {
                const restitution = 0.85;
                const mass = p.individualMass || 1.0;

                const impulse = -(1 + restitution) * vDotN;

                const vReflectedX = vx + impulse * nx;
                const vReflectedY = vy + impulse * ny;
                const vReflectedZ = vz + impulse * nz;

                const denomX = L * cosX;
                const denomZ = L * cosZ;

                if (Math.abs(denomX) > 0.001) {
                    p.angularVelocity = vReflectedX / denomX;
                } else {
                    p.angularVelocity = vReflectedX / (L * 0.001);
                }

                if (Math.abs(denomZ) > 0.001) {
                    p.angularVelocityZ = vReflectedZ / denomZ;
                } else {
                    p.angularVelocityZ = vReflectedZ / (L * 0.001);
                }

                playCollisionSound(Math.abs(vDotN));

                const angularKick = 0.5;
                p.angle -= (totalPushX * angularKick) / L;
                p.angleZ -= (totalPushZ * angularKick) / L;
            } else {
                const escapeBoost = 0.3;
                p.angularVelocity += (totalPushX * escapeBoost) / (L * cosX || 0.001);
                p.angularVelocityZ += (totalPushZ * escapeBoost) / (L * cosZ || 0.001);
            }

            const dx = _ballWorldPos.x - p.pivotX;
            const dz = _ballWorldPos.z - (p.pivotZ ?? 0);
            const dy = PIVOT_Y - _ballWorldPos.y;

            p.angle = Math.atan2(dx, dy || 0.0001);
            p.angleZ = Math.atan2(dz, dy || 0.0001);

            updatePendulumTransform(p);

            // فحص مزدوج
            p.ball.getWorldPosition(_tempPos);
            let stillColliding = false;
            for (const pillar of pillarPositions) {
                if (resolvePointVsPillar(_tempPos, pillar, BALL_RADIUS)) {
                    stillColliding = true;
                    break;
                }
            }
            if (!stillColliding) {
                for (const beam of beamPositions) {
                    if (resolvePointVsBeam(_tempPos, beam, BALL_RADIUS)) {
                        stillColliding = true;
                        break;
                    }
                }
            }

            if (stillColliding) {
                _tempPos.x += totalPushX * 2;
                _tempPos.y += totalPushY * 2;
                _tempPos.z += totalPushZ * 2;

                const dx2 = _tempPos.x - p.pivotX;
                const dz2 = _tempPos.z - (p.pivotZ ?? 0);
                const dy2 = PIVOT_Y - _tempPos.y;

                p.angle = Math.atan2(dx2, dy2 || 0.0001);
                p.angleZ = Math.atan2(dz2, dy2 || 0.0001);

                p.angularVelocity = (p.angularVelocity || 0) * -0.5 + (totalPushX * 0.5) / L;
                p.angularVelocityZ = (p.angularVelocityZ || 0) * -0.5 + (totalPushZ * 0.5) / L;

                updatePendulumTransform(p);
            }
        }

        // تصادم الحبال مع الإطار
        for (const rope of p.ropesPhysics) {
            if (!rope || !rope.nodes) continue;

            for (let i = 1; i < rope.nodes.length - 1; i++) {
                const node = rope.nodes[i];

                for (const pillar of pillarPositions) {
                    const hit = resolvePointVsPillar(node.position, pillar, ropeCollisionRadius);
                    if (hit) {
                        node.position.x += hit.x;
                        node.position.z += hit.z;
                    }
                }

                for (const beam of beamPositions) {
                    const hit = resolvePointVsBeam(node.position, beam, ropeCollisionRadius);
                    if (hit) {
                        node.position.y += hit.y;
                        node.position.z += hit.z;
                    }
                }
            }
        }
    }
}