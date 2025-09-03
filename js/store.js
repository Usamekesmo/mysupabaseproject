// =============================================================
// ==      وحدة المتجر (store.js) - مع إصلاح زر التفاصيل      ==
// =============================================================

import * as ui from './ui.js';
import * as player from './player.js';
import * as achievements from './achievements.js';
import * as progression from './progression.js';
import { updateAvailablePages } from './main.js';

let storeItemsCache = [];
let specialOffersCache = [];
let processedItems = { all: [], pages: [], ranges: [], qari: [], consumable: [] };

/**
 * معالجة بيانات المتجر الأولية وتصنيفها.
 */
export function processStoreData(items, offers) {
    storeItemsCache = items || [];
    specialOffersCache = offers || [];
    processedItems = { all: [], pages: [], ranges: [], qari: [], consumable: [] };
    storeItemsCache.forEach(item => {
        if (item && item.type) {
            const isOffer = specialOffersCache.some(offer => offer.store_item_id === item.id);
            const isRecommended = item.is_recommended;
            const processedItem = { ...item, isOffer, isRecommended };
            processedItems.all.push(processedItem);
            if (processedItems[item.type]) {
                processedItems[item.type].push(processedItem);
            }
        }
    });
}

/**
 * عرض عناصر المتجر في واجهة المستخدم بناءً على الفلتر المحدد.
 * هذه الدالة مسؤولة فقط عن العرض.
 */
export function renderStoreTabs(filter = 'all') {
    const container = document.getElementById('store-container');
    if (!container) return;

    const itemsToRender = processedItems[filter] || [];
    container.innerHTML = '';

    if (itemsToRender.length === 0) {
        container.innerHTML = '<p>لا توجد عناصر لعرضها في هذا القسم.</p>';
        return;
    }

    itemsToRender.forEach(item => {
        const isOwned = checkIfOwned(item, player.playerData.inventory);
        const buttonText = isOwned ? 'تم الشراء' : 'تفاصيل';

        const itemDiv = document.createElement('div');
        itemDiv.className = `store-item ${isOwned ? 'owned-item' : ''}`;
        
        itemDiv.innerHTML = `
            ${item.isOffer ? '<div class="special-offer-badge">عرض خاص</div>' : ''}
            ${item.isRecommended ? '<div class="recommended-badge">⭐</div>' : ''}
            <div class="item-icon">${item.icon || '🎁'}</div>
            <h4>${item.name}</h4>
            <p class="item-price">${item.price} ${item.type === 'exchange' ? 'XP' : '💎'}</p>
            <button class="details-button" data-item-id="${item.id}" ${isOwned ? 'disabled' : ''}>${buttonText}</button>
        `;
        
        container.appendChild(itemDiv);
    });
}

/**
 * يتم استدعاؤها من main.js لإظهار تفاصيل العنصر.
 * @param {string} itemId - معرف العنصر.
 */
export function handleDetailsClick(itemId) {
    const itemToShow = storeItemsCache.find(i => String(i.id) === String(itemId));
    if (itemToShow) {
        ui.showModal(true, itemToShow, player.playerData);
    } else {
        console.error(`لم يتم العثور على عنصر بالمعرف: ${itemId}`);
    }
}

/**
 * التحقق مما إذا كان اللاعب يمتلك عنصرًا معينًا.
 */
function checkIfOwned(item, inventory) {
    if (!inventory) return false;
    if (item.type === 'consumable' || item.type === 'exchange') return false;
    if (item.type === 'pages' || item.type === 'qari' || item.type === 'themes') {
        return inventory.includes(item.id);
    }
    if (item.type === 'ranges' || item.type === 'juz') {
        const [start, end] = item.value.split('-').map(Number);
        for (let i = start; i <= end; i++) {
            if (!inventory.includes(`page_${i}`)) return false;
        }
        return true;
    }
    return false;
}

/**
 * التحقق مما إذا كان اللاعب يستطيع شراء عنصر معين.
 */
function checkIfCanAfford(item, playerData) {
    if (item.type === 'exchange') {
        return playerData.xp >= item.price;
    }
    return playerData.diamonds >= item.price;
}

/**
 * تنفيذ عملية شراء العنصر.
 */
export async function purchaseItem(itemId) {
    const item = storeItemsCache.find(i => i.id === itemId);
    if (!item) return;

    if (!checkIfCanAfford(item, player.playerData)) {
        return ui.showToast("رصيدك غير كافٍ لإتمام هذه العملية.", "error");
    }

    // خصم السعر وإضافة العنصر
    if (item.type === 'exchange') {
        player.playerData.xp -= item.price;
        player.playerData.diamonds += parseInt(item.value, 10);
    } else if (item.type === 'consumable') {
        player.playerData.diamonds -= item.price;
        if (item.id === 'energy_stars_pack') {
            player.playerData.energy_stars = (player.playerData.energy_stars || 0) + parseInt(item.value, 10);
        }
    } else {
        player.playerData.diamonds -= item.price;
        if (item.type === 'ranges' || item.type === 'juz') {
            const [start, end] = item.value.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                const pageId = `page_${i}`;
                if (!player.playerData.inventory.includes(pageId)) {
                    player.playerData.inventory.push(pageId);
                }
            }
        } else {
            player.playerData.inventory.push(item.id);
        }
    }

    ui.showToast(`تمت عملية "${item.name}" بنجاح!`, "info");
    achievements.checkAchievements('item_purchased', { itemId: item.id, itemType: item.type });
    
    await player.savePlayer();
    
    // تحديث واجهة المستخدم
    const levelInfo = progression.getLevelInfo(player.playerData.xp);
    ui.updatePlayerHeader(player.playerData, levelInfo);
    const currentFilter = document.querySelector('.filter-button.active')?.dataset.filter || 'all';
    renderStoreTabs(currentFilter);
    updateAvailablePages();
    if (item.type === 'qari') {
        ui.populateQariSelect(ui.qariSelect, player.playerData.inventory);
    }
    ui.showModal(false);
}
