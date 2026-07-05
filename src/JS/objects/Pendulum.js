// Pendulum.js
import * as THREE from 'three';
import { chromeMaterial, visualMaterials, getRopeStylePreset } from './Materials.js';
import { PhysicsRope } from '../physics/PhysicsRope.js';
import { RenderRope } from '../objects/RenderRope.js';
const REFERENCE_MASS = 1.0;
const SIZE_SENSITIVITY = 0.09;
const MIN_SCALE = 0.94;
const MAX_SCALE = 1.06;
export class Pendulum {
    constructor(pivotX, pivotY, defaultLength, zOffset, scene) {
        this.pivotX = pivotX;
        this.pivotY = pivotY;
        this.individualLength = defaultLength;
        this.individualMass = 1.0;
        this.individualRestitution = 0.98;
        this.zOffset = zOffset;
        this.wireCount = 2;
        this.ropeType = 'default';

        this.angle = 0;
        this.angleZ = 0;
        this.angularVelocity = 0;
        this.angularVelocityZ = 0;
        this.angularAcceleration = 0;
        this.angularAccelerationZ = 0;
        this.worldPosition = new THREE.Vector3(pivotX, pivotY - defaultLength, 0);

        this.group = new THREE.Group();
        this.group.position.set(pivotX, pivotY, 0);

        // إنشاء الكرة بنصف قطر 0.5
        this.ballGeometry = new THREE.SphereGeometry(0.5, 64, 64);
        this.ball = new THREE.Mesh(this.ballGeometry, chromeMaterial);
        this.initialMaterial = this.ball.material;
        this.ball.position.y = -defaultLength;
        this.ball.castShadow = true;
        this.ball.receiveShadow = true;
        this.group.add(this.ball);

        this.ropesPhysics = [];
        this.ropesRender = [];

        if (scene) {
            this.initPhysicsRopes(scene);
        }
    }

    initPhysicsRopes(scene) {
        const ballWorldPos = new THREE.Vector3();
        this.ball.getWorldPosition(ballWorldPos);

        if (this.wireCount === 1) {
            const pivot = new THREE.Vector3(this.pivotX, this.pivotY, 0);
            this.createRopePair(scene, pivot, ballWorldPos, this.ropeType);
        } else {
            const pivotLeft = new THREE.Vector3(this.pivotX, this.pivotY, this.zOffset);
            const pivotRight = new THREE.Vector3(this.pivotX, this.pivotY, -this.zOffset);

            this.createRopePair(scene, pivotLeft, ballWorldPos, this.ropeType);
            this.createRopePair(scene, pivotRight, ballWorldPos, this.ropeType);
        }
    }

    createRopePair(scene, startPos, endPos, ropeType = 'default') {
        const ropePreset = getRopeStylePreset(ropeType);
        // طرح 0.5 (نصف قطر الكرة) حتى لا يرتخي الحبل فيزيائياً
        const actualRopeLength = this.individualLength - 0.5;

        const pRope = new PhysicsRope(startPos, endPos, {
            numNodes: ropePreset.numNodes,
            ropeLength: actualRopeLength,
            constraintIterations: 20,
            gravity: ropePreset.gravity,
            damping: ropePreset.damping,
            bendStiffness: ropePreset.bendStiffness,
            ropeCollisionRadius: ropePreset.ropeCollisionRadius,
            ropeRestitution: ropePreset.ropeRestitution
        });

        const rRope = new RenderRope(scene, {
            tubeRadius: ropePreset.tubeRadius,
            radialSegments: ropePreset.radialSegments,
            tubeMaterial: ropePreset.material
        });
        rRope.initMesh(pRope.nodes);

        pRope.ropeType = ropeType;
        rRope.ropeType = ropeType;

        this.ropesPhysics.push(pRope);
        this.ropesRender.push(rRope);
    }

    updateRopeType(ropeType) {
        const ropePreset = getRopeStylePreset(ropeType);
        this.ropeType = ropeType;

        this.ropesPhysics.forEach((rope) => {
            if (!rope) return;
            rope.ropeType = ropeType;
            rope.ropeCollisionRadius = ropePreset.ropeCollisionRadius;
            rope.ropeRestitution = ropePreset.ropeRestitution;
            rope.gravity = ropePreset.gravity;
            rope.damping = ropePreset.damping;
            rope.bendStiffness = ropePreset.bendStiffness;
        });

        this.ropesRender.forEach((rope) => {
            if (!rope) return;
            rope.ropeType = ropeType;
            rope.tubeRadius = ropePreset.tubeRadius;
            rope.radialSegments = ropePreset.radialSegments;
            rope.tubeMaterial = ropePreset.material;
            if (rope.ropeMesh) {
                rope.ropeMesh.material = ropePreset.material;
            }
        });
    }

    updateMaterial(restitution) {
        this.ball.material = visualMaterials[restitution] || visualMaterials['custom'];
    }
    /**
         * تحديث حجم الكرة بصريًا بناءً على الكتلة، بنمو مستمر وتدريجي
         * (لوغاريتمي) طوال مدى الكتلة بالكامل، بتأثير خفيف وغير مبالغ فيه.
         */
    updateBallSize(mass) {
        const safeMass = Math.max(mass, 0.01); // تفادي log(0) أو أرقام سالبة
        const rawScale = 1 + SIZE_SENSITIVITY * Math.log10(safeMass / REFERENCE_MASS);
        const clampedScale = THREE.MathUtils.clamp(rawScale, MIN_SCALE, MAX_SCALE);
        this.ball.scale.setScalar(clampedScale);
    }
}