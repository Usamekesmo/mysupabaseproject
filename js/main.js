// =================================================================
// ==      الملف الرئيسي (main.js) - مع إصلاح زر التفاصيل      ==
// =================================================================

import * as ui from './ui.js';
import * as api from './api.js';
import * as quiz from './quiz.js';
import * as player from './player.js';
import * as progression from './progression.js';
import * as store from './store.js';
import * as achievements from './achievements.js';
import * as quests from './quests.js';
import { surahMetadata } from './quran-metadata.js';

// --- دوال التهيئة والإعداد ---

async function initialize() {
    ui.toggleLoader(true);
    try {
        await Promise.all([
            progression.initializeProgression(),
            quiz.initializeQuiz(),
            achievements.initializeAchievements()
        ]);
        setupEventListeners();
        ui.showScreen(ui.startScreen);
    } catch (error) {
        console.error("فشل تهيئة التطبيق:", error);
        document.body.innerHTML = '<p style="text-align: center; color: red; font-size: 1.2em;">حدث خطأ فادح أثناء تحميل التطبيق. يرجى تحديث الصفحة.</p>';
    } finally {
        ui.toggleLoader(false);
    }
}

function setupEventListeners() {
    // --- المستمعون الأساسيون ---
    if (ui.startButton) ui.startButton.addEventListener('click', handleAuthentication);
    if (ui.startTestButton) ui.startTestButton.addEventListener('click', onStartPageTestClick);
    if (ui.reloadButton) ui.reloadButton.addEventListener('click', returnToMainMenu);
    if (ui.showFinalResultButton) {
        ui.showFinalResultButton.addEventListener('click', () => {
            const quizState = quiz.getCurrentState();
            const oldXp = player.playerData.xp - quizState.xpEarned;
            const levelUpInfo = progression.checkForLevelUp(oldXp, player.playerData.xp);
            ui.displayFinalResult(quizState, levelUpInfo);
        });
    }

    // --- مستمعو التبويبات والفلاتر ---
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            ui.showTab(tabId);
            if (!button.dataset.loaded) {
                if (tabId === 'store-tab') store.renderStoreTabs('all');
                else if (tabId === 'leaderboard-tab') onLeaderboardTabClick();
                else if (tabId === 'profile-tab') ui.renderPlayerStats(player.playerData);
                else if (tabId === 'quests-tab') quests.renderQuests();
                if (tabId !== 'test-tab') button.dataset.loaded = 'true';
            }
        });
    });
    
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            store.renderStoreTabs(e.target.dataset.filter);
        });
    });

    // --- مستمعو النوافذ المنبثقة والأزرار الديناميكية ---
    if (ui.modalBuyButton) ui.modalBuyButton.addEventListener('click', (e) => store.purchaseItem(e.target.dataset.itemId));
    if (ui.modalCloseButton) ui.modalCloseButton.addEventListener('click', () => ui.showModal(false, null, player.playerData));

    // ▼▼▼ هذا هو الإصلاح الجديد باستخدام تفويض الأحداث ▼▼▼
    const storeContainer = document.getElementById('store-container');
    if (storeContainer) {
        storeContainer.addEventListener('click', (e) => {
            if (e.target.matches('.details-button')) {
                e.preventDefault(); // منع أي سلوك افتراضي
                const itemId = e.target.dataset.itemId;
                if (itemId) {
                    store.handleDetailsClick(itemId);
                }
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target.matches('.challenge-start-button')) {
            handleChallengeStart(e.target.dataset.eventId, surahMetadata);
        }
    });
}

// --- دوال منطق اللعبة ---

async function returnToMainMenu() {
    await postLoginSetup();
    ui.showScreen(ui.mainInterface);
}

async function handleAuthentication() {
    const userName = ui.userNameInput.value.trim();
    if (!userName) return ui.showToast("يرجى إدخال اسمك للمتابعة.", "error");
    ui.toggleLoader(true);
    const encodedUsername = btoa(unescape(encodeURIComponent(userName)));
    const safeEncodedUsername = encodedUsername.replace(/=/g, '').replace(/[^a-zA-Z0-9]/g, '');
    const email = `${safeEncodedUsername}@quran-quiz.app`;
    const password = `QURAN_QUIZ_#_${safeEncodedUsername}`;
    const { error } = await api.signUpUser(email, password, userName);
    if (error) {
        ui.toggleLoader(false);
        return ui.showToast(`حدث خطأ: ${error.message}`, "error");
    }
    await postLoginSetup();
    ui.toggleLoader(false);
    ui.showScreen(ui.mainInterface);
}

async function postLoginSetup() {
    const playerLoaded = await player.loadPlayer();
    if (!playerLoaded) return ui.showToast("فشل تحميل بيانات اللاعب. حاول تحديث الصفحة.", "error");

    const [storeItems, specialOffers, liveEvents, assignedQuests, masteryData] = await Promise.all([
        api.fetchStoreConfig(),
        api.fetchSpecialOffers(),
        api.fetchLiveEvents(),
        api.fetchOrAssignDailyQuests(),
        api.fetchPlayerMastery()
    ]);
    
    store.processStoreData(storeItems, specialOffers);
    quests.initialize(assignedQuests, masteryData);
    
    const levelInfo = progression.getLevelInfo(player.playerData.xp);
    ui.updatePlayerHeader(player.playerData, levelInfo);
    updateAvailablePages();
    ui.populateQariSelect(ui.qariSelect, player.playerData.inventory);
    const maxQuestions = progression.getMaxQuestionsForLevel(levelInfo.level);
    ui.updateQuestionsCountOptions(maxQuestions);
    ui.renderEvents(liveEvents);
}

export function updateAvailablePages() {
    const purchasedPages = (player.playerData.inventory || []).filter(id => id.startsWith('page_')).map(id => parseInt(id.replace('page_', ''), 10));
    const availablePages = [...new Set([...player.FREE_PAGES, ...purchasedPages])].sort((a, b) => a - b);
    ui.populateSelect(ui.pageSelect, availablePages, 'الصفحة');
}

function onStartPageTestClick() {
    const selectedPage = ui.pageSelect.value;
    if (!selectedPage) return ui.showToast("يرجى اختيار صفحة.", "error");

    startTestWithSettings({
        pageNumbers: [parseInt(selectedPage, 10)],
        totalQuestions: parseInt(ui.questionsCountSelect.value, 10),
    });
}

async function onLeaderboardTabClick() {
    ui.leaderboardList.innerHTML = '<p>جاري تحميل البيانات...</p>';
    const leaderboardData = await api.fetchLeaderboard();
    if (leaderboardData && leaderboardData.length > 0) {
        ui.displayLeaderboard(leaderboardData, 'leaderboard-list');
    } else {
        ui.leaderboardList.innerHTML = '<p>لوحة الصدارة فارغة حاليًا.</p>';
    }
}

async function handleChallengeStart(eventId, localSurahMetadata) {
    if (!localSurahMetadata) return console.error("خطأ فادح: بيانات السور الوصفية غير متوفرة.");

    const event = ui.getEventById(eventId);
    if (!event) return console.error(`لم يتم العثور على حدث بالمعرف: ${eventId}`);
    
    const surahInfo = localSurahMetadata[event.target_surah]; 
    if (!surahInfo) {
        return console.error(`لم يتم العثور على بيانات وصفية للسورة. القيمة المستهدفة: ${event.target_surah}`);
    }
    
    const confirmation = confirm(`أنت على وشك بدء تحدي "${event.title}". هل أنت مستعد؟`);
    if (confirmation) {
        const pageNumbers = Array.from({ length: surahInfo.endPage - surahInfo.startPage + 1 }, (_, i) => surahInfo.startPage + i);
        startTestWithSettings({
            pageNumbers: pageNumbers,
            totalQuestions: event.questions_count,
            liveEvent: event
        });
    }
}

async function startTestWithSettings(settings) {
    ui.toggleLoader(true);
    let allAyahs = [];
    for (const pageNum of settings.pageNumbers) {
        const pageAyahs = await api.fetchPageData(pageNum);
        if (pageAyahs) allAyahs.push(...pageAyahs);
    }
    ui.toggleLoader(false);
    if (allAyahs.length > 0) {
        quiz.start({
            pageAyahs: allAyahs,
            selectedQari: ui.qariSelect.value,
            totalQuestions: settings.totalQuestions,
            userName: player.playerData.username,
            pageNumber: settings.pageNumbers[0],
            liveEvent: settings.liveEvent,
            quest: settings.quest
        });
    } else {
        ui.showToast("حدث خطأ أثناء تحميل آيات الصفحة. يرجى المحاولة مرة أخرى.", "error");
    }
}

// بدء تشغيل التطبيق
initialize();
