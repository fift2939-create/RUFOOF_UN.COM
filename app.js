/**
 * رفوف - Rofof Digital Library
 * JavaScript Application
 */

// ===========================================
// Configuration
// ===========================================
// ===========================================
// Configuration
// ===========================================
const CONFIG = {
    // Google Apps Script URL (Proxy for Drive)
    scriptUrl: 'https://script.google.com/macros/s/AKfycbxnkmsxcSBgG7lDtU2CQlEcPYsFd5zJuTpDXW2sDAwk7CTGdApVs3cM13qd12mrrTsf/exec',

    // Storage key for settings
    storageKey: 'rofof_settings',

    // Cache duration in milliseconds (5 minutes)
    cacheDuration: 5 * 60 * 1000
};

// ===========================================
// State Management
// ===========================================
const state = {
    allBooks: [],
    isLoading: false,
    cache: {}
};

// ===========================================
// DOM Elements
// ===========================================
const DOM = {
    // Loader
    loader: document.getElementById('loader'),

    // Navigation
    header: document.getElementById('header'),
    navToggle: document.getElementById('nav-toggle'),
    navMenu: document.getElementById('nav-menu'),
    navLinks: document.querySelectorAll('.nav-link'),

    // Search
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    searchModal: document.getElementById('search-modal'),
    searchModalClose: document.getElementById('search-modal-close'),
    searchResults: document.getElementById('search-results'),

    // Book Modal
    bookModal: document.getElementById('book-modal'),
    modalClose: document.getElementById('modal-close'),
    modalIcon: document.getElementById('modal-icon'),
    modalTitle: document.getElementById('modal-title'),
    modalInfo: document.getElementById('modal-info'),
    modalView: document.getElementById('modal-view'),
    modalDownload: document.getElementById('modal-download'),

    // Grids
    grids: {
        novels: document.getElementById('novels-grid'),
        stories: document.getElementById('stories-grid'),
        initiatives: document.getElementById('initiatives-grid'),
        jobs: document.getElementById('jobs-grid'),
        partners: document.getElementById('partners-grid')
    },

    // Counts
    counts: {
        novels: document.getElementById('novels-count'),
        stories: document.getElementById('stories-count'),
        initiatives: document.getElementById('initiatives-count'),
        jobs: document.getElementById('jobs-count'),
        partners: document.getElementById('partners-count'),
        total: document.getElementById('total-books'),
        visitors: document.getElementById('total-visitors')
    },

    // Back to top
    backToTop: document.getElementById('back-to-top')
};

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get file icon based on MIME type
 */
function getFileIcon(mimeType) {
    const icons = {
        'application/pdf': 'fa-file-pdf',
        'application/msword': 'fa-file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word',
        'application/vnd.ms-excel': 'fa-file-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel',
        'application/vnd.ms-powerpoint': 'fa-file-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fa-file-powerpoint',
        'image/jpeg': 'fa-file-image',
        'image/png': 'fa-file-image',
        'image/gif': 'fa-file-image',
        'text/plain': 'fa-file-alt',
        'application/zip': 'fa-file-archive',
        'application/x-rar-compressed': 'fa-file-archive'
    };
    return icons[mimeType] || 'fa-file';
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (!bytes) return 'غير معروف';
    const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get section icon
 */
function getSectionIcon(section) {
    const icons = {
        novels: 'fa-book',
        stories: 'fa-feather-alt',
        initiatives: 'fa-rocket',
        jobs: 'fa-briefcase',
        partners: 'fa-handshake'
    };
    return icons[section] || 'fa-file';
}

/**
 * Get section name in Arabic
 */
function getSectionName(section) {
    const names = {
        novels: 'الروايات',
        stories: 'القصص',
        initiatives: 'المبادرات',
        jobs: 'الوظائف',
        partners: 'الشركاء'
    };
    return names[section] || section;
}

// ===========================================
// Data Loading (via Apps Script)
// ===========================================

/**
 * Load all sections data from Google Apps Script
 */
async function loadAllSections() {
    state.isLoading = true;
    state.allBooks = [];
    const sections = ['novels', 'stories', 'initiatives', 'jobs', 'partners'];

    // Update Cache Check
    if (state.cache['allData'] && Date.now() - state.cache['allData'].timestamp < CONFIG.cacheDuration) {
        processData(state.cache['allData'].data);
        state.isLoading = false;
        return;
    }

    try {
        const response = await fetch(CONFIG.scriptUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Cache data
        state.cache['allData'] = {
            data: data,
            timestamp: Date.now()
        };

        processData(data);

    } catch (error) {
        console.error('Error loading data:', error);
        sections.forEach(section => {
            const grid = DOM.grids[section];
            if (grid) renderErrorState(grid, section);
        });
    }

    state.isLoading = false;
}

/**
 * Process and render loaded data
 */
function processData(data) {
    const sections = ['novels', 'stories', 'initiatives', 'jobs', 'partners'];

    sections.forEach(section => {
        const rawFiles = data[section] || [];
        const grid = DOM.grids[section];

        // Enrich files with section info
        const enrichedFiles = rawFiles.map(file => ({
            ...file,
            section,
            sectionName: getSectionName(section)
        }));

        // Add to global state for search
        state.allBooks.push(...enrichedFiles);

        // Render
        if (enrichedFiles.length > 0) {
            if (section === 'partners') {
                renderPartners(grid, enrichedFiles);
            } else {
                renderBooks(grid, enrichedFiles, section);
            }

            // Update count
            if (DOM.counts[section]) {
                DOM.counts[section].textContent = enrichedFiles.length;
            }
        } else {
            renderEmptyState(grid, section);
        }
    });

    // Update total count
    if (DOM.counts.total) {
        DOM.counts.total.textContent = state.allBooks.length;
    }
}

// ===========================================
// Rendering Functions
// ===========================================

/**
 * Render books grid
 */
function renderBooks(container, files, section) {
    container.innerHTML = files.map(file => `
        <div class="book-card" data-file-id="${file.id}" data-section="${section}">
            <div class="book-cover">
        ${file.thumbnailLink
            ? `<img src="${file.thumbnailLink}" alt="${file.name}" loading="lazy">`
            : `<img src="${CONFIG.defaultCover || 'IMG-20251115-WA0002.jpg'}" alt="${file.name}" loading="lazy" style="object-fit: cover; opacity: 0.9;">`
        }
                <span class="book-badge">${getSectionName(section)}</span>
            </div>
            <div class="book-info">
                <h3 class="book-title">${file.name.replace(/\.[^/.]+$/, '')}</h3>
                <div class="book-meta">
                    <span><i class="fas fa-hdd"></i> ${formatFileSize(file.size)}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(file.modifiedTime)}</span>
                </div>
                <div class="book-actions">
                    <a href="${file.webViewLink || '#'}" target="_blank" class="btn btn-primary" onclick="event.stopPropagation()">
                        <i class="fas fa-eye"></i> معاينة
                    </a>
                    <a href="${file.webContentLink || file.webViewLink || '#'}" target="_blank" class="btn btn-secondary" onclick="event.stopPropagation()">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join('');

    // Add click listeners
    container.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', () => {
            const fileId = card.dataset.fileId;
            const file = state.allBooks.find(f => f.id === fileId);
            if (file) {
                openBookModal(file);
            }
        });
    });
}

/**
 * Render partners grid
 */
function renderPartners(container, files) {
    container.innerHTML = files.map(file => `
        <div class="partner-card" data-file-id="${file.id}">
            <div class="partner-logo">
                ${file.thumbnailLink
            ? `<img src="${file.thumbnailLink}" alt="${file.name}" loading="lazy">`
            : `<i class="fas fa-handshake"></i>`
        }
            </div>
            <h4 class="partner-name">${file.name.replace(/\.[^/.]+$/, '')}</h4>
        </div>
    `).join('');

    // Add click listeners
    container.querySelectorAll('.partner-card').forEach(card => {
        card.addEventListener('click', () => {
            const fileId = card.dataset.fileId;
            const file = state.allBooks.find(f => f.id === fileId);
            if (file) {
                openBookModal(file);
            }
        });
    });
}

/**
 * Render empty state
 */
function renderEmptyState(container, section) {
    const messages = {
        novels: 'لا توجد روايات حالياً.',
        stories: 'لا توجد قصص حالياً.',
        initiatives: 'لا توجد مبادرات حالياً.',
        jobs: 'لا توجد وظائف حالياً.',
        partners: 'لا يوجد شركاء حالياً.'
    };

    container.innerHTML = `
        <div class="empty-state">
            <i class="fas ${getSectionIcon(section)}"></i>
            <p>${messages[section] || 'لا توجد بيانات.'}</p>
        </div>
    `;
}

/**
 * Render error state
 */
function renderErrorState(container, section) {
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>حدث خطأ في تحميل البيانات. تأكد من صحة مفتاح API ومعرفات المجلدات.</p>
            <button class="btn btn-primary" onclick="loadAllSections()">
                <i class="fas fa-redo"></i> إعادة المحاولة
            </button>
        </div>
    `;
}

// ===========================================
// Modal Functions
// ===========================================

/**
 * Open book modal
 */
function openBookModal(file) {
    DOM.modalTitle.textContent = file.name.replace(/\.[^/.]+$/, '');

    // Customize for Partners and Initiatives
    const isVisualItem = ['partners', 'initiatives'].includes(file.section);

    // Content
    DOM.modalInfo.innerHTML = `
        ${file.description ? `<div style="margin-bottom: 15px; color: var(--text-primary); line-height: 1.6;">${file.description}</div>` : ''}
        <div style="font-size: 0.9em; opacity: 0.8; display: ${isVisualItem ? 'none' : 'block'}">
            <span><i class="fas fa-folder"></i> ${file.sectionName}</span> • 
            <span><i class="fas fa-hdd"></i> ${formatFileSize(file.size)}</span> • 
            <span><i class="fas fa-calendar"></i> ${formatDate(file.modifiedTime)}</span>
        </div>
    `;

    // Icon/Image
    if (isVisualItem && (file.thumbnailLink || CONFIG.defaultCover)) {
        const imgSrc = file.thumbnailLink || CONFIG.defaultCover;
        DOM.modalIcon.innerHTML = `<img src="${imgSrc}" alt="${file.name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: var(--radius-md);">`;
        DOM.modalIcon.style.borderRadius = '0'; // Reset border radius for full image
        DOM.modalIcon.style.background = 'transparent';
        DOM.modalIcon.style.width = '200px'; // Larger size for image
        DOM.modalIcon.style.height = '200px';
    } else {
        DOM.modalIcon.innerHTML = `<i class="fas ${getFileIcon(file.mimeType)}"></i>`;
        DOM.modalIcon.style.borderRadius = ''; // content default
        DOM.modalIcon.style.background = ''; // content default
        DOM.modalIcon.style.width = ''; // content default
        DOM.modalIcon.style.height = ''; // content default
    }

    // Actions (Hide for visual items)
    const modalActions = document.querySelector('.modal-actions');
    if (modalActions) {
        modalActions.style.display = isVisualItem ? 'none' : 'flex';
    }

    DOM.modalView.href = file.webViewLink || '#';
    DOM.modalDownload.href = file.webContentLink || file.webViewLink || '#';

    DOM.bookModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close book modal
 */
function closeBookModal() {
    DOM.bookModal.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Close search modal
 */
function closeSearchModal() {
    DOM.searchModal.classList.remove('active');
    document.body.style.overflow = '';
}

// ===========================================
// Search Functions
// ===========================================

/**
 * Perform search
 */
function performSearch() {
    const query = DOM.searchInput.value.trim().toLowerCase();

    if (!query) return;

    const results = state.allBooks.filter(file =>
        file.name.toLowerCase().includes(query)
    );

    renderSearchResults(results, query);
    DOM.searchModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Render search results
 */
function renderSearchResults(results, query) {
    if (results.length === 0) {
        DOM.searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>لا توجد نتائج لـ "${query}"</p>
            </div>
        `;
        return;
    }

    DOM.searchResults.innerHTML = results.map(file => `
        <div class="search-result-item" data-file-id="${file.id}">
            <div class="search-result-icon">
                <i class="fas ${getFileIcon(file.mimeType)}"></i>
            </div>
            <div class="search-result-info">
                <h4>${file.name.replace(/\.[^/.]+$/, '')}</h4>
                <span><i class="fas fa-folder"></i> ${file.sectionName}</span>
            </div>
        </div>
    `).join('');

    // Add click listeners
    DOM.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const fileId = item.dataset.fileId;
            const file = state.allBooks.find(f => f.id === fileId);
            if (file) {
                closeSearchModal();
                openBookModal(file);
            }
        });
    });
}

// ===========================================
// Configuration Loading
// ===========================================

/**
 * Load settings from localStorage
 */
function loadSettings() {
    try {
        const saved = localStorage.getItem(CONFIG.storageKey);
        if (saved) {
            const settings = JSON.parse(saved);
            CONFIG.apiKey = settings.apiKey || CONFIG.apiKey;
            CONFIG.defaultCover = settings.defaultCover || '';
            CONFIG.folders = {
                ...CONFIG.folders,
                ...settings.folders
            };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// ===========================================
// Navigation Functions
// ===========================================

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    DOM.navMenu.classList.toggle('active');

    // Change icon
    const icon = DOM.navToggle.querySelector('i');
    if (DOM.navMenu.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

/**
 * Update active nav link based on scroll
 */
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.scrollY;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            DOM.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

/**
 * Handle scroll events
 */
function handleScroll() {
    // Header scroll effect
    if (window.scrollY > 50) {
        DOM.header.classList.add('scrolled');
    } else {
        DOM.header.classList.remove('scrolled');
    }

    // Back to top button
    if (window.scrollY > 500) {
        DOM.backToTop.classList.add('visible');
    } else {
        DOM.backToTop.classList.remove('visible');
    }

    // Update active nav link
    updateActiveNavLink();
}

/**
 * Scroll to top
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ===========================================
// Stats Animation
// ===========================================

/**
 * Animate counter
 */
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);

    const animate = () => {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(animate);
        } else {
            element.textContent = target;
        }
    };

    animate();
}

/**
 * Generate random visitor count for demo
 */
function generateVisitorCount() {
    const base = 1000;
    const random = Math.floor(Math.random() * 500);
    return base + random;
}

// ===========================================
// Theme & Language Management
// ===========================================

const TRANSLATIONS = {
    ar: {
        nav_home: 'الرئيسية',
        nav_novels: 'الروايات',
        nav_stories: 'القصص',
        nav_initiatives: 'المبادرات',
        nav_jobs: 'الوظائف',
        nav_partners: 'الشركاء',
        logo_name: 'رفوف',
        hero_subtitle: 'مكتبتك الرقمية',
        hero_desc: 'اكتشف عالماً من الكتب والروايات والقصص. مكتبة رقمية متكاملة تضم أفضل المحتوى العربي في مكان واحد.',
        search_placeholder: 'ابحث عن كتاب، رواية، أو قصة...',
        search_btn: 'بحث',
        stat_books: 'كتاب',
        stat_sections: 'أقسام',
        stat_visitors: 'زائر',
        novels_subtitle: 'استمتع بقراءة أفضل الروايات العربية والعالمية',
        stories_subtitle: 'مجموعة منتقاة من القصص القصيرة والطويلة',
        initiatives_subtitle: 'مبادرات ملهمة من الشباب العربي',
        jobs_subtitle: 'فرص عمل ووظائف متنوعة',
        partners_subtitle: 'شركاؤنا في النجاح',
        btn_view: 'معاينة',
        btn_download: 'تحميل',
        footer_desc: 'مكتبتك الرقمية للكتب والروايات والقصص',
        footer_rights: 'جميع الحقوق محفوظة.',
        footer_credits: 'إعداد منسقة الوصول: أ. سدره الملا علي | تنفيذ: أ. نبيل الحميد'
    },
    en: {
        nav_home: 'Home',
        nav_novels: 'Novels',
        nav_stories: 'Stories',
        nav_initiatives: 'Initiatives',
        nav_jobs: 'Jobs',
        nav_partners: 'Partners',
        logo_name: 'Rofof',
        hero_subtitle: 'Your Digital Library',
        hero_desc: 'Discover a world of books, novels, and stories. A complete digital library gathering the best Arabic content in one place.',
        search_placeholder: 'Search for a book, novel, or story...',
        search_btn: 'Search',
        stat_books: 'Books',
        stat_sections: 'Sections',
        stat_visitors: 'Visitors',
        novels_subtitle: 'Enjoy reading the best Arabic and international novels',
        stories_subtitle: 'A curated collection of short and long stories',
        initiatives_subtitle: 'Inspiring initiatives from Arab youth',
        jobs_subtitle: 'Various job opportunities and careers',
        partners_subtitle: 'Our partners in success',
        btn_view: 'Preview',
        btn_download: 'Download',
        footer_desc: 'Your digital library for books, novels, and stories',
        footer_rights: 'All rights reserved.',
        footer_credits: 'Access Coordinator: Sidra Al-Mulla Ali | Development: Nabil Al-Humaid'
    },
    ku: {
        nav_home: 'Destpêk',
        nav_novels: 'Roman',
        nav_stories: 'Çîrok',
        nav_initiatives: 'Destpêşxerî',
        nav_jobs: 'Kar',
        nav_partners: 'Hevkar',
        logo_name: 'Rofof',
        hero_subtitle: 'Pirtûkxaneya Te ya Dîjîtal',
        hero_desc: 'Cîhanek pirtûk, roman û çîrokan kifş bike. Pirtûkxaneyek dîjîtal a bêkêmasî ku naveroka herî baş a Erebî li yek cîh dicivîne.',
        search_placeholder: 'Li pirtûk, roman an çîrokekê bigere...',
        search_btn: 'Lêgerîn',
        stat_books: 'Pirtûk',
        stat_sections: 'Beş',
        stat_visitors: 'Ziyaretwan',
        novels_subtitle: 'Ji xwendina romanên herî baş ên Erebî û cîhanî kêfê bike',
        stories_subtitle: 'Berhevokek bijartî ya çîrokên kurt û dirêj',
        initiatives_subtitle: 'Destpêşxeriyên îlhamdêr ji ciwanên Ereb',
        jobs_subtitle: 'Derfeten kar û pîşeyên cihêreng',
        partners_subtitle: 'Hevkarên me di serkeftinê de',
        btn_view: 'Pêşdîtin',
        btn_download: 'Daxistin',
        footer_desc: 'Pirtûkxaneya te ya dîjîtal ji bo pirtûk, roman û çîrokan',
        footer_rights: 'Hemû maf parastî ne.',
        footer_credits: 'Koordînatora Gihîştinê: Sidra Al-Mulla Ali | Pêşxistin: Nabil Al-Humaid'
    },
    fr: {
        nav_home: 'Accueil',
        nav_novels: 'Romans',
        nav_stories: 'Histoires',
        nav_initiatives: 'Initiatives',
        nav_jobs: 'Emplois',
        nav_partners: 'Partenaires',
        logo_name: 'Rofof',
        hero_subtitle: 'Votre Bibliothèque Numérique',
        hero_desc: 'Découvrez un monde de livres, de romans et d\'histoires. Une bibliothèque numérique complète regroupant le meilleur contenu arabe en un seul endroit.',
        search_placeholder: 'Rechercher un livre, un roman ou une histoire...',
        search_btn: 'Rechercher',
        stat_books: 'Livres',
        stat_sections: 'Sections',
        stat_visitors: 'Visiteurs',
        novels_subtitle: 'Profitez de la lecture des meilleurs romans arabes et internationaux',
        stories_subtitle: 'Une collection organisée d\'histoires courtes et longues',
        initiatives_subtitle: 'Initiatives inspirantes de la jeunesse arabe',
        jobs_subtitle: 'Diverses opportunités d\'emploi et carrières',
        partners_subtitle: 'Nos partenaires dans le succès',
        btn_view: 'Aperçu',
        btn_download: 'Télécharger',
        footer_desc: 'Votre bibliothèque numérique pour livres, romans et histoires',
        footer_rights: 'Tous droits réservés.',
        footer_credits: 'Coordinatrice d\'accès: Sidra Al-Mulla Ali | Développement: Nabil Al-Humaid'
    }
};

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);

            // Optional: Reset custom background when switching themes to ensure readability
            // document.documentElement.style.removeProperty('--bg-primary');
            // localStorage.removeItem('custom-bg-color');
            // reload color picker value
            // const picker = document.getElementById('bg-color-picker');
            // if(picker) picker.value = newTheme === 'light' ? '#f4f7f6' : '#0f0f23';
        });
    }
}

function initColorPicker() {
    const picker = document.getElementById('bg-color-picker');
    if (!picker) return;

    // Load saved color
    const savedColor = localStorage.getItem('custom-bg-color');
    if (savedColor) {
        document.documentElement.style.setProperty('--bg-primary', savedColor);
        picker.value = savedColor;
    } else {
        // Set default value based on current theme
        const currentTheme = document.documentElement.getAttribute('data-theme');
        picker.value = currentTheme === 'light' ? '#f4f7f6' : '#0f0f23';
    }

    picker.addEventListener('input', (e) => {
        const color = e.target.value;
        document.documentElement.style.setProperty('--bg-primary', color);
        localStorage.setItem('custom-bg-color', color);
    });
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'light') {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
}

function updateLanguage(lang) {
    // Save preference
    localStorage.setItem('lang', lang);

    // Update direction
    const dir = lang === 'en' || lang === 'fr' ? 'ltr' : 'rtl';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;

    // Update translations
    const translations = TRANSLATIONS[lang];
    if (!translations) return;

    // 1. Elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            el.textContent = translations[key];
        }
    });

    // 2. Elements with data-i18n-placeholder (inputs)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            el.placeholder = translations[key];
        }
    });

    // 3. Update active language button text/icon if needed
    const btnSpan = document.querySelector('.lang-btn span');
    const langNames = {
        ar: 'عربي',
        en: 'English',
        ku: 'Kurdî',
        fr: 'Français'
    };
    if (btnSpan) btnSpan.textContent = langNames[lang];
}

function initLanguage() {
    const savedLang = localStorage.getItem('lang') || 'ar';
    updateLanguage(savedLang);

    const langLinks = document.querySelectorAll('.lang-menu a');
    langLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = link.getAttribute('data-lang');
            updateLanguage(lang);
        });
    });
}

// ===========================================
// Event Listeners
// ===========================================

// ===========================================
// Search Button Effect
// ===========================================

/**
 * Initialize playful search button effect
 */
function initSearchButtonEffect() {
    const btn = DOM.searchBtn;
    const input = DOM.searchInput;

    if (!btn || !input) return;

    btn.addEventListener('mouseover', () => {
        const query = input.value.trim();

        // Only run away if input is empty
        if (query === '') {
            // Calculate random relative position
            // Limits: X between -150 and 150, Y between -50 and 50
            const randomX = Math.floor(Math.random() * 300) - 150;
            const randomY = Math.floor(Math.random() * 100) - 50;
            const randomRotate = Math.floor(Math.random() * 20) - 10;

            btn.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg)`;

            // Change color to indicate it's "locked" or "shy"
            btn.style.background = 'var(--text-muted)';
            btn.style.cursor = 'not-allowed';
            // Add a fun transition
            btn.style.transition = 'all 0.3s ease-out';
        }
    });

    input.addEventListener('input', () => {
        if (input.value.trim() !== '') {
            // Reset position and style
            btn.style.transform = 'translate(0, 0) rotate(0deg)';
            btn.style.background = 'var(--primary-gradient)';
            btn.style.cursor = 'pointer';
        }
    });
}

/**
 * Initialize Book Interactions (Animate on Click)
 */
function initBookInteractions() {
    const books = document.querySelectorAll('.book');
    const TIMEOUT_DURATION = 15000; // 15 seconds

    books.forEach(book => {
        let timeoutId;

        book.style.cursor = 'pointer'; // Make it obvious clickable

        book.addEventListener('click', () => {
            // Add active class to start animation
            book.classList.add('active');

            // Clear existing timeout if mapped
            if (book.dataset.timeoutId) {
                clearTimeout(parseInt(book.dataset.timeoutId));
            }

            // Set new timeout to reset
            timeoutId = setTimeout(() => {
                book.classList.remove('active');
            }, TIMEOUT_DURATION);

            // Store timeout ID to handle multiple clicks
            book.dataset.timeoutId = timeoutId;
        });
    });
}

function initEventListeners() {
    // Initialize Theme & Language
    initTheme();
    initLanguage();
    initColorPicker();

    // Initialize Search Button Effect
    initSearchButtonEffect();

    // Initialize Book Interactions
    initBookInteractions();

    // Navigation toggle
    DOM.navToggle?.addEventListener('click', toggleMobileMenu);

    // Close mobile menu on link click
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            DOM.navMenu.classList.remove('active');
            const icon = DOM.navToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });

    // Scroll events
    window.addEventListener('scroll', handleScroll);

    // Back to top
    DOM.backToTop?.addEventListener('click', scrollToTop);

    // Search
    DOM.searchBtn?.addEventListener('click', performSearch);
    DOM.searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Search modal
    DOM.searchModalClose?.addEventListener('click', closeSearchModal);
    DOM.searchModal?.querySelector('.modal-overlay')?.addEventListener('click', closeSearchModal);

    // Book modal
    DOM.modalClose?.addEventListener('click', closeBookModal);
    DOM.bookModal?.querySelector('.modal-overlay')?.addEventListener('click', closeBookModal);

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeBookModal();
            closeSearchModal();
        }
    });
}

// ===========================================
// Initialization
// ===========================================

async function init() {
    // Load settings
    loadSettings();

    // Initialize event listeners
    initEventListeners();

    // Load all sections
    await loadAllSections();

    // Animate visitor count
    const visitorCount = generateVisitorCount();
    if (DOM.counts.visitors) {
        animateCounter(DOM.counts.visitors, visitorCount);
    }

    // Hide loader
    setTimeout(() => {
        DOM.loader?.classList.add('hidden');
    }, 1000);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

// Expose functions globally for onclick handlers
window.loadAllSections = loadAllSections;
