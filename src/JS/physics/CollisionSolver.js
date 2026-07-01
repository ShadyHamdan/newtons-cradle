import { DIAMETER, BALL_COUNT } from './Constants.js';
import { settings } from '../config/SimulationConfig.js';
import { playCollisionSound } from '../core/AudioManager.js';
import { updatePendulumTransform } from './PendulumDynamics.js';

export function solveCollisions(pendulums) {
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
                const cosX1 = Math.cos(p1.angle);
                const cosZ1 = Math.cos(p1.angleZ || 0);

                const v1x = cosX1 * cosZ1 * L1 * angVelX1;
                const v1y = Math.sin(p1.angle) * L1 * angVelX1;
                const v1z = cosZ1 * L1 * angVelZ1;

                const L2 = p2.individualLength;
                const angVelX2 = p2.angularVelocity;
                const angVelZ2 = p2.angularVelocityZ || 0;
                const cosX2 = Math.cos(p2.angle);
                const cosZ2 = Math.cos(p2.angleZ || 0);

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
            }
        }
    }
}