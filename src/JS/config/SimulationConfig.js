import * as THREE from 'three';
import { BALL_COUNT } from '../physics/Constants.js';

export const settings = {
    gravity: 9.81,
    restitution: 0.995,
    airDamping: 0.9994,
    launchAngle: THREE.MathUtils.degToRad(45),
    launchAngleZ: 0,
    launchCount: 1,
    launchMode: 'single',
    interactionMode: 'group',
    sound: true,
    enableZDrag: false,
};

export const pendingBallsSettings = Array.from({ length: BALL_COUNT }, () => ({
    stringLength: 5.0,
    mass: 1.0,
    wireCount: 2,
    restitution: 0.98
}));