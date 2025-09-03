// =============================================================
// ==      وحدة المهام (النسخة الكاملة والنهائية)         ==
// =============================================================

import * as api from './api.js';
import * as player from './player.js';
import * as ui from './ui.js';
import * as progression from './progression.js';

let activeQuests = [];
let playerMasteryData = [];

/**
 * دالة التهيئة، تستقبل البيانات التي تم جلبها من main.js.
 */
export function initialize(quests, mastery) {
    activeQuests = quests || [];
    playerMasteryData = mastery || [];
    renderQuests();
}

/**
 * تعرض المهام في واجهة المستخدم.
 */
function renderQuests() {
    const container = document.getElementById('quests-container');
    if (!container) return;

    if (!activeQuests || activeQuests.length === 0) {
        container.innerHTML = '<p>لا توجد مهام متاحة حاليًا. عد غدًا لمهام جديدة!</p>';
        return;
    }

    container.innerHTML = activeQuests.map(playerQuest => {
        const questConfig = playerQuest.quests_config;
        if (!questConfig) return '';

        if (questConfig.type === 'dynamic_mastery') {
            const availablePages = [...new Set([
                ...player.FREE_PAGES,
                ...player.playerData.inventory
                    .filter(id => id.startsWith('page_'))
                    .map(id => parseInt(id.replace('page_', ''), 10))
            ])];
            
            const totalOwnedPages = availablePages.length;
            const requiredCompletions = questConfig.target_value;

            let completedPagesCount = 0;
            availablePages.forEach(page => {
                const masteryRecord = playerMasteryData.find(m => m.page_number === page);
                if (masteryRecord && masteryRecord.perfect_quiz_count >= requiredCompletions) {
                    completedPagesCount++;
                }
            });

            const progressPercentage = totalOwnedPages > 0 ? (completedPagesCount / totalOwnedPages) * 100 : 0;
            const isMasteryQuestCompleted = totalOwnedPages > 0 && completedPagesCount === totalOwnedPages;

            const totalXpReward = questConfig.xp_reward * totalOwnedPages;
            const totalDiamondsReward = questConfig.diamonds_reward * totalOwnedPages;

            return `
                <div class="quest-card ${playerQuest.is_completed ? 'completed' : ''}">
                    <div class="quest-info">
                        <h4>${questConfig.title}</h4>
                        <p>${questConfig.description.replace('{n}', requiredCompletions)}</p>
                        <div class="quest-progress-bar-container"><div class="quest-progress-bar" style="width: ${progressPercentage}%;"></div></div>
                        <span class="quest-progress-text">${completedPagesCount} / ${totalOwnedPages} صفحة متقنة</span>
                    </div>
                    <div class="quest-reward">
                        ${isMasteryQuestCompleted && !playerQuest.is_completed ? 
                            `<button class="claim-button" data-quest-id="${playerQuest.id}" data-quest-type="mastery" data-xp-reward="${totalXpReward}" data-diamonds-reward="${totalDiamondsReward}">مطالبة</button>` :
                            `<button class="claim-button" disabled>${playerQuest.is_completed ? 'تمت المطالبة' : 'مستمر'}</button>`
                        }
                         <p>+${totalXpReward} XP, +${totalDiamondsReward} 💎</p>
                    </div>
                </div>
            `;
        }

        const progressPercentage = Math.min(100, (playerQuest.progress / questConfig.target_value) * 100);
        return `
            <div class="quest-card ${playerQuest.is_completed ? 'completed' : ''}">
                <div class="quest-info">
                    <h4>${questConfig.title}</h4>
                    <p>${questConfig.description}</p>
                    <div class="quest-progress-bar-container"><div class="quest-progress-bar" style="width: ${progressPercentage}%;"></div></div>
                    <span class="quest-progress-text">${playerQuest.progress} / ${questConfig.target_value}</span>
                </div>
                <div class="quest-reward">
                    ${playerQuest.progress >= questConfig.target_value && !playerQuest.is_completed ? 
                        `<button class="claim-button" data-quest-id="${playerQuest.id}">مطالبة</button>` :
                        `<button class="claim-button" disabled>${playerQuest.is_completed ? 'تمت المطالبة' : 'مستمر'}</button>`
                    }
                     <p>+${questConfig.xp_reward} XP, +${questConfig.diamonds_reward} 💎</p>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.claim-button:not([disabled])').forEach(button => {
        button.addEventListener('click', handleClaimReward);
    });
}

async function handleClaimReward(event) {
    const button = event.target;
    const questId = parseInt(button.dataset.questId, 10);
    const questType = button.dataset.questType;
    const questToClaim = activeQuests.find(q => q.id === questId);

    if (!questToClaim || questToClaim.is_completed) return;

    let xpReward = 0;
    let diamondsReward = 0;
    const questConfig = questToClaim.quests_config;

    if (questType === 'mastery') {
        xpReward = parseInt(button.dataset.xpReward, 10) || 0;
        diamondsReward = parseInt(button.dataset.diamondsReward, 10) || 0;
    } else {
        xpReward = questConfig.xp_reward;
        diamondsReward = questConfig.diamonds_reward;
    }

    player.playerData.xp += xpReward;
    player.playerData.diamonds += diamondsReward;
    questToClaim.is_completed = true;

    ui.showToast(`تمت المطالبة بمكافأة: "${questConfig.title}"!`, "info");
    const levelInfo = progression.getLevelInfo(player.playerData.xp);
    ui.updatePlayerHeader(player.playerData, levelInfo);
    renderQuests();

    await api.updatePlayerQuests([{ id: questToClaim.id, progress: questToClaim.progress, is_completed: true }]);
    await player.savePlayer();
}

export function updateQuestsProgress(eventType, value = 1) {
    const updates = [];
    activeQuests.forEach(q => {
        if (q.is_completed || !q.quests_config || q.quests_config.type !== eventType) return;
        
        q.progress = Math.min(q.quests_config.target_value, q.progress + value);
        updates.push({ id: q.id, progress: q.progress });
    });

    if (updates.length > 0) {
        renderQuests();
        api.updatePlayerQuests(updates);
    }
}
