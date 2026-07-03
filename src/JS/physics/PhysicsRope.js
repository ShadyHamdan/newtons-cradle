// /physics/PhysicsRope.js

export class PhysicsRope {
    /**
     * @param {Object} startPos - المتجه الابتدائي لنقطة التثبيت {x, y, z}
     * @param {Object} endPos - المتجه الابتدائي لنقطة النهاية (موقع الكرة) {x, y, z}
     * @param {Object} options - إعدادات الحبل الفيزيائية
     */
    constructor(startPos, endPos, options = {}) {
    this.numNodes = options.numNodes || 15;
    this.ropeLength = options.ropeLength || 5.0;
    this.ropeNodeMass = options.ropeNodeMass || 0.1;
    this.ballNodeMass = options.ballNodeMass || 15.0;
        // إعدادات المحاكاة الفيزيائية للحبل (Verlet Integration)
        this.gravity = options.gravity !== undefined ? options.gravity : -9.81;
        // تقليل قيمة damping (أقرب للصفر = تخميد أقوى) يمتص الطاقة الزائدة بسرعة أكبر
        // فيمنع اهتزاز الحبل العشوائي المستمر بعد كل صدمة أو حركة، بدلاً من القيمة القديمة
        // (0.995) التي كانت تسمح للطاقة بالبقاء في النظام لفترة طويلة جداً (مظهر "مرتخي")
        this.damping = options.damping !== undefined ? options.damping : 0.9;
        this.constraintIterations = options.constraintIterations || 5; // عدد التكرارات لحل مرونة وشد الحبل

        // قوة قيود "مقاومة الانحناء" (Bending Stiffness): تربط كل عقدة بالعقدة التي تليها بعقدتين
        // بدلاً من عقدة واحدة فقط، فتمنع الحبل من التموّج بشكل حر (S-Curve) بين نقطتي التثبيت
        // وتجعله يحافظ على استقامة شبه صلبة تحاكي خيط بندول نيوتن الحقيقي المشدود
        this.bendStiffness = options.bendStiffness !== undefined ? options.bendStiffness : 0.85;

        this.startPoint = startPos.clone();
        this.endPoint = endPos.clone();
        this.restLength = this.ropeLength / (this.numNodes - 1);

        this.nodes = [];
        this.constraints = [];
        this.bendConstraints = [];

        this.initNodes(startPos, endPos);
    }

    initNodes(startPos, endPos) {
        this.nodes = [];
        this.constraints = [];
        this.bendConstraints = [];

        for (let i = 0; i < this.numNodes; i++) {
            const t = i / (this.numNodes - 1);

            // توزيع العقد خطياً بين البداية والنهاية
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

        // قيود الانحناء (Bend Constraints): تربط كل عقدة بالعقدة i+2 بطول يساوي ضعف المسافة الأصلية
        // هذا يمنع الحبل من الانطواء محلياً بشكل مبالغ فيه ويعطيه إحساس "الصلابة" المطلوب
        for (let i = 0; i < this.numNodes - 2; i++) {
            this.bendConstraints.push({
                nodeA: this.nodes[i],
                nodeB: this.nodes[i + 2],
                length: this.restLength * 2
            });
        }
    }

    /**
     * الدالة الأساسية لتحديث حركة الحبل ميكانيكياً (يجب استدعاؤها في كل إطار Frame في الـ Game Loop)
     * @param {number} dt - فارق التوقيت (Time Step) مثل 0.016 لـ 60 إطار بالثانية
     */
    update(dt) {
        if (dt <= 0) return;

        // تجميعة قوى الجاذبية المؤثرة على كل عقدة بشكل مستقل
        const gravityStep = this.gravity * dt * dt;

        // 1. مرحلة التكامل الرياضي (Verlet Integration) حساب الحركة والسرعة من فروق المواقع
        for (let i = 0; i < this.numNodes; i++) {
            const node = this.nodes[i];

            if (node.isPinned) continue; // نقطة التثبيت العلوية لا تتحرك بالجاذبية

            // حساب السرعة الحالية بناءً على الموقع السابق والتعجيل
            const vx = (node.position.x - node.oldPosition.x) * this.damping;
            const vy = (node.position.y - node.oldPosition.y) * this.damping;
            const vz = (node.position.z - node.oldPosition.z) * this.damping;

            // حفظ الموقع الحالي ليصبح هو الموقع القديم للإطار القادم
            node.oldPosition.x = node.position.x;
            node.oldPosition.y = node.position.y;
            node.oldPosition.z = node.position.z;

            // تطبيق الحركة والجاذبية في الموقع الجديد
            node.position.x += vx;
            node.position.y += vy + gravityStep;
            node.position.z += vz;
        }

        // 2. مرحلة حل القيود (Solve Constraints) للحفاظ على مسافات الحبل ثابتة ومنع تمدده كالمطاط
        for (let iteration = 0; iteration < this.constraintIterations; iteration++) {
            for (let i = 0; i < this.constraints.length; i++) {
                const constraint = this.constraints[i];
                const nodeA = constraint.nodeA;
                const nodeB = constraint.nodeB;

                // حساب المسافة الحالية بين العقدتين المتتاليتين
                const dx = nodeB.position.x - nodeA.position.x;
                const dy = nodeB.position.y - nodeA.position.y;
                const dz = nodeB.position.z - nodeA.position.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

                // نسبة الخطأ والتداخل مقارنة بالطول المسموح به
                const diff = constraint.length - dist;
                const percent = (diff / dist) * 0.5; // كل عقدة تتحرك نصف المسافة لإصلاح الخطأ متزناً

                const offsetX = dx * percent;
                const offsetY = dy * percent;
                const offsetZ = dz * percent;

                // دفع العقدتين لإصلاح التمدد (إلا إذا كانت العقدة مثبتة)
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

            // 2ب. حل قيود الانحناء (Bend Constraints) بنسبة تصحيح جزئية (bendStiffness)
            // هذا يمنح الحبل صلابة إضافية ضد التموّج المحلي دون تحويله لقضيب صلب بالكامل
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
    }

    /**
     * دالة لتحديث طول الحبل ديناميكياً من الـ UI
     * @param {number} newLength - الطول الجديد القادم من الواجهة
     * @param {Object} currentStartPos - الموضع الحالي لنقطة التثبيت
     * @param {Object} currentEndPos - الموضع الجديد المفترض للكرة بناءً على الطول الجديد
     */
    updateLength(newLength, currentStartPos, currentEndPos) {
        this.ropeLength = newLength;
        // 1. إعادة حساب المسافة الفاصلة الجديدة بين العقد
        this.restLength = this.ropeLength / (this.numNodes - 1);

        // 2. تحديث نقطة البداية والنهاية فقط للحفاظ على التثبيت
        if (this.nodes[0]) {
            this.nodes[0].position.x = currentStartPos.x;
            this.nodes[0].position.y = currentStartPos.y;
            this.nodes[0].position.z = currentStartPos.z;
        }

        const endNode = this.getEndNode();
        if (endNode) {
            endNode.position.x = currentEndPos.x;
            endNode.position.y = currentEndPos.y;
            endNode.position.z = currentEndPos.z;
        }

        // 3. تحديث أطوال القيود (Constraints) فقط دون إجبار العقد الوسطى على الاستقامة
        for (let i = 0; i < this.constraints.length; i++) {
            this.constraints[i].length = this.restLength;
        }

        // تحديث أطوال قيود الانحناء أيضاً لتبقى متناسقة مع الطول الجديد للحبل
        for (let i = 0; i < this.bendConstraints.length; i++) {
            this.bendConstraints[i].length = this.restLength * 2;
        }
    }

    getEndNode() {
        return this.nodes[this.numNodes - 1];
    }
}