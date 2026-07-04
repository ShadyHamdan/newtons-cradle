// Pendulum.js
import * as THREE from 'three';
import { chromeMaterial, visualMaterials } from './Materials.js';
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
            this.createRopePair(scene, pivot, ballWorldPos);
        } else {
            const pivotLeft = new THREE.Vector3(this.pivotX, this.pivotY, this.zOffset);
            const pivotRight = new THREE.Vector3(this.pivotX, this.pivotY, -this.zOffset);

            this.createRopePair(scene, pivotLeft, ballWorldPos);
            this.createRopePair(scene, pivotRight, ballWorldPos);
        }
    }

    createRopePair(scene, startPos, endPos) {
        // طرح 0.5 (نصف قطر الكرة) حتى لا يرتخي الحبل فيزيائياً
        const actualRopeLength = this.individualLength - 0.5;

        const pRope = new PhysicsRope(startPos, endPos, {
            // تقليل عدد العقد من 15 إلى 8: عدد أقل من الأجزاء المتصلة يعني درجات حرية أقل
            // للاهتزاز العشوائي، وبالتالي حبل يبدو أكثر صلابة واستقامة بشكل طبيعي
            numNodes: 8,
            ropeLength: actualRopeLength,
            // زيادة عدد تكرارات حل القيد يجعل الحبل أكثر صلابة وشدًا (أقل "طراوة")
            // القيمة الافتراضية كانت 5 فقط وهي قليلة جداً مقابل 14 قطعة حبل متتالية
            constraintIterations: 20,
            // خيوط بندول نيوتن الحقيقية مشدودة ولا تتهدّل بفعل جاذبيتها الذاتية تقريباً؛
            // تقليل الجاذبية الداخلية للحبل يمنع الترهل الزائد بين نقطتي التثبيت والكرة
            gravity: -0.25,
            // تخميد أقوى (0.8) يمتص اهتزاز الحبل العشوائي بسرعة أكبر بعد أي حركة أو صدمة
            damping: 0.8,
            // مقاومة انحناء عالية (قريبة من 1) تمنع الحبل من التموّج كالمطاط بين نقطتي التثبيت
            bendStiffness: 0.9
        });

        const rRope = new RenderRope(scene, { tubeRadius: 0.012 });
        rRope.initMesh(pRope.nodes);

        this.ropesPhysics.push(pRope);
        this.ropesRender.push(rRope);
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