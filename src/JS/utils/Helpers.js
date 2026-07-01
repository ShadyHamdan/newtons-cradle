/**
 * دالة لطباعة تقرير حالة البندولات الحالية في وحدة التحكم (Console)
 */
export function logPendulumStatus(pendulums) {
    console.group("📊 تقرير المحاكاة الفيزيائية الحالي:");
    pendulums.forEach((p, idx) => {
        console.log(
            `الكرة [${idx}] -> الزاوية: ${p.angle.toFixed(3)} | السرعة الزاوية: ${p.angularVelocity.toFixed(3)} | الكتلة: ${p.individualMass}kg`
        );
    });
    console.groupEnd();
}

/**
 * توليد ألوان عشوائية بصيغة الـ Hex لاستخدامها في ميزة المواد المخصصة مستقبلاً
 */
export function generateRandomHexColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}