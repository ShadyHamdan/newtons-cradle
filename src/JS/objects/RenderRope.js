// /graphics/RenderRope.js
import * as THREE from 'three';

export class RenderRope {
    /**
     * @param {THREE.Scene} scene - المشهد الأساسي لإضافة الحبل إليه
     * @param {Object} options - إعدادات المظهر الخاص بالحبل
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.tubeRadius = options.tubeRadius || 0.012;
        this.radialSegments = options.radialSegments || 8;
        this.tubeMaterial = options.tubeMaterial || new THREE.MeshStandardMaterial({ 
            color: 0xdddddd, 
            metalness: 0.7, 
            roughness: 0.2 
        });

        this.ropeMesh = null;
        this.ropeCurve = null;
        this.ropeGeometry = null;
    }

    initMesh(physicsNodes) {
        if (!physicsNodes || physicsNodes.length === 0) return;

        const points = physicsNodes.map(node => new THREE.Vector3(node.position.x, node.position.y, node.position.z));
        this.ropeCurve = new THREE.CatmullRomCurve3(points);
        
        this.ropeGeometry = new THREE.TubeGeometry(
            this.ropeCurve, 
            physicsNodes.length, 
            this.tubeRadius, 
            this.radialSegments, 
            false
        );
        
        this.ropeMesh = new THREE.Mesh(this.ropeGeometry, this.tubeMaterial);
        this.ropeMesh.castShadow = true;
        this.scene.add(this.ropeMesh);
    }

    update(physicsNodes) {
        if (!this.ropeMesh || !physicsNodes) return;

        physicsNodes.forEach((node, index) => {
            if (this.ropeCurve.points[index]) {
                this.ropeCurve.points[index].set(node.position.x, node.position.y, node.position.z);
            }
        });

        this.ropeGeometry.dispose(); 
        this.ropeGeometry = new THREE.TubeGeometry(
            this.ropeCurve, 
            physicsNodes.length, 
            this.tubeRadius, 
            this.radialSegments, 
            false
        );
        this.ropeMesh.geometry = this.ropeGeometry;
    }
}