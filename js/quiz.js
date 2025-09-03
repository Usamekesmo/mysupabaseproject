// =============================================================
// ==      وحدة الاختبار (النسخة المستقرة)         ==
// =============================================================

import * as ui from './ui.js';
import * as api from './api.js';
import * as player from './player.js';
import * as progression from './progression.js';
import * as achievements from './achievements.js';
import * as quests from './quests.js';
import { allQuestionGenerators } from './questions.js';

let state = {
    pageAyahs: [],
    currentQuestionIndex: 0,
    score: 0,
    totalQuestions: 10,
    selectedQari: 'ar.alafasy',
    errorLog: [],
    userName: '',
    pageNumber: 0,
    xpEarned: 0,
    startTime: 0,
    liveEvent: null,
    quest: null
};

let allActiveQuestions = [];
const shuffleArray = array => [...array].sort(() => 0.5 - Math.random());

export async function initializeQuiz() {
    const config = await api.fetchQuestionsConfig();
    if (config && config.length > 0) {
        allActiveQuestions = config.map(q => ({
            ...q,
            generator: allQuestionGenerators[q.id]
        })).filter(q => typeof q.generator === 'function');
    }
}

export function start(settings) {
    state = {
        ...state,
        ...settings,
        score: 0,
        currentQuestionIndex: 0,
        errorLog: [],
        xpEarned: 0,
        startTime: Date.now()
    };
    ui.showScreen(ui.quizScreen);
    displayNextQuestion();
}

function getQuestionRecipe(settings) {
    if (settings.liveEvent && settings.liveEvent.questions_recipe) {
        return settings.liveEvent.questions_recipe;
    }
    if (settings.quest && settings.quest.quests_config && settings.quest.quests_config.questions_recipe) {
        return settings.quest.quests_config.questions_recipe;
    }
    return [];
}

function displayNextQuestion() {
    if (state.currentQuestionIndex >= state.totalQuestions) {
        endQuiz();
        return;
    }

    state.currentQuestionIndex++;
    ui.updateProgress(state.currentQuestionIndex, state.totalQuestions);
    ui.feedbackArea.classList.add('hidden');

    const playerLevel = progression.getLevelInfo(player.playerData.xp).level;
    const availableGenerators = allActiveQuestions.filter(q => playerLevel >= q.level_required);
    if (availableGenerators.length === 0) {
        ui.showToast("عفواً، لا توجد أسئلة متاحة لمستواك الحالي.", "error");
        return;
    }

    const randomGenerator = shuffleArray(availableGenerators)[0];
    const question = randomGenerator.generator(state.pageAyahs, state.selectedQari, handleResult, randomGenerator.options_count);
    if (question) {
        ui.questionArea.innerHTML = question.questionHTML;
        question.setupListeners(ui.questionArea);
    } else {
        displayNextQuestion();
    }
}

function handleResult(isCorrect, correctAnswerText, clickedElement) {
    ui.disableQuestionInteraction();
    const rules = progression.getGameRules();
    if (isCorrect) {
        state.score++;
        state.xpEarned += rules.xp_per_correct_answer || 10;
        ui.markAnswer(clickedElement, true);
    } else {
        state.errorLog.push({
            questionHTML: ui.questionArea.innerHTML,
            correctAnswer: correctAnswerText
        });
        ui.markAnswer(clickedElement, false);
    }
    ui.showFeedback(isCorrect, correctAnswerText);
    setTimeout(displayNextQuestion, 3000);
}

async function endQuiz() {
    const durationInSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    const rules = progression.getGameRules();
    const isPerfect = state.score === state.totalQuestions;

    player.playerData.total_quizzes_completed = (player.playerData.total_quizzes_completed || 0) + 1;
    player.playerData.total_play_time_seconds = (player.playerData.total_play_time_seconds || 0) + durationInSeconds;
    player.playerData.total_correct_answers = (player.playerData.total_correct_answers || 0) + state.score;
    player.playerData.total_questions_answered = (player.playerData.total_questions_answered || 0) + state.totalQuestions;

    if (isPerfect) {
        state.xpEarned += rules.xp_bonus_all_correct || 50;
        if (state.liveEvent) {
            player.playerData.diamonds += state.liveEvent.reward_diamonds || 0;
        }
        api.updateMasteryRecord(state.pageNumber, durationInSeconds);
        quests.updateQuestsProgress('mastery_check');
    }

    const oldXp = player.playerData.xp;
    player.playerData.xp += state.xpEarned;
    const levelUpInfo = progression.checkForLevelUp(oldXp, player.playerData.xp);
    if (levelUpInfo) {
        player.playerData.diamonds += levelUpInfo.reward;
    }

    // تم حذف استدعاء api.addWeeklyXp(state.xpEarned) من هنا

    quests.updateQuestsProgress('quiz_completed');
    achievements.checkAchievements('quiz_completed', {
        isPerfect: isPerfect,
        pageNumber: state.pageNumber
    });

    await player.savePlayer();
    await api.saveResult(state);
    ui.updateSaveMessage(true);

    if (state.errorLog.length > 0) {
        ui.displayErrorReview(state.errorLog);
    } else {
        ui.displayFinalResult(state, levelUpInfo);
    }
}

export function getCurrentState() {
    return state;
}
