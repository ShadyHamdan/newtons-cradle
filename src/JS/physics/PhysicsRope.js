// /physics/PhysicsRope.js

export class PhysicsRope {
    constructor(startPos, endPos, options = {}) {
        this.numNodes = options.numNodes || 15;
        this.ropeLength = options.ropeLength || 5.0;
        this.ropeNodeMass = options.ropeNodeMass || 0.1;
        this.ballNodeMass = options.ballNodeMass || 15.0;
        this.gravity = options.gravity !== undefined ? options.gravity : -9.81;
        this.damping = options.damping !== undefined ? options.damping : 0.9;
        this.constraintIterations = options.constraintIterations || 5;
        this.bendStiffness = options.bendStiffness !== undefined ? options.bendStiffness : 0.85;

        // === إعدادات التصادم الجديدة ===
        this.ropeCollisionRadius = options.ropeCollisionRadius || 0.015;
        this.ropeRestitution = options.ropeRestitution || 0.4;
        this.enableSelfCollision = options.enableSelfCollision !== undefined ? options.enableSelfCollision : false;

        this.startPoint = startPos.clone();
        this.endPoint = endPos.clone();
        this.restLength = this.ropeLength / (this.numNodes - 1);

        this.nodes = [];
        this.constraints = [];
        this.bendConstraints = [];

        // قائمة التصادمات الخارجية (تُملأ من PhysicsEngine)
        this.externalColliders = []; // { type: 'rope'|'pillar'|'beam', nodes: []|pillar|beam }

        this.initNodes(startPos, endPos);
    }

    initNodes(startPos, endPos) {
        this.nodes = [];
        this.constraints = [];
        this.bendConstraints = [];

        for (let i = 0; i < this.numNodes; i++) {
            const t = i / (this.numNodes - 1);
            const x = startPos.x + (endPos.x - startPos.x) * t;
            const y = startPos.y + (endPos.y - startPos.y) * t;
            const z = startPos.z + (endPos.z - startPos.z) * t;

            this.nodes.push({
                position: { x, y, z },
                oldPosition: { x, y, z },
                isPinned: i === 0,
                isGrabbed: false,
                mass: (i === this.numNodes - 1) ? this.ballNodeMass : this.ropeNodeMass
            });
        }

        for (let i = 0; i < this.numNodes - 1; i++) {
            this.constraints.push({
                nodeA: this.nodes[i],
                nodeB: this.nodes[i + 1],
                length: this.restLength
            });
        }

        for (let i = 0; i < this.numNodes - 2; i++) {
            this.bendConstraints.push({
                nodeA: this.nodes[i],
                nodeB: this.nodes[i + 2],
                length: this.restLength * 2
            });
        }
    }

    // === دالة جديدة: إضافة مصادم خارجي ===
    addExternalCollider(type, data) {
        this.externalColliders.push({ type, data });
    }

    clearExternalColliders() {
        this.externalColliders = [];
    }

    update(dt) {
        if (dt <= 0) return;

        const gravityStep = this.gravity * dt * dt;

        // 1. Verlet Integration
        for (let i = 0; i < this.numNodes; i++) {
            const node = this.nodes[i];
            if (node.isPinned) continue;

            const vx = (node.position.x - node.oldPosition.x) * this.damping;
            const vy = (node.position.y - node.oldPosition.y) * this.damping;
            const vz = (node.position.z - node.oldPosition.z) * this.damping;

            node.oldPosition.x = node.position.x;
            node.oldPosition.y = node.position.y;
            node.oldPosition.z = node.position.z;

            node.position.x += vx;
            node.position.y += vy + gravityStep;
            node.position.z += vz;
        }

        // 2. حل القيود + التصادمات معاً (متكرر)
        for (let iteration = 0; iteration < this.constraintIterations; iteration++) {
            // 2أ. قيود الطول الأساسية
            this.solveLengthConstraints();
            
            // 2ب. قيود الانحناء
            this.solveBendConstraints();
            
            // 2ج. قيود التصادم الخارجية (الجديد!)
            this.solveExternalCollisions();
            
            // 2د. تصادم الحبل مع نفسه (اختياري)
            if (this.enableSelfCollision) {
                this.solveSelfCollision();
            }
        }
    }

    solveLengthConstraints() {
        for (let i = 0; i < this.constraints.length; i++) {
            const constraint = this.constraints[i];
            const nodeA = constraint.nodeA;
            const nodeB = constraint.nodeB;

            const dx = nodeB.position.x - nodeA.position.x;
            const dy = nodeB.position.y - nodeA.position.y;
            const dz = nodeB.position.z - nodeA.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

            const diff = constraint.length - dist;
            const percent = (diff / dist) * 0.5;

            const offsetX = dx * percent;
            const offsetY = dy * percent;
            const offsetZ = dz * percent;

            if (!nodeA.isPinned) {
                nodeA.position.x -= offsetX;
                nodeA.position.y -= offsetY;
                nodeA.position.z -= offsetZ;
            }
            if (!nodeB.isPinned) {
                nodeB.position.x += offsetX;
                nodeB.position.y += offsetY;
                nodeB.position.z += offsetZ;
            }
        }
    }

    solveBendConstraints() {
        for (let i = 0; i < this.bendConstraints.length; i++) {
            const constraint = this.bendConstraints[i];
            const nodeA = constraint.nodeA;
            const nodeB = constraint.nodeB;

            const dx = nodeB.position.x - nodeA.position.x;
            const dy = nodeB.position.y - nodeA.position.y;
            const dz = nodeB.position.z - nodeA.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

            const diff = constraint.length - dist;
            const percent = (diff / dist) * 0.5 * this.bendStiffness;

            const offsetX = dx * percent;
            const offsetY = dy * percent;
            const offsetZ = dz * percent;

            if (!nodeA.isPinned) {
                nodeA.position.x -= offsetX;
                nodeA.position.y -= offsetY;
                nodeA.position.z -= offsetZ;
            }
            if (!nodeB.isPinned) {
                nodeB.position.x += offsetX;
                nodeB.position.y += offsetY;
                nodeB.position.z += offsetZ;
            }
        }
    }

    // === دالة جديدة: حل التصادم مع العواميد والقضبان ===
    solveExternalCollisions() {
        for (const collider of this.externalColliders) {
            if (collider.type === 'pillar') {
                this.solvePillarCollision(collider.data);
            } else if (collider.type === 'beam') {
                this.solveBeamCollision(collider.data);
            } else if (collider.type === 'rope') {
                this.solveRopeCollision(collider.data);
            }
        }
    }

    solvePillarCollision(pillar) {
        const minY = pillar.yMin;
        const maxY = pillar.yMax;
        const radius = pillar.radius + this.ropeCollisionRadius;
        const radiusSq = radius * radius;

        for (let i = 1; i < this.numNodes - 1; i++) {
            const node = this.nodes[i];
            if (node.position.y < minY || node.position.y > maxY) continue;

            const dx = node.position.x - pillar.x;
            const dz = node.position.z - pillar.z;
            const distSq = dx * dx + dz * dz;

            if (distSq >= radiusSq) continue;

            const dist = Math.sqrt(distSq) || 0.0001;
            const penetration = radius - dist;

            // دفع العقدة خارج العامود
            const nx = dx / dist;
            const nz = dz / dist;

            if (!node.isPinned) {
                node.position.x += nx * penetration;
                node.position.z += nz * penetration;
            }

            // ارتداد: تعديل oldPosition لمحاكاة الارتداد
            const restitution = this.ropeRestitution;
            const velX = node.position.x - node.oldPosition.x;
            const velZ = node.position.z - node.oldPosition.z;
            const vDotN = velX * nx + velZ * nz;

            if (vDotN < 0) {
                const impulse = -(1 + restitution) * vDotN;
                node.oldPosition.x -= impulse * nx;
                node.oldPosition.z -= impulse * nz;
            }
        }
    }

    solveBeamCollision(beam) {
        const halfWidth = beam.halfWidth;
        const halfY = beam.halfHeight + this.ropeCollisionRadius;
        const halfZ = beam.halfDepth + this.ropeCollisionRadius;

        for (let i = 1; i < this.numNodes - 1; i++) {
            const node = this.nodes[i];
            if (Math.abs(node.position.x) > halfWidth + this.ropeCollisionRadius) continue;

            const dy = node.position.y - beam.y;
            const dz = node.position.z - beam.z;

            if (Math.abs(dy) > halfY || Math.abs(dz) > halfZ) continue;

            const penY = halfY - Math.abs(dy);
            const penZ = halfZ - Math.abs(dz);

            if (!node.isPinned) {
                if (penY < penZ) {
                    node.position.y += Math.sign(dy || 1) * penY;
                    
                    // ارتداد
                    const velY = node.position.y - node.oldPosition.y;
                    if (velY * Math.sign(dy || 1) < 0) {
                        node.oldPosition.y -= (1 + this.ropeRestitution) * velY;
                    }
                } else {
                    node.position.z += Math.sign(dz || 1) * penZ;
                    
                    // ارتداد
                    const velZ = node.position.z - node.oldPosition.z;
                    if (velZ * Math.sign(dz || 1) < 0) {
                        node.oldPosition.z -= (1 + this.ropeRestitution) * velZ;
                    }
                }
            }
        }
    }

    // === دالة جديدة: تصادم حبل-حبل مدمج ===
    solveRopeCollision(otherRope) {
        const otherRadius = otherRope?.ropeCollisionRadius ?? this.ropeCollisionRadius;
        const minDistance = Math.max(this.ropeCollisionRadius, otherRadius) * 2 + 0.005;
        const minDistSq = minDistance * minDistance;

        for (let i = 1; i < this.numNodes - 1; i++) {
            const nodeA = this.nodes[i];
            if (nodeA.isPinned) continue;

            for (let j = 1; j < otherRope.numNodes - 1; j++) {
                const nodeB = otherRope.nodes[j];
                if (nodeB.isPinned) continue;

                const dx = nodeB.position.x - nodeA.position.x;
                const dy = nodeB.position.y - nodeA.position.y;
                const dz = nodeB.position.z - nodeA.position.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq >= minDistSq || distSq < 1e-10) continue;

                const dist = Math.sqrt(distSq);
                const penetration = minDistance - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                const nz = dz / dist;

                // دفع متماثل
                const push = penetration * 0.5;
                nodeA.position.x -= nx * push;
                nodeA.position.y -= ny * push;
                nodeA.position.z -= nz * push;

                nodeB.position.x += nx * push;
                nodeB.position.y += ny * push;
                nodeB.position.z += nz * push;

                // ارتداد متبادل
                const velAx = nodeA.position.x - nodeA.oldPosition.x;
                const velAy = nodeA.position.y - nodeA.oldPosition.y;
                const velAz = nodeA.position.z - nodeA.oldPosition.z;

                const velBx = nodeB.position.x - nodeB.oldPosition.x;
                const velBy = nodeB.position.y - nodeB.oldPosition.y;
                const velBz = nodeB.position.z - nodeB.oldPosition.z;

                const relVx = velAx - velBx;
                const relVy = velAy - velBy;
                const relVz = velAz - velBz;

                const relativeNormalVel = relVx * nx + relVy * ny + relVz * nz;

                if (relativeNormalVel > 0.001) {
                    const restitution = 0.5;
                    const mA = nodeA.mass || 0.1;
                    const mB = nodeB.mass || 0.1;

                    const impulse = ((1 + restitution) * relativeNormalVel) / ((1 / mA) + (1 / mB));

                    nodeA.oldPosition.x -= (impulse / mA) * nx;
                    nodeA.oldPosition.y -= (impulse / mA) * ny;
                    nodeA.oldPosition.z -= (impulse / mA) * nz;

                    nodeB.oldPosition.x += (impulse / mB) * nx;
                    nodeB.oldPosition.y += (impulse / mB) * ny;
                    nodeB.oldPosition.z += (impulse / mB) * nz;
                }
            }
        }
    }

    // === دالة جديدة: تصادم الحبل مع نفسه (منع التشابك) ===
    solveSelfCollision() {
        const minDistance = this.ropeCollisionRadius * 4; // مسافة أكبر للتجنب الذاتي
        const minDistSq = minDistance * minDistance;

        for (let i = 1; i < this.numNodes - 3; i++) {
            const nodeA = this.nodes[i];
            if (nodeA.isPinned) continue;

            for (let j = i + 3; j < this.numNodes - 1; j++) {
                const nodeB = this.nodes[j];
                if (nodeB.isPinned) continue;

                const dx = nodeB.position.x - nodeA.position.x;
                const dy = nodeB.position.y - nodeA.position.y;
                const dz = nodeB.position.z - nodeA.position.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq >= minDistSq || distSq < 1e-10) continue;

                const dist = Math.sqrt(distSq);
                const penetration = minDistance - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                const nz = dz / dist;

                const push = penetration * 0.5;
                nodeA.position.x -= nx * push;
                nodeA.position.y -= ny * push;
                nodeA.position.z -= nz * push;

                nodeB.position.x += nx * push;
                nodeB.position.y += ny * push;
                nodeB.position.z += nz * push;
            }
        }
    }

    updateLength(newLength, currentStartPos, currentEndPos) {
        this.ropeLength = newLength;
        this.restLength = this.ropeLength / (this.numNodes - 1);

        if (this.nodes[0]) {
            this.nodes[0].position.x = currentStartPos.x;
            this.nodes[0].position.y = currentStartPos.y;
            this.nodes[0].position.z = currentStartPos.z;
            this.nodes[0].oldPosition.x = currentStartPos.x;
            this.nodes[0].oldPosition.y = currentStartPos.y;
            this.nodes[0].oldPosition.z = currentStartPos.z;
            this.nodes[0].isPinned = true;
        }

        const endNode = this.getEndNode();
        if (endNode) {
            endNode.position.x = currentEndPos.x;
            endNode.position.y = currentEndPos.y;
            endNode.position.z = currentEndPos.z;
            endNode.oldPosition.x = currentEndPos.x;
            endNode.oldPosition.y = currentEndPos.y;
            endNode.oldPosition.z = currentEndPos.z;
            endNode.isPinned = true;
        }

        for (let i = 0; i < this.constraints.length; i++) {
            this.constraints[i].length = this.restLength;
        }

        for (let i = 0; i < this.bendConstraints.length; i++) {
            this.bendConstraints[i].length = this.restLength * 2;
        }
    }

    getEndNode() {
        return this.nodes[this.numNodes - 1];
    }
}