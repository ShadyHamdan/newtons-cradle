import { BALL_COUNT } from './Constants.js';
import { settings } from '../config/SimulationConfig.js';
import { updatePendulumTransform } from './PendulumDynamics.js';

/**
 * دالة مساعدة لإعادة تعيين واستقامة عقد الحبل لتمتد بدقة من السقف وحتى مركز الكرة تماماً
 */
function resetRopeNodesToCenter(pendulum) {
    if (!pendulum.ropesPhysics || !Array.isArray(pendulum.ropesPhysics)) return;

    pendulum.ropesPhysics.forEach((rope) => {
        if (!rope || !rope.nodes) return;

        const numNodes = rope.nodes.length;
        const start = rope.startPoint;
        
        // التطوير الجوهري: الخيط ينتهي عند إحداثيات مركز الكرة الفعلي في وضع السكون العمودي
        const endX = pendulum.pivotX;
        const endY = pendulum.pivotY - pendulum.individualLength; // الطول الكامل (L) صافي بدون خصم نصف القطر
        const endZ = start.z; // الحفاظ على عمق الـ V-Shape للبندول المزدوج

        for (let i = 0; i < numNodes; i++) {
            const ratio = i / (numNodes - 1);
            const targetX = start.x + (endX - start.x) * ratio;
            const targetY = start.y + (endY - start.y) * ratio;
            const targetZ = start.z + (endZ - start.z) * ratio;

            // إجبار العقد على الاستقامة التامة الممتدة للمركز
            rope.nodes[i].position.x = targetX;
            rope.nodes[i].position.y = targetY;
            rope.nodes[i].position.z = targetZ;

            // تصفير السرعة الفيزيائية التراكمية لعقد الحبل (Verlet Old Positions)
            rope.nodes[i].oldPosition.x = targetX;
            rope.nodes[i].oldPosition.y = targetY;
            rope.nodes[i].oldPosition.z = targetZ;
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
        resetRopeNodesToCenter(p);
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
        
        // إعادة فرد الخيوط فيزيائياً لتمتد رأسياً لمركز الكرات
        resetRopeNodesToCenter(pendulum);
    });

    console.log('🔄 تم تصفير المحرك الفيزيائي بنجاح، واستقامت الحبال ميكانيكياً حتى مركز الكرات.');
}