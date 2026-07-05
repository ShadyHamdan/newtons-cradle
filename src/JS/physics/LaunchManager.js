import * as THREE from 'three';
import { BALL_COUNT } from './Constants.js';
import { settings } from '../config/SimulationConfig.js';
import { updatePendulumTransform } from './PendulumDynamics.js';

/**
 * دالة مساعدة لمزامنة عقد الحبل مع وضع الكرة الحالي بعد تطبيق الإطلاق
 */
function syncRopeNodesToLaunchPose(pendulum) {
    if (!pendulum.ropesPhysics || !Array.isArray(pendulum.ropesPhysics)) return;

    const ballWorldPos = new THREE.Vector3();
    pendulum.ball?.getWorldPosition(ballWorldPos);

    pendulum.ropesPhysics.forEach((rope) => {
        if (!rope || !rope.nodes) return;

        const numNodes = rope.nodes.length;
        const start = rope.startPoint;

        const ropeDir = new THREE.Vector3().subVectors(ballWorldPos, start);
        const totalDist = ropeDir.length();
        if (totalDist <= 0.0001) return;

        // طول الحبل الفيزيائي ينتهي عند سطح الكرة، لا عند مركزها
        const targetRopeLength = Math.max(totalDist - 0.5, 0.001);
        const surfacePoint = new THREE.Vector3()
            .copy(start)
            .addScaledVector(ropeDir.normalize(), targetRopeLength);

        for (let i = 0; i < numNodes; i++) {
            const ratio = i / (numNodes - 1);
            const targetX = start.x + (surfacePoint.x - start.x) * ratio;
            const targetY = start.y + (surfacePoint.y - start.y) * ratio;
            const targetZ = start.z + (surfacePoint.z - start.z) * ratio;

            // إجبار العقد على الاستقامة التامة الممتدة للمركز
            rope.nodes[i].position.x = targetX;
            rope.nodes[i].position.y = targetY;
            rope.nodes[i].position.z = targetZ;

            // تصفير السرعة الفيزيائية التراكمية لعقد الحبل (Verlet Old Positions)
            rope.nodes[i].oldPosition.x = targetX;
            rope.nodes[i].oldPosition.y = targetY;
            rope.nodes[i].oldPosition.z = targetZ;
        }

        rope.ropeLength = targetRopeLength;
        rope.restLength = targetRopeLength / (numNodes - 1);

        for (let i = 0; i < rope.constraints.length; i++) {
            rope.constraints[i].length = rope.restLength;
        }

        for (let i = 0; i < rope.bendConstraints.length; i++) {
            rope.bendConstraints[i].length = rope.restLength * 2;
        }
    });
}

export function applyLaunchConfiguration(pendulums) {
    for (const p of pendulums) {
        p.angle = 0;
        p.angleZ = 0;
        p.angularVelocity = 0;
        p.angularVelocityZ = 0;
        p.angularAcceleration = 0;
        p.angularAccelerationZ = 0;
    }

    const launchAngleZ = settings.launchAngleZ ?? 0;

    if (settings.launchMode === 'single') {
        for (let i = 0; i < settings.launchCount; i++) {
            pendulums[i].angle = -settings.launchAngle;
            pendulums[i].angleZ = launchAngleZ;
        }
    } else if (settings.launchMode === 'double') {
        for (let i = 0; i < settings.launchCount; i++) {
            pendulums[i].angle = -settings.launchAngle;
            pendulums[i].angleZ = launchAngleZ;
        }
        for (let i = 0; i < settings.launchCount; i++) {
            const index = BALL_COUNT - 1 - i;
            pendulums[index].angle = settings.launchAngle;
            pendulums[index].angleZ = -launchAngleZ;
        }
    }

    // تحديث تحويلات الكرات وبناء استقامة الحبال للمركز فوراً طبقاً لزوايا الإطلاق
    for (const p of pendulums) {
        updatePendulumTransform(p);
        syncRopeNodesToLaunchPose(p);
    }
}

export function resetPhysicsSimulation(pendulums) {
    if (!pendulums || !Array.isArray(pendulums)) return;

    pendulums.forEach((pendulum) => {
        pendulum.angle = 0;
        pendulum.angleZ = 0;
        pendulum.angularVelocity = 0;
        pendulum.angularVelocityZ = 0;
        pendulum.angularAcceleration = 0;
        pendulum.angularAccelerationZ = 0;

        if (pendulum.velocity) pendulum.velocity.set(0, 0, 0);
        if (pendulum.acceleration) pendulum.acceleration.set(0, 0, 0);

        // تنظيف الاستدعاء القديم لـ updateWires لعدم تشتيت المحرك الفيزيائي الجديد
        updatePendulumTransform(pendulum);
        
        // إعادة فرد الخيوط فيزيائياً لتتبع وضع الكرة الحالي بدقة
        syncRopeNodesToLaunchPose(pendulum);
    });

    console.log('🔄 تم تصفير المحرك الفيزيائي بنجاح، واستقامت الحبال ميكانيكياً حتى مركز الكرات.');
}