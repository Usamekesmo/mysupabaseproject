// =============================================================
// ==      وحدة الاتصالات (النسخة المستقرة)         ==
// =============================================================

import { supabase } from './config.js';

// --- 1. دوال المصادقة ---
export async function signUpUser(email, password, username) {
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) return { data, error: null };
    if (error && error.message.includes("Invalid login credentials")) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email, password, options: { data: { username: username } }
        });
        return { data: signUpData, error: signUpError };
    }
    return { data, error };
}

// --- 2. دوال جلب البيانات ---
export async function fetchPlayer() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('players').select('*').eq('id', user.id).single();
    if (error) console.error("خطأ في جلب بيانات اللاعب:", error);
    return data;
}

export async function fetchProgressionConfig() {
    const { data, error } = await supabase.from('progression_config').select('settings').eq('id', 1).single();
    if (error) {
        console.error("خطأ في جلب إعدادات التقدم:", error);
        return null;
    }
    return data ? data.settings : null;
}

export async function fetchQuestionsConfig() {
    const { data, error } = await supabase.from('questions_config').select('*');
    if (error) {
        console.error("خطأ في جلب إعدادات الأسئلة:", error);
        return [];
    }
    return data || [];
}

export async function fetchStoreConfig() {
    const { data, error } = await supabase.from('store_config').select('*').order('sort_order', { ascending: true });
    if (error) console.error("خطأ في جلب إعدادات المتجر:", error);
    return data || [];
}

export async function fetchSpecialOffers() {
    const { data, error } = await supabase.from('special_offers').select('*');
    if (error) console.error("خطأ في جلب العروض الخاصة:", error);
    return data || [];
}

export async function fetchLiveEvents() {
    const { data, error } = await supabase.from('live_events').select('*');
    if (error) console.error("خطأ في جلب الأحداث الحية:", error);
    return data || [];
}

export async function fetchOrAssignDailyQuests() {
    const { data, error } = await supabase.rpc('get_or_assign_daily_quests');
    if (error) console.error("خطأ في جلب أو تعيين المهام اليومية:", error);
    return data || [];
}

export async function fetchPlayerMastery() {
    const { data, error } = await supabase.from('player_page_mastery').select('*');
    if (error) console.error("خطأ في جلب سجل الإتقان:", error);
    return data || [];
}

export async function fetchPageData(pageNumber) {
    try {
        const response = await fetch(`https://api.alquran.cloud/v1/page/${pageNumber}/quran-uthmani`);
        if (!response.ok) throw new Error('فشل استجابة الشبكة.');
        const data = await response.json();
        return data.data.ayahs;
    } catch (error) {
        console.error("Error fetching page data:", error);
        return null;
    }
}

export async function fetchLeaderboard() {
    const { data, error } = await supabase.from('players').select('username, xp').order('xp', { ascending: false }).limit(10);
    if (error) console.error("خطأ في جلب لوحة الصدارة الدائمة:", error);
    return data || [];
}

// --- 3. دوال حفظ البيانات ---
export async function savePlayer(playerData) {
    const { id, ...updatableData } = playerData;
    const { error } = await supabase.from('players').update(updatableData).eq('id', id);
    if (error) console.error("خطأ في حفظ بيانات اللاعب:", error);
}

export async function saveResult(resultData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const dataToSave = {
        user_id: user.id,
        page_number: resultData.pageNumber,
        score: resultData.score,
        total_questions: resultData.totalQuestions,
        xp_earned: resultData.xpEarned,
        errors: resultData.errorLog
    };
    const { error } = await supabase.from('quiz_results').insert([dataToSave]);
    if (error) console.error("خطأ في حفظ نتيجة الاختبار:", error);
}

export async function updatePlayerQuests(updates) {
    const { error } = await supabase.from('player_quests').upsert(updates);
    if (error) console.error("Error updating player quests:", error);
}

export async function updateMasteryRecord(pageNumber, durationInSeconds) {
    const { error } = await supabase.rpc('update_mastery_on_perfect_quiz', {
        p_page_number: pageNumber,
        p_quiz_duration_seconds: durationInSeconds
    });
    if (error) console.error("Error updating mastery record:", error);
}
