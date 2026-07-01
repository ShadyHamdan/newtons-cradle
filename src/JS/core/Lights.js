import * as THREE from 'three';

export function setupLights(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(6, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.normalBias = 0.04;
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 40;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    rimLight.position.set(-8, 8, -10);
    scene.add(rimLight);

    const topLight = new THREE.PointLight(0xffffff, 0.6, 40);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);
}