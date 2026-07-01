import * as THREE from 'three';
import { chromeMaterial, wireMaterial, visualMaterials } from './Materials.js';

export class Pendulum {
    constructor(pivotX, pivotY, defaultLength, zOffset) {
        this.pivotX = pivotX;
        this.pivotY = pivotY;
        this.individualLength = defaultLength;
        this.individualMass = 1.0;
        this.individualRestitution = 0.98;

        this.angle = 0;
        this.angleZ = 0;
        this.angularVelocity = 0;
        this.angularVelocityZ = 0;
        this.angularAcceleration = 0;
        this.angularAccelerationZ = 0;
        this.wireCount = 2;
        this.worldPosition = new THREE.Vector3(pivotX, pivotY - defaultLength, 0);

        this.group = new THREE.Group();
        this.group.position.set(pivotX, pivotY, 0);

        const wireGeometry = new THREE.CylinderGeometry(0.012, 0.012, 1, 8);
        wireGeometry.translate(0, -0.5, 0);

        this.leftWire = new THREE.Mesh(wireGeometry, wireMaterial);
        this.rightWire = new THREE.Mesh(wireGeometry, wireMaterial);
        this.leftWire.castShadow = true;
        this.rightWire.castShadow = true;

        this.ballGeometry = new THREE.SphereGeometry(0.5, 64, 64);
        this.ball = new THREE.Mesh(this.ballGeometry, chromeMaterial);
        this.initialMaterial = this.ball.material;
        this.ball.position.y = -defaultLength;
        this.ball.castShadow = true;
        this.ball.receiveShadow = true;

        this.group.add(this.leftWire);
        this.group.add(this.rightWire);
        this.group.add(this.ball);

        this.updateWires(defaultLength, zOffset, this.wireCount);
    }

    updateWires(length, zOffset, wireCount = this.wireCount ?? 2) {
        const actualWireLength = Math.sqrt(length * length + zOffset * zOffset);
        const angle = Math.atan2(zOffset, length);

        if (wireCount === 1) {
            this.leftWire.position.set(0, 0, 0);
            this.leftWire.rotation.x = 0;
            this.leftWire.scale.y = length;
            this.leftWire.visible = true;
            this.rightWire.visible = false;
            return;
        }

        this.leftWire.position.set(0, 0, zOffset);
        this.leftWire.rotation.x = angle;
        this.leftWire.scale.y = actualWireLength;
        this.leftWire.visible = true;

        this.rightWire.position.set(0, 0, -zOffset);
        this.rightWire.rotation.x = -angle;
        this.rightWire.scale.y = actualWireLength;
        this.rightWire.visible = true;
    }

    updateMaterial(restitution) {
        this.ball.material = visualMaterials[restitution] || visualMaterials['custom'];
    }
}