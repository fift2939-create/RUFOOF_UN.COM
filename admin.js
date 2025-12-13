/**
 * رفوف - Rofof Digital Library
 * Admin & Settings Script
 */

// ===========================================
// Configuration
// ===========================================
const ADMIN_CONFIG = {
    // Credentials
    username: 'admin1234',
    password: '202025', // Password from user request

    // Storage keys
    storageKey: 'rofof_settings',
    authKey: 'rofof_admin_auth',

    // Script URL
    scriptUrl: 'https://script.google.com/macros/s/AKfycbxnkmsxcSBgG7lDtU2CQlEcPYsFd5zJuTpDXW2sDAwk7CTGdApVs3cM13qd12mrrTsf/exec'
};

// ===========================================
// DOM Elements
// ===========================================
const ELEMENTS = {
    loginContainer: document.getElementById('login-container'),
    settingsContainer: document.getElementById('settings-container'),
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    loginError: document.getElementById('login-error'),
    logoutBtn: document.getElementById('logout-btn'),
    saveSettingsBtn: document.getElementById('save-settings'),

    // Upload
    uploadForm: document.getElementById('upload-form'),
    uploadCategory: document.getElementById('upload-category'),
    fileInput: document.getElementById('file-input'),
    uploadStatus: document.getElementById('upload-status'),

    // Inputs
    apiKeyInput: document.getElementById('api-key'),
    folderInputs: {
        novels: document.getElementById('novels-folder'),
        stories: document.getElementById('stories-folder'),
        initiatives: document.getElementById('initiatives-folder'),
        jobs: document.getElementById('jobs-folder'),
        partners: document.getElementById('partners-folder')
    }
};

// ===========================================
// Authentication Functions
// ===========================================

/**
 * Check if user is logged in
 */
function checkAuth() {
    const isAuth = sessionStorage.getItem(ADMIN_CONFIG.authKey) === 'true';
    if (isAuth) {
        showSettings();
    } else {
        showLogin();
    }
}

/**
 * Handle Login
 */
function handleLogin(e) {
    e.preventDefault();

    const username = ELEMENTS.usernameInput.value.trim();
    const password = ELEMENTS.passwordInput.value.trim();

    // Check credentials (accepting either admin/admin1234-202025 OR just the combined string as password if user made a mistake)
    // Strict check as requested:
    if (username === ADMIN_CONFIG.username && password === ADMIN_CONFIG.password) {
        // Success
        sessionStorage.setItem(ADMIN_CONFIG.authKey, 'true');
        ELEMENTS.loginError.style.display = 'none';
        showSettings();
    } else {
        // Failure
        ELEMENTS.loginError.style.display = 'block';
        ELEMENTS.loginForm.reset();
        ELEMENTS.usernameInput.focus();
    }
}

/**
 * Handle Logout
 */
function handleLogout() {
    sessionStorage.removeItem(ADMIN_CONFIG.authKey);
    showLogin();
}

/**
 * Show Login View
 */
function showLogin() {
    ELEMENTS.loginContainer.style.display = 'flex';
    ELEMENTS.settingsContainer.style.display = 'none';
    document.title = 'رفوف | تسجيل دخول المشرف';
}

/**
 * Show Settings View
 */
function showSettings() {
    ELEMENTS.loginContainer.style.display = 'none';
    ELEMENTS.settingsContainer.style.display = 'block';
    document.title = 'رفوف | إعدادات Google Drive';
    loadSettings();
}

// ===========================================
// Settings Functions
// ===========================================

/**
 * Load settings from localStorage
 */
function loadSettings() {
    try {
        const saved = localStorage.getItem(ADMIN_CONFIG.storageKey);
        if (saved) {
            const settings = JSON.parse(saved);

            // Set values
            ELEMENTS.apiKeyInput.value = settings.apiKey || '';

            if (settings.folders) {
                Object.keys(settings.folders).forEach(key => {
                    if (ELEMENTS.folderInputs[key]) {
                        ELEMENTS.folderInputs[key].value = settings.folders[key];
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    const settings = {
        apiKey: ELEMENTS.apiKeyInput.value.trim(),
        folders: {}
    };

    Object.keys(ELEMENTS.folderInputs).forEach(key => {
        settings.folders[key] = ELEMENTS.folderInputs[key].value.trim();
    });

    try {
        localStorage.setItem(ADMIN_CONFIG.storageKey, JSON.stringify(settings));
        alert('تم حفظ الإعدادات بنجاح! سيتم تطبيق التغييرات في الصفحة الرئيسية.');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('حدث خطأ في حفظ الإعدادات.');
    }
}

// ===========================================
// Initialization
// ===========================================

function init() {
    // Check initial auth state
    checkAuth();

    // Event Listeners
    ELEMENTS.loginForm.addEventListener('submit', handleLogin);
    ELEMENTS.logoutBtn.addEventListener('click', handleLogout);
    ELEMENTS.saveSettingsBtn.addEventListener('click', saveSettings);
    ELEMENTS.uploadForm.addEventListener('submit', handleUpload);
}

// ===========================================
// Upload and File Handling
// ===========================================

/**
 * Handle File Upload
 */
async function handleUpload(e) {
    e.preventDefault();

    const file = ELEMENTS.fileInput.files[0];
    const category = ELEMENTS.uploadCategory.value;

    if (!file) {
        alert('الرجاء اختيار ملف للرفع');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت');
        return;
    }

    // Update UI
    ELEMENTS.uploadStatus.style.display = 'block';

    try {
        const base64Data = await readFileAsBase64(file);

        const payload = {
            action: 'upload',
            category: category,
            name: file.name,
            mimeType: file.type,
            data: base64Data
        };

        // Send to Apps Script
        // Note: Using no-cors mode for simplicity, but we can't read response directly easily
        // Instead we use text/plain content type to avoid preflight options request issues usually
        const response = await fetch(ADMIN_CONFIG.scriptUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Since we can't easily read response in no-cors or simple POST to script without redirects,
        // we'll assume success if no network error occurred and text is returned
        const result = await response.json();

        if (result.status === 'success') {
            alert('تم رفع الملف بنجاح!');
            ELEMENTS.uploadForm.reset();
        } else {
            throw new Error(result.message || 'فشل الرفع');
        }

    } catch (error) {
        console.error('Upload error:', error);
        alert('حدث خطأ أثناء الرفع: ' + error.message);
    } finally {
        ELEMENTS.uploadStatus.style.display = 'none';
    }
}

/**
 * Read file as Base64
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
