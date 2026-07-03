import * as THREE from 'three';
import { frameMaterial } from './Materials.js';
import {
    FRAME_WIDTH,
    FRAME_DEPTH_OFFSET,
    PILLAR_RADIUS,
    PILLAR_HEIGHT,
    PILLAR_Y_CENTER,
    pillarPositions as pillarXZPositions,
    beamPositions,
} from './FrameGeometry.js';

export function createFrame() {
    const frame = new THREE.Group();
    const width = FRAME_WIDTH;

    const pillarGeometry = new THREE.CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS, PILLAR_HEIGHT, 24);
    const beamGeometry = new THREE.BoxGeometry(width, 0.15, 0.15);

    // نستخدم نفس مواقع الأعمدة والقضبان المعرّفة مركزياً في FrameGeometry.js
    // لضمان تطابق الشكل البصري تماماً مع حدود التصادم الفيزيائية (FrameCollision.js)
    pillarXZPositions.forEach(({ x, z }) => {
        const pillar = new THREE.Mesh(pillarGeometry, frameMaterial);
        pillar.position.set(x, PILLAR_Y_CENTER, z);
        pillar.castShadow = true;
        frame.add(pillar);
    });

    beamPositions.forEach(({ y, z }) => {
        const beam = new THREE.Mesh(beamGeometry, frameMaterial);
        beam.position.set(0, y, z);
        beam.castShadow = true;
        frame.add(beam);
    });

    const connectorGeometry = new THREE.BoxGeometry(0.15, 0.15, FRAME_DEPTH_OFFSET * 2);
    const leftConnector = new THREE.Mesh(connectorGeometry, frameMaterial);
    leftConnector.position.set(-width / 2, beamPositions[0].y, 0);
    leftConnector.castShadow = true;
    frame.add(leftConnector);

    const rightConnector = leftConnector.clone();
    rightConnector.position.x = width / 2;
    frame.add(rightConnector);

    return frame;
}