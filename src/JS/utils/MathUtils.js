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