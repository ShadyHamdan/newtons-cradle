// PendulumFactory.js
import { BALL_COUNT, DIAMETER, PIVOT_Y } from '../physics/Constants.js';
import { Pendulum } from './Pendulum.js'; 

export function createPendulums(scene) {
    const pendulums = [];
    const startX = -((BALL_COUNT - 1) * DIAMETER) / 2;
    const defaultLength = 5.0;
    const zOffset = 1.4;

    for (let i = 0; i < BALL_COUNT; i++) {
        const pivotX = startX + i * DIAMETER;
        
        // تمرير الـ scene كمعامل خامس وأخير
        const pendulumInstance = new Pendulum(pivotX, PIVOT_Y, defaultLength, zOffset, scene);
        
        scene.add(pendulumInstance.group);
        pendulums.push(pendulumInstance);
    }
    return pendulums;
}