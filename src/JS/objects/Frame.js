import * as THREE from 'three';
import { BALL_COUNT, DIAMETER, PIVOT_Y } from '../physics/Constants.js';
import { frameMaterial } from './Materials.js';

export function createFrame() {
    const frame = new THREE.Group();
    const width = BALL_COUNT * DIAMETER + 2;
    
    const pillarGeometry = new THREE.CylinderGeometry(0.1, 0.1, 7, 24);
    const beamGeometry = new THREE.BoxGeometry(width, 0.15, 0.15);

    const pillarPositions = [
        [-width / 2, 2, 1.4], [width / 2, 2, 1.4],
        [-width / 2, 2, -1.4], [width / 2, 2, -1.4]
    ];

    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeometry, frameMaterial);
        pillar.position.set(...pos);
        pillar.castShadow = true;
        frame.add(pillar);
    });

    const beamFront = new THREE.Mesh(beamGeometry, frameMaterial);
    beamFront.position.set(0, PIVOT_Y, 1.4);
    beamFront.castShadow = true;
    frame.add(beamFront);

    const beamBack = beamFront.clone();
    beamBack.position.z = -1.4;
    frame.add(beamBack);

    const beamCenter = beamFront.clone();
    beamCenter.position.z = 0; 
    frame.add(beamCenter);

    const connectorGeometry = new THREE.BoxGeometry(0.15, 0.15, 2.8);
    const leftConnector = new THREE.Mesh(connectorGeometry, frameMaterial);
    leftConnector.position.set(-width / 2, PIVOT_Y, 0);
    leftConnector.castShadow = true;
    frame.add(leftConnector);

    const rightConnector = leftConnector.clone();
    rightConnector.position.x = width / 2;
    frame.add(rightConnector);

    return frame;
}