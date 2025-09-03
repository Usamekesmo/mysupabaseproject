// =============================================================
// ==      وحدة مصنع الأسئلة (تحتوي على كل أنواع الأسئلة)     ==
// =============================================================

// دالة مساعدة لخلط عناصر مصفوفة، تستخدمها معظم دوال الأسئلة
const shuffleArray = array => [...array].sort(() => 0.5 - Math.random());

// --- دوال توليد الأسئلة ---

/**
 * 1. اختر الآية التالية
 */
function generateChooseNextQuestion(pageAyahs, qari, handleResultCallback) {
    if (pageAyahs.length < 2) return null;
    const startIndex = Math.floor(Math.random() * (pageAyahs.length - 1));
    const questionAyah = pageAyahs[startIndex];
    const correctNextAyah = pageAyahs[startIndex + 1];
    
    const wrongOptions = shuffleArray(pageAyahs.filter(a => a.number !== correctNextAyah.number && a.number !== questionAyah.number)).slice(0, 3);
    if (wrongOptions.length < 3) return null; // التأكد من وجود خيارات كافية
    
    const options = shuffleArray([correctNextAyah, ...wrongOptions]);
    
    const questionHTML = `
        <h3>السؤال: استمع واختر الآية التالية</h3>
        <audio controls autoplay src="https://cdn.islamic.network/quran/audio/128/${qari}/${questionAyah.number}.mp3"></audio>
        ${options.map(opt => `<div class="option-div" data-number="${opt.number}">${opt.text}</div>`).join('')}
    `;
    const correctAnswer = correctNextAyah.text;
    const setupListeners = (area) => area.querySelectorAll('.option-div').forEach(el => 
        el.addEventListener('click', () => handleResultCallback(el.dataset.number == correctNextAyah.number, correctAnswer, el))
    );
    return { questionHTML, correctAnswer, setupListeners };
}

/**
 * 2. حدد موقع الآية
 */
function generateLocateAyahQuestion(pageAyahs, qari, handleResultCallback) {
    const ayahIndex = Math.floor(Math.random() * pageAyahs.length);
    const questionAyah = pageAyahs[ayahIndex];
    const totalAyahs = pageAyahs.length;
    let correctLocation;
    if (ayahIndex < totalAyahs / 3) correctLocation = 'بداية';
    else if (ayahIndex < (totalAyahs * 2) / 3) correctLocation = 'وسط';
    else correctLocation = 'نهاية';
    
    const questionHTML = `
        <h3>السؤال: أين يقع موضع هذه الآية في الصفحة؟</h3>
        <audio controls autoplay src="https://cdn.islamic.network/quran/audio/128/${qari}/${questionAyah.number}.mp3"></audio>
        <div class="interactive-area">${['بداية', 'وسط', 'نهاية'].map(loc => `<div class="choice-box" data-loc="${loc}">${loc} الصفحة</div>`).join('')}</div>
    `;
    const correctAnswer = `${correctLocation} الصفحة`;
    const setupListeners = (area) => area.querySelectorAll('.choice-box').forEach(el => 
        el.addEventListener('click', () => handleResultCallback(el.dataset.loc === correctLocation, correctAnswer, el))
    );
    return { questionHTML, correctAnswer, setupListeners };
}

/**
 * 3. أكمل الكلمة الأخيرة
 */
function generateCompleteLastWordQuestion(pageAyahs, qari, handleResultCallback) {
    const suitableAyahs = pageAyahs.filter(a => a.text.split(' ').length > 3);
    if (suitableAyahs.length < 4) return null;
    
    const questionAyah = shuffleArray(suitableAyahs)[0];
    const words = questionAyah.text.split(' ');
    const correctLastWord = words.pop();
    const incompleteAyahText = words.join(' ');
    
    const wrongOptions = shuffleArray(suitableAyahs.filter(a => a.number !== questionAyah.number))
        .slice(0, 3)
        .map(a => a.text.split(' ').pop());
    if (wrongOptions.length < 3) return null;
        
    const options = shuffleArray([correctLastWord, ...wrongOptions]);
    
    const questionHTML = `
        <h3>السؤال: اختر الكلمة الصحيحة لإكمال الآية:</h3>
        <p style="font-family: 'Amiri', serif; font-size: 22px;">${incompleteAyahText} (...)</p>
        <div class="interactive-area">${options.map(opt => `<div class="choice-box" data-word="${opt}">${opt}</div>`).join('')}</div>
    `;
    const correctAnswer = correctLastWord;
    const setupListeners = (area) => area.querySelectorAll('.choice-box').forEach(el => 
        el.addEventListener('click', () => handleResultCallback(el.dataset.word === correctLastWord, correctAnswer, el))
    );
    return { questionHTML, correctAnswer, setupListeners };
}

/**
 * 4. أكمل نصف الآية
 */
function generateCompleteAyahQuestion(pageAyahs, qari, handleResultCallback) {
    const longAyahs = pageAyahs.filter(a => a.text.split(' ').length > 8);
    if (longAyahs.length < 3) return null;
    
    const questionAyah = shuffleArray(longAyahs)[0];
    const words = questionAyah.text.split(' ');
    const splitPoint = Math.floor(words.length / 2);
    const firstHalfText = words.slice(0, splitPoint).join(' ');
    const correctSecondHalf = words.slice(splitPoint).join(' ');
    
    const wrongOptions = shuffleArray(pageAyahs.filter(a => a.number !== questionAyah.number))
        .slice(0, 2)
        .map(a => a.text.split(' ').slice(Math.floor(a.text.split(' ').length / 2)).join(' '));
    if (wrongOptions.length < 2) return null;
        
    const options = shuffleArray([correctSecondHalf, ...wrongOptions]);
    
    const questionHTML = `
        <h3>السؤال: اختر التكملة الصحيحة للآية التالية:</h3>
        <p style="font-family: 'Amiri', serif; font-size: 22px;">"${firstHalfText}..."</p>
        ${options.map(opt => `<div class="option-div" data-text="${escape(opt)}">${opt}</div>`).join('')}
    `;
    const correctAnswer = correctSecondHalf;
    const setupListeners = (area) => area.querySelectorAll('.option-div').forEach(el => 
        el.addEventListener('click', () => handleResultCallback(unescape(el.dataset.text) === correctSecondHalf, correctAnswer, el))
    );
    return { questionHTML, correctAnswer, setupListeners };
}

/**
 * 5. اختر الآية السابقة
 */
function generateChoosePreviousQuestion(pageAyahs, qari, handleResultCallback) {
    if (pageAyahs.length < 2) return null;
    const startIndex = Math.floor(Math.random() * (pageAyahs.length - 1)) + 1;
    const questionAyah = pageAyahs[startIndex];
    const correctPreviousAyah = pageAyahs[startIndex - 1];
    
    const wrongOptions = shuffleArray(pageAyahs.filter(a => a.number !== correctPreviousAyah.number && a.number !== questionAyah.number)).slice(0, 3);
    if (wrongOptions.length < 3) return null;
    
    const options = shuffleArray([correctPreviousAyah, ...wrongOptions]);
    
    const questionHTML = `
        <h3>السؤال: استمع واختر الآية السابقة لهذه الآية</h3>
        <audio controls autoplay src="https://cdn.islamic.network/quran/audio/128/${qari}/${questionAyah.number}.mp3"></audio>
        ${options.map(opt => `<div class="option-div" data-number="${opt.number}">${opt.text}</div>`).join('')}
    `;
    const correctAnswer = correctPreviousAyah.text;
    const setupListeners = (area) => area.querySelectorAll('.option-div').forEach(el => 
        el.addEventListener('click', () => handleResultCallback(el.dataset.number == correctPreviousAyah.number, correctAnswer, el))
    );
    return { questionHTML, correctAnswer, setupListeners };
}

/**
 * 6. تحديد رقم الآية
 */
function generateIdentifyAyahNumberQuestion(pageAyahs, qari, handleResultCallback) {
    const questionAyah = shuffleArray(pageAyahs)[0];
    const correctNumber = questionAyah.numberInSurah;
    let options = [correctNumber];
    
    // توليد أرقام خاطئة قريبة من الرقم الصحيح
    while (options.length < 4) {
        const wrongNumber = correctNumber + (Math.floor(Math.random() * 5) - 2);
        if (wrongNumber > 0 && !options.includes(wrongNumber)) {
            options.push(wrongNumber);
        }
    }
    
    const questionHTML = `
        <h3>السؤال: استمع للآية، ثم اختر رقمها الصحيح في السورة</h3>
        <audio controls autoplay src="https://cdn.islamic.network/quran/audio/128/${qari}/${questionAyah.number}.mp3"></audio>
        <div class="interactive-area">${shuffleArray(options).map(opt => `<div class="choice-box" data-number="${opt}">${opt}</div>`).join('')}</div>
    `;
    const correctAnswer = String(correctNumber);
    const setupListeners = (area) => area.querySelectorAll('.choice-box').forEach(el => 
        el.addEventListener('click', () => handleResultCallback(el.dataset.number == correctNumber, correctAnswer, el))
    );
    return { questionHTML, correctAnswer, setupListeners };
}


// --- كتالوج الأسئلة ---
// هذا الكائن يجمع كل دوال الأسئلة ليسهل الوصول إليها من أي مكان آخر.
// المفتاح (مثل 'generateChooseNextQuestion') يجب أن يطابق 'id' في جدول 'questions_config' في قاعدة البيانات.
export const allQuestionGenerators = {
    generateChooseNextQuestion,
    generateLocateAyahQuestion,
    generateCompleteLastWordQuestion,
    generateCompleteAyahQuestion,
    generateChoosePreviousQuestion,
    generateIdentifyAyahNumberQuestion,
    // يمكنك إضافة المزيد من دوال الأسئلة هنا
};
