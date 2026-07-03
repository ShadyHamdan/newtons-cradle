/**
 * تحويل الزوايا من نظام الدرجات إلى نظام الراديان
 */
export function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * تحويل الزوايا من نظام الراديان إلى نظام الدرجات
 */
export function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

/**
 * دالة لحصر قيمة رقمية بين حد أدنى وحد أقصى (Clamp)
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * دالة آمنة لقيمة جيب التمام (cos) تمنع الانفجار العددي (NaN/Infinity) عند القسمة عليها
 * عندما تكون الزاوية قريبة جداً من 90 درجة (حيث cos تقترب من الصفر).
 * تُستخدم في معادلات تحويل السرعة الخطية <-> الزاوية الوترية في محرك التصادم.
 */
export function safeCos(angle, minMagnitude = 0.12) {
    const c = Math.cos(angle);
    if (Math.abs(c) < minMagnitude) {
        return c >= 0 ? minMagnitude : -minMagnitude;
    }
    return c;
}