// /physics/FrameCollision.js
// يعالج هذا الملف حدود التصادم (Collision Bounds) الخاصة بحامل البندول (Frame)، ويجعله
// يتصرف كجسم صلب (Rigid Body) حقيقي لا يمكن للكرات ولا للحبال اختراقه أبداً، سواء أثناء
// التأرجح الحر أو أثناء السحب اليدوي بالماوس أو بعد صدمة قوية تدفع الكرة بعيداً للجانبين.

import * as THREE from 'three';
import { BALL_RADIUS, PIVOT_Y } from './Constants.js';
import { updatePendulumTransform } from './PendulumDynamics.js';
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

const ropeCollisionRadius = 0.02; // نصف قطر تقريبي لسماكة الحبل عند فحص تصادمه مع الحامل
const _ballWorldPos = new THREE.Vector3();

/**
 * يفحص تصادم نقطة (مركز كرة أو عقدة حبل) مع عمود رأسي أسطواني، ويعيد متجه الدفع اللازم
 * لإخراج النقطة من داخل العمود إن كانت متداخلة معه، أو null إن لم يوجد تصادم.
 */
function resolvePointVsPillar(point, pillar, pointRadius) {
    if (point.y < PILLAR_Y_MIN || point.y > PILLAR_Y_MAX) return null;

    const dx = point.x - pillar.x;
    const dz = point.z - pillar.z;
    const distSq = dx * dx + dz * dz;
    const minDist = PILLAR_RADIUS + pointRadius;

    if (distSq >= minDist * minDist) return null;

    const dist = Math.sqrt(distSq) || 0.0001;
    return {
        x: (dx / dist) * (minDist - dist),
        y: 0,
        z: (dz / dist) * (minDist - dist),
    };
}

/**
 * يفحص تصادم نقطة مع قضيب أفقي (صندوق رفيع يمتد بطول الحامل بالكامل على المحور X)،
 * ويدفع النقطة عبر المحور (Y أو Z) الأقرب للسطح لتفادي القفزات البصرية المفاجئة.
 */
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
        return { x: 0, y: Math.sign(dy || 1) * penY, z: 0 };
    }
    return { x: 0, y: 0, z: Math.sign(dz || 1) * penZ };
}

/**
 * يحل تصادم كل الكرات وعقد الحبال الحرة مع الحامل الصلب (أعمدة + قضبان)، ويمنع اختراقه نهائياً.
 */
export function solveFrameCollisions(pendulums) {
    for (const p of pendulums) {
        p.ball.getWorldPosition(_ballWorldPos);
        let totalPush = { x: 0, y: 0, z: 0 };
        let hasCollision = false;

        for (const pillar of pillarPositions) {
            const hit = resolvePointVsPillar(_ballWorldPos, pillar, BALL_RADIUS);
            if (hit) {
                totalPush.x += hit.x;
                totalPush.z += hit.z;
                hasCollision = true;
            }
        }

        for (const beam of beamPositions) {
            const hit = resolvePointVsBeam(_ballWorldPos, beam, BALL_RADIUS);
            if (hit) {
                totalPush.y += hit.y;
                totalPush.z += hit.z;
                hasCollision = true;
            }
        }

        if (hasCollision) {
            _ballWorldPos.x += totalPush.x;
            _ballWorldPos.y += totalPush.y;
            _ballWorldPos.z += totalPush.z;

            // إعادة اشتقاق زاويتي البندول من الموقع المصحح مع الحفاظ على طول الحبل الصلب،
            // ثم تحديث المصفوفات فوراً حتى يبقى النظام متسقاً (نفس منطق تصادم الكرة-كرة تماماً)
            const dx = _ballWorldPos.x - p.pivotX;
            const dz = _ballWorldPos.z - (p.pivotZ ?? 0);
            const dy = PIVOT_Y - _ballWorldPos.y;

            p.angle = Math.atan2(dx, dy || 0.0001);
            p.angleZ = Math.atan2(dz, dy || 0.0001);

            // ارتداد خفيف بدلاً من توقف مفاجئ صلب، لمظهر أكثر واقعية عند لمس الحامل
            p.angularVelocity *= -0.25;
            p.angularVelocityZ *= -0.25;

            updatePendulumTransform(p);
        }

        // منع اختراق الحبال نفسها للحامل (العقد الحرة فقط، دون طرفي التثبيت)
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
