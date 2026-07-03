import * as THREE from 'three';
import { settings } from '../config/SimulationConfig.js';
import { FIXED_DT, PIVOT_Y, Z_OFFSET } from './Constants.js';

export function updatePendulumPhysics(p) {
    if (!p) return;

    // إذا كانت الكرة ممسوكة بالماوس (يتم التحكم بها خارجياً)، نمنع الجاذبية من التأثير عليها
    // لمنع الكرة من مقاومة حركة الماوس أو الارتداد العشوائي
    if (p.isDragging) {
        p.angularVelocity = 0;
        p.angularVelocityZ = 0;
        p.angularAcceleration = 0;
        p.angularAccelerationZ = 0;
        return; 
    }

    // 1. الحركة الحرة على محور X (البندول الأمامي والخلفي)
    p.angularAcceleration = -(settings.gravity / p.individualLength) * Math.sin(p.angle);
    p.angularVelocity += p.angularAcceleration * FIXED_DT;
    p.angularVelocity *= settings.airDamping;
    p.angle += p.angularVelocity * FIXED_DT;

    // 2. الحركة الحرة على محور Z (البندول الجانبي)
    if (p.angleZ === undefined) p.angleZ = 0;
    if (p.angularVelocityZ === undefined) p.angularVelocityZ = 0;

    const zOffset = Z_OFFSET; 
    const effectiveLengthZ = Math.sqrt(p.individualLength * p.individualLength + zOffset * zOffset);

    p.angularAccelerationZ = -(settings.gravity / effectiveLengthZ) * Math.sin(p.angleZ);
    p.angularVelocityZ += p.angularAccelerationZ * FIXED_DT;
    p.angularVelocityZ *= settings.airDamping;
    p.angleZ += p.angularVelocityZ * FIXED_DT;
}

export function updatePendulumTransform(p) {
    if (!p) return;

    const angleX = p.angle ?? 0;
    const angleZ = p.angleZ ?? 0;
    const L = p.individualLength;

    p.group.rotation.set(0, 0, 0);

    // حساب المسار الدائري النقي الصارم (X^2 + Y^2 + Z^2 = L^2) لضمان عدم الانفصال أبداً
    const localX = L * Math.sin(angleX);
    const localZ = L * Math.sin(angleZ);

    const lengthSq = L * L;
    const offsetSq = (localX * localX) + (localZ * localZ);
    const remainingSq = Math.max(0, lengthSq - offsetSq);
    const localY = -Math.sqrt(remainingSq);

    // تحديث موقع المش البصري للكرة
    p.ball.position.set(localX, localY, localZ);

    // تحديث الإحداثيات العالمية للمحرك الفيزيائي والحبال
    const pivotZ = p.pivotZ ?? 0; 
    p.worldPosition.set(
        p.pivotX + localX, 
        PIVOT_Y + localY, 
        pivotZ + localZ
    );

    // تحديث مصفوفة الأبعاد العالمية فوراً في نفس الإطار
    p.ball.updateMatrix();
    p.ball.updateMatrixWorld(true);
}