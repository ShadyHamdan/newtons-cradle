import * as THREE from 'three';

function createCanvasTexture(pattern, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pattern === 'steel') {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[2]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 6;
        for (let i = -canvas.height; i < canvas.width; i += 60) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 180, canvas.height);
            ctx.stroke(); 
        }
    } else if (pattern === 'glass') {
        const gradient = ctx.createRadialGradient(canvas.width * 0.3, canvas.height * 0.25, 40, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.7);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.4, '#d8f3ff');
        gradient.addColorStop(1, '#7ec8ff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = 0.18;
        for (let i = 0; i < 2200; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2.2;
            ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.4})`;
            ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
    } else if (pattern === 'rubber') {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 2600; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 5;
            ctx.fillStyle = i % 3 === 0 ? '#6b6b6b' : '#1f1f1f';
            ctx.fillRect(x, y, size, size);
        }
    } else if (pattern === 'wood') {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#6e3b16');
        gradient.addColorStop(0.5, '#a45a1c');
        gradient.addColorStop(1, '#4f2a0d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 4;
        for (let i = 0; i < canvas.width; i += 18) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.quadraticCurveTo(i + 6, canvas.height / 2, i, canvas.height);
            ctx.stroke();
        }
    } else if (pattern === 'rope-default') {
        const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        base.addColorStop(0, '#c9c2b8');
        base.addColorStop(0.5, '#a89f94');
        base.addColorStop(1, '#d8d2c8');
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(70,60,52,0.32)';
        ctx.lineWidth = 10;
        for (let i = -canvas.height; i < canvas.width + canvas.height; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 120, canvas.height);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 4;
        for (let i = 0; i < canvas.width; i += 36) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 18, canvas.height);
            ctx.stroke();
        }
    } else if (pattern === 'rope-nylon') {
        const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        base.addColorStop(0, '#f6fbff');
        base.addColorStop(0.45, '#bfe5ff');
        base.addColorStop(1, '#7dbcf0');
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = 0.9;
        for (let i = 0; i < canvas.width; i += 24) {
            ctx.strokeStyle = i % 48 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(65,120,180,0.22)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 60, canvas.height);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    } else if (pattern === 'rope-cable') {
        const base = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        base.addColorStop(0, '#5f6770');
        base.addColorStop(0.45, '#90979f');
        base.addColorStop(1, '#2f353c');
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 8;
        for (let i = -40; i < canvas.width + 40; i += 18) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 70, canvas.height);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 3;
        for (let i = 0; i < canvas.width; i += 14) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 45, canvas.height);
            ctx.stroke();
        }
    } else {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#5b9cff');
        gradient.addColorStop(0.5, '#7a4dff');
        gradient.addColorStop(1, '#16d6e8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(canvas.width * 0.7, canvas.height * 0.3, 180, 0, Math.PI * 2);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = 4;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createTexturedMaterial(type, options = {}) {
    const preset = {
        steel: {
            color: '#dcdcdc',
            metalness: 1,
            roughness: 0.12,
            clearcoat: 1,
            clearcoatRoughness: 0.02,
            envMapIntensity: 1.3,
            texture: createCanvasTexture('steel', ['#4a4a4a', '#d8d8d8', '#7c7c7c'])
        },
        glass: {
            color: '#cfefff',
            metalness: 0.05,
            roughness: 0.02,
            transparent: true,
            opacity: 0.8,
            transmission: 0.9,
            ior: 1.4,
            thickness: 0.6,
            texture: createCanvasTexture('glass')
        },
        rubber: {
            color: '#2f2f2f',
            metalness: 0.0,
            roughness: 0.95,
            texture: createCanvasTexture('rubber')
        },
        wood: {
            color: '#8b4d1f',
            metalness: 0.0,
            roughness: 0.8,
            texture: createCanvasTexture('wood')
        },
        custom: {
            color: '#5b9cff',
            metalness: 0.3,
            roughness: 0.35,
            texture: createCanvasTexture('custom')
        }
    }[type] || preset.steel;

    return new THREE.MeshPhysicalMaterial({
        ...preset,
        ...options,
        map: preset.texture || options.map || null
    });
}

export const chromeMaterial = createTexturedMaterial('steel');
export const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.2 });
export const wireMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.6, metalness: 0.1 });

const ropeMaterialPresets = {
    default: new THREE.MeshStandardMaterial({
        color: 0xb8b0a4,
        roughness: 0.92,
        metalness: 0.02,
        map: createCanvasTexture('rope-default')
    }),
    nylon: new THREE.MeshStandardMaterial({
        color: 0xe7f5ff,
        roughness: 0.28,
        metalness: 0.02,
        transparent: true,
        opacity: 0.68,
        emissive: 0x1a3550,
        emissiveIntensity: 0.12,
        map: createCanvasTexture('rope-nylon')
    }),
    cable: new THREE.MeshStandardMaterial({
        color: 0x8d949d,
        roughness: 0.16,
        metalness: 1.0,
        envMapIntensity: 1.4,
        map: createCanvasTexture('rope-cable')
    })
};

export const ropeMaterials = ropeMaterialPresets;

export const ropeStylePresets = {
    default: {
        label: 'افتراضي',
        tubeRadius: 0.011,
        radialSegments: 8,
        ropeCollisionRadius: 0.015,
        ropeRestitution: 0.38,
        gravity: -0.24,
        damping: 0.82,
        bendStiffness: 0.88,
        motionGain: 1.00,
        motionDamping: 1.00,
        numNodes: 8,
        material: ropeMaterialPresets.default
    },
    nylon: {
        label: 'نايلون',
        tubeRadius: 0.015,
        radialSegments: 10,
        ropeCollisionRadius: 0.018,
        ropeRestitution: 0.66,
        gravity: -0.14,
        damping: 0.92,
        bendStiffness: 0.70,
        motionGain: 1.28,
        motionDamping: 0.995,
        numNodes: 8,
        material: ropeMaterialPresets.nylon
    },
    cable: {
        label: 'فولاذ مجدول',
        tubeRadius: 0.017,
        radialSegments: 12,
        ropeCollisionRadius: 0.020,
        ropeRestitution: 0.72,
        gravity: -0.10,
        damping: 0.94,
        bendStiffness: 0.995,
        motionGain: 0.84,
        motionDamping: 0.997,
        numNodes: 10,
        material: ropeMaterialPresets.cable
    }
};

export function getRopeStylePreset(type) {
    return ropeStylePresets[type] || ropeStylePresets.default;
}

export const visualMaterials = {
    0.98: createTexturedMaterial('steel'),
    0.92: createTexturedMaterial('glass'),
    0.80: createTexturedMaterial('rubber'),
    0.50: createTexturedMaterial('wood'),
    custom: createTexturedMaterial('custom')
};