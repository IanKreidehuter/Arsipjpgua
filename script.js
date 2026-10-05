// App State
const app = {
    data: {
        kotoba: [],
        kanji: [],
        categories: []
    },
    state: {
        currentView: 'home',
        swipeData: [],
        swipeIndex: 0,
        swipeMode: 'kanji' // 'kanji' or 'kotoba'
    },
    DOM: {}
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    cacheDOM();
    setupEventListeners();
    await loadData();
});

function cacheDOM() {
    app.DOM.statusOverlay = document.getElementById('status-overlay');
    app.DOM.statusMessage = document.getElementById('status-message');
    app.DOM.views = document.querySelectorAll('.view');
    app.DOM.navBtns = document.querySelectorAll('.nav-btn, .menu-card');
    
    // Intro elements
    app.DOM.iTitle = document.getElementById('intro-title');
    app.DOM.iSubtitle = document.getElementById('intro-subtitle');
    app.DOM.iDesc = document.getElementById('intro-desc');
    app.DOM.iPlayBtn = document.getElementById('intro-play-btn');
    
    // List containers
    app.DOM.kotobaGrid = document.getElementById('kotoba-grid');
    app.DOM.kanjiGrid = document.getElementById('kanji-grid');
    
    // Filters & Search
    app.DOM.kSearch = document.getElementById('kotoba-search');
    app.DOM.kFilter = document.getElementById('kotoba-filter');
    app.DOM.kanSearch = document.getElementById('kanji-search');
    
    // Swipe elements
    app.DOM.swipeCard = document.getElementById('swipe-card-element');
    app.DOM.swipeCurrent = document.getElementById('swipe-current');
    app.DOM.swipeTotal = document.getElementById('swipe-total');
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    app.DOM.navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            if (target) navigateController(target);
        });
    });

    // Search and Filter (Kotoba)
    app.DOM.kSearch.addEventListener('input', renderKotobaList);
    app.DOM.kFilter.addEventListener('change', renderKotobaList);
    
    // Search (Kanji)
    app.DOM.kanSearch.addEventListener('input', renderKanjiList);

    // Swipe Controls
    document.getElementById('btn-prev').addEventListener('click', prevSwipeCard);
    document.getElementById('btn-next').addEventListener('click', nextSwipeCard);
    document.getElementById('btn-shuffle').addEventListener('click', shuffleSwipeCards);

    // Touch events for swiping
    let touchstartX = 0;
    let touchendX = 0;
    
    app.DOM.swipeCard.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
    });
    
    app.DOM.swipeCard.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        handleSwipeGesture();
    });

    function handleSwipeGesture() {
        if (touchendX < touchstartX - 50) nextSwipeCard();
        if (touchendX > touchstartX + 50) prevSwipeCard();
    }
}

// Fetch Data
async function loadData() {
    try {
        const [resKotoba, resKanji] = await Promise.all([
            fetch('./ALL_KOSAKATA_N4.json'),
            fetch('./ALL_KANJI_N4.json')
        ]);

        if (!resKotoba.ok || !resKanji.ok) throw new Error("HTTP error");

        const dataKotoba = await resKotoba.json();
        const dataKanji = await resKanji.json();

        app.data.kotoba = dataKotoba.kosakata; // 294 entries
        app.data.kanji = dataKanji.kanji;      // 197 entries

        // Extract unique categories (Bab)
        app.data.categories = [...new Set(app.data.kotoba.map(k => k.bab))];
        
        // Populate Kotoba Filter
        app.data.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            app.DOM.kFilter.appendChild(opt);
        });

        // Hide loader
        app.DOM.statusOverlay.classList.remove('active');
        
    } catch (error) {
        console.error(error);
        app.DOM.statusMessage.textContent = "Learning data could not be loaded. Please ensure JSON files are present.";
        app.DOM.statusOverlay.querySelector('.spinner').style.display = 'none';
    }
}

// Navigation Controller
function navigateController(target) {
    if (target.startsWith('intro-')) {
        setupIntroPoster(target.replace('intro-', ''));
        app.navigate('intro');
    } else {
        app.navigate(target);
    }
}

// Core Navigation Function
app.navigate = function(viewId) {
    app.state.currentView = viewId;
    
    // Hide all
    app.DOM.views.forEach(v => v.classList.remove('active'));
    
    // Update nav active states
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('active');
        if(b.getAttribute('data-target') === viewId || 
          (viewId === 'intro' && b.getAttribute('data-target') === `intro-${app.state.introType}`)) {
            b.classList.add('active');
        }
    });

    // Show target
    const targetView = document.getElementById(`view-${viewId}`);
    if(targetView) targetView.classList.add('active');
    window.scrollTo(0, 0);

    // Trigger specific renders
    if (viewId === 'kotoba-list') renderKotobaList();
    if (viewId === 'kanji-list') renderKanjiList();
};

// Setup Intro Posters
function setupIntroPoster(type) {
    app.state.introType = type;
    const playBtn = app.DOM.iPlayBtn;
    playBtn.disabled = false;
    playBtn.style.opacity = '1';
    
    // Reset play button click listener (by cloning)
    const newBtn = playBtn.cloneNode(true);
    playBtn.parentNode.replaceChild(newBtn, playBtn);
    app.DOM.iPlayBtn = newBtn;

    switch(type) {
        case 'kotoba':
            app.DOM.iTitle.textContent = 'KOTOBA';
            app.DOM.iSubtitle.textContent = '言葉';
            app.DOM.iDesc.textContent = 'Learn Japanese Vocabulary';
            newBtn.addEventListener('click', () => app.navigate('kotoba-list'));
            break;
        case 'kanji':
            app.DOM.iTitle.textContent = 'KANJI';
            app.DOM.iSubtitle.textContent = '漢字';
            app.DOM.iDesc.textContent = 'Master Japanese Characters';
            newBtn.addEventListener('click', () => app.navigate('kanji-list'));
            break;
        case 'kanji-swipe':
            app.DOM.iTitle.textContent = 'KANJI CARDS';
            app.DOM.iSubtitle.textContent = 'フラッシュカード';
            app.DOM.iDesc.textContent = 'Practice Kanji with Swipe Cards';
            newBtn.addEventListener('click', () => startSwipeMode('kanji'));
            break;
        case 'kotoba-swipe':
            app.DOM.iTitle.textContent = 'KOTOBA CARDS';
            app.DOM.iSubtitle.textContent = 'フラッシュカード';
            app.DOM.iDesc.textContent = 'Practice Vocabulary with Swipe Cards';
            newBtn.addEventListener('click', () => startSwipeMode('kotoba'));
            break;
        case 'grammar':
            app.DOM.iTitle.textContent = 'GRAMMAR';
            app.DOM.iSubtitle.textContent = '文法';
            app.DOM.iDesc.textContent = 'Grammar Lessons';
            setComingSoonBtn(newBtn);
            break;
        case 'quiz':
            app.DOM.iTitle.textContent = 'QUIZ';
            app.DOM.iSubtitle.textContent = 'クイズ';
            app.DOM.iDesc.textContent = 'Test your Japanese';
            setComingSoonBtn(newBtn);
            break;
    }
}

function setComingSoonBtn(btn) {
    btn.innerHTML = 'COMING SOON';
    btn.disabled = true;
    btn.style.opacity = '0.7';
}

// Render Kotoba List
function renderKotobaList() {
    const q = app.DOM.kSearch.value.toLowerCase();
    const filter = app.DOM.kFilter.value;

    const filtered = app.data.kotoba.filter(k => {
        const matchCat = filter === 'all' || k.bab === filter;
        const matchText = k.hiragana.toLowerCase().includes(q) || 
                          k.kanji.toLowerCase().includes(q) || 
                          k.arti.toLowerCase().includes(q) ||
                          k.bab.toLowerCase().includes(q);
        return matchCat && matchText;
    });

    app.DOM.kotobaGrid.innerHTML = filtered.map((k, index) => {
        // Display hiragana prominent if no kanji
        const mainText = k.kanji ? k.kanji : k.hiragana;
        const subText = k.kanji ? k.hiragana : '';
        return `
            <div class="item-card" onclick="openKotobaDetail(${app.data.kotoba.indexOf(k)})">
                <div class="card-sub">${subText}</div>
                <div class="card-main">${mainText}</div>
                <div class="card-meaning">${k.arti}</div>
            </div>
        `;
    }).join('');
}

// Render Kanji List
function renderKanjiList() {
    const q = app.DOM.kanSearch.value.toLowerCase();

    const filtered = app.data.kanji.filter(k => {
        const kunyomiStr = k.kunyomi.join(', ').toLowerCase();
        const onyomiStr = (k.onyomi || "").toLowerCase();
        const kotobaStr = k.kotoba.map(ko => ko.kata + ko.bacaan + ko.arti).join(' ').toLowerCase();

        return k.kanji.toLowerCase().includes(q) || 
               onyomiStr.includes(q) || 
               kunyomiStr.includes(q) || 
               k.arti.toLowerCase().includes(q) ||
               kotobaStr.includes(q);
    });

    app.DOM.kanjiGrid.innerHTML = filtered.map(k => `
        <div class="item-card" onclick="openKanjiDetail(${app.data.kanji.indexOf(k)})">
            <div class="card-main" style="font-size:3rem; margin:10px 0;">${k.kanji}</div>
            <div class="card-sub">${k.onyomi || '—'}</div>
            <div class="card-meaning">${k.arti}</div>
        </div>
    `).join('');
}

// Detail Views Setup
window.openKotobaDetail = function(index) {
    const k = app.data.kotoba[index];
    document.getElementById('kd-bab').textContent = k.bab;
    document.getElementById('kd-hiragana').textContent = k.hiragana;
    document.getElementById('kd-kanji').textContent = k.kanji || '';
    document.getElementById('kd-arti').textContent = k.arti;
    
    // Adjust layout if no kanji
    document.getElementById('kd-kanji').style.display = k.kanji ? 'block' : 'none';
    document.getElementById('kd-hiragana').style.fontSize = k.kanji ? '1.5rem' : '3rem';
    document.getElementById('kd-hiragana').style.color = k.kanji ? '#64748B' : 'var(--primary-blue)';

    app.navigate('kotoba-detail');
}

window.openKanjiDetail = function(index) {
    const k = app.data.kanji[index];
    document.getElementById('kand-kanji').textContent = k.kanji;
    document.getElementById('kand-arti').textContent = k.arti;
    document.getElementById('kand-on').innerHTML = k.onyomi ? k.onyomi.replace(/,/g, '<br>') : '—';
    document.getElementById('kand-kun').innerHTML = k.kunyomi.length > 0 ? k.kunyomi.join('<br>') : '—';
    
    // Kotoba Examples
    const ul = document.getElementById('kand-kotoba-list');
    ul.innerHTML = k.kotoba.map(ko => `
        <li>
            <div>
                <span class="ew-jp">${ko.kata}</span>
                <span class="ew-read">${ko.bacaan}</span>
            </div>
            <div class="ew-arti">${ko.arti}</div>
        </li>
    `).join('');

    document.getElementById('kand-page').textContent = k.halaman ? `Source page: ${k.halaman}` : '';

    app.navigate('kanji-detail');
}

// Swipe / Flashcard System
function startSwipeMode(mode) {
    app.state.swipeMode = mode;
    // Clone array to allow shuffling without destroying original data
    app.state.swipeData = mode === 'kanji' ? [...app.data.kanji] : [...app.data.kotoba];
    app.state.swipeIndex = 0;
    app.navigate('swipe');
    updateSwipeCard();
}

function updateSwipeCard() {
    const data = app.state.swipeData;
    if(data.length === 0) return;
    
    const idx = app.state.swipeIndex;
    const item = data[idx];
    
    app.DOM.swipeCurrent.textContent = idx + 1;
    app.DOM.swipeTotal.textContent = data.length;

    let html = '';
    
    if (app.state.swipeMode === 'kanji') {
        const onyomi = item.onyomi || '—';
        const kunyomi = item.kunyomi.length > 0 ? item.kunyomi.join('<br>') : '—';
        
        html = `
            <div style="font-family:'Kosugi Maru', sans-serif; font-size:6rem; color:var(--primary-blue); line-height:1;">${item.kanji}</div>
            <div style="font-size:1.3rem; font-weight:bold; margin:20px 0;">${item.arti}</div>
            <div style="display:flex; width:100%; justify-content:space-around; margin-top:10px;">
                <div style="text-align:center;">
                    <div style="font-size:0.8rem; color:#64748B;">ON</div>
                    <div style="font-family:'Kosugi Maru', sans-serif; color:var(--primary-blue);">${onyomi}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:0.8rem; color:#64748B;">KUN</div>
                    <div style="font-family:'Kosugi Maru', sans-serif; color:var(--primary-blue);">${kunyomi}</div>
                </div>
            </div>
        `;
    } else {
        const kanji = item.kanji || '';
        html = `
            <div style="font-family:'Kosugi Maru', sans-serif; font-size:1.5rem; color:#64748B;">${item.hiragana}</div>
            ${kanji ? `<div style="font-family:'Kosugi Maru', sans-serif; font-size:4rem; color:var(--primary-blue); margin:15px 0;">${kanji}</div>` : `<div style="height:30px;"></div>`}
            <div style="font-size:1.5rem; font-weight:bold; margin-top:20px;">${item.arti}</div>
        `;
    }
    
    // Simple fade animation
    app.DOM.swipeCard.style.opacity = '0';
    setTimeout(() => {
        app.DOM.swipeCard.innerHTML = html;
        app.DOM.swipeCard.style.opacity = '1';
    }, 150);
}

function nextSwipeCard() {
    if (app.state.swipeIndex < app.state.swipeData.length - 1) {
        app.state.swipeIndex++;
        updateSwipeCard();
    }
}

function prevSwipeCard() {
    if (app.state.swipeIndex > 0) {
        app.state.swipeIndex--;
        updateSwipeCard();
    }
}

function shuffleSwipeCards() {
    // Fisher-Yates Shuffle
    for (let i = app.state.swipeData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [app.state.swipeData[i], app.state.swipeData[j]] = [app.state.swipeData[j], app.state.swipeData[i]];
    }
    app.state.swipeIndex = 0;
    updateSwipeCard();
}
