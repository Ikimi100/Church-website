// ==================== LOADING SCREEN ====================
document.addEventListener('DOMContentLoaded', updateCartUI);

function initImageFallbacks() {
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', () => {
            if (!img.dataset.fallbackApplied) {
                img.dataset.fallbackApplied = '1';
                img.src = 'images/hero-worship.jpg';
            }
        });
    });
}

window.addEventListener('load', () => {
    initParticles();
    initCalendar();
    initTorahPortions();
    initImageFallbacks();
    updateCartUI();
});

const cartStorageKey = 'whgrm_cart';

function slugify(text) {
    return String(text).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function getCart() {
    return JSON.parse(localStorage.getItem(cartStorageKey)) || [];
}

function saveCart(cart) {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
}

function formatCurrency(amount) {
    return '$' + Number(amount || 0).toFixed(2);
}

function escapeHTML(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function addToCart(itemOrTitle, price, image) {
    const cart = getCart();
    let item;
    if (typeof itemOrTitle === 'object' && itemOrTitle !== null) {
        item = {
            id: itemOrTitle.id || slugify(itemOrTitle.title),
            title: itemOrTitle.title,
            price: Number(itemOrTitle.price) || 0,
            qty: 1,
            image: itemOrTitle.image || itemOrTitle.coverClass || ''
        };
    } else {
        const title = String(itemOrTitle);
        item = {
            id: slugify(title),
            title,
            price: Number(price) || 0,
            qty: 1,
            image: image || ''
        };
    }

    const existing = cart.find(cartItem => cartItem.id === item.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push(item);
    }

    saveCart(cart);
    updateCartUI();
    showToast(`${item.title} added to cart`);
}

function updateCartUI() {
    const cart = getCart();
    const countEl = document.getElementById('cartCount');
    const itemsContainer = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');

    if (countEl) {
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        countEl.textContent = count;
    }

    if (!itemsContainer || !totalEl) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--color-text-muted);"><i class="fas fa-shopping-bag" style="font-size:3rem;display:block;margin-bottom:1rem;opacity:0.3;"></i>Your cart is empty</div>';
        totalEl.textContent = formatCurrency(0);
        return;
    }

    itemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a0f0f,#0f0f1a);">
                <i class="fas fa-book" style="color:var(--color-gold);font-size:1.5rem;"></i>
            </div>
            <div class="cart-item-details">
                <div class="cart-item-title">${escapeHTML(item.title)}</div>
                <div class="cart-item-price">${formatCurrency(item.price)}</div>
                <div class="cart-item-qty">
                    <button class="qty-btn-small" type="button" onclick="updateQty('${escapeHTML(item.id)}', -1)"><i class="fas fa-minus"></i></button>
                    <span>${item.qty}</span>
                    <button class="qty-btn-small" type="button" onclick="updateQty('${escapeHTML(item.id)}', 1)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <button class="remove-item" type="button" onclick="removeFromCart('${escapeHTML(item.id)}')"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    totalEl.textContent = formatCurrency(total);
}

function toggleCart() {
    const overlay = document.getElementById('cartOverlay');
    const sidebar = document.getElementById('cartSidebar');
    if (overlay) overlay.classList.toggle('open');
    if (sidebar) sidebar.classList.toggle('open');
}

function checkout() {
    const cart = getCart();
    if (cart.length === 0) {
        showToast('Your cart is empty');
        return;
    }
    window.location.href = 'checkout.html';
}

function removeFromCart(id) {
    const cart = getCart().filter(item => item.id !== id);
    saveCart(cart);
    updateCartUI();
}

function updateQty(id, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(id);
    } else {
        saveCart(cart);
        updateCartUI();
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) {
        console.log(msg);
        return;
    }
    toastMessage.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ====== Donation helpers (used by index/give sections) ======
function selectAmount(btn, amt) {
    try {
        const buttons = document.querySelectorAll('#give .amount-btn, .preset-amounts .amount-btn');
        buttons.forEach(b => b.classList && b.classList.remove('active'));
    } catch (e) {}

    let value = amt;
    if (!value && btn) {
        const txt = (btn.textContent || btn.innerText || '');
        const num = txt.replace(/[^0-9\.]/g, '');
        value = parseFloat(num) || 0;
    }

    if (btn && btn.classList) btn.classList.add('active');
    // update any visible total on the page
    const totalDisplay = document.getElementById('totalDisplay');
    if (totalDisplay) totalDisplay.textContent = (value || 0).toLocaleString();
    // store temporarily so openDonateModal can pick it up
    try { localStorage.setItem('mm_donate_amount_tmp', String(value || '')); } catch (e) {}
    return value;
}

function clearPresets() {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    const val = document.getElementById('customAmount')?.value;
    if (val) {
        localStorage.setItem('mm_donate_amount_tmp', String(val));
        const totalDisplay = document.getElementById('totalDisplay');
        if (totalDisplay) totalDisplay.textContent = Number(val).toLocaleString();
    }
}

function selectFreq(btn, freq) {
    document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
    if (btn && btn.classList) btn.classList.add('active');
    try { localStorage.setItem('mm_donate_freq_tmp', freq); } catch (e) {}
}

function openDonateModal(category) {
    const stored = localStorage.getItem('mm_donate_amount_tmp');
    let amount = stored || '';
    // try to read any active preset on the page
    try {
        const active = document.querySelector('#give .amount-btn.active, .preset-amounts .amount-btn.active');
        if (active) {
            const parsed = (active.textContent || '').replace(/[^0-9\.]/g, '');
            if (parsed) amount = parsed;
        }
    } catch (e) {}

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (amount) params.set('amount', amount);
    const freq = localStorage.getItem('mm_donate_freq_tmp');
    if (freq) params.set('freq', freq);
    window.location.href = 'donate.html' + (params.toString() ? ('?' + params.toString()) : '');
}

// ==================== TORAH PORTIONS DATA ====================
const torahPortions = [
    { week: "Bereisheet", hebrew: "בראשית", torah: "Genesis 1:1–6:8", prophets: "Isaiah 42:5–43:10", gospel: "John 1:1-18", date: "October 18, 2025" },
    { week: "Noach", hebrew: "נח", torah: "Genesis 6:9–11:32", prophets: "Isaiah 54:1–55:5", gospel: "Matthew 24:36-46", date: "October 25, 2025" },
    { week: "Lech Lecha", hebrew: "לך לך", torah: "Genesis 12:1–17:27", prophets: "Isaiah 40:27–41:16", gospel: "Romans 4:1-25", date: "November 1, 2025" },
    { week: "Vayera", hebrew: "וירא", torah: "Genesis 18:1–22:24", prophets: "2 Kings 4:1-37", gospel: "Luke 17:26-37", date: "November 8, 2025" },
    { week: "Chayei Sarah", hebrew: "חיי שרה", torah: "Genesis 23:1–25:18", prophets: "1 Kings 1:1-31", gospel: "Matthew 1:1-17", date: "November 15, 2025" },
    { week: "Toldot", hebrew: "תולדות", torah: "Genesis 25:19–28:9", prophets: "Malachi 1:1–2:7", gospel: "Romans 9:1-31", date: "November 22, 2025" },
    { week: "Vayetzei", hebrew: "ויצא", torah: "Genesis 28:10–32:3", prophets: "Hosea 12:12–14:9", gospel: "John 1:19-51", date: "November 29, 2025" },
    { week: "Vayishlach", hebrew: "וישלח", torah: "Genesis 32:4–36:43", prophets: "Obadiah 1:1-21", gospel: "Hebrews 11:11-20", date: "December 6, 2025" },
    { week: "Vayeshev", hebrew: "וישב", torah: "Genesis 37:1–40:23", prophets: "Amos 2:6–3:8", gospel: "Matthew 1:1-6", date: "December 13, 2025" },
    { week: "Miketz", hebrew: "מקץ", torah: "Genesis 41:1–44:17", prophets: "1 Kings 3:15–4:1", gospel: "Romans 10:1-13", date: "December 20, 2025" },
    { week: "Vayigash", hebrew: "ויגש", torah: "Genesis 44:18–47:27", prophets: "Ezekiel 37:15-28", gospel: "Ephesians 2:1-10", date: "December 27, 2025" },
    { week: "Vayechi", hebrew: "ויחי", torah: "Genesis 47:28–50:26", prophets: "1 Kings 2:1-12", gospel: "Hebrews 11:21-22", date: "January 3, 2026" },
    { week: "Shemot", hebrew: "שמות", torah: "Exodus 1:1–6:1", prophets: "Isaiah 27:6–28:13; 29:22-23", gospel: "Acts 7:17-35", date: "January 10, 2026" },
    { week: "Va'era", hebrew: "וארא", torah: "Exodus 6:2–9:35", prophets: "Ezekiel 28:25–29:21", gospel: "Romans 9:14-33", date: "January 17, 2026" },
    { week: "Bo", hebrew: "בא", torah: "Exodus 10:1–13:16", prophets: "Jeremiah 46:13-28", gospel: "Luke 22:7-30", date: "January 24, 2026" },
    { week: "Beshalach", hebrew: "בשלח", torah: "Exodus 13:17–17:16", prophets: "Judges 4:4–5:31", gospel: "John 6:15-71", date: "January 31, 2026" },
    { week: "Yitro", hebrew: "יתרו", torah: "Exodus 18:1–20:26", prophets: "Isaiah 6:1–7:6; 9:5-6", gospel: "Matthew 8:5-20", date: "February 7, 2026" },
    { week: "Mishpatim", hebrew: "משפטים", torah: "Exodus 21:1–24:18", prophets: "Jeremiah 34:8-22; 33:25-26", gospel: "Matthew 5:38-42", date: "February 14, 2026" },
    { week: "Terumah", hebrew: "תרומה", torah: "Exodus 25:1–27:19", prophets: "1 Kings 5:26–6:13", gospel: "2 Corinthians 9:1-15", date: "February 21, 2026" },
    { week: "Tetzaveh", hebrew: "תצוה", torah: "Exodus 27:20–30:10", prophets: "Ezekiel 43:10-27", gospel: "Hebrews 13:10-17", date: "February 28, 2026" },
    { week: "Ki Tisa", hebrew: "כי תשא", torah: "Exodus 30:11–34:35", prophets: "1 Kings 18:1-39", gospel: "2 Corinthians 3:1-18", date: "March 7, 2026" },
    { week: "Vayak'hel-Pekudei", hebrew: "ויקהל-פקודי", torah: "Exodus 35:1–40:38", prophets: "1 Kings 7:13-26; 7:40-8:21", gospel: "1 Corinthians 3:11-18", date: "March 14, 2026" },
    { week: "Vayikra", hebrew: "ויקרא", torah: "Leviticus 1:1–5:26", prophets: "Isaiah 43:21–44:23", gospel: "Hebrews 10:1-18", date: "March 21, 2026" },
    { week: "Tzav", hebrew: "צו", torah: "Leviticus 6:1–8:36", prophets: "Jeremiah 7:21–8:3; 9:22-23", gospel: "Hebrews 7:23-8:6", date: "March 28, 2026" },
    { week: "Shemini", hebrew: "שמיני", torah: "Leviticus 9:1–11:47", prophets: "2 Samuel 6:1–7:17", gospel: "Hebrews 8:1-6", date: "April 11, 2026" },
    { week: "Tazria-Metzora", hebrew: "תזריע-מצורע", torah: "Leviticus 12:1–15:33", prophets: "2 Kings 4:42–5:19; 7:3-20", gospel: "Matthew 8:1-17", date: "April 18, 2026" },
    { week: "Acharei Mot-Kedoshim", hebrew: "אחרי מות-קדושים", torah: "Leviticus 16:1–20:27", prophets: "Ezekiel 22:1-22; Amos 9:7-15", gospel: "1 Peter 1:13-16", date: "April 25, 2026" },
    { week: "Emor", hebrew: "אמור", torah: "Leviticus 21:1–24:23", prophets: "Ezekiel 44:15-31", gospel: "1 Peter 2:4-10", date: "May 2, 2026" },
    { week: "Behar-Bechukotai", hebrew: "בהר-בחקתי", torah: "Leviticus 25:1–27:34", prophets: "Jeremiah 16:19–17:14", gospel: "Luke 4:16-21", date: "May 9, 2026" },
    { week: "Bamidbar", hebrew: "במדבר", torah: "Numbers 1:1–4:20", prophets: "Hosea 1:1–2:22", gospel: "Romans 9:22-33", date: "May 16, 2026" },
    { week: "Nasso", hebrew: "נשא", torah: "Numbers 4:21–7:89", prophets: "Judges 13:2-5", gospel: "Acts 21:17-26", date: "May 30, 2026" },
    { week: "Beha'alotcha", hebrew: "בהעלותך", torah: "Numbers 8:1–12:16", prophets: "Zechariah 2:10–4:7", gospel: "1 Corinthians 10:6-13", date: "June 6, 2026" },
    { week: "Shelach", hebrew: "שלח", torah: "Numbers 13:1–15:41", prophets: "Joshua 2:1-24", gospel: "Hebrews 3:7–4:1", date: "June 13, 2026" },
    { week: "Korach", hebrew: "קרח", torah: "Numbers 16:1–18:32", prophets: "1 Samuel 11:14–12:22", gospel: "Romans 13:1-7", date: "June 20, 2026" },
    { week: "Chukat-Balak", hebrew: "חקת-בלק", torah: "Numbers 19:1–25:9", prophets: "Judges 11:1-33; Micah 5:6–6:8", gospel: "John 3:10-21", date: "June 27, 2026" },
    { week: "Pinchas", hebrew: "פינחס", torah: "Numbers 25:10–30:1", prophets: "1 Kings 18:46–19:21", gospel: "Romans 11:2-32", date: "July 4, 2026" },
    { week: "Mattot-Massei", hebrew: "מטות-מסעי", torah: "Numbers 30:1–36:13", prophets: "Jeremiah 1:1–2:28; 3:4; 4:1-2", gospel: "Matthew 5:33-37", date: "July 11, 2026" },
    { week: "Devarim", hebrew: "דברים", torah: "Deuteronomy 1:1–3:22", prophets: "Isaiah 1:1-27", gospel: "Acts 9:1-21", date: "July 18, 2026" },
    { week: "Va'etchanan", hebrew: "ואתחנן", torah: "Deuteronomy 3:23–7:11", prophets: "Isaiah 40:1-26", gospel: "Mark 12:28-34", date: "July 25, 2026" },
    { week: "Ekev", hebrew: "עקב", torah: "Deuteronomy 7:12–11:25", prophets: "Isaiah 49:14–51:3", gospel: "Romans 8:31-39", date: "August 1, 2026" },
    { week: "Re'eh", hebrew: "ראה", torah: "Deuteronomy 11:26–16:17", prophets: "Isaiah 54:11–55:5", gospel: "John 7:37-52", date: "August 8, 2026" },
    { week: "Shoftim", hebrew: "שפטים", torah: "Deuteronomy 16:18–21:9", prophets: "Isaiah 51:12–52:12", gospel: "Acts 3:22-23", date: "August 15, 2026" },
    { week: "Ki Tetze", hebrew: "כי תצא", torah: "Deuteronomy 21:10–25:19", prophets: "Isaiah 53:1–54:10", gospel: "1 Corinthians 5:1-5", date: "August 22, 2026" },
    { week: "Ki Tavo", hebrew: "כי תבוא", torah: "Deuteronomy 26:1–29:8", prophets: "Isaiah 60:1-22", gospel: "Ephesians 1:3-6", date: "August 29, 2026" },
    { week: "Nitzavim-Vayelech", hebrew: "נצבים-וילך", torah: "Deuteronomy 29:9–31:30", prophets: "Isaiah 55:6–56:8; 61:10–63:9", gospel: "Romans 10:1-12", date: "September 5, 2026" },
    { week: "Ha'Azinu", hebrew: "האזינו", torah: "Deuteronomy 32:1-52", prophets: "2 Samuel 22:1-51", gospel: "Romans 10:14–11:12", date: "September 19, 2026" },
    { week: "Vezot Ha'Bracha", hebrew: "וזאת הברכה", torah: "Deuteronomy 33:1–34:12", prophets: "Joshua 1:1-18", gospel: "Revelation 22:1-5", date: "October 4, 2026" }
];

// ==================== TORAH SLIDER ====================
function initTorahPortions() {
    const slider = document.getElementById('torahSlider');
    if (!slider) return;
    slider.innerHTML = '';

    torahPortions.forEach((portion, index) => {
        const slug = portion.week.toLowerCase().replace(/'/g, '').replace(/\s+/g, '-');
        const card = document.createElement('div');
        card.className = 'torah-card';
        card.innerHTML = `
            <div class="torah-week-badge"><i class="fas fa-scroll"></i> Week ${index + 1} of 54</div>
            <div class="torah-hebrew-name">${portion.hebrew}</div>
            <h3>${portion.week}</h3>
            <div class="torah-readings">
                <div class="torah-reading torah"><div class="torah-reading-icon"><i class="fas fa-book"></i></div><div class="torah-reading-content"><div class="torah-reading-label">Torah</div><div class="torah-reading-text">${portion.torah}</div></div></div>
                <div class="torah-reading prophets"><div class="torah-reading-icon"><i class="fas fa-fire"></i></div><div class="torah-reading-content"><div class="torah-reading-label">Prophets</div><div class="torah-reading-text">${portion.prophets}</div></div></div>
                <div class="torah-reading gospel"><div class="torah-reading-icon"><i class="fas fa-cross"></i></div><div class="torah-reading-content"><div class="torah-reading-label">Gospel</div><div class="torah-reading-text">${portion.gospel}</div></div></div>
            </div>
            <div class="torah-date"><i class="fas fa-calendar-alt"></i><span>${portion.date}</span></div>
            <a href="weekly-${slug}.html" style="display:block;margin-top:1.5rem;padding:0.8rem;background:rgba(212,175,55,0.1);border:1px solid var(--color-gold);border-radius:12px;text-align:center;color:var(--color-gold);text-decoration:none;font-weight:600;">Read Weekly Study →</a>
        `;
        slider.appendChild(card);
    });

    slider.addEventListener('scroll', updateTorahProgress);
}

function scrollTorah(direction) {
    const slider = document.getElementById('torahSlider');
    const amount = 400;
    slider.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
}

function updateTorahProgress() {
    const slider = document.getElementById('torahSlider');
    const bar = document.getElementById('torahProgress');
    if (!slider || !bar) return;
    const percent = (slider.scrollLeft / (slider.scrollWidth - slider.clientWidth)) * 100;
    bar.style.width = percent + '%';
}

// ==================== CALENDAR ====================
const calendarEvents = [
    {id:1,name:"Passover",hebrewName:"Pesach",date:"2026-04-12",month:"APR",day:"12",year:"2026",description:"Commemorating the liberation...",scripture:"Exodus 12:1-28",type:"upcoming",status:"Next"},
    {id:2,name:"Feast of Unleavened Bread",hebrewName:"Chag HaMatzot",date:"2026-04-13",month:"APR",day:"13-19",year:"2026",description:"Seven days of eating unleavened bread...",scripture:"Leviticus 23:6-8",type:"upcoming",status:"Coming"},
    {id:3,name:"Feast of Trumpets",hebrewName:"Rosh Hashanah",date:"2026-09-25",month:"SEP",day:"25",year:"2026",description:"The blowing of the shofar...",scripture:"Leviticus 23:23-25",type:"upcoming",status:"Future"},
    {id:4,name:"Day of Atonement",hebrewName:"Yom Kippur",date:"2026-10-04",month:"OCT",day:"04",year:"2026",description:"The holiest day...",scripture:"Leviticus 23:26-32",type:"upcoming",status:"Future"},
    {id:5,name:"Feast of Tabernacles",hebrewName:"Sukkot",date:"2026-10-09",month:"OCT",day:"09-16",year:"2026",description:"Dwelling in temporary shelters...",scripture:"Leviticus 23:33-43",type:"upcoming",status:"Future"},
    {id:6,name:"Pentecost",hebrewName:"Shavuot",date:"2026-05-31",month:"MAY",day:"31",year:"2026",description:"The giving of the Torah...",scripture:"Acts 2:1-4",type:"upcoming",status:"Coming"}
];

let currentFilter = 'upcoming';

function initCalendar() {
    renderCalendar('upcoming');
}

function renderCalendar(filter) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = filter === 'all' ? calendarEvents : calendarEvents.filter(e => e.type === 'upcoming');

    filtered.forEach((event, i) => {
        const card = document.createElement('div');
        card.className = 'calendar-card fade-in';
        card.style.animationDelay = i * 0.1 + 's';
        card.innerHTML = `
            ${event.status ? `<div class="calendar-status">${event.status}</div>` : ''}
            <div class="calendar-date-badge">
                <span class="calendar-month">${event.month}</span>
                <span class="calendar-day">${event.day}</span>
                <span class="calendar-year">${event.year}</span>
            </div>
            <div class="calendar-hebrew">${event.hebrewName}</div>
            <h3>${event.name}</h3>
            <p class="calendar-description">${event.description}</p>
            <div class="calendar-scripture"><i class="fas fa-book-open"></i><span>${event.scripture}</span></div>
        `;
        grid.appendChild(card);
    });
}

function filterCalendar(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
    renderCalendar(filter);
}

// ==================== PARTICLES & CURSOR ====================
function initParticles() {
    const c = document.getElementById('particles');
    if (!c) return;
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random()*100 + '%';
        p.style.animationDelay = Math.random()*15 + 's';
        p.style.animationDuration = (15 + Math.random()*10) + 's';
        c.appendChild(p);
    }
}

const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
if (cursor && cursorDot && window.matchMedia("(min-width: 1024px)").matches) {
    let mx=0,my=0,cx=0,cy=0,dx=0,dy=0;
    document.addEventListener('mousemove', e=>{mx=e.clientX;my=e.clientY;});
    function animate() {
        cx += (mx-cx)*0.1; cy += (my-cy)*0.1;
        dx += (mx-dx)*0.5; dy += (my-dy)*0.5;
        cursor.style.left = cx+'px'; cursor.style.top = cy+'px';
        cursorDot.style.left = dx+'px'; cursorDot.style.top = dy+'px';
        requestAnimationFrame(animate);
    }
    animate();
}

// ==================== BASIC SCROLL FUNCTIONS ====================
function scrollToTop() { window.scrollTo({top:0, behavior:'smooth'}); }
function scrollToStore() { document.getElementById('store')?.scrollIntoView({behavior:'smooth'}); }
function scrollToGive() { document.getElementById('give')?.scrollIntoView({behavior:'smooth'}); }

function renderCheckoutPage() {
    const cart = getCart();
    const itemsContainer = document.getElementById('checkoutItems');
    const summaryTotal = document.getElementById('summaryTotal');
    const checkoutForm = document.getElementById('checkoutForm');

    if (!itemsContainer || !summaryTotal) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<div class="empty-checkout">Your cart is empty. <a href="items.html">Continue shopping</a></div>';
        summaryTotal.textContent = formatCurrency(0);
        if (checkoutForm) checkoutForm.style.display = 'none';
        return;
    }

    let subtotal = 0;
    itemsContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        return `
            <div class="summary-item">
                <div>
                    <h4>${escapeHTML(item.title)}</h4>
                    <div class="summary-meta">${item.qty} × ${formatCurrency(item.price)}</div>
                </div>
                <div class="summary-price">${formatCurrency(itemTotal)}</div>
            </div>
        `;
    }).join('');

    summaryTotal.textContent = formatCurrency(subtotal);
}

function placeOrder(event) {
    event.preventDefault();
    const cart = getCart();
    if (cart.length === 0) {
        showToast('Your cart is empty');
        renderCheckoutPage();
        return;
    }
    const name = document.getElementById('billingName')?.value.trim();
    const email = document.getElementById('billingEmail')?.value.trim();
    if (!name || !email) {
        showToast('Please complete the form');
        return;
    }

    localStorage.removeItem(cartStorageKey);
    updateCartUI();

    const checkoutResult = document.getElementById('checkoutResult');
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) checkoutForm.style.display = 'none';
    if (checkoutResult) {
        checkoutResult.innerHTML = `
            <div class="purchase-success">
                <h3>Order Confirmed</h3>
                <p>Thank you, ${escapeHTML(name)}. Your order is secured and is now being processed.</p>
                <p>A confirmation email will be sent to <strong>${escapeHTML(email)}</strong>.</p>
                <a href="items.html" class="btn-secondary">Return to Store</a>
            </div>
        `;
    }
    renderCheckoutPage();
}
