// =============================================================
// ==      وحدة اللاعب (player.js) - مع إضافة نجوم الطاقة      ==
// =============================================================

import * as api from './api.js';
import * as achievements from './achievements.js';

export let playerData = {};
export const FREE_PAGES = [1, 2, 602, 603, 604];

/**
 * دالة مساعدة للحصول على تاريخ اليوم بصيغة YYYY-MM-DD.
 * @returns {string}
 */
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * تحميل بيانات اللاعب من الواجهة الخلفية وإعادة تعيين المحاولات اليومية إذا لزم الأمر.
 * @returns {boolean} - true إذا تم التحميل بنجاح.
 */
export async function loadPlayer() {
    const fetchedData = await api.fetchPlayer();
    if (!fetchedData) {
        console.error("فشل جلب بيانات اللاعب من الواجهة الخلفية. تحقق من سياسات RLS على جدول 'players'.");
        return false;
    }

    // تعيين البيانات التي تم جلبها من قاعدة البيانات
    playerData = { ...fetchedData };

    // --- منطق إعادة تعيين المحاولات اليومية المجانية ---
    const today = getTodayDateString();
    
    // التحقق مما إذا كان تاريخ آخر إعادة تعيين هو ليس اليوم
    if (playerData.last_free_attempts_reset_date !== today) {
        console.log("يوم جديد! إعادة تعيين المحاولات المجانية.");
        playerData.last_free_attempts_reset_date = today;
        playerData.daily_free_attempts_left = 3; // إعادة تعيين المحاولات إلى 3
    }

    // --- التأكد من وجود الحقول الأساسية لتجنب الأخطاء ---
    // هذا مهم بشكل خاص للاعبين الجدد أو إذا تمت إضافة الأعمدة لاحقًا.
    playerData.energy_stars = playerData.energy_stars ?? 0;
    playerData.daily_free_attempts_left = playerData.daily_free_attempts_left ?? 3;
    playerData.inventory = playerData.inventory || [];
    playerData.achievements = playerData.achievements || [];
    playerData.total_quizzes_completed = playerData.total_quizzes_completed || 0;
    playerData.total_play_time_seconds = playerData.total_play_time_seconds || 0;
    playerData.total_correct_answers = playerData.total_correct_answers || 0;
    playerData.total_questions_answered = playerData.total_questions_answered || 0;
    
    // حقول قديمة، من الجيد التأكد من وجودها لتجنب الأخطاء
    playerData.last_daily_reward_claimed_date = playerData.last_daily_reward_claimed_date || null;
    playerData.login_streak = playerData.login_streak || 0;


    console.log(`تم تحميل بيانات اللاعب بنجاح: ${playerData.username}`);
    
    // التحقق من إنجازات تسجيل الدخول
    achievements.checkAchievements('login');
    
    return true;
}

/**
 * حفظ بيانات اللاعب الحالية في الواجهة الخلفية.
 */
export async function savePlayer() {
    // استبعاد أي بيانات مؤقتة أو غير قابلة للتحديث قبل الحفظ
    const { id, ...updatableData } = playerData;
    await api.savePlayer({ id, ...updatableData });
    console.log("تم إرسال طلب حفظ بيانات اللاعب إلى الواجهة الخلفية.");
}
