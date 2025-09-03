// =============================================================
// ==      وحدة نظام الإنجازات (Achievements) - نسخة نهائية ومبسطة  ==
// =============================================================

import * as player from './player.js';
import * as ui from './ui.js';
import * as progression from './progression.js';

// ▼▼▼ (تم التصحيح هنا) ▼▼▼
// تم تعريف الإنجازات بشكل ثابت ومباشر داخل الكود.
// هذا يزيل الحاجة إلى طلب شبكي (network request) لجلبها، مما يسرّع بدء تشغيل التطبيق.
const achievementsConfig = [
    // --- إنجازات المستويات ---
    { id: 1, name: "الوصول للمستوى 5",    trigger_event: "login", target_property: "level", comparison: ">=", target_value: 5,  xp_reward: 50,  diamonds_reward: 25 },
    { id: 2, name: "الوصول للمستوى 10",   trigger_event: "login", target_property: "level", comparison: ">=", target_value: 10, xp_reward: 100, diamonds_reward: 50 },

    // --- إنجازات الاختبارات ---
    { id: 3, name: "أول اختبار ناجح",     trigger_event: "quiz_completed", target_property: "totalQuizzes", comparison: "===", target_value: 1, xp_reward: 20, diamonds_reward: 10 },
    { id: 4, name: "أداء مثالي!",         trigger_event: "quiz_completed", target_property: "isPerfect",    comparison: "===", target_value: true, xp_reward: 30, diamonds_reward: 15 },

    // --- إنجازات المتجر ---
    { id: 5, name: "المشتري الأول",       trigger_event: "item_purchased", target_property: "inventorySize", comparison: "===", target_value: 1, xp_reward: 10, diamonds_reward: 5 }
];
// ▲▲▲ نهاية التصحيح ▲▲▲


/**
 * دالة التهيئة. لم تعد تقوم بأي شيء يتطلب انتظارًا (async) ولكنها لا تزال موجودة للحفاظ على بنية الكود.
 */
export async function initializeAchievements() {
    // (تم التصحيح هنا) تم حذف استدعاء fetch، وأصبحت الدالة مجرد سجل في الكونسول.
    console.log(`تم تحميل ${achievementsConfig.length} إنجاز من الإعدادات المحلية.`);
}

/**
 * الدالة الرئيسية التي يتم استدعاؤها للتحقق من الإنجازات بعد وقوع حدث معين.
 * @param {string} eventName - اسم الحدث الذي وقع (مثل 'login', 'quiz_completed').
 * @param {object} eventData - بيانات إضافية متعلقة بالحدث (مثل نتيجة الاختبار).
 */
export function checkAchievements(eventName, eventData = {}) {
    if (!achievementsConfig || achievementsConfig.length === 0) {
        return; // لا تفعل شيئًا إذا لم تكن هناك إنجازات معرفة.
    }

    // فلترة الإنجازات التي قد يتم تفعيلها بواسطة هذا الحدث.
    const relevantAchievements = achievementsConfig.filter(ach => ach.trigger_event === eventName);

    for (const achievement of relevantAchievements) {
        // التحقق مما إذا كان اللاعب قد حصل على هذا الإنجاز من قبل.
        if (player.playerData.achievements.includes(achievement.id)) {
            continue; // انتقل إلى الإنجاز التالي.
        }

        // التحقق مما إذا كان شرط الإنجاز قد تحقق.
        if (isConditionMet(achievement, eventData)) {
            grantAchievement(achievement);
        }
    }
}

/**
 * يتحقق مما إذا كان شرط إنجاز معين قد تحقق.
 * @param {object} achievement - كائن الإنجاز.
 * @param {object} eventData - بيانات الحدث.
 * @returns {boolean} - true إذا تحقق الشرط.
 */
function isConditionMet(achievement, eventData) {
    // إنشاء "سياق" يحتوي على جميع البيانات التي قد يحتاجها الإنجاز للتحقق من شرطه.
    const dataContext = {
        ...eventData, // بيانات الحدث المباشرة (مثل isPerfect)
        xp: player.playerData.xp,
        diamonds: player.playerData.diamonds,
        level: progression.getLevelInfo(player.playerData.xp).level,
        inventorySize: player.playerData.inventory.length,
        totalQuizzes: player.playerData.total_quizzes_completed
    };

    const propertyValue = dataContext[achievement.target_property];
    const targetValue = achievement.target_value;

    if (propertyValue === undefined) {
        return false; // الخاصية المطلوبة غير موجودة في السياق.
    }

    // تنفيذ المقارنة بناءً على نوعها المحدد في إعدادات الإنجاز.
    switch (achievement.comparison) {
        case '===': return propertyValue === targetValue;
        case '>=':  return propertyValue >= targetValue;
        case '<=':  return propertyValue <= targetValue;
        default:    return false;
    }
}

/**
 * يمنح اللاعب إنجازًا ومكافآته، ويقوم بتحديث بيانات اللاعب وعرض إشعار.
 * @param {object} achievement - كائن الإنجاز الذي تم تحقيقه.
 */
function grantAchievement(achievement) {
    console.log(`تهانينا! تم تحقيق الإنجاز: ${achievement.name}`);

    // إضافة الإنجاز والمكافآت إلى بيانات اللاعب.
    player.playerData.achievements.push(achievement.id);
    player.playerData.xp += achievement.xp_reward;
    player.playerData.diamonds += achievement.diamonds_reward;

    // عرض إشعار مرئي للاعب.
    ui.showAchievementToast(achievement);
}
