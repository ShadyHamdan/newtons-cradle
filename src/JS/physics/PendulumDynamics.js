import * as THREE from 'three';
import { settings } from '../config/SimulationConfig.js';
import { FIXED_DT, PIVOT_Y } from './Constants.js';

export function updatePendulumPhysics(p) {
    if (!p) return;

    p.angularAcceleration = -(settings.gravity / p.individualLength) * Math.sin(p.angle);
    p.angularVelocity += p.angularAcceleration * FIXED_DT;
    p.angularVelocity *= settings.airDamping;
    p.angle += p.angularVelocity * FIXED_DT;

    if (p.angleZ === undefined) p.angleZ = 0;
    if (p.angularVelocityZ === undefined) p.angularVelocityZ = 0;

    p.angularAccelerationZ = -(settings.gravity / p.individualLength) * Math.sin(p.angleZ);
    p.angularVelocityZ += p.angularAccelerationZ * FIXED_DT;
    p.angularVelocityZ *= settings.airDamping;
    p.angleZ += p.angularVelocityZ * FIXED_DT;
}

export function updatePendulumTransform(p) {
    if (!p) return;

    const angleX = p.angle ?? 0;
    const angleZ = p.angleZ ?? 0;
    const L = p.individualLength;
    const zOffset = 1.4;

    p.group.rotation.set(0, 0, 0);

    const sinX = Math.sin(angleX);
    const cosX = Math.cos(angleX);
    const sinZ = Math.sin(angleZ);
    const cosZ = Math.cos(angleZ);

    const localX = L * sinX * cosZ;
    const localZ = L * sinZ;
    const localY = -L * cosX * cosZ;

    p.ball.position.set(localX, localY, localZ);

    const currentWireCount = p.wireCount ?? 2;
    if (currentWireCount === 1) {
        const anchorCenter = new THREE.Vector3(0, 0, 0);
        if (p.leftWire) {
            p.leftWire.visible = true;
            p.leftWire.position.copy(anchorCenter);
            const dirCenter = new THREE.Vector3().subVectors(p.ball.position, anchorCenter);
            p.leftWire.scale.y = dirCenter.length();
            dirCenter.normalize();
            p.leftWire.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirCenter);
        }

        if (p.rightWire) {
            p.rightWire.visible = false;
        }
    } else {
        const anchorLeft = new THREE.Vector3(0, 0, zOffset);
        const anchorRight = new THREE.Vector3(0, 0, -zOffset);

        if (p.leftWire) {
            p.leftWire.visible = true;
            p.leftWire.position.copy(anchorLeft);
            const dirLeft = new THREE.Vector3().subVectors(p.ball.position, anchorLeft);
            p.leftWire.scale.y = dirLeft.length();
            dirLeft.normalize();
            p.leftWire.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirLeft);
        }

        if (p.rightWire) {
            p.rightWire.visible = true;
            p.rightWire.position.copy(anchorRight);
            const dirRight = new THREE.Vector3().subVectors(p.ball.position, anchorRight);
            p.rightWire.scale.y = dirRight.length();
            dirRight.normalize();
            p.rightWire.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirRight);
        }
    }

    p.worldPosition.set(p.pivotX + localX, PIVOT_Y + localY, localZ);
}