// /objects/FrameGeometry.js
// مصدر واحد موحّد (Single Source of Truth) لهندسة حامل البندول (Frame)، تستخدمه كل من:
// - Frame.js (لبناء الشكل البصري / المش ثلاثي الأبعاد)
// - FrameCollision.js (لبناء حدود التصادم الفيزيائية المطابقة تماماً للشكل الظاهر)
// توحيد الأرقام هنا يمنع أي تعارض مستقبلي بين ما يُرى وما يصطدم فعلياً.

import { BALL_COUNT, DIAMETER, PIVOT_Y } from '../physics/Constants.js';

export const FRAME_WIDTH = BALL_COUNT * DIAMETER + 2;
export const FRAME_DEPTH_OFFSET = 1.4; // إزاحة الأعمدة والقضبان الأمامية/الخلفية عن المحور المركزي Z

// --- الأعمدة الرأسية (Pillars) ---
export const PILLAR_RADIUS = 0.1;
export const PILLAR_HEIGHT = 7;
export const PILLAR_Y_CENTER = 2;
export const PILLAR_Y_MIN = PILLAR_Y_CENTER - PILLAR_HEIGHT / 2;
export const PILLAR_Y_MAX = PILLAR_Y_CENTER + PILLAR_HEIGHT / 2;

export const pillarPositions = [
    { x: -FRAME_WIDTH / 2, z: FRAME_DEPTH_OFFSET },
    { x: FRAME_WIDTH / 2, z: FRAME_DEPTH_OFFSET },
    { x: -FRAME_WIDTH / 2, z: -FRAME_DEPTH_OFFSET },
    { x: FRAME_WIDTH / 2, z: -FRAME_DEPTH_OFFSET },
];

// --- القضبان الأفقية العلوية (Beams) التي تُعلَّق منها الحبال ---
export const BEAM_HALF_HEIGHT = 0.075; // نصف ارتفاع مقطع القضيب (0.15 / 2)
export const BEAM_HALF_DEPTH = 0.075;  // نصف عمق مقطع القضيب (0.15 / 2)

export const beamPositions = [
    { y: PIVOT_Y, z: FRAME_DEPTH_OFFSET },
    { y: PIVOT_Y, z: -FRAME_DEPTH_OFFSET },
    { y: PIVOT_Y, z: 0 },
];
