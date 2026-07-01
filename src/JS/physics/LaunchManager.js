import { BALL_COUNT } from './Constants.js';
import { settings } from '../config/SimulationConfig.js';
import { updatePendulumTransform } from './PendulumDynamics.js';

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

    for (const p of pendulums) {
        updatePendulumTransform(p);
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
        pendulum.wireCount = 2;

        if (pendulum.velocity) pendulum.velocity.set(0, 0, 0);
        if (pendulum.acceleration) pendulum.acceleration.set(0, 0, 0);

        if (typeof pendulum.updateWires === 'function') {
            pendulum.updateWires(pendulum.individualLength, 1.4, pendulum.wireCount);
        }
        updatePendulumTransform(pendulum);
    });

    console.log('🔄 تم تصفير المحرك الفيزيائي وإعادة الكرات إلى وضع السكون العمودي.');
}