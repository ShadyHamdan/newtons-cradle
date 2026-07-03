// /physics/Constants.js
import * as THREE from 'three';

export const FIXED_DT = 1 / 240; // معدل التحديث الفيزيائي الثابت (240 إطار في الثانية لضمان دقة التصادمات)
export const BALL_COUNT = 5;
export const BALL_RADIUS = 0.5;
export const DIAMETER = BALL_RADIUS * 2; // القطر الإجمالي للكرة (1.0) وهو المستخدم لحساب مسافة التصادم
export const PIVOT_Y = 5; // الارتفاع العالمي لنقاط تعليق البندول بالسقف

// التطوير الجديد: تصدير إزاحة محور Z الجانبية لتناسق حسابات الـ V-Shape في كل الملفات
export const Z_OFFSET = 1.4;