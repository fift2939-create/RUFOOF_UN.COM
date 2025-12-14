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
// Event Listeners
// ===========================================

function initEventListeners() {
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
