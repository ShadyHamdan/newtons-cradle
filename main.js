import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ======================================================
// Scene
// ======================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 18, 40);

// ======================================================
// Camera
// ======================================================

const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(0, 3, 15);

// ======================================================
// Renderer
// ======================================================

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.1;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

// ======================================================
// Controls
// ======================================================

const controls =
    new OrbitControls(
        camera,
        renderer.domElement
    );

controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.minDistance = 6;
controls.maxDistance = 24;

controls.maxPolarAngle = Math.PI / 2;

controls.target.set(0, 2, 0);

// ======================================================
// Lights
// ======================================================

const ambientLight =
    new THREE.AmbientLight(
        0xffffff,
        0.4
    );

scene.add(ambientLight);

const keyLight =
    new THREE.DirectionalLight(
        0xffffff,
        2.2
    );

keyLight.position.set(10, 16, 10);

keyLight.castShadow = true;

keyLight.shadow.mapSize.width = 4096;
keyLight.shadow.mapSize.height = 4096;

keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far = 60;

keyLight.shadow.camera.left = -15;
keyLight.shadow.camera.right = 15;

keyLight.shadow.camera.top = 15;
keyLight.shadow.camera.bottom = -15;

scene.add(keyLight);

const rimLight =
    new THREE.DirectionalLight(
        0x4488ff,
        0.5
    );

rimLight.position.set(-8, 8, -10);

scene.add(rimLight);

const topLight =
    new THREE.PointLight(
        0xffffff,
        0.6,
        40
    );

topLight.position.set(0, 10, 0);

scene.add(topLight);


//////////////////////////////////////////////////////////////////SHADI/////////////////////////////
// ======================================================
// Floor
// ======================================================

const floorGeometry =
    new THREE.PlaneGeometry(80, 80);

const floorMaterial =
    new THREE.MeshStandardMaterial({

        color: 0x111111,

        roughness: 0.9,

        metalness: 0.05
    });

const floor =
    new THREE.Mesh(
        floorGeometry,
        floorMaterial
    );

floor.rotation.x = -Math.PI / 2;

floor.position.y = -1.2;

floor.receiveShadow = true;

scene.add(floor);

// ======================================================
// Physics Config
// ======================================================

const FIXED_DT = 1 / 240;

const settings = {

    gravity: 9.81,

    restitution: 0.995,

    airDamping: 0.9994,

    stringLength: 5,

    mass: 1,

    launchAngle:
        THREE.MathUtils.degToRad(45),

    launchCount: 1,

    launchMode: 'single',

    sound: true,

};

const pendingSettings = {

    stringLength:
        settings.stringLength,

    mass:
        settings.mass
};

const BALL_COUNT = 5;

const BALL_RADIUS = 0.5;

const DIAMETER =
    BALL_RADIUS * 2;

const PIVOT_Y = 5;

// ======================================================
// Materials
// ======================================================

const chromeMaterial =
    new THREE.MeshPhysicalMaterial({

        color: 0xd9d9d9,

        metalness: 1,

        roughness: 0.07,

        clearcoat: 1,

        clearcoatRoughness: 0.03,

        envMapIntensity: 1.5
    });

const frameMaterial =
    new THREE.MeshStandardMaterial({

        color: 0x444444,

        metalness: 0.85,

        roughness: 0.3
    });

const wireMaterial =
    new THREE.LineBasicMaterial({

        color: 0xffffff
    });

// ======================================================
// Frame
// ======================================================

const frame = new THREE.Group();

scene.add(frame);

const width =
    BALL_COUNT * DIAMETER + 2;

const pillarGeometry =
    new THREE.CylinderGeometry(
        0.12,
        0.12,
        6.5,
        24
    );

const beamGeometry =
    new THREE.BoxGeometry(
        width,
        0.2,
        0.2
    );

const pillarPositions = [

    [-width / 2, 2, 1.4],
    [width / 2, 2, 1.4],

    [-width / 2, 2, -1.4],
    [width / 2, 2, -1.4]
];

pillarPositions.forEach(pos => {

    const pillar =
        new THREE.Mesh(
            pillarGeometry,
            frameMaterial
        );

    pillar.position.set(...pos);

    pillar.castShadow = true;

    frame.add(pillar);
});

const beamFront =
    new THREE.Mesh(
        beamGeometry,
        frameMaterial
    );

beamFront.position.set(
    0,
    PIVOT_Y,
    1.4
);

beamFront.castShadow = true;

frame.add(beamFront);

const beamBack = beamFront.clone();

beamBack.position.z = -1.4;

frame.add(beamBack);

// ======================================================
// Pendulums
// ======================================================

const pendulums = [];

const startX =
    -((BALL_COUNT - 1) * DIAMETER) / 2;

for (let i = 0; i < BALL_COUNT; i++) {

    const pivotX =
        startX + i * DIAMETER;

    const group =
        new THREE.Group();

    group.position.set(
        pivotX,
        PIVOT_Y,
        0
    );

    scene.add(group);

    const leftWireGeometry =
        new THREE.BufferGeometry()
            .setFromPoints([
                new THREE.Vector3(0, 0, 1.4),

                new THREE.Vector3(
                    0,
                    -settings.stringLength,
                    0
                )
            ]);

    const rightWireGeometry =
        new THREE.BufferGeometry()
            .setFromPoints([
                new THREE.Vector3(0, 0, -1.4),

                new THREE.Vector3(
                    0,
                    -settings.stringLength,
                    0
                )
            ]);

    const leftWire =
        new THREE.Line(
            leftWireGeometry,
            wireMaterial
        );

    const rightWire =
        new THREE.Line(
            rightWireGeometry,
            wireMaterial
        );

    group.add(leftWire);
    group.add(rightWire);

    const ballGeometry =
        new THREE.SphereGeometry(
            BALL_RADIUS,
            64,
            64
        );

    const ball =
        new THREE.Mesh(
            ballGeometry,
            chromeMaterial
        );

    ball.position.y =
        -settings.stringLength;

    ball.castShadow = true;
    ball.receiveShadow = true;

    group.add(ball);

    
    pendulums.push({

        group,

        ball,

        leftWire,

        rightWire,

        pivotX,

        angle: 0,

        angularVelocity: 0,

        angularAcceleration: 0,

        worldPosition:
            new THREE.Vector3(),

        velocityX: 0
    });
}

// ======================================================
// Initial Motion
// ======================================================

applyLaunchConfiguration();

function applyLaunchConfiguration() {

    for (const p of pendulums) {

        p.angle = 0;

        p.angularVelocity = 0;

        p.angularAcceleration = 0;
    }

    if (settings.launchMode === 'single') {

        for (
            let i = 0;
            i < settings.launchCount;
            i++
        ) {

            pendulums[i].angle =
                -settings.launchAngle;
        }
    }

    else if (
        settings.launchMode === 'double'
    ) {

        for (
            let i = 0;
            i < settings.launchCount;
            i++
        ) {

            pendulums[i].angle =
                -settings.launchAngle;
        }

        for (
            let i = 0;
            i < settings.launchCount;
            i++
        ) {

            const index =
                BALL_COUNT - 1 - i;

            pendulums[index].angle =
                settings.launchAngle;
        }
    }
}

// ======================================================
// Audio
// ======================================================

const audioContext =
    new (
        window.AudioContext
        ||
        window.webkitAudioContext
    )();

function playCollisionSound(intensity) {

    if (!settings.sound) return;

    const oscillator =
        audioContext.createOscillator();

    const gainNode =
        audioContext.createGain();

    oscillator.type = 'triangle';

    oscillator.frequency.value = 8500;

    gainNode.gain.value =
        Math.min(
            0.12,
            intensity * 0.04
        );

    oscillator.connect(gainNode);

    gainNode.connect(
        audioContext.destination
    );

    oscillator.start();

    gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.08
    );

    oscillator.stop(
        audioContext.currentTime + 0.08
    );
}

// ======================================================
// UI
// ======================================================

const gravityInput =
    document.getElementById(
        'gravityInput'
    );

const gravityValue =
    document.getElementById(
        'gravityValue'
    );

const restitutionInput =
    document.getElementById(
        'restitutionInput'
    );

const restitutionValue =
    document.getElementById(
        'restitutionValue'
    );

const dampingInput =
    document.getElementById(
        'dampingInput'
    );

const dampingValue =
    document.getElementById(
        'dampingValue'
    );

const lengthInput =
    document.getElementById(
        'lengthInput'
    );

const lengthValue =
    document.getElementById(
        'lengthValue'
    );

const massInput =
    document.getElementById(
        'massInput'
    );

const massValue =
    document.getElementById(
        'massValue'
    );

const launchCountInput =
    document.getElementById(
        'launchCountInput'
    );

const launchCountValue =
    document.getElementById(
        'launchCountValue'
    );

const launchAngleInput =
    document.getElementById(
        'launchAngleInput'
    );

const launchAngleValue =
    document.getElementById(
        'launchAngleValue'
    );

const singleSideBtn =
    document.getElementById(
        'singleSideBtn'
    );

const doubleSideBtn =
    document.getElementById(
        'doubleSideBtn'
    );

const soundToggle =
    document.getElementById(
        'soundToggle'
    );

const applyBtn =
    document.getElementById(
        'applyBtn'
    );

const resetBtn =
    document.getElementById(
        'resetBtn'
    );

// ======================================================
// Events
// ======================================================

gravityInput.addEventListener(
    'input',
    () => {

        settings.gravity =
            parseFloat(
                gravityInput.value
            );

        gravityValue.textContent =
            settings.gravity.toFixed(2);
    }
);

restitutionInput.addEventListener(
    'input',
    () => {

        settings.restitution =
            parseFloat(
                restitutionInput.value
            );

        restitutionValue.textContent =
            settings.restitution.toFixed(3);
    }
);

dampingInput.addEventListener(
    'input',
    () => {

        settings.airDamping =
            parseFloat(
                dampingInput.value
            );

        dampingValue.textContent =
            settings.airDamping.toFixed(4);
    }
);


lengthInput.addEventListener(
    'input',
    () => {

        pendingSettings.stringLength =
            parseFloat(
                lengthInput.value
            );

        lengthValue.textContent =
            pendingSettings
                .stringLength
                .toFixed(1);
    }
);

massInput.addEventListener(
    'input',
    () => {

        pendingSettings.mass =
            parseFloat(
                massInput.value
            );

        massValue.textContent =
            pendingSettings
                .mass
                .toFixed(1);
    }
);

launchCountInput.addEventListener(
    'input',
    () => {

        settings.launchCount =
            parseInt(
                launchCountInput.value
            );

        launchCountValue.textContent =
            settings.launchCount;
    }
);

launchAngleInput.addEventListener(
    'input',
    () => {

        const degrees =
            parseFloat(
                launchAngleInput.value
            );

        settings.launchAngle =
            THREE.MathUtils.degToRad(
                degrees
            );

        launchAngleValue.textContent =
            degrees.toFixed(0);
    }
);

singleSideBtn.addEventListener(
    'click',
    () => {

        settings.launchMode =
            'single';

        singleSideBtn.classList.add(
            'active'
        );

        doubleSideBtn.classList.remove(
            'active'
        );
    }
);

doubleSideBtn.addEventListener(
    'click',
    () => {

        settings.launchMode =
            'double';

        doubleSideBtn.classList.add(
            'active'
        );

        singleSideBtn.classList.remove(
            'active'
        );
    }
);

soundToggle.addEventListener(
    'change',
    () => {

        settings.sound =
            soundToggle.checked;
    }
);


applyBtn.addEventListener(
    'click',
    applyPendingChanges
);

resetBtn.addEventListener(
    'click',
    resetSimulation
);

// ======================================================
// Apply Changes
// ======================================================

function applyPendingChanges() {

    settings.stringLength =
        pendingSettings.stringLength;

    settings.mass =
        pendingSettings.mass;

    for (const p of pendulums) {

        p.ball.position.y =
            -settings.stringLength;

        const leftPositions =
            p.leftWire.geometry
                .attributes
                .position
                .array;

        leftPositions[4] =
            -settings.stringLength;

        p.leftWire.geometry
            .attributes
            .position
            .needsUpdate = true;

        const rightPositions =
            p.rightWire.geometry
                .attributes
                .position
                .array;

        rightPositions[4] =
            -settings.stringLength;

        p.rightWire.geometry
            .attributes
            .position
            .needsUpdate = true;
    }

    resetSimulation();
}

// ======================================================
// Reset
// ======================================================

function resetSimulation() {

    applyLaunchConfiguration();
}

// ======================================================
// Physics
// ======================================================

function updatePendulumPhysics(p) {

    p.angularAcceleration =

        -(
            settings.gravity
            /
            settings.stringLength
        )

        * Math.sin(p.angle);

    p.angularVelocity +=

        p.angularAcceleration
        * FIXED_DT;

    p.angularVelocity *=
        settings.airDamping;

    p.angle +=
        p.angularVelocity
        * FIXED_DT;
}

function updatePendulumTransform(p) {

    p.group.rotation.z =
        p.angle;

    const x =

        p.pivotX

        +

        Math.sin(p.angle)
        * settings.stringLength;

    const y =

        PIVOT_Y

        -

        Math.cos(p.angle)
        * settings.stringLength;

    p.worldPosition.set(x, y, 0);

    p.velocityX =

        Math.cos(p.angle)

        * settings.stringLength

        * p.angularVelocity;
}

function solveCollisions() {

    for (let i = 0; i < BALL_COUNT - 1; i++) {

        const p1 = pendulums[i];
        const p2 = pendulums[i + 1];

        const dx =
            p2.worldPosition.x -
            p1.worldPosition.x;

        const distance = Math.abs(dx);

        if (distance < DIAMETER) {

            const overlap =
                DIAMETER - distance;

            const direction =
                dx >= 0 ? 1 : -1;

            const correction =
                overlap * 0.5;

            p1.angle -=
                (correction * direction)
                / settings.stringLength;

            p2.angle +=
                (correction * direction)
                / settings.stringLength;

            const v1 = p1.velocityX;
            const v2 = p2.velocityX;

            const relativeVelocity =
                v1 - v2;

            if (relativeVelocity > 0) {

                const e =
                    settings.restitution;

                const m1 =
                    settings.mass;

                const m2 =
                    settings.mass;

                const newV1 = (

                    (m1 - e * m2) * v1
                    +
                    (1 + e) * m2 * v2

                ) / (m1 + m2);

                const newV2 = (

                    (m2 - e * m1) * v2
                    +
                    (1 + e) * m1 * v1

                ) / (m1 + m2);

                p1.velocityX = newV1;
                p2.velocityX = newV2;

                p1.angularVelocity =

                    p1.velocityX
                    /
                    (
                        settings.stringLength
                        *
                        Math.max(
                            0.15,
                            Math.cos(p1.angle)
                        )
                    );

                p2.angularVelocity =

                    p2.velocityX
                    /
                    (
                        settings.stringLength
                        *
                        Math.max(
                            0.15,
                            Math.cos(p2.angle)
                        )
                    );

                playCollisionSound(
                    Math.abs(relativeVelocity)
                );
            }
        }
    }
}



// ======================================================
// Clock
// ======================================================

const clock =
    new THREE.Clock();

let accumulator = 0;

// ======================================================
// Animate
// ======================================================

function animate() {

    requestAnimationFrame(
        animate
    );

    const delta =
    clock.getDelta() * 2;

    accumulator += delta;

    while (
        accumulator >= FIXED_DT
    ) {

        for (const p of pendulums) {

            updatePendulumPhysics(p);
        }

        for (const p of pendulums) {

            updatePendulumTransform(p);
        }

        solveCollisions();

        accumulator -= FIXED_DT;
    }

    
    controls.update();

    renderer.render(
        scene,
        camera
    );
}

animate();

// ======================================================
// Resize
// ======================================================

window.addEventListener(
    'resize',
    () => {

        camera.aspect =

            window.innerWidth
            /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
);

