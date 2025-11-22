/* ==========================================
   EARLY INITIALIZATION - PRODUCT MODAL STUBS
   ========================================== */

// Stub functions to prevent "not defined" errors
window.peOpen = window.peOpen || function() {
  console.warn('[peOpen] Not initialized yet, retrying in 500ms...');
  setTimeout(() => {
    if (typeof window.peOpen === 'function') {
      window.peOpen.apply(this, arguments);
    } else {
      alert('❌ Erreur: Product Modal not loaded');
    }
  }, 500);
};

window.peClose = window.peClose || function() {};
window.peSubmitForm = window.peSubmitForm || function() {};
window.addProductPrompt = window.addProductPrompt || function() {
  if (typeof window.peOpen === 'function') {
    window.peOpen({ mode: 'add', product: null, productType: 'numeric' });
  }
};
window.addPhysicalProductPrompt = window.addPhysicalProductPrompt || function() {
  if (typeof window.peOpen === 'function') {
    window.peOpen({ mode: 'add', product: null, productType: 'physical' });
  }
};
/* ==========================================
   GLOBAL SUPABASE HELPER (SHARED)
   ========================================== */

(function initGlobalSupabase() {
  let _sb = null;
  
  window.ensureSupabase = async function() {
    if (_sb) return _sb;
    
    if (window.__sb) {
      _sb = window.__sb;
      return _sb;
    }
    
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      
      const url = window.SUPABASE_URL || "https://zogohkfzplcuonkkfoov.supabase.co";
      const key = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw";
      
      _sb = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'mijoro-auth-v1',
        },
      });
      
      window.__sb = _sb;
      console.log('[Global Supabase] ✓ Initialized');
      
      return _sb;
      
    } catch (err) {
      console.error('[Global Supabase] ERROR:', err);
      throw err;
    }
  };
  
  console.log('[Global Supabase] ✓ Helper registered');
})();
async function subscribeNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BL8QmGLYoAXQnhXStyuriTFZF_hsIMkHpuxwmRUaCVVRWuyRN5cICB8smSeorTEGQ-3welHD9lFHDma7b--l5Ic')
    });
    // TODO: Alefaso any amin'ny backend ny sub JSON
    console.log('Push subscribed:', JSON.stringify(sub));
  } catch (e) {
    console.error('Push subscribe failed:', e);
  }
}
document.getElementById('btnSubscribe')?.addEventListener('click', subscribeNotifications);

/* ================================
   GLOBAL CONFIG (accessible partout)
   ================================ */
window.SUPABASE_URL = "https://zogohkfzplcuonkkfoov.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw";
window.OWNER_EMAIL = "joroandriamanirisoa13@gmail.com";
/* ================================
   SUPABASE DIAGNOSTIC TOOL
   ================================ */

async function diagSupabase() {
  console.group('🔍 SUPABASE DIAGNOSTIC');
  
  try {
    // Check config
    console.log('URL:', SUPABASE_URL);
    console.log('Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    
    // Test import
    const mod = await import("https://esm.sh/@supabase/supabase-js@2");
    console.log('✓ Module imported');
    
    // Create client
    const sb = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✓ Client created');
    
    // Test connection
    const { data, error } = await sb.from('products').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection failed:', error);
      
      // Parse HTML error if present
      if (error.message?.includes('<!DOCTYPE')) {
        console.error('→ Receiving HTML instead of JSON');
        console.error('→ Check your Supabase URL and ANON key');
      }
    } else {
      console.log('✓ Connection OK');
      console.log('Products count:', data);
    }
    
  } catch (e) {
    console.error('❌ Diagnostic failed:', e);
  }
  
  console.groupEnd();
}

// Exécuter au chargement (temporaire pour debug)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(diagSupabase, 1000);
});
/* ==========================================
   SERVICE WORKER REGISTRATION (OFFLINE MODE)
   ========================================== */

(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Workers non supportés');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });

      console.log('[SW] Enregistré avec succès:', registration.scope);

      // Gestion des mises à jour
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] Nouvelle version détectée');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nouvelle version disponible
            showUpdateNotification(newWorker);
          }
        });
      });

      // Auto-refresh si le SW change
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

    } catch (err) {
      console.error('[SW] Erreur enregistrement:', err);
    }
  });

  // Notification de mise à jour
  function showUpdateNotification(worker) {
    const shouldUpdate = confirm(
      '🔄 Misy version vaovao!\n\nReload ilay page mba hanova?'
    );

    if (shouldUpdate) {
      worker.postMessage({ type: 'SKIP_WAITING' });
    }
  }
})();

/* ==========================================
   OFFLINE INDICATOR (optional but recommended)
   ========================================== */

(function offlineIndicator() {
  let indicator = null;
  let isShowing = false;
  
  function createIndicator() {
    if (indicator) return indicator;
    
    indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.innerHTML = `
      <i class="fa-solid fa-wifi-slash"></i>
      <span>Hors ligne</span>
    `;
    indicator.style.cssText = `
      position: fixed;
      bottom: calc(var(--bottom-menu-h, 64px) + 12px);
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
      padding: 12px 20px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9000;
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
      transition: transform .3s ease, opacity .3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(indicator);
    return indicator;
  }
  
  function show() {
    if (isShowing) return;
    const el = createIndicator();
    el.style.transform = 'translateX(-50%) translateY(0)';
    el.style.opacity = '1';
    isShowing = true;
  }
  
  function hide() {
    if (!indicator || !isShowing) return;
    indicator.style.transform = 'translateX(-50%) translateY(100px)';
    indicator.style.opacity = '0';
    isShowing = false;
    
    // ✅ FIX: Supprimer l'élément après l'animation
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
        indicator = null;
      }
    }, 400);
  }
  
  // ✅ FIX: Meilleure gestion des événements
  window.addEventListener('online', () => {
    console.log('[Network] ✅ Online');
    hide();
    
    // ✅ Notification visuelle
    const toast = document.createElement('div');
    toast.textContent = '✅ Connexion rétablie';
    toast.style.cssText = `
      position: fixed;
      bottom: calc(var(--bottom-menu-h, 64px) + 12px);
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      padding: 12px 20px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      z-index: 9001;
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  });
  
  window.addEventListener('offline', () => {
    console.log('[Network] ❌ Offline');
    show();
  });
  
  // Check initial state
  if (!navigator.onLine) {
    setTimeout(show, 1000);
  }
})();
  /* PART 1/4 — SAFETY, HELPERS, I18N/THEME
   ========================================= */

/* SAFETY / DEBUG / POLYFILLS */


  // Global error logs
  window.addEventListener('error', function (e) {
    console.error('[App Error]', e?.message, e?.filename, e?.lineno, e?.colno, e?.error);
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error('[Unhandled Promise]', e?.reason);
  });

  // Loader guard (safe hide)
  (function safeHideLoader() {
    function hide() {
      var loader = document.getElementById('loader');
      if (!loader) return;
      document.body.setAttribute('aria-busy', 'false');
      loader.classList.add('fade-out');
      setTimeout(function () {
        loader.style.display = 'none';
        loader.setAttribute('aria-hidden', 'true');
      }, 500);
    }
    if (document.readyState === 'complete') hide();
    else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(hide, 500); }, { once: true });
      window.addEventListener('load', hide, { once: true });
      setTimeout(hide, 3000);
    }
  })();

  // Ensure home visible at start
  document.addEventListener('DOMContentLoaded', function () {
    var home = document.getElementById('home');
    if (home && !home.classList.contains('active')) {
      home.classList.add('active');
      home.setAttribute('aria-hidden', 'false');
    }
  });

  // Placeholder if closeShop not yet defined
  if (typeof window.closeShop !== 'function') window.closeShop = function () {};
;

/* CONSTANTES + HELPERS */
var WHATSAPP_PHONE_INTL = '261333106055';

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function (m) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[m] || m;
  });
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

  /* PART 1/4 — SAFETY, HELPERS, I18N/THEME
   ========================================= */

/* SAFETY / DEBUG / POLYFILLS */
(function safetyInit() {
  // CSS.escape polyfill
  if (!window.CSS || typeof window.CSS.escape !== 'function') {
    window.CSS = window.CSS || {};
    window.CSS.escape = function (value) {
      return String(value).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
    };
  }

  // Global error logs
  window.addEventListener('error', function (e) {
    console.error('[App Error]', e?.message, e?.filename, e?.lineno, e?.colno, e?.error);
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error('[Unhandled Promise]', e?.reason);
  });

  // Loader guard (safe hide)
  (function safeHideLoader() {
    function hide() {
      var loader = document.getElementById('loader');
      if (!loader) return;
      document.body.setAttribute('aria-busy', 'false');
      loader.classList.add('fade-out');
      setTimeout(function () {
        loader.style.display = 'none';
        loader.setAttribute('aria-hidden', 'true');
      }, 500);
    }
    if (document.readyState === 'complete') hide();
    else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(hide, 500); }, { once: true });
      window.addEventListener('load', hide, { once: true });
      setTimeout(hide, 3000);
    }
  })();

  // Ensure home visible at start
  document.addEventListener('DOMContentLoaded', function () {
    var home = document.getElementById('home');
    if (home && !home.classList.contains('active')) {
      home.classList.add('active');
      home.setAttribute('aria-hidden', 'false');
    }
  });

  // Placeholder if closeShop not yet defined
  if (typeof window.closeShop !== 'function') window.closeShop = function () {};
})();

/* CONSTANTES + HELPERS */
var WHATSAPP_PHONE_INTL = '261333106055';

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function (m) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[m] || m;
  });
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}
function fmtPrice(p) {
  var n = Number(p);
  if (!isFinite(n) || n < 0) {
    return '<div class="price-display"><i class="fa-solid fa-coins price-icon"></i><span class="price-value">0</span><span class="price-currency">AR</span></div>';
  }
  var isFree = (n === 0);
  var icon = isFree ? '<i class="fa-solid fa-gift price-icon free"></i>' : '<i class="fa-solid fa-coins price-icon"></i>';
  
  try {
    return '<div class="price-display' + (isFree ? ' free-price' : '') + '">' +
      icon +
      '<span class="price-value">' + n.toLocaleString('fr-FR') + '</span>' +
      '<span class="price-currency">AR</span>' +
      '</div>';
  }
  catch (_) {
    return '<div class="price-display' + (isFree ? ' free-price' : '') + '">' +
      icon +
      '<span class="price-value">' + String(n) + '</span>' +
      '<span class="price-currency">AR</span>' +
      '</div>';
  }
}
function normalizeCategory(c) {
  if (!c) return '';
  c = String(c).toLowerCase();
  if (['app', 'apps', 'jeu', 'jeux', 'game', 'games'].indexOf(c) !== -1) return 'apps';
  if (['ebook', 'ebooks', 'book', 'livre', 'livres'].indexOf(c) !== -1) return 'ebooks';
  if (['video', 'vidéo', 'videos', 'vidéos'].indexOf(c) !== -1) return 'videos';
  if (['promotion', 'promo'].indexOf(c) !== -1) return 'promo';
  if (['gratuit', 'gratuits', 'free'].indexOf(c) !== -1) return 'free';
  return c;
}/* ========================================
   SLIDESHOW DATA MANAGEMENT
   ======================================== */

var SLIDES_KEY = 'slides:v1';
var SLIDES_DEFAULT = [
  {
    id: 'slide-1',
    image: 'https://i.ibb.co/DP1xT5Ky/8b7e15f5dd5dd2290ac52af728cc12c3.jpg',
    alt: 'Offre promo 1',
    link: '#'
  },
  {
    id: 'slide-2',
    image: 'https://i.ibb.co/B5vcHVZX/ddce6f18e3cdf72f038584cdb034bbd0.jpg',
    alt: 'Offre promo 2',
    link: '#'
  }
];

function loadSlides() {
  try {
    var raw = localStorage.getItem(SLIDES_KEY);
    if (!raw) return SLIDES_DEFAULT.slice();
    var arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : SLIDES_DEFAULT.slice();
  } catch (e) {
    console.warn('[loadSlides]', e);
    return SLIDES_DEFAULT.slice();
  }
}

function saveSlides(slides) {
  try {
    localStorage.setItem(SLIDES_KEY, JSON.stringify(slides));
  } catch (e) {
    console.error('[saveSlides]', e);
  }
}

window.slidesData = loadSlides();

/* WHATSAPP HELPERS */
function openWhatsAppMessage(text) {
  try {
    var msg = encodeURIComponent(text || '');
    var wa = 'https://wa.me/' + WHATSAPP_PHONE_INTL + '?text=' + msg;
    window.open(wa, '_blank', 'noopener');
  } catch (err) {
    console.error('[WA Open Error]', err);
  }
}



/* ================================
   RENDER PRODUCTS (FIXED LIKE BUTTON)
   ================================ */



/* ================================
   EVENT DELEGATION (FIXED)
   ================================ */

document.addEventListener('DOMContentLoaded', function() {
  try {
  function delegateCardActions(e) {
  var tgt = e.target;
  var card = tgt.closest?.('.product-card');
  if (!card) return;
  
  var id = card.getAttribute('data-id');
  var p = products.find(x => x.id === id);
  if (!p) return;
  
  // ✅ Like button - UNIQUE handler
  var likeBtn = tgt.closest('.icon-like');
  if (likeBtn) {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(id);
    return;
  }
  
  // Info button
  if (tgt.closest('.icon-info')) {
    showProduct?.(id);
    return;
  }
  
  // Buy button
  if (tgt.closest('.icon-buy')) {
    buyOrRead?.(p);
    return;
  }
  
  // Read/Preview button
  if (tgt.closest('[data-action="read"]') || tgt.closest('.icon-read')) {
    e.preventDefault();
    e.stopPropagation();
    var previewUrl = p.preview_url || (p._db && p._db.preview_url);
    if (previewUrl) {
      openPreview(p);
    } else {
      openWhatsAppMessage(buildWAProductMessage(p, 'read'));
    }
    return;
  }
}
    
    [document.getElementById('products-row'), document.getElementById('products-box')].forEach(c => {
      if (c) c.addEventListener('click', delegateCardActions);
    });
    
  } catch (err) {
    console.error('[Optimized Actions error]', err);
  }
});



/* LANG / THEME (apply/select) */
var THEME_KEY = 'settings:theme';
var LANG_KEY = 'settings:lang';

var TRANSLATIONS = {
  // ==========================================
  // MALAGASY (MG) - COMPLETE
  // ==========================================
  mg: {
    // Navigation
    "nav_home": "Fandraisana",
    "nav_shop": "Fivarotana",
    "nav_params": "Fandrindrana",
    "nav_cart": "Harona",
    
    // Home section
    "home_title": "Tongasoa eto amin'ny Mijoro Boutique!",
    "home_sub": "Jereo ny eBooks, vidéos ary apps/jeux hanampy anao hiroso amin'ny aterineto.",
    "home_welcome": "Tongasoa",
    "home_discover": "Zahao ny vokatra tsara",
    
    // Shop section
    "shop_title": "Vokatra Nomerika",
    "shop_subtitle": "Safidio ny vokatra tianao",
    "shop_no_products": "Tsy misy vokatra hita.",
    "shop_loading": "Manatanteraka...",
    "shop_error": "Nisy olana. Andramo indray.",
    
    // Filters
    "filter_all": "Rehetra",
    "filter_ebooks": "eBooks",
    "filter_videos": "Vidéos",
    "filter_apps": "Apps/Jeux",
    "filter_vip": "VIP",
    "filter_promo": "Promo",
    "filter_free": "Maimaim-poana",
    
    // Search
    "search_placeholder": "Mitadiava...",
    "search_no_results": "Tsy misy valiny",
    "search_results": "valiny",
    
    // Product card
    "product_details": "Fampahalalana",
    "product_buy": "Hividy",
    "product_read": "Vakio",
    "product_preview": "Preview",
    "product_free": "Maimaim-poana",
    "product_new": "Vaovao",
    "product_hot": "Hot",
    "product_like": "Tiako",
    "product_unlike": "Tsy tiako intsony",
    
    // Cart
    "cart_title": "Panier",
    "cart_empty": "Tsy misy entana ao anaty panier.",
    "cart_total": "Total",
    "cart_checkout": "Hiditra ao amin'ny WhatsApp",
    "cart_clear": "Hofafana",
    "cart_item": "entana",
    "cart_items": "entana",
    "cart_add_success": "Tafiditra ao anaty panier",
    "cart_remove_confirm": "Hofafana ve ity entana ity?",
    "cart_clear_confirm": "Hofafana daholo ve ny entana ao anaty panier?",
    
    // Quick Order
    "quick_order_title": "Commande Express",
    "quick_order_view_all": "Hijery daholo",
    
    // Settings
    "param_settings": "Fandrindrana",
    "param_language": "Fiteny",
    "param_theme": "Thème",
    "param_mode": "Mode fampisehoana",
    "param_mode_mobile": "Mobile",
    "param_mode_desktop": "Desktop",
    "param_mode_current": "Mode ankehitriny:",
    
    // Language options
    "lang_mg": "Malagasy",
    "lang_mg_sub": "Lazao amin'ny fiteny gasy",
    "lang_fr": "Français",
    "lang_fr_sub": "Interface en français",
    "lang_en": "English",
    "lang_en_sub": "English interface",
    
    // Theme options
    "theme_dark": "Sombre",
    "theme_dark_sub": "Defaut (maizina)",
    "theme_light": "Clair",
    "theme_light_sub": "Mazava kokoa",
    "theme_current": "Thème ankehitriny:",
    
    // Buttons
    "btn_close": "Hidio",
    "btn_cancel": "Aoka ihany",
    "btn_save": "Tehirizo",
    "btn_delete": "Fafao",
    "btn_edit": "Ovay",
    "btn_add": "Ampiana",
    "btn_confirm": "Ekeo",
    "btn_back": "Miverina",
    
    // Notifications
    "notif_subscribe": "Hisoratra anarana",
    "notif_subscribed": "Voasoratra anarana",
    "notif_unsubscribe": "Hanafoana",
    "notif_title": "Fampandrenesana",
    "notif_new_product": "Vokatra vaovao!",
    "notif_permission_denied": "Avereno avela ny fampandrenesana",
    
    // Auth
    "auth_login": "Midira",
    "auth_logout": "Mivoaka",
    "auth_owner_only": "Owner ihany",
    "auth_email": "Email",
    "auth_password": "Teny miafina",
    
    // Product management
    "manage_add_product": "Hanampy vokatra",
    "manage_add_digital": "Nomerika",
    "manage_add_physical": "Fizika",
    "manage_edit_product": "Hanova vokatra",
    "manage_delete_confirm": "Hofafana ve ity vokatra ity?",
    "manage_title": "Lohateny",
    "manage_price": "Vidiny (Ar)",
    "manage_category": "Sokajy",
    "manage_description": "Fanambarana",
    "manage_image": "Sary",
    "manage_preview": "Preview",
    
    // Slides
    "slide_add": "Hanampy slide",
    "slide_delete": "Hamafa slide",
    "slide_delete_confirm": "Hofafana ve ity slide ity?",
    
    // Info modals
    "about": "Momba",
    "contact": "Hifandray",
    "quit": "Hiala",
    "quit_confirm": "Te hiala ve ianao?",
    "quit_message": "Tsy ho very ny angon-drakitra.",
    
    // Messages
    "msg_success": "Vita soa aman-tsara!",
    "msg_error": "Nisy olana",
    "msg_loading": "Manatanteraka...",
    "msg_no_connection": "Tsy misy connexion",
    "msg_try_again": "Andramo indray",
    
    // Time
    "time_just_now": "Vao haingana",
    "time_minutes_ago": "minitra lasa izay",
    "time_hours_ago": "ora lasa izay",
    "time_days_ago": "andro lasa izay",
    
    // Misc
    "currency": "Ar",
    "free": "Maimaim-poana",
    "new": "Vaovao",
    "popular": "Malaza",
    "recommended": "Soso-kevitra"
  },
  
  // ==========================================
  // FRANÇAIS (FR) - COMPLETE
  // ==========================================
  fr: {
    // Navigation
    "nav_home": "Accueil",
    "nav_shop": "Boutique",
    "nav_params": "Paramètres",
    "nav_cart": "Panier",
    
    // Home section
    "home_title": "Bienvenue chez Mijoro Boutique!",
    "home_sub": "Découvre des eBooks, vidéos et apps/jeux pour t'aider à réussir en ligne.",
    "home_welcome": "Bienvenue",
    "home_discover": "Découvre nos meilleurs produits",
    
    // Shop section
    "shop_title": "Produits Numériques",
    "shop_subtitle": "Choisis le produit qui te convient",
    "shop_no_products": "Aucun produit trouvé.",
    "shop_loading": "Chargement...",
    "shop_error": "Une erreur est survenue. Réessaye.",
    
    // Filters
    "filter_all": "Tous",
    "filter_ebooks": "Ebooks",
    "filter_videos": "Vidéos",
    "filter_apps": "Apps/Jeux",
    "filter_vip": "VIP",
    "filter_promo": "Promo",
    "filter_free": "Gratuit",
    
    // Search
    "search_placeholder": "Rechercher...",
    "search_no_results": "Aucun résultat",
    "search_results": "résultats",
    
    // Product card
    "product_details": "Détails",
    "product_buy": "Acheter",
    "product_read": "Lire",
    "product_preview": "Aperçu",
    "product_free": "Gratuit",
    "product_new": "Nouveau",
    "product_hot": "Hot",
    "product_like": "J'aime",
    "product_unlike": "Je n'aime plus",
    
    // Cart
    "cart_title": "Panier",
    "cart_empty": "Ton panier est vide.",
    "cart_total": "Total",
    "cart_checkout": "Commander via WhatsApp",
    "cart_clear": "Vider",
    "cart_item": "article",
    "cart_items": "articles",
    "cart_add_success": "Ajouté au panier",
    "cart_remove_confirm": "Retirer cet article du panier?",
    "cart_clear_confirm": "Vider tout le panier?",
    
    // Quick Order
    "quick_order_title": "Commande Express",
    "quick_order_view_all": "Voir tout",
    
    // Settings
    "param_settings": "Paramètres",
    "param_language": "Langue",
    "param_theme": "Thème",
    "param_mode": "Mode d'affichage",
    "param_mode_mobile": "Mobile",
    "param_mode_desktop": "Desktop",
    "param_mode_current": "Mode actuel:",
    
    // Language options
    "lang_mg": "Malagasy",
    "lang_mg_sub": "Lazao amin'ny fiteny gasy",
    "lang_fr": "Français",
    "lang_fr_sub": "Interface en français",
    "lang_en": "English",
    "lang_en_sub": "English interface",
    
    // Theme options
    "theme_dark": "Sombre",
    "theme_dark_sub": "Par défaut (sombre)",
    "theme_light": "Clair",
    "theme_light_sub": "Plus lumineux",
    "theme_current": "Thème actuel:",
    
    // Buttons
    "btn_close": "Fermer",
    "btn_cancel": "Annuler",
    "btn_save": "Enregistrer",
    "btn_delete": "Supprimer",
    "btn_edit": "Modifier",
    "btn_add": "Ajouter",
    "btn_confirm": "Confirmer",
    "btn_back": "Retour",
    
    // Notifications
    "notif_subscribe": "S'abonner",
    "notif_subscribed": "Abonné",
    "notif_unsubscribe": "Se désabonner",
    "notif_title": "Notifications",
    "notif_new_product": "Nouveau produit!",
    "notif_permission_denied": "Active les notifications dans les paramètres",
    
    // Auth
    "auth_login": "Connexion",
    "auth_logout": "Déconnexion",
    "auth_owner_only": "Propriétaire uniquement",
    "auth_email": "Email",
    "auth_password": "Mot de passe",
    
    // Product management
    "manage_add_product": "Ajouter un produit",
    "manage_add_digital": "Numérique",
    "manage_add_physical": "Physique",
    "manage_edit_product": "Modifier le produit",
    "manage_delete_confirm": "Supprimer ce produit?",
    "manage_title": "Titre",
    "manage_price": "Prix (Ar)",
    "manage_category": "Catégorie",
    "manage_description": "Description",
    "manage_image": "Image",
    "manage_preview": "Aperçu",
    
    // Slides
    "slide_add": "Ajouter un slide",
    "slide_delete": "Supprimer le slide",
    "slide_delete_confirm": "Supprimer ce slide?",
    
    // Info modals
    "about": "À propos",
    "contact": "Contact",
    "quit": "Quitter",
    "quit_confirm": "Veux-tu quitter?",
    "quit_message": "Tes données ne seront pas perdues.",
    
    // Messages
    "msg_success": "Succès!",
    "msg_error": "Erreur",
    "msg_loading": "Chargement...",
    "msg_no_connection": "Pas de connexion",
    "msg_try_again": "Réessayer",
    
    // Time
    "time_just_now": "À l'instant",
    "time_minutes_ago": "minutes",
    "time_hours_ago": "heures",
    "time_days_ago": "jours",
    
    // Misc
    "currency": "Ar",
    "free": "Gratuit",
    "new": "Nouveau",
    "popular": "Populaire",
    "recommended": "Recommandé"
  },
  
  // ==========================================
  // ENGLISH (EN) - COMPLETE
  // ==========================================
  en: {
    // Navigation
    "nav_home": "Home",
    "nav_shop": "Shop",
    "nav_params": "Settings",
    "nav_cart": "Cart",
    
    // Home section
    "home_title": "Welcome to Mijoro Boutique!",
    "home_sub": "Discover eBooks, videos and apps/games to help you succeed online.",
    "home_welcome": "Welcome",
    "home_discover": "Discover our best products",
    
    // Shop section
    "shop_title": "Digital Products",
    "shop_subtitle": "Choose the product that suits you",
    "shop_no_products": "No products found.",
    "shop_loading": "Loading...",
    "shop_error": "An error occurred. Try again.",
    
    // Filters
    "filter_all": "All",
    "filter_ebooks": "Ebooks",
    "filter_videos": "Videos",
    "filter_apps": "Apps/Games",
    "filter_vip": "VIP",
    "filter_promo": "Promo",
    "filter_free": "Free",
    
    // Search
    "search_placeholder": "Search...",
    "search_no_results": "No results",
    "search_results": "results",
    
    // Product card
    "product_details": "Details",
    "product_buy": "Buy",
    "product_read": "Read",
    "product_preview": "Preview",
    "product_free": "Free",
    "product_new": "New",
    "product_hot": "Hot",
    "product_like": "Like",
    "product_unlike": "Unlike",
    
    // Cart
    "cart_title": "Cart",
    "cart_empty": "Your cart is empty.",
    "cart_total": "Total",
    "cart_checkout": "Order via WhatsApp",
    "cart_clear": "Clear",
    "cart_item": "item",
    "cart_items": "items",
    "cart_add_success": "Added to cart",
    "cart_remove_confirm": "Remove this item?",
    "cart_clear_confirm": "Clear entire cart?",
    
    // Quick Order
    "quick_order_title": "Quick Order",
    "quick_order_view_all": "View All",
    
    // Settings
    "param_settings": "Settings",
    "param_language": "Language",
    "param_theme": "Theme",
    "param_mode": "Display Mode",
    "param_mode_mobile": "Mobile",
    "param_mode_desktop": "Desktop",
    "param_mode_current": "Current mode:",
    
    // Language options
    "lang_mg": "Malagasy",
    "lang_mg_sub": "Lazao amin'ny fiteny gasy",
    "lang_fr": "Français",
    "lang_fr_sub": "Interface en français",
    "lang_en": "English",
    "lang_en_sub": "English interface",
    
    // Theme options
    "theme_dark": "Dark",
    "theme_dark_sub": "Default (dark)",
    "theme_light": "Light",
    "theme_light_sub": "Brighter",
    "theme_current": "Current theme:",
    
    // Buttons
    "btn_close": "Close",
    "btn_cancel": "Cancel",
    "btn_save": "Save",
    "btn_delete": "Delete",
    "btn_edit": "Edit",
    "btn_add": "Add",
    "btn_confirm": "Confirm",
    "btn_back": "Back",
    
    // Notifications
    "notif_subscribe": "Subscribe",
    "notif_subscribed": "Subscribed",
    "notif_unsubscribe": "Unsubscribe",
    "notif_title": "Notifications",
    "notif_new_product": "New product!",
    "notif_permission_denied": "Enable notifications in settings",
    
    // Auth
    "auth_login": "Login",
    "auth_logout": "Logout",
    "auth_owner_only": "Owner only",
    "auth_email": "Email",
    "auth_password": "Password",
    
    // Product management
    "manage_add_product": "Add Product",
    "manage_add_digital": "Digital",
    "manage_add_physical": "Physical",
    "manage_edit_product": "Edit Product",
    "manage_delete_confirm": "Delete this product?",
    "manage_title": "Title",
    "manage_price": "Price (Ar)",
    "manage_category": "Category",
    "manage_description": "Description",
    "manage_image": "Image",
    "manage_preview": "Preview",
    
    // Slides
    "slide_add": "Add Slide",
    "slide_delete": "Delete Slide",
    "slide_delete_confirm": "Delete this slide?",
    
    // Info modals
    "about": "About",
    "contact": "Contact",
    "quit": "Quit",
    "quit_confirm": "Do you want to quit?",
    "quit_message": "Your data won't be lost.",
    
    // Messages
    "msg_success": "Success!",
    "msg_error": "Error",
    "msg_loading": "Loading...",
    "msg_no_connection": "No connection",
    "msg_try_again": "Try again",
    
    // Time
    "time_just_now": "Just now",
    "time_minutes_ago": "minutes ago",
    "time_hours_ago": "hours ago",
    "time_days_ago": "days ago",
    
    // Misc
    "currency": "Ar",
    "free": "Free",
    "new": "New",
    "popular": "Popular",
    "recommended": "Recommended"
  }
};/* ==========================================
   INTELLIGENT LANGUAGE SYSTEM - PROFESSIONAL
   ========================================== */

(function initAdvancedLanguageSystem() {
  'use strict';
  
  const LANG_KEY = 'settings:lang';
  const LANGUAGES = ['mg', 'fr', 'en'];
  
  let currentLang = 'fr';
  let isTransitioning = false;
  
  // ========================================
  // INITIALIZATION
  // ========================================
  
  function init() {
    console.log('[Language] 🌍 Initializing advanced language system...');
    
    loadSavedLanguage();
    applyLanguage(currentLang, false);
    wireLanguageButtons();
    detectBrowserLanguage();
    
    console.log('[Language] ✓ Language system initialized:', currentLang);
  }
  
  // ========================================
  // LOAD/SAVE
  // ========================================
  
  function loadSavedLanguage() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && LANGUAGES.includes(saved)) {
        currentLang = saved;
        console.log('[Language] ✓ Loaded saved language:', currentLang);
      }
    } catch (e) {
      console.warn('[Language] ⚠️ LocalStorage error:', e);
    }
  }
  
  function saveLanguage(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
      console.log('[Language] ✓ Language saved:', lang);
    } catch (e) {
      console.warn('[Language] ⚠️ Save error:', e);
    }
  }
  
  // ========================================
  // APPLY LANGUAGE
  // ========================================
  
  function applyLanguage(lang, animate = true) {
    if (isTransitioning) {
      console.log('[Language] ⏭️ Transition in progress, skipping...');
      return;
    }
    
    if (!LANGUAGES.includes(lang)) {
      console.warn('[Language] ⚠️ Invalid language:', lang);
      lang = 'fr';
    }
    
    currentLang = lang;
    
    console.log('[Language] 🌍 Applying language:', lang, 'animate:', animate);
    
    if (animate) {
      isTransitioning = true;
      document.body.classList.add('lang-switching');
      
      setTimeout(() => {
        translatePage(lang);
        
        setTimeout(() => {
          document.body.classList.remove('lang-switching');
          isTransitioning = false;
        }, 300);
      }, 50);
    } else {
      translatePage(lang);
    }
    
    saveLanguage(lang);
    updateLanguageButtons(lang);
    
    if (animate) {
      showLanguageToast(lang);
    }
  }
  
  // ========================================
  // TRANSLATE PAGE
  // ========================================
  
  function translatePage(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['fr'];
    
    // Update document language
    document.documentElement.lang = lang;
    
    // Translate all [data-i18n] elements
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      
      const translation = dict[key];
      if (!translation) {
        console.warn('[Language] ⚠️ Missing translation:', key, 'for', lang);
        return;
      }
      
      // Handle different element types
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.hasAttribute('data-i18n-placeholder')) {
          el.placeholder = translation;
        } else {
          el.value = translation;
        }
      } else {
        el.textContent = translation;
      }
      
      // Update aria-label if exists
      if (el.hasAttribute('aria-label')) {
        el.setAttribute('aria-label', translation);
      }
    });
    
    console.log('[Language] ✓ Page translated:', elements.length, 'elements');
  }
  
  // ========================================
  // UI UPDATES
  // ========================================
  
  function updateLanguageButtons(lang) {
    const buttons = document.querySelectorAll('.option-card[data-lang]');
    
    buttons.forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      const isActive = btnLang === lang;
      
      if (isActive) {
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        btn.setAttribute('tabindex', '0');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('tabindex', '-1');
      }
    });
    
    console.log('[Language] ✓ Buttons updated');
  }
  
  function showLanguageToast(lang) {
    document.querySelectorAll('.lang-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = 'lang-toast';
    
    const flags = {
      'mg': '🇲🇬',
      'fr': '🇫🇷',
      'en': '🇬🇧'
    };
    
    const names = {
      'mg': 'Malagasy',
      'fr': 'Français',
      'en': 'English'
    };
    
    toast.innerHTML = flags[lang] + ' ' + names[lang];
    
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 14px;
      z-index: 9999;
      animation: langToastIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'langToastOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
  
  // ========================================
  // WIRE BUTTONS
  // ========================================
  
  function wireLanguageButtons() {
    const buttons = document.querySelectorAll('.option-card[data-lang]');
    
    buttons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', function() {
        const lang = this.getAttribute('data-lang');
        if (lang && lang !== currentLang) {
          applyLanguage(lang, true);
        }
      });
    });
    
    console.log('[Language] ✓ Buttons wired:', buttons.length);
  }
  
  // ========================================
  // BROWSER DETECTION
  // ========================================
  
  function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    console.log('[Language] 📱 Browser language detected:', browserLang);
    
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (!saved) {
        let detectedLang = 'fr';
        
        if (browserLang.startsWith('en')) detectedLang = 'en';
        else if (browserLang.startsWith('mg')) detectedLang = 'mg';
        else if (browserLang.startsWith('fr')) detectedLang = 'fr';
        
        console.log('[Language] 🔄 Applying browser language:', detectedLang);
        applyLanguage(detectedLang, false);
      }
    } catch (e) {}
  }
  
  // ========================================
  // PUBLIC API
  // ========================================
  
  window.LanguageSystem = {
    getCurrentLanguage: () => currentLang,
    setLanguage: (lang) => applyLanguage(lang, true),
    translate: (key) => {
      const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['fr'];
      return dict[key] || key;
    }
  };
  
  // ========================================
  // AUTO-INIT
  // ========================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();

/* ==========================================
   TOAST ANIMATIONS
   ========================================== */

if (!document.getElementById('lang-toast-styles')) {
  const styles = document.createElement('style');
  styles.id = 'lang-toast-styles';
  styles.textContent = `
    @keyframes langToastIn {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes langToastOut {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    }
    
    body.lang-switching * {
      transition-duration: 0.3s !important;
    }
  `;
  document.head.appendChild(styles);
}
function localizePage(lang) {
  try {
    var dict = TRANSLATIONS[lang] || TRANSLATIONS['fr'];
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      if (!key) continue;
      var txt = dict[key];
      if (txt == null) continue;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.getAttribute('data-i18n-placeholder') !== null) {
          el.placeholder = txt;
        } else {
          el.value = txt;
        }
      } else {
        el.textContent = txt;
      }
    }
    var search = document.getElementById('search');
    if (search && dict['search_placeholder']) search.setAttribute('aria-label', dict['search_placeholder']);
  } catch (err) { console.error('[localizePage error]', err); }
}

function applyTheme(theme) {
  try {
    var allowed = ['dark', 'light', 'rose', 'jaune', 'marron'];
    var t = (allowed.indexOf(theme) !== -1) ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var cls = ['theme-dark', 'theme-light', 'theme-rose', 'theme-jaune', 'theme-marron'];
    for (var i = 0; i < cls.length; i++) { document.body.classList.remove(cls[i]); }
    document.body.classList.add('theme-' + t);
    var btns = document.querySelectorAll('#theme-options .option-card');
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      var val = b.getAttribute('data-theme');
      b.classList.toggle('active', val === t);
    }
  } catch (err) {
    console.error('[applyTheme error]', err);
  }
}
function selectTheme(theme) {
  try {
    var allowed = ['dark', 'light', 'rose', 'jaune', 'marron'];
    var t = (allowed.indexOf(theme) !== -1) ? theme : 'dark';
    try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
    applyTheme(t);
  } catch (err) {
    console.error('[selectTheme error]', err);
  }
}

function applyLang(lang) {
  try {
    var l = (['mg', 'fr', 'en'].indexOf(lang) !== -1) ? lang : 'fr';
    document.documentElement.lang = l;
    var btns = document.querySelectorAll('#lang-options .option-card');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var val = b.getAttribute('data-lang');
      b.classList.toggle('active', val === l);
    }
    localizePage(l);
  } catch (err) {
    console.error('[applyLang error]', err);
  }
}
function selectLang(lang) {
  try {
    var l = (['mg', 'fr', 'en'].indexOf(lang) !== -1) ? lang : 'fr';
    try { localStorage.setItem(LANG_KEY, l); } catch (_) {}
    applyLang(l);
  } catch (err) {
    console.error('[selectLang error]', err);
  }
}

// Init theme/lang at startup
document.addEventListener('DOMContentLoaded', function () {
  try {
    var theme = 'dark';
    try { var t = localStorage.getItem(THEME_KEY); if (t) theme = t; } catch (_) {}
    applyTheme(theme);

    var lang = 'fr';
    try { var l = localStorage.getItem(LANG_KEY); if (l) lang = l; } catch (_) {}
    applyLang(lang);
  } catch (err) {
    console.error('[settings init error]', err);
  }
});


/* ================================
   PART 2/4 — PRODUCTS + OPTIMIZED ACTIONS/FILTERS
   ========================================= */

// ========================================
// INITIALIZATION - FIXED VERSION
// ========================================

var products = window.products || [];
var productsLoadedPromise = null;

document.addEventListener('DOMContentLoaded', function() {
  console.log('[Init] 🚀 Starting product initialization...');
  
  // Show loading state
  showProductsLoader();
  
  // Tenter de charger depuis Supabase
  if (typeof fetchSupabaseProducts === 'function') {
    productsLoadedPromise = fetchSupabaseProducts()
      .then(function() {
        console.log('[Init] ✅ Products loaded:', (window.products || []).length);
        hideProductsLoader();
        
        // Render avec les produits chargés
        if ((window.products || []).length > 0) {
          renderProducts('all', '');
        } else {
          console.warn('[Init] ⚠️ No products in database');
          renderProducts('all', ''); // Affiche "aucun produit"
        }
      })
      .catch(function(err) {
        console.error('[Init] ❌ Failed to load products:', err);
        hideProductsLoader();
        showProductsError(err);
      });
  } else {
    console.error('[Init] ❌ fetchSupabaseProducts not available');
    hideProductsLoader();
    renderProducts('all', '');
  }
});

// ========================================
// LOADING UI HELPERS
// ========================================

function showProductsLoader() {
  var containers = [
    document.getElementById('products-row'),
    document.getElementById('products-box')
  ];
  
  var loaderHTML =
    '<div class="products-loader" style="grid-column:1/-1;text-align:center;padding:60px 20px">' +
    '<div style="display:inline-block;width:48px;height:48px;border:4px solid rgba(74,222,128,.2);border-top-color:#4ade80;border-radius:50%;animation:spin 1s linear infinite"></div>' +
    '<p style="margin-top:16px;color:#94a3b8;font-size:15px">Chargement des produits...</p>' +
    '</div>';
  
  containers.forEach(function(container) {
    if (container) {
      container.innerHTML = loaderHTML;
    }
  });
}

function hideProductsLoader() {
  document.querySelectorAll('.products-loader').forEach(function(el) {
    el.remove();
  });
}

function showProductsError(error) {
  var containers = [
    document.getElementById('products-row'),
    document.getElementById('products-box')
  ];
  
  var errorHTML =
    '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#ef4444">' +
    '<i class="fa-solid fa-triangle-exclamation" style="font-size:48px;margin-bottom:16px;opacity:0.8"></i>' +
    '<p style="font-size:16px;font-weight:700;margin-bottom:8px">Erreur de chargement</p>' +
    '<p style="font-size:14px;color:#94a3b8;margin-bottom:16px">' + (error.message || 'Une erreur est survenue') + '</p>' +
    '<button onclick="location.reload()" class="param-btn" style="background:#3b82f6;border:none">' +
    '<i class="fa-solid fa-rotate-right"></i> Réessayer</button>' +
    '</div>';
  
  containers.forEach(function(container) {
    if (container) {
      container.innerHTML = errorHTML;
    }
  });
}

/* Renderer principal (vertical cards) */
function renderProducts(filter, search) {
  try {
    var row = document.getElementById('products-row');
    var box = document.getElementById('products-box');
    
    var normalizedFilter = normalizeCategory(filter || 'all');
    var q = (search || '').toLowerCase();
    
    var filtered = (products || []).filter(function(prod) {
      var cat = normalizeCategory(prod.category);
      var catOk = (normalizedFilter === 'all') || (cat === normalizedFilter);
      var text = ((prod.title || '') + ' ' + (prod.description_short || '') + ' ' + (prod.description || '')).toLowerCase();
      var searchOk = !q || text.indexOf(q) !== -1;
      return catOk && searchOk;
    });
    
    if (row) {
      row.innerHTML = '';
      if (filtered.length === 0) {
        row.innerHTML = '<div style="color:#ddd;padding:12px" data-i18n="shop_no_products">Aucun produit trouvé.</div>';
      } else {
        var frag = document.createDocumentFragment();
        filtered.forEach(function(p) {
          var card = document.createElement('article');
          card.className = 'product-card';
          card.setAttribute('data-id', p.id);
          
          // ✅ CRITICAL: Set data-category attribute
          var cat = normalizeCategory(p.category || '');
          card.setAttribute('data-category', cat);
          
          card.setAttribute('role', 'listitem');
          card.innerHTML = makeCard(p, false);
          frag.appendChild(card);
        });
        row.appendChild(frag);
      }
    }
    
    if (box) {
      box.innerHTML = '';
      if (filtered.length === 0) {
        box.innerHTML = '<div style="color:#ddd;padding:12px" data-i18n="shop_no_products">Aucun produit trouvé.</div>';
      } else {
        var grid = document.createElement('div');
        grid.className = 'products-grid';
        var frag2 = document.createDocumentFragment();
        filtered.forEach(function(p) {
          var node = document.createElement('div');
          node.className = 'product-card';
          node.setAttribute('data-id', p.id);
          
          // ✅ CRITICAL: Set data-category attribute
          var cat = normalizeCategory(p.category || '');
          node.setAttribute('data-category', cat);
          
          node.innerHTML = makeCard(p, true);
          frag2.appendChild(node);
        });
        grid.appendChild(frag2);
        box.appendChild(grid);
      }
    }
    
    if (typeof applyAuthUI === 'function') applyAuthUI();
    
  } catch (err) {
    console.error('[renderProducts error]', err);
  }
}
/* ========================================
   RENDER SLIDESHOW (SAFE VERSION)
   ======================================== */

// ✅ Guard: aza error raha mbola tsy loaded ny DOM
if (typeof window.slidesData === 'undefined') {
  window.slidesData = [];
}

function renderSlideshow() {
  try {
    var track = document.getElementById('slide-track');
    if (!track) {
      console.warn('[renderSlideshow] slide-track element not found');
      return;
    }
    
    // ✅ Fallback: raha tsy misy slides, alaina ny default
    var slides = window.slidesData || [];
    
    if (slides.length === 0) {
      // ✅ Asehoy sary default raha tsy misy slides
      track.innerHTML = '<div class="slide">' +
        '<a href="#"><img src="https://i.ibb.co/DP1xT5Ky/8b7e15f5dd5dd2290ac52af728cc12c3.jpg" alt="Boutique" loading="lazy"></a>' +
        '</div>';
      
      // Init slideshow logic
      setTimeout(function() {
        if (typeof initSlideshowLogic === 'function') {
          initSlideshowLogic();
        }
      }, 100);
      return;
    }
    
    // ✅ Clear existing slides
    track.innerHTML = '';
    
    // ✅ Render slides
    var frag = document.createDocumentFragment();
    
    slides.forEach(function(s) {
  var div = document.createElement('div');
  div.className = 'slide';
  div.setAttribute('data-slide-id', s.id);
  
  // ✅ VAOVAO: TSY onclick intsony
  var deleteBtn =
    '<button type="button" ' +
    'class="slide-delete-btn owner-tool" ' +
    'data-slide-id="' + escapeAttr(s.id) + '" ' +
    'title="Supprimer">' +
    '<i class="fa-solid fa-trash"></i>' +
    '</button>';
  
  div.innerHTML = deleteBtn +
    '<a href="' + escapeAttr(s.link || '#') + '">' +
    '<img src="' + escapeAttr(s.image) + '" ' +
    'alt="' + escapeAttr(s.alt || 'Slide') + '" ' +
    'loading="lazy" decoding="async">' +
    '</a>';
  
  frag.appendChild(div);
}); 
    track.appendChild(frag);
    
    // ✅ Reinit slideshow logic after render
    setTimeout(function() {
      if (typeof initSlideshowLogic === 'function') {
        initSlideshowLogic();
      } else {
        console.warn('[renderSlideshow] initSlideshowLogic not found');
      }
      
      // Apply auth UI
      if (typeof applyAuthUI === 'function') {
        applyAuthUI();
      }
    }, 100);
    
  } catch (e) {
    console.error('[renderSlideshow ERROR]', e);
    console.error('Stack:', e.stack);
    
    // ✅ Fallback UI
    var track = document.getElementById('slide-track');
    if (track) {
      track.innerHTML = '<div class="slide">' +
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;background:#1e293b;border-radius:12px;padding:20px;text-align:center">' +
        '<div><i class="fa-solid fa-triangle-exclamation" style="font-size:32px;margin-bottom:12px;color:#f59e0b"></i>' +
        '<div>Tsy afaka nampiseho ny slideshow</div>' +
        '<small style="opacity:.7;margin-top:8px;display:block">Mba avereno refresh ny pejy</small></div>' +
        '</div></div>';
    }
  }
}

// ✅ SAFE INIT: Andraso ny DOM vao render
document.addEventListener('DOMContentLoaded', function() {
  try {
    // Load slides from storage
    if (typeof loadSlides === 'function') {
      window.slidesData = loadSlides();
    }
    
    // Render slideshow
    setTimeout(function() {
      renderSlideshow();
    }, 200);
    
  } catch (e) {
    console.error('[Slideshow Init ERROR]', e);
  }
});



/* ========================================
   ADD SLIDE MODAL (FIXED)
   ======================================== */

function ensureSlideModal() {
  var modal = document.getElementById('slide-add-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'slide-add-modal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);z-index:8000';
  modal.innerHTML = `
    <div style="background:#0e0f13;color:#fff;border-radius:14px;width:min(520px,94%);padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.5)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="margin:0">Ajouter Slide</h3>
        <button type="button" class="param-btn" id="slide-modal-close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      
      <form id="slide-form" style="display:flex;flex-direction:column;gap:12px">
        <div style="border:2px dashed #2a2d38;border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:all .2s" id="slide-drop-zone">
          <i class="fa-solid fa-cloud-upload" style="font-size:32px;color:#64748b;margin-bottom:8px"></i>
          <div style="font-size:14px;color:#94a3b8">Cliquez ou glissez une image ici</div>
          <small style="color:#64748b;margin-top:4px;display:block">JPG, PNG, WebP (max 5MB)</small>
          <input type="file" id="slide-image-input" accept="image/*" style="display:none">
        </div>
        
        <div id="slide-preview" style="display:none;border:1px solid #2a2d38;border-radius:10px;overflow:hidden;max-height:200px">
          <img id="slide-preview-img" style="width:100%;height:auto;display:block">
        </div>
        
        <label style="display:flex;flex-direction:column;gap:6px">
          <span>Texte alternatif</span>
          <input id="slide-alt" type="text" placeholder="Description de l'image" 
                 style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
        </label>
        
        <label style="display:flex;flex-direction:column;gap:6px">
          <span>Lien (optionnel)</span>
          <input id="slide-link" type="url" placeholder="https://..." 
                 style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
        </label>
        
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="param-btn" id="slide-cancel">Annuler</button>
          <button type="submit" class="param-btn" style="background:#10b981;border-color:#10b981">
            <i class="fa-solid fa-check"></i> Ajouter
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // ✅ FIX: Wire events APRÈS append
var closeBtn = modal.querySelector('#slide-modal-close');
var cancelBtn = modal.querySelector('#slide-cancel');
var dropZone = modal.querySelector('#slide-drop-zone');
var fileInput = modal.querySelector('#slide-image-input');
var preview = modal.querySelector('#slide-preview');
var previewImg = modal.querySelector('#slide-preview-img');
var form = modal.querySelector('#slide-form');

if (closeBtn) closeBtn.onclick = function() { closeSlideModal(); };
if (cancelBtn) cancelBtn.onclick = function() { closeSlideModal(); };

if (dropZone && fileInput) {
  dropZone.onclick = function() { fileInput.click(); };
}

if (fileInput) {
  fileInput.onchange = function() {
    if (this.files && this.files[0]) handleSlideFile(this.files[0]);
  };
}

if (dropZone) {
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.style.borderColor = '#10b981';
    this.style.background = 'rgba(16,185,129,.05)';
  });
  
  dropZone.addEventListener('dragleave', function() {
    this.style.borderColor = '#2a2d38';
    this.style.background = 'transparent';
  });
  
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    this.style.borderColor = '#2a2d38';
    this.style.background = 'transparent';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSlideFile(e.dataTransfer.files[0]);
    }
  });
}

if (form) {
  form.onsubmit = async function(e) {
    e.preventDefault();
    await submitSlide();
  };
}

return modal;
}
var slideFileData = null;

function handleSlideFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Safidio sary (image) ihany.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('Lehibe loatra ny sary (max 5MB).');
    return;
  }
  
  // ✅ Load image mba ahafantarana ny dimensions
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var ratio = img.width / img.height;
      
      // ✅ Warn raha tsy 16:9 (1.77)
      if (ratio < 1.5 || ratio > 2.0) {
        var confirmed = confirm(
          '⚠️ Sary ratio: ' + ratio.toFixed(2) + '\n\n' +
          'Recommended: 16:9 (1.77)\n\n' +
          'Hanohy ve?'
        );
        if (!confirmed) {
          return;
        }
      }
      
      // ✅ Proceed
      slideFileData = file;
      var preview = document.getElementById('slide-preview');
      var previewImg = document.getElementById('slide-preview-img');
      previewImg.src = e.target.result;
      preview.style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function submitSlide() {
  if (!slideFileData) {
    alert('Misafidiana sary aloha.');
    return;
  }
  
  try {
    var alt = document.getElementById('slide-alt').value.trim() || 'Slide';
    var link = document.getElementById('slide-link').value.trim() || '#';
    
    // ✅ FIX: Check if we have ensureSupabase or use window.__sb
    var sb = null;
    if (typeof ensureSupabase === 'function') {
      sb = await ensureSupabase();
    } else if (window.__sb) {
      sb = window.__sb;
    } else {
      // Fallback: tsy misy Supabase, ataovy local storage fotsiny
      var reader = new FileReader();
      reader.onload = function(e) {
        var newSlide = {
          id: 'slide-' + Date.now(),
          image: e.target.result, // Base64
          alt: alt,
          link: link
        };
        
        window.slidesData.push(newSlide);
        saveSlides(window.slidesData);
        renderSlideshow();
        closeSlideModal();
        alert('Slide ajouté (local)!');
      };
      reader.readAsDataURL(slideFileData);
      return;
    }
    
    // Raha misy Supabase dia atao upload
    var safeName = slideFileData.name.replace(/[^\w.\-]+/g, '_');
    var path = 'slides/' + Date.now() + '_' + safeName;
    
    var result = await sb.storage
      .from('products')
      .upload(path, slideFileData, { cacheControl: '3600', upsert: false });
    
    if (result.error) throw result.error;
    
    var publicUrl = sb.storage.from('products').getPublicUrl(result.data.path);
    
    var newSlide = {
      id: 'slide-' + Date.now(),
      image: publicUrl.data.publicUrl,
      alt: alt,
      link: link
    };
    
    window.slidesData.push(newSlide);
    saveSlides(window.slidesData);
    renderSlideshow();
    closeSlideModal();
    alert('Slide ajouté!');
    
  } catch (e) {
    console.error('[submitSlide]', e);
    alert('Erreur: ' + e.message);
  }
}// ✅ Make global
window.submitSlide = submitSlide;

function openSlideModal() {
  if (!isOwner()) {
    alert('Owner ihany no afaka manampy slide.');
    return;
  }
  var modal = ensureSlideModal();
  slideFileData = null;
  modal.querySelector('#slide-alt').value = '';
  modal.querySelector('#slide-link').value = '#';
  modal.querySelector('#slide-preview').style.display = 'none';
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function closeSlideModal() {
  var modal = document.getElementById('slide-add-modal');
  if (!modal) return;
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}
/* ========================================
   DELETE SLIDE
   ======================================== */

function deleteSlide(id) {
  if (!isOwner()) {
    console.warn('[deleteSlide] Not owner');
    return;
  }
  
  if (!confirm('Hofafana ve ity slide ity?')) return;
  
  try {
    console.log('[deleteSlide] Deleting:', id);
    console.log('[deleteSlide] Before:', window.slidesData);
    
    // ✅ FIX: Filter slides
    var filtered = [];
    for (var i = 0; i < window.slidesData.length; i++) {
      var s = window.slidesData[i];
      if (s && s.id !== id) {
        filtered.push(s);
      }
    }
    
    window.slidesData = filtered;
    console.log('[deleteSlide] After:', window.slidesData);
    
    // ✅ FIX: Save then render
    saveSlides(window.slidesData);
    
    setTimeout(function() {
      renderSlideshow();
      alert('Slide voafafa.');
    }, 100);
    
  } catch (e) {
    console.error('[deleteSlide ERROR]', e);
    alert('Erreur suppression: ' + e.message);
  }
}// ✅ CRITICAL: Ataovy global
window.deleteSlide = deleteSlide;
/* ========================================
   SLIDESHOW BUTTONS WIRING (FIXED)
   ======================================== */
document.addEventListener('DOMContentLoaded', function() {
  var track = document.getElementById('slide-track');
  
  if (track) {
    // ✅ Event delegation - miasa na dia tsy mbola misy button
    track.addEventListener('click', function(e) {
      var btn = e.target.closest('.slide-delete-btn');
      if (!btn) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      var slideId = btn.getAttribute('data-slide-id');
      if (slideId && typeof deleteSlide === 'function') {
        deleteSlide(slideId);
      }
    });
  }
  
  // Wire add button
  var addBtn = document.getElementById('btnAddSlide');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      if (!isOwner()) {
        alert('Owner ihany no afaka manampy slide.');
        return;
      }
      if (typeof openSlideModal === 'function') {
        openSlideModal();
      }
    });
  }

    // ✅ CRITICAL: Apply visibility based on owner status
    var checkAuth = setInterval(function() {
      if (typeof isOwner === 'function') {
        addBtn.style.display = isOwner() ? 'inline-flex' : 'none';
        clearInterval(checkAuth);
      }
    }, 100);
  }

    /* Filters toolbar */
    (document.getElementById('shop-filters')?.addEventListener('click', function(e){
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      this.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b===btn));
      renderProducts(btn.getAttribute('data-filter') || 'all', document.getElementById('search')?.value || '');
    })));

    /* Popup filters */
    document.getElementById('filters')?.addEventListener('click', function(e){
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      this.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b===btn));
      renderProducts(btn.getAttribute('data-category') || 'all', document.getElementById('search')?.value || '');
    });

try {
const search = document.getElementById('search');
if (search) {
  // ✅ Helper debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
  
  // ✅ Debounced search
  const debouncedSearch = debounce(function() {
    const activeBtn = document.querySelector('#filters .filter-btn.active');
    renderProducts(
      activeBtn?.getAttribute('data-category') || 'all',
      search.value || ''
    );
  }, 300);
  
  search.addEventListener('input', debouncedSearch);

    
  }
} catch (err) {
  console.error('[Optimized Actions error]', err);
}/* =============== CART DRAWER JS (cd-) =============== */
(function() {
  // Elements
  const drawer   = document.getElementById('cdCartDrawer');
  const bodyEl   = document.getElementById('cdCartBody');
  const totalEl  = document.getElementById('cdCartTotal');
  const fabBtn   = document.getElementById('cdCartFab');
  const badgeEl  = document.getElementById('cdCartBadge');
  const closeBtn = drawer?.querySelector('.cd-cart-close');
  const backdrop = document.getElementById('cdBackdrop');
  const checkoutBtn = document.getElementById('cdCheckoutBtn');

  if (!drawer || !bodyEl) {
    console.warn('[Cart Drawer] Missing elements');
    return;
  }

  // State (source unique)
  const state = {
    items: new Map(), // id -> { id, name, price, qty }
  };

  // Helpers
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
  
  function formatAr(num) {
    const n = Number(num) || 0;
    return n.toLocaleString('fr-MG') + ' Ar';
  }

  // Open/Close
  function openCart() {
    drawer.classList.add('is-open');
    drawer.classList.remove('is-minimized');
    drawer.setAttribute('aria-hidden', 'false');
    if (backdrop) {
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add('is-open'));
    }
  }
  
  function minimizeCart() {
    drawer.classList.remove('is-open');
    drawer.classList.add('is-minimized');
    drawer.setAttribute('aria-hidden', 'true');
    if (backdrop) {
      backdrop.classList.remove('is-open');
      setTimeout(() => { backdrop.hidden = true; }, 200);
    }
  }

  // Event listeners
  fabBtn?.addEventListener('click', openCart);
  closeBtn?.addEventListener('click', minimizeCart);
  backdrop?.addEventListener('click', minimizeCart);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      minimizeCart();
    }
  });

  // API Quantité
  function setQty(id, qty) {
    qty = Math.max(1, Math.min(999, Number(qty) || 1));
    const it = state.items.get(id);
    if (!it) return;
    if (it.qty === qty) return;
    it.qty = qty;
    updateUI();
  }
  
  function addItem(product) {
  const q = Math.max(1, Math.min(999, Number(product.qty) || 1));
  const existing = state.items.get(product.id);
  
  if (existing) {
    existing.qty = Math.min(999, existing.qty + q);
  } else {
    // ✅ Capture l'image du produit
    let imgUrl = null;
    if (product.image) {
      if (typeof product.image === 'string') {
        imgUrl = product.image;
      } else if (product.image.url) {
        imgUrl = product.image.url;
      }
    } else if (product.thumbnail_url) {
      imgUrl = product.thumbnail_url;
    } else if (product._db && product._db.thumbnail_url) {
      imgUrl = product._db.thumbnail_url;
    }
    
    state.items.set(String(product.id), {
      id: String(product.id),
      name: product.name || product.title || 'Produit',
      price: Number(product.price) || 0,
      qty: q,
      image: imgUrl // ✅ Ajout de l'image
    });
  }
  updateUI();
}
  
  function removeItem(id) {
    state.items.delete(id);
    updateUI();
  }
  
  function clearCart() {
  if (!state.items.size) return;
  
  if (!confirm('Hofafana daholo ve ny entana ao anaty panier?')) return;
  
  state.items.clear();
  updateUI();
  
  // ✅ Fermer le drawer après avoir vidé
  setTimeout(() => {
    minimizeCart();
  }, 300);
}

  function calcTotals() {
    let subtotal = 0;
    let count = 0;
    for (const it of state.items.values()) {
      subtotal += it.price * it.qty;
      count += it.qty;
    }
    return { subtotal, count };
  }

  function renderItems() {
  const items = [...state.items.values()];
  if (!items.length) {
    bodyEl.innerHTML = `
      <div class="cd-empty-state">
        <i class="fa-solid fa-cart-shopping"></i>
        <p>Tsy misy entana ao anaty panier.</p>
      </div>
    `;
    return;
  }
  
  bodyEl.innerHTML = items.map(it => {
    // ✅ Get image URL (compatible avec votre structure)
    let imgUrl = 'https://via.placeholder.com/64x64/1e293b/4ade80?text=IMG';
    if (it.image) {
      // Si l'objet image complet est passé
      if (typeof it.image === 'string') {
        imgUrl = it.image;
      } else if (it.image.url) {
        imgUrl = it.image.url;
      }
    } else if (it.thumbnail_url) {
      imgUrl = it.thumbnail_url;
    }
    
    const itemTotal = it.price * it.qty;
    
    return `
      <div class="cd-cart-item" data-id="${esc(it.id)}">
        <img src="${esc(imgUrl)}" 
             alt="${esc(it.name)}" 
             class="cd-ci-image"
             onerror="this.src='https://via.placeholder.com/64x64/1e293b/4ade80?text=IMG'">
        
        <div class="cd-ci-info">
          <div class="cd-ci-name">${esc(it.name)}</div>
          <div class="cd-ci-price">
            <i class="fa-solid fa-coins"></i>
            <span>${formatAr(it.price)} / isa</span>
          </div>
          <div class="cd-ci-total">${formatAr(itemTotal)}</div>
        </div>
        
        <div class="cd-ci-actions">
          <button class="cd-btn-qty cd-btn-dec" aria-label="Ahena">−</button>
          <input class="cd-ci-qty" 
                 type="number" 
                 inputmode="numeric" 
                 min="1" 
                 max="999" 
                 value="${it.qty}">
          <button class="cd-btn-qty cd-btn-inc" aria-label="Ampiana">+</button>
          <button class="cd-btn-remove" aria-label="Esory">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

  function updateUI() {
    renderItems();
    const { subtotal, count } = calcTotals();
    totalEl.textContent = formatAr(subtotal);

    // Badge animation
    if (count > 0) {
      badgeEl.style.display = 'inline-flex';
      badgeEl.textContent = String(count);
      badgeEl.classList.remove('pulse');
      void badgeEl.offsetWidth;
      badgeEl.classList.add('pulse');
    } else {
      badgeEl.style.display = 'none';
      badgeEl.textContent = '0';
    }
  }

  // Event delegation (+ / - / remove)
  bodyEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = e.target.closest('.cd-cart-item');
    if (!row) return;
    const id = row.dataset.id;
    const it = state.items.get(id);
    if (!it) return;

    if (btn.classList.contains('cd-btn-inc')) {
      setQty(id, it.qty + 1);
    } else if (btn.classList.contains('cd-btn-dec')) {
      setQty(id, it.qty - 1);
    } else if (btn.classList.contains('cd-btn-remove')) {
      removeItem(id);
    }
  });

  // Input quantity (debounced)
  let qtyDeb;
  bodyEl.addEventListener('input', (e) => {
    const inp = e.target.closest('.cd-ci-qty');
    if (!inp) return;
    const row = e.target.closest('.cd-cart-item');
    if (!row) return;
    const id = row.dataset.id;
    clearTimeout(qtyDeb);
    qtyDeb = setTimeout(() => setQty(id, inp.value), 120);
  });

  // Drag-to-close
  (function enableDragToClose() {
    let startX = 0;
    let curX = 0;
    let dragging = false;
    let moved = false;
    const threshold = 120;
    const maxPull = 380;

    function start(clientX) {
      if (!drawer.classList.contains('is-open')) return;
      dragging = true;
      moved = false;
      startX = clientX;
      curX = 0;
      drawer.style.transition = 'none';
    }
    
    function move(clientX, clientY, ev) {
      if (!dragging) return;
      const dx = Math.max(0, clientX - startX);
      if (!moved && Math.abs(dx) < 6) return;
      moved = true;
      const pull = dx > maxPull ? maxPull + (dx - maxPull) * 0.2 : dx;
      curX = pull;
      drawer.style.transform = `translateX(${pull}px)`;
      if (ev?.cancelable) ev.preventDefault();
    }
    
    function end() {
      if (!dragging) return;
      dragging = false;
      drawer.style.transition = 'transform .24s ease';
      if (curX > threshold) {
        minimizeCart();
        drawer.style.transform = '';
      } else {
        drawer.style.transform = '';
        drawer.classList.add('is-open');
      }
    }

    // Touch
    drawer.addEventListener('touchstart', (e) => start(e.touches[0].clientX), { passive: true });
    drawer.addEventListener('touchmove', (e) => move(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
    drawer.addEventListener('touchend', end, { passive: true });
    drawer.addEventListener('touchcancel', end, { passive: true });

    // Mouse
    drawer.addEventListener('mousedown', (e) => start(e.clientX));
    window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY, e));
    window.addEventListener('mouseup', end);
  })();

  // Checkout via WhatsApp
  checkoutBtn?.addEventListener('click', () => {
    const { subtotal, count } = calcTotals();
    if (!count) {
      alert('Tsy misy entana ao anaty panier.');
      return;
    }
    
    // Build WhatsApp message
    let lines = ['Salama! Commande avy amin\'ny Mijoro Boutique:', ''];
    for (const it of state.items.values()) {
      const itemTotal = it.price * it.qty;
      lines.push(`• ${it.name} x${it.qty} — ${itemTotal.toLocaleString('fr-FR')} AR`);
    }
    lines.push('', `Total: ${subtotal.toLocaleString('fr-FR')} AR`, 'Misaotra!');
    
    const message = encodeURIComponent(lines.join('\n'));
    const phone = '261333106055'; // ← Ovay raha mila
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener');
  });

  // Init (minimized)
  minimizeCart();

  // Expose API
  window.CartAPI = {
    open: openCart,
    close: minimizeCart,
    add: addItem,
    remove: removeItem,
    setQty: setQty,
    clear: clearCart,
    state,
  };
  
  console.log('[Cart Drawer] ✓ Initialized');
})();
/* =============== /CART DRAWER JS =============== */
/* ==========================================
   CART FAB - DRAG LOGIC ✅ FIXED VERSION
   ========================================== */


/* ================================
   PART 3/4 — CART, SLIDESHOW, NAV, MODALS
   ========================================= */

/* ================================
   CART SYSTEM - Uses CartAPI from Cart Drawer
   ========================================= */
// See Cart Drawer module for implementation
// Legacy functions are wrapped above for compatibility

function loadCartFromStorage() {
  try {
    var raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.warn('[Cart load error]', err);
    return [];
  }
}
function saveCartToStorage(itemsArr) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(itemsArr));
  } catch (err) {
    console.warn('[Cart save error]', err);
  }
}
function cartMapToArray() {
  var out = [];
  cartItems.forEach(function (item) { out.push(item); });
  return out;
}
function cartArrayToMap(arr) {
  cartItems.clear();
  for (var i = 0; i < arr.length; i++) {
    var it = arr[i];
    if (!it || !it.id) continue;
    cartItems.set(it.id, {
      id: it.id,
      title: it.title || 'Produit',
      price: Number(it.price) || 0,
      qty: Math.max(1, Number(it.qty) || 1),
      image: it.image || ''
    });
  }
}

function removeFromCart(id) {
  try { cartItems.delete(id); updateCartUI(); }
  catch (err) { console.error('[removeFromCart error]', err); }
}
function changeQty(id, delta) {
  try {
    var item = cartItems.get(id);
    if (!item) return;
    
    // ✅ FIX: Update quantity correctly
    var newQty = item.qty + delta;
    
    if (newQty <= 0) {
      cartItems.delete(id);
    } else {
      item.qty = newQty; // ✅ Direct assignment, tsy x2 intsony
    }
    
    updateCartUI();
  } catch (err) {
    console.error('[changeQty error]', err);
  }
}
function clearCart() {
  try { cartItems.clear(); updateCartUI(); }
  catch (err) { console.error('[clearCart error]', err); }
}
function cartTotals() {
  var count = 0, total = 0;
  cartItems.forEach(function (item) {
    count += item.qty;
    total += item.qty * (Number(item.price) || 0);
  });
  return { count: count, total: total };
}

(function initCartDrawer() {
  try {
    var toggle = document.getElementById('cart-toggle');
    var drawer = document.getElementById('cart-drawer');
    if (toggle && drawer) {
      toggle.addEventListener('click', function () {
        var show = !drawer.classList.contains('show');
        drawer.classList.toggle('show', show);
        drawer.setAttribute('aria-hidden', show ? 'false' : 'true');
      });
      drawer.addEventListener('click', function (e) {
        var item = e.target && e.target.closest ? e.target.closest('.cart-item') : null;
        if (!item) return;
        var id = item.getAttribute('data-id');
        var btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
        if (!btn) return;
        var act = btn.getAttribute('data-action');
        if (act === 'inc') changeQty(id, +1);
        else if (act === 'dec') changeQty(id, -1);
        else if (act === 'remove') removeFromCart(id);
      });
    }
  } catch (err) {
    console.error('[initCartDrawer error]', err);
  }
})();
// ✅ NOUVEAU CODE (compatible Cart Drawer)
document.addEventListener('DOMContentLoaded', function() {
  try {
    console.log('[Cart] Initializing with Cart Drawer API...');
    
    // Vérifier si Cart Drawer est chargé
    if (typeof window.CartAPI === 'undefined') {
      console.warn('[Cart] Cart Drawer not loaded yet, waiting...');
      
      // Attendre le Cart Drawer
      var checkInterval = setInterval(function() {
        if (typeof window.CartAPI !== 'undefined') {
          clearInterval(checkInterval);
          initializeCart();
        }
      }, 100);
      
      // Timeout après 5 secondes
      setTimeout(function() {
        clearInterval(checkInterval);
        if (typeof window.CartAPI === 'undefined') {
          console.error('[Cart] Cart Drawer failed to load');
        }
      }, 5000);
      
    } else {
      initializeCart();
    }
    
    function initializeCart() {
      console.log('[Cart] ✓ Cart Drawer ready');
      
      // Migrer ancien panier si existe
      try {
        var CART_KEY = 'cart:v1';
        var raw = localStorage.getItem(CART_KEY);
        
        if (raw) {
          var oldCart = JSON.parse(raw);
          console.log('[Cart] Found old cart:', oldCart.length, 'items');
          
          if (Array.isArray(oldCart) && oldCart.length > 0) {
            oldCart.forEach(function(item) {
              window.CartAPI.add({
                id: item.id,
                title: item.title || 'Produit',
                price: Number(item.price) || 0,
                qty: Number(item.qty) || 1,
                image: item.image || ''
              });
            });
            
            console.log('[Cart] ✓ Migrated', oldCart.length, 'items to Cart Drawer');
            
            // Supprimer ancien cart
            localStorage.removeItem(CART_KEY);
          }
        }
      } catch (migrationErr) {
        console.warn('[Cart] Migration error:', migrationErr);
      }
    }
    
  } catch (err) {
    console.error('[Cart] Init error:', err);
  }
});
function checkoutWhatsApp() {
  try {
    if (cartItems.size === 0) {
      openWhatsAppMessage('Salama! Te-hanao commande (panier vide).');
      return;
    }
    var lines = ['Salama! Commande avy amin"ny Mijoro Boutique:', ''];
    var total = 0;
    cartItems.forEach(function (item) {
      var itemPrice = (Number(item.price) || 0) * item.qty;
      total += itemPrice;
      // ✅ FORMAT SIMPLE
      var priceText = itemPrice.toLocaleString('fr-FR') + ' AR';
      lines.push('• ' + item.title + ' x' + item.qty + ' — ' + priceText);
    });
    var totalText = total.toLocaleString('fr-FR') + ' AR';
    lines.push('', 'Total: ' + totalText, 'Misaotra!');
    openWhatsAppMessage(lines.join('\n'));
  } catch (err) {
    console.error('[checkoutWhatsApp error]', err);
  }
}
/* ==========================================
   RECEIPT SYSTEM - VERSION CORRIGÉE MANUEL ✅
   
   PROBLÈMES IDENTIFIÉS:
   1. checkoutWhatsApp() original était écrasé
   2. window.CartAPI non compatible avec ancien code
   3. Format du reçu avait des caractères spéciaux problématiques
   4. Pas de feedback visuel avant ouverture WhatsApp
   
   ========================================== */

(function initReceiptSystem() {
  'use strict';
  
  console.log('[Receipt] 🧾 Initializing receipt system...');
  
  // ========================================
  // ÉTAPE 1: GÉNÉRER NUMÉRO DE COMMANDE
  // ========================================
  
  function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    // Format: MJR25011312345 (MJR + Year + Month + Day + Random)
    return `MJR${year}${month}${day}${random}`;
  }
  
  // ========================================
  // ÉTAPE 2: FORMATER LE REÇU (VERSION SIMPLE)
  // ========================================
  
  function formatWhatsAppReceipt(orderNumber, items, total) {
    const now = new Date();
    
    // ✅ FIX: Format date simple (évite les problèmes de locale)
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // ✅ STRUCTURE SIMPLIFIÉE (évite les symboles Unicode qui posent problème)
    let receipt = '==========================================\n';
    receipt += '       MIJORO BOUTIQUE\n';
    receipt += '       RECU DE COMMANDE\n';
    receipt += '==========================================\n\n';
    
    receipt += `N° Commande: ${orderNumber}\n`;
    receipt += `Date: ${dateStr}\n`;
    receipt += `Heure: ${timeStr}\n`;
    receipt += '------------------------------------------\n\n';
    
    receipt += 'DETAILS DE LA COMMANDE:\n\n';
    
    // ✅ FIX: Listage simple sans symboles complexes
    items.forEach((item, index) => {
      const itemTotal = item.price * item.qty;
      const priceText = itemTotal > 0 ? 
        itemTotal.toLocaleString('fr-FR') + ' AR' : 
        'Gratuit';
      
      receipt += `${index + 1}. ${item.title}\n`;
      receipt += `   Quantite: ${item.qty}\n`;
      receipt += `   Prix unit: ${item.price > 0 ? item.price.toLocaleString('fr-FR') + ' AR' : 'Gratuit'}\n`;
      receipt += `   Sous-total: ${priceText}\n\n`;
    });
    
    receipt += '------------------------------------------\n';
    receipt += `TOTAL A PAYER: ${total.toLocaleString('fr-FR')} AR\n`;
    receipt += '------------------------------------------\n\n';
    
    receipt += 'Contact: +261 33 31 06 055\n';
    receipt += 'Email: joroandriamanirisoa13@gmail.com\n\n';
    
    receipt += 'Merci pour votre confiance!\n';
    receipt += 'Conservez ce recu pour votre commande\n\n';
    
    receipt += 'Mijoro Boutique - Votre partenaire digital';
    
    return receipt;
  }
  
  // ========================================
  // ÉTAPE 3: SAUVEGARDER DANS L'HISTORIQUE
  // ========================================
  
  function saveOrderToHistory(orderNumber, items, total) {
    try {
      const HISTORY_KEY = 'order-history:v1';
      
      const order = {
        orderNumber: orderNumber,
        date: new Date().toISOString(),
        items: items,
        total: total,
        status: 'pending'
      };
      
      // Charger l'historique existant
      let history = [];
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        history = JSON.parse(raw);
      }
      
      // Ajouter en début (plus récent en premier)
      history.unshift(order);
      
      // Garder seulement les 50 dernières commandes
      if (history.length > 50) {
        history = history.slice(0, 50);
      }
      
      // Sauvegarder
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      
      console.log('[Receipt] ✅ Order saved to history:', orderNumber);
      
    } catch (e) {
      console.warn('[Receipt] ⚠️ Could not save to history:', e);
      // Ne bloque pas le processus si erreur
    }
  }
  
  // ========================================
  // ÉTAPE 4: AFFICHER LE MODAL DE CONFIRMATION
  // ========================================
  
  function showReceiptModal(orderNumber, receipt, items, total) {
    console.log('[Receipt] 📋 Showing receipt modal...');
    
    // Supprimer ancien modal si existe
    const existingModal = document.getElementById('receipt-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Créer le modal
    const modal = document.createElement('div');
    modal.id = 'receipt-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
    
    modal.innerHTML = `
      <div style="background:#0e0f13;color:#fff;border-radius:14px;width:min(500px,100%);max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5)">
        
        <!-- Header -->
        <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:18px;display:flex;align-items:center;gap:8px">
            <i class="fa-solid fa-receipt"></i>
            Reçu de Commande
          </h3>
          <button type="button" 
                  class="receipt-close-btn"
                  style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:24px;padding:4px;line-height:1;transition:color 0.2s"
                  onmouseover="this.style.color='#fff'"
                  onmouseout="this.style.color='#94a3b8'">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <!-- Content -->
        <div style="padding:20px;overflow-y:auto;flex:1">
          
          <!-- Receipt Preview -->
          <div style="background:#14161c;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px;font-family:monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;margin-bottom:20px">
${receipt}
          </div>
          
          <!-- Info Box -->
          <div style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);border-radius:10px;padding:12px;margin-bottom:16px">
            <p style="margin:0;font-size:14px;color:#93c5fd">
              <i class="fa-solid fa-info-circle"></i>
              <strong>Conservez ce reçu</strong> comme preuve de votre commande. Le N° de commande vous sera demandé pour le suivi.
            </p>
          </div>
          
        </div>
        
        <!-- Actions -->
        <div style="padding:16px;border-top:1px solid rgba(255,255,255,.1);display:flex;gap:8px;flex-wrap:wrap">
          
          <button type="button"
                  class="receipt-btn receipt-copy-btn"
                  style="flex:1;min-width:140px;padding:12px;border:1px solid rgba(59,130,246,.3);background:rgba(59,130,246,.1);color:#3b82f6;border-radius:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s"
                  onmouseover="this.style.background='rgba(59,130,246,.2)'"
                  onmouseout="this.style.background='rgba(59,130,246,.1)'">
            <i class="fa-solid fa-copy"></i>
            Copier le texte
          </button>
          
          <button type="button"
                  class="receipt-btn receipt-whatsapp-btn"
                  style="flex:1;min-width:140px;padding:12px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-radius:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 16px rgba(16,185,129,.3)'"
                  onmouseout="this.style.transform='';this.style.boxShadow=''">
            <i class="fa-brands fa-whatsapp"></i>
            Envoyer sur WhatsApp
          </button>
          
        </div>
        
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // ========================================
    // WIRE LES BOUTONS DU MODAL
    // ========================================
    
    const closeBtn = modal.querySelector('.receipt-close-btn');
    const copyBtn = modal.querySelector('.receipt-copy-btn');
    const whatsappBtn = modal.querySelector('.receipt-whatsapp-btn');
    
    // Bouton Fermer
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // Bouton Copier
    copyBtn.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(receipt)
          .then(() => {
            // Feedback visuel
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copié!';
            copyBtn.style.background = 'rgba(16,185,129,.2)';
            copyBtn.style.color = '#10b981';
            
            setTimeout(() => {
              copyBtn.innerHTML = originalHTML;
              copyBtn.style.background = '';
              copyBtn.style.color = '';
            }, 2000);
          })
          .catch(err => {
            console.error('[Receipt] Copy error:', err);
            alert('❌ Erreur lors de la copie');
          });
      } else {
        // Fallback pour anciens navigateurs
        alert('⚠️ Copie non supportée sur cet appareil');
      }
    });
    
    // Bouton WhatsApp
    whatsappBtn.addEventListener('click', () => {
      sendReceiptViaWhatsApp(receipt);
      modal.remove();
    });
    
    // Fermer sur backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Fermer sur Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    console.log('[Receipt] ✅ Modal displayed');
  }
  
  // ========================================
  // ÉTAPE 5: ENVOYER VIA WHATSAPP
  // ========================================
  
  function sendReceiptViaWhatsApp(receipt) {
    try {
      console.log('[Receipt] 📤 Sending to WhatsApp...');
      
      const message = encodeURIComponent(receipt);
      const phone = '261333106055'; // ← Votre numéro WhatsApp
      const url = `https://wa.me/${phone}?text=${message}`;
      
      // Ouvrir WhatsApp
      window.open(url, '_blank', 'noopener');
      
      console.log('[Receipt] ✅ WhatsApp opened');
      
    } catch (e) {
      console.error('[Receipt] ❌ WhatsApp error:', e);
      alert('❌ Erreur lors de l\'ouverture de WhatsApp');
    }
  }
  
  // ========================================
  // ÉTAPE 6: PATCH checkoutWhatsApp() - LE PLUS IMPORTANT
  // ========================================
  
  // ✅ SAUVEGARDER L'ANCIENNE FONCTION (si existe)
  const originalCheckoutWhatsApp = window.checkoutWhatsApp;
  
  // ✅ CRÉER LA NOUVELLE VERSION
  window.checkoutWhatsApp = function() {
    try {
      console.log('[Receipt] 🛒 Checkout triggered');
      
      // ========================================
      // RÉCUPÉRER LES ITEMS DU PANIER
      // ========================================
      
      let items = [];
      let total = 0;
      
      // ✅ MÉTHODE 1: Via CartAPI (moderne)
      if (typeof window.CartAPI !== 'undefined' && window.CartAPI.state) {
        console.log('[Receipt] Using CartAPI');
        
        const cartItems = window.CartAPI.state.items;
        
        if (cartItems.size === 0) {
          alert('⚠️ Votre panier est vide');
          return;
        }
        
        // Convertir Map en Array
        cartItems.forEach((item) => {
          const itemTotal = item.price * item.qty;
          total += itemTotal;
          items.push({
            title: item.name || item.title || 'Produit',
            price: Number(item.price) || 0,
            qty: Number(item.qty) || 1
          });
        });
        
      }
      // ✅ MÉTHODE 2: Via ancien cartItems (fallback)
      else if (typeof window.cartItems !== 'undefined' && window.cartItems.size > 0) {
        console.log('[Receipt] Using legacy cartItems');
        
        window.cartItems.forEach((item) => {
          const itemTotal = item.price * item.qty;
          total += itemTotal;
          items.push({
            title: item.title || 'Produit',
            price: Number(item.price) || 0,
            qty: Number(item.qty) || 1
          });
        });
        
      }
      // ✅ MÉTHODE 3: Panier vide
      else {
        alert('⚠️ Votre panier est vide');
        return;
      }
      
      // ========================================
      // GÉNÉRER LE REÇU
      // ========================================
      
      console.log('[Receipt] 📋 Generating receipt for', items.length, 'items');
      
      const orderNumber = generateOrderNumber();
      const receipt = formatWhatsAppReceipt(orderNumber, items, total);
      
      // Sauvegarder dans l'historique
      saveOrderToHistory(orderNumber, items, total);
      
      // Afficher le modal
      showReceiptModal(orderNumber, receipt, items, total);
      
      console.log('[Receipt] ✅ Checkout complete');
      
    } catch (err) {
      console.error('[Receipt] ❌ Checkout error:', err);
      alert('❌ Erreur lors de la génération du reçu: ' + err.message);
    }
  };
  
  console.log('[Receipt] ✅ System initialized and checkoutWhatsApp patched');
  
})();
/* Helpers (z-index/menu safety) */
function __ensureBottomMenuClickable() {
  var bm = document.querySelector('.bottom-menu');
  if (bm) {
    bm.style.pointerEvents = 'auto';
    bm.style.zIndex = '3200';
  }
}
document.addEventListener('DOMContentLoaded', function () {
  __ensureBottomMenuClickable();
});

/* ========================================
   SLIDESHOW AUTO LOGIC (OVAINA)
   ======================================== */

function initSlideshowLogic() {
  try {
    var track = document.getElementById('slide-track');
    var dotsWrap = document.getElementById('slide-dots');
    
    if (!track) {
      console.warn('[initSlideshowLogic] slide-track not found');
      return;
    }
    
    var slides = Array.prototype.slice.call(track.children || []);
    var count = slides.length;
    
    if (count === 0) {
      console.warn('[initSlideshowLogic] No slides found');
      return;
    }
    
    var index = 0;
    var timer = null;
    var DURATION = 5000;
    
    // ✅ Create dots
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < count; i++) {
        (function(iIdx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'dot' + (iIdx === 0 ? ' active' : '');
          btn.setAttribute('aria-label', 'Aller à la diapo ' + (iIdx + 1));
          btn.addEventListener('click', function() { goTo(iIdx, true); });
          dotsWrap.appendChild(btn);
        })(i);
      }
    }
    
    function updateUI() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      if (dotsWrap) {
        var kids = Array.prototype.slice.call(dotsWrap.children || []);
        for (var d = 0; d < kids.length; d++) {
          if (d === index) kids[d].classList.add('active');
          else kids[d].classList.remove('active');
        }
      }
    }
    
    function next() {
      index = (index + 1) % count;
      updateUI();
    }
    
    function prev() {
      index = (index - 1 + count) % count;
      updateUI();
    }
    
    function goTo(i, user) {
      index = (i + count) % count;
      updateUI();
      if (user) restart();
    }
    
    function start() {
      if (timer) clearInterval(timer);
      timer = setInterval(next, DURATION);
    }
    
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    
    function restart() {
      stop();
      start();
    }
    
    // ✅ Touch events
    var startX = null;
    track.addEventListener('touchstart', function(e) {
      var t0 = (e.touches && e.touches[0]) ? e.touches[0].clientX : null;
      startX = t0;
      stop();
    }, { passive: true });
    
    track.addEventListener('touchend', function(e) {
      var t1 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : null;
      if (startX != null && t1 != null) {
        var dx = t1 - startX;
        if (Math.abs(dx) > 40) {
          if (dx < 0) next();
          else prev();
        }
      }
      startX = null;
      start();
    }, { passive: true });
    
    track.addEventListener('mouseenter', stop);
    track.addEventListener('mouseleave', start);
    
    updateUI();
    start();
    
  } catch (err) {
    console.error('[initSlideshowLogic ERROR]', err);
  }
}
/* ========================================
   INIT SLIDESHOW
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  renderSlideshow();
});

/* ==========================================
   NAVIGATION - UNIFIED HANDLER (FIXED)
   ========================================== */

(function initBottomNav() {
  'use strict';
  
  const SECTION_IDS = ['home', 'shop'];
  
  function showSection(sectionId, clickedBtn) {
  try {
    // ✅ CRITICAL: Handle params specifically
    if (sectionId === 'params') {
      if (typeof toggleParamFixed === 'function') {
        toggleParamFixed();
      }
      return;
    }
    
    // Validation
    if (!sectionId) return;
    if (SECTION_IDS.indexOf(sectionId) === -1) {
      console.warn('[Nav] Unknown section:', sectionId);
      return;
    }
    
    // Hide all sections
    SECTION_IDS.forEach(function(secId) {
      const el = document.getElementById(secId);
      if (!el) return;
      const active = (secId === sectionId);
      el.classList.toggle('active', active);
      el.setAttribute('aria-hidden', String(!active));
    });
    
    // Update active button
    const nav = document.querySelector('.bottom-nav');
    if (nav) {
      nav.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('active');
      });
      
      if (clickedBtn && clickedBtn.classList) {
        clickedBtn.classList.add('active');
      }
    }
    
    // Toggle shop-active class
    document.body.classList.toggle('shop-active', sectionId === 'shop');
    
    // ✅ NE PAS bloquer le overflow du body
    // La section shop gère son propre scroll
    
    // Scroll to top (sauf pour home)
    const activeSec = document.getElementById(sectionId);
    if (activeSec && activeSec.scrollIntoView && sectionId !== 'home') {
      activeSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Close modals
    if (typeof closeParamFixed === 'function') {
      closeParamFixed();
    }
    
    const popup = document.getElementById('shop-popup');
    if (popup) {
      popup.classList.remove('show');
      popup.setAttribute('aria-hidden', 'true');
      popup.style.pointerEvents = 'none';
    }
    
    console.log('[Nav] Switched to:', sectionId);
    
  } catch (err) {
    console.error('[showSection error]', err);
  }
}
  
  // Export global
  window.showSection = showSection;
  
  function init() {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) {
      console.warn('[Nav] .bottom-nav not found');
      return;
    }
    
    // ✅ Event delegation - handler tokana
    nav.addEventListener('click', function(e) {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const section = btn.getAttribute('data-section');
      if (!section) return;
      
      // Params = toggle panel only
      if (section === 'params') {
        if (typeof toggleParamFixed === 'function') {
          toggleParamFixed();
        }
        return;
      }
      
      showSection(section, btn);
    });
    
    console.log('[Nav] ✓ Initialized');
  }
  // ✅ Bouton Vider le panier
const clearBtn = document.getElementById('cdClearBtn');
clearBtn?.addEventListener('click', clearCart);
  
  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
/* Param panel toggle/close + click-outside */
var __paramOpen = false;
function toggleParamFixed() {
  try {
    var el = document.getElementById('param-fixed');
    if (!el) return;
    __paramOpen = !__paramOpen;
    if (__paramOpen) el.removeAttribute('inert');
    el.classList.toggle('hidden', !__paramOpen);
    el.setAttribute('aria-hidden', String(!__paramOpen));
    if (__paramOpen) {
      document.body.classList.add('param-open');
      var first = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (first && first.focus) first.focus({ preventScroll: true });
      el.style.zIndex = '5000';
      el.style.pointerEvents = 'auto';
      var popup = document.getElementById('shop-popup');
      if (popup && popup.classList.contains('show')) closeShop();
    } else {
      el.setAttribute('inert', '');
      el.style.pointerEvents = 'none';
      document.body.classList.remove('param-open');
    }
    __ensureBottomMenuClickable();
  } catch (err) {
    console.error('[toggleParamFixed error]', err);
  }
}
function closeParamFixed() {
  try {
    var el = document.getElementById('param-fixed');
    if (!el) return;
    __paramOpen = false;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
    el.style.pointerEvents = 'none';
    document.body.classList.remove('param-open');
    __ensureBottomMenuClickable();
  } catch (err) {
    console.error('[closeParamFixed error]', err);
  }
}
document.addEventListener('click', function (e) {
  try {
    var panel = document.getElementById('param-fixed');
    if (!panel) return;
    var trigger = e.target && e.target.closest ? e.target.closest('.menu-param') : null;
    var insidePanel = e.target && e.target.closest ? e.target.closest('#param-fixed') : null;
    if (trigger || insidePanel) return;
    if (!panel.classList.contains('hidden')) closeParamFixed();
  } catch (err) {
    console.warn('[param click-outside]', err);
  }
});

/* ================================
   MODALS + SHOP + PREVIEW
   ================================ */

/* Preview avancé (PDF / Video / HLS / iframe) */
function openPreview(p) {
  try {
    var modal = document.getElementById('info-modal');
    var title = document.getElementById('info-title');
    var content = document.getElementById('info-content');
    if (!modal || !content || !title) return;
    
    // ✅ FIX: Manadio TANTERAKA ny content aloha
    // Stop all media
    var vids = content.querySelectorAll('video');
    vids.forEach(function(v) {
      if (!v.paused) v.pause();
      v.src = '';
      v.load();
    });
    
    // Remove all embeds/iframes
    content.querySelectorAll('embed, iframe, video').forEach(function(el) {
      el.remove();
    });
    
    // Clear content completely
    content.innerHTML = '';
    
    // Small delay for cleanup
    setTimeout(function() {
      var url = null;
      if (p && p._db && p._db.preview_url) url = p._db.preview_url;
      else if (p && p.preview_url) url = p.preview_url;
      
      title.textContent = (p && p.title) ? p.title + ' — Preview' : 'Preview';
      
      if (!url) {
        content.innerHTML = '<p style="color:#ddd;padding:20px;text-align:center">Tsy misy Preview URL ho an\'ity produit ity.</p>';
      } else if (/\.pdf(\?|#|$)/i.test(url)) {
        content.innerHTML = '<embed type="application/pdf" src="' + escapeAttr(url) + '#toolbar=1&navpanes=0&statusbar=0" style="width:100%; height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)">';
      } else if (/\.(mp4|webm|mkv)(\?|#|$)/i.test(url)) {
        // ✅ Create fresh video element
        var vid = document.createElement('video');
        vid.controls = true;
        vid.src = url;
        vid.style.cssText = 'width:100%; height:auto; max-height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)';
        content.appendChild(vid);
      } else if (/\.m3u8(\?|#|$)/i.test(url)) {
        var vidId = 'hls-player-' + Date.now();
        content.innerHTML = '<video id="' + vidId + '" controls style="width:100%; height:auto; max-height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)"></video>';
        
        // Load HLS.js if needed
        if (!window.Hls && !document.querySelector('script[src*="hls.js"]')) {
          var script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
          script.onload = function() {
            var video = document.getElementById(vidId);
            if (window.Hls && window.Hls.isSupported()) {
              var hls = new Hls();
              hls.loadSource(url);
              hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
            }
          };
          document.body.appendChild(script);
        } else if (window.Hls) {
          var video = document.getElementById(vidId);
          var hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(video);
        }
      } else {
        content.innerHTML = '<iframe src="' + escapeAttr(url) + '" allow="autoplay; fullscreen" style="width:100%; height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)"></iframe>';
      }
      
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      modal.style.display = 'flex';
      
      var closeBtn = modal.querySelector('.info-actions .param-btn');
      if (closeBtn && closeBtn.focus) closeBtn.focus({ preventScroll: true });
    }, 100); // Small delay
    
  } catch (err) {
    console.error('[openPreview error]', err);
  }
}
/* ================================
   PART 4/4 – SUPABASE AUTH + OWNER CRUD + DB
   ========================================= */
(function () {
  // CONFIG: soloina raha ilaina
  const SUPABASE_URL = "https://zogohkfzplcuonkkfoov.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw";
  const OWNER_EMAIL = "joroandriamanirisoa13@gmail.com";

// ✅ AJOUTEZ CETTE LIGNE: Rendre SUPABASE_ANON_KEY accessible globalement
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  let supabase = null;
  let authState = { user: null };
  let authSub = null;
// ✅ PATCH 6: Guard ensureSupabase
      async function ensureSupabase() {
        if (supabase) return supabase;
        
        const mod = await import("https://esm.sh/@supabase/supabase-js@2");
        
        if (window.__sb) {
          supabase = window.__sb;
          return supabase;
        }
        
        supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'mijoro-auth-v1',
          },
        });
        window.__sb = supabase;
        return supabase;
      }
// ---------- Utils (PATCH) ----------
function isOwner() {
  return !!authState.user &&
    String(authState.user.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase();
}
window.isOwner = isOwner;

function applyAuthUI() {
  try {
    const addBtn = document.getElementById('btnAddProduct');
    const addPhysicalBtn = document.getElementById('btnAddPhysical'); // ✅ NOUVEAU
    const loginBtn = document.getElementById('btnLogin');
    const logoutBtn = document.getElementById('btnLogout');
    const addSlideBtn = document.getElementById('btnAddSlide');
    
    if (addBtn) addBtn.style.display = isOwner() ? 'inline-flex' : 'none';
    if (addPhysicalBtn) addPhysicalBtn.style.display = isOwner() ? 'inline-flex' : 'none'; // ✅ NOUVEAU
    if (loginBtn) loginBtn.style.display = authState.user ? 'none' : 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = authState.user ? 'inline-flex' : 'none';
    if (addSlideBtn) addSlideBtn.style.display = isOwner() ? 'inline-flex' : 'none';
    
    document.body.classList.toggle('owner-mode', isOwner());
    
    const show = isOwner();
    document.querySelectorAll('.owner-tool').forEach((el) => {
      const def = el.dataset.display || 'inline-flex';
      el.style.display = show ? def : 'none';
    });
  } catch (e) {
    console.error('[applyAuthUI]', e);
  }
}


  window.applyAuthUI = applyAuthUI;

  async function ensureSupabase() {
    if (supabase) return supabase;
    
    // ✅ CORRECTION: Import Supabase client
    const mod = await import("https://esm.sh/@supabase/supabase-js@2");

    const g = window;
    if (g.__sb) {
      supabase = g.__sb;
      return supabase;
    }

    supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'mijoro-auth-v1',
      },
    });
    g.__sb = supabase;
    return supabase;
  }



  async function openOwnerLoginModal(){
    const m = ensureOwnerLoginModal();
    m.style.display = 'flex';
    m.setAttribute('aria-hidden','false');
    const emailEl = m.querySelector('#ol-email');
    const passEl = m.querySelector('#ol-pass');
    emailEl.value = OWNER_EMAIL;
    passEl.value = '';
    m.querySelector('#ol-submit').onclick = async () => {
      try{
        const sb = await ensureSupabase();
        const email = emailEl.value.trim();
        const password = passEl.value;
        if (!email || !password) return alert('Fenoy email sy mot de passe');
        if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
          return alert('Tsy Owner io email io.');
        }
        let { error } = await sb.auth.signInWithPassword({ email, password });
        if (error && /Invalid/i.test(error.message||'')) {
          // auto create, then login
          const { error: sErr } = await sb.auth.signUp({ email, password });
          if (sErr) return alert(sErr.message);
          const again = await sb.auth.signInWithPassword({ email, password });
          if (again.error) return alert(again.error.message);
        } else if (error) {
          return alert(error.message);
        }
        m.style.display='none'; m.setAttribute('aria-hidden','true');
        const { data: { session } } = await sb.auth.getSession();
        authState.user = session?.user || null;
        applyAuthUI();
        fetchSupabaseProducts().catch(console.error);
      }catch(e){ console.error('[openOwnerLoginModal]', e); alert('Erreur auth: ' + e.message); }
    };
  }

  async function initAuth() {
  try {
    const sb = await ensureSupabase();
    const { data: { session } } = await sb.auth.getSession();
    authState.user = session?.user || null;
    applyAuthUI();

    if (authSub && typeof authSub.unsubscribe === 'function') {
      authSub.unsubscribe();
    }
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session2) => {
      authState.user = session2?.user || null;
      applyAuthUI();
      fetchSupabaseProducts().catch(console.error);
    });
    authSub = subscription;
  } catch (e) {
    console.error('[initAuth]', e);
  }
}


  async function signOutOwner() {
    try {
      const sb = await ensureSupabase();
      await sb.auth.signOut();
      alert('Déconnecté.');
    } catch (e) { console.error('[signOutOwner]', e); }
  }

  /* ---------- Mapping DB -> UI ---------- */
  function mapRowToUI(r) {
    return {
      id: r.id,
      category: r.category || 'ebooks',
      title: r.title || 'Sans titre',
      description: r.subtitle || r.description || '',
      image: { 
        url: r.thumbnail_url || r.preview_url || (typeof FALLBACK_IMG !== 'undefined' ? FALLBACK_IMG : 'https://via.placeholder.com/600x400?text=Produit'), 
        alt: r.title || 'Produit' 
      },
      price: r.is_free ? 0 : (Number(r.price) || 0),
      currency: "AR",
      stock: "available",
      description_short: r.badge ? (r.badge + (Array.isArray(r.tags) && r.tags.length ? ' – ' + r.tags.join(', ') : '')) : '',
      preview_url: r.preview_url || null,
      _db: r
    };
  }

 /* ================================
   FETCH SUPABASE PRODUCTS (FIXED + DEBUG)
   ================================ */

async function fetchSupabaseProducts() {
  try {
    console.log('[fetchSupabaseProducts] 📡 Starting...');
    
    const sb = await ensureSupabase();
    
    let productsData;
    let error;
    
    if (window.MijoroAuth && window.MijoroAuth.isOwner) {
      // Owner voit TOUS les produits
      console.log('[fetchSupabaseProducts] Loading all products (Owner)');
      
      const result = await sb
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      productsData = result.data;
      error = result.error;
      
    } else if (window.MijoroAuth && window.MijoroAuth.isVendor) {
      // Vendeur voit SEULEMENT ses produits
      const ownerId = window.MijoroAuth.userAccount.id;
      console.log('[fetchSupabaseProducts] Loading vendor products:', ownerId);
      
      const result = await sb
        .from('products')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      
      productsData = result.data;
      error = result.error;
      
      // ✅ NOUVEAU: Afficher warning si aucun produit
      if (!error && (!productsData || productsData.length === 0)) {
        console.warn('[fetchSupabaseProducts] ⚠️ Vendor has no products');
      }
      
    } else {
      // Public: tous les produits actifs
      console.log('[fetchSupabaseProducts] Loading public products');
      
      const result = await sb
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      productsData = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error('[fetchSupabaseProducts] ❌ Error:', error);
      return;
    }
    
    if (!productsData || productsData.length === 0) {
      console.warn('[fetchSupabaseProducts] ⚠️ No products found');
      window.products = [];
      return;
    }
    
    console.log('[fetchSupabaseProducts] ✅ Products loaded:', productsData.length);
    
    // Map to UI format
    const converted = productsData.map(row => mapRowToUI(row));
    window.products = converted;
    
    if (typeof applyAuthUI === 'function') {
      applyAuthUI();
    }
    
  } catch (e) {
    console.error('[fetchSupabaseProducts] 💥 Fatal error:', e);
    window.products = [];
  }
}

  /* ---------- Upload helpers (image / video / pdf) ---------- */
  

  /* ---------- Modal UI Add/Edit + File picker ---------- */
 



/* ==========================================
   GALLERY IMAGES MANAGEMENT ✅ VAOVAO
   ========================================== */

function peSetGalleryFiles(files) {
  console.log('[Gallery] 📸 Adding', files.length, 'files');
  
  const modal = ensureProductModal();
  const preview = modal.querySelector('#pe-gallery-preview');
  
  if (!modal || !preview) {
    console.error('[Gallery] Modal elements not found');
    return;
  }
  
  // ✅ Limiter à 5 images total
  const remainingSlots = 5 - peLocal.galleryFiles.length;
  const filesToAdd = Array.from(files).slice(0, remainingSlots);
  
  if (filesToAdd.length < files.length) {
    alert(`⚠️ Maximum 5 images. ${files.length - filesToAdd.length} image(s) ignorée(s).`);
  }
  
  // ✅ Validate et ajouter
  filesToAdd.forEach(file => {
    if (!file.type.startsWith('image/')) {
      console.warn('[Gallery] Invalid file type:', file.type);
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB max
      alert(`⚠️ ${file.name} lehibe loatra (max 5MB)`);
      return;
    }
    
    const id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    peLocal.galleryFiles.push({ id, file });
  });
  
  console.log('[Gallery] ✅ Total images:', peLocal.galleryFiles.length);
  renderGalleryPreview();
}

function renderGalleryPreview() {
  const modal = document.getElementById('product-edit-modal');
  if (!modal) return;
  
  const preview = modal.querySelector('#pe-gallery-preview');
  if (!preview) return;
  
  if (peLocal.galleryFiles.length === 0) {
    preview.innerHTML = '<span style="opacity:.6;grid-column:1/-1;text-align:center;padding:20px">Aucune image</span>';
    return;
  }
  
  preview.innerHTML = peLocal.galleryFiles.map(item => {
    const url = URL.createObjectURL(item.file);
    return `
      <div class="gallery-item" data-id="${item.id}" style="position:relative;border-radius:8px;overflow:hidden">
        <img src="${url}" 
             style="width:100%;height:100px;object-fit:cover;display:block"
             alt="Gallery image">
        <button type="button" 
                class="gallery-remove" 
                data-id="${item.id}" 
                style="position:absolute;top:4px;right:4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  }).join('');
  
  // ✅ Wire remove buttons
  preview.querySelectorAll('.gallery-remove').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const id = this.getAttribute('data-id');
      console.log('[Gallery] Removing image:', id);
      
      peLocal.galleryFiles = peLocal.galleryFiles.filter(item => item.id !== id);
      renderGalleryPreview();
    });
  });
}

// ✅ Expose globalement
window.peSetGalleryFiles = peSetGalleryFiles;
window.renderGalleryPreview = renderGalleryPreview;

console.log('[Gallery] ✅ Functions registered');
  async function peUploadSelectedFiles() {
    const files = [];
    if (peLocal.imageFile) files.push(peLocal.imageFile);
    if (peLocal.previewFile) files.push(peLocal.previewFile);
    if (!files.length) return {};
    const uploaded = await uploadAssets(files);
    const img = uploaded.find(x => x.kind === 'image');
    const vid = uploaded.find(x => x.kind === 'video');
    const pdf = uploaded.find(x => x.kind === 'pdf');
    return {
      thumbnail_url: img?.url || null,
      preview_url: vid?.url || pdf?.url || null
    };
  }



 // ========================================
 // WIRE BUTTONS + INIT
 // ========================================
 
 document.addEventListener('DOMContentLoaded', function() {
 const login = document.getElementById('btnLogin');
 const logout = document.getElementById('btnLogout');
 const addBtn = document.getElementById('btnAddProduct');
 const addPhysicalBtn = document.getElementById('btnAddPhysical');
 
 if (login) login.addEventListener('click', openOwnerLoginModal);
 if (logout) logout.addEventListener('click', signOutOwner);
 if (addBtn) addBtn.addEventListener('click', addProductPrompt);
 if (addPhysicalBtn) addPhysicalBtn.addEventListener('click', addPhysicalProductPrompt);
 
 initAuth();
 fetchSupabaseProducts();
 });
 
 // Note: Les autres fonctions (uploadAssets, editProductPrompt, etc.) 
 // restent telles quelles dans votre code
 
 ;

  async function deleteProductConfirm(id) {
    if (!isOwner()) return alert('Owner ihany no afaka mamafa.');
    if (!confirm('Hofafana ve ity produit ity?')) return;
    try {
      const sb = await ensureSupabase();
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error) throw error;
      alert('Voafafa.');
      await fetchSupabaseProducts();
    } catch (e) { console.error('[deleteProductConfirm]', e); alert('Erreur suppression: ' + e.message); }
  }
  });

/* ================================
   UTILITIES + MISSING FUNCTIONS
   ========================================= */

// Utilities
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $all(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }
function debounce(fn, wait = 200) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ✅ CORRECTION: showProduct function (manquait) */
function showProduct(id) {
  try {
    const p = (window.products || []).find(x => x.id === id);
    if (!p) {
      console.warn('[showProduct] Product not found:', id);
      return;
    }
    // Ouvre le preview modal
    if (typeof openPreview === 'function') {
      openPreview(p);
    } else {
      // Fallback: affiche info basique
      alert(`Produit: ${p.title}\nPrix: ${typeof fmtPrice === 'function' ? fmtPrice(p.price) : p.price + ' AR'}`);
    }
  } catch (err) {
    console.error('[showProduct error]', err);
  }
}
window.showProduct = showProduct;

/* ✅ CORRECTION: closeShop function (manquait) */
function closeShop() {
  try {
    const popup = document.getElementById('shop-popup');
    if (!popup) return;
    popup.classList.remove('show');
    popup.setAttribute('aria-hidden', 'true');
    popup.style.pointerEvents = 'none';
  } catch (err) {
    console.error('[closeShop error]', err);
  }
}
window.closeShop = closeShop;

/* ✅ CORRECTION: openInfo / closeInfo functions (manquaient) */
function openInfo(type) {
  try {
    const modal = document.getElementById('info-modal');
    const title = document.getElementById('info-title');
    const content = document.getElementById('info-content');
    if (!modal || !content || !title) return;

    if (type === 'about') {
      title.textContent = 'À propos';
      content.innerHTML = `
        <div style="line-height:1.6">
          <p><strong>Mijoro Boutique</strong> – Plateforme de vente de produits numériques/physiques malagasy.</p>
          <p>Version: 1.0 Pro</p>
          <p>© 2025 Mijoro. Tous droits réservés.</p>
        </div>
      `;
    } else if (type === 'contact') {
      title.textContent = 'Contact';
      content.innerHTML = `
        <div style="line-height:1.6">
          <p><strong>WhatsApp:</strong> <a href="https://wa.me/261333106055" target="_blank" style="color:#25d366">+261 33 31 06 055</a></p>
          <p><strong>Email:</strong> joroandriamanirisoa13@gmail.com</p>
          <p>Mba mifandraisa aminay raha mila fanampiana!</p>
        </div>
      `;
    } else {
      title.textContent = 'Information';
      content.innerHTML = '<p>Aucune information disponible.</p>';
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    const closeBtn = modal.querySelector('.info-actions .param-btn');
    if (closeBtn && closeBtn.focus) closeBtn.focus({ preventScroll: true });
  } catch (err) {
    console.error('[openInfo error]', err);
  }
}
window.openInfo = openInfo;

function closeInfo() {
  try {
    const modal = document.getElementById('info-modal');
    if (!modal) return;
    
    // ✅ Stop all media FIRST
    const content = document.getElementById('info-content');
    if (content) {
      const videos = content.querySelectorAll('video');
      videos.forEach(v => {
        try {
          if (!v.paused) v.pause();
          v.removeAttribute('src');
          v.load();
        } catch (_) {}
      });
      
      // Remove all media elements
      content.querySelectorAll('embed, iframe, video, audio').forEach(el => {
        try {
          el.remove();
        } catch (_) {}
      });
      
      // Clear completely
      content.innerHTML = '';
    }
    
    // Hide modal
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    
  } catch (err) {
    console.error('[closeInfo error]', err);
  }
}
window.openQuitModal = openQuitModal;

function closeQuitModal() {
  try {
    const modal = document.getElementById('quit-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  } catch (err) {
    console.error('[closeQuitModal error]', err);
  }
}
window.closeQuitModal = closeQuitModal;

function quitApp() {
  try {
    // Tentative de fermeture (ne marche que si ouvert par script)
    if (window.close) {
      window.close();
    } else {
      alert('Tsy afaka mikatona automatique ny navigateur. Safidio "Fermer" manokana.');
    }
  } catch (err) {
    console.error('[quitApp error]', err);
    alert('Tsy afaka niala. Safidio ny Close tab/window amin\'ny navigateur.');
  }
}
window.quitApp = quitApp;

/* ================================
   SEARCH/FILTERS WIRING (safeguard)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Search
    const search = document.getElementById('search');
    const filters = document.getElementById('filters');
    const getActiveCategory = () => {
      const activeBtn = filters ? filters.querySelector('.filter-btn.active') : null;
      return activeBtn?.getAttribute('data-category') || activeBtn?.getAttribute('data-filter') || 'all';
    };

    // Wire search input (debounced)
    if (search) {
      const onSearch = debounce(() => {
        const term = search.value || '';
        const cat = getActiveCategory();
        if (typeof renderProducts === 'function') {
          renderProducts(cat, term);
        }
      }, 200);

      search.addEventListener('input', onSearch);
    }

    // Wire filters click -> set .active + render
    if (filters) {
      filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        const curr = filters.querySelector('.filter-btn.active');
        if (curr === btn) return;

        if (curr) curr.classList.remove('active');
        btn.classList.add('active');

        const term = search?.value || '';
        const cat = btn.getAttribute('data-category') || btn.getAttribute('data-filter') || 'all';
        if (typeof renderProducts === 'function') {
          renderProducts(cat, term);
        }
      });
    }
  } catch(err) {
    console.error('[Search/Filters wiring error]', err);
  }
});

/* ================================
   BOTTOM MENU SWIPE/HIDE LOGIC (refined)
   ========================================= */
(function() {
  const menu = document.querySelector('.bottom-menu');
  if (!menu) return;

  // Edge ho an'ny swipe-up rehefa miafina
  let edge = document.querySelector('.touch-edge-bottom');
  if (!edge) {
    edge = document.createElement('div');
    edge.className = 'touch-edge-bottom';
    edge.setAttribute('aria-hidden', 'true');
    document.body.appendChild(edge);
  }

  // Helpers
  function getVar(name) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return parseFloat(v) || 0;
  }
  function getTranslateY(el) {
    const tr = getComputedStyle(el).transform;
    if (!tr || tr === 'none') return 0;
    const m = new DOMMatrixReadOnly(tr);
    return m.m42 || 0;
  }
  function getHiddenTargetPx() {
    const edgeVisible = getVar('--edge-visible') || 18;
    const h = menu.getBoundingClientRect().height;
    return Math.max(0, h - edgeVisible);
  }
  function setTranslate(y) {
    menu.style.transform = `translateY(${y}px)`;
  }
  function forceReflow() { void menu.offsetHeight; }

  // Animate mankany amin'ny état kendrena, ary esory inline aorian'ny transition
  function animateToState(toHidden) {
    const onEnd = () => {
      menu.removeEventListener('transitionend', onEnd);
      // Fanadiovana: esory inline transform, avelao ny class no hifehy
      menu.style.transform = '';
    };

    // Atao aloha ny position ankehitriny ho inline, avy eo reflow
    const current = getTranslateY(menu);
    setTranslate(current);
    forceReflow();

    // Avy eo toggling class -> animates
    if (toHidden) menu.classList.add('is-hidden');
    else menu.classList.remove('is-hidden');

    // Rehefa vita ny transition, esory inline transform
    menu.addEventListener('transitionend', onEnd, { once: true });
  }

  // State drag
  let startY = 0;
  let startTranslate = 0;
  let dragging = false;
  let lastY = 0;
  let lastT = 0;

  const VEL_TRIGGER = 0.6; // px/ms
  const DIST_THRESH = 50;

  function onStart(clientY) {
    dragging = true;
    window.__skipHorizontalNav = true; // hisorohana conflit amin'ny swipe nav
    menu.classList.add('dragging');
    startTranslate = getTranslateY(menu);
    startY = clientY;
    lastY = clientY;
    lastT = performance.now();
  }

  function onMove(clientY) {
    if (!dragging) return;
    const dy = clientY - startY;
    const targetHidden = getHiddenTargetPx();

    // Mifehy range: 0 .. targetHidden
    let next = Math.max(0, Math.min(targetHidden, startTranslate + dy));
    setTranslate(next);

    lastY = clientY;
    lastT = performance.now();
  }

  function onEnd(clientY) {
    if (!dragging) return;
    dragging = false;
    menu.classList.remove('dragging');

    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    const vy = (clientY - lastY) / dt; // + midina (hide), - miakatra (show)
    const cur = getTranslateY(menu);
    const targetHidden = getHiddenTargetPx();

    let toHide;
    if (vy > VEL_TRIGGER) {
      toHide = true;
    } else if (vy < -VEL_TRIGGER) {
      toHide = false;
    } else {
      // Raha kely ny hetsika -> manatona ny état akaiky indrindra
      if (Math.abs(cur - startTranslate) < DIST_THRESH) {
        toHide = startTranslate > targetHidden / 2;
      } else {
        toHide = (cur / targetHidden) > 0.5;
      }
    }

    animateToState(toHide);

    // Avelao hiverina ny nav aorian'ny kely
    setTimeout(() => { window.__skipHorizontalNav = false; }, 100);
  }

  // Drag avy amin'ny menu
  menu.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    onStart(t.clientY);
  }, { passive: true });

  menu.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    e.preventDefault?.();
    onMove(t.clientY);
  }, { passive: false });

  menu.addEventListener('touchend', (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    onEnd(t.clientY);
  }, { passive: true });

  // Drag avy amin'ny edge rehefa miafina
  edge.addEventListener('touchstart', (e) => {
    if (!menu.classList.contains('is-hidden')) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    setTranslate(getHiddenTargetPx());
    onStart(t.clientY);
  }, { passive: true });

  edge.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    e.preventDefault?.();
    onMove(t.clientY);
  }, { passive: false });

  edge.addEventListener('touchend', (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    onEnd(t.clientY);
  }, { passive: true });
})();

/* ================================
   SHOP TOOLS TOGGLE (collapse/expand logic)
   ========================================= */
(() => {
  if (window.__shopToolsInit) return; // guard double init
  window.__shopToolsInit = true;

  const init = () => {
    const shopEl   = document.getElementById('shop');
    const toggleEl = document.getElementById('shopToolsToggle');
    const toolsEl  = document.getElementById('shop-tools');

    if (!shopEl || !toggleEl || !toolsEl) {
      console.warn('[ShopTools] missing elements:', { shopEl, toggleEl, toolsEl });
      return;
    }

    // Clickable
    toggleEl.style.pointerEvents = 'auto';

    // État initial: miafina
    let open = false;
    apply(open);

    // Toggle click
    toggleEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      open = !open;
      apply(open);
    }, { passive: true });

    // Recompute maxHeight rehefa resize
    window.addEventListener('resize', () => {
      if (open) toolsEl.style.maxHeight = toolsEl.scrollHeight + 'px';
    });

    function apply(isOpen) {
      shopEl.classList.toggle('tools-open', isOpen);
      toggleEl.setAttribute('aria-expanded', String(isOpen));

      toolsEl.style.transition = 'max-height .28s ease, opacity .18s ease, transform .28s ease';
      if (isOpen) {
        toolsEl.style.maxHeight = toolsEl.scrollHeight + 'px';
        toolsEl.style.opacity = '1';
        toolsEl.style.transform = 'translateY(0)';
        toolsEl.style.pointerEvents = 'auto';
      } else {
        toolsEl.style.maxHeight = '0px';
        toolsEl.style.opacity = '0';
        toolsEl.style.transform = 'translateY(-6px)';
        toolsEl.style.pointerEvents = 'none';
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ================================
   END OF PART 4/4
   ========================================= */
function normalizeCategory(c) {
  if (!c) return '';
  c = String(c).toLowerCase();
  if (['app', 'apps', 'jeu', 'jeux', 'game', 'games'].indexOf(c) !== -1) return 'apps';
  if (['ebook', 'ebooks', 'book', 'livre', 'livres'].indexOf(c) !== -1) return 'ebooks';
  if (['video', 'vidéo', 'videos', 'vidéos'].indexOf(c) !== -1) return 'videos';
  if (['promotion', 'promo'].indexOf(c) !== -1) return 'promo';
  if (['gratuit', 'gratuits', 'free'].indexOf(c) !== -1) return 'free';
  return c;
}

/* WHATSAPP HELPERS */
function openWhatsAppMessage(text) {
  try {
    var msg = encodeURIComponent(text || '');
    var wa = 'https://wa.me/' + WHATSAPP_PHONE_INTL + '?text=' + msg;
    window.open(wa, '_blank', 'noopener');
  } catch (err) {
    console.error('[WA Open Error]', err);
  }
}
function buildWAProductMessage(p, action) {
  action = action || 'buy';
  var title = (p && p.title) ? p.title : '';
  var cat = (p && p.category) ? p.category : '';
  var price = Number(p && p.price) || 0;
  var id = (p && p.id) ? p.id : '';
  var isFree = price === 0;
  var actionText = isFree ? 'Demande: Obtenir (gratuit)' : (action === 'read' ? 'Demande: Lire' : 'Demande: Acheter');
  
  // ✅ FORMAT TEXTE TSOTRA - TSY HTML
  var priceText = isFree ? 'Gratuit' : price.toLocaleString('fr-FR') + ' AR';
  
  var lines = [
    'Salama tompoko!' + actionText,
    '• Produit: ' + title,
    '• Catégorie: ' + cat,
    '• Prix: ' + priceText // ✅ TEXTE TSOTRA
  ];
  if (id) lines.push('• ID: ' + id);
  lines.push('Misaotra!');
  return lines.join('\n');
}
function buyOrRead(product) {
  if (!product) return;
  
  // ✅ Use CartAPI instead of addToCart
  if (typeof window.CartAPI !== 'undefined') {
    try {
      window.CartAPI.add(product);
      console.log('[Cart] Product added:', product.title);
    } catch (e) {
      console.warn('[Cart] Error:', e);
    }
  }
  
  // Open WhatsApp
  var isFree = Number(product.price) === 0;
  openWhatsAppMessage(buildWAProductMessage(product, isFree ? 'read' : 'buy'));
}
/* ================================
   LIKES SYSTEM - SUPABASE SYNC ✅
   PRODUCTION READY - Real-time
   ================================ */

(function() {
  'use strict';
  
  // ========================================
  // CONFIGURATION
  // ========================================
  
  const LIKE_KEY = 'likes:v2';
  const FINGERPRINT_KEY = 'user:fingerprint';
  const SYNC_INTERVAL = 30000; // 30 seconds
  const INIT_DELAY = 500;
  const MAX_RETRIES = 10;
  
  let likeState = {
    liked: new Set(),
    counts: new Map(),
    fingerprint: null,
    syncInProgress: false,
    initialized: false,
    supabaseReady: false
  };
  
  let initRetries = 0; // ✅ FIX #1: Déclarer la variable
  
  // ========================================
  // FINGERPRINT - Identification Unique
  // ========================================
  
  function generateFingerprint() {
    const nav = navigator;
    const screen = window.screen;
    
    const components = [
      nav.userAgent || '',
      nav.language || '',
      screen.colorDepth || 0,
      (screen.width || 0) + 'x' + (screen.height || 0),
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage
    ];
    
    const str = components.join('|');
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return 'fp_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
  }
  
  function getFingerprint() {
    if (likeState.fingerprint) return likeState.fingerprint;
    
    try {
      let fp = localStorage.getItem(FINGERPRINT_KEY);
      if (!fp) {
        fp = generateFingerprint();
        localStorage.setItem(FINGERPRINT_KEY, fp);
        console.log('[Likes] ✓ Generated fingerprint:', fp);
      }
      likeState.fingerprint = fp;
      return fp;
    } catch (e) {
      console.warn('[Likes] ⚠️ LocalStorage error');
      likeState.fingerprint = generateFingerprint();
      return likeState.fingerprint;
    }
  }
  
  // ========================================
  // LOCAL STORAGE (Cache)
  // ========================================
  
  function loadLocalLikes() {
    try {
      const raw = localStorage.getItem(LIKE_KEY);
      if (!raw) return false;
      
      const data = JSON.parse(raw);
      
      if (data.liked && Array.isArray(data.liked)) {
        likeState.liked = new Set(data.liked);
      }
      
      if (data.counts && typeof data.counts === 'object') {
        likeState.counts = new Map(Object.entries(data.counts));
      }
      
      console.log('[Likes] ✓ Loaded', likeState.liked.size, 'local likes');
      return true;
    } catch (e) {
      console.warn('[Likes] ⚠️ Error loading:', e);
      return false;
    }
  }
  
  function saveLocalLikes() {
    try {
      const data = {
        liked: Array.from(likeState.liked),
        counts: Object.fromEntries(likeState.counts)
      };
      localStorage.setItem(LIKE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('[Likes] ⚠️ Error saving:', e);
      return false;
    }
  }
  
  // ========================================
  // SUPABASE SYNC
  // ========================================
  
  async function ensureSupabaseReady() {
    if (likeState.supabaseReady) {
      return window.__sb;
    }
    
    if (typeof window.ensureSupabase !== 'function') {
      throw new Error('ensureSupabase not available');
    }
    
    const sb = await window.ensureSupabase();
    if (!sb) {
      throw new Error('Supabase client is null');
    }
    
    likeState.supabaseReady = true;
    return sb;
  }
  
  async function syncLikesFromSupabase() {
    if (likeState.syncInProgress) {
      console.log('[Likes] ⏭️ Sync in progress, skipping...');
      return;
    }
    
    likeState.syncInProgress = true;
    
    try {
      const sb = await ensureSupabaseReady();
      const fingerprint = getFingerprint();
      
      console.log('[Likes] 📡 Syncing from Supabase...');
      
      // ========================================
      // 1. Récupérer les likes de cet utilisateur
      // ========================================
      
      const { data: userLikes, error: userError } = await sb
        .from('product_likes')
        .select('product_id')
        .eq('user_fingerprint', fingerprint);
      
      if (userError) throw userError;
      
      const serverLikedIds = new Set((userLikes || []).map(l => l.product_id));
      likeState.liked = serverLikedIds;
      saveLocalLikes();
      
      console.log('[Likes] ✓ Synced', serverLikedIds.size, 'user likes');
      
      // ========================================
      // 2. Récupérer TOUS les compteurs
      // ========================================
      
      const { data: allLikes, error: countError } = await sb
        .from('product_likes')
        .select('product_id');
      
      if (countError) throw countError;
      
      const counts = new Map();
      (allLikes || []).forEach(like => {
        const id = like.product_id;
        counts.set(id, (counts.get(id) || 0) + 1);
      });
      
      likeState.counts = counts;
      saveLocalLikes();
      
      console.log('[Likes] ✓ Loaded', counts.size, 'product counters');
      
      // ========================================
      // 3. Mettre à jour l'UI
      // ========================================
      
      updateAllLikeButtons();
      console.log('[Likes] ✅ Sync complete');
      
    } catch (e) {
      console.error('[Likes] ❌ Sync error:', e);
      console.log('[Likes] 🔄 Using cached data');
    } finally {
      likeState.syncInProgress = false;
    }
  }
  
  async function addLikeToSupabase(productId) {
    try {
      const sb = await ensureSupabaseReady();
      const fingerprint = getFingerprint();
      
      console.log('[Likes] 📤 Adding like:', productId);
      
      const { error } = await sb
        .from('product_likes')
        .insert({
          product_id: productId,
          user_fingerprint: fingerprint
        });
      
      if (error) {
        // Code 23505 = duplicate key (déjà liké)
        if (error.code === '23505') {
          console.log('[Likes] ℹ️ Already liked (duplicate)');
          return true;
        }
        throw error;
      }
      
      console.log('[Likes] ✅ Like added to server');
      return true;
      
    } catch (e) {
      console.error('[Likes] ❌ Error adding like:', e);
      throw e;
    }
  }
  
  async function removeLikeFromSupabase(productId) {
    try {
      const sb = await ensureSupabaseReady();
      const fingerprint = getFingerprint();
      
      console.log('[Likes] 📤 Removing like:', productId);
      
      const { error } = await sb
        .from('product_likes')
        .delete()
        .eq('product_id', productId)
        .eq('user_fingerprint', fingerprint);
      
      if (error) throw error;
      
      console.log('[Likes] ✅ Like removed from server');
      return true;
      
    } catch (e) {
      console.error('[Likes] ❌ Error removing like:', e);
      throw e;
    }
  }
  
  // ========================================
  // PUBLIC API
  // ========================================
  
  function isLiked(productId) {
    if (!productId) return false;
    return likeState.liked.has(productId);
  }
  
  function getLikeCount(productId) {
    if (!productId) return 0;
    return likeState.counts.get(productId) || 0;
  }
  
  async function toggleLike(productId) {
    if (!productId) {
      console.warn('[Likes] ⚠️ No productId');
      return;
    }
    
    const wasLiked = isLiked(productId);
    const currentCount = getLikeCount(productId);
    
    console.log('[Likes] 🔄 Toggle:', productId, wasLiked ? 'UNLIKE' : 'LIKE');
    
    // ========================================
    // 1. OPTIMISTIC UPDATE (UI instantanée)
    // ========================================
    
    if (wasLiked) {
      likeState.liked.delete(productId);
      likeState.counts.set(productId, Math.max(0, currentCount - 1));
    } else {
      likeState.liked.add(productId);
      likeState.counts.set(productId, currentCount + 1);
    }
    
    saveLocalLikes();
    updateLikeButton(productId);
    
    // Haptic feedback
    if (navigator.vibrate && !wasLiked) {
      navigator.vibrate(50);
    }
    
    // ========================================
    // 2. SYNC AVEC SUPABASE
    // ========================================
    
    try {
      if (wasLiked) {
        await removeLikeFromSupabase(productId);
      } else {
        await addLikeToSupabase(productId);
      }
      
      // Re-sync pour compteurs exacts
      await syncLikesFromSupabase();
      
      console.log('[Likes] ✅ Toggle complete');
      
    } catch (e) {
      console.error('[Likes] ❌ Sync failed:', e);
      
      // ========================================
      // 3. ROLLBACK en cas d'erreur
      // ========================================
      
      if (wasLiked) {
        likeState.liked.add(productId);
        likeState.counts.set(productId, currentCount);
      } else {
        likeState.liked.delete(productId);
        likeState.counts.set(productId, Math.max(0, currentCount - 1));
      }
      
      saveLocalLikes();
      updateLikeButton(productId);
      
      // Afficher erreur utilisateur
      showLikeError(e);
    }
  }
  
  // ========================================
  // UI UPDATE
  // ========================================
  
  function updateLikeButton(productId) {
    if (!productId) return;
    
    const liked = isLiked(productId);
    const count = getLikeCount(productId);
    
    const selector = '[data-product-id="' + CSS.escape(productId) + '"]';
    const buttons = document.querySelectorAll(selector);
    
    if (buttons.length === 0) return;
    
    buttons.forEach(function(btn) {
      btn.classList.toggle('liked', liked);
      btn.setAttribute('aria-pressed', String(liked));
      btn.setAttribute('title', liked ? 'Unlike' : 'Like');
      
      btn.classList.remove('burst');
      void btn.offsetWidth;
      btn.classList.add('burst');
      
      const wrapper = btn.closest('.like-wrapper');
      if (wrapper) {
        const counter = wrapper.querySelector('.like-count');
        if (counter) {
          counter.textContent = String(count);
          counter.setAttribute('aria-label', count + ' likes');
        }
      }
    });
  }
  
  function updateAllLikeButtons() {
    const allButtons = document.querySelectorAll('[data-product-id]');
    const productIds = new Set();
    
    allButtons.forEach(function(btn) {
      const id = btn.getAttribute('data-product-id');
      if (id) productIds.add(id);
    });
    
    productIds.forEach(function(id) {
      updateLikeButton(id);
    });
    
    console.log('[Likes] ✓ Updated', productIds.size, 'products');
  }
  
  function showLikeError(error) {
    const toast = document.createElement('div');
    
    // Message selon le type d'erreur
    let message = '❌ Erreur de synchronisation';
    
    if (error.message.includes('Failed to fetch')) {
      message = '❌ Pas de connexion internet';
    } else if (error.code === '23505') {
      message = 'ℹ️ Déjà dans votre liste';
    } else if (error.message.includes('not found')) {
      message = '❌ Table likes introuvable';
    }
    
    toast.textContent = message;
    toast.className = 'like-toast';
    toast.style.cssText = 
      'position:fixed;' +
      'bottom:100px;' +
      'left:50%;' +
      'transform:translateX(-50%);' +
      'background:#ef4444;' +
      'color:#fff;' +
      'padding:12px 24px;' +
      'border-radius:999px;' +
      'font-weight:700;' +
      'font-size:14px;' +
      'z-index:9999;' +
      'animation:fadeInUp 0.3s ease;' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.4);';
    
    document.body.appendChild(toast);
    
    setTimeout(function() {
      toast.style.animation = 'fadeOutDown 0.3s ease';
      setTimeout(function() {
        toast.remove();
      }, 300);
    }, 3000);
  }
  
  // ========================================
  // INITIALIZATION
  // ========================================
  
  function init() {
    console.log('[Likes] 🚀 Initializing...');
    
    if (likeState.initialized) {
      console.warn('[Likes] ⚠️ Already initialized');
      return;
    }
    
    loadLocalLikes();
    getFingerprint();
    updateAllLikeButtons();
    
    // Initial sync
    syncLikesFromSupabase();
    
    // Auto-sync every 30s
    setInterval(function() {
      console.log('[Likes] 🔄 Auto-sync');
      syncLikesFromSupabase();
    }, SYNC_INTERVAL);
    
    likeState.initialized = true;
    console.log('[Likes] ✅ Initialized (Supabase sync enabled)');
  }
  
  function attemptInit() {
    initRetries++;
    
    console.log('[Likes] 🔍 Attempt', initRetries, '/', MAX_RETRIES);
    
    if (typeof window.ensureSupabase !== 'function') {
      if (initRetries < MAX_RETRIES) {
        console.log('[Likes] ⏳ Waiting for ensureSupabase...');
        setTimeout(attemptInit, 500);
      } else {
        console.error('[Likes] ❌ Supabase not available');
        console.log('[Likes] 🔄 Initializing with localStorage only');
        loadLocalLikes();
        getFingerprint();
        updateAllLikeButtons();
        likeState.initialized = true;
      }
      return;
    }
    
    console.log('[Likes] ✓ Supabase ready');
    init();
  }
  
  // ========================================
  // EXPOSE GLOBAL API
  // ========================================
  
  window.isLiked = isLiked;
  window.getLikeCount = getLikeCount;
  window.toggleLike = toggleLike;
  window.syncLikesFromSupabase = syncLikesFromSupabase;
  window.updateAllLikeButtons = updateAllLikeButtons;
  
  // ========================================
  // AUTO-INIT
  // ========================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(attemptInit, INIT_DELAY);
    });
  } else {
    setTimeout(attemptInit, INIT_DELAY);
  }
  
  console.log('[Likes] 📦 Module loaded (Supabase sync)');
  
})();
/* ================================
   RENDER PRODUCTS (FIXED LIKE BUTTON)
   ================================ */

function makeLike(p) {
  var liked = isLiked(p.id);
  var likeCnt = getLikeCount(p.id);
  
  return '<div style="display:flex; align-items:center; gap:6px;">' +
    '<button type="button" class="icon-like ' + (liked ? 'liked' : '') + '" ' +
    'data-product-id="' + escapeAttr(p.id) + '" ' +
    'title="Like" aria-label="Like">' +
    '<i class="fa-solid fa-heart"></i>' +
    '</button>' +
    '<span class="like-count">' + String(likeCnt) + '</span>' +
    '</div>';
}

/* ================================
   EVENT DELEGATION (FIXED)
   ================================ */

document.addEventListener('DOMContentLoaded', function() {
  try {
    function delegateCardActions(e) {
      var tgt = e.target;
      var card = tgt.closest?.('.product-card');
      if (!card) return;
      
      var id = card.getAttribute('data-id');
      var p = products.find(x => x.id === id);
      if (!p) return;
      
      // ✅ FIXED: Check for like button click
      var likeBtn = tgt.closest('.icon-like');
      if (likeBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleLike(id);
        return;
      }
      
      if (tgt.closest('.icon-info')) { showProduct?.(id); return; }
      if (tgt.closest('.icon-buy')) { buyOrRead?.(p); return; }
      if (tgt.closest('[data-action="read"]')) {
        if (p.preview_url || p._db?.preview_url) openPreview(p);
        else openWhatsAppMessage(buildWAProductMessage(p, 'read'));
        return;
      }
    }
    
    [document.getElementById('products-row'), document.getElementById('products-box')].forEach(c => {
      if (c) c.addEventListener('click', delegateCardActions);
    });
    
  } catch (err) {
    console.error('[Optimized Actions error]', err);
  }
});
/* BADGES helpers */
function badgeClassFor(cat) {
  var c = (cat || '').toLowerCase();
  if (c === 'vip') return 'badge badge-vip';
  if (c === 'promo' || c === 'promotion') return 'badge badge-promo';
  if (c === 'free' || c === 'gratuit' || c === 'gratuits') return 'badge badge-free';
  if (c === 'videos' || c === 'vidéos') return 'badge badge-videos';
  if (c === 'ebooks') return 'badge badge-ebooks';
  return 'badge';
}
function badgeIconFor(cat) {
  var c = (cat || '').toLowerCase();
  if (c === 'vip') return '<i class="fa-solid fa-crown" style="transform:rotateY(20deg)"></i>';
  if (c === 'promo' || c === 'promotion') return '<i class="fa-solid fa-bolt"></i>';
  if (c === 'free' || c === 'gratuit' || c === 'gratuits') return '<i class="fa-solid fa-gift"></i>';
  if (c === 'videos' || c === 'vidéos') return '<i class="fa-solid fa-circle-play"></i>'; // Play circle tsara kokoa
  if (c === 'ebooks') return '<i class="fa-solid fa-book-open"></i>';
  return '<i class="fa-solid fa-sparkles"></i>'; // Default sparkles
}

/* LANG / THEME (apply/select) */
var THEME_KEY = 'settings:theme';
var LANG_KEY = 'settings:lang';



function applyTheme(theme) {
  try {
    var allowed = ['dark', 'light', 'rose', 'jaune', 'marron'];
    var t = (allowed.indexOf(theme) !== -1) ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var cls = ['theme-dark', 'theme-light', 'theme-rose', 'theme-jaune', 'theme-marron'];
    for (var i = 0; i < cls.length; i++) { document.body.classList.remove(cls[i]); }
    document.body.classList.add('theme-' + t);
    var btns = document.querySelectorAll('#theme-options .option-card');
    for (var j = 0; j < btns.length; j++) {
      var b = btns[j];
      var val = b.getAttribute('data-theme');
      b.classList.toggle('active', val === t);
    }
  } catch (err) {
    console.error('[applyTheme error]', err);
  }
}
function selectTheme(theme) {
  try {
    var allowed = ['dark', 'light', 'rose', 'jaune', 'marron'];
    var t = (allowed.indexOf(theme) !== -1) ? theme : 'dark';
    try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
    applyTheme(t);
  } catch (err) {
    console.error('[selectTheme error]', err);
  }
}

function applyLang(lang) {
  try {
    var l = (['mg', 'fr', 'en'].indexOf(lang) !== -1) ? lang : 'fr';
    document.documentElement.lang = l;
    var btns = document.querySelectorAll('#lang-options .option-card');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var val = b.getAttribute('data-lang');
      b.classList.toggle('active', val === l);
    }
    localizePage(l);
  } catch (err) {
    console.error('[applyLang error]', err);
  }
}
function selectLang(lang) {
  try {
    var l = (['mg', 'fr', 'en'].indexOf(lang) !== -1) ? lang : 'fr';
    try { localStorage.setItem(LANG_KEY, l); } catch (_) {}
    applyLang(l);
  } catch (err) {
    console.error('[selectLang error]', err);
  }
}

// Init theme/lang at startup
document.addEventListener('DOMContentLoaded', function () {
  try {
    var theme = 'dark';
    try { var t = localStorage.getItem(THEME_KEY); if (t) theme = t; } catch (_) {}
    applyTheme(theme);

    var lang = 'fr';
    try { var l = localStorage.getItem(LANG_KEY); if (l) lang = l; } catch (_) {}
    applyLang(lang);
  } catch (err) {
    console.error('[settings init error]', err);
  }
});

/* ================================
   PART 2/4 — PRODUCTS + OPTIMIZED ACTIONS/FILTERS
   ========================================= */

/* Données Produits (fallback raha tsy misy window.products) */
var products = (window.products && Array.isArray(window.products))
  ? window.products
  : [
      {
        id: "ebook-01",
        category: "ebooks",
        title: "Business en ligne avec ton téléphone",
        description: "Transforme ton téléphone en source de revenus.",
        image: { url: "https://i.ibb.co/svLgxhnZ/Design-sans-titre-20251016-153559-0000.png", alt: "Ebook business" },
        price: 20000, currency: "AR", stock: "available",
        description_short: "Guide pratique pour démarrer."
      },
      {
        id: "vip-01",
        category: "vip",
        title: "Création site e-commerce (VIP)",
        description: "Formation VIP complète.",
        image: { url: "https://i.ibb.co/2q0mZsR/placeholder-vip1.png", alt: "VIP e-commerce" },
        price: 200000, currency: "AR", stock: "available",
        description_short: "Site e-commerce + boutique."
      },
      {
        id: "promo-01",
        category: "promo",
        title: "Marketing digital (bases)",
        description: "Formation de base marketing digital.",
        image: { url: "https://i.ibb.co/7GZq4V7/placeholder-promo.png", alt: "Promo marketing" },
        price: 60000, currency: "AR", stock: "available",
        description_short: "Bases essentielles."
      },
      {
        id: "free-01",
        category: "free",
        title: "Apprendre l'anglais en 2 mois",
        description: "Méthode adaptée pour progresser vite.",
        image: { url: "https://i.ibb.co/k669NxLG/placeholder-english.jpg", alt: "Ebook anglais" },
        price: 0, currency: "AR", stock: "available",
        description_short: "Guide gratuit."
      }
    ];

var FALLBACK_IMG = 'https://via.placeholder.com/600x400?text=Produit';

/* Renderer principal (vertical cards) */
function renderProducts(filter, search) {
  try {
    var row = document.getElementById('products-row');
    var box = document.getElementById('products-box');

    var normalizedFilter = normalizeCategory(filter || 'all');
    var q = (search || '').toLowerCase();

    var filtered = (products || []).filter(function (prod) {
      var cat = normalizeCategory(prod.category);
      var catOk = (normalizedFilter === 'all') || (cat === normalizedFilter);
      var text = ((prod.title || '') + ' ' + (prod.description_short || '') + ' ' + (prod.description || '')).toLowerCase();
      var searchOk = !q || text.indexOf(q) !== -1;
      return catOk && searchOk;
    });

    function makeActions(p) {
  var isFree = Number(p.price) === 0;
  var hasPreview = !!(p.preview_url || (p._db && p._db.preview_url));
  
  var html = '<div class="card-actions">';
  
  // Info button
  html += '<button type="button" class="icon-btn icon-info" title="Détails">' +
    '<i class="fa-solid fa-info"></i></button>';
  
  // Play/Read button (gratuit avec preview)
  if (isFree && hasPreview) {
    html += '<button type="button" class="icon-btn icon-read" data-action="read" title="Voir le contenu">' +
      '<i class="fa-solid fa-circle-play"></i></button>';
  }
  
  // Buy/Get button
  html += '<button type="button" class="icon-btn icon-buy" title="' +
    (isFree ? 'Obtenir (WhatsApp)' : 'Acheter (WhatsApp)') + '">' +
    '<i class="fa-brands fa-whatsapp"></i></button>';
  
  // Owner tools
  html += '<button type="button" class="icon-btn owner-tool" data-tool="edit" title="Edit">' +
    '<i class="fa-solid fa-pen"></i></button>';
  html += '<button type="button" class="icon-btn owner-tool" data-tool="delete" title="Delete">' +
    '<i class="fa-solid fa-trash"></i></button>';
  
  html += '</div>';
  return html;
}

    function makeLike(p) {
  var liked = isLiked(p.id);
  var likeCnt = getLikeCount(p.id);
  
  return '<div class="like-wrapper">' +
    '  <button type="button" ' +
    '    class="icon-like ' + (liked ? 'liked' : '') + '" ' +
    '    data-product-id="' + escapeAttr(p.id) + '" ' +
    '    title="' + (liked ? 'Unlike' : 'Like') + '" ' +
    '    aria-label="' + (liked ? 'Unlike' : 'Like') + '" ' +
    '    aria-pressed="' + (liked ? 'true' : 'false') + '">' +
    '    <i class="fa-solid fa-heart"></i>' +
    '  </button>' +
    '  <span class="like-count">' + String(likeCnt) + '</span>' +
    '</div>';
}

    function makeBadge(p) {
  var cat = normalizeCategory(p.category);
  var customBadge = p._db?.badge || p.badge;
  
  var badgeClass = '';
  var icon = '';
  var ariaLabel = '';
  
  // ✅ Priorité 1: Badge manokana (Hot, New, Limited, etc.)
  if (customBadge) {
    var lower = customBadge.toLowerCase();
    badgeClass = badgeClassFor(lower);
    icon = badgeIconFor(lower);
    ariaLabel = customBadge;
  } 
  // ✅ Priorité 2: Category badge (VIP, Promo, Free, etc.)
  else if (cat && cat !== 'all' && cat !== '') {
    badgeClass = badgeClassFor(cat);
    icon = badgeIconFor(cat);
    
    switch(cat) {
      case 'vip': ariaLabel = 'VIP'; break;
      case 'promo': ariaLabel = 'Promotion'; break;
      case 'free': ariaLabel = 'Gratuit'; break;
      case 'videos': ariaLabel = 'Vidéo'; break;
      case 'ebooks': ariaLabel = 'eBook'; break;
      case 'apps': ariaLabel = 'App'; break;
      default: ariaLabel = cat;
    }
  }
  // ✅ Priorité 3: Tsy misy badge → empty string
  else {
    return '';
  }
  // ✅ VERSION 2D: Icon only, no text
  return '<div class="badge-corner ' + badgeClass + '" ' +
         'role="status" ' +
         'aria-label="' + escapeAttr(ariaLabel) + '" ' +
         'title="' + escapeAttr(ariaLabel) + '">' +
         icon +
         '</div>';
}
/* ==========================================
   IMAGE LAZY LOADING - Progressive blur-up
   ========================================== */

function createProgressiveImage(src, alt, className = '') {
  const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3E%3Cfilter id="b"%3E%3CfeGaussianBlur stdDeviation="1"/%3E%3C/filter%3E%3Crect width="10" height="10" fill="%23334155" filter="url(%23b)"/%3E%3C/svg%3E';
  
  return `
    <img 
      src="${placeholder}" 
      data-src="${escapeAttr(src)}" 
      alt="${escapeAttr(alt)}" 
      class="${className} lazy-img blur"
      loading="lazy"
      decoding="async"
      onerror="this.src='https://via.placeholder.com/600x400/1e293b/4ade80?text=Image'"
    >
  `;
}

window.imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      const realSrc = img.getAttribute('data-src');
      
      if (realSrc) {
        img.src = realSrc;
        img.onload = () => {
          img.classList.remove('blur');
          img.classList.add('loaded');
        };
        img.removeAttribute('data-src');
      }
      
      imageObserver.unobserve(img);
    }
  });
}, {
  rootMargin: '50px'
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const lazyImages = document.querySelectorAll('.lazy-img');
    lazyImages.forEach(img => imageObserver.observe(img));
  }, 500);
});
    function makeCard(p, compact) {
  // Mitady image URL amin'ny priorité order:
  // 1. p.image.url (UI structure)
  // 2. p.thumbnail_url (direct DB field)
  // 3. p._db.thumbnail_url (nested DB structure)
  // 4. FALLBACK_IMG
  
  var imgUrl = FALLBACK_IMG;
  
  if (p.image && p.image.url) {
    imgUrl = p.image.url;
  } else if (p.thumbnail_url) {
    imgUrl = p.thumbnail_url;
  } else if (p._db && p._db.thumbnail_url) {
    imgUrl = p._db.thumbnail_url;
  }
  
  imgUrl = escapeAttr(imgUrl);

  var imgAlt = escapeAttr((p.image && p.image.alt) ? p.image.alt : (p.title || 'Produit'));
  var priceStr = fmtPrice(p.price);
  var badgeHTML = makeBadge(p);
  var actions = makeActions(p);
  var titleSafe = escapeHtml(p.title || 'Produit');
  
  var category = normalizeCategory(p.category || '');
  var showLike = (category === 'videos' || category === 'free' || category === 'gratuit');
  var likeBtn = showLike ? makeLike(p) : '';
  
// ✅ VAOVAO: Gallery indicator
var galleryIndicator = '';
if (p.galleryCount && p.galleryCount > 0) {
  galleryIndicator =
    '<div class="gallery-indicator" ' +
    'title="' + p.galleryCount + ' image(s) dans la galerie" ' +
    'style="position:absolute;bottom:8px;right:8px;' +
    'background:rgba(59,130,246,.95);color:#fff;' +
    'padding:6px 10px;border-radius:20px;font-size:11px;' +
    'font-weight:700;backdrop-filter:blur(8px);' +
    'border:2px solid rgba(255,255,255,.3);' +
    'box-shadow:0 4px 12px rgba(0,0,0,.3);' +
    'display:flex;align-items:center;gap:4px;z-index:10;' +
    'animation:galleryPulse 2s ease-in-out infinite">' +
    '<i class="fa-solid fa-images" style="font-size:12px"></i>' +
    '<span>' + p.galleryCount + '</span>' +
    '</div>';
}

// ✅ Return ny HTML - TOERANA MARINA
return '<div class="card-header">' +
  badgeHTML +
  likeBtn +
  '</div>' +
  '<div style="position:relative">' +
  createProgressiveImage(imgUrl, imgAlt, 'product-image') +
  galleryIndicator + // ← ITO NO TOERANA MARINA
  '</div>' +
  '<div class="card-body">' +
  '<h3>' + titleSafe + '</h3>' +
  '<div class="card-footer">' +
  '<div class="price-wrapper">' + priceStr + '</div>' +
  actions +
  '</div>' +
  '</div>';
}
    if (row) {
      row.innerHTML = '';
      if (filtered.length === 0) row.innerHTML = '<div style="color:#ddd;padding:12px" data-i18n="shop_no_products">Aucun produit trouvé.</div>';
      else {
        var frag = document.createDocumentFragment();
        filtered.forEach(function(p){
          var card = document.createElement('article');
          card.className = 'product-card';
          card.setAttribute('data-id', p.id);
          card.setAttribute('data-category', normalizeCategory(p.category || ''));
          card.setAttribute('role', 'listitem');
          card.innerHTML = makeCard(p, false);
          frag.appendChild(card);
        });
        row.appendChild(frag);
      }
    }

    if (box) {
      box.innerHTML = '';
      if (filtered.length === 0) box.innerHTML = '<div style="color:#ddd;padding:12px" data-i18n="shop_no_products">Aucun produit trouvé.</div>';
      else {
        var grid = document.createElement('div');
        grid.className = 'products-grid';
        var frag2 = document.createDocumentFragment();
        filtered.forEach(function(p){
          var node = document.createElement('div');
          node.className = 'product-card';
          node.setAttribute('data-id', p.id);
          node.setAttribute('data-category', normalizeCategory(p.category || ''));
          node.innerHTML = makeCard(p, true);
          frag2.appendChild(node);
        });
        grid.appendChild(frag2);
        box.appendChild(grid);
      }
    }

    if (typeof applyAuthUI === 'function') applyAuthUI();

  } catch(err){ console.error('[renderProducts error]', err); }
};

/* ================================
   Optimized delegated actions
   ================================ */
document.addEventListener('DOMContentLoaded', function(){
  try {
    function delegateCardActions(e){
      var tgt = e.target;
      var card = tgt.closest?.('.product-card');
      if (!card) return;
      var id = card.getAttribute('data-id');
      var p = products.find(x => x.id === id);
      if (!p) return;

      if (tgt.closest('.icon-info')) { showProduct?.(id); return; }
      if (tgt.closest('.icon-buy')) { buyOrRead?.(p); return; }
      if (tgt.closest('[data-action="read"]')) {
        if (p.preview_url || p._db?.preview_url) openPreview(p);
        else openWhatsAppMessage(buildWAProductMessage(p, 'read'));
        return;
      }
    
    }

    [document.getElementById('products-row'), document.getElementById('products-box')].forEach(c => {
      if (c) c.addEventListener('click', delegateCardActions);
    });

    /* Filters toolbar */
    document.getElementById('shop-filters')?.addEventListener('click', function(e){
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      this.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b===btn));
      renderProducts(btn.getAttribute('data-filter') || 'all', document.getElementById('search')?.value || '');
    });

    /* Popup filters */
    document.getElementById('filters')?.addEventListener('click', function(e){
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      this.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b===btn));
      renderProducts(btn.getAttribute('data-category') || 'all', document.getElementById('search')?.value || '');
    });

    /* Search input */
    var search = document.getElementById('search');
    if (search){
      var t=null;
      search.addEventListener('input', function(){
        if(t) clearTimeout(t);
        t = setTimeout(()=> {
          var activeBtn = document.querySelector('#filters .filter-btn.active');
          renderProducts(activeBtn?.getAttribute('data-category') || 'all', search.value || '');
        }, 200);
      });
    }

  } catch(err){ console.error('[Optimized Actions error]', err); }
});/* ================================
   PART 3/4 — CART, SLIDESHOW, NAV, MODALS
   ========================================= */

/* PANIER (persistant) + Drawer + Checkout WhatsApp */
var CART_KEY = 'cart:v1';
var cartItems = new Map();

function loadCartFromStorage() {
  try {
    var raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.warn('[Cart load error]', err);
    return [];
  }
}
function saveCartToStorage(itemsArr) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(itemsArr));
  } catch (err) {
    console.warn('[Cart save error]', err);
  }
}
function cartMapToArray() {
  var out = [];
  cartItems.forEach(function (item) { out.push(item); });
  return out;
}
function cartArrayToMap(arr) {
  cartItems.clear();
  for (var i = 0; i < arr.length; i++) {
    var it = arr[i];
    if (!it || !it.id) continue;
    cartItems.set(it.id, {
      id: it.id,
      title: it.title || 'Produit',
      price: Number(it.price) || 0,
      qty: Math.max(1, Number(it.qty) || 1),
      image: it.image || ''
    });
  }
}
function addToCart(p) {
  try {
    if (!p || !p.id) return;
    var cur = cartItems.get(p.id);
    if (cur) cur.qty += 1;
    else cartItems.set(p.id, {
      id: p.id,
      title: p.title || 'Produit',
      price: Number(p.price) || 0,
      qty: 1,
      image: (p.image && p.image.url) ? p.image.url : ''
    });
    updateCartUI();
    var shopBtn = document.querySelector('.menu-shop');
    if (shopBtn) {
      shopBtn.classList.add('pulse');
      setTimeout(function () { shopBtn.classList.remove('pulse'); }, 450);
    }
  } catch (err) {
    console.error('[addToCart error]', err);
  }
}
function removeFromCart(id) {
  try { cartItems.delete(id); updateCartUI(); }
  catch (err) { console.error('[removeFromCart error]', err); }
}
function changeQty(id, delta) {
  try {
    var item = cartItems.get(id);
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) cartItems.delete(id);
    updateCartUI();
  } catch (err) {
    console.error('[changeQty error]', err);
  }
}
function clearCart() {
  try {
    cartItems.clear();
    
    // ✅ FIX: Utilise l'API Cart Drawer au lieu de updateCartUI()
    if (typeof window.CartAPI !== 'undefined') {
      window.CartAPI.clear();
    }
    
    saveCartToStorage([]); // Persist empty cart
  }
  catch (err) { console.error('[clearCart error]', err); }
}


(function initCartDrawer() {
  try {
    var toggle = document.getElementById('cart-toggle');
    var drawer = document.getElementById('cart-drawer');
    if (toggle && drawer) {
      toggle.addEventListener('click', function () {
        var show = !drawer.classList.contains('show');
        drawer.classList.toggle('show', show);
        drawer.setAttribute('aria-hidden', show ? 'false' : 'true');
      });
      drawer.addEventListener('click', function (e) {
        var item = e.target && e.target.closest ? e.target.closest('.cart-item') : null;
        if (!item) return;
        var id = item.getAttribute('data-id');
        var btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
        if (!btn) return;
        var act = btn.getAttribute('data-action');
        if (act === 'inc') changeQty(id, +1);
        else if (act === 'dec') changeQty(id, -1);
        else if (act === 'remove') removeFromCart(id);
      });
    }
  } catch (err) {
    console.error('[initCartDrawer error]', err);
  }
})();
document.addEventListener('DOMContentLoaded', function() {
  try {
    // ✅ Le cart drawer gère maintenant son propre état
    console.log('[Cart] Using Cart Drawer API');
    
    // Load legacy cart if exists
    var legacyCart = loadCartFromStorage();
    if (legacyCart && legacyCart.length > 0 && typeof window.CartAPI !== 'undefined') {
      legacyCart.forEach(function(item) {
        window.CartAPI.add(item);
      });
      console.log('[Cart] Migrated', legacyCart.length, 'items to Cart Drawer');
    }
  } catch (err) {
    console.error('[Cart init error]', err);
  }
});
function checkoutWhatsApp() {
  try {
    if (cartItems.size === 0) {
      openWhatsAppMessage('Salama! Te-hanao commande (panier vide).');
      return;
    }
    var lines = ['Salama! Commande avy amin\'ny Mijoro Boutique:', ''];
    var total = 0;
    cartItems.forEach(function(item) {
      var itemPrice = (Number(item.price) || 0) * item.qty;
      total += itemPrice;
      // ✅ TEXTE SIMPLE - Pas de HTML
      var priceText = itemPrice > 0 ?
        itemPrice.toLocaleString('fr-FR') + ' AR' :
        'Gratuit';
      lines.push('• ' + item.title + ' x' + item.qty + ' — ' + priceText);
    });
    // ✅ Total en texte simple
    var totalText = total > 0 ?
      total.toLocaleString('fr-FR') + ' AR' :
      'Gratuit';
    lines.push('', 'Total: ' + totalText, 'Misaotra!');
    openWhatsAppMessage(lines.join('\n'));
  } catch (err) {
    console.error('[checkoutWhatsApp error]', err);
  }
}

/* Helpers (z-index/menu safety) */
function __ensureBottomMenuClickable() {
  var bm = document.querySelector('.bottom-menu');
  if (bm) {
    bm.style.pointerEvents = 'auto';
    bm.style.zIndex = '3200';
  }
}
document.addEventListener('DOMContentLoaded', function () {
  __ensureBottomMenuClickable();
});

/* Slideshow (auto + dots + touch) */
(function initSlideshow() {
  try {
    var track = document.getElementById('slide-track');
    var dotsWrap = document.getElementById('slide-dots');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children || []);
    var count = slides.length;
    if (count === 0) return;
    var index = 0;
    var timer = null;
    var DURATION = 5000;

    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < count; i++) {
        (function (iIdx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'dot' + (iIdx === 0 ? ' active' : '');
          btn.setAttribute('aria-label', 'Aller à la diapo ' + (iIdx + 1));
          btn.addEventListener('click', function () { goTo(iIdx, true); });
          dotsWrap.appendChild(btn);
        })(i);
      }
    }
    function updateUI() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      if (dotsWrap) {
        var kids = Array.prototype.slice.call(dotsWrap.children || []);
        for (var d = 0; d < kids.length; d++) {
          if (d === index) kids[d].classList.add('active');
          else kids[d].classList.remove('active');
        }
      }
    }
    function next() { index = (index + 1) % count; updateUI(); }
    function prev() { index = (index - 1 + count) % count; updateUI(); }
    function goTo(i, user) { index = (i + count) % count; updateUI(); if (user) restart(); }
    function start() { if (timer) clearInterval(timer); timer = setInterval(next, DURATION); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    var startX = null;
    track.addEventListener('touchstart', function (e) {
      var t0 = (e.touches && e.touches[0]) ? e.touches[0].clientX : null;
      startX = t0;
      stop();
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      var t1 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : null;
      if (startX != null && t1 != null) {
        var dx = t1 - startX;
        if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); }
      }
      startX = null;
      start();
    }, { passive: true });
    track.addEventListener('mouseenter', stop);
    track.addEventListener('mouseleave', start);
    updateUI(); start();
  } catch (err) {
    console.error('[initSlideshow error]', err);
  }
})();



/* Param panel toggle/close + click-outside */
var __paramOpen = false;
function toggleParamFixed() {
  try {
    var el = document.getElementById('param-fixed');
    if (!el) return;
    __paramOpen = !__paramOpen;
    if (__paramOpen) el.removeAttribute('inert');
    el.classList.toggle('hidden', !__paramOpen);
    el.setAttribute('aria-hidden', String(!__paramOpen));
    if (__paramOpen) {
      document.body.classList.add('param-open');
      var first = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (first && first.focus) first.focus({ preventScroll: true });
      el.style.zIndex = '5000';
      el.style.pointerEvents = 'auto';
      var popup = document.getElementById('shop-popup');
      if (popup && popup.classList.contains('show')) closeShop();
    } else {
      el.setAttribute('inert', '');
      el.style.pointerEvents = 'none';
      document.body.classList.remove('param-open');
    }
    __ensureBottomMenuClickable();
  } catch (err) {
    console.error('[toggleParamFixed error]', err);
  }
}
function closeParamFixed() {
  try {
    var el = document.getElementById('param-fixed');
    if (!el) return;
    __paramOpen = false;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
    el.style.pointerEvents = 'none';
    document.body.classList.remove('param-open');
    __ensureBottomMenuClickable();
  } catch (err) {
    console.error('[closeParamFixed error]', err);
  }
}
document.addEventListener('click', function (e) {
  try {
    var panel = document.getElementById('param-fixed');
    if (!panel) return;
    var trigger = e.target && e.target.closest ? e.target.closest('.menu-param') : null;
    var insidePanel = e.target && e.target.closest ? e.target.closest('#param-fixed') : null;
    if (trigger || insidePanel) return;
    if (!panel.classList.contains('hidden')) closeParamFixed();
  } catch (err) {
    console.warn('[param click-outside]', err);
  }
});

/* ================================
   MODALS + SHOP + PREVIEW
   ================================ */

/* Preview avancé (PDF / Video / HLS / iframe) */
function openPreview(p) {
  try {
    console.log('[openPreview] Starting...', p);
    
    var modal = document.getElementById('info-modal');
    var title = document.getElementById('info-title');
    var content = document.getElementById('info-content');
    
    if (!modal || !content || !title) {
      console.error('[openPreview] Modal elements not found');
      return;
    }
    
    // ✅ STEP 1: Close if already open
    if (modal.classList.contains('show')) {
      console.log('[openPreview] Modal already open, closing first...');
      closeInfo();
      // Wait for close animation
      setTimeout(function() { continueOpen(); }, 150);
    } else {
      continueOpen();
    }
    
    function continueOpen() {
      console.log('[openPreview] Continue opening...');
      
      // ✅ STEP 2: Clean content
      var vids = content.querySelectorAll('video');
      vids.forEach(function(v) {
        try {
          if (!v.paused) v.pause();
          v.removeAttribute('src');
          v.load();
        } catch (_) {}
      });
      
      content.querySelectorAll('embed, iframe, video, audio').forEach(function(el) {
        try { el.remove(); } catch (_) {}
      });
      
      content.innerHTML = '';
      
      // ✅ STEP 3: Get preview URL
      var url = null;
      if (p && p._db && p._db.preview_url) url = p._db.preview_url;
      else if (p && p.preview_url) url = p.preview_url;
      
      title.textContent = (p && p.title) ? p.title + ' — Preview' : 'Preview';
      console.log('[openPreview] Preview URL:', url);
      
      // ✅ STEP 4: Render content
      if (!url) {
        content.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8"><i class="fa-solid fa-circle-info" style="font-size:48px;margin-bottom:16px;opacity:0.5"></i><p style="margin:0">Tsy misy Preview URL ho an\'ity produit ity.</p></div>';
      } else if (/\.pdf(\?|#|$)/i.test(url)) {
        console.log('[openPreview] Rendering PDF...');
        content.innerHTML = '<embed type="application/pdf" src="' + escapeAttr(url) + '#toolbar=1&navpanes=0&statusbar=0" style="width:100%; height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)">';
      } else if (/\.(mp4|webm|mkv)(\?|#|$)/i.test(url)) {
        console.log('[openPreview] Rendering video...');
        var vidId = 'preview-video-' + Date.now();
        var vidHtml = '<video id="' + vidId + '" controls preload="metadata" playsinline style="width:100%; height:auto; max-height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12); display:block; background:#000">' +
          '<source src="' + escapeAttr(url) + '" type="video/mp4">' +
          'Votre navigateur ne supporte pas la vidéo.' +
          '</video>';
        content.innerHTML = vidHtml;
        
        // Force video load
        setTimeout(function() {
          var vid = document.getElementById(vidId);
          if (vid) {
            vid.load();
            console.log('[openPreview] Video loaded');
          }
        }, 100);
        
      } else if (/\.m3u8(\?|#|$)/i.test(url)) {
        console.log('[openPreview] Rendering HLS...');
        var vidId = 'hls-player-' + Date.now();
        content.innerHTML = '<video id="' + vidId + '" controls style="width:100%; height:auto; max-height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:#000"></video>';
        
        if (!window.Hls && !document.querySelector('script[src*="hls.js"]')) {
          var script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
          script.onload = function() {
            var video = document.getElementById(vidId);
            if (window.Hls && window.Hls.isSupported()) {
              var hls = new Hls();
              hls.loadSource(url);
              hls.attachMedia(video);
              console.log('[openPreview] HLS loaded');
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
            }
          };
          document.body.appendChild(script);
        } else if (window.Hls) {
          var video = document.getElementById(vidId);
          if (video && window.Hls.isSupported()) {
            var hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
          }
        }
      } else {
        console.log('[openPreview] Rendering iframe...');
        content.innerHTML = '<iframe src="' + escapeAttr(url) + '" allow="autoplay; fullscreen" style="width:100%; height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12); border:none"></iframe>';
      }
      
      // ✅ STEP 5: Show modal
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      modal.style.display = 'flex';
      
      console.log('[openPreview] Modal shown');
      
      // Focus close button
      setTimeout(function() {
        var closeBtn = modal.querySelector('.info-actions .param-btn');
        if (closeBtn && closeBtn.focus) {
          closeBtn.focus({ preventScroll: true });
        }
      }, 100);
    }
    
  } catch (err) {
    console.error('[openPreview error]', err);
    alert('Erreur lors de l\'ouverture du preview: ' + err.message);
  }
}
/* ================================
   PART 4/4 – SUPABASE AUTH + OWNER CRUD + DB
   ========================================= */

(function () {
  // CONFIG: soloina raha ilaina
  const SUPABASE_URL = "https://zogohkfzplcuonkkfoov.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw";
  const OWNER_EMAIL = "joroandriamanirisoa13@gmail.com";

  let supabase = null;
  let authState = { user: null };
  let authSub = null;
window.addEventListener('load', function() {
  console.group('🔍 DIAGNOSTIC STARTUP');
  console.log('✓ Supabase URL:', window.SUPABASE_URL);
  console.log('✓ Anon Key:', window.SUPABASE_ANON_KEY ? '(définie)' : '❌ MANQUANTE');
  console.log('✓ Products array:', Array.isArray(window.products) ? window.products.length + ' items' : '❌ Non array');
  console.groupEnd();
});
// ---------- Utils (PATCH) ----------
function isOwner() {
  return !!authState.user &&
    String(authState.user.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase();
}
window.isOwner = isOwner;

function applyAuthUI() {
  try {
    const addBtn   = document.getElementById('btnAddProduct');
    const loginBtn = document.getElementById('btnLogin');
    const logoutBtn= document.getElementById('btnLogout');

    if (addBtn)   addBtn.style.display   = isOwner() ? 'inline-flex' : 'none';
    if (loginBtn) loginBtn.style.display = authState.user ? 'none' : 'inline-flex';
    if (logoutBtn)logoutBtn.style.display= authState.user ? 'inline-flex' : 'none';

    const show = isOwner();
    document.querySelectorAll('.owner-tool').forEach((el) => {
      const def = el.dataset.display || 'inline-flex'; // ovao ho 'block' raha container
      el.style.display = show ? def : 'none';
    });
  } catch (e) {
    console.error('[applyAuthUI]', e);
  }
}


  window.applyAuthUI = applyAuthUI;

  async function ensureSupabase() {
    if (supabase) return supabase;
    
    // ✅ CORRECTION: Import Supabase client
    const mod = await import("https://esm.sh/@supabase/supabase-js@2");

    const g = window;
    if (g.__sb) {
      supabase = g.__sb;
      return supabase;
    }

    supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'mijoro-auth-v1',
      },
    });
    g.__sb = supabase;
    return supabase;
  }

  /* ---------- Auth (Email/Password) ---------- */
  

  async function openOwnerLoginModal(){
    const m = ensureOwnerLoginModal();
    m.style.display = 'flex';
    m.setAttribute('aria-hidden','false');
    const emailEl = m.querySelector('#ol-email');
    const passEl = m.querySelector('#ol-pass');
    emailEl.value = OWNER_EMAIL;
    passEl.value = '';
    m.querySelector('#ol-submit').onclick = async () => {
      try{
        const sb = await ensureSupabase();
        const email = emailEl.value.trim();
        const password = passEl.value;
        if (!email || !password) return alert('Fenoy email sy mot de passe');
        if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
          return alert('Tsy Owner io email io.');
        }
        let { error } = await sb.auth.signInWithPassword({ email, password });
        if (error && /Invalid/i.test(error.message||'')) {
          // auto create, then login
          const { error: sErr } = await sb.auth.signUp({ email, password });
          if (sErr) return alert(sErr.message);
          const again = await sb.auth.signInWithPassword({ email, password });
          if (again.error) return alert(again.error.message);
        } else if (error) {
          return alert(error.message);
        }
        m.style.display='none'; m.setAttribute('aria-hidden','true');
        const { data: { session } } = await sb.auth.getSession();
        authState.user = session?.user || null;
        applyAuthUI();
        fetchSupabaseProducts().catch(console.error);
      }catch(e){ console.error('[openOwnerLoginModal]', e); alert('Erreur auth: ' + e.message); }
    };
  }

  async function initAuth() {
  try {
    const sb = await ensureSupabase();
    const { data: { session } } = await sb.auth.getSession();
    authState.user = session?.user || null;
    applyAuthUI();

    if (authSub && typeof authSub.unsubscribe === 'function') {
      authSub.unsubscribe();
    }
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session2) => {
      authState.user = session2?.user || null;
      applyAuthUI();
      fetchSupabaseProducts().catch(console.error);
    });
    authSub = subscription;
  } catch (e) {
    console.error('[initAuth]', e);
  }
}

// ✅ AJOUTEZ CES LIGNES (exposer globalement)
window.openOwnerLoginModal = openOwnerLoginModal;
window.signOutOwner = signOutOwner;
window.initAuth = initAuth;

  async function signOutOwner() {
    try {
      const sb = await ensureSupabase();
      await sb.auth.signOut();
      alert('Déconnecté.');
    } catch (e) { console.error('[signOutOwner]', e); }
  }

  /* ---------- Mapping DB -> UI ---------- */
  function mapRowToUI(r) {
  // ✅ Debug: Afficher ny thumbnail URL
  console.log('[mapRowToUI] Product:', r.title, 'Thumbnail:', r.thumbnail_url);
  
  return {
    id: r.id,
    category: r.category || 'ebooks',
    title: r.title || 'Sans titre',
    image: {
      url: r.thumbnail_url || r.preview_url || FALLBACK_IMG,
      alt: r.title || 'Produit'
    },
    thumbnail_url: r.thumbnail_url, // ✅ Keep direct reference
    price: r.is_free ? 0 : (Number(r.price) || 0),
    currency: "AR",
    stock: "available",
    description_short: r.badge ? r.badge : '',
    preview_url: r.preview_url || null,
    _db: r // ✅ Keep full DB object
  };
}

  /* ---------- Fetch DB ---------- */
  async function fetchSupabaseProducts() {
    try {
      console.log('[fetchSupabaseProducts] 📡 Starting...');
      
      const sb = await ensureSupabase();
      
      if (!sb) {
        console.warn('[fetchSupabaseProducts] ⚠️ Supabase not ready, using fallback');
        return; // ← Tsy throw error, avelao ny fallback data
      }
      
      const { data: productsData, error: productsError } = await sb
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (productsError) {
        console.error('[fetchSupabaseProducts] ❌ Error:', productsError);
        return; // ← Avelao ny fallback data
      }
      
      if (!productsData || productsData.length === 0) {
        console.warn('[fetchSupabaseProducts] ⚠️ No products in database');
        return;
      }
    
    // ✅ ÉTAPE 2: Charger TOUS les compteurs galerie d'un coup
    const { data: galleryCounts, error: galleryError } = await sb
      .from('product_images')
      .select('product_id, id')
      .eq('image_type', 'gallery');
    
    if (galleryError) {
      console.warn('[fetchSupabaseProducts] Gallery count error:', galleryError);
    }
    
    // ✅ ÉTAPE 3: Créer un Map pour compter rapidement
    const galleryMap = {};
    if (galleryCounts) {
      galleryCounts.forEach(img => {
        galleryMap[img.product_id] = (galleryMap[img.product_id] || 0) + 1;
      });
      console.log('[fetchSupabaseProducts] 📸 Gallery counts loaded:', Object.keys(galleryMap).length, 'products');
    }
    
    // ✅ ÉTAPE 4: Mapper avec galleryCount
    const converted = productsData.map(row => {
      const uiProduct = mapRowToUI(row);
      uiProduct.galleryCount = galleryMap[row.id] || 0; // ← ICI: Ajout du compteur
      return uiProduct;
    });
    
    window.products = converted;
    
    console.log('[fetchSupabaseProducts] ✅ Products loaded:', converted.length);
    
    // ✅ Debug: Afficher les produits avec galerie
    const withGallery = converted.filter(p => p.galleryCount > 0);
    if (withGallery.length > 0) {
      console.log('[fetchSupabaseProducts] 📸 Products with gallery:',
        withGallery.map(p => `${p.title} (${p.galleryCount} images)`));
    }
    
    if (typeof applyAuthUI === 'function') {
      applyAuthUI();
    }
    
  } catch (e) {
    console.error('[fetchSupabaseProducts] 💥 Fatal error:', e);
    window.products = [];
    throw e;
  }
}


  

  

  

  /* ---------- Modal UI Add/Edit + File picker ---------- */
  

  const peLocal = { imageFile: null, previewFile: null, mode: 'add', recordId: null };

  
 
  

  /* ---------- CRUD API exposed ---------- */
  async function addProductPrompt() { peOpen({ mode: 'add', product: null }); }

  async function editProductPrompt(id) {
    if (!isOwner()) return alert('Owner ihany no afaka manova.');
    const sb = await ensureSupabase();
    const { data, error } = await sb.from('products').select('*').eq('id', id).maybeSingle();
    if (error) { alert(error.message); return; }
    if (!data) { alert('Produit introuvable'); return; }
    peOpen({ mode: 'edit', product: mapRowToUI(data) });
  }

  async function deleteProductConfirm(id) {
    if (!isOwner()) return alert('Owner ihany no afaka mamafa.');
    if (!confirm('Hofafana ve ity produit ity?')) return;
    try {
      const sb = await ensureSupabase();
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error) throw error;
      alert('Voafafa.');
      await fetchSupabaseProducts();
    } catch (e) { console.error('[deleteProductConfirm]', e); alert('Erreur suppression: ' + e.message); }
  }

  window.editProductPrompt = editProductPrompt;
  window.deleteProductConfirm = deleteProductConfirm;

  /* ---------- Delegation tools amin'ny cards ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    function delegate(root) {
      if (!root) return;
      root.addEventListener('click', function (e) {
        const btn = e.target.closest && e.target.closest('button[data-tool]');
        if (!btn) return;
        const card = e.target.closest('.product-card');
        if (!card) return;
        const id = card.getAttribute('data-id');
        const tool = btn.getAttribute('data-tool');
        if (tool === 'edit') editProductPrompt(id);
        else if (tool === 'delete') deleteProductConfirm(id);
      });
    }
    delegate(document.getElementById('products-row'));
    delegate(document.getElementById('products-box'));
  });

  /* ---------- Wire buttons + init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    const login = document.getElementById('btnLogin');
    const logout = document.getElementById('btnLogout');
    const addBtn = document.getElementById('btnAddProduct');

    if (login) login.addEventListener('click', openOwnerLoginModal);
    if (logout) logout.addEventListener('click', signOutOwner);
    if (addBtn) addBtn.addEventListener('click', addProductPrompt);

    initAuth();
    fetchSupabaseProducts();
  });
  /* ========================================
     EXPOSE GLOBAL FUNCTIONS
     ======================================== */
  
  // Auth functions
  window.openOwnerLoginModal = openOwnerLoginModal;
  window.signOutOwner = signOutOwner;
  window.initAuth = initAuth;
  
  // Supabase functions
  window.ensureSupabase = ensureSupabase;
  window.fetchSupabaseProducts = fetchSupabaseProducts;
  
  // Product CRUD
  window.addProductPrompt = addProductPrompt;
  window.addPhysicalProductPrompt = addPhysicalProductPrompt;
  window.editProductPrompt = editProductPrompt;
  window.deleteProductConfirm = deleteProductConfirm;
  
  // Modal functions
  window.peOpen = peOpen;
  window.peClose = peClose;
  window.peSubmitForm = peSubmitForm;
  
  // Auth state
  window.isOwner = isOwner;
  window.applyAuthUI = applyAuthUI;
  
  console.log('[Supabase] ✓ Global functions exposed');
  
})();

/* ================================
   UTILITIES + MISSING FUNCTIONS
   ========================================= */

// Utilities
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $all(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }
function debounce(fn, wait = 200) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ✅ CORRECTION: showProduct function (manquait) */
function showProduct(id) {
  try {
    const p = (window.products || []).find(x => x.id === id);
    if (!p) {
      console.warn('[showProduct] Product not found:', id);
      return;
    }
    // Ouvre le preview modal
    if (typeof openPreview === 'function') {
      openPreview(p);
    } else {
      // Fallback: affiche info basique
      alert(`Produit: ${p.title}\nPrix: ${typeof fmtPrice === 'function' ? fmtPrice(p.price) : p.price + ' AR'}`);
    }
  } catch (err) {
    console.error('[showProduct error]', err);
  }
}
window.showProduct = showProduct;

/* ✅ CORRECTION: closeShop function (manquait) */
function closeShop() {
  try {
    const popup = document.getElementById('shop-popup');
    if (!popup) return;
    popup.classList.remove('show');
    popup.setAttribute('aria-hidden', 'true');
    popup.style.pointerEvents = 'none';
  } catch (err) {
    console.error('[closeShop error]', err);
  }
}
window.closeShop = closeShop;

/* ✅ CORRECTION: openInfo / closeInfo functions (manquaient) */
function openInfo(type) {
  try {
    const modal = document.getElementById('info-modal');
    const title = document.getElementById('info-title');
    const content = document.getElementById('info-content');
    if (!modal || !content || !title) return;

    if (type === 'about') {
      title.textContent = 'À propos';
      content.innerHTML = `
        <div style="line-height:1.6">
          <p><strong>Mijoro Boutique</strong> – Plateforme de vente de produits numériques/physiques malagasy.</p>
          <p>Version: 1.0 Pro</p>
          <p>© 2025 Mijoro. Tous droits réservés.</p>
        </div>
      `;
    } else if (type === 'contact') {
      title.textContent = 'Contact';
      content.innerHTML = `
        <div style="line-height:1.6">
          <p><strong>WhatsApp:</strong> <a href="https://wa.me/261333106055" target="_blank" style="color:#25d366">+261 33 31 06 055</a></p>
          <p><strong>Email:</strong> joroandriamanirisoa13@gmail.com</p>
          <p>Mba mifandraisa aminay raha mila fanampiana!</p>
        </div>
      `;
    } else {
      title.textContent = 'Information';
      content.innerHTML = '<p>Aucune information disponible.</p>';
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    const closeBtn = modal.querySelector('.info-actions .param-btn');
    if (closeBtn && closeBtn.focus) closeBtn.focus({ preventScroll: true });
  } catch (err) {
    console.error('[openInfo error]', err);
  }
}
window.openInfo = openInfo;

function closeInfo() {
  try {
    const modal = document.getElementById('info-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  } catch (err) {
    console.error('[closeInfo error]', err);
  }
}
window.closeInfo = closeInfo;

/* ✅ CORRECTION: openQuitModal / closeQuitModal / quitApp (manquaient) */
function openQuitModal() {
  try {
    const modal = document.getElementById('quit-modal');
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  } catch (err) {
    console.error('[openQuitModal error]', err);
  }
}
window.openQuitModal = openQuitModal;

function closeQuitModal() {
  try {
    const modal = document.getElementById('quit-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  } catch (err) {
    console.error('[closeQuitModal error]', err);
  }
}
window.closeQuitModal = closeQuitModal;

function quitApp() {
  try {
    // Tentative de fermeture (ne marche que si ouvert par script)
    if (window.close) {
      window.close();
    } else {
      alert('Tsy afaka mikatona automatique ny navigateur. Safidio "Fermer" manokana.');
    }
  } catch (err) {
    console.error('[quitApp error]', err);
    alert('Tsy afaka niala. Safidio ny Close tab/window amin\'ny navigateur.');
  }
}
window.quitApp = quitApp;

/* ================================
   SEARCH/FILTERS WIRING (safeguard)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Search
    const search = document.getElementById('search');
    const filters = document.getElementById('filters');
    const getActiveCategory = () => {
      const activeBtn = filters ? filters.querySelector('.filter-btn.active') : null;
      return activeBtn?.getAttribute('data-category') || activeBtn?.getAttribute('data-filter') || 'all';
    };

    // Wire search input (debounced)
    if (search) {
      const onSearch = debounce(() => {
        const term = search.value || '';
        const cat = getActiveCategory();
        if (typeof renderProducts === 'function') {
          renderProducts(cat, term);
        }
      }, 200);

      search.addEventListener('input', onSearch);
    }

    // Wire filters click -> set .active + render
    if (filters) {
      filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        const curr = filters.querySelector('.filter-btn.active');
        if (curr === btn) return;

        if (curr) curr.classList.remove('active');
        btn.classList.add('active');

        const term = search?.value || '';
        const cat = btn.getAttribute('data-category') || btn.getAttribute('data-filter') || 'all';
        if (typeof renderProducts === 'function') {
          renderProducts(cat, term);
        }
      });
    }
  } catch(err) {
    console.error('[Search/Filters wiring error]', err);
  }
});

/* ================================
   BOTTOM MENU SWIPE/HIDE LOGIC (refined)
   ========================================= */
(function() {
  const menu = document.querySelector('.bottom-menu');
  if (!menu) return;

  // Edge ho an'ny swipe-up rehefa miafina
  let edge = document.querySelector('.touch-edge-bottom');
  if (!edge) {
    edge = document.createElement('div');
    edge.className = 'touch-edge-bottom';
    edge.setAttribute('aria-hidden', 'true');
    document.body.appendChild(edge);
  }

  // Helpers
  function getVar(name) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return parseFloat(v) || 0;
  }
  function getTranslateY(el) {
    const tr = getComputedStyle(el).transform;
    if (!tr || tr === 'none') return 0;
    const m = new DOMMatrixReadOnly(tr);
    return m.m42 || 0;
  }
  function getHiddenTargetPx() {
    const edgeVisible = getVar('--edge-visible') || 18;
    const h = menu.getBoundingClientRect().height;
    return Math.max(0, h - edgeVisible);
  }
  function setTranslate(y) {
    menu.style.transform = `translateY(${y}px)`;
  }
  function forceReflow() { void menu.offsetHeight; }

  // Animate mankany amin'ny état kendrena, ary esory inline aorian'ny transition
  function animateToState(toHidden) {
    const onEnd = () => {
      menu.removeEventListener('transitionend', onEnd);
      // Fanadiovana: esory inline transform, avelao ny class no hifehy
      menu.style.transform = '';
    };

    // Atao aloha ny position ankehitriny ho inline, avy eo reflow
    const current = getTranslateY(menu);
    setTranslate(current);
    forceReflow();

    // Avy eo toggling class -> animates
    if (toHidden) menu.classList.add('is-hidden');
    else menu.classList.remove('is-hidden');

    // Rehefa vita ny transition, esory inline transform
    menu.addEventListener('transitionend', onEnd, { once: true });
  }

  // State drag
  let startY = 0;
  let startTranslate = 0;
  let dragging = false;
  let lastY = 0;
  let lastT = 0;

  const VEL_TRIGGER = 0.6; // px/ms
  const DIST_THRESH = 50;

  function onStart(clientY) {
    dragging = true;
    window.__skipHorizontalNav = true; // hisorohana conflit amin'ny swipe nav
    menu.classList.add('dragging');
    startTranslate = getTranslateY(menu);
    startY = clientY;
    lastY = clientY;
    lastT = performance.now();
  }

  function onMove(clientY) {
    if (!dragging) return;
    const dy = clientY - startY;
    const targetHidden = getHiddenTargetPx();

    // Mifehy range: 0 .. targetHidden
    let next = Math.max(0, Math.min(targetHidden, startTranslate + dy));
    setTranslate(next);

    lastY = clientY;
    lastT = performance.now();
  }

  function onEnd(clientY) {
    if (!dragging) return;
    dragging = false;
    menu.classList.remove('dragging');

    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    const vy = (clientY - lastY) / dt; // + midina (hide), - miakatra (show)
    const cur = getTranslateY(menu);
    const targetHidden = getHiddenTargetPx();

    let toHide;
    if (vy > VEL_TRIGGER) {
      toHide = true;
    } else if (vy < -VEL_TRIGGER) {
      toHide = false;
    } else {
      // Raha kely ny hetsika -> manatona ny état akaiky indrindra
      if (Math.abs(cur - startTranslate) < DIST_THRESH) {
        toHide = startTranslate > targetHidden / 2;
      } else {
        toHide = (cur / targetHidden) > 0.5;
      }
    }

    animateToState(toHide);

    // Avelao hiverina ny nav aorian'ny kely
    setTimeout(() => { window.__skipHorizontalNav = false; }, 100);
  }

  // Drag avy amin'ny menu
  menu.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    onStart(t.clientY);
  }, { passive: true });

  menu.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    e.preventDefault?.();
    onMove(t.clientY);
  }, { passive: false });

  menu.addEventListener('touchend', (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    onEnd(t.clientY);
  }, { passive: true });

  // Drag avy amin'ny edge rehefa miafina
  edge.addEventListener('touchstart', (e) => {
    if (!menu.classList.contains('is-hidden')) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    setTranslate(getHiddenTargetPx());
    onStart(t.clientY);
  }, { passive: true });

  edge.addEventListener('touchmove', (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const t = e.touches[0];
    e.preventDefault?.();
    onMove(t.clientY);
  }, { passive: false });

  edge.addEventListener('touchend', (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    onEnd(t.clientY);
  }, { passive: true });
})();

/* ================================
   SHOP TOOLS TOGGLE (collapse/expand logic)
   ========================================= */
(() => {
  if (window.__shopToolsInit) return; // guard double init
  window.__shopToolsInit = true;

  const init = () => {
    const shopEl   = document.getElementById('shop');
    const toggleEl = document.getElementById('shopToolsToggle');
    const toolsEl  = document.getElementById('shop-tools');

    if (!shopEl || !toggleEl || !toolsEl) {
      console.warn('[ShopTools] missing elements:', { shopEl, toggleEl, toolsEl });
      return;
    }

    // Clickable
    toggleEl.style.pointerEvents = 'auto';

    // État initial: miafina
    let open = false;
    apply(open);

    // Toggle click
    toggleEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      open = !open;
      apply(open);
    }, { passive: true });

    // Recompute maxHeight rehefa resize
    window.addEventListener('resize', () => {
      if (open) toolsEl.style.maxHeight = toolsEl.scrollHeight + 'px';
    });

    function apply(isOpen) {
      shopEl.classList.toggle('tools-open', isOpen);
      toggleEl.setAttribute('aria-expanded', String(isOpen));

      toolsEl.style.transition = 'max-height .28s ease, opacity .18s ease, transform .28s ease';
      if (isOpen) {
        toolsEl.style.maxHeight = toolsEl.scrollHeight + 'px';
        toolsEl.style.opacity = '1';
        toolsEl.style.transform = 'translateY(0)';
        toolsEl.style.pointerEvents = 'auto';
      } else {
        toolsEl.style.maxHeight = '0px';
        toolsEl.style.opacity = '0';
        toolsEl.style.transform = 'translateY(-6px)';
        toolsEl.style.pointerEvents = 'none';
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* ========== SCROLL FEATURES ========== */

// Scroll to top rehefa render products vaovao
(function patchRenderProducts() {
  var originalRender = window.renderProducts;
  if (typeof originalRender !== 'function') return;
  
  window.renderProducts = function(filter, search) {
    originalRender.call(this, filter, search);
    
    // Scroll to top
    setTimeout(function() {
      var wrapper = document.getElementById('products-wrapper');
      if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };
})();

// Scroll to top button
document.addEventListener('DOMContentLoaded', function() {
  var wrapper = document.getElementById('products-wrapper');
  if (!wrapper) return;
  
  // Create button
  var btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  btn.setAttribute('aria-label', 'Retour en haut');
  btn.type = 'button';
  document.body.appendChild(btn);
  
  // Show/hide on scroll
  wrapper.addEventListener('scroll', function() {
    if (wrapper.scrollTop > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });
  
  // Click handler
  btn.addEventListener('click', function() {
    wrapper.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
/* ================================
   END OF PART 4/4
   ========================================= */
   /* ========== LANGUAGE SELECTOR FIX ========== */

document.addEventListener('DOMContentLoaded', function() {
  // Get language options container
  var langOptions = document.getElementById('lang-options');
  if (!langOptions) {
    console.warn('[Lang] lang-options not found');
    return;
  }
  
  // Get all language buttons
  var langButtons = langOptions.querySelectorAll('.option-card[data-lang]');
  
  if (langButtons.length === 0) {
    console.warn('[Lang] No language buttons found');
    return;
  }
  
  console.log('[Lang] Found', langButtons.length, 'language buttons');
  
  // Add click handler to each button
  langButtons.forEach(function(btn) {
    // Remove old listeners if any
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    // Add new listener
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      var lang = this.getAttribute('data-lang');
      console.log('[Lang] Clicked:', lang);
      
      if (!lang) return;
      
      // Apply language immediately
      selectLang(lang);
      
      // Update active state
      langOptions.querySelectorAll('.option-card').forEach(function(b) {
        b.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
  
  // Load saved language
  try {
    var savedLang = localStorage.getItem(LANG_KEY) || 'fr';
    console.log('[Lang] Loaded saved language:', savedLang);
    applyLang(savedLang);
  } catch(e) {
    console.error('[Lang] Error loading saved language:', e);
    applyLang('fr');
  }
});

// Enhanced selectLang function
function selectLang(lang) {
  try {
    var validLangs = ['mg', 'fr', 'en'];
    var l = (validLangs.indexOf(lang) !== -1) ? lang : 'fr';
    
    console.log('[selectLang] Switching to:', l);
    
    // Save to localStorage
    try {
      localStorage.setItem(LANG_KEY, l);
      console.log('[selectLang] Saved to localStorage');
    } catch(err) {
      console.warn('[selectLang] Could not save to localStorage:', err);
    }
    
    // Apply immediately
    applyLang(l);
    
    // Visual feedback
    var message = {
      'mg': 'Voavaha: Malagasy',
      'fr': 'Langue changée: Français',
      'en': 'Language changed: English'
    };
    
    // Optional: show toast notification
    console.log('[selectLang]', message[l]);
    
  } catch(err) {
    console.error('[selectLang error]', err);
  }
}

// Enhanced applyLang function with better error handling
function applyLang(lang) {
  try {
    var validLangs = ['mg', 'fr', 'en'];
    var l = (validLangs.indexOf(lang) !== -1) ? lang : 'fr';
    
    console.log('[applyLang] Applying:', l);
    
    // Update document lang attribute
    document.documentElement.lang = l;
    
    // Update button states
    var langOptions = document.getElementById('lang-options');
    if (langOptions) {
      var btns = langOptions.querySelectorAll('.option-card[data-lang]');
      btns.forEach(function(btn) {
        var btnLang = btn.getAttribute('data-lang');
        if (btnLang === l) {
          btn.classList.add('active');
          btn.setAttribute('aria-checked', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-checked', 'false');
        }
      });
    }
    
    // Localize page content
    localizePage(l);
    
    console.log('[applyLang] Successfully applied:', l);
    
  } catch(err) {
    console.error('[applyLang error]', err);
  }
}
/* ========================================
   PRODUCT INFO MODAL (FULL DETAILS)
   ======================================== */

function showProduct(id) {
  try {
    const p = (window.products || []).find(x => x.id === id);
    if (!p) {
      console.warn('[showProduct] Product not found:', id);
      alert('Tsy hita ny produit');
      return;
    }
    
    // Get or create info modal
    const modal = document.getElementById('info-modal');
    const title = document.getElementById('info-title');
    const content = document.getElementById('info-content');
    
    if (!modal || !content || !title) {
      console.error('[showProduct] Modal elements not found');
      return;
    }
    
    // Set title
    title.textContent = p.title || 'Détails du produit';
    
    // Build detailed content
    const imgUrl = (p.image && p.image.url) ? p.image.url : FALLBACK_IMG;
    const price = Number(p.price) || 0;
    const isFree = price === 0;
    const category = normalizeCategory(p.category || '');
    const badge = p._db?.badge || p.badge || '';
    const tags = Array.isArray(p._db?.tags) ? p._db.tags : [];
    const description = p.description || p.description_short || 'Aucune description disponible.';
    const previewUrl = p.preview_url || p._db?.preview_url;
    
    // Category label
    const categoryLabels = {
      'ebooks': 'eBook',
      'videos': 'Vidéo',
      'apps': 'Application',
      'vip': 'VIP',
      'promo': 'Promotion',
      'free': 'Gratuit'
    };
    const categoryLabel = categoryLabels[category] || category;
    
    // Build HTML
    let html = `
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Image -->
        <div style="width:100%;max-height:300px;overflow:hidden;border-radius:12px;border:1px solid rgba(255,255,255,.12)">
          <img src="${escapeAttr(imgUrl)}" 
               alt="${escapeAttr(p.title || 'Produit')}" 
               style="width:100%;height:auto;object-fit:cover;display:block">
        </div>
        
        <!-- Price & Category -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>${fmtPrice(price)}</div>
          <div style="display:flex;gap:8px;align-items:center">
            ${badge ? `<span class="badge ${badgeClassFor(badge)}" style="padding:4px 10px;border-radius:999px;font-size:12px">${badge}</span>` : ''}
            <span class="badge" style="padding:4px 10px;border-radius:999px;font-size:12px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3)">${categoryLabel}</span>
          </div>
        </div>
        
        <!-- Tags -->
        ${tags.length ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${tags.map(tag => `<span style="padding:4px 8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:6px;font-size:11px">${escapeHtml(tag)}</span>`).join('')}
        </div>
        ` : ''}
        
        <!-- Description -->
        <div style="line-height:1.6;color:#e5e7eb">
          <h4 style="margin:0 0 8px 0;color:#fff">Description</h4>
          <p style="margin:0;white-space:pre-wrap">${escapeHtml(description)}</p>
        </div>
        
        <!-- Actions -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:8px;border-top:1px solid rgba(255,255,255,.08)">
          ${previewUrl ? `
            <button type="button" 
                    class="param-btn" 
                    onclick="openPreview({id:'${escapeAttr(p.id)}',title:'${escapeAttr(p.title)}',preview_url:'${escapeAttr(previewUrl)}'})"
                    style="flex:1;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;color:#fff">
              <i class="fa-solid fa-eye"></i> Aperçu
            </button>
          ` : ''}
          
          <button type="button" 
                  class="param-btn" 
                  onclick="buyOrRead({id:'${escapeAttr(p.id)}',title:'${escapeAttr(p.title)}',category:'${escapeAttr(category)}',price:${price},image:{url:'${escapeAttr(imgUrl)}'}})"
                  style="flex:1;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff">
            <i class="fa-brands fa-whatsapp"></i> ${isFree ? 'Obtenir' : 'Commander'}
          </button>
        </div>
      </div>
    `;
    
    content.innerHTML = html;
    
    // Show modal
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    
    // Focus close button
    setTimeout(() => {
      const closeBtn = modal.querySelector('.info-actions .param-btn');
      if (closeBtn && closeBtn.focus) closeBtn.focus({ preventScroll: true });
    }, 100);
    
  } catch (err) {
    console.error('[showProduct error]', err);
    alert('Erreur lors de l\'affichage du produit: ' + err.message);
  }
}

// Make sure it's global
window.showProduct = showProduct;

/* ========================================
   ENHANCED INFO MODAL CLOSE HANDLER
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('info-modal');
  if (!modal) return;
  
  // Close button handler
  const closeBtn = modal.querySelector('.info-actions .param-btn');
  if (closeBtn) {
    // Remove old listeners
    const newBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newBtn, closeBtn);
    
    // Add new listener
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeInfo();
    });
  }
  
  // Click outside to close
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeInfo();
    }
  });
  
  // Escape key to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeInfo();
    }
  });
});

function closeInfo() {
  try {
    const modal = document.getElementById('info-modal');
    if (!modal) return;
    
    // Stop any media
    const videos = modal.querySelectorAll('video');
    videos.forEach(v => {
      if (!v.paused) v.pause();
      v.src = '';
    });
    
    // Remove embeds/iframes
    modal.querySelectorAll('embed, iframe').forEach(el => el.remove());
    
    // Clear content
    const content = document.getElementById('info-content');
    if (content) content.innerHTML = '';
    
    // Hide modal
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    
  } catch (err) {
    console.error('[closeInfo error]', err);
  }
}

window.closeInfo = closeInfo;/* /* /* ==========================================
   PUSH NOTIFICATIONS - PRODUCTION READY
   ========================================== */

(function initPushNotifications() {
  // ✅ UTILISER LES CONSTANTES GLOBALES
  const VAPID_PUBLIC_KEY = 'BL8QmGLYoAXQnhXStyuriTFZF_hsIMkHpuxwmRUaCVVRWuyRN5cICB8smSeorTEGQ-3welHD9lFHDma7b--l5Ic'; // ← À remplacer
  const SUBSCRIBE_ENDPOINT = window.SUPABASE_URL + '/functions/v1/subscribe-push';
  const NOTIFY_ENDPOINT = window.SUPABASE_URL + '/functions/v1/send-push';
  const ANON_KEY = window.SUPABASE_ANON_KEY; // ✅ Utilise la variable globale
  
  let isSubscribed = false;
  let swRegistration = null;
  
  // Check support
  function isNotificationSupported() {
    return 'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  }
  
  // Initialize
  async function init() {
    try {
      const btn = document.getElementById('btnSubscribe');
      if (!btn) {
        console.warn('[Notifications] Button #btnSubscribe not found');
        return;
      }
      
      // ✅ VÉRIFICATION: ANON_KEY est défini
      if (!ANON_KEY) {
        console.error('[Notifications] SUPABASE_ANON_KEY is not defined!');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i><span class="subscribe-text">Erreur config</span>';
        return;
      }
      
      // Check support
      if (!isNotificationSupported()) {
        console.warn('[Notifications] Not supported');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-bell-slash"></i><span class="subscribe-text">Non supporté</span>';
        return;
      }
      
      // Wait for SW registration
      swRegistration = await navigator.serviceWorker.ready;
      console.log('[Notifications] Service Worker ready');
      
      // Check existing subscription
      const subscription = await swRegistration.pushManager.getSubscription();
      isSubscribed = subscription !== null;
      
      // Load saved state
      try {
        const saved = localStorage.getItem('push-subscribed');
        if (saved === 'true' && !subscription) {
          localStorage.removeItem('push-subscribed');
          isSubscribed = false;
        }
      } catch (_) {}
      
      updateUI();
      
      // Wire button
      btn.addEventListener('click', handleSubscribeClick);
      
      console.log('[Notifications] Initialized, subscribed:', isSubscribed);
      
    } catch (err) {
      console.error('[Notifications] Init error:', err);
    }
  }
  
  // Handle button click
  async function handleSubscribeClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = document.getElementById('btnSubscribe');
    if (!btn || btn.disabled) return;
    
    try {
      btn.classList.add('loading');
      btn.disabled = true;
      
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
      
    } catch (err) {
      console.error('[Notifications] Error:', err);
      alert('Erreur: ' + err.message);
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }
  
  // Subscribe
async function subscribe() {
  try {
    // Step 1: Request permission
    const permission = await Notification.requestPermission();
    console.log('[Notifications] Permission:', permission);
    
    if (permission !== 'granted') {
      alert('Veuillez autoriser les notifications dans les paramètres de votre navigateur.');
      return; // ✅ Don't throw, just return
    }
    
    // Step 2: Create subscription
    console.log('[Notifications] Creating subscription...');
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    
    console.log('[Notifications] Subscription created:', subscription.endpoint);
    
    // Step 3: Send to server (WITH FALLBACK)
    try {
      await sendSubscriptionToServer(subscription, 'subscribe');
      console.log('[Notifications] ✓ Subscription saved to server');
    } catch (serverErr) {
      console.warn('[Notifications] Server sync failed, but local subscription OK:', serverErr);
      
      // ✅ FALLBACK: Still mark as subscribed locally
      // The subscription is valid even if server didn't save it
      console.log('[Notifications] Proceeding with local-only subscription');
    }
    
    // Step 4: Update state
    isSubscribed = true;
    updateUI();
    
    // Step 5: Show confirmation
    showLocalNotification(
      'Abonnement confirmé! 🎉',
      'Vous recevrez des notifications pour les nouveaux produits.'
    );
    
    try {
      localStorage.setItem('push-subscribed', 'true');
    } catch (_) {}
    
    console.log('[Notifications] ✓ Subscribe complete');
    
  } catch (err) {
    console.error('[Notifications] Subscribe error:', err);
    
    // ✅ User-friendly error
    if (err.name === 'NotAllowedError') {
      alert('Permission refusée. Activez les notifications dans les paramètres.');
    } else if (err.name === 'NotSupportedError') {
      alert('Les notifications ne sont pas supportées sur cet appareil.');
    } else {
      alert('Erreur d\'abonnement: ' + err.message);
    }
    
    throw err;
  }
}
  
// Unsubscribe
async function unsubscribe() {
  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    
    if (subscription) {
      // ✅ Try to notify server, but don't block if it fails
      try {
        await sendSubscriptionToServer(subscription, 'unsubscribe');
        console.log('[Notifications] ✓ Server notified of unsubscribe');
      } catch (serverErr) {
        console.warn('[Notifications] Server unsubscribe failed (non-critical):', serverErr);
      }
      
      // ✅ Unsubscribe locally regardless
      await subscription.unsubscribe();
      console.log('[Notifications] ✓ Local unsubscribe complete');
    }
    
    isSubscribed = false;
    updateUI();
    
    try {
      localStorage.removeItem('push-subscribed');
    } catch (_) {}
    
    alert('Désabonnement réussi.');
    
  } catch (err) {
    console.error('[Notifications] Unsubscribe error:', err);
    alert('Erreur lors du désabonnement: ' + err.message);
    throw err;
  }
}
  
  // Send to server
async function sendSubscriptionToServer(subscription, action) {
  try {
    console.log('[Notifications] Sending to server:', SUBSCRIBE_ENDPOINT);
    
    // ✅ Parse subscription properly
    const subJSON = subscription.toJSON();
    
    const response = await fetch(SUBSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + ANON_KEY,
        'apikey': ANON_KEY
      },
      body: JSON.stringify({
        action: action,
        subscription: {
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth
        }
      })
    });
    
    console.log('[Notifications] Response status:', response.status);
    
    const contentType = response.headers.get('content-type');
    console.log('[Notifications] Content-Type:', contentType);
    
    if (!response.ok) {
      let errorMsg = 'Server error: ' + response.status;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMsg = error.error || error.message || errorMsg;
        } catch (parseErr) {
          console.warn('[Notifications] Could not parse error JSON:', parseErr);
          const text = await response.text();
          console.log('[Notifications] Error response text:', text.substring(0, 200));
        }
      } else {
        const text = await response.text();
        console.log('[Notifications] Error response (not JSON):', text.substring(0, 200));
      }
      
      throw new Error(errorMsg);
    }
    
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('[Notifications] Server response:', result);
      return result;
    } else {
      const text = await response.text();
      console.warn('[Notifications] Response not JSON:', text.substring(0, 200));
      return { success: true, message: 'Subscription processed (non-JSON response)' };
    }
    
  } catch (err) {
    console.error('[Notifications] Failed to sync with server:', err);
    
    if (err.message.includes('Failed to fetch')) {
      throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } else if (err.message.includes('404')) {
      throw new Error('Endpoint de notification introuvable. Vérifiez la configuration.');
    } else if (err.message.includes('401') || err.message.includes('403')) {
      throw new Error('Erreur d\'authentification. Vérifiez votre clé API.');
    }
    
    throw err;
  }
}
  
  // Update button UI
  function updateUI() {
    const btn = document.getElementById('btnSubscribe');
    if (!btn) return;
    
    if (isSubscribed) {
      btn.classList.add('subscribed');
      btn.innerHTML = '<i class="fa-solid fa-bell-slash"></i><span class="subscribe-text">Se désabonner</span>';
      btn.setAttribute('title', 'Se désabonner des notifications');
    } else {
      btn.classList.remove('subscribed');
      btn.innerHTML = '<i class="fa-solid fa-bell"></i><span class="subscribe-text">S\'abonner aux notifications</span>';
      btn.setAttribute('title', 'Recevoir les notifications de nouveaux produits');
    }
  }
  
  // Show local notification
  function showLocalNotification(title, body, options = {}) {
    if (!swRegistration) return;
    
    const notifOptions = {
      body: body,
      icon:  'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg', 
      badge: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg', 
      vibrate: [200, 100, 200],
      tag: 'mijoro-notification',
      requireInteraction: false,
      ...options
    };
    
    swRegistration.showNotification(title, notifOptions);
  }
  
  // Convert VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
// ========================================
// GLOBAL: Trigger notification on new product
// ========================================
window.notifyNewProduct = function(product) {
  console.log('[Notifications] notifyNewProduct called with:', product);
  
  if (!isSubscribed || !swRegistration) {
    console.log('[Notifications] Not subscribed, skipping notification');
    return;
  }
  
  console.log('[Notifications] ✓ Showing notification for:', product.title);
  
  showLocalNotification(
    '🆕 Nouveau produit disponible!',
    product.title + '\n' + (product.price === 0 ? 'Gratuit' : product.price + ' AR'),
    {
      icon: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg',
      badge: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg',
      vibrate: [200, 100, 200],
      tag: 'new-product-' + (product.id || Date.now()),
      requireInteraction: true,
      data: {
        url: window.location.origin + window.location.pathname + '#shop',
        productId: product.id
      },
      actions: [
        { action: 'view', title: '👀 Voir', icon: 'https://i.ibb.co/kVQxwznY/IMG-20251104-074641.jpg' },
        { action: 'close', title: 'Fermer' }
      ]
    }
  );
};

console.log('[Notifications] ✓ notifyNewProduct function registered');
// ========================================

// ✅ Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
/* DEBUG - À SUPPRIMER APRÈS */
console.log('[DEBUG] Checking available data...');
console.log('window.allProducts:', window.allProducts);
console.log('window.products:', window.products);
console.log('window.productsData:', window.productsData);

// Liste toutes les variables globales contenant "product"
Object.keys(window).filter(k => k.toLowerCase().includes('product')).forEach(k => {
  console.log(`[DEBUG] window.${k}:`, window[k]);
});
/* ==========================================
   QUICK ORDER MODULE - FIXED VERSION ✅
   ========================================== */

const QuickOrder = {
  loaded: false,
  retryCount: 0,
  maxRetries: 40, // Augmenté pour laisser plus de temps
  
  // Initialisation
  async init() {
    console.log('[Quick Order] Starting initialization...');
    const container = document.getElementById('featured-products');
    if (!container) {
      console.warn('[Quick Order] Container #featured-products not found');
      return;
    }
    
    this.showLoader(container);
    await this.waitForProducts();
  },
  
  // Affiche le loader
  showLoader(container) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:30px;color:#94a3b8">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:32px;margin-bottom:12px;color:#4ade80"></i>
        <p style="margin:0;font-size:14px">Chargement des produits...</p>
      </div>
    `;
  },
  
  // ✅ FIXED: Attend window.products (votre variable globale)
  async waitForProducts() {
    return new Promise((resolve) => {
      const checkProducts = () => {
        this.retryCount++;
        
        // ✅ Utilise votre variable products globale
        if (window.products && Array.isArray(window.products) && window.products.length > 0) {
          console.log('[Quick Order] ✓ Products loaded:', window.products.length);
          this.render();
          this.loaded = true;
          resolve(true);
          return;
        }
        
        // Max retries
        if (this.retryCount >= this.maxRetries) {
          console.warn('[Quick Order] Max retries reached. Using fallback data.');
          this.render(); // Render quand même avec données fallback
          resolve(false);
          return;
        }
        
        // Retry
        setTimeout(checkProducts, 250);
      };
      
      checkProducts();
    });
  },
  
  // Affiche les produits
  render() {
    const container = document.getElementById('featured-products');
    if (!container) return;
    
    // ✅ Utilise window.products directement
    const allProducts = window.products || [];
    
    if (allProducts.length === 0) {
      this.showEmpty(container);
      return;
    }
    
    // Filtre VIP/Promo en priorité
    let featured = allProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      return cat === 'vip' || cat === 'promo' || cat === 'promotion';
    });
    
    // Fallback: premiers produits si pas assez
    if (featured.length < 4) {
      featured = [...featured, ...allProducts.filter(p => {
        const cat = (p.category || '').toLowerCase();
        return cat !== 'vip' && cat !== 'promo' && cat !== 'promotion';
      })];
    }
    
    // Limite à 4
    featured = featured.slice(0, 8);
    
    if (featured.length === 0) {
      this.showEmpty(container);
      return;
    }
    
    container.innerHTML = featured.map(p => this.createProductCard(p)).join('');
    console.log('[Quick Order] ✓ Rendered', featured.length, 'products');
  },
  
  // Crée une card produit
  createProductCard(product) {
  const price = Number(product.price) || 0;
  const priceText = price > 0 ? `${price} AR` : 'Gratuit';
  
  // ✅ NOUVEAU: Check if NEW (from QO storage)
  const qoProduct = (window.QOManagement?.getProducts() || []).find(p => p.id === product.id);
  const isNew = qoProduct?.addedAt && (Date.now() - qoProduct.addedAt < 86400000);
  
    
    // ✅ Compatible avec votre structure d'image
    let imgSrc = 'https://via.placeholder.com/300x169/1e293b/4ade80?text=Image';
    if (product.image && product.image.url) {
      imgSrc = product.image.url;
    } else if (product.thumbnail_url) {
      imgSrc = product.thumbnail_url;
    } else if (product._db && product._db.thumbnail_url) {
      imgSrc = product._db.thumbnail_url;
    }
    
    const name = this.escapeHtml(product.title || product.name || 'Produit');
    const cat = (product.category || '').toLowerCase();
    
    // Badge selon catégorie
    let badge = '';
    if (cat === 'vip') {
      badge = `<span class="qo-badge qo-badge-vip"><i class="fa-solid fa-crown"></i></span>`;
    } else if (cat === 'promo' || cat === 'promotion') {
      badge = `<span class="qo-badge qo-badge-promo"><i class="fa-solid fa-fire"></i></span>`;
    } else if (price === 0 || cat === 'free' || cat === 'gratuit') {
      badge = `<span class="qo-badge qo-badge-free"><i class="fa-solid fa-gift"></i></span>`;
    }
    
return `
    <div class="qo-product" data-product-id="${product.id || ''}">
      ${isNew ? '<span class="qo-new-badge">NEW</span>' : ''}
      ${badge}
      <img 
        src="${imgSrc}"
          alt="${name}" 
          class="qo-product-img" 
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/300x169/1e293b/4ade80?text=Image'">
        <div class="qo-product-title">${name}</div>
        <div class="qo-product-price">
          <i class="fa-solid fa-coins"></i>
          <span>${priceText}</span>
        </div>
      </div>
    `;
  },
  
  // Affiche message vide
  showEmpty(container) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:30px;color:#94a3b8">
        <i class="fa-solid fa-box-open" style="font-size:36px;margin-bottom:12px;opacity:0.5"></i>
        <p style="margin:0;font-size:14px">Aucun produit disponible</p>
      </div>
    `;
  },
  
  // Escape HTML
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  // Gère le clic sur un produit
  handleClick(productId) {
    if (!productId) return;
    
    const product = (window.products || []).find(p => p.id === productId);
    
    if (!product) {
      console.warn('[Quick Order] Product not found:', productId);
      this.showToast('❌ Produit introuvable', 'error');
      return;
    }
    
    // ✅ Utilise votre fonction addToCart existante
    if (typeof window.addToCart !== 'function') {
      console.error('[Quick Order] addToCart function not found');
      this.showToast('❌ Erreur système', 'error');
      return;
    }
    
    window.CartAPI.add(product);
    
    // Ouvre le drawer du panier
    const drawer = document.getElementById('cart-drawer');
    if (drawer) {
      drawer.classList.add('show');
      drawer.setAttribute('aria-hidden', 'false');
    }
    
    // Feedback visuel
    const card = document.querySelector(`.qo-product[data-product-id="${CSS.escape(productId)}"]`);
    if (card) {
      card.style.animation = 'quickAddPulse 0.4s ease';
      setTimeout(() => card.style.animation = '', 400);
    }
    
    // Toast notification
    this.showToast(`✅ ${product.title || 'Produit'} ajouté au panier`, 'success');
  },
  
  // Toast notification
  showToast(message, type = 'success') {
    document.querySelectorAll('.qo-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = 'qo-toast';
    toast.textContent = message;
    
    const bgColor = type === 'success' ? '#10b981' : '#ef4444';
    
    toast.style.cssText = `
      position: fixed;
      bottom: 110px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bgColor};
      color: #fff;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 14px;
      z-index: 9999;
      animation: qoToastIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      max-width: 90vw;
      text-align: center;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'qoToastOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

// ✅ Event delegation global pour les clics
document.addEventListener('click', (e) => {
  const productCard = e.target.closest('.qo-product');
  if (productCard) {
    const productId = productCard.dataset.productId;
    if (productId) {
      QuickOrder.handleClick(productId);
    }
  }
});

// ✅ Initialisation automatique
(function initQuickOrder() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => QuickOrder.init(), 800); // Delay pour laisser products se charger
    });
  } else {
    setTimeout(() => QuickOrder.init(), 800);
  }
})();

// ✅ Styles CSS
if (!document.getElementById('qo-premium-styles')) {
  const styles = document.createElement('style');
  styles.id = 'qo-premium-styles';
  styles.textContent = `
    @keyframes qoToastIn {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes qoToastOut {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    }
    @keyframes quickAddPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(0.95); background: rgba(74,222,128,0.2); }
    }
    
    .qo-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 13px;
      z-index: 5;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .qo-badge-vip {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: #78350f;
    }
    
    .qo-badge-promo {
      background: linear-gradient(135deg, #ec4899, #d946ef);
      color: #fef3c7;
    }
    
    .qo-badge-free {
      background: linear-gradient(135deg, #10b981, #34d399);
      color: #064e3b;
    }
  `;
  document.head.appendChild(styles);
}


/* ==========================================
   QUICK ORDER - OWNER MANAGEMENT ✅
   ========================================== */

(function initQOManagement() {
    'use strict';
    
    const QO_STORAGE_KEY = 'quick-order:products';
    let selectedProducts = new Set();
    let qoProducts = [];
    
    // ========================================
    // STORAGE - AJOUT DE LA FONCTION MANQUANTE
    // ========================================
    
    async function saveQOProducts() {
      try {
        console.log('[QO] Saving', qoProducts.length, 'products...');
        
        // ✅ Vérifier authentification
        if (!window.MijoroAuth || !window.MijoroAuth.isAuthenticated) {
          console.warn('[QO] Not authenticated, saving to localStorage only');
          localStorage.setItem(QO_STORAGE_KEY, JSON.stringify(qoProducts));
          updateCounter();
          return;
        }
        
        const ownerId = window.MijoroAuth.userAccount.id;
        const sb = await ensureSupabase();
        
        // ✅ Delete existing QO for THIS owner
        await sb
          .from('quick_order_products')
          .delete()
          .eq('owner_id', ownerId); // ← FILTRE CRITIQUE
        
        // Insert new products with owner_id
        if (qoProducts.length > 0) {
          const rows = qoProducts.map((p, index) => ({
            product_id: p.id,
            position: index,
            owner_id: ownerId, // ← AJOUT CRITIQUE
            added_at: p.addedAt ? new Date(p.addedAt).toISOString() : new Date().toISOString()
          }));
          
          const { error } = await sb
            .from('quick_order_products')
            .insert(rows);
          
          if (error) throw error;
          
          console.log('[QO] ✓ Saved to Supabase:', qoProducts.length, 'products');
        }
        
        // Fallback localStorage
        try {
          localStorage.setItem(QO_STORAGE_KEY, JSON.stringify(qoProducts));
        } catch (_) {}
        
        updateCounter();
        
      } catch (e) {
        console.error('[QO] Save error:', e);
        // Fallback localStorage
        try {
          localStorage.setItem(QO_STORAGE_KEY, JSON.stringify(qoProducts));
          updateCounter();
        } catch (_) {}
      }
    }
    
    async function loadQOProducts() {
      try {
        // ✅ Vérifier authentification
        if (!window.MijoroAuth || !window.MijoroAuth.isAuthenticated) {
          console.warn('[QO] Not authenticated, loading from localStorage only');
          const raw = localStorage.getItem(QO_STORAGE_KEY);
          if (raw) {
            qoProducts = JSON.parse(raw);
          }
          updateCounter();
          return;
        }
        
        const ownerId = window.MijoroAuth.userAccount.id;
        const sb = await ensureSupabase();
        
        // ✅ Load QO for THIS owner only
        const { data, error } = await sb
          .from('quick_order_products')
          .select('*')
          .eq('owner_id', ownerId) // ← FILTRE CRITIQUE
          .order('position');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const allProducts = window.products || [];
          qoProducts = data.map(qo => {
            const product = allProducts.find(p => p.id === qo.product_id);
            return product ? {
              id: product.id,
              title: product.title,
              price: product.price,
              image: product.image?.url || product.thumbnail_url,
              category: product.category,
              addedAt: new Date(qo.added_at).getTime()
            } : null;
          }).filter(Boolean);
          
          console.log('[QO] ✓ Loaded', qoProducts.length, 'products from Supabase');
        }
      } catch (e) {
        console.error('[QO] Load error:', e);
        // Fallback localStorage
        try {
          const raw = localStorage.getItem(QO_STORAGE_KEY);
          if (raw) {
            qoProducts = JSON.parse(raw);
          }
        } catch (_) {}
      }
      
      updateCounter();
    }
    
    function updateCounter() {
      const counter = document.getElementById('qoCounter');
      if (!counter) return;
      
      const count = qoProducts.length;
      const max = 8;
      
      counter.textContent = `${count}/${max}`;
      
      counter.classList.remove('warning', 'full');
      
      if (count >= max) {
        counter.classList.add('full');
      } else if (count >= max - 1) {
        counter.classList.add('warning');
      }
    }
  
  // ========================================
  // MODAL ADD - OPEN/CLOSE
  // ========================================
  
  function openAddModal() {
    if (!isOwner()) {
      alert('Owner uniquement');
      return;
    }
    
    const modal = document.getElementById('qo-add-modal');
    if (!modal) return;
    
    selectedProducts.clear();
    renderModalProducts();
    
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    
    console.log('[QO] Add modal opened');
  }
  
  function closeAddModal() {
    const modal = document.getElementById('qo-add-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
  
  // ========================================
  // MODAL ADD - RENDER PRODUCTS
  // ========================================
  
  function renderModalProducts(searchTerm = '') {
    const container = document.getElementById('qoModalProductsList');
    if (!container) return;
    
    const allProducts = window.products || [];
    const qoProductIds = new Set(qoProducts.map(p => p.id));
    
    // Filter
    const filtered = allProducts.filter(p => {
      const inQO = qoProductIds.has(p.id);
      const matchesSearch = !searchTerm ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase());
      return !inQO && matchesSearch;
    });
    
    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Aucun produit disponible</div>';
      return;
    }
    
    container.innerHTML = filtered.map(p => {
      const price = Number(p.price) || 0;
      const imgUrl = p.image?.url || p.thumbnail_url || 'https://via.placeholder.com/48';
      const selected = selectedProducts.has(p.id);
      
      return `
        <div class="qo-modal-product ${selected ? 'selected' : ''}" data-product-id="${p.id}">
          <img src="${imgUrl}" alt="${p.title}">
          <div class="qo-modal-product-info">
            <div class="qo-modal-product-name">${p.title}</div>
            <div class="qo-modal-product-price">${price > 0 ? price.toLocaleString('fr-FR') + ' AR' : 'Gratuit'}</div>
          </div>
          <div class="qo-modal-product-check">
            <i class="fa-solid fa-check"></i>
          </div>
        </div>
      `;
    }).join('');
    
    // Event delegation
    container.addEventListener('click', handleProductClick);
  }
  
  function handleProductClick(e) {
    const item = e.target.closest('.qo-modal-product');
    if (!item) return;
    
    const productId = item.dataset.productId;
    if (!productId) return;
    
    if (selectedProducts.has(productId)) {
      selectedProducts.delete(productId);
      item.classList.remove('selected');
    } else {
      selectedProducts.add(productId);
      item.classList.add('selected');
    }
  }
  
  // ========================================
  // MODAL ADD - SAVE
  // ========================================
  
  function saveSelectedProducts() {
  if (selectedProducts.size === 0) {
    alert('Veuillez sélectionner au moins un produit');
    return;
  }
  
  const allProducts = window.products || [];
  
  selectedProducts.forEach(id => {
    const product = allProducts.find(p => p.id === id);
    if (product && !qoProducts.find(p => p.id === id)) {
      qoProducts.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image?.url || product.thumbnail_url,
        category: product.category,
        addedAt: Date.now() // ✅ NOUVEAU: Timestamp
      });
    }
  });
    
    saveQOProducts();
closeAddModal();

// Re-render QO
if (typeof QuickOrder !== 'undefined' && QuickOrder.render) {
  QuickOrder.render();
}

// ✅ NOUVEAU: Check if full
const isFull = qoProducts.length >= 8;
if (isFull) {
  alert(`✅ ${selectedProducts.size} produit(s) ajouté(s)\n\n⚠️ Quick Order est complet (8/8)`);
} else {
  alert(`✅ ${selectedProducts.size} produit(s) ajouté(s)`);
}}
  
  // ========================================
  // MODAL MANAGE - OPEN/CLOSE
  // ========================================
  
  function openManageModal() {
    if (!isOwner()) {
      alert('Owner uniquement');
      return;
    }
    
    const modal = document.getElementById('qo-manage-modal');
    if (!modal) return;
    
    renderManageList();
    
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    
    console.log('[QO] Manage modal opened');
  }
  
  function closeManageModal() {
    const modal = document.getElementById('qo-manage-modal');
    if (!modal) return;
    
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  
}
  // ========================================
  // MODAL MANAGE - RENDER LIST
  // ========================================
  
  function renderManageList() {
    const container = document.getElementById('qoManageList');
    

    if (qoProducts.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Aucun produit dans Quick Order</div>';
      return;
    }
    
    container.innerHTML = qoProducts.map((p, index) => {
  const price = Number(p.price) || 0;
  // ✅ NOUVEAU: Check if added in last 24h
  const isNew = p.addedAt && (Date.now() - p.addedAt < 86400000);
  
  return `
    <div class="qo-manage-item" draggable="true" data-index="${index}">
      ${isNew ? '<span class="qo-new-badge">NEW</span>' : ''}
      <div class="qo-manage-drag">
        <i class="fa-solid fa-grip-vertical"></i>
      </div>
      <img src="${p.image || 'https://via.placeholder.com/48'}" alt="${p.title}">
      <div class="qo-manage-item-info">
        <div class="qo-manage-item-name">${p.title}</div>
        <div class="qo-manage-item-price">${price > 0 ? price.toLocaleString('fr-FR') + ' AR' : 'Gratuit'}</div>
      </div>
      <button type="button" class="qo-manage-delete" data-index="${index}">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;
}).join('');
    // Wire events
    wireManageEvents(container);
  }
  
  function wireManageEvents(container) {
    // Delete buttons
    container.querySelectorAll('.qo-manage-delete').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        deleteQOProduct(index);
      });
    });
    
    // Drag & drop
    const items = container.querySelectorAll('.qo-manage-item');
    items.forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
    });
  }
  
  let draggedIndex = null;
  
  function handleDragStart(e) {
    draggedIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
  
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  function handleDrop(e) {
    e.preventDefault();
    const dropIndex = parseInt(this.dataset.index);
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      // Reorder
      const [removed] = qoProducts.splice(draggedIndex, 1);
      qoProducts.splice(dropIndex, 0, removed);
      
      saveQOProducts();
      renderManageList();
      
      // Re-render QO
      if (typeof QuickOrder !== 'undefined' && QuickOrder.render) {
        QuickOrder.render();
      }
    }
  }
  
  function handleDragEnd() {
    this.classList.remove('dragging');
    draggedIndex = null;
  }
  
  // ========================================
  // DELETE PRODUCT
  // ========================================
  
  function deleteQOProduct(index) {
    if (!confirm('Supprimer ce produit du Quick Order?')) return;
    
    qoProducts.splice(index, 1);
    saveQOProducts();
    renderManageList();
    
    // Re-render QO
    if (typeof QuickOrder !== 'undefined' && QuickOrder.render) {
      QuickOrder.render();
    }
    
    console.log('[QO] Product deleted, remaining:', qoProducts.length);
  }
  
  // ========================================
  // CLEAR ALL
  // ========================================
  
  function clearAllQO() {
    if (!confirm('⚠️ Supprimer TOUS les produits du Quick Order?\n\nCette action est irréversible.')) {
      return;
    }
    
    qoProducts = [];
    saveQOProducts();
    renderManageList();
    
    // Re-render QO
    if (typeof QuickOrder !== 'undefined' && QuickOrder.render) {
      QuickOrder.render();
    }
    
    alert('✅ Quick Order vidé');
  }
  
  // ========================================
  // PATCH QUICKORDER MODULE
  // ========================================
  
  function patchQuickOrderRender() {
    if (typeof QuickOrder === 'undefined') {
      console.warn('[QO] QuickOrder module not found, retrying...');
      setTimeout(patchQuickOrderRender, 500);
      return;
    }
    
    const originalRender = QuickOrder.render;
    
    QuickOrder.render = function() {
      const container = document.getElementById('featured-products');
      if (!container) return;
      
      loadQOProducts();
      
      if (qoProducts.length === 0) {
        // Use original render (featured products)
        originalRender.call(this);
        return;
      }
      
      // Render QO products
      const allProducts = window.products || [];
      const featuredProducts = [];
      
      qoProducts.forEach(qoProduct => {
        const fullProduct = allProducts.find(p => p.id === qoProduct.id);
        if (fullProduct) {
          featuredProducts.push(fullProduct);
        }
      });
      
      if (featuredProducts.length === 0) {
        QuickOrder.showEmpty(container);
        return;
      }
      
      container.innerHTML = featuredProducts.map(p => QuickOrder.createProductCard(p)).join('');
      console.log('[QO] ✓ Rendered', featuredProducts.length, 'managed products');
    };
    
    console.log('[QO Management] ✓ QuickOrder patched');
  }
// ========================================
// EXPORT/IMPORT QO ✅
// ========================================

function exportQO() {
  if (qoProducts.length === 0) {
    alert('Aucun produit à exporter');
    return;
  }
  
  try {
    const data = {
      version: '1.0',
      exported: new Date().toISOString(),
      products: qoProducts
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const filename = `quick-order-${new Date().toISOString().split('T')[0]}.json`;
    
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log('[QO] Exported', qoProducts.length, 'products');
    alert(`✅ Exporté: ${filename}\n\n${qoProducts.length} produits`);
    
  } catch (e) {
    console.error('[QO] Export error:', e);
    alert('❌ Erreur lors de l\'export: ' + e.message);
  }
}

function importQO() {
  const fileInput = document.getElementById('qoImportFile');
  if (!fileInput) return;
  
  fileInput.click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.name.endsWith('.json')) {
    alert('❌ Fichier invalide. Utilisez un fichier .json');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      
      // Validate structure
      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Structure invalide');
      }
      
      // Confirm replace
      const confirmMsg = qoProducts.length > 0
        ? `⚠️ Remplacer les ${qoProducts.length} produits actuels par ${data.products.length} produits importés?`
        : `Importer ${data.products.length} produits?`;
      
      if (!confirm(confirmMsg)) {
        return;
      }
      
      // Import
      qoProducts = data.products;
      saveQOProducts();
      
      // Re-render
      if (typeof QuickOrder !== 'undefined' && QuickOrder.render) {
        QuickOrder.render();
      }
      
      console.log('[QO] Imported', qoProducts.length, 'products');
      alert(`✅ Importé avec succès!\n\n${qoProducts.length} produits`);
      
    } catch (e) {
      console.error('[QO] Import error:', e);
      alert('❌ Erreur lors de l\'import: ' + e.message);
    }
  };
  
  reader.onerror = function() {
    alert('❌ Erreur de lecture du fichier');
  };
  
  reader.readAsText(file);
  
  // Reset input
  e.target.value = '';
}
  
  
  // ========================================
  // WIRE BUTTONS
  // ========================================
  
  function wireButtons() {
    // Add button
    const addBtn = document.getElementById('qoAddBtn');
    if (addBtn) {
      addBtn.addEventListener('click', openAddModal);
    }
    
    // Manage button
    const manageBtn = document.getElementById('qoManageBtn');
    if (manageBtn) {
      manageBtn.addEventListener('click', openManageModal);
    }
    
    // ✅ NOUVEAU: Export button
    const exportBtn = document.getElementById('qoExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportQO);
    }
    
    // ✅ NOUVEAU: Import button
    const importBtn = document.getElementById('qoImportBtn');
    if (importBtn) {
      importBtn.addEventListener('click', importQO);
    }
    
    // ✅ NOUVEAU: File input handler
    const fileInput = document.getElementById('qoImportFile');
    if (fileInput) {
      fileInput.addEventListener('change', handleImportFile);
    }
    
    
    // Modal Add - Close buttons
    const addModalClose = document.getElementById('qoModalClose');
    const addCancelBtn = document.getElementById('qoCancelBtn');
    const addSaveBtn = document.getElementById('qoSaveBtn');
    
    if (addModalClose) addModalClose.addEventListener('click', closeAddModal);
    if (addCancelBtn) addCancelBtn.addEventListener('click', closeAddModal);
    if (addSaveBtn) addSaveBtn.addEventListener('click', saveSelectedProducts);
    
    // Modal Manage - Close buttons
    const manageModalClose = document.getElementById('qoManageModalClose');
    const manageCancelBtn = document.getElementById('qoManageCancelBtn');
    const clearAllBtn = document.getElementById('qoClearAllBtn');
    
    if (manageModalClose) manageModalClose.addEventListener('click', closeManageModal);
    if (manageCancelBtn) manageCancelBtn.addEventListener('click', closeManageModal);
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllQO);
    
    // Search in add modal
    const searchInput = document.getElementById('qoSearchProducts');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          renderModalProducts(this.value);
        }, 300);
      });
    }
    
    // Close modals on backdrop click
    const addModal = document.getElementById('qo-add-modal');
    const manageModal = document.getElementById('qo-manage-modal');
    
    if (addModal) {
      addModal.addEventListener('click', function(e) {
        if (e.target === this) closeAddModal();
      });
    }
    
    if (manageModal) {
      manageModal.addEventListener('click', function(e) {
        if (e.target === this) closeManageModal();
      });
    }
    
    // Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeAddModal();
        closeManageModal();
      }
    });
    
    console.log('[QO Management] ✓ Buttons wired');
  }
  // Dans initQOManagement, après wireButtons():
// Dans initQOManagement, après wireButtons():
async function subscribeToQOChanges() {
  try {
    const sb = await ensureSupabase();
    
    sb.channel('qo-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quick_order_products' },
        async (payload) => {
          console.log('[QO Realtime] Change detected:', payload);
          
          // Recharger les produits
          await loadQOProducts();
          
          // Re-render
          if (typeof QuickOrder !== 'undefined' && QuickOrder.render) {
            QuickOrder.render();
          }
        }
      )
      .subscribe();
    
    console.log('[QO] Realtime subscription active');
  } catch (e) {
    console.error('[QO] Realtime error:', e);
  }
}

// Appeler dans init()
subscribeToQOChanges();
  // ========================================
// EXPOSE GLOBAL API
// ========================================

window.QOManagement = {
  openAddModal,
  closeAddModal,
  openManageModal,
  closeManageModal,
  getProducts: () => qoProducts,
  setProducts: (products) => {
    qoProducts = products;
    saveQOProducts();
  },
  saveProducts: saveQOProducts, // ✅ EXPOSE saveQOProducts
  loadProducts: loadQOProducts, // ✅ EXPOSE loadQOProducts
  exportQO,
  importQO
};
  
  // ========================================
  // INIT
  // ========================================
  
  function init() {
    console.log('[QO Management] 🚀 Initializing...');
    
    loadQOProducts();
    updateCounter(); // ✅ NOUVEAU
    wireButtons();
    patchQuickOrderRender();
    
    console.log('[QO Management] ✅ Initialized with', qoProducts.length, 'products');
  }
  
  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  })();
/* ==========================================
   QUICK ORDER - COLLAPSE/EXPAND LOGIC
   ========================================== */

(function initQuickOrderToggle() {
  document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('qoToggle');
    const content = document.getElementById('qoContent');
    
    if (!toggleBtn || !content) {
      console.warn('[QO Toggle] Elements not found');
      return;
    }
    
    let isExpanded = true;
    
    // Load saved state
    try {
      const saved = localStorage.getItem('qo-expanded');
      if (saved !== null) {
        isExpanded = saved === 'true';
        updateUI(false); // No animation on load
      }
    } catch (e) {
      console.warn('[QO Toggle] LocalStorage error:', e);
    }
    
    // Toggle handler
    toggleBtn.addEventListener('click', function() {
      isExpanded = !isExpanded;
      updateUI(true); // With animation
      
      // Save state
      try {
        localStorage.setItem('qo-expanded', String(isExpanded));
      } catch (e) {
        console.warn('[QO Toggle] Save error:', e);
      }
    });
    
    function updateUI(animate) {
      if (!animate) {
        content.style.transition = 'none';
      }
      
      if (isExpanded) {
        // Expand
        toggleBtn.classList.remove('collapsed');
        content.classList.remove('collapsed');
        content.style.maxHeight = content.scrollHeight + 'px';
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.setAttribute('title', 'Réduire');
      } else {
        // Collapse
        toggleBtn.classList.add('collapsed');
        content.classList.add('collapsed');
        content.style.maxHeight = '0px';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('title', 'Agrandir');
      }
      
      if (!animate) {
        setTimeout(() => {
          content.style.transition = '';
        }, 50);
      }
    }
    
    // Recalculate max-height on window resize
    window.addEventListener('resize', function() {
      if (isExpanded) {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
    
    console.log('[QO Toggle] ✓ Initialized');
  });
})();

/* ==========================================
   CART DRAWER - DRAG + COLLAPSE LOGIC ✅
   ========================================== */

(function initCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const iconCollapsed = document.getElementById('cart-icon-collapsed');
    const content = document.getElementById('cart-content');
    const collapseBtn = document.getElementById('cart-collapse-btn');
    const dragHandle = document.getElementById('cart-drag-handle');
  
  if (!drawer || !iconCollapsed || !content || !collapseBtn || !dragHandle) {
    console.warn('[Cart Drawer] Missing elements');
    return;
  }
  
  let isDragging = false;
  let currentX, currentY, initialX, initialY;
  let xOffset = 0, yOffset = 0;
  
  // ✅ Expand drawer (potehana ny icon)
  function expand() {
    drawer.classList.add('expanded');
    drawer.setAttribute('aria-hidden', 'false');
    content.style.display = 'flex';
    iconCollapsed.style.display = 'none';
  }
  
  // ✅ Collapse drawer (potehana ny collapse button)
  function collapse() {
    drawer.classList.remove('expanded');
    drawer.setAttribute('aria-hidden', 'true');
    content.style.display = 'none';
    iconCollapsed.style.display = 'flex';
  }
  
  // ✅ Click ny icon -> expand
  iconCollapsed.addEventListener('click', function(e) {
    if (!isDragging) {
      expand();
    }
  });
  
  // ✅ Click ny collapse button -> collapse
  collapseBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    collapse();
  });
  

})();
// ✅ PATCH: Shop section - Numeric + Physical products toggle

(function addPhysicalProductsTab() {
  'use strict';
  
  document.addEventListener('DOMContentLoaded', function() {
    const filters = document.getElementById('filters');
    if (!filters) {
      console.warn('[Physical Products] Filters container not found');
      return;
    }
    
    // ✅ STEP 1: Add Physical/Numeric toggle buttons BEFORE other filters
    const toggleButtons = document.createElement('div');
    toggleButtons.className = 'product-type-toggle';
    toggleButtons.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:10px';
    toggleButtons.setAttribute('role', 'tablist');
    toggleButtons.innerHTML = `
      <button type="button" 
              class="type-toggle-btn active" 
              data-product-type="numeric"
              role="tab"
              aria-selected="true"
              style="flex:1;padding:10px;border:1px solid rgba(59,130,246,.3);background:linear-gradient(135deg,rgba(59,130,246,.15),rgba(37,99,235,.1));color:#3b82f6;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.2s ease">
        <i class="fa-solid fa-laptop-code"></i>
        <span>Produits Numériques</span>
      </button>
      
      <button type="button" 
              class="type-toggle-btn" 
              data-product-type="physical"
              role="tab"
              aria-selected="false"
              style="flex:1;padding:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#94a3b8;border-radius:10px;font-weight:700;cursor:pointer;transition:all 0.2s ease">
        <i class="fa-solid fa-box"></i>
        <span>Produits Physiques</span>
      </button>
    `;
    
    // Insert BEFORE filters
    filters.parentNode.insertBefore(toggleButtons, filters);
    
    // ✅ STEP 2: Add state management
    let currentProductType = 'numeric'; // Default: numeric
    
    // ✅ STEP 3: Update filter categories based on product type
    function updateFilterButtons(productType) {
      currentProductType = productType;
      
      const filterButtons = filters.querySelectorAll('.filter-btn');
      
      if (productType === 'numeric') {
        // Show numeric categories
        filters.innerHTML = `
          <button type="button" class="filter-btn active" data-category="all">Tous</button>
          <button type="button" class="filter-btn" data-category="ebooks">Ebooks</button>
          <button type="button" class="filter-btn" data-category="videos">Vidéos</button>
          <button type="button" class="filter-btn" data-category="vip">VIP</button>
          <button type="button" class="filter-btn" data-category="promo">Promo</button>
          <button type="button" class="filter-btn" data-category="free">Gratuit</button>
        `;
      } else {
        // Show physical categories
        filters.innerHTML = `
          <button type="button" class="filter-btn active" data-category="all">Tous</button>
          <button type="button" class="filter-btn" data-category="clothing">Vêtements</button>
          <button type="button" class="filter-btn" data-category="electronics">Électronique</button>
          <button type="button" class="filter-btn" data-category="accessories">Accessoires</button>
          <button type="button" class="filter-btn" data-category="books">Livres</button>
          <button type="button" class="filter-btn" data-category="other">Autre</button>
        `;
      }
      
      // Re-wire filter buttons click events
      wireFilterButtons();
      
      // Trigger render
      renderProducts('all', document.getElementById('search')?.value || '');
    }
    
    // ✅ STEP 4: Wire filter buttons (après update)
    function wireFilterButtons() {
      const filterBtns = filters.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          filterBtns.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          
          const category = this.getAttribute('data-category');
          const search = document.getElementById('search')?.value || '';
          renderProducts(category, search);
        });
      });
    }
    
    // ✅ STEP 5: Toggle button click handlers
    const toggleBtns = toggleButtons.querySelectorAll('.type-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const productType = this.getAttribute('data-product-type');
        
        // Update UI
        toggleBtns.forEach(b => {
          if (b === this) {
            b.classList.add('active');
            b.setAttribute('aria-selected', 'true');
            b.style.border = '1px solid rgba(59,130,246,.3)';
            b.style.background = 'linear-gradient(135deg,rgba(59,130,246,.15),rgba(37,99,235,.1))';
            b.style.color = '#3b82f6';
          } else {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
            b.style.border = '1px solid rgba(255,255,255,.1)';
            b.style.background = 'rgba(255,255,255,.03)';
            b.style.color = '#94a3b8';
          }
        });
        
        // Update filters and render
        updateFilterButtons(productType);
      });
    });
    
    // ✅ STEP 6: Patch renderProducts to filter by product type
    const originalRenderProducts = window.renderProducts;
    if (typeof originalRenderProducts === 'function') {
      window.renderProducts = function(filter, search) {
        // Get product type
        const productType = currentProductType || 'numeric';
        
        // Filter products by type
        const allProducts = window.products || [];
        const typeFilteredProducts = allProducts.filter(p => {
          const pType = p.product_type || p._db?.product_type || 'numeric';
          return pType === productType;
        });
        
        // Temporarily replace window.products
        const originalProducts = window.products;
        window.products = typeFilteredProducts;
        
        // Call original render
        originalRenderProducts.call(this, filter, search);
        
        // Restore original products
        window.products = originalProducts;
      };
    }
    
    // ✅ STEP 7: Patch product modal to support physical products
    const originalPeOpen = window.peOpen;
    if (typeof originalPeOpen === 'function') {
      // Déjà géré dans le modal existant via le champ product_type
    }
    
    // ✅ Initial wire
    wireFilterButtons();
    
    console.log('[Physical Products] ✓ Toggle system initialized');
  });
})();

// ✅ PATCH: Update product modal to include product_type field
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('product-edit-modal');
  if (!modal) return;
  
  const form = modal.querySelector('#pe-form');
  if (!form) return;
  
  // Find category select
  const categorySelect = form.querySelector('#pe-category');
  if (!categorySelect) return;
  
  // Add product type field BEFORE category
  const productTypeField = document.createElement('label');
  productTypeField.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  productTypeField.innerHTML = `
    <span>Type de produit</span>
    <select id="pe-product-type" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
      <option value="numeric">Numérique</option>
      <option value="physical">Physique</option>
    </select>
  `;
  
  categorySelect.parentElement.parentElement.insertBefore(productTypeField, categorySelect.parentElement);
  
  // ✅ Update peOpen to load product_type
  const originalPeOpen = window.peOpen;
  if (typeof originalPeOpen === 'function') {
    window.peOpen = function(options) {
      originalPeOpen.call(this, options);
      
      // Set product type if editing
      const product = options?.product;
      const productTypeSelect = document.getElementById('pe-product-type');
      if (productTypeSelect && product) {
        productTypeSelect.value = product.product_type || product._db?.product_type || 'numeric';
      }
    };
  }
  
  // ✅ Update peSubmitForm to save product_type
  const originalPeSubmitForm = window.peSubmitForm;
  if (typeof originalPeSubmitForm === 'function') {
    window.peSubmitForm = async function() {
      const productTypeSelect = document.getElementById('pe-product-type');
      const productType = productTypeSelect?.value || 'numeric';
      
      // Add to payload (sera géré dans la version patchée)
      const originalPayloadBuilder = this;
      
      await originalPeSubmitForm.call(this);
    };
  }
  
  console.log('[Physical Products] ✓ Modal patched');
});

// ✅ CSS pour les toggle buttons
if (!document.getElementById('physical-products-styles')) {
  const styles = document.createElement('style');
  styles.id = 'physical-products-styles';
  styles.textContent = `
    .type-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
    }
    
    .type-toggle-btn i {
      font-size: 16px;
    }
    
    .type-toggle-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,.2);
    }
    
    .type-toggle-btn:active {
      transform: translateY(0);
    }
    
    /* Responsive */
    @media (max-width: 480px) {
      .product-type-toggle {
        flex-direction: column !important;
      }
      
      .type-toggle-btn span {
        font-size: 13px;
      }
    }
  `;
  document.head.appendChild(styles);
} // ✅ Fonction pour ajouter un produit numérique
async function addProductPrompt() {
  peOpen({ mode: 'add', product: null, productType: 'numeric' });
}

// ✅ Fonction pour ajouter un produit physique
async function addPhysicalProductPrompt() {
  peOpen({ mode: 'add', product: null, productType: 'physical' });
}

// Expose globalement
window.addProductPrompt = addProductPrompt;
window.addPhysicalProductPrompt = addPhysicalProductPrompt;document.addEventListener('DOMContentLoaded', function () {
  const login = document.getElementById('btnLogin');
  const logout = document.getElementById('btnLogout');
  const addBtn = document.getElementById('btnAddProduct');
  const addPhysicalBtn = document.getElementById('btnAddPhysical'); // ✅ NOUVEAU

  if (login) login.addEventListener('click', openOwnerLoginModal);
  if (logout) logout.addEventListener('click', signOutOwner);
  if (addBtn) addBtn.addEventListener('click', addProductPrompt);
  if (addPhysicalBtn) addPhysicalBtn.addEventListener('click', addPhysicalProductPrompt); // ✅ NOUVEAU

  initAuth();
  fetchSupabaseProducts();
});
/* ==========================================
   DESKTOP NAVIGATION WIRING
   ========================================== */

document.addEventListener('DOMContentLoaded', function() {
  const desktopNav = document.querySelector('.desktop-nav');
  if (!desktopNav) return;
  
  // Navigation buttons
  const navBtns = desktopNav.querySelectorAll('.desktop-nav-btn[data-section]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const section = this.getAttribute('data-section');
      
      // Update active state
      navBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Show section
      if (typeof showSection === 'function') {
        showSection(section, this);
      }
    });
  });
  
  // Cart button
  const cartBtn = document.getElementById('desktop-cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', function() {
      if (typeof window.CartAPI !== 'undefined') {
        window.CartAPI.open();
      }
    });
  }
  
  // Notifications button
  const notifBtn = document.getElementById('desktop-notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', function() {
      // TODO: Implement notifications panel
      alert('Notifications (à venir)');
    });
  }
  
  // Params button
  const paramsBtn = desktopNav.querySelector('[data-section="params"]');
  if (paramsBtn) {
    paramsBtn.addEventListener('click', function() {
      if (typeof toggleParamFixed === 'function') {
        toggleParamFixed();
      }
    });
  }
  
  // Sync cart badge with CartAPI
  if (typeof window.CartAPI !== 'undefined') {
    const originalUpdateUI = window.CartAPI.state ? 
      Object.getOwnPropertyDescriptor(window.CartAPI.__proto__, 'updateUI') : null;
    
    // Patch updateUI to sync desktop badge
    const syncDesktopBadge = function() {
      const count = window.CartAPI.state.items.size || 0;
      const badge = document.getElementById('desktop-cart-count');
      if (badge) {
        badge.textContent = String(count);
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
      }
    };
    
    // Call on cart changes
    const observer = new MutationObserver(syncDesktopBadge);
    const cdBadge = document.getElementById('cdCartBadge');
    if (cdBadge) {
      observer.observe(cdBadge, { 
        childList: true, 
        characterData: true, 
        subtree: true 
      });
    }
    
    // Initial sync
    syncDesktopBadge();
  }});
/* ==========================================
   MODE SWITCHER (Desktop/Mobile) ✅
   ========================================== */

(function initModeSwitcher() {
  'use strict';
  
  const MODE_KEY = 'display-mode';
  const DESKTOP_BREAKPOINT = 1024;
  
  // State
  let currentMode = 'mobile'; // Par défaut: mobile
  
  // Load saved mode
  function loadSavedMode() {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved && (saved === 'mobile' || saved === 'desktop')) {
        currentMode = saved;
      }
    } catch (e) {
      console.warn('[Mode Switcher] LocalStorage error:', e);
    }
  }
  
  // Save mode
  function saveMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (e) {
      console.warn('[Mode Switcher] Save error:', e);
    }
  }
  
  // Apply mode
  function applyMode(mode, animate = true) {
    currentMode = mode;
    
    console.log('[Mode Switcher] Applying mode:', mode);
    
    // Update body class
    document.body.classList.remove('force-mobile', 'force-desktop');
    document.body.classList.add('force-' + mode);
    
    // Update viewport meta (important pour mobile/desktop)
    updateViewport(mode);
    
    // Update UI buttons
    updateButtonsUI(mode);
    
    // Update info label
    updateInfoLabel(mode);
    
    // Save
    saveMode(mode);
    
    // Show feedback
    if (animate) {
      showModeToast(mode);
    }
    
    console.log('[Mode Switcher] ✓ Mode applied:', mode);
  }
  
  // Update viewport meta
  function updateViewport(mode) {
    let viewport = document.querySelector('meta[name="viewport"]');
    
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    if (mode === 'desktop') {
      // Desktop: width fixe 1024px minimum
      viewport.content = 'width=1024, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    } else {
      // Mobile: responsive normal
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
  }
  
  // Update buttons UI
  function updateButtonsUI(mode) {
    const buttons = document.querySelectorAll('.mode-switch-btn');
    
    buttons.forEach(btn => {
      const btnMode = btn.getAttribute('data-mode');
      const isActive = btnMode === mode;
      
      if (isActive) {
        btn.classList.add('active');
        btn.style.border = '2px solid rgba(59,130,246,.3)';
        btn.style.background = 'linear-gradient(135deg,rgba(59,130,246,.15),rgba(37,99,235,.1))';
        
        const icon = btn.querySelector('i');
        const text = btn.querySelector('span:not(small)');
        if (icon) icon.style.color = '#3b82f6';
        if (text) text.style.color = '#3b82f6';
      } else {
        btn.classList.remove('active');
        btn.style.border = '2px solid rgba(255,255,255,.1)';
        btn.style.background = 'rgba(255,255,255,.03)';
        
        const icon = btn.querySelector('i');
        const text = btn.querySelector('span:not(small)');
        if (icon) icon.style.color = '#94a3b8';
        if (text) text.style.color = '#94a3b8';
      }
    });
  }
  
  // Update info label
  function updateInfoLabel(mode) {
    const label = document.getElementById('mode-label');
    if (!label) return;
    
    label.textContent = mode === 'mobile' ? 'Mobile' : 'Desktop';
  }
  
  // Show toast notification
  function showModeToast(mode) {
    // Remove existing toasts
    document.querySelectorAll('.mode-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = 'mode-toast';
    
    const icon = mode === 'mobile' ? 
      '<i class="fa-solid fa-mobile-screen-button"></i>' : 
      '<i class="fa-solid fa-desktop"></i>';
    
    const text = mode === 'mobile' ? 
      'Mode Mobile activé' : 
      'Mode Desktop activé';
    
    toast.innerHTML = icon + ' ' + text;
    
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 14px;
      z-index: 9999;
      animation: modeToastIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'modeToastOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
  
  // Wire button clicks
  function wireButtons() {
    const buttons = document.querySelectorAll('.mode-switch-btn');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', function() {
        const mode = this.getAttribute('data-mode');
        if (mode && mode !== currentMode) {
          applyMode(mode, true);
        }
      });
    });
  }
  
  // Initialize
  function init() {
    console.log('[Mode Switcher] Initializing...');
    
    // Load saved mode
    loadSavedMode();
    
    // Apply mode (no animation on load)
    applyMode(currentMode, false);
    
    // Wire buttons
    wireButtons();
    
    console.log('[Mode Switcher] ✓ Initialized, mode:', currentMode);
  }
  
  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Expose globally
  window.ModeSwitcher = {
    getCurrentMode: () => currentMode,
    setMode: (mode) => applyMode(mode, true),
    toggleMode: () => applyMode(currentMode === 'mobile' ? 'desktop' : 'mobile', true)
  };
  
})();
/* ========================================
   FIX: Card Actions Click Handler
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  // ✅ Event delegation with proper stopPropagation
  function delegateCardActions(e) {
    // Ignore clicks on image
    if (e.target.tagName === 'IMG') {
      e.stopPropagation();
      return;
    }
    
    var card = e.target.closest('.product-card');
    if (!card) return;
    
    var id = card.getAttribute('data-id');
    var p = (window.products || []).find(x => x.id === id);
    if (!p) return;
    
    // ✅ Like button (highest priority)
    var likeBtn = e.target.closest('.icon-like');
    if (likeBtn) {
      e.preventDefault();
      e.stopPropagation();
      var productId = likeBtn.getAttribute('data-product-id') || 
                      likeBtn.closest('.like-wrapper').querySelector('.icon-like').getAttribute('data-product-id');
      if (productId && typeof toggleLike === 'function') {
        toggleLike(productId);
      }
      return;
    }
    
    // ✅ Info button
    var infoBtn = e.target.closest('.icon-info');
    if (infoBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof showProduct === 'function') {
        showProduct(id);
      }
      return;
    }
    
    // ✅ Buy button
    var buyBtn = e.target.closest('.icon-buy');
    if (buyBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof buyOrRead === 'function') {
        buyOrRead(p);
      }
      return;
    }
    
    // ✅ Read/Preview button
    var readBtn = e.target.closest('.icon-read');
    if (readBtn) {
      e.preventDefault();
      e.stopPropagation();
      var previewUrl = p.preview_url || (p._db && p._db.preview_url);
      if (previewUrl && typeof openPreview === 'function') {
        openPreview(p);
      } else if (typeof openWhatsAppMessage === 'function' && typeof buildWAProductMessage === 'function') {
        openWhatsAppMessage(buildWAProductMessage(p, 'read'));
      }
      return;
    }
    
    // ✅ Owner tools (edit/delete)
    var toolBtn = e.target.closest('.owner-tool');
    if (toolBtn) {
      e.preventDefault();
      e.stopPropagation();
      var tool = toolBtn.getAttribute('data-tool');
      if (tool === 'edit' && typeof editProductPrompt === 'function') {
        editProductPrompt(id);
      } else if (tool === 'delete' && typeof deleteProductConfirm === 'function') {
        deleteProductConfirm(id);
      }
      return;
    }
  }
  
  // Wire to products containers
  var containers = [
    document.getElementById('products-row'),
    document.getElementById('products-box')
  ];
  
  containers.forEach(function(container) {
    if (container) {
      // Remove old listeners
      var newContainer = container.cloneNode(false);
      while (container.firstChild) {
        newContainer.appendChild(container.firstChild);
      }
      container.parentNode.replaceChild(newContainer, container);
      
      // Add new listener
      newContainer.addEventListener('click', delegateCardActions, { capture: true });
      
      console.log('[Card Actions] ✓ Wired:', newContainer.id);
    }
  });
});
/* ==========================================
   INTELLIGENT THEME SYSTEM - PROFESSIONAL
   ========================================== */

(function initAdvancedThemeSystem() {
  'use strict';
  
  const THEME_KEY = 'settings:theme';
  const THEMES = ['dark', 'light'];
  
  // State management
  let currentTheme = 'dark';
  let isTransitioning = false;
  
  // ========================================
  // INITIALIZATION
  // ========================================
  
  function init() {
    console.log('[Theme] 🎨 Initializing advanced theme system...');
    
    // Load saved theme
    loadSavedTheme();
    
    // Apply theme
    applyTheme(currentTheme, false);
    
    // Wire buttons
    wireThemeButtons();
    
    // Auto-detect system preference
    detectSystemPreference();
    
    // Listen to system changes
    watchSystemPreference();
    
    console.log('[Theme] ✓ Theme system initialized:', currentTheme);
  }
  
  // ========================================
  // LOAD/SAVE
  // ========================================
  
  function loadSavedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved && THEMES.includes(saved)) {
        currentTheme = saved;
        console.log('[Theme] ✓ Loaded saved theme:', currentTheme);
      }
    } catch (e) {
      console.warn('[Theme] ⚠️ LocalStorage error:', e);
    }
  }
  
  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
      console.log('[Theme] ✓ Theme saved:', theme);
    } catch (e) {
      console.warn('[Theme] ⚠️ Save error:', e);
    }
  }
  
  // ========================================
  // APPLY THEME (avec animation)
  // ========================================
  
  function applyTheme(theme, animate = true) {
    if (isTransitioning) {
      console.log('[Theme] ⏭️ Transition in progress, skipping...');
      return;
    }
    
    if (!THEMES.includes(theme)) {
      console.warn('[Theme] ⚠️ Invalid theme:', theme);
      theme = 'dark';
    }
    
    currentTheme = theme;
    
    console.log('[Theme] 🎨 Applying theme:', theme, 'animate:', animate);
    
    if (animate) {
      // Animation smooth
      isTransitioning = true;
      document.body.classList.add('theme-switching');
      
      // Timeout pour animation
      setTimeout(() => {
        setThemeAttributes(theme);
        
        setTimeout(() => {
          document.body.classList.remove('theme-switching');
          isTransitioning = false;
        }, 400);
      }, 50);
    } else {
      setThemeAttributes(theme);
    }
    
    // Save
    saveTheme(theme);
    
    // Update UI
    updateThemeButtons(theme);
    
    // Show feedback (raha animate)
    if (animate) {
      showThemeToast(theme);
    }
  }
  
  function setThemeAttributes(theme) {
    // Set data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Update meta theme-color
    updateMetaThemeColor(theme);
    
    console.log('[Theme] ✓ Theme attributes set:', theme);
  }
  
  function updateMetaThemeColor(theme) {
    let color = theme === 'light' ? '#f8fafc' : '#0a0e17';
    
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    
    meta.content = color;
  }
  
  // ========================================
  // UI UPDATES
  // ========================================
  
  function updateThemeButtons(theme) {
    const buttons = document.querySelectorAll('.option-card[data-theme]');
    
    buttons.forEach(btn => {
      const btnTheme = btn.getAttribute('data-theme');
      const isActive = btnTheme === theme;
      
      if (isActive) {
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      }
    });
    
    console.log('[Theme] ✓ Buttons updated');
  }
  
  function showThemeToast(theme) {
    // Remove existing toasts
    document.querySelectorAll('.theme-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = 'theme-toast';
    
    const icon = theme === 'light' ? 
      '<i class="fa-solid fa-sun"></i>' : 
      '<i class="fa-solid fa-moon"></i>';
    
    const text = theme === 'light' ? 
      'Mode Clair activé' : 
      'Mode Sombre activé';
    
    toast.innerHTML = icon + ' ' + text;
    
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 14px;
      z-index: 9999;
      animation: themeToastIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'themeToastOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
  
  // ========================================
  // WIRE BUTTONS
  // ========================================
  
  function wireThemeButtons() {
    const buttons = document.querySelectorAll('.option-card[data-theme]');
    
    buttons.forEach(btn => {
      // Remove old listeners
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      // Add new listener
      newBtn.addEventListener('click', function() {
        const theme = this.getAttribute('data-theme');
        if (theme && theme !== currentTheme) {
          applyTheme(theme, true);
        }
      });
    });
    
    console.log('[Theme] ✓ Buttons wired:', buttons.length);
  }
  
  // ========================================
  // SYSTEM PREFERENCE DETECTION
  // ========================================
  
  function detectSystemPreference() {
    if (!window.matchMedia) return;
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    
    console.log('[Theme] 📱 System preference detected:', 
      prefersDark ? 'dark' : prefersLight ? 'light' : 'none');
    
    // Ne change que si aucun thème sauvegardé
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (!saved) {
        const systemTheme = prefersDark ? 'dark' : 'light';
        console.log('[Theme] 🔄 Applying system theme:', systemTheme);
        applyTheme(systemTheme, false);
      }
    } catch (e) {}
  }
  
  function watchSystemPreference() {
    if (!window.matchMedia) return;
    
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeQuery.addEventListener('change', (e) => {
      console.log('[Theme] 🔄 System preference changed:', e.matches ? 'dark' : 'light');
      
      // Option: Proposer à l'user de changer
      // Pour l'instant: log seulement
    });
  }
  
  // ========================================
  // PUBLIC API
  // ========================================
  
  window.ThemeSystem = {
    getCurrentTheme: () => currentTheme,
    setTheme: (theme) => applyTheme(theme, true),
    toggleTheme: () => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme, true);
    }
  };
  
  // ========================================
  // AUTO-INIT
  // ========================================
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();

/* ==========================================
   TOAST ANIMATIONS
   ========================================== */

if (!document.getElementById('theme-toast-styles')) {
  const styles = document.createElement('style');
  styles.id = 'theme-toast-styles';
  styles.textContent = `
    @keyframes themeToastIn {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes themeToastOut {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    }
  `;
  document.head.appendChild(styles);
}/* ==========================================
   RE-OBSERVE IMAGES AFTER RENDER
   ========================================== */

(function patchRenderForImages() {
  const originalRender = window.renderProducts;
  if (typeof originalRender !== 'function') return;
  
  window.renderProducts = function(filter, search) {
    originalRender.call(this, filter, search);
    
    // Re-observe new images
    setTimeout(() => {
      const newImages = document.querySelectorAll('.lazy-img:not(.observed)');
      newImages.forEach(img => {
        img.classList.add('observed');
        if (window.imageObserver) {
          window.imageObserver.observe(img);
        }
      });
    }, 100);
  };
})();

// ========================================
// LOADER ANIMATION STYLES
// ========================================

if (!document.getElementById('loader-styles')) {
  var styles = document.createElement('style');
  styles.id = 'loader-styles';
  styles.textContent = 
    '@keyframes spin {' +
    '  from { transform: rotate(0deg); }' +
    '  to { transform: rotate(360deg); }' +
    '}';
  document.head.appendChild(styles);
}/* ==========================================
   PRODUCT MODAL - VERSION COMPLÈTE CORRIGÉE ✅
   ========================================== */

(function initProductModalSystem() {
  'use strict';
  
  // ========================================
  // GLOBAL STATE
  // ========================================
  
  window.peLocal = {
  imageFile: null,
  previewFile: null,
  galleryFiles: [],
  existingGalleryIds: [], // ← NOUVELLE LIGNE
  mode: 'add',
  recordId: null
};
  
  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  function detectAssetKind(file) {
    const type = (file && file.type) ? file.type.toLowerCase() : '';
    if (type.startsWith('image/')) return { kind: 'image', folder: 'images' };
    if (type.startsWith('video/')) return { kind: 'video', folder: 'videos' };
    if (type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')) return { kind: 'pdf', folder: 'pdfs' };
    return { kind: 'file', folder: 'files' };
  }
  
  async function uploadAssets(files) {
    const sb = await ensureSupabase();
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const { kind, folder } = detectAssetKind(f);
      const safeName = (f.name || 'file').replace(/[^\w.\-]+/g, '_');
      const path = `${folder}/${crypto.randomUUID()}_${safeName}`;
      const { data, error } = await sb.storage.from('products').upload(path, f, {
        cacheControl: '3600',
        upsert: false,
        contentType: f.type || undefined
      });
      if (error) throw error;
      const { data: pub } = sb.storage.from('products').getPublicUrl(data.path);
      out.push({ kind, name: f.name, path: data.path, url: pub.publicUrl });
    }
    return out;
  }
  
  function pickFiles({ multiple = true } = {}) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = multiple;
      input.accept = 'image/*,video/*,application/pdf';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = () => {
        const files = Array.from(input.files || []);
        input.remove();
        resolve(files);
      };
      input.click();
    });
  }
  
  // ========================================
  // MODAL CREATION
  // ========================================
  
  function ensureProductModal() {
    let modal = document.getElementById('product-edit-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'product-edit-modal';
    modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:6000;';
    modal.innerHTML = `
      <div class="pe-card" role="dialog" aria-modal="true" aria-labelledby="pe-title" style="
        width:min(720px,94%);background:#0e0f13;color:#fff;border-radius:14px;padding:14px 14px 12px;box-shadow:0 10px 35px rgba(0,0,0,.4);max-height:90vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
          <h3 id="pe-title" style="margin:0">Product</h3>
          <button type="button" class="param-btn" id="pe-close" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <form id="pe-form" style="display:grid;gap:10px">
          <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
            
            <!-- TYPE DE PRODUIT -->
            <label style="grid-column:1/-1;display:flex;flex-direction:column;gap:6px">
              <span style="font-weight:700;font-size:15px">Type de produit</span>
              <select id="pe-product-type" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff;font-size:14px">
                <option value="numeric">💻 Numérique (eBooks, vidéos, apps)</option>
                <option value="physical">📦 Physique (vêtements, électronique, etc.)</option>
              </select>
            </label>
            
            <!-- TITRE -->
            <label style="display:flex;flex-direction:column;gap:6px">
              <span>Titre</span>
              <input id="pe-title-input" required placeholder="Titre du produit" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
            </label>

            <!-- PRIX -->
            <label style="display:flex;flex-direction:column;gap:6px">
              <span>Prix (AR)</span>
              <input id="pe-price-input" type="number" min="0" step="1" placeholder="0" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
            </label>

            <!-- CATÉGORIE -->
            <label style="display:flex;flex-direction:column;gap:6px">
              <span>Catégorie</span>
              <select id="pe-category" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
                <!-- Rempli dynamiquement -->
              </select>
            </label>

            <!-- BADGE -->
            <label style="display:flex;flex-direction:column;gap:6px">
              <span>Badge (optionnel)</span>
              <input id="pe-badge" placeholder="ex: Hot, New..." style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
            </label>

            <!-- TAGS -->
            <label style="grid-column:1 / -1;display:flex;flex-direction:column;gap:6px">
              <span>Tags (séparés par des virgules)</span>
              <input id="pe-tags" placeholder="business, mobile, formation" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
            </label>

            <!-- DESCRIPTION -->
            <label style="grid-column:1 / -1;display:flex;flex-direction:column;gap:6px">
              <span>Description</span>
              <textarea id="pe-description" rows="3" placeholder="Description du produit" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff;resize:vertical"></textarea>
            </label>
          </div>

          <!-- UPLOAD SECTIONS -->
          <div style="display:flex;flex-direction:column;gap:12px">
            
            <!-- IMAGE PRINCIPALE -->
            <div class="pe-uploader" style="border:1px dashed #2a2d38;border-radius:12px;padding:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong>🖼️ Image principale (thumbnail)</strong>
                <button class="param-btn" type="button" id="pe-pick-thumbnail">
                  <i class="fa-solid fa-image"></i> Choisir
                </button>
              </div>
              <div id="pe-thumbnail-preview" style="border:1px solid #2a2d38;border-radius:10px;min-height:120px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#11151f">
                <span style="opacity:.6">Aucune image</span>
              </div>
              <input type="file" id="pe-thumbnail-input" accept="image/*" style="display:none">
            </div>

            <!-- GALERIE -->
            <div class="pe-uploader" style="border:1px dashed #2a2d38;border-radius:12px;padding:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong>📸 Galerie (max 5 images)</strong>
                <button class="param-btn" type="button" id="pe-pick-gallery">
                  <i class="fa-solid fa-images"></i> Ajouter
                </button>
              </div>
              <div id="pe-gallery-preview" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;min-height:80px">
                <span style="opacity:.6;grid-column:1/-1;text-align:center;padding:20px">Aucune image</span>
              </div>
              <input type="file" id="pe-gallery-input" accept="image/*" multiple style="display:none">
            </div>

            <!-- PREVIEW (Vidéo/PDF) -->
            <div class="pe-uploader" data-kind="preview" id="pe-preview-uploader" style="border:1px dashed #2a2d38;border-radius:12px;padding:10px;min-height:160px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong>🎬 Preview (Vidéo/PDF)</strong>
                <button class="param-btn" type="button" id="pe-pick-preview">
                  <i class="fa-solid fa-upload"></i> Choisir
                </button>
              </div>
              <small style="opacity:.8;display:block;margin-bottom:8px">Vidéo (mp4/webm) na PDF.</small>
              <div id="pe-preview-preview" style="border:1px solid #2a2d38;border-radius:10px;min-height:110px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#11151f">
                <span style="opacity:.6">Tsy misy vidéo/PDF</span>
              </div>
            </div>
            
          </div>

          <!-- PREVIEW URL -->
          <div id="pe-preview-url-container" style="display:flex;gap:8px;align-items:center">
            <input id="pe-preview-url" placeholder="na URL preview: https://..." style="flex:1;padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
            <button class="param-btn" type="button" id="pe-test-preview"><i class="fa-solid fa-eye"></i> Test</button>
          </div>

          <!-- BUTTONS -->
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
            <button class="param-btn" type="button" id="pe-cancel">Annuler</button>
            <button class="param-btn" type="submit" id="pe-submit"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button>
          </div>
        </form>
      </div>
    `;
    
    // ✅ ÉTAPE 1: Ajouter au DOM
    document.body.appendChild(modal);
    
    // ✅ ÉTAPE 2: Wire events APRÈS un tick
    setTimeout(() => {
      wireModalEvents(modal);
    }, 0);
    
    return modal;
  }
  
  // ========================================
  // WIRE EVENTS (appelé APRÈS appendChild)
  // ========================================
  
  function wireModalEvents(modal) {
    console.log('[Modal] 🔌 Wiring events...');
    
    // Close buttons
    const closeBtn = modal.querySelector('#pe-close');
    const cancelBtn = modal.querySelector('#pe-cancel');
    
    if (closeBtn) closeBtn.addEventListener('click', peClose);
    if (cancelBtn) cancelBtn.addEventListener('click', peClose);
    
    // Product type change
    const productTypeSelect = modal.querySelector('#pe-product-type');
    const categorySelect = modal.querySelector('#pe-category');
    const previewUploader = modal.querySelector('#pe-preview-uploader');
    const previewUrlContainer = modal.querySelector('#pe-preview-url-container');

    const categoryOptions = {
      numeric: [
        { value: 'ebooks', label: 'eBooks' },
        { value: 'videos', label: 'Vidéos' },
        { value: 'apps', label: 'Apps/Jeux' },
        { value: 'vip', label: 'VIP' },
        { value: 'promo', label: 'Promo' },
        { value: 'free', label: 'Gratuit' }
      ],
      physical: [
        { value: 'clothing', label: '👕 Vêtements' },
        { value: 'electronics', label: '📱 Électronique' },
        { value: 'accessories', label: '💍 Accessoires' },
        { value: 'books', label: '📚 Livres physiques' },
        { value: 'home', label: '🏠 Maison & Déco' },
        { value: 'sports', label: '⚽ Sports & Loisirs' },
        { value: 'beauty', label: '💄 Beauté & Santé' },
        { value: 'other', label: '📦 Autre' }
      ]
    };

    function updateCategories(productType) {
      if (!categorySelect) return;
      
      const options = categoryOptions[productType] || categoryOptions.numeric;
      const currentValue = categorySelect.value;
      
      categorySelect.innerHTML = '';
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        categorySelect.appendChild(option);
      });

      const optionExists = options.find(opt => opt.value === currentValue);
      if (optionExists) {
        categorySelect.value = currentValue;
      } else {
        categorySelect.value = options[0].value;
      }

      if (previewUploader && previewUrlContainer) {
        if (productType === 'physical') {
          previewUploader.style.display = 'none';
          previewUrlContainer.style.display = 'none';
        } else {
          previewUploader.style.display = '';
          previewUrlContainer.style.display = '';
        }
      }
    }

    if (productTypeSelect) {
      productTypeSelect.addEventListener('change', function() {
        updateCategories(this.value);
      });
      updateCategories('numeric');
    }

    // Thumbnail picker
    const thumbnailBtn = modal.querySelector('#pe-pick-thumbnail');
    const thumbnailInput = modal.querySelector('#pe-thumbnail-input');
    const thumbnailPreview = modal.querySelector('#pe-thumbnail-preview');

    if (thumbnailBtn && thumbnailInput && thumbnailPreview) {
      thumbnailBtn.addEventListener('click', () => {
        thumbnailInput.click();
      });
      
      thumbnailInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          const file = this.files[0];
          
          if (!file.type.startsWith('image/')) {
            alert('Safidio sary ihany');
            return;
          }
          
          if (file.size > 5 * 1024 * 1024) {
            alert('Lehibe loatra ny sary (max 5MB)');
            return;
          }
          
          window.peLocal.imageFile = file;
          
          const url = URL.createObjectURL(file);
          thumbnailPreview.innerHTML = `<img src="${url}" style="width:100%;height:auto;max-height:120px;object-fit:contain">`;
          
          console.log('[Modal] ✅ Thumbnail selected:', file.name);
        }
      });
    }

    // Gallery picker
    const galleryBtn = modal.querySelector('#pe-pick-gallery');
    const galleryInput = modal.querySelector('#pe-gallery-input');

    if (galleryBtn && galleryInput) {
      galleryBtn.addEventListener('click', () => {
        galleryInput.click();
      });
      
      galleryInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
          console.log('[Modal] Gallery files selected:', this.files.length);
          peSetGalleryFiles(this.files);
          this.value = '';
        }
      });
    }

    // Preview picker
    const previewBtn = modal.querySelector('#pe-pick-preview');
    const previewPreview = modal.querySelector('#pe-preview-preview');

    if (previewBtn) {
      previewBtn.addEventListener('click', async () => {
        const files = await pickFiles({ multiple: false });
        if (files && files[0]) {
          peSetLocalFile('preview', files[0], previewPreview);
        }
      });
    }

    // Test preview
    const testBtn = modal.querySelector('#pe-test-preview');
    const previewUrlInput = modal.querySelector('#pe-preview-url');

    if (testBtn && previewUrlInput) {
      testBtn.addEventListener('click', () => {
        const url = previewUrlInput.value.trim();
        if (!url) {
          alert('Ampidiro URL preview aloha');
          return;
        }
        if (typeof openPreview === 'function') {
          const titleInput = modal.querySelector('#pe-title-input');
          openPreview({ 
            title: titleInput ? titleInput.value.trim() || 'Preview' : 'Preview', 
            preview_url: url 
          });
        }
      });
    }

    // Form submit
    const form = modal.querySelector('#pe-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await peSubmitForm();
          peClose();
          if (typeof fetchSupabaseProducts === 'function') {
            await fetchSupabaseProducts();
          }
        } catch (err) {
          console.error('[Modal] Submit error:', err);
          alert('Erreur: ' + err.message);
        }
      });
    }

    // Drag & drop
    modal.querySelectorAll('.pe-uploader').forEach(box => {
      box.addEventListener('dragover', (e) => {
        e.preventDefault();
        box.style.borderColor = '#5b78ff';
      });
      
      box.addEventListener('dragleave', () => {
        box.style.borderColor = '#2a2d38';
      });
      
      box.addEventListener('drop', (e) => {
        e.preventDefault();
        box.style.borderColor = '#2a2d38';
        const files = Array.from(e.dataTransfer.files || []);
        if (!files.length) return;
        
        if (box.id === 'pe-gallery-preview') {
          peSetGalleryFiles(files);
        } else if (box.getAttribute('data-kind') === 'preview') {
          peSetLocalFile('preview', files[0], box.querySelector('#pe-preview-preview'));
        } else {
          const isImage = files[0].type.startsWith('image/');
          if (isImage) {
            window.peLocal.imageFile = files[0];
            const url = URL.createObjectURL(files[0]);
            thumbnailPreview.innerHTML = `<img src="${url}" style="width:100%;height:auto;max-height:120px;object-fit:contain">`;
          }
        }
      });
    });
    
    console.log('[Modal] ✅ Events wired');
  }
  
  // ========================================
  // GALLERY MANAGEMENT
  // ========================================
  
  function peSetGalleryFiles(files) {
    console.log('[Gallery] 📸 Adding', files.length, 'files');
    
    // ✅ Compter TOTAL: existantes + nouvelles
const existingCount = window.peLocal.existingGalleryIds?.length || 0;
const remainingSlots = 5 - existingCount - window.peLocal.galleryFiles.length;

console.log('[Gallery] Slots disponibles:', remainingSlots, '(existantes:', existingCount, ', nouvelles:', window.peLocal.galleryFiles.length, ')');
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    
    if (filesToAdd.length < files.length) {
      alert(`⚠️ Maximum 5 images. ${files.length - filesToAdd.length} image(s) ignorée(s).`);
    }
    
    filesToAdd.forEach(file => {
      if (!file.type.startsWith('image/')) {
        console.warn('[Gallery] Invalid file type:', file.type);
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert(`⚠️ ${file.name} lehibe loatra (max 5MB)`);
        return;
      }
      
      const id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      window.peLocal.galleryFiles.push({ id, file });
    });
    
    console.log('[Gallery] ✅ Total images:', window.peLocal.galleryFiles.length);
    renderGalleryPreview();
  }
  
  function renderGalleryPreview() {
    const modal = document.getElementById('product-edit-modal');
    if (!modal) {
      console.warn('[Gallery] Modal not found');
      return;
    }
    
    const preview = modal.querySelector('#pe-gallery-preview');
    if (!preview) {
      console.warn('[Gallery] Preview container not found');
      return;
    }
    
    if (window.peLocal.galleryFiles.length === 0) {
      preview.innerHTML = '<span style="opacity:.6;grid-column:1/-1;text-align:center;padding:20px">Aucune image</span>';
      return;
    }
    
    preview.innerHTML = window.peLocal.galleryFiles.map(item => {
      const url = URL.createObjectURL(item.file);
      return `
        <div class="gallery-item" data-id="${item.id}" style="position:relative;border-radius:8px;overflow:hidden">
          <img src="${url}" 
               style="width:100%;height:100px;object-fit:cover;display:block"
               alt="Gallery image">
          <button type="button" 
                  class="gallery-remove" 
                  data-id="${item.id}" 
                  style="position:absolute;top:4px;right:4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
    }).join('');
    
    preview.querySelectorAll('.gallery-remove').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const id = this.getAttribute('data-id');
        console.log('[Gallery] Removing image:', id);
        
        window.peLocal.galleryFiles = window.peLocal.galleryFiles.filter(item => item.id !== id);
        renderGalleryPreview();
      });
    });
  }
  
  // ========================================
  // FILE HANDLING
  // ========================================
  
  function peSetLocalFile(kind, file, previewElement) {
    const { kind: detectKind } = detectAssetKind(file);
    
    if (kind === 'preview' && !(detectKind === 'video' || detectKind === 'pdf')) {
      alert('Safidio vidéo na PDF ho an\'ny preview.');
      return;
    }

    window.peLocal.previewFile = file;
    
    if (!previewElement) return;
    
    if (detectKind === 'pdf') {
      previewElement.innerHTML = `<div style="opacity:.85"><i class="fa-solid fa-file-pdf"></i> ${file.name}</div>`;
    } else {
      const url = URL.createObjectURL(file);
      previewElement.innerHTML = `<video src="${url}" style="max-width:100%;max-height:110px" muted></video>`;
    }
  }
  
  // ========================================
  // MODAL OPEN/CLOSE
  // ========================================
  
  function peOpen({ mode = 'add', product = null, productType = 'numeric' } = {}) {
    if (!isOwner()) {
      alert('Owner ihany no afaka manao izao.');
      return;
    }
    
    const modal = ensureProductModal();
    window.peLocal.mode = mode;
    window.peLocal.recordId = product?.id || null;
    window.peLocal.imageFile = null;
    window.peLocal.previewFile = null;
    window.peLocal.galleryFiles = [];
    window.peLocal.existingGalleryIds = []; // ← NOUVELLE LIGNE
    const productTypeSelect = modal.querySelector('#pe-product-type');
    const finalProductType = product?.product_type || product?._db?.product_type || productType;
    
    if (productTypeSelect) {
      productTypeSelect.value = finalProductType;
      productTypeSelect.dispatchEvent(new Event('change'));
    }
    
    const typeLabel = finalProductType === 'physical' ? '📦 Produit Physique' : '💻 Produit Numérique';
    const titleEl = modal.querySelector('#pe-title');
    if (titleEl) {
      titleEl.textContent = (mode === 'add') ? `Ajouter ${typeLabel}` : `Éditer ${typeLabel}`;
    }
    
    // Fill form fields
    const fields = {
      '#pe-title-input': product?.title || '',
      '#pe-price-input': Number(product?.price || 0),
      '#pe-category': normalizeCategory(product?.category || (finalProductType === 'physical' ? 'other' : 'ebooks')),
      '#pe-badge': product?._db?.badge || '',
      '#pe-tags': Array.isArray(product?._db?.tags) ? product._db.tags.join(', ') : '',
      '#pe-description': product?.description || product?.description_short || '',
      '#pe-preview-url': product?.preview_url || product?._db?.preview_url || ''
    };
    
    Object.keys(fields).forEach(selector => {
      const el = modal.querySelector(selector);
      if (el) el.value = fields[selector];
    });
    
    // Load thumbnail preview
    const thumbnailPreview = modal.querySelector('#pe-thumbnail-preview');
    if (thumbnailPreview) {
      thumbnailPreview.innerHTML = product?.image?.url ?
        `<img src="${product.image.url}" alt="thumbnail" style="width:100%;height:110px;object-fit:cover">` :
        `<span style="opacity:.6">Aucune image</span>`;
    }
    
    // Load preview preview
    const previewPreview = modal.querySelector('#pe-preview-preview');
    const existingPreview = product?.preview_url || product?._db?.preview_url || '';
    if (previewPreview) {
      if (existingPreview) {
        if (/\.pdf(\?|#|$)/i.test(existingPreview)) {
          previewPreview.innerHTML = `<div style="opacity:.85"><i class="fa-solid fa-file-pdf"></i> PDF</div>`;
        } else if (/\.(mp4|webm|mkv)(\?|#|$)/i.test(existingPreview)) {
          previewPreview.innerHTML = `<video src="${existingPreview}" style="max-width:100%;max-height:110px" muted></video>`;
        } else {
          previewPreview.innerHTML = `<div style="opacity:.8">${existingPreview}</div>`;
        }
      } else {
        previewPreview.innerHTML = `<span style="opacity:.6">Tsy misy vidéo/PDF</span>`;
      }
    }
    
    // Load gallery if editing
    if (mode === 'edit' && product && product.id) {
      (async function loadGallery() {
  try {
    const sb = await ensureSupabase();
    
    const { data: galleryImages, error } = await sb
      .from('product_images')
      .select('*')
      .eq('product_id', product.id)
      .eq('image_type', 'gallery')
      .order('position');
    
    if (error) throw error;
    
    if (galleryImages && galleryImages.length > 0) {
      // ✅ STOCKER les IDs existants
      window.peLocal.existingGalleryIds = galleryImages.map(img => img.id);
      
      const galleryPreview = modal.querySelector('#pe-gallery-preview');
      if (galleryPreview) {
        galleryPreview.innerHTML = galleryImages.map(img => `
          <div class="gallery-item-existing" 
               data-db-id="${img.id}"
               style="position:relative;border-radius:8px;overflow:hidden;border:2px solid rgba(59,130,246,.3)">
            <img src="${img.image_url}" 
                 style="width:100%;height:100px;object-fit:cover;display:block"
                 alt="Gallery image">
            <button type="button"
                    class="gallery-remove-existing"
                    data-db-id="${img.id}"
                    style="position:absolute;top:4px;right:4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <small style="position:absolute;bottom:4px;left:4px;background:rgba(59,130,246,.9);color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700">
              <i class="fa-solid fa-check"></i> Existant
            </small>
          </div>
        `).join('');
        
        // ✅ WIRE delete buttons
        galleryPreview.querySelectorAll('.gallery-remove-existing').forEach(btn => {
          btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dbId = this.getAttribute('data-db-id');
            if (!confirm('Supprimer cette image?')) return;
            
            try {
              const sb = await ensureSupabase();
              await sb.from('product_images').delete().eq('id', dbId);
              
              // Remove from UI and state
              window.peLocal.existingGalleryIds = window.peLocal.existingGalleryIds.filter(id => id !== dbId);
              this.closest('.gallery-item-existing').remove();
              
              // Update preview if empty
              if (window.peLocal.existingGalleryIds.length === 0 && window.peLocal.galleryFiles.length === 0) {
                galleryPreview.innerHTML = '<span style="opacity:.6;grid-column:1/-1;text-align:center;padding:20px">Aucune image</span>';
              }
              
              console.log('[Gallery] Image deleted:', dbId);
            } catch (err) {
              console.error('[Gallery] Delete error:', err);
              alert('Erreur suppression: ' + err.message);
            }
          });
        });
      }
    }
  } catch (e) {
    console.error('[peOpen] Gallery load error:', e);
  }
})();
    }
    
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    const titleInput = modal.querySelector('#pe-title-input');
    if (titleInput) titleInput.focus();
  }
  
  function peClose() {
    const modal = document.getElementById('product-edit-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
  
  // ========================================
  // SUBMIT FORM
  // ========================================
  
  async function peSubmitForm() {
    if (!isOwner()) throw new Error('Owner ihany no afaka manova.');
    
    console.log('[peSubmitForm] 🚀 Starting...');
    
    const sb = await ensureSupabase();
    const modal = document.getElementById('product-edit-modal');
    
    if (!modal) throw new Error('Modal not found');
    
    // Get form values
    const title = modal.querySelector('#pe-title-input')?.value.trim();
    const price = Number(modal.querySelector('#pe-price-input')?.value || 0);
    const category = normalizeCategory(modal.querySelector('#pe-category')?.value || 'ebooks');
    const badge = modal.querySelector('#pe-badge')?.value.trim() || null;
    const tagsRaw = modal.querySelector('#pe-tags')?.value.trim();
    const description = modal.querySelector('#pe-description')?.value.trim() || null;
    let preview_url = modal.querySelector('#pe-preview-url')?.value.trim() || null;
    
    const productTypeSelect = modal.querySelector('#pe-product-type');
    const product_type = productTypeSelect ? productTypeSelect.value : 'numeric';
    
    console.log('[peSubmitForm] 📋 Form data:', { title, price, category, product_type });
    
    // Validation
    if (!title || title.trim() === '') {
      alert('⚠️ Veuillez entrer un titre');
      return;
    }
    
    // Upload thumbnail
    let thumbnail_url = null;
    
    if (window.peLocal.imageFile) {
      console.log('[peSubmitForm] 📤 Uploading thumbnail...');
      
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = window.peLocal.imageFile.name.split('.').pop();
      const fileName = `thumbnail_${timestamp}_${randomStr}.${extension}`;
      
      // ✅ CORRECTION ITO
const { data: uploadData, error: uploadError } = await sb.storage
  .from('products') // ← OVAINA: Bucket marina
  .upload(fileName, window.peLocal.imageFile, {
    cacheControl: '3600',
    upsert: false,
    contentType: window.peLocal.imageFile.type
  });

if (uploadError) {
  console.error('[peSubmitForm] ❌ Thumbnail upload error:', uploadError);
  alert('❌ Erreur upload thumbnail: ' + uploadError.message);
  throw uploadError;
}

// ✅ CORRECTION ITO KOA
const { data: urlData } = sb.storage
  .from('products') // ← OVAINA: Bucket marina
  .getPublicUrl(fileName);

thumbnail_url = urlData.publicUrl;
console.log('[peSubmitForm] ✅ Thumbnail uploaded:', thumbnail_url);
}
    
    // Upload preview
    if (window.peLocal.previewFile && !preview_url) {
      console.log('[peSubmitForm] 📤 Uploading preview file...');
      
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = window.peLocal.previewFile.name.split('.').pop();
      const fileName = `preview_${timestamp}_${randomStr}.${extension}`;
      
      const { data: uploadData, error: uploadError } = await sb.storage
        .from('products')
        .upload(fileName, window.peLocal.previewFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: window.peLocal.previewFile.type
        });
      
      if (uploadError) {
        console.error('[peSubmitForm] ⚠️ Preview upload error:', uploadError);
      } else {
        const { data: urlData } = sb.storage
          .from('product')
          .getPublicUrl(fileName);
        
        preview_url = urlData.publicUrl;
        console.log('[peSubmitForm] ✅ Preview uploaded:', preview_url);
      }
    }
    
    // Build payload
    const payload = {
      title,
      category,
      price,
      is_free: price === 0,
      preview_url,
      thumbnail_url,
      badge,
      tags: tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
      description,
      product_type
    };
    
    console.log('[peSubmitForm] 📦 Payload:', payload);
    
    let productId;
    
    // Insert or Update
    if (window.peLocal.mode === 'add') {
      console.log('[peSubmitForm] ➕ Inserting new product...');
      
      const { data: inserted, error } = await sb
        .from('products')
        .insert(payload)
        .select()
        .single();
      
      if (error) {
        console.error('[peSubmitForm] ❌ Insert error:', error);
        alert('❌ Erreur insertion: ' + error.message);
        throw error;
      }
      
      productId = inserted.id;
      console.log('[peSubmitForm] ✅ Product inserted, ID:', productId);
      
    } else {
      console.log('[peSubmitForm] 🔄 Updating product:', window.peLocal.recordId);
      
      const { error } = await sb
        .from('products')
        .update(payload)
        .eq('id', window.peLocal.recordId);
      
      if (error) {
        console.error('[peSubmitForm] ❌ Update error:', error);
        alert('❌ Erreur modification: ' + error.message);
        throw error;
      }
      
      productId = window.peLocal.recordId;
      console.log('[peSubmitForm] ✅ Product updated');
    }
    
// ========================================
// GALLERY UPLOAD - VERSION CORRIGÉE ✅
// ========================================

if (window.peLocal.galleryFiles.length > 0) {
  console.log('[peSubmitForm] 📸 Uploading NEW gallery images:', window.peLocal.galleryFiles.length);
  
  let successCount = 0;
  let errorCount = 0;
  
  // ✅ Calculer position de départ (après les images existantes)
  const startPosition = window.peLocal.existingGalleryIds?.length || 0;
  
  for (let i = 0; i < window.peLocal.galleryFiles.length; i++) {
    const item = window.peLocal.galleryFiles[i];
    
    try {
      console.log('[peSubmitForm] 📤 Processing NEW image', i + 1, '/', window.peLocal.galleryFiles.length);
      
      if (!item.file) {
        console.error('[peSubmitForm] ❌ No file at index', i);
        errorCount++;
        continue;
      }
      
      // ✅ Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = item.file.name.split('.').pop() || 'jpg';
      const fileName = `${productId}_gallery_${startPosition + i}_${timestamp}_${randomStr}.${extension}`;
      
      console.log('[peSubmitForm]   Filename:', fileName);
      
      // ✅ STEP 1: Upload to Storage
      const { data: uploadData, error: uploadError } = await sb.storage
        .from('products')
        .upload(fileName, item.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: item.file.type
        });
      
      if (uploadError) {
        console.error('[peSubmitForm] ❌ Upload error:', uploadError);
        errorCount++;
        continue;
      }
      
      console.log('[peSubmitForm]   ✅ Uploaded to storage');
      
      // ✅ STEP 2: Get Public URL
      const { data: urlData } = sb.storage
        .from('products')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl;
      console.log('[peSubmitForm]   🔗 Public URL:', publicUrl);
      
      // ✅ STEP 3: Save to Database
      const { data: insertData, error: insertError } = await sb
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: publicUrl,
          image_type: 'gallery',
          position: startPosition + i
        })
        .select();
      
      if (insertError) {
        console.error('[peSubmitForm] ❌ DB insert error:', insertError);
        errorCount++;
        continue;
      }
      
      console.log('[peSubmitForm]   ✅ Saved to database');
      successCount++;
      
    } catch (e) {
      console.error('[peSubmitForm] 💥 Exception:', e);
      errorCount++;
    }
  }
  
  console.log('[peSubmitForm] 📸 Gallery upload complete:');
  console.log('[peSubmitForm]   ✅ Success:', successCount);
  console.log('[peSubmitForm]   ❌ Errors:', errorCount);
  
  if (errorCount > 0) {
    alert(`⚠️ Gallery: ${successCount} OK, ${errorCount} erreurs`);
  }
}
    
    // Send notifications (only for new products)
    if (window.peLocal.mode === 'add') {
      try {
        console.log('[peSubmitForm] 📤 Sending push notifications...');
        
        const notifPayload = {
          productId: productId,
          productTitle: title,
          productPrice: price,
          productType: product_type,
          thumbnail: thumbnail_url,
          productImage: thumbnail_url,
          thumbnail_url: thumbnail_url
        };
        
        const notifResponse = await fetch(
          window.SUPABASE_URL + '/functions/v1/send-push',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
              'apikey': window.SUPABASE_ANON_KEY
            },
            body: JSON.stringify(notifPayload)
          }
        );
        
        if (notifResponse.ok) {
          const result = await notifResponse.json();
          console.log('[peSubmitForm] ✅ Notifications sent:', result.sent, '/', result.total);
        }
      } catch (notifErr) {
        console.error('[peSubmitForm] ⚠️ Notification error:', notifErr);
      }
      
      // Local notification
      if (typeof window.notifyNewProduct === 'function') {
        window.notifyNewProduct({ id: productId, title: title, price: price });
      }
    }
    
    // Reset state
    window.peLocal.imageFile = null;
    window.peLocal.previewFile = null;
    window.peLocal.galleryFiles = [];
    
    // Success message
    const typeEmoji = product_type === 'physical' ? '📦' : '💻';
    const galleryInfo = window.peLocal.mode === 'add' && window.peLocal.galleryFiles.length > 0 ?
      `\n📸 ${window.peLocal.galleryFiles.length} image(s) de galerie` :
      '';
    
    alert(`${typeEmoji} Produit ${window.peLocal.mode === 'add' ? 'ajouté' : 'modifié'} avec succès!${galleryInfo}`);
    
    console.log('[peSubmitForm] 🎉 TERMINÉ AVEC SUCCÈS');
  }
  
  // ========================================
  // EXPOSE GLOBALLY
  // ========================================
  
  window.ensureProductModal = ensureProductModal;
  window.peOpen = peOpen;
  window.peClose = peClose;
  window.peSubmitForm = peSubmitForm;
  window.peSetGalleryFiles = peSetGalleryFiles;
  window.renderGalleryPreview = renderGalleryPreview;
  window.peSetLocalFile = peSetLocalFile;
  
  console.log('[Product Modal] ✅ System initialized');
  
})();

/* ==========================================
   HELPER FUNCTIONS (si pas déjà définies)
   ========================================== */

if (typeof normalizeCategory !== 'function') {
  window.normalizeCategory = function(c) {
    if (!c) return '';
    c = String(c).toLowerCase();
    if (['app', 'apps', 'jeu', 'jeux', 'game', 'games'].indexOf(c) !== -1) return 'apps';
    if (['ebook', 'ebooks', 'book', 'livre', 'livres'].indexOf(c) !== -1) return 'ebooks';
    if (['video', 'vidéo', 'videos', 'vidéos'].indexOf(c) !== -1) return 'videos';
    if (['promotion', 'promo'].indexOf(c) !== -1) return 'promo';
    if (['gratuit', 'gratuits', 'free'].indexOf(c) !== -1) return 'free';
    return c;
  };
}

if (typeof escapeAttr !== 'function') {
  window.escapeAttr = function(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
}

if (typeof escapeHtml !== 'function') {
  window.escapeHtml = function(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(m) {
      var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return map[m] || m;
    });
  };
}

/* ==========================================
   CRUD API FUNCTIONS
   ========================================== */

async function addProductPrompt() {
  window.peOpen({ mode: 'add', product: null, productType: 'numeric' });
}

async function addPhysicalProductPrompt() {
  window.peOpen({ mode: 'add', product: null, productType: 'physical' });
}

async function editProductPrompt(id) {
  if (!isOwner()) {
    alert('Owner ihany no afaka manova.');
    return;
  }
  
  try {
    const sb = await ensureSupabase();
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      alert(error.message);
      return;
    }
    
    if (!data) {
      alert('Produit introuvable');
      return;
    }
    
    // Map DB data to UI format
    const product = {
      id: data.id,
      title: data.title,
      price: data.price,
      category: data.category,
      description: data.description,
      description_short: data.subtitle,
      image: { url: data.thumbnail_url },
      preview_url: data.preview_url,
      product_type: data.product_type,
      _db: data
    };
    
    window.peOpen({ mode: 'edit', product: product });
    
  } catch (e) {
    console.error('[editProductPrompt]', e);
    alert('Erreur: ' + e.message);
  }
}

async function deleteProductConfirm(id) {
  if (!isOwner()) {
    alert('Owner ihany no afaka mamafa.');
    return;
  }
  
  if (!confirm('Hofafana ve ity produit ity?')) return;
  
  try {
    const sb = await ensureSupabase();
    
    // Delete gallery images first
    const { error: galleryError } = await sb
      .from('product_images')
      .delete()
      .eq('product_id', id);
    
    if (galleryError) {
      console.warn('[deleteProductConfirm] Gallery delete error:', galleryError);
    }
    
    // Delete product
    const { error } = await sb
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    alert('Voafafa.');
    
    if (typeof fetchSupabaseProducts === 'function') {
      await fetchSupabaseProducts();
    }
    
  } catch (e) {
    console.error('[deleteProductConfirm]', e);
    alert('Erreur suppression: ' + e.message);
  }
}

// Expose globally
window.addProductPrompt = addProductPrompt;
window.addPhysicalProductPrompt = addPhysicalProductPrompt;
window.editProductPrompt = editProductPrompt;
window.deleteProductConfirm = deleteProductConfirm;

/* ==========================================
   EVENT DELEGATION FOR PRODUCT CARDS
   ========================================== */

document.addEventListener('DOMContentLoaded', function() {
  function delegateToolButtons(container) {
    if (!container) return;
    
    container.addEventListener('click', function(e) {
      const toolBtn = e.target.closest('.owner-tool');
      if (!toolBtn) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const card = toolBtn.closest('.product-card');
      if (!card) return;
      
      const id = card.getAttribute('data-id');
      const tool = toolBtn.getAttribute('data-tool');
      
      if (tool === 'edit') {
        editProductPrompt(id);
      } else if (tool === 'delete') {
        deleteProductConfirm(id);
      }
    });
  }
  
  // Wire to product containers
  delegateToolButtons(document.getElementById('products-row'));
  delegateToolButtons(document.getElementById('products-box'));
});

/* ==========================================
   WIRE ADD PRODUCT BUTTONS
   ========================================== */

document.addEventListener('DOMContentLoaded', function() {
  const addBtn = document.getElementById('btnAddProduct');
  const addPhysicalBtn = document.getElementById('btnAddPhysical');
  
  if (addBtn) {
    addBtn.addEventListener('click', addProductPrompt);
  }
  
  if (addPhysicalBtn) {
    addPhysicalBtn.addEventListener('click', addPhysicalProductPrompt);
  }
});

console.log('[Product Modal] ✅ Complete system loaded');// À LA FIN du fichier
document.addEventListener('DOMContentLoaded', function() {
  // Attendre que tout soit chargé
  setTimeout(() => {
    console.log('[Init] Wiring product buttons...');
    
    const addBtn = document.getElementById('btnAddProduct');
    const addPhysicalBtn = document.getElementById('btnAddPhysical');
    
    if (addBtn) {
      addBtn.removeEventListener('click', addProductPrompt); // Remove old
      addBtn.addEventListener('click', function() {
        if (typeof window.peOpen === 'function') {
          window.peOpen({ mode: 'add', product: null, productType: 'numeric' });
        } else {
          console.error('[btnAddProduct] peOpen not available');
          alert('❌ Erreur: Module produits non chargé');
        }
      });
      console.log('[Init] ✓ btnAddProduct wired');
    }
    
    if (addPhysicalBtn) {
      addPhysicalBtn.removeEventListener('click', addPhysicalProductPrompt);
      addPhysicalBtn.addEventListener('click', function() {
        if (typeof window.peOpen === 'function') {
          window.peOpen({ mode: 'add', product: null, productType: 'physical' });
        } else {
          console.error('[btnAddPhysical] peOpen not available');
          alert('❌ Erreur: Module produits non chargé');
        }
      });
      console.log('[Init] ✓ btnAddPhysical wired');
    }
    
  }, 1000); // Délai de sécurité
})
;async function showProduct(id) {
  try {
    const p = (window.products || []).find(x => x.id === id);
    if (!p) {
      alert('Tsy hita ny produit');
      return;
    }
    
    const modal = document.getElementById('info-modal');
    const title = document.getElementById('info-title');
    const content = document.getElementById('info-content');
    
    if (!modal || !content || !title) return;
    
    title.textContent = p.title || 'Détails du produit';
    
    const imgUrl = (p.image && p.image.url) ? p.image.url : FALLBACK_IMG;
    const price = Number(p.price) || 0;
    const isFree = price === 0;
    const category = normalizeCategory(p.category || '');
    const description = p.description || 'Aucune description disponible.';
    
// ✅ CORRECTION: Charger gallery avec debug complet
let galleryHTML = '';
try {
  console.log('[showProduct] 🔍 Loading gallery for product ID:', id);
  
  const sb = await ensureSupabase();
  
  // ✅ FIX CRITIQUE: Convertir l'ID en string propre
  const cleanId = String(id).trim();
  
  console.log('[showProduct] 🔍 Clean ID:', cleanId);
  
  const { data: galleryImages, error } = await sb
    .from('product_images')
    .select('*')
    .eq('product_id', cleanId) // ← CORRIGÉ: ID nettoyé
    .eq('image_type', 'gallery')
    .order('position', { ascending: true });
  
  console.log('[showProduct] 📊 Gallery query result:', {
    found: galleryImages?.length || 0,
    error: error?.message || null,
    data: galleryImages
  });
  
  if (error) {
    console.error('[showProduct] ❌ Gallery error:', error);
    galleryHTML = `
          <div style="margin-top:16px;padding:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px">
            <p style="margin:0;color:#ef4444">⚠️ Erreur chargement galerie: ${error.message}</p>
          </div>
        `;
  } else if (galleryImages && galleryImages.length > 0) {
    console.log('[showProduct] ✅ Found', galleryImages.length, 'gallery images');
    
    // ✅ NOUVEAU: Créer un lightbox simple
    galleryHTML = `
          <div style="margin-top:16px">
            <h4 style="margin:0 0 12px 0;color:#fff;font-size:16px;display:flex;align-items:center;gap:8px">
              <i class="fa-solid fa-images"></i>
              Galerie (${galleryImages.length})
            </h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">
              ${galleryImages.map((img, index) => `
                <div style="position:relative;overflow:hidden;border-radius:8px;border:2px solid rgba(59,130,246,.3);cursor:pointer;transition:transform 0.2s"
                     onclick="window.open('${escapeAttr(img.image_url)}', '_blank')"
                     onmouseover="this.style.transform='scale(1.05)'"
                     onmouseout="this.style.transform='scale(1)'">
                  <img 
                    src="${escapeAttr(img.image_url)}" 
                    alt="Gallery ${index + 1}" 
                    loading="lazy"
                    style="width:100%;height:100px;object-fit:cover;display:block"
                    onerror="this.style.border='2px solid #ef4444'; this.alt='❌ Erreur'">
                  <div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,.8);color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;backdrop-filter:blur(4px)">
                    ${index + 1}/${galleryImages.length}
                  </div>
                  <div style="position:absolute;inset:0;background:rgba(0,0,0,.4);opacity:0;transition:opacity 0.2s;display:flex;align-items:center;justify-content:center"
                       onmouseover="this.style.opacity='1'"
                       onmouseout="this.style.opacity='0'">
                    <i class="fa-solid fa-expand" style="font-size:24px;color:#fff"></i>
                  </div>
                </div>
              `).join('')}
            </div>
            <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;text-align:center">
              <i class="fa-solid fa-info-circle"></i> Cliquez pour ouvrir en grand
            </p>
          </div>
        `;
  } else {
    console.log('[showProduct] ℹ️ No gallery images found');
    // ✅ Pas de HTML si pas d'images (évite "Aucune image")
  }
} catch (e) {
  console.error('[showProduct] 💥 Gallery load error:', e);
  console.error('Stack:', e.stack);
  
  galleryHTML = `
        <div style="margin-top:16px;padding:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px">
          <p style="margin:0;color:#ef4444">⚠️ Erreur: ${e.message}</p>
          <small style="display:block;margin-top:4px;opacity:0.8">Vérifiez la console pour détails</small>
        </div>
      `;
}
    
    // Build HTML
    let html = `
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="width:100%;max-height:300px;overflow:hidden;border-radius:12px;border:1px solid rgba(255,255,255,.12)">
          <img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(p.title)}" style="width:100%;height:auto;object-fit:cover;display:block">
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>${fmtPrice(price)}</div>
          <span class="badge" style="padding:4px 10px;border-radius:999px;font-size:12px">${category}</span>
        </div>
        
        <div style="line-height:1.6;color:#e5e7eb">
          <h4 style="margin:0 0 8px 0;color:#fff">Description</h4>
          <p style="margin:0;white-space:pre-wrap">${escapeHtml(description)}</p>
        </div>
        
        ${galleryHTML}
        
        <div style="display:flex;gap:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08)">
          <button type="button" class="param-btn" onclick="buyOrRead({id:'${escapeAttr(p.id)}',title:'${escapeAttr(p.title)}',price:${price}})" style="flex:1;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff">
            <i class="fa-brands fa-whatsapp"></i> ${isFree ? 'Obtenir' : 'Commander'}
          </button>
        </div>
      </div>
    `;
    
    content.innerHTML = html;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    
  } catch (err) {
    console.error('[showProduct error]', err);
    alert('Erreur: ' + err.message);
  }
}
/* ==========================================
   GALLERY INDICATOR ANIMATION ✅
   ========================================== */

if (!document.getElementById('gallery-indicator-styles')) {
  const styles = document.createElement('style');
  styles.id = 'gallery-indicator-styles';
  styles.textContent = `
    @keyframes galleryPulse {
      0%, 100% { 
        transform: scale(1); 
        box-shadow: 0 4px 12px rgba(0,0,0,.3);
      }
      50% { 
        transform: scale(1.05); 
        box-shadow: 0 6px 16px rgba(59,130,246,.4);
      }
    }
    
    .gallery-indicator:hover {
      background: rgba(59,130,246,1) !important;
      transform: scale(1.1) !important;
      animation: none !important;
    }
  `;
  document.head.appendChild(styles);
}


/* ==========================================
   SECURE AUTHENTICATION MODULE ✅
   ========================================== */

(function initSecureAuth() {
  'use strict';
  
  // ✅ CONFIGURATION SÉCURISÉE
  const AUTH_CONFIG = {
    supabaseUrl: window.SUPABASE_URL || "https://zogohkfzplcuonkkfoov.supabase.co",
    supabaseKey: window.SUPABASE_ANON_KEY,
    storageKey: 'mijoro-auth-v1',
    ownerEmail: window.OWNER_EMAIL // Stocké dans une variable globale, pas exposé dans le DOM
  };
  
  // État d'authentification
  let authState = {
    user: null,
    session: null,
    isOwner: false
  };
  
  let authSubscription = null;
  
  // ========================================
  // MODAL LOGIN SÉCURISÉ
  // ========================================
  
  function createSecureLoginModal() {
    let modal = document.getElementById('secure-login-modal');
    if (modal) return modal;
    
    modal = document.createElement('div');
    modal.id = 'secure-login-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:9000;backdrop-filter:blur(4px)';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    
    modal.innerHTML = `
      <div style="background:#0e0f13;color:#fff;border-radius:16px;width:min(420px,94%);padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1)">
        
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:48px;height:48px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:12px;display:flex;align-items:center;justify-content:center">
              <i class="fa-solid fa-shield-halved" style="font-size:24px;color:#fff"></i>
            </div>
            <div>
              <h3 style="margin:0;font-size:20px;font-weight:700">Connexion Sécurisée</h3>
              <small style="opacity:.7;display:block;margin-top:2px">Accès propriétaire</small>
            </div>
          </div>
          <button type="button" 
                  class="param-btn" 
                  id="secure-login-close"
                  aria-label="Fermer"
                  style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <!-- Info Box -->
        <div style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);border-radius:10px;padding:12px;margin-bottom:20px">
          <p style="margin:0;font-size:13px;color:#93c5fd;display:flex;align-items:start;gap:8px">
            <i class="fa-solid fa-info-circle" style="margin-top:2px;flex-shrink:0"></i>
            <span>Cette zone est réservée au propriétaire. Vous devez disposer d'identifiants valides pour accéder aux fonctionnalités d'administration.</span>
          </p>
        </div>
        
        <!-- Form -->
        <form id="secure-login-form" style="display:flex;flex-direction:column;gap:16px">
          
          <!-- Email Field -->
          <label style="display:flex;flex-direction:column;gap:6px">
            <span style="font-weight:600;font-size:14px">Adresse email</span>
            <div style="position:relative">
              <input 
                id="secure-email-input" 
                type="email" 
                required
                placeholder="votre@email.com"
                autocomplete="email"
                style="width:100%;padding:12px 12px 12px 40px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff;font-size:14px;transition:border-color 0.2s"
                onfocus="this.style.borderColor='#3b82f6'"
                onblur="this.style.borderColor='#2a2d38'">
              <i class="fa-solid fa-envelope" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#64748b;pointer-events:none"></i>
            </div>
          </label>
          
          <!-- Password Field -->
          <label style="display:flex;flex-direction:column;gap:6px">
            <span style="font-weight:600;font-size:14px">Mot de passe</span>
            <div style="position:relative">
              <input 
                id="secure-password-input" 
                type="password" 
                required
                placeholder="••••••••"
                autocomplete="current-password"
                style="width:100%;padding:12px 40px 12px 40px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff;font-size:14px;transition:border-color 0.2s"
                onfocus="this.style.borderColor='#3b82f6'"
                onblur="this.style.borderColor='#2a2d38'">
              <i class="fa-solid fa-lock" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#64748b;pointer-events:none"></i>
              <button type="button"
                      id="toggle-password"
                      style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;padding:4px;transition:color 0.2s"
                      onmouseover="this.style.color='#fff'"
                      onmouseout="this.style.color='#64748b'">
                <i class="fa-solid fa-eye" id="toggle-password-icon"></i>
              </button>
            </div>
          </label>
          
          <!-- Error Message -->
          <div id="secure-login-error" style="display:none;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px">
            <p style="margin:0;font-size:13px;color:#fca5a5;display:flex;align-items:start;gap:8px">
              <i class="fa-solid fa-triangle-exclamation" style="margin-top:2px;flex-shrink:0"></i>
              <span id="secure-login-error-text"></span>
            </p>
          </div>
          
          <!-- Submit Button -->
          <div style="display:flex;gap:8px;margin-top:8px">
            <button 
              type="button" 
              class="param-btn" 
              id="secure-login-cancel"
              style="flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
              Annuler
            </button>
            <button 
              type="submit" 
              class="param-btn" 
              id="secure-login-submit"
              style="flex:2;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;color:#fff;font-weight:700;position:relative;overflow:hidden">
              <span id="secure-login-submit-text">
                <i class="fa-solid fa-right-to-bracket"></i> Se connecter
              </span>
              <div id="secure-login-loader" style="display:none;position:absolute;inset:0;background:inherit;display:flex;align-items:center;justify-content:center">
                <i class="fa-solid fa-spinner fa-spin"></i>
              </div>
            </button>
          </div>
          
        </form>
        
        <!-- Security Note -->
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)">
          <p style="margin:0;font-size:11px;color:#64748b;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px">
            <i class="fa-solid fa-shield-check"></i>
            Connexion sécurisée via Supabase Authentication
          </p>
        </div>
        
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // ✅ Wire events APRÈS append
    wireModalEvents(modal);
    
    return modal;
  }
  
  // ========================================
  // WIRE MODAL EVENTS
  // ========================================
  
  function wireModalEvents(modal) {
    const form = modal.querySelector('#secure-login-form');
    const closeBtn = modal.querySelector('#secure-login-close');
    const cancelBtn = modal.querySelector('#secure-login-cancel');
    const submitBtn = modal.querySelector('#secure-login-submit');
    const emailInput = modal.querySelector('#secure-email-input');
    const passwordInput = modal.querySelector('#secure-password-input');
    const togglePassword = modal.querySelector('#toggle-password');
    const errorDiv = modal.querySelector('#secure-login-error');
    const errorText = modal.querySelector('#secure-login-error-text');
    
    // Close handlers
    closeBtn.addEventListener('click', closeLoginModal);
    cancelBtn.addEventListener('click', closeLoginModal);
    
    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
      const icon = document.getElementById('toggle-password-icon');
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        passwordInput.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    });
    
    // Form submit
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      // Validation
      if (!email || !password) {
        showError('Veuillez remplir tous les champs');
        return;
      }
      
      if (!isValidEmail(email)) {
        showError('Format d\'email invalide');
        return;
      }
      
      // Hide error
      errorDiv.style.display = 'none';
      
      // Show loader
      submitBtn.disabled = true;
      document.getElementById('secure-login-submit-text').style.display = 'none';
      document.getElementById('secure-login-loader').style.display = 'flex';
      
      try {
        await handleLogin(email, password);
      } catch (err) {
        showError(err.message);
      } finally {
        submitBtn.disabled = false;
        document.getElementById('secure-login-submit-text').style.display = 'flex';
        document.getElementById('secure-login-loader').style.display = 'none';
      }
    });
    
    function showError(message) {
      errorText.textContent = message;
      errorDiv.style.display = 'block';
      
      // Shake animation
      errorDiv.style.animation = 'shake 0.5s ease';
      setTimeout(() => {
        errorDiv.style.animation = '';
      }, 500);
    }
  }
  
  // ========================================
  // VALIDATION
  // ========================================
  
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  // ========================================
  // LOGIN HANDLER
  // ========================================
  
  async function handleLogin(email, password) {
    try {
      console.log('[Auth] 🔐 Attempting login...');
      
      // ✅ VÉRIFICATION: Email owner (côté client, invisible dans DOM)
      if (email.toLowerCase() !== AUTH_CONFIG.ownerEmail.toLowerCase()) {
        throw new Error('Accès refusé. Cette adresse email n\'est pas autorisée.');
      }
      
      const sb = await window.ensureSupabase();
      
      // Attempt login
      const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) {
        console.error('[Auth] ❌ Login error:', error);
        
        // ✅ Messages d'erreur améliorés
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email ou mot de passe incorrect');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Email non confirmé. Vérifiez votre boîte mail.');
        } else {
          throw new Error(error.message);
        }
      }
      
      console.log('[Auth] ✅ Login successful');
      
      // Update state
      authState.user = data.user;
      authState.session = data.session;
      authState.isOwner = true;
      
      // Close modal
      closeLoginModal();
      
      // Update UI
      updateAuthUI();
      
      // Reload products
      if (typeof window.fetchSupabaseProducts === 'function') {
        await window.fetchSupabaseProducts();
      }
      
      // Show success toast
      showToast('✅ Connexion réussie', 'success');
      
    } catch (err) {
      console.error('[Auth] 💥 Login failed:', err);
      throw err;
    }
  }
  
  // ========================================
  // LOGOUT HANDLER
  // ========================================
  
  async function handleLogout() {
    if (!confirm('Voulez-vous vraiment vous déconnecter?')) {
      return;
    }
    
    try {
      console.log('[Auth] 🚪 Logging out...');
      
      const sb = await window.ensureSupabase();
      const { error } = await sb.auth.signOut();
      
      if (error) throw error;
      
      // Clear state
      authState.user = null;
      authState.session = null;
      authState.isOwner = false;
      
      // Update UI
      updateAuthUI();
      
      // Show toast
      showToast('👋 Déconnecté', 'info');
      
      console.log('[Auth] ✅ Logout successful');
      
    } catch (err) {
      console.error('[Auth] ❌ Logout error:', err);
      showToast('❌ Erreur de déconnexion', 'error');
    }
  }
  
  // ========================================
  // MODAL OPEN/CLOSE
  // ========================================
  
  function openLoginModal() {
    const modal = createSecureLoginModal();
    
    // Reset form
    modal.querySelector('#secure-email-input').value = '';
    modal.querySelector('#secure-password-input').value = '';
    modal.querySelector('#secure-login-error').style.display = 'none';
    
    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Focus email input
    setTimeout(() => {
      modal.querySelector('#secure-email-input').focus();
    }, 100);
    
    console.log('[Auth] 📋 Login modal opened');
  }
  
  function closeLoginModal() {
    const modal = document.getElementById('secure-login-modal');
    if (!modal) return;
    
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
  
  // ========================================
  // UI UPDATE
  // ========================================
  
  function updateAuthUI() {
  const isAuthenticated = authState.isOwner;
  
  console.log('[Auth] 🎨 Updating UI, authenticated:', isAuthenticated);
  
  // Update buttons visibility
  const loginBtn = document.getElementById('btnLogin');
  const logoutBtn = document.getElementById('btnLogout');
  const addBtn = document.getElementById('btnAddProduct');
  const addPhysicalBtn = document.getElementById('btnAddPhysical');
  
  if (loginBtn) loginBtn.style.display = isAuthenticated ? 'none' : 'inline-flex';
  if (logoutBtn) logoutBtn.style.display = isAuthenticated ? 'inline-flex' : 'none';
  if (addBtn) addBtn.style.display = isAuthenticated ? 'inline-flex' : 'none';
  if (addPhysicalBtn) addPhysicalBtn.style.display = isAuthenticated ? 'inline-flex' : 'none';
  
  // Update body class
  document.body.classList.toggle('owner-mode', isAuthenticated);
  
  // Update owner tools
  document.querySelectorAll('.owner-tool').forEach(el => {
    el.style.display = isAuthenticated ? (el.dataset.display || 'inline-flex') : 'none';
  });
  
  // ✅ ===== AMPIANA ITY: MIORA SETTINGS VISIBILITY =====
  const mioraSettingsSection = document.getElementById('miora-settings-section');
  if (mioraSettingsSection) {
    mioraSettingsSection.style.display = isAuthenticated ? 'block' : 'none';
    
    // Update stats if authenticated
    if (isAuthenticated && typeof updateMioraSettingsUI === 'function') {
      updateMioraSettingsUI();
    }
  }
  // ✅ ===== FARANY =====
  
  // Call global applyAuthUI if exists
  if (typeof window.applyAuthUI === 'function') {
    window.applyAuthUI();
  }
}
  // ========================================
  // TOAST NOTIFICATION
  // ========================================
  
  function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.auth-toast').forEach(t => t.remove());
    
    const colors = {
      success: 'linear-gradient(135deg, #10b981, #059669)',
      error: 'linear-gradient(135deg, #ef4444, #dc2626)',
      info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    
    const toast = document.createElement('div');
    toast.className = 'auth-toast';
    toast.textContent = message;
    
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: ${colors[type] || colors.info};
      color: #fff;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 14px;
      z-index: 9999;
      animation: toastIn 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // ========================================
  // AUTH STATE LISTENER
  // ========================================
  
  async function initAuthListener() {
    try {
      const sb = await window.ensureSupabase();
      
      // Get initial session
      const { data: { session } } = await sb.auth.getSession();
      
      if (session && session.user) {
        // ✅ Vérifier si c'est le owner
        if (session.user.email.toLowerCase() === AUTH_CONFIG.ownerEmail.toLowerCase()) {
          authState.user = session.user;
          authState.session = session;
          authState.isOwner = true;
          updateAuthUI();
        }
      }
      
      // Subscribe to auth changes
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      
      const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
        console.log('[Auth] 🔄 Auth state changed:', event);
        
        if (session && session.user) {
          if (session.user.email.toLowerCase() === AUTH_CONFIG.ownerEmail.toLowerCase()) {
            authState.user = session.user;
            authState.session = session;
            authState.isOwner = true;
          } else {
            authState.user = null;
            authState.session = null;
            authState.isOwner = false;
          }
        } else {
          authState.user = null;
          authState.session = null;
          authState.isOwner = false;
        }
        
        updateAuthUI();
        
        // Reload products on auth change
        if (typeof window.fetchSupabaseProducts === 'function') {
          window.fetchSupabaseProducts().catch(console.error);
        }
      });
      
      authSubscription = subscription;
      
      console.log('[Auth] ✓ Auth listener initialized');
      
    } catch (err) {
      console.error('[Auth] ❌ Listener init error:', err);
    }
  }
  
  // ========================================
  // WIRE BUTTONS
  // ========================================
  
  function wireAuthButtons() {
    const loginBtn = document.getElementById('btnLogin');
    const logoutBtn = document.getElementById('btnLogout');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', openLoginModal);
      console.log('[Auth] ✓ Login button wired');
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
      console.log('[Auth] ✓ Logout button wired');
    }
  }
  
  // ========================================
  // PUBLIC API
  // ========================================
  
  window.MijoroAuth = {
    openLogin: openLoginModal,
    closeLogin: closeLoginModal,
    logout: handleLogout,
    isAuthenticated: () => authState.isOwner,
    getUser: () => authState.user,
    userAccount: authState.user
  };
  
  // Compatibility with old code
  window.isOwner = () => authState.isOwner;
  window.openOwnerLoginModal = openLoginModal;
  window.signOutOwner = handleLogout;
  
  // ========================================
  // INITIALIZE
  // ========================================
  
  function init() {
    console.log('[Auth] 🚀 Initializing secure authentication system...');
    
    wireAuthButtons();
    initAuthListener();
    updateAuthUI();
    
    console.log('[Auth] ✅ Authentication system ready');
  }
  
  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();

/* ==========================================
   TOAST ANIMATIONS
   ========================================== */

if (!document.getElementById('auth-toast-styles')) {
  const styles = document.createElement('style');
  styles.id = 'auth-toast-styles';
  styles.textContent = `
    @keyframes toastIn {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes toastOut {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(styles);
}

// ==========================================
// MIORA AI ASSISTANT - VERSION 2.1 FIXED
// Mijoro Boutique Integration
// ==========================================

console.log('🚀 [Miora] Starting initialization...');

// ==========================================
// 1. GLOBAL UTILITIES (VOALOHANY)
// ==========================================
(function initGlobalUtils() {
  'use strict';
  
  console.log('[Miora Utils] 🔧 Initializing...');
  
  // ✅ VAOVAO: Smart query detection with cleaning
window.detectQueryType = function(message) {
  const msg = message.toLowerCase().trim();
  
  console.log('[Detect] 📥 Raw message:', message);
  
  // ========================================
  // ✅ PRE-FILTER - Conversational Questions
  // ========================================
  // ========================================
// ✅ PRE-FILTER - Conversational Questions (ENHANCED)
// ========================================
const conversationalPatterns = [
  // About AI capabilities
  /\b(?:afaka|mahay|capable|can you|pouvez[- ]vous|able to)\s+(?:miteny|parler|speak|manao|faire|do)\b/i,
  
  // Greetings
  /^(?:salama|bonjour|hello|hi|hey|good morning|good evening|bonsoir|manao\s+ahoana)/i,
  
  // How are you
  /\b(?:manao ahoana|comment (?:vas|allez)|how are you|ça va|tsara ve)\b/i,
  
  // Who/What are you
  /\b(?:ianao|vous|you)\s+(?:iza|qui|who|inona|quoi|what)\b/i,
  /^(?:what|qui|iza|inona)\s+(?:is|are|es|no)\s+(?:miora|your|ton|votre)/i,
  
  // ✅ VAOVAO: Questions about Mijoro Boutique itself
  /\b(?:momba|à propos|about|concernant)\s+(?:ny\s+)?(?:mijoro\s*boutique|boutique|shop|magasin)\b/i,
  /\b(?:inona|quoi|what)\s+(?:no\s+)?(?:mijoro\s*boutique|la\s+boutique|the\s+shop)\b/i,
  /\b(?:mahalala|connaître|know)\s+.*(?:mijoro|boutique)\b/i,
  /\b(?:lazao|dis|tell).*(?:momba|à propos|about).*(?:mijoro|boutique)\b/i,
  
  // ✅ VAOVAO: About founder
  /\b(?:iza|qui|who)\s+(?:no\s+)?(?:namorona|a créé|created|fondateur|founder)\b/i,
  /\b(?:nahoana|pourquoi|why).*(?:mijoro|nom|name|anarana)\b/i,
  
  // ✅ VAOVAO: Job opportunities
  /\b(?:mandray|recrute|hiring|recherche).*(?:mpiasa|employés|workers|personnel)\b/i,
  /\b(?:asa|travail|job|emploi|mitady\s+asa)\b/i,
  
  // ✅ VAOVAO: Training questions
  /\b(?:fampiofanana|formation|training|cours)\b/i,
  /\b(?:mampanao|propose|offer).*(?:fampiofanana|formation|training)\b/i,
  
  // ✅ VAOVAO: Ordering process (not specific product)
  /\b(?:afaka|peut|can).*(?:manao\s+commande|commander|order|manafatra)\b/i,
  /^(?:manao|commander|order).*(?:commande|order)\s*ve\??$/i,
  
  // Help/Information about AI
  /\b(?:afaka|peut|can)\s+(?:manampy|aider|help|manao|faire|do)\b/i,
  /\b(?:inona|quoi|what)\s+(?:no|est|is)\s+(?:ataonao|votre|your)\b/i,
  
  // General conversation
  /^(?:ok|okay|d'accord|eny|yes|no|tsia|non|merci|misaotra|thanks?)\s*$/i,
  
  // Questions about Miora itself
  /\b(?:miora|assistant|chatbot|ai|intelligence)\b.*\b(?:ianao|vous|you|ton|votre|your)\b/i,
  
  // Contact questions (not product search)
  /\b(?:contact|fifandraisana|communication|joindre|mahazo|appeler|call)\b/i,
  /\b(?:whatsapp|email|téléphone|telephone|finday|numero|number|numéro)\b/i,
  
  // General questions without specific product intent
  /^(?:inona|quoi|what|ahoana|comment|how|oviana|quand|when|taiza|où|where|nahoana|pourquoi|why)\s+(?!.*(?:produit|product|zavatra|ebook|video|app|vêtement|vetement|akanjo))/i
];
  
  // Check if message matches conversational patterns
  for (const pattern of conversationalPatterns) {
    if (pattern.test(msg)) {
      console.log('[Detect] 💬 Conversational question detected, using AI');
      return null; // Let AI handle it
    }
  }
  
  // ========================================
  // PRODUCT SEARCH (intelligent with cleaning)
  // ========================================
  if (/mitady|cherche|search|find|misy|inona|ve|mahakasika|momba|tadiao|hitady/i.test(msg)) {
    // Extract search query intelligently
    const patterns = [
      { regex: /mitady\s+(.+?)(?:\s+ve|\s+ao|$)/i, name: 'mitady' },
      { regex: /cherche\s+(.+?)(?:\s+dans|$)/i, name: 'cherche' },
      { regex: /search\s+(?:for\s+)?(.+?)(?:\s+in|$)/i, name: 'search' },
      { regex: /find\s+(?:me\s+)?(.+?)(?:\s+for|$)/i, name: 'find' },
      { regex: /misy\s+(.+?)\s+ve/i, name: 'misy' },
      { regex: /inona\s+(?:ny|ireo)\s+(.+?)(?:\s+ve|$)/i, name: 'inona' },
      { regex: /mahakasika\s+(?:ny\s+)?(.+?)(?:\s+ve|$)/i, name: 'mahakasika' },
      { regex: /momba\s+(?:ny\s+)?(.+?)(?:\s+ve|$)/i, name: 'momba' }
    ];
    
    for (const pattern of patterns) {
      const match = msg.match(pattern.regex);
      if (match) {
        let query = match[1].trim();
        
        // ✅ SMART CLEANING
        query = query
          .replace(/\?+$/g, '') // Remove trailing ?
          .replace(/\s+(?:ao|ve|dans|in|for|amin'nareo|amin)\s*$/i, '') // Remove location suffixes
          .replace(/^(?:ny|ireo|ilay|le|la|les|the)\s+/i, '') // Remove articles
          .replace(/\s+(?:rehetra|tous|all|daholo)\s*$/i, '') // Remove "all"
          .trim();
        
        if (query.length >= 2) {
          console.log('[Detect] 🎯 Clean search query:', query);
          return { type: 'search', query: query };
        }
      }
    }
    
    // Fallback: extract keywords
    const keywords = msg
      .replace(/(mitady|cherche|search|find|misy|inona|mahakasika|momba|ve|ao|dans|in|for|amin'nareo)/gi, '')
      .trim();
    
    if (keywords.length >= 2) {
      console.log('[Detect] 🎯 Fallback search:', keywords);
      return { type: 'search', query: keywords };
    }
  }
  // ========================================
  // NOUVEAUTÉS / RECENT PRODUCTS
  // ========================================
  if (/(?:produit|zavatra|product).*(?:vaovao|nouveau|nouveauté|new|recent|farany|latest)|(?:vaovao|nouveau|new).*(?:produit|product)|(?:misy|y\s+a-t-il|are\s+there).*(?:vaovao|nouveau|new)|(?:nivoaka|sorti|released).*(?:farany|dernier|last)|(?:inona|quoi|what).*(?:nivoaka|sorti|released)|nouveauté/i.test(msg)) {
    console.log('[Detect] 🆕 New/recent products query');
    return { type: 'nouveaute', query: 'nouveaux produits' };
  }
  
  // ========================================
  // PRIX - CHEAP PRODUCTS
  // ========================================
  if (/(?:mora|pas\s+cher|cheap|low\s+cost|bon\s+marché|abordable|affordable).*(?:vidy|prix|price|cost)|(?:produit|zavatra|product).*(?:mora|cheap|pas\s+cher)|(?:misy|y\s+a-t-il|are\s+there).*(?:mora|cheap)|prix\s+(?:mora|moyen|bas|low)/i.test(msg)) {
    console.log('[Detect] 💰 Cheap products query');
    return { type: 'mora', query: 'produits bon marché' };
  }
  
  // ========================================
  // PRIX - EXPENSIVE PRODUCTS
  // ========================================
  if (/(?:lafo|cher|expensive|couteux|high\s+cost).*(?:vidy|prix|price|cost)|(?:produit|zavatra|product).*(?:lafo|cher|expensive)|(?:misy|y\s+a-t-il|are\s+there).*(?:lafo|cher)|prix\s+(?:lafo|élevé|high)/i.test(msg)) {
    console.log('[Detect] 💎 Expensive products query');
    return { type: 'lafo', query: 'produits chers' };
  }
  
  // ========================================
  // PROMOTIONS
  // ========================================
  if (/promotion|promo|fihainambidy|fihenam[-\s]?bidy|réduction|discount|solde|sale|special\s+(?:offer|price)/i.test(msg)) {
    console.log('[Detect] 🎉 Promotion query');
    return { type: 'promo', query: 'promotions' };
  }
// ========================================
// FREE PRODUCTS (ENHANCED - ALL PATTERNS)
// ========================================
// ✅ MALAGASY patterns
const mgFreePatterns = [
  /\b(?:mitady|tadidio|hitady)\s+.*(?:maimaim[-\s]?poana|poana)/i, // mitady maimaim-poana
  /\b(?:misy|inona|ahoana)\s+.*(?:maimaim[-\s]?poana|poana)/i, // misy maimaim-poana ve
  /\b(?:inona\s+(?:avy\s+)?(?:ny|ireo))\s+.*(?:maimaim[-\s]?poana|poana)/i, // inona avy ireo maimaim-poana
  /\b(?:asehoy|lazao)\s+.*(?:maimaim[-\s]?poana|poana)/i, // asehoy maimaim-poana
  /\bvokatra\s+(?:maimaim[-\s]?poana|poana)/i, // vokatra maimaim-poana
  /\b(?:produit|zavatra)\s+(?:maimaim[-\s]?poana|poana)/i, // produit maimaim-poana
  /\b(?:maimaim[-\s]?poana|poana)\s+(?:rehetra|daholo)/i, // maimaim-poana rehetra
  /^(?:maimaim[-\s]?poana|poana)\s*(?:ve)?\s*\??$/i // maimaim-poana / maimaim-poana ve
];

// ✅ FRENCH patterns
const frFreePatterns = [
  /\b(?:cherche|trouve|voir)\s+.*(?:gratuit|maimaim[-\s]?poana)/i, // cherche gratuit
  /\b(?:y\s+a-t-il|existe|avez-vous)\s+.*(?:gratuit|maimaim[-\s]?poana)/i, // y a-t-il gratuit
  /\b(?:quels?|quoi|lesquels)\s+.*(?:gratuit|maimaim[-\s]?poana)/i, // quels produits gratuits
  /\b(?:montre|donne)\s+.*(?:gratuit|maimaim[-\s]?poana)/i, // montre gratuit
  /\bproduits?\s+(?:gratuit|maimaim[-\s]?poana)/i, // produits gratuits
  /\b(?:gratuit|maimaim[-\s]?poana)\s+(?:disponible|en stock)/i, // gratuit disponible
  /^(?:gratuit|maimaim[-\s]?poana)s?\s*\??$/i // gratuit / gratuits?
];

// ✅ ENGLISH patterns
const enFreePatterns = [
  /\b(?:search|find|looking for)\s+.*(?:free|maimaim[-\s]?poana)/i, // search free
  /\b(?:are there|do you have|any)\s+.*(?:free|maimaim[-\s]?poana)/i, // are there free
  /\b(?:what|which)\s+.*(?:free|maimaim[-\s]?poana)/i, // what free products
  /\b(?:show|give)\s+.*(?:free|maimaim[-\s]?poana)/i, // show free
  /\bproducts?\s+(?:free|maimaim[-\s]?poana)/i, // products free
  /\b(?:free|maimaim[-\s]?poana)\s+(?:products?|items?)/i, // free products
  /^(?:free|maimaim[-\s]?poana)\s*\??$/i // free / free?
];

// ✅ COMBINED check
const allFreePatterns = [...mgFreePatterns, ...frFreePatterns, ...enFreePatterns];

for (const pattern of allFreePatterns) {
  if (pattern.test(msg)) {
    console.log('[Detect] 🎁 Free products query detected:', msg);
    console.log('[Detect] 🎯 Matched pattern:', pattern);
    
    // ✅ Extract clean keyword based on language
    let cleanQuery = 'produits gratuits';
    
    if (/maimaim[-\s]?poana/i.test(msg)) {
      cleanQuery = 'maimaim-poana';
    } else if (/gratuit/i.test(msg)) {
      cleanQuery = 'gratuit';
    } else if (/free/i.test(msg)) {
      cleanQuery = 'free';
    } else if (/poana/i.test(msg)) {
      cleanQuery = 'poana';
    }
    
    console.log('[Detect] 🎁 Clean query:', cleanQuery);
    return { type: 'free', query: cleanQuery };
  }
}

// ✅ FALLBACK: Simple keyword match (original logic)
if (/maimaim[-\s]?poana|gratuit|free|poana|tsy.*vola|sans.*payer/i.test(msg)) {
  console.log('[Detect] 🎁 Free products (fallback)');
  return { type: 'free', query: 'produits gratuits' };
}
  
  // ========================================
  // CATEGORIES - NUMÉRIQUE
  // ========================================
  if (/(?:mitady\s+)?(?:ebook|e-book|livre.*numerique|boky.*elektronika)/i.test(msg)) {
    return { type: 'category', category: 'ebook', query: 'ebooks' };
  }
  
  if (/(?:mitady\s+)?(?:video|vidéo|horonan-tsary|film|tutoriel)/i.test(msg)) {
    return { type: 'category', category: 'video', query: 'vidéos' };
  }
  
  if (/(?:mitady\s+)?(?:app|application|jeu|jeux|game|lalao|aplikasiona)/i.test(msg)) {
    return { type: 'category', category: 'apps', query: 'applications' };
  }
  
  // ========================================
  // CATEGORIES - PHYSIQUE
  // ========================================
  if (/(?:mitady\s+)?(?:vêtement|vetement|akanjo|clothing|clothes|t-shirt|pantalon)/i.test(msg)) {
    return { type: 'category', category: 'vêtements', query: 'vêtements' };
  }
  
  if (/(?:mitady\s+)?(?:électronique|electronique|electronic|elektronika|gadget)/i.test(msg)) {
    return { type: 'category', category: 'électronique', query: 'électronique' };
  }
  
  if (/(?:mitady\s+)?(?:accessoire|accessories|kojakoja|montre|bijou|sac)/i.test(msg)) {
    return { type: 'category', category: 'accessoires', query: 'accessoires' };
  }
  
  if (/(?:mitady\s+)?(?:livre.*physique|boky.*physique|physical.*book)/i.test(msg)) {
    return { type: 'category', category: 'livres', query: 'livres physiques' };
  }
  
  if (/(?:mitady\s+)?(?:autre|others|hafa|décoration|cadeau)/i.test(msg)) {
    return { type: 'category', category: 'autres', query: 'autres produits' };
  }
  
  if (/produit.*(?:physique|tangible)|zavatra.*physique|physical.*product/i.test(msg)) {
    return { type: 'category', category: 'physique', query: 'produits physiques' };
  }
  
  if (/produit.*(?:numérique|numerique|digital)|zavatra.*numérique/i.test(msg)) {
    return { type: 'category', category: 'numérique', query: 'produits numériques' };
  }
  
  // ========================================
// IMAGE GENERATION
// ========================================
if (/(?:sary|sarin|image|photo|dessin|picture|draw|generate.*image|create.*image|manao.*sary|mamorona.*sary)/i.test(msg)) {
  console.log('[Detect] 🎨 Potential image generation request');
  
  // Extract prompt intelligently
  const patterns = [
    /manao\s+sary\s+(.+)/i,
    /mamorona\s+sary\s+(.+)/i,
    /sary\s+(.+)/i,
    /g[ée]n[ée]r(?:e|er)\s+(?:une\s+)?image\s+(?:de\s+)?(.+)/i,
    /cr[ée]er?\s+(?:une\s+)?image\s+(?:de\s+)?(.+)/i,
    /create\s+(?:an?\s+)?image\s+(?:of\s+)?(.+)/i,
    /generate\s+(?:an?\s+)?image\s+(?:of\s+)?(.+)/i,
    /draw\s+(?:me\s+)?(?:an?\s+)?(.+)/i,
    /picture\s+of\s+(.+)/i,
    /photo\s+(?:de\s+)?(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (match) {
      let prompt = match[1].trim();
      
      // Clean prompt
      prompt = prompt
        .replace(/\?+$/g, '')
        .replace(/\s+(?:ve|svp|please|azafady)\s*$/i, '')
        .replace(/^(?:ny|ireo|ilay|le|la|les|the|a|an)\s+/i, '')
        .trim();
      
      if (prompt.length >= 3) {
        console.log('[Detect] 🎨 Image generation prompt:', prompt);
        return { type: 'image', prompt: prompt };
      }
    }
  }
}

console.log('[Detect] ❓ No specific query type detected');
return null;
};
})();

// ==========================================
// 2. SUPABASE CLIENT (DIRECT - SIMPLER)
// ==========================================
(function initSupabaseClient() {
  'use strict';
  
  console.log('[Miora Supabase] 🔗 Initializing...');
  
  // ✅ Anon key dia safe ho an'ny public (RLS protection)
  const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';
  
  window.supabaseClient = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
    
    async query(table, options = {}) {
      const { select = '*', limit, where, orderBy } = options;
      
      // ✅ Build REST API URL
      let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
      
      if (limit) url += `&limit=${limit}`;
      
      if (orderBy) {
        const [column, direction] = orderBy.split('.');
        url += `&order=${column}.${direction || 'desc'}`;
      }
      
      if (where) {
        Object.entries(where).forEach(([key, value]) => {
          url += `&${key}=eq.${value}`;
        });
      }
      
      try {
        console.log('[Supabase] 📡 Fetching:', url);
        
        const response = await fetch(url, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Supabase] ❌ Error:', response.status, errorText);
          throw new Error(`Supabase error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[Supabase] ✅ Success:', data?.length || 0, 'items');
        
        return data || [];
        
      } catch (error) {
        console.error('[Supabase] ❌ Query error:', error);
        return [];
      }
    }
  };
  
  console.log('[Miora Supabase] ✅ Client ready');
})();
// ==========================================
// 3. PRODUCT SEARCH ENGINE (FIXED)
// ==========================================
(function initProductSearch() {
  'use strict';
  
  console.log('[Miora Products] 🔍 Initializing...');
  
async function searchProducts(query, limit = 10) { // ⬅️ 5 → 10
    try {
      console.log('[Search] 🔍 Smart Query:', query);
    
    if (!window.supabaseClient) {
      console.error('[Search] ❌ Supabase client not available');
      return [];
    }
    
    const data = await window.supabaseClient.query('products', {
      select: '*',
      limit: 200,
      orderBy: 'created_at.desc'
    });
    
    if (!data || data.length === 0) {
      console.warn('[Search] ⚠️ No products in database');
      return [];
    }
    
    // ✅ VAOVAO: Normalize query (remove accents, typos)
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[éèêë]/g, 'e')
        .replace(/[àâä]/g, 'a')
        .replace(/[îï]/g, 'i')
        .replace(/[ôö]/g, 'o')
        .replace(/[ùûü]/g, 'u')
        .trim();
    };
    
    const searchNormalized = normalizeText(query);
    const keywords = searchNormalized.split(/\s+/).filter(w => w.length >= 2);
    
    console.log('[Search] 🎯 Normalized keywords:', keywords);
    
    // ✅ VAOVAO: Enhanced synonyms with normalized versions
    const synonyms = {
      'motivation': ['motiv', 'enthousias', 'inspir', 'manentana', 'fanentana'],
      'discipline': ['disciplin', 'rigueur', 'fifeheza'],
      'ebook': ['livre', 'boky', 'book', 'livr', 'numerique'],
      'video': ['video', 'horonan', 'film', 'tutoriel'],
      'app': ['application', 'jeu', 'game', 'aplikasiona', 'lalao', 'logiciel'],
      'formation': ['formation', 'cours', 'training', 'fiofana', 'lesona'],
      'developpement': ['develop', 'fampandrosoa', 'growth'],
      'business': ['business', 'affaire', 'raharaha', 'commerce', 'entreprenariat']
    };
    
    const expandedKeywords = new Set(keywords);
    keywords.forEach(keyword => {
      Object.entries(synonyms).forEach(([base, syns]) => {
        // ✅ VAOVAO: Fuzzy matching (3+ chars)
        if (keyword.length >= 3) {
          if (base.includes(keyword.substring(0, 3)) || keyword.includes(base.substring(0, 3))) {
            expandedKeywords.add(base);
            syns.forEach(s => expandedKeywords.add(s));
          }
          syns.forEach(syn => {
            if (syn.includes(keyword.substring(0, 3)) || keyword.includes(syn.substring(0, 3))) {
              expandedKeywords.add(base);
              expandedKeywords.add(syn);
            }
          });
        }
      });
    });
    
    console.log('[Search] 🔄 Expanded keywords:', Array.from(expandedKeywords));
    
    // ✅ VAOVAO: Enhanced scoring with fuzzy matching
    const results = data.map(p => {
      let score = 0;
      
      const searchableFields = {
        title: normalizeText(p.title || ''),
        description: normalizeText(p.description || ''),
        subtitle: normalizeText(p.subtitle || ''),
        category: normalizeText(p.category || ''),
        product_type: normalizeText(p.product_type || ''),
        badge: normalizeText(p.badge || ''),
        tags: Array.isArray(p.tags) ?
          p.tags.map(t => normalizeText(t)).join(' ') :
          normalizeText(p.tags || '')
      };
      
      Array.from(expandedKeywords).forEach(keyword => {
        // Exact match (highest score)
        if (searchableFields.title.includes(keyword)) score += 15;
        if (searchableFields.badge.includes(keyword)) score += 12;
        if (searchableFields.tags.includes(keyword)) score += 10;
        if (searchableFields.category.includes(keyword)) score += 8;
        if (searchableFields.product_type.includes(keyword)) score += 8;
        if (searchableFields.subtitle.includes(keyword)) score += 6;
        if (searchableFields.description.includes(keyword)) score += 3;
        
        // ✅ VAOVAO: Fuzzy match (partial)
        if (keyword.length >= 3) {
          const partial = keyword.substring(0, 3);
          if (searchableFields.title.includes(partial)) score += 5;
          if (searchableFields.description.includes(partial)) score += 1;
        }
      });
      
      return { ...p, score };
    });
    
    const filtered = results
      .filter(p => p.score > 0)
      .sort((a, b) => {
        // ✅ VAOVAO: Secondary sort by price (free first)
        if (b.score === a.score) {
          return (a.is_free ? 0 : 1) - (b.is_free ? 0 : 1);
        }
        return b.score - a.score;
      });
    
    console.log('[Search] ✅ Found:', filtered.length, 'matching products');
    
    if (filtered.length > 0) {
      console.log('[Search] 🏆 Top 3:', filtered.slice(0, 3).map(p => `${p.title} (score: ${p.score})`));
    }
    
    return filtered.slice(0, limit);
    
  } catch (error) {
    console.error('[Search] ❌ Error:', error);
    return [];
  }
}

// ✅ GET FREE PRODUCTS
async function getFreeProducts(limit = 10) { // ⬅️ 5 → 10
  try {
   console.log('[Search] 🎁 Getting free products...'); //
    
    if (!window.supabaseClient) {
      console.error('[Search] ❌ Supabase client not available');
      return [];
    }
    
    const data = await window.supabaseClient.query('products', {
      select: '*',
      limit: 200
    });
    
    console.log('[Search] 📦 Received:', data?.length || 0, 'products');
    
    if (!data || data.length === 0) {
      return [];
    }
    
    const free = data.filter(p => {
  // ✅ VAOVAO: Multiple checks
  const price = Number(p.price) || 0;
  const isFree = p.is_free === true || p.is_free === 'true';
  const isZeroPrice = price === 0;
  
  // ✅ Check badge too
  const hasFreeTag = p.badge && /gratuit|free|poana|maimaim/i.test(p.badge);
  const hasFreeInTags = Array.isArray(p.tags) &&
    p.tags.some(tag => /gratuit|free|poana|maimaim/i.test(tag));
  
  const result = isFree || isZeroPrice || hasFreeTag || hasFreeInTags;
  
  if (result) {
    console.log('[Search] ✅ Free product found:', p.title,
      'price:', price, 'is_free:', p.is_free, 'badge:', p.badge);
  }
  
  return result;
});
    
    console.log('[Search] ✅ Found:', free.length, 'free products');
    return free.slice(0, limit);
    
  } catch (error) {
    console.error('[Search] ❌ Error:', error);
    return [];
  }
}

// ✅ GET BY CATEGORY
async function getByCategory(category, limit = 10) { // ⬅️ 5 → 10
    try {
      console.log('[Search] 📂 Category:', category);
    
    if (!window.supabaseClient) {
      console.error('[Search] ❌ Supabase client not available');
      return [];
    }
    
    const data = await window.supabaseClient.query('products', {
      select: '*',
      limit: 200
    });
    
    console.log('[Search] 📦 Received:', data?.length || 0, 'products');
    
    if (!data || data.length === 0) {
      return [];
    }
    
    const categoryLower = category.toLowerCase();
    
    const results = data.filter(p => {
      const cat = (p.category || '').toLowerCase();
      const prodType = (p.product_type || '').toLowerCase();
      return cat.includes(categoryLower) || prodType.includes(categoryLower);
    });
    
    console.log('[Search] ✅ Found:', results.length, 'in category');
    return results.slice(0, limit);
    
  } catch (error) {
    console.error('[Search] ❌ Error:', error);
    return [];
  }
}

// ✅ GET ALL PRODUCTS (for debugging)
async function getAllProducts(limit = 20) {
  try {
    console.log('[Search] 📋 Getting all products...');
    
    if (!window.supabaseClient) {
      console.error('[Search] ❌ Supabase client not available');
      return [];
    }
    
    const data = await window.supabaseClient.query('products', {
      select: '*',
      limit: limit,
      orderBy: 'created_at.desc'
    });
    
    console.log('[Search] 📦 Received:', data?.length || 0, 'products');
    return data || [];
    
  } catch (error) {
    console.error('[Search] ❌ Error:', error);
    return [];
  }
}

// ✅ EXPOSE GLOBALLY
window.MioraSearch = {
  search: searchProducts,
  getFree: getFreeProducts,
  getCategory: getByCategory,
  getAll: getAllProducts
};
  
  console.log('[Miora Products] ✅ Search engine ready');
  
  // TEST AUTOMATIQUE
  setTimeout(async () => {
        console.log('[Search] 🧪 Running automatic test...');
        try {
          const allProducts = await getAllProducts(10); // ⬅️ 5 → 10
      console.log('[Search] 🧪 Sample products:', allProducts.length);
      
      if (allProducts.length > 0) {
        console.log('[Search] 🧪 First product title:', allProducts[0].title);
        
        const firstWord = allProducts[0].title.split(' ')[0];
        console.log('[Search] 🧪 Testing search with:', firstWord);
        
        const searchResults = await searchProducts(firstWord);
        console.log('[Search] 🧪 Search results:', searchResults.length);
        
        if (searchResults.length > 0) {
          console.log('[Search] ✅ TEST PASSED: Search working!');
        } else {
          console.warn('[Search] ⚠️ TEST FAILED: Search not finding products');
        }
      } else {
        console.warn('[Search] ⚠️ No products in database');
      }
      
    } catch (err) {
      console.error('[Search] ❌ TEST ERROR:', err);
    }
  }, 2000);
  
})();
// ==========================================
// 3.5 PRODUCT CACHE SYSTEM
// ==========================================
(function initProductCache() {
  'use strict';
  
  console.log('[Miora Cache] 💾 Initializing...');
  
  // ✅ Cache variables
  let productCache = null;
  let cacheTime = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // ✅ Clear cache function
  window.mioraClearCache = function() {
    productCache = null;
    cacheTime = 0;
    console.log('[Cache] 🗑️ Cleared');
    if (typeof showNotification === 'function') {
      showNotification('🔄 Cache effacé', 'info', 2000);
    }
  };
  
  // ✅ Get cache info
  window.mioraGetCacheInfo = function() {
    if (!productCache) {
      return { cached: false, count: 0, age: 0 };
    }
    
    const age = Date.now() - cacheTime;
    const remaining = CACHE_DURATION - age;
    
    return {
      cached: true,
      count: productCache.length,
      age: Math.floor(age / 1000), // seconds
      remaining: Math.floor(remaining / 1000) // seconds
    };
  };
  
  // ✅ Override getAllProducts with cache
  const originalGetAllProducts = window.MioraSearch.getAll;
  
  window.MioraSearch.getAll = async function(limit = 20) {
    const now = Date.now();
    
    // Check cache validity
    if (productCache && (now - cacheTime < CACHE_DURATION)) {
      console.log('[Cache] ✅ Using cached products:', productCache.length, '→', limit);
      console.log('[Cache] ⏱️ Age:', Math.floor((now - cacheTime) / 1000), 'seconds');
      return productCache.slice(0, limit);
    }
    
    // Cache expired or empty - fetch fresh
    console.log('[Cache] 🔄 Fetching fresh data...');
    
    try {
      const data = await originalGetAllProducts.call(this, 200); // Fetch max
      
      if (data && data.length > 0) {
        productCache = data;
        cacheTime = now;
        console.log('[Cache] ✅ Cached:', data.length, 'products');
      }
      
      return data.slice(0, limit);
      
    } catch (error) {
      console.error('[Cache] ❌ Fetch error:', error);
      
      // Fallback to old cache if exists
      if (productCache) {
        console.log('[Cache] ⚠️ Using old cache as fallback');
        return productCache.slice(0, limit);
      }
      
      throw error;
    }
  };
  
  // ✅ Auto-clear cache after duration
  setInterval(() => {
    if (productCache && (Date.now() - cacheTime >= CACHE_DURATION)) {
      console.log('[Cache] ⏰ Auto-clearing expired cache');
      productCache = null;
      cacheTime = 0;
    }
  }, 60000); // Check every minute
  
  console.log('[Miora Cache] ✅ Ready (5min duration)');
  
})();

// ==========================================
// 4. MAIN MIORA AI ASSISTANT
// ==========================================
(function initMioraPro() {
  'use strict';

  console.log('[Miora Core] 🤖 Initializing...');

  // ========================================
  // CONFIGURATION
  // ========================================
  const config = {
    name: "Miora",
    apiKey: localStorage.getItem('miora-api-key') || '',
    apiUrl: "https://zogohkfzplcuonkkfoov.supabase.co/functions/v1/miora-ai",
    model: "llama-3.1-8b-instant",
    imageApiUrl: "https://image.pollinations.ai/prompt/",
    maxHistoryLength: 100,
    autoSave: true,
    voiceEnabled: true,
    typingSpeed: 20,
    autoReadResponses: false,
    autoSendVoice: true, 
    
    imageStyles: {
      realistic: "photorealistic, 8k, highly detailed, professional photography",
      cartoon: "cartoon style, vibrant colors, playful, illustration",
      minimalist: "minimalist design, clean lines, simple, modern",
      vintage: "vintage poster style, retro, aged paper texture",
      artistic: "artistic painting, impressionist style, canvas texture",
      professional: "professional design, corporate, clean, modern"
    },
    
    imageSizes: {
      square: { width: 1024, height: 1024, label: "Carré" },
      portrait: { width: 768, height: 1024, label: "Portrait" },
      landscape: { width: 1024, height: 768, label: "Paysage" },
      story: { width: 1080, height: 1920, label: "Story" },
      wide: { width: 1920, height: 1080, label: "Large" }
    },
    
    themes: {
      purple: { 
        name: "Purple Dream",
        primary: '#667eea', 
        secondary: '#764ba2',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      },
      blue: { 
        name: "Ocean Blue",
        primary: '#3b82f6', 
        secondary: '#1e40af',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'
      },
      green: { 
        name: "Forest Green",
        primary: '#10b981', 
        secondary: '#059669',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      },
      pink: { 
        name: "Rose Pink",
        primary: '#ec4899', 
        secondary: '#db2777',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
      },
      orange: { 
        name: "Sunset Orange",
        primary: '#f97316', 
        secondary: '#ea580c',
        gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
      },
      dark: {
        name: "Dark Mode",
        primary: '#1f2937',
        secondary: '#111827',
        gradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
      }
    }
  };

  // ========================================
  // DOM ELEMENTS
  // ========================================
  // ✅ VAOVAO (tsy misy image upload):
const elements = {
  navBtn: document.getElementById('nav-miora'),
  chatWindow: document.getElementById('miora-chat'),
  closeBtn: document.getElementById('miora-close'),
  messagesDiv: document.getElementById('miora-messages'),
  inputField: document.getElementById('miora-input'),
  sendBtn: document.getElementById('miora-send'),
  quickActionsContainer: document.querySelector('.miora-quick-actions')
};

  // Validation
  if (!elements.navBtn || !elements.chatWindow || !elements.messagesDiv) {
    console.error('❌ Miora: Missing critical elements');
    return;
  }

  // ========================================
  // STATE
  // ========================================
  const state = {
  conversationHistory: [],
  currentLanguage: localStorage.getItem('miora-language') || 'mg', 
  currentTheme: localStorage.getItem('miora-theme') || 'purple',
  isDarkMode: localStorage.getItem('miora-dark-mode') === 'true',
  isTyping: false,
  isRecording: false, // ⬅️ VAOVAO: Track recording state
   currentAssistant: localStorage.getItem('miora-current-assistant') || 'miora',
  // ⬆️⬆️⬆️ FIN AJOUT ⬆️⬆️⬆️
  pinnedMessages: JSON.parse(localStorage.getItem('miora-pinned') || '[]'),
  favorites: JSON.parse(localStorage.getItem('miora-favorites') || '[]'),
  imageStyle: localStorage.getItem('miora-image-style') || 'professional',
  imageSize: localStorage.getItem('miora-image-size') || 'square',
  recognition: null,
  synthesis: window.speechSynthesis,
  stats: JSON.parse(localStorage.getItem('miora-stats') || '{"messagesCount":0,"startDate":"' + new Date().toISOString() + '","userMessages":0,"aiMessages":0}'),
  draftMessage: localStorage.getItem('miora-draft') || '',
  notificationsEnabled: localStorage.getItem('miora-notifications') !== 'false',
  soundEnabled: localStorage.getItem('miora-sound') !== 'false'
};


  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  
  // ========================================
// FIXED LANGUAGE DETECTION - PRIORITY ORDER
// ========================================
// ✅ VAOVAO: Add currentLanguage parameter
window.detectLanguage = function(text, currentLanguage = 'mg') {
  const msg = text.toLowerCase().trim();
  
  console.log('[Language] 🔍 Analyzing:', msg.substring(0, 50));
  
  // ✅ Use parameter instead of state.currentLanguage
  if (msg.length < 3) {
    console.log('[Language] ⏩ Too short, keeping:', currentLanguage);
    return currentLanguage;
  }
  
  // ========================================
  // STEP 1: ENGLISH DETECTION (PRIORITY)
  // ========================================
  const englishStrongIndicators = [
    'tell me', 'show me', 'give me', 'what is', 'how to',
    'where is', 'when did', 'why does', 'who is',
    'i want', 'i need', 'i would', 'can you', 'could you',
    'please help', 'thank you', 'hello there'
  ];
  
  for (const phrase of englishStrongIndicators) {
    if (msg.includes(phrase)) {
      console.log('[Language] 🇬🇧 STRONG English phrase:', phrase);
      return 'en';
    }
  }
  
  const englishKeywords = [
    'tell', 'about', 'what', 'how', 'where', 'when', 'why', 'who',
    'show', 'find', 'search', 'get', 'give', 'help', 'please',
    'the', 'this', 'that', 'these', 'those',
    'is', 'are', 'was', 'were', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'should', 'could',
    'hello', 'thanks', 'thank', 'yes', 'product', 'price'
  ];
  
  let enCount = 0;
  const words = msg.split(/\s+/);
  
  words.forEach(word => {
    if (englishKeywords.includes(word)) {
      enCount++;
    }
  });
  
  if (enCount >= 3) {
    console.log('[Language] 🇬🇧 English detected (', enCount, 'keywords)');
    return 'en';
  }
  
  // ========================================
  // STEP 2: FRENCH DETECTION
  // ========================================
  const frenchStrongIndicators = [
    'dis moi', 'montre moi', 'donne moi', 'qu\'est-ce',
    'comment faire', 'où est', 'quand est', 'pourquoi',
    's\'il te plaît', 's\'il vous plaît', 'merci beaucoup'
  ];
  
  for (const phrase of frenchStrongIndicators) {
    if (msg.includes(phrase)) {
      console.log('[Language] 🇫🇷 STRONG French phrase:', phrase);
      return 'fr';
    }
  }
  
  const frenchKeywords = [
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'le', 'la', 'les', 'un', 'une', 'des',
    'et', 'ou', 'mais', 'donc', 'pour', 'avec', 'dans', 'sur',
    'comment', 'quoi', 'quel', 'quelle', 'où',
    'cherche', 'trouve', 'montre', 'donne',
    'bonjour', 'salut', 'merci', 'oui', 'non',
    'produit', 'prix', 'gratuit', 'acheter'
  ];
  
  let frCount = 0;
  words.forEach(word => {
    if (frenchKeywords.includes(word)) {
      frCount++;
    }
  });
  
  if (frCount >= 3) {
    console.log('[Language] 🇫🇷 French detected (', frCount, 'keywords)');
    return 'fr';
  }
  
  // ========================================
  // STEP 3: MALAGASY DETECTION (LAST)
  // ========================================
  const malagasyStrongIndicators = [
    'lazao ahy', 'asehoy ahy', 'omeo ahy', 'inona no',
    'ahoana ny', 'taiza ny', 'rahoviana', 'nahoana',
    'azafady tompoko', 'misaotra betsaka', 'eny tompoko'
  ];
  
  for (const phrase of malagasyStrongIndicators) {
    if (msg.includes(phrase)) {
      console.log('[Language] 🇲🇬 STRONG Malagasy phrase:', phrase);
      return 'mg';
    }
  }
  
  const malagasyKeywords = [
    'aho', 'ianao', 'izy', 'isika', 'izahay', 'ianareo', 'izy ireo',
    'dia', 'ny', 'amin', 'fa', 'misy', 'tsy', 'mila', 'tiako',
    'ahoana', 'inona', 've', 'mitady', 'mahafantatra',
    'manao', 'mandeha', 'mihaino', 'mijery', 'mamaky',
    'salama', 'misaotra', 'azafady', 'eny', 'tsia',
    'zavatra', 'olona', 'toerana', 'fotoana'
  ];
  
  let mgCount = 0;
  words.forEach(word => {
    if (malagasyKeywords.includes(word)) {
      mgCount++;
    }
  });
  
  if (mgCount >= 3) {
    console.log('[Language] 🇲🇬 Malagasy detected (', mgCount, 'keywords)');
    return 'mg';
  }
  
  // ========================================
  // FALLBACK: KEEP CURRENT LANGUAGE
  // ========================================
  console.log('[Language] 🔄 Ambiguous, keeping:', currentLanguage);
  console.log('[Language] 📊 Scores - EN:', enCount, 'FR:', frCount, 'MG:', mgCount);
  
  return currentLanguage;
};
  function formatText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    let formatted = div.innerHTML;
    
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');
    formatted = formatted.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
    
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.+<\/li>)/s, '<ul>$1</ul>');
    }
    
    return formatted;
  }

  function playSound(type = 'success') {
    if (!state.soundEnabled) return;
    
    const sounds = {
      success: [523.25, 659.25],
      warning: [440, 349.23],
      error: [329.63, 261.63],
      message: [659.25, 783.99]
    };
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const frequencies = sounds[type] || sounds.success;
    
    frequencies.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime + (i * 0.1));
      oscillator.stop(audioContext.currentTime + (i * 0.1) + 0.1);
    });
  }

  function showNotification(message, type = 'info', duration = 3000) {
    if (!state.notificationsEnabled) return;
    
    const notification = document.createElement('div');
    notification.className = `miora-notification miora-notification-${type}`;
    notification.textContent = message;
    
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: state.currentTheme ? config.themes[state.currentTheme].primary : '#3b82f6'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 24px;
      background: ${colors[type]};
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: 600;
      font-size: 14px;
      animation: slideInRight 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    
    document.body.appendChild(notification);
    playSound(type);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  function updateStats(type) {
    state.stats.messagesCount = (state.stats.messagesCount || 0) + 1;
    state.stats.lastActivity = new Date().toISOString();
    
    if (type === 'user') {
      state.stats.userMessages = (state.stats.userMessages || 0) + 1;
    } else {
      state.stats.aiMessages = (state.stats.aiMessages || 0) + 1;
    }
    
    localStorage.setItem('miora-stats', JSON.stringify(state.stats));
  }

  function applyTheme(themeName) {
    const theme = config.themes[themeName];
    if (!theme) return;
    
    const root = document.documentElement;
    root.style.setProperty('--miora-primary', theme.primary);
    root.style.setProperty('--miora-secondary', theme.secondary);
    root.style.setProperty('--miora-gradient', theme.gradient);
    
    state.currentTheme = themeName;
    localStorage.setItem('miora-theme', themeName);
    
    showNotification(`🎨 Theme: ${theme.name}`, 'success', 2000);
  }

  function toggleDarkMode(enabled) {
    state.isDarkMode = enabled;
    localStorage.setItem('miora-dark-mode', enabled);
    
    if (enabled) {
      document.body.classList.add('miora-dark-mode');
      applyTheme('dark');
    } else {
      document.body.classList.remove('miora-dark-mode');
      applyTheme(state.currentTheme === 'dark' ? 'purple' : state.currentTheme);
    }
    
    showNotification(enabled ? '🌙 Dark Mode' : '☀️ Light Mode', 'info', 1500);
  }
// ========================================
  // ✅✅✅ DÉBUT AJOUT - ASSISTANT SWITCH ✅✅✅
  // ========================================
  
  // CREATE SWITCH UI
  function createAssistantSwitch() {
    const switchContainer = document.createElement('div');
    switchContainer.className = 'miora-assistant-switch';
    switchContainer.id = 'miora-assistant-switch';
    switchContainer.innerHTML = `
      <div class="assistant-switch-wrapper">
        <button class="assistant-option active" data-assistant="miora" title="Miora - Assistant Boutique">
          <img src="https://i.ibb.co/5xkSKtLt/IMG-20251116-WA0000.jpg" alt="Miora" class="assistant-avatar">
          <div class="assistant-info">
            <div class="assistant-name">Miora</div>
            <div class="assistant-role">Boutique</div>
          </div>
        </button>
        
        <button class="assistant-option" data-assistant="agent" title="Agent Miora - Assistant Général">
          <img src="https://i.ibb.co/fVfNcLv9/file-000000008188722fb075911ad3cee715.png" alt="Agent Miora" class="assistant-avatar">
          <div class="assistant-info">
            <div class="assistant-name">Agent Miora</div>
            <div class="assistant-role">Culture Générale</div>
          </div>
        </button>
      </div>
    `;
    
    return switchContainer;
  }
  
  // SWITCH FUNCTION
  function switchAssistant(assistantType) {
    console.log('[Assistant] 🔄 Switching to:', assistantType);
    
    state.currentAssistant = assistantType;
    localStorage.setItem('miora-current-assistant', assistantType);
    
    // Update UI
    document.querySelectorAll('.assistant-option').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const selectedBtn = document.querySelector(`.assistant-option[data-assistant="${assistantType}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('active');
    }
    
    // Update avatar
    updateMessageAvatars(assistantType);
    
    // Show notification
    const names = {
      'miora': '🏪 Miora - Assistant Boutique',
      'agent': '🌍 Agent Miora - Culture Générale'
    };
    
    showNotification(names[assistantType] || 'Assistant changé', 'success', 2000);
    
    // Add system message
    const messages = {
      'mg': {
        'miora': '🏪 Tongasoa eto amin\'ny Miora 😁 🇲🇬! Afaka manampy anao momba ny Mijoro Boutique.',
        'agent': '🌍 Tongasoa eto amin\'ny Agent Miora🇲🇬! Afaka manampy anao amin\'ny zavatra rehetra.'
      },
      'fr': {
        'miora': '🏪 Bienvenue avec Miora! Je vous aide avec Mijoro Boutique.',
        'agent': '🌍 Bienvenue avec Agent Miora! Je peux vous aider avec tout.'
      },
      'en': {
        'miora': '🏪 Welcome to Miora! I help you with Mijoro Boutique.',
        'agent': '🌍 Welcome to Agent Miora! I can help you with anything.'
      }
    };
    
    const msg = messages[state.currentLanguage]?.[assistantType] || messages['mg'][assistantType];
    addMessage(msg, false, null, false);
  }
  
  function updateMessageAvatars(assistantType) {
    const avatarUrl = assistantType === 'miora' 
      ? 'https://i.ibb.co/5xkSKtLt/IMG-20251116-WA0000.jpg'
      : 'https://i.ibb.co/fVfNcLv9/file-000000008188722fb075911ad3cee715.png';
    
    window.currentAssistantAvatar = avatarUrl;
  }
  
  // EXPOSE GLOBALLY
  window.mioraSwitchAssistant = switchAssistant;
  
  function saveDraft() {
    const text = elements.inputField.value.trim();
    if (text) {
      state.draftMessage = text;
      localStorage.setItem('miora-draft', text);
    } else {
      localStorage.removeItem('miora-draft');
    }
  }

  function loadDraft() {
    if (state.draftMessage) {
      elements.inputField.value = state.draftMessage;
      showNotification('📝 Brouillon chargé', 'info', 2000);
    }
  }

  // ========================================
  // CONVERSATION MANAGEMENT
  // ========================================
  
  function saveConversation() {
  // ✅ DISABLED: No localStorage for history
  console.log('💾 [Session Only] Conversation saved in memory');
  // History dia mitoetra ao @ state.conversationHistory fotsiny
}

function loadConversation() {
  // ✅ DISABLED: No localStorage loading
  console.log('📂 [Session Only] Starting fresh conversation');
  // Tsy maka historique taloha intsony
}

  function exportConversation() {
    const data = {
      exportDate: new Date().toISOString(),
      language: state.currentLanguage,
      theme: state.currentTheme,
      messageCount: state.conversationHistory.length,
      statistics: state.stats,
      messages: state.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        imageUrl: msg.imageUrl
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miora-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('✅ Conversation exportée!', 'success');
  }

  function clearHistory() {
    const confirmMsg = state.currentLanguage === 'mg' ? 
      'Hofafana ny conversation rehetra?' :
      state.currentLanguage === 'fr' ?
      'Effacer toute la conversation?' :
      'Clear all conversation history?';
    
    if (!confirm(confirmMsg)) return;
    
    state.conversationHistory = [];
    // ✅ No localStorage to remove
console.log('🗑️ History cleared from memory only');
    
    const messages = elements.messagesDiv.querySelectorAll('.miora-message:not(:first-child)');
    messages.forEach(msg => msg.remove());
    
    showNotification('🗑️ Historique effacé', 'info');
  }

  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================
  
  function addMessage(text, isUser = false, imageUrl = null, animate = true, messageId = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `miora-message ${isUser ? 'miora-user' : 'miora-bot'}`;
    msgDiv.dataset.messageId = messageId || Date.now();
    
    const formattedText = isUser ? text : (animate ? '' : formatText(text));
    
    let imageHTML = '';
    if (imageUrl) {
      imageHTML = `
        <div class="miora-message-image">
          <img src="${imageUrl}" alt="Image" onclick="window.mioraViewImage('${imageUrl}')" loading="lazy">
        </div>
      `;
    }
    
  // ✅✅✅ REMPLACER CETTE PARTIE ✅✅✅
const currentAvatar = window.currentAssistantAvatar ||
  (state.currentAssistant === 'agent' ?
    'https://i.ibb.co/fVfNcLv9/file-000000008188722fb075911ad3cee715.png' :
    'https://i.ibb.co/5xkSKtLt/IMG-20251116-WA0000.jpg');

const avatarHTML = isUser ?
  '<i class="fa-solid fa-user"></i>' :
  `<img src="${currentAvatar}" alt="${state.currentAssistant === 'agent' ? 'Agent Miora' : 'Miora'}" class="miora-msg-avatar">`;
// ⬆️⬆️⬆️ FIN REMPLACEMENT ⬆️⬆️⬆️
    
    const isPinned = state.pinnedMessages.includes(msgDiv.dataset.messageId);
    const pinIcon = isPinned ? 'fa-solid fa-thumbtack' : 'fa-regular fa-thumbtack';
    
    msgDiv.innerHTML = `
      <div class="miora-message-avatar">
        ${avatarHTML}
      </div>
      <div class="miora-message-content">
        <div class="miora-message-text">${formattedText}</div>
        ${imageHTML}
        <div class="miora-message-actions">
          ${!isUser ? `
            <button class="msg-action-btn" onclick="window.mioraCopy(this)" title="Copier">
              <i class="fa-solid fa-copy"></i>
            </button>
            <button class="msg-action-btn" onclick="window.mioraSpeak(this)" title="Lire">
              <i class="fa-solid fa-volume-up"></i>
            </button>
          ` : ''}
          <button class="msg-action-btn" onclick="window.mioraPinMessage(this)" title="Épingler">
            <i class="${pinIcon}"></i>
          </button>
          <button class="msg-action-btn msg-delete-btn" onclick="window.mioraDeleteMessage(this)" title="Supprimer">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    
    elements.messagesDiv.appendChild(msgDiv);
    elements.messagesDiv.scrollTop = elements.messagesDiv.scrollHeight;
    
    return msgDiv;
  }

  async function typeMessage(text, element, speed = config.typingSpeed) {
    return new Promise((resolve) => {
      let i = 0;
      element.innerHTML = '';state.isTyping = true;
      
      function type() {
        if (i < text.length) {
          if (text[i] === '<') {
            const tagEnd = text.indexOf('>', i);
            if (tagEnd !== -1) {
              element.innerHTML += text.substring(i, tagEnd + 1);
              i = tagEnd + 1;
            } else {
              element.innerHTML += text[i];
              i++;
            }
          } else {
            element.innerHTML += text[i];
            i++;
          }
          
          elements.messagesDiv.scrollTop = elements.messagesDiv.scrollHeight;
          setTimeout(type, speed);
        } else {
          state.isTyping = false;
          
          if (config.autoReadResponses && state.synthesis) {
            speakResponse(text);
          }
          
          resolve();
        }
      }
      
      type();
    });
  }

  function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'miora-message miora-bot miora-typing-msg';
    typingDiv.innerHTML = `
      <div class="miora-message-avatar">
        <img src="https://i.ibb.co/5xkSKtLt/IMG-20251116-WA0000.jpg" alt="Miora" class="miora-msg-avatar">
      </div>
      <div class="miora-message-content">
        <div class="miora-message-text">
          <span class="miora-typing">
            <span></span><span></span><span></span>
          </span>
        </div>
      </div>
    `;
    elements.messagesDiv.appendChild(typingDiv);
    elements.messagesDiv.scrollTop = elements.messagesDiv.scrollHeight;
    return typingDiv;
  }

  // ========================================
  // MESSAGE ACTIONS (Global Functions)
  // ========================================
  
  window.mioraCopy = function(btn) {
    const text = btn.closest('.miora-message-content')
      .querySelector('.miora-message-text').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
      }, 2000);
      showNotification('📋 Copié!', 'success', 1500);
    });
  };

  window.mioraSpeak = function(btn) {
    const text = btn.closest('.miora-message-content')
      .querySelector('.miora-message-text').textContent;
    speakResponse(text);
  };

  window.mioraPinMessage = function(btn) {
    const msgDiv = btn.closest('.miora-message');
    const messageId = msgDiv.dataset.messageId;
    const icon = btn.querySelector('i');
    
    if (state.pinnedMessages.includes(messageId)) {
      state.pinnedMessages = state.pinnedMessages.filter(id => id !== messageId);
      icon.className = 'fa-regular fa-thumbtack';
      showNotification('📌 Message désépinglé', 'info', 1500);
    } else {
      state.pinnedMessages.push(messageId);
      icon.className = 'fa-solid fa-thumbtack';
      showNotification('📌 Message épinglé', 'success', 1500);
    }
    
    localStorage.setItem('miora-pinned', JSON.stringify(state.pinnedMessages));
  };

  window.mioraDeleteMessage = function(btn) {
    if (!confirm('Supprimer ce message?')) return;
    
    const msgDiv = btn.closest('.miora-message');
    const messageId = msgDiv.dataset.messageId;
    
    state.conversationHistory = state.conversationHistory.filter(
      msg => msg.timestamp !== parseInt(messageId)
    );
    
    msgDiv.remove();
    saveConversation();
    showNotification('🗑️ Message supprimé', 'info', 1500);
  };

  window.mioraViewImage = function(url) {
    const overlay = document.createElement('div');
    overlay.className = 'miora-image-overlay';
    overlay.innerHTML = `
      <div class="miora-image-viewer">
        <button class="miora-image-close" onclick="this.closest('.miora-image-overlay').remove()">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <img src="${url}" alt="Full image">
        <div class="miora-image-actions">
          <a href="${url}" download class="miora-image-download">
            <i class="fa-solid fa-download"></i> Télécharger
          </a>
        </div>
      </div>
    `;
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    document.body.appendChild(overlay);
  };
// ========================================
// PRODUCT COMPARISON FEATURE
// ========================================
(function initProductComparison() {
  console.log('[Comparison] 📊 Initializing...');
  
  window.mioraComparisonList = [];
  
  window.mioraAddToComparison = function(productId, productData) {
    // Check if already in comparison
    if (window.mioraComparisonList.find(p => p.id === productId)) {
      showNotification('⚠️ Efa ao anaty comparison', 'warning', 2000);
      return;
    }
    
    // Max 3 products
    if (window.mioraComparisonList.length >= 3) {
      showNotification('⚠️ Max 3 produit no azo ampitahaina', 'warning', 2000);
      return;
    }
    
    window.mioraComparisonList.push({
      id: productId,
      ...productData
    });
    
    showNotification(`✅ Ampidirina ao amin'ny comparison (${window.mioraComparisonList.length}/3)`, 'success', 2000);
    
    // Show comparison button if 2+ products
    if (window.mioraComparisonList.length >= 2) {
      showComparisonButton();
    }
  };
  
  window.mioraShowComparison = function() {
    if (window.mioraComparisonList.length < 2) {
      showNotification('⚠️ Mila 2 produit farafahakeliny', 'warning');
      return;
    }
    
    const msgDiv = window.mioraAddMessage('', false);
    const textDiv = msgDiv.querySelector('.miora-message-text');
    
    let html = `<div style="color:#fff;">`;
    
    html += `<div style="padding:14px; background:linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius:10px; margin-bottom:16px; text-align:center;">
      <div style="font-size:16px; font-weight:700;">📊 Fampitahana Produit</div>
    </div>`;
    
    // Comparison table
    html += `<div style="overflow-x:auto;">
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr style="background:rgba(139,92,246,0.2);">
            <th style="padding:10px; text-align:left; border:1px solid rgba(148,163,184,0.2);">Critères</th>`;
    
    window.mioraComparisonList.forEach(p => {
      html += `<th style="padding:10px; text-align:center; border:1px solid rgba(148,163,184,0.2);">${p.title}</th>`;
    });
    
    html += `</tr></thead><tbody>`;
    
    // Price row
    html += `<tr><td style="padding:10px; border:1px solid rgba(148,163,184,0.2); font-weight:600;">💰 Prix</td>`;
    window.mioraComparisonList.forEach(p => {
      const price = p.price > 0 ? `${Number(p.price).toLocaleString()} AR` : 'MAIMAIM-POANA';
      const color = p.price > 0 ? '#10b981' : '#f59e0b';
      html += `<td style="padding:10px; border:1px solid rgba(148,163,184,0.2); text-align:center; color:${color}; font-weight:700;">${price}</td>`;
    });
    html += `</tr>`;
    
    // Category row
    html += `<tr><td style="padding:10px; border:1px solid rgba(148,163,184,0.2); font-weight:600;">🏷️ Catégorie</td>`;
    window.mioraComparisonList.forEach(p => {
      html += `<td style="padding:10px; border:1px solid rgba(148,163,184,0.2); text-align:center;">${p.category || '-'}</td>`;
    });
    html += `</tr>`;
    
    // Badge row
    html += `<tr><td style="padding:10px; border:1px solid rgba(148,163,184,0.2); font-weight:600;">⭐ Badge</td>`;
    window.mioraComparisonList.forEach(p => {
      html += `<td style="padding:10px; border:1px solid rgba(148,163,184,0.2); text-align:center;">${p.badge || '-'}</td>`;
    });
    html += `</tr>`;
    
    html += `</tbody></table></div>`;
    
    // Actions
    html += `<div style="margin-top:16px; display:flex; gap:8px;">
      <button onclick="window.mioraClearComparison()" style="flex:1; padding:10px; background:rgba(239,68,68,0.2); color:#fca5a5; border:1px solid #ef4444; border-radius:8px; cursor:pointer;">
        🗑️ Fafao
      </button>
    </div>`;
    
    html += `</div>`;
    
    textDiv.innerHTML = html;
  };
  
  window.mioraClearComparison = function() {
    window.mioraComparisonList = [];
    hideComparisonButton();
    showNotification('🗑️ Comparison fafana', 'info', 1500);
  };
  
  function showComparisonButton() {
    let btn = document.getElementById('miora-comparison-float-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'miora-comparison-float-btn';
      btn.style.cssText = `
        position: fixed;
        bottom: 120px;
        right: 20px;
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 20px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 8px 24px rgba(139,92,246,0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideInRight 0.3s ease;
      `;
      btn.innerHTML = `📊 Ampitahao (${window.mioraComparisonList.length})`;
      btn.onclick = window.mioraShowComparison;
      document.body.appendChild(btn);
    } else {
      btn.innerHTML = `📊 Ampitahao (${window.mioraComparisonList.length})`;
      btn.style.display = 'flex';
    }
  }
  
  function hideComparisonButton() {
    const btn = document.getElementById('miora-comparison-float-btn');
    if (btn) btn.style.display = 'none';
  }
  
  console.log('[Comparison] ✅ Ready');
})();
  // ========================================
  // VOICE FUNCTIONS
  // ========================================
  // ========================================
// VOICE RECORDING ENHANCED - FENO
// ========================================
function setupVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('⚠️ Speech recognition not supported');
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  state.recognition = new SpeechRecognition();
  
  // ✅ VAOVAO: Enhanced settings with error recovery
  state.recognition.continuous = true;
  state.recognition.interimResults = true;
  state.recognition.maxAlternatives = 3;
  
  const languageMap = {
    'mg': 'mg-MG',
    'fr': 'fr-FR',
    'en': 'en-US'
  };
  state.recognition.lang = languageMap[state.currentLanguage] || 'mg-MG';
  
  let restartTimeout;
  let isManualStop = false;
  
  state.recognition.onstart = () => {
    console.log('🎤 Voice recording started');
    isManualStop = false;
    const micBtn = document.getElementById('miora-mic-btn');
    if (micBtn) {
      micBtn.classList.add('listening', 'pulsing');
      micBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
      micBtn.setAttribute('aria-label', 'Arrêter l\'enregistrement vocal');
      micBtn.style.animation = 'pulse 1.5s infinite';
    }
    showRecordingIndicator();
    showNotification('🎤 Mihaino...', 'info', 2000);
  };
  
  state.recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    
    if (interimTranscript) {
      elements.inputField.value = finalTranscript + interimTranscript;
      elements.inputField.style.color = '#94a3b8';
    }
    
    if (finalTranscript) {
      elements.inputField.value = (elements.inputField.value + finalTranscript).trim();
      elements.inputField.style.color = '#fff';
      console.log('🎤 Final transcript:', finalTranscript);
    }
  };
  
  // ✅ VAOVAO: Enhanced error handling with retry
  state.recognition.onerror = (event) => {
    console.error('🎤 Recognition error:', event.error);
    const micBtn = document.getElementById('miora-mic-btn');
    if (micBtn) {
      micBtn.classList.remove('listening', 'pulsing');
      micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      micBtn.setAttribute('aria-label', 'Commencer l\'enregistrement vocal');
      micBtn.style.animation = '';
    }
    hideRecordingIndicator();
    
    // ✅ RETRY LOGIC for recoverable errors
    if (['no-speech', 'audio-capture'].includes(event.error) && !isManualStop) {
      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(() => {
        console.log('🔄 Retrying voice recognition...');
        try {
          state.recognition.start();
        } catch (err) {
          console.error('❌ Retry failed:', err);
        }
      }, 1000);
      
      showNotification('🔄 Manandrana indray...', 'warning', 2000);
    } else {
      const errorMessages = {
        'not-allowed': { mg: '⚠️ Tsy manome alàlana ny mikro', fr: '⚠️ Microphone non autorisé', en: '⚠️ Microphone not allowed' },
        'network': { mg: '⚠️ Olana connexion', fr: '⚠️ Erreur réseau', en: '⚠️ Network error' },
        'aborted': { mg: '🛑 Tapaka', fr: '🛑 Interrompu', en: '🛑 Aborted' }
      };
      
      const msg = errorMessages[event.error] || { mg: '⚠️ Tsy afaka mihaino', fr: '⚠️ Erreur microphone', en: '⚠️ Microphone error' };
      showNotification(msg[state.currentLanguage] || msg.fr, 'error');
    }
  };
  
  state.recognition.onend = () => {
    clearTimeout(restartTimeout);
    const micBtn = document.getElementById('miora-mic-btn');
    if (micBtn) {
      micBtn.classList.remove('listening', 'pulsing');
      micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      micBtn.setAttribute('aria-label', 'Commencer l\'enregistrement vocal');
      micBtn.style.animation = '';
    }
    hideRecordingIndicator();
    
    const text = elements.inputField.value.trim();
    if (text && config.autoSendVoice && !isManualStop) {
      setTimeout(() => sendMessage(), 500);
    }
  };
  
  // ✅ VAOVAO: Manual stop tracking
  window.mioraStopVoice = function() {
    isManualStop = true;
    if (state.recognition) {
      state.recognition.stop();
    }
  };
}

// ✅ VAOVAO: Enhanced toggle with manual stop
function toggleVoiceRecognition() {
  if (!state.recognition) {
    const messages = {
      'mg': '⚠️ Tsy misy reconnaissance vocale',
      'fr': '⚠️ Reconnaissance vocale indisponible',
      'en': '⚠️ Voice recognition unavailable'
    };
    showNotification(messages[state.currentLanguage] || messages.fr, 'warning');
    return;
  }
  
  const micBtn = document.getElementById('miora-mic-btn');
  if (micBtn && micBtn.classList.contains('listening')) {
    window.mioraStopVoice();
    const messages = {
      'mg': '🛑 Tapitra ny recording',
      'fr': '🛑 Enregistrement arrêté',
      'en': '🛑 Recording stopped'
    };
    showNotification(messages[state.currentLanguage] || messages.fr, 'success', 1500);
  } else {
    try {
      state.recognition.start();
    } catch (err) {
      console.error('❌ Failed to start:', err);
      showNotification('⚠️ Tsy afaka manomboka', 'error');
    }
  }
}

  // ========================================
  // AI API CALL (SIMPLIFIED - FOR NON-PRODUCT QUERIES ONLY)
  // ========================================
  
  async function callAI(userMessage, addToHistory = true) {
  try {
    // ✅ FIX: Get current language safely FIRST
    let currentLanguage = 'mg';
    try {
      currentLanguage = state?.currentLanguage || localStorage.getItem('miora-language') || 'mg';
    } catch (err) {
      console.warn('[AI] Language access error:', err);
      currentLanguage = 'mg';
    }
    
    console.log('[AI] 🌐 Using language:', currentLanguage);
    
    // Detect language
    const detectedLang = window.detectLanguage(userMessage, currentLanguage);
    if (detectedLang !== currentLanguage) {
      try {
        state.currentLanguage = detectedLang;
        localStorage.setItem('miora-language', detectedLang);
        currentLanguage = detectedLang;
        console.log('🌐 Language switched to:', currentLanguage);
      } catch (err) {
        console.warn('[AI] Failed to switch language:', err);
      }
    }
    
    if (addToHistory) {
      state.conversationHistory.push({
        role: "user",
        content: userMessage,
        timestamp: Date.now()
      });
    }
    
    // Trim history if too long
    if (state.conversationHistory.length > config.maxHistoryLength) {
      state.conversationHistory = state.conversationHistory.slice(-config.maxHistoryLength);
    }
    
    // ✅ Get current assistant safely
    let currentAssistant = 'miora';
    try {
      currentAssistant = state?.currentAssistant || localStorage.getItem('miora-current-assistant') || 'miora';
    } catch (err) {
      console.warn('[AI] Assistant access error:', err);
      currentAssistant = 'miora';
    }
    
    console.log('[AI] 👤 Using assistant:', currentAssistant);
    
    // ✅ Build system prompt with safe language access
    const assistantPrompts = {
      'miora': {
        'mg': `Ianao dia **Miora**, assistante IA ofisialy an'ny **Mijoro Boutique** 🇲🇬

🏪 **MOMBA NY MIJORO BOUTIQUE**
- Boutique en ligne malagasy nanomboka tamin'ny 2025
- **Produits numériques:** eBooks 📚, vidéos 🎬, apps/jeux 📱, formations 🎓
- **Produits physiques:** akanjo 👕, elektronika ⚡, kojakoja ⌚, boky 📖

📞 **FIFANDRAISANA (IMPORTANTE!)**
- **WhatsApp:** 0333106055 / +261 33 31 06 055 (PRIORITAIRE!)
- **Email:** mioraandriamiadana@gmail.com
- ⚠️ **Ho an'ny commande:** WhatsApp fotsiny no azo antoka!

🛒 **FOMBA FIVIDIANANA**

**1️⃣ Quick Order Section**
- Ao @ homepage: "Commande Express"  
      
- 8 produits vedette
- "Ajouter au panier" → maintso

**2️⃣ Panier - Ambany ankavanana**
- Icône  🛒 @ coin ambany ankavanana
- Click → panier drawer misokatra
- Hitanao ny produits rehetra

**3️⃣ Commander via WhatsApp**
- Ao @ panier: "Commander via WhatsApp"
- WhatsApp misokatra automatiquement
- Message pré-rempli (liste + prix)
- Alefaso → valiny haingana!

**4️⃣ Recherche**
- Barre de recherche ao @ top
- Filtres par catégorie
- Résultats instantanés

💬 **NY ASANAO**

**⚠️ RÈGLE: Manondro PRODUIT SEARCH na CONVERSATION**

**CONVERSATION (valio ianao):**

**1️⃣ Momba ny Boutique:**
- "Lazao ahy ny momba Mijoro Boutique" → Boutique en ligne malagasy, produits digital + physiques, WhatsApp: 0333106055
- "Mahalala ny momba Mijoro Boutique ve?" → Eny! Boutique vaovao 2025, varimbazaha + physique, contact: 0333106055 / mioraandriamiadana@gmail.com
- "Inona no Mijoro Boutique?" → Boutique officielle vente digital + physique, tsara indrindra @ Madagascar

**2️⃣ Founder & Histoire:**
- "Iza no namorona Mijoro Boutique?" → **ANDRIAMIADANARISON Miora** no namorona
- "Nahoana no antsoina hoe Mijoro?" → Tsy voahofana amin'io fanontaniana io aho, tsara kokoa manontany an'i Miora @ WhatsApp: 0333106055

**3️⃣ Asa sy Fampiofanana:**
- "Mandray mpiasa ve?" → Ny asa tsy sarotra fa TSARA KOKOA manontany an'i Miora @ WhatsApp (0333106055/0337829146), izy no afaka manapaka
- "Mampanao fampiofanana ve?" → Tsy afaka mamaly anizay aho fa afaka manontany @ WhatsApp (0333106055), FA KOSA misy produits formation ato @ boutique!

**4️⃣ Fividianana / Commande:**
- "Afaka manao commande ve?" → ENY AFAKA! 
  **Raha produit EFA AO @ shop:**
    - Quick Order: Mijery → Ajouter au panier (maintso) → Commander via WhatsApp
    - Shop: Recherche → Potsero produit → WhatsApp direct
  **Raha TSY AO:**
    - Manontany @ WhatsApp: 0333106055 / 0337829146

**5️⃣ Contact & Info:**
- WhatsApp: 0333106055 (PRIORITAIRE!)
- Email: mioraandriamiadana@gmail.com
- "Manao ahoana?" → Tsara aho misaotra! Inona azoko ampy anao?
- "Salama" → Tongasoa! Inona tadiavinao @ boutique?

**6️⃣ Vaovao ny boutique:**
- "Inona ny vaovao?" → Lazao: Produits nouveaux (60 jours), promos, categories populaires
- "Misy vaovao ve?" → ENY! Misy produits vaovao, mitadidiava fotsiny @ boutique

**PRODUCT SEARCH (aza mamaly - engine mikarakara):**
- "Mitady ebook" → Engine
- "Misy video ve?" → Engine
- "Maimaim-poana" → Engine
- "Mora vidy" → Engine (< 5000 AR)
- "Lafo vidy" → Engine (> 20000 AR)
- "Promotion" → Engine (badge promo)
- "Nouveauté" → Engine (< 60 jours)

**Fomba:** Mpinamana 😊, mazava, professionnel

⚠️ **TSY HADINO:**
- WhatsApp = 0333106055 (IMPORTANTE!)
- Panier = ambany ankavanana (🛒)
- Founder = ANDRIAMIADANARISON Miora
- BALANCE: Conversation vs Search

Valio amin'ny **Malagasy**.`,
        
        'fr': `Tu es **Miora**, assistante IA de **Mijoro Boutique** 🇫🇷

🏪 **MIJORO BOUTIQUE**
- Boutique malgache depuis 2025
- **Numériques:** eBooks 📚, vidéos 🎬, apps 📱, formations 🎓
- **Physiques:** vêtements 👕, électronique ⚡, accessoires ⌚, livres 📖

📞 **CONTACT**
- **WhatsApp:** 0333106055 / +261 33 31 06 055 (PRIORITAIRE!)
- **Email:** mioraandriamiadana@gmail.com

🛒 **ACHETER**

**1️⃣ Quick Order**
- Homepage: "Commande Express"
- 8 produits vedettes
- "Ajouter au panier" → vert

**2️⃣ Panier - Bas droite**
- Icône 🛒 coin inférieur droit
- Click → panier s'ouvre
- Voir produits ajoutés

**3️⃣ Commander WhatsApp**
- Panier: "Commander via WhatsApp"
- WhatsApp s'ouvre auto
- Message pré-rempli
- Envoyez → réponse rapide!

**4️⃣ Recherche**
- Barre en haut
- Filtres catégories
- Résultats instantanés

💬 **RÔLE**

**⚠️ RÈGLE: CONVERSATION vs RECHERCHE**

**CONVERSATION (toi réponds):**
- "Quoi de neuf?" → Nouveaux produits, promos
- "Comment vas-tu?" → Réponds amicalement
- "Comment acheter?" → Explique 4 étapes
- "Contact?" → WhatsApp: 0333106055 + email
- "Bonjour" → Bienvenue, demande besoins
- "Utiliser site?" → Explique features

**RECHERCHE (moteur gère):**
- "Cherche ebook" → Moteur
- "Vidéos?" → Moteur
- "Gratuits" → Moteur

**Si "Quoi de neuf?":**
- Nouveaux produits
- Catégories populaires
- Produits gratuits
- Nouveautés boutique

**Style:** Amical 😊, clair, pro

⚠️ **RAPPEL:**
- WhatsApp = 0333106055
- Panier = bas droite (🛒)
- BALANCE: Conversation vs Recherche

Réponds en **Français**.`,
        
        'en': `You are **Miora**, AI assistant at **Mijoro Boutique** 🇬🇧

🏪 **MIJORO BOUTIQUE**
- Malagasy boutique since 2025
- **Digital:** eBooks 📚, videos 🎬, apps 📱, training 🎓
- **Physical:** clothing 👕, electronics ⚡, accessories ⌚, books 📖

📞 **CONTACT**
- **WhatsApp:** 0333106055 / +261 33 31 06 055 (PRIORITY!)
- **Email:** mioraandriamiadana@gmail.com

🛒 **BUY**

**1️⃣ Quick Order**
- Homepage: "Express Order"
- 8 featured products
- "Add to cart" → green

**2️⃣ Cart - Bottom right**
- 🛒 icon lower right
- Click → cart opens
- See added products

**3️⃣ Order WhatsApp**
- Cart: "Order via WhatsApp"
- WhatsApp opens auto
- Pre-filled message
- Send → fast response!

**4️⃣ Search**
- Bar at top
- Category filters
- Instant results

💬 **ROLE**

**⚠️ RULE: CONVERSATION vs SEARCH**

**CONVERSATION (you respond):**
- "What's new?" → New products, promos
- "How are you?" → Respond friendly
- "How to buy?" → Explain 4 steps
- "Contact?" → WhatsApp: 0333106055 + email
- "Hello" → Welcome, ask needs
- "Use site?" → Explain features

**SEARCH (engine handles):**
- "Search ebook" → Engine
- "Videos?" → Engine
- "Free?" → Engine

**If "What's new?":**
- New products
- Popular categories
- Free products
- Boutique updates

**Style:** Friendly 😊, clear, pro

⚠️ **REMEMBER:**
- WhatsApp = 0333106055
- Cart = bottom right (🛒)
- BALANCE: Conversation vs Search

Respond in **English**.`
      },
      
      'agent': {
        'mg': `Ianao dia **Agent Miora**, AI assistant mahay zavatra rehetra 🌍

🎯 **NY ASANAO**
- Manampy amin'ny **culture générale** (tantara, siansa, kolontsaina...)
- **Marketing & Business** (stratégie, copywriting, branding...)
- **Prompt Engineering** (AI prompts, optimization...)
- **Multilingual** (Malagasy, Français, English, español...)
- **Creative Tasks** (écriture, design concepts, idées...)
- **Technical Help** (code, web, apps...)
- **Education** (fianarana, fanazavana...)

💬 **FOMBA**
- Mpinamana 😊, mazava, professionnel
- Manome fanazavana lalina sy mazava
- Manome ohatra raha ilaina
- Misokatra amin'ny resaka rehetra
- Manaraka fiteny tadiavin'ny user

⚠️ **TSY HADINO:**
-Raha manontany momba **Mijoro Boutique sy produits mijoro boutique**: lazao fa Miora boutique assistant no mahay kokoa → miverina @ "Miora (Boutique AI)"
- Raha question **générale** (siantifika, technologie, histoire, creativity...): valio tsara

- Focus @ fanampiana sy fanazavana
- Mandray fiteny rehetra (Malagasy, Français, English...)
- Hanampy @ zavatra rehetra (marketing, prompt, culture...)

💡 **EXPERTISE:**
- **Marketing:** Stratégie digitale, copywriting, SEO, social media
- **Prompt Engineering:** Optimisation prompts AI, techniques avancées
- **Culture:** Histoire, sciences, arts, littérature
- **Business:** Entrepreneuriat, gestion, développement
- **Tech:** Code, web dev, apps, AI tools

Valio amin'ny **Malagasy**.`,
        
        'fr': `Tu es **Agent Miora**, assistant IA polyvalent 🌍

🎯 **TON RÔLE**
- Aide avec la **culture générale** (histoire, sciences, culture...)
- **Marketing & Business** (stratégie, copywriting, branding...)
- **Prompt Engineering** (prompts IA, optimisation...)
- **Multilingue** (Malagasy, Français, Anglais, Espagnol...)
- **Tâches Créatives** (écriture, concepts design, idées...)
- **Aide Technique** (code, web, apps...)
- **Éducation** (apprentissage, explications...)

💬 **STYLE**
- Amical 😊, clair, professionnel
- Explications approfondies et claires
- Exemples si nécessaire
- Ouvert à tous sujets
- Adapte la langue selon l'utilisateur

⚠️ **IMPORTANTE:**
- Si on demande **à propos de mijoro boutique ou produits Mijoro Boutique**: dis que Miora boutique est spécialisé → retourner à "Miora (Boutique AI)"
- Si question **générale** (science, tech, histoire, créativité...): réponds bien

- Focus sur l'aide et l'explication
- Accepte toutes langues (Malagasy, Français, English...)
- Aide sur tout sujet (marketing, prompts, culture...)

💡 **EXPERTISE:**
- **Marketing:** Stratégie digitale, copywriting, SEO, réseaux sociaux
- **Prompt Engineering:** Optimisation prompts IA, techniques avancées
- **Culture:** Histoire, sciences, arts, littérature
- **Business:** Entrepreneuriat, gestion, développement
- **Tech:** Code, web dev, apps, outils IA

Réponds en **Français**.`,
        
        'en': `You are **Agent Miora**, versatile AI assistant 🌍

🎯 **YOUR ROLE**
- Help with **general knowledge** (history, science, culture...)
- **Marketing & Business** (strategy, copywriting, branding...)
- **Prompt Engineering** (AI prompts, optimization...)
- **Multilingual** (Malagasy, French, English, Spanish...)
- **Creative Tasks** (writing, design concepts, ideas...)
- **Technical Help** (code, web, apps...)
- **Education** (learning, explanations...)

💬 **STYLE**
- Friendly 😊, clear, professional
- In-depth and clear explanations
- Examples when needed
- Open to all topics
- Adapt language to user

⚠️ **IMPORTANT:**
- If asked about **Mijoro Boutique or Mijoro boutique products**: say Miora boutique is specialized → switch back to "Miora (Boutique AI)"
- If **general question** (science, tech, history, creativity...): answer well

- Focus on help and explanation
- Accept all languages (Malagasy, French, English...)
- Help with anything (marketing, prompts, culture...)

💡 **EXPERTISE:**
- **Marketing:** Digital strategy, copywriting, SEO, social media
- **Prompt Engineering:** AI prompt optimization, advanced techniques
- **Culture:** History, sciences, arts, literature
- **Business:** Entrepreneurship, management, development
- **Tech:** Code, web dev, apps, AI tools

Respond in **English**.`
      }
    };

    const SYSTEM_PROMPT = assistantPrompts[currentAssistant]?.[currentLanguage] || 
                          assistantPrompts['miora']?.[currentLanguage] ||
                          assistantPrompts['miora']['mg'];
    
    // Call Edge Function
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: SYSTEM_PROMPT + "\n\nUtilisateur: " + userMessage,
        userId: "user-" + Date.now()
      })
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Non-JSON response:', text.substring(0, 200));
      throw new Error('Edge Function returned non-JSON response');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Edge Function Error ${response.status}: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Edge Function response:', data);
    
    let aiResponse;
    if (data.success && data.message) {
      aiResponse = data.message;
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      throw new Error('Format de réponse invalide');
    }
    
    if (addToHistory) {
      state.conversationHistory.push({
        role: "assistant",
        content: aiResponse,
        timestamp: Date.now()
      });
      
      saveConversation();
      updateStats('ai');
    }
    
    return aiResponse;
    
  } catch (error) {
    console.error('❌ Miora AI Error:', error);
    
    let errorMsg = '⚠️ ';
    if (error.message.includes('HTML page')) {
      errorMsg += 'Erreur de déploiement Edge Function.';
    } else if (error.message.includes('CORS')) {
      errorMsg += 'Erreur CORS.';
    } else {
      errorMsg += `Erreur: ${error.message}`;
    }
    
    showNotification(errorMsg, 'error');
    return errorMsg;
  }
}
// ========================================
// IMAGE GENERATION (POLLINATIONS AI)
// ========================================
async function generateImage(prompt, style = 'professional', size = 'square') {
  try {
    console.log('[Image] 🎨 Generating:', prompt);
    
    // Get size dimensions
    const dimensions = config.imageSizes[size] || config.imageSizes.square;
    
    // Build enhanced prompt with style
    const stylePrompt = config.imageStyles[style] || config.imageStyles.professional;
    const fullPrompt = `${prompt}, ${stylePrompt}`;
    
    // Encode prompt for URL
    const encodedPrompt = encodeURIComponent(fullPrompt);
    
    // Build Pollinations URL
    const imageUrl = `${config.imageApiUrl}${encodedPrompt}?width=${dimensions.width}&height=${dimensions.height}&seed=${Date.now()}&nologo=true&enhance=true`;
    
    console.log('[Image] 🖼️ URL:', imageUrl);
    
    // Test if image loads
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        console.log('[Image] ✅ Generated successfully');
        resolve(imageUrl);
      };
      
      img.onerror = () => {
        console.error('[Image] ❌ Failed to load');
        reject(new Error('Image generation failed'));
      };
      
      // Set timeout (30 seconds max)
      setTimeout(() => {
        reject(new Error('Image generation timeout'));
      }, 30000);
      
      img.src = imageUrl;
    });
    
  } catch (error) {
    console.error('[Image] ❌ Error:', error);
    throw error;
  }
}

// Expose globally
window.mioraGenerateImage = generateImage;
  // ========================================
  // SEND MESSAGE
  // ========================================
  async function sendMessage() {
  const text = elements.inputField.value.trim();
  if (!text) return;  // ⬅️ VAOVAO: Tsy misy image check intsony
  if (state.isTyping) return;

  // Stop any speech
  if (state.synthesis) state.synthesis.cancel();

  // Clear draft
  localStorage.removeItem('miora-draft');
  state.draftMessage = '';

  // Update stats
  updateStats('user');

  // Add user message
  const msgId = Date.now();
  addMessage(text, true, null, false, msgId);  // ⬅️ VAOVAO: null ho an'ny imageUrl

  // Save to history
  state.conversationHistory.push({
    role: 'user',
    content: text,
    timestamp: msgId
    // ⬅️ TSY MISY imageUrl intsony
  });

  elements.inputField.value = '';
  elements.inputField.style.color = '#fff'; // ⬅️ RESET color

  elements.sendBtn.disabled = true;

  // Show typing
  const typingMsg = showTyping();
  
  const aiResponse = await window.mioraCallAI(text);
  
  typingMsg.remove();

  if (aiResponse) {
    const msgDiv = addMessage('', false, null, true);
    const textDiv = msgDiv.querySelector('.miora-message-text');
    await typeMessage(formatText(aiResponse), textDiv);
  }
elements.sendBtn.disabled = false;
  elements.inputField.focus();
}

  // ========================================
  // QUICK ACTIONS
  // ========================================
  function renderQuickActions() {
    if (!elements.quickActionsContainer) return;

    elements.quickActionsContainer.innerHTML = quickActions.map(action => {
      const label = state.currentLanguage === 'mg' ? action.labelMg :
                   state.currentLanguage === 'fr' ? action.labelFr : action.label;
      return `
        <button class="miora-quick-btn" data-prompt="${action.prompt}" title="${label}">
          <span class="quick-icon">${action.icon}</span>
          <span class="quick-label">${label}</span>
        </button>
      `;
    }).join('');

    elements.quickActionsContainer.querySelectorAll('.miora-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        elements.inputField.value = btn.dataset.prompt;
        sendMessage();
      });
    });
  }

  // ========================================
  // SETTINGS PANEL
  // ========================================
  function createSettingsPanel() {
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'miora-settings-panel';
    settingsPanel.className = 'miora-settings-panel';
    
    settingsPanel.innerHTML = `
      <div class="miora-settings-overlay" onclick="window.mioraCloseSettings()"></div>
      <div class="miora-settings-content">
        <div class="miora-settings-header">
          <h3>⚙️ Paramètres</h3>
          <button class="miora-settings-close" onclick="window.mioraCloseSettings()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div class="miora-settings-body">
        <!-- Language Selection -->
<div class="setting-section">
  <h4>🌐 Langue / Fiteny / Language</h4>
  <div class="language-selector" style="display:flex; gap:10px;">
    <button class="language-btn ${state.currentLanguage === 'mg' ? 'active' : ''}" 
            data-lang="mg"
            style="flex:1; padding:12px; background:${state.currentLanguage === 'mg' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(148,163,184,0.2)'}; color:#fff; border:${state.currentLanguage === 'mg' ? '2px solid #10b981' : '1px solid rgba(148,163,184,0.3)'}; border-radius:10px; font-weight:600; cursor:pointer; transition:all 0.3s;"
            onclick="window.mioraSwitchLanguage('mg')">
      🇲🇬 Malagasy
    </button>
    <button class="language-btn ${state.currentLanguage === 'fr' ? 'active' : ''}" 
            data-lang="fr"
            style="flex:1; padding:12px; background:${state.currentLanguage === 'fr' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(148,163,184,0.2)'}; color:#fff; border:${state.currentLanguage === 'fr' ? '2px solid #3b82f6' : '1px solid rgba(148,163,184,0.3)'}; border-radius:10px; font-weight:600; cursor:pointer; transition:all 0.3s;"
            onclick="window.mioraSwitchLanguage('fr')">
      🇫🇷 Français
    </button>
    <button class="language-btn ${state.currentLanguage === 'en' ? 'active' : ''}" 
            data-lang="en"
            style="flex:1; padding:12px; background:${state.currentLanguage === 'en' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(148,163,184,0.2)'}; color:#fff; border:${state.currentLanguage === 'en' ? '2px solid #8b5cf6' : '1px solid rgba(148,163,184,0.3)'}; border-radius:10px; font-weight:600; cursor:pointer; transition:all 0.3s;"
            onclick="window.mioraSwitchLanguage('en')">
      🇬🇧 English
    </button>
  </div>
</div>
          <!-- Theme Selection -->
          <div class="setting-section">
            <h4>🎨 Thème</h4>
            <div class="theme-grid">
              ${Object.keys(config.themes).map(themeName => {
                const theme = config.themes[themeName];
                const isActive = state.currentTheme === themeName;
                return `
                  <button class="theme-option ${isActive ? 'active' : ''}" 
                          data-theme="${themeName}"
                          style="background: ${theme.gradient}">
                    <span>${theme.name}</span>
                    ${isActive ? '<i class="fa-solid fa-check"></i>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
          
          <!-- Dark Mode Toggle -->
          <div class="setting-section">
            <h4>🌙 Mode Sombre</h4>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="miora-dark-mode-toggle" 
                       ${state.isDarkMode ? 'checked' : ''}
                       onchange="window.mioraToggleDarkMode(this.checked)">
                Activer le mode sombre
              </label>
            </div>
          </div>
          
          <!-- Voice Settings -->
          <div class="setting-section">
            <h4>🎤 Voix</h4>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="miora-voice-enabled" 
                       ${config.voiceEnabled ? 'checked' : ''}
                       onchange="window.mioraToggleVoice(this.checked)">
                Activer la reconnaissance vocale
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="miora-auto-read" 
                       ${config.autoReadResponses ? 'checked' : ''}
                       onchange="window.mioraToggleAutoRead(this.checked)">
                Lecture automatique des réponses
              </label>
            </div>
          </div>
          
          <!-- Notifications -->
          <div class="setting-section">
            <h4>🔔 Notifications</h4>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="miora-notifications" 
                       ${state.notificationsEnabled ? 'checked' : ''}
                       onchange="window.mioraToggleNotifications(this.checked)">
                Activer les notifications
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="miora-sound" 
                       ${state.soundEnabled ? 'checked' : ''}
                       onchange="window.mioraToggleSound(this.checked)">
                Activer les sons
              </label>
            </div>
          </div>
          
          <!-- Statistics -->
          <div class="setting-section">
            <h4>📊 Statistiques</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">${state.stats.messagesCount || 0}</div>
                <div class="stat-label">Messages totaux</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${state.stats.userMessages || 0}</div>
                <div class="stat-label">Vos messages</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${state.stats.aiMessages || 0}</div>
                <div class="stat-label">Réponses IA</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${state.pinnedMessages.length}</div>
                <div class="stat-label">Épinglés</div>
              </div>
            </div>
          </div>
          
<!-- Actions -->
<div class="setting-section">
            <h4>🔧 Actions</h4>
            <button class="setting-action-btn" onclick="window.mioraResetSettings()">
              <i class="fa-solid fa-rotate-left"></i> Réinitialiser
            </button>
            <button class="setting-action-btn" onclick="window.mioraExportConversation()">
              <i class="fa-solid fa-download"></i> Exporter conversation
            </button>
            <button class="setting-action-btn" onclick="
              const info = window.mioraGetCacheInfo();
              if (info.cached) {
                alert('💾 Cache: ' + info.count + ' produits\\n⏱️ Âge: ' + info.age + 's\\n⏳ Restant: ' + info.remaining + 's');
              } else {
                alert('📭 Aucun cache');
              }
            ">
              <i class="fa-solid fa-database"></i> Info Cache
            </button>
            <button class="setting-action-btn" onclick="window.mioraClearCache()">
              <i class="fa-solid fa-trash"></i> Vider Cache
            </button>
          </div>
        
        <div class="miora-settings-footer">
          <small>Miora AI Assistant v2.1 Fixed</small>
        </div>
      </div>
    `;

    document.body.appendChild(settingsPanel);
    
    // Add event listener for theme buttons
    settingsPanel.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', function() {
        const themeName = this.dataset.theme;
        window.mioraSelectTheme(themeName);
      });
    });
  }

  // Settings functions
  window.mioraOpenSettings = function() {
    let panel = document.getElementById('miora-settings-panel');
    if (!panel) {
      createSettingsPanel();
      panel = document.getElementById('miora-settings-panel');
    }
    panel.classList.add('show');
  };

  window.mioraCloseSettings = function() {
    const panel = document.getElementById('miora-settings-panel');
    if (panel) panel.classList.remove('show');
  };

  window.mioraSelectTheme = function(themeName) {
    applyTheme(themeName);
    
    // Update UI
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.remove('active');
      const icon = btn.querySelector('i');
      if (icon) icon.remove();
    });

    const selectedBtn = document.querySelector(`.theme-option[data-theme="${themeName}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('active');
      const checkIcon = document.createElement('i');
      checkIcon.className = 'fa-solid fa-check';
      selectedBtn.appendChild(checkIcon);
    }
  };

  window.mioraToggleVoice = function(enabled) {
    config.voiceEnabled = enabled;
    localStorage.setItem('miora-voice-enabled', enabled);
    showNotification(enabled ? '🎤 Voix activée' : '🔇 Voix désactivée', 'info', 1500);
  };

  window.mioraToggleAutoRead = function(enabled) {
    config.autoReadResponses = enabled;
    localStorage.setItem('miora-auto-read', enabled);
    showNotification(enabled ? '🔊 Lecture auto activée' : '🔇 Lecture auto désactivée', 'info', 1500);
  };

  window.mioraToggleDarkMode = function(enabled) {
    toggleDarkMode(enabled);
  };

  window.mioraToggleNotifications = function(enabled) {
    state.notificationsEnabled = enabled;
    localStorage.setItem('miora-notifications', enabled);
    showNotification(enabled ? '🔔 Notifications activées' : '🔕 Notifications désactivées', 'info', 1500);
  };

  window.mioraToggleSound = function(enabled) {
    state.soundEnabled = enabled;
    localStorage.setItem('miora-sound', enabled);
    if (enabled) playSound('success');
  };

  window.mioraResetSettings = function() {
    if (!confirm('Réinitialiser tous les paramètres?')) return;

    localStorage.removeItem('miora-theme');
    localStorage.removeItem('miora-language');
    localStorage.removeItem('miora-voice-enabled');
    localStorage.removeItem('miora-auto-read');
    localStorage.removeItem('miora-dark-mode');
    localStorage.removeItem('miora-notifications');
    localStorage.removeItem('miora-sound');

    showNotification('✅ Paramètres réinitialisés', 'success');
    setTimeout(() => location.reload(), 1500);
  };

  window.mioraExportConversation = function() {
    exportConversation();
  };
window.mioraSwitchLanguage = function(lang) {
  state.currentLanguage = lang;
  localStorage.setItem('miora-language', lang);
  
  // Update recognition language
  if (state.recognition) {
    const languageMap = {
      'mg': 'mg-MG',
      'fr': 'fr-FR',
      'en': 'en-US'
    };
    state.recognition.lang = languageMap[lang];
  }
  

  
  
  // Update UI
  document.querySelectorAll('.language-btn').forEach(btn => {
    const btnLang = btn.dataset.lang;
    if (btnLang === lang) {
      btn.classList.add('active');
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      btn.style.border = '2px solid #10b981';
    } else {
      btn.classList.remove('active');
      btn.style.background = 'rgba(148,163,184,0.2)';
      btn.style.border = '1px solid rgba(148,163,184,0.3)';
    }
  });
  
  const messages = {
    'mg': '🇲🇬 Miova ho Malagasy',
    'fr': '🇫🇷 Changé en Français',
    'en': '🇬🇧 Switched to English'
  };
  
  showNotification(messages[lang], 'success', 2000);
};
  // ========================================
  // ADDITIONAL UI ELEMENTS
  // ========================================
  function createAdditionalUI() {
    const header = elements.chatWindow.querySelector('.miora-header');
    if (!header) return;
// ✅✅✅ AJOUTER ICI ✅✅✅
    // Add assistant switch
    const switchUI = createAssistantSwitch();
    header.insertAdjacentElement('afterend', switchUI);
    
    // Add click handlers
    switchUI.querySelectorAll('.assistant-option').forEach(btn => {
      btn.addEventListener('click', function() {
        const assistantType = this.dataset.assistant;
        window.mioraSwitchAssistant(assistantType);
      });
    });
    // Settings Button
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'miora-header-btn';
    settingsBtn.innerHTML = '<i class="fa-solid fa-gear"></i>';
    settingsBtn.title = 'Paramètres';
    settingsBtn.onclick = window.mioraOpenSettings;

    // Export Button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'miora-header-btn';
    exportBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
    exportBtn.title = 'Exporter';
    exportBtn.onclick = exportConversation;

    // Clear Button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'miora-header-btn miora-clear-btn';
    clearBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    clearBtn.title = 'Effacer';
    clearBtn.onclick = clearHistory;

    // Insert before close button
    const closeBtn = header.querySelector('.miora-close');
    header.insertBefore(settingsBtn, closeBtn);
    header.insertBefore(exportBtn, closeBtn);
    header.insertBefore(clearBtn, closeBtn);

    // Mic Button
    if (config.voiceEnabled) {
      const inputArea = elements.chatWindow.querySelector('.miora-input-area');
      if (inputArea) {
        const micBtn = document.createElement('button');
        micBtn.className = 'miora-mic-btn';
        micBtn.id = 'miora-mic-btn';
        micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        micBtn.title = 'Commande vocale';
        micBtn.onclick = toggleVoiceRecognition;
        
        inputArea.insertBefore(micBtn, inputArea.children[1]);
      }
    }
  }

  // ========================================
  // CHAT WINDOW TOGGLE
  // ========================================
  function toggleChat(open) {
    if (open) {
      elements.chatWindow.setAttribute('aria-hidden', 'false');
      elements.navBtn.classList.add('active');
      elements.inputField.focus();
      
      // ✅ REMOVED: No need to load from localStorage
// Conversation dia manomboka foana @ vaovao isaky ny session
      
      // Load draft if exists
      if (state.draftMessage) {
        loadDraft();
      }
      
      // Apply saved theme
      if (state.isDarkMode) {
        toggleDarkMode(true);
      } else {
        applyTheme(state.currentTheme);
      }
    } else {
      elements.chatWindow.setAttribute('aria-hidden', 'true');
      elements.navBtn.classList.remove('active');
      
      // Stop speech
      if (state.synthesis) state.synthesis.cancel();
      
      // Save draft
      saveDraft();
    }
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================
  
  // Toggle chat
  elements.navBtn.addEventListener('click', () => {
    const isOpen = elements.chatWindow.getAttribute('aria-hidden') === 'false';
    toggleChat(!isOpen);
  });

  elements.closeBtn.addEventListener('click', () => toggleChat(false));

  // Send message
  elements.sendBtn.addEventListener('click', sendMessage);

  // Enter to send
  // ========================================
// KEYBOARD NAVIGATION (ENHANCED)
// ========================================

// ========================================
// TEXTAREA AUTO-RESIZE + ENTER TO SEND
// ========================================

// Auto-resize textarea
elements.inputField.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Enter to send (Shift+Enter for new line)
elements.inputField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Reset height after sending
const originalSendMessage = sendMessage;
sendMessage = function() {
  originalSendMessage.call(this);
  if (elements.inputField) {
    elements.inputField.style.height = 'auto';
  }
};

// Add ARIA attributes to input
elements.inputField.setAttribute('aria-label', 'Tapez votre message pour Miora');
elements.inputField.setAttribute('aria-describedby', 'miora-input-hint');
elements.inputField.setAttribute('role', 'textbox');
elements.inputField.setAttribute('aria-multiline', 'false');

// Add hint element (invisible but read by screen readers)
const hintDiv = document.createElement('div');
hintDiv.id = 'miora-input-hint';
hintDiv.className = 'sr-only'; // Screen reader only
hintDiv.textContent = 'Appuyez sur Entrée pour envoyer votre message, ou utilisez le bouton Envoyer';
hintDiv.style.cssText = 'position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;';
elements.inputField.parentNode.insertBefore(hintDiv, elements.inputField);

// Make send button accessible
elements.sendBtn.setAttribute('aria-label', 'Envoyer le message');
elements.sendBtn.setAttribute('role', 'button');
elements.sendBtn.setAttribute('tabindex', '0');

// Keyboard support for send button
elements.sendBtn.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    sendMessage();
  }
});

  // Auto-save draft while typing
  let draftTimeout;
  elements.inputField.addEventListener('input', () => {
    clearTimeout(draftTimeout);
    draftTimeout = setTimeout(() => {
      saveDraft();
    }, 1000);
  });



  // ========================================
  // EXPOSE FUNCTIONS GLOBALLY
  // ========================================
  window.mioraAddMessage = addMessage;
  window.mioraTypeMessage = typeMessage;
  window.mioraFormatText = formatText;
  window.mioraSaveConversation = saveConversation;
  window.mioraCallAI = callAI; // ✅ Will be overridden by Smart Handler

  // ========================================
  // INITIALIZATION
  // ========================================
  console.log('[Miora Core] 🚀 Initializing...');

  // Setup voice
  setupVoiceRecognition();
// Initialize assistant avatar
  if (state.currentAssistant === 'agent') {
    window.currentAssistantAvatar = 'https://i.ibb.co/fVfNcLv9/file-000000008188722fb075911ad3cee715.png';
  } else {
    window.currentAssistantAvatar = 'https://i.ibb.co/5xkSKtLt/IMG-20251116-WA0000.jpg';
  }
  console.log('[Miora] 👤 Current assistant:', state.currentAssistant);
  // ⬆️⬆️⬆️ FIN AJOUT ⬆️⬆️⬆️

  // Create UI
  createAdditionalUI();

  // Apply theme
  if (state.isDarkMode) {
    toggleDarkMode(true);
  } else {
    applyTheme(state.currentTheme);
  }
// ✅ VAOVAO: Agent Miora Welcome
function addAgentWelcome() {
  const agentMessages = document.getElementById('agent-messages');
  if (!agentMessages) return;
  
  const welcomeMessages = {
    'mg': `🌍 **Tongasoa eto amin'ny Agent Miora** 👋 🇲🇬

Afaka manampy anao aho amin'ny zavatra rehetra:
• 📚 **Culture générale** (tantara, siansa, kolontsaina...)
• 💼 **Marketing & Business** (stratégie, copywriting...)
• 🤖 **Prompt Engineering** (AI prompts, optimization...)
• 🌐 **Multilingual** (Malagasy, Français, English...)
• ✍️ **Creative Tasks** (écriture, design, idées...)
• 💻 **Technical Help** (code, web, apps...)

💡 **Ohatra:**
- "Manazava ahy ny photosynthèse"
- "Prompt tsara ho an'ny image AI"
- "Copywriting ho an'ny produit Instagram"
- "Comment fonctionne le blockchain?"

⚠️ **Fa raha te-hahalala ny momba ny Mijoro Boutique ianao na hitady vokatra dia afaka mamaly tsara izay ilainao i Miora** 😊

**Inona no afaka ampiako anao androany?** 🚀`,
    
    'fr': `🌍 **Bienvenue avec Agent Miora** 👋 🇫🇷

Je peux vous aider avec tout:
• 📚 **Culture générale** (histoire, sciences, culture...)
• 💼 **Marketing & Business** (stratégie, copywriting...)
• 🤖 **Prompt Engineering** (prompts IA, optimisation...)
• 🌐 **Multilingue** (Malagasy, Français, Anglais...)
• ✍️ **Créativité** (écriture, design, idées...)
• 💻 **Technique** (code, web, apps...)

💡 **Exemples:**
- "Explique-moi la photosynthèse"
- "Bon prompt pour image IA"
- "Copywriting pour produit Instagram"
- "Comment fonctionne la blockchain?"

⚠️ **Mais si vous cherchez des infos sur Mijoro Boutique ou des produits, Miora pourra mieux vous aider** 😊

**Comment puis-je vous aider aujourd'hui?** 🚀`,
    
    'en': `🌍 **Welcome to Agent Miora** 👋 🇬🇧

I can help you with everything:
• 📚 **General knowledge** (history, science, culture...)
• 💼 **Marketing & Business** (strategy, copywriting...)
• 🤖 **Prompt Engineering** (AI prompts, optimization...)
• 🌐 **Multilingual** (Malagasy, French, English...)
• ✍️ **Creative** (writing, design, ideas...)
• 💻 **Technical** (code, web, apps...)

💡 **Examples:**
- "Explain photosynthesis"
- "Good prompt for AI image"
- "Copywriting for Instagram product"
- "How does blockchain work?"

⚠️ **But if you need info about Mijoro Boutique or products, Miora can help you better** 😊

**What can I help you with today?** 🚀`
  };
  
  const currentLang = localStorage.getItem('miora-language') || 'mg';
  const welcomeMsg = welcomeMessages[currentLang] || welcomeMessages.mg;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = 'miora-message miora-bot';
  msgDiv.innerHTML = `
    <div class="miora-message-avatar">
      <img src="https://i.ibb.co/DgbXkmNh/file-00000000f1bc720cb2d18989240fb66e.png" alt="Agent Miora" class="miora-msg-avatar">
    </div>
    <div class="miora-message-content">
      <div class="miora-message-text">${formatText(welcomeMsg)}</div>
    </div>
  `;
  
  agentMessages.appendChild(msgDiv);
}




  console.log('[Miora Core] ✅ Fully initialized!');
  console.log('[Miora Core] 📊 Stats:', state.stats);
  console.log('[Miora Core] 🎨 Theme:', state.currentTheme);
  console.log('[Miora Core] 🌐 Language:', state.currentLanguage);

  // Show notification on load
  showNotification('✨ Miora prêt!', 'success', 2000);

})();

// ==========================================
// 5. SMART QUERY HANDLER (FIXED - WITH IMAGES + CART)
// ==========================================
(function initSmartHandler() {
  'use strict';
  
  console.log('[Miora Handler] 🧠 Initializing...');
  // ==========================================
// SMART SUGGESTIONS ENGINE
// ==========================================

async function generateSmartSuggestions(failedQuery) {
  console.log('[Suggestions] 🧠 Analyzing:', failedQuery);
  
  try {
    // Get all products for analysis
    const allProducts = await window.MioraSearch.getAll(50);
    
    if (!allProducts || allProducts.length === 0) {
      return { similar: [], trending: [], categories: [] };
    }
    
    const queryLower = failedQuery.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(w => w.length >= 2);
    
    // ========================================
    // 1. FIND SIMILAR (partial match)
    // ========================================
    const similar = allProducts
      .map(p => {
        let score = 0;
        const searchText = `${p.title} ${p.description || ''} ${p.category || ''}`.toLowerCase();
        
        keywords.forEach(keyword => {
          // Fuzzy matching
          if (searchText.includes(keyword.substring(0, 3))) score += 1;
          if (p.category && p.category.toLowerCase().includes(keyword.substring(0, 3))) score += 2;
        });
        
        return { ...p, score };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    console.log('[Suggestions] 💡 Similar products:', similar.length);
    
    // ========================================
    // 2. GET TRENDING (recent + popular)
    // ========================================
    const trending = allProducts
      .filter(p => {
        // Prioritize: free, recent, or with badges
        return p.is_free === true || 
               p.badge || 
               (p.created_at && new Date(p.created_at) > new Date(Date.now() - 30*24*60*60*1000));
      })
      .slice(0, 5);
    
    console.log('[Suggestions] 🔥 Trending products:', trending.length);
    
    // ========================================
    // 3. SUGGEST CATEGORIES
    // ========================================
    const categoryMap = {
      'motivation': { icon: '💪', name: 'Motivation', query: 'motivation' },
      'ebook': { icon: '📚', name: 'eBooks', query: 'ebook' },
      'video': { icon: '🎬', name: 'Vidéos', query: 'video' },
      'app': { icon: '📱', name: 'Applications', query: 'app' },
      'formation': { icon: '🎓', name: 'Formations', query: 'formation' },
      'business': { icon: '💼', name: 'Business', query: 'business' },
      'développement': { icon: '🚀', name: 'Développement', query: 'développement' }
    };
    
    // Detect relevant categories from query
    const categories = [];
    Object.entries(categoryMap).forEach(([key, value]) => {
      if (queryLower.includes(key.substring(0, 4))) {
        categories.push(value);
      }
    });
    
    // If no match, suggest popular categories
    if (categories.length === 0) {
      categories.push(
        categoryMap.ebook,
        categoryMap.video,
        categoryMap.app
      );
    }
    
    console.log('[Suggestions] 📂 Suggested categories:', categories.length);
    
    return {
      similar,
      trending,
      categories: categories.slice(0, 4)
    };
    
  } catch (error) {
    console.error('[Suggestions] ❌ Error:', error);
    return { similar: [], trending: [], categories: [] };
  }
}// ==========================================
// PRODUCT DETAILS MODAL
// ==========================================
window.mioraShowProductModal = function(productId, productData) {
  console.log('[Modal] 📦 Opening:', productId);
  
  // Parse if string
  if (typeof productData === 'string') {
    try {
      productData = JSON.parse(productData);
    } catch (err) {
      console.error('[Modal] ❌ Parse error:', err);
      return;
    }
  }
  
  const p = productData;
  
  // Build image URL
  let imageUrl = 'https://via.placeholder.com/400x300?text=No+Image';
  if (p.thumbnail_url) {
    if (p.thumbnail_url.startsWith('http')) {
      imageUrl = p.thumbnail_url;
    } else {
      const cleanPath = p.thumbnail_url.startsWith('images/') || p.thumbnail_url.startsWith('gallery/') ?
        p.thumbnail_url : `images/${p.thumbnail_url}`;
      imageUrl = `https://zogohkfzplcuonkkfoov.supabase.co/storage/v1/object/public/products/${cleanPath}`;
    }
  }
  
  // Detect badge
  let badgeHTML = '';
  if (p.is_free === true || p.price === 0) {
    badgeHTML = `<div style="display:inline-block; padding:6px 14px; background:#f59e0b; color:#fff; border-radius:8px; font-size:13px; font-weight:700; margin-bottom:10px;">✨ GRATUIT</div>`;
  } else if (p.badge) {
    badgeHTML = `<div style="display:inline-block; padding:6px 14px; background:#3b82f6; color:#fff; border-radius:8px; font-size:13px; font-weight:700; margin-bottom:10px;">⭐ ${p.badge.toUpperCase()}</div>`;
  } else if (p.price > 0) {
    badgeHTML = `<div style="display:inline-block; padding:6px 14px; background:#10b981; color:#fff; border-radius:8px; font-size:13px; font-weight:700; margin-bottom:10px;">💵 PAYANT</div>`;
  }
  
  // Detect if new (created within 30 days)
  const isNew = p.created_at && new Date(p.created_at) > new Date(Date.now() - 30*24*60*60*1000);
  if (isNew) {
    badgeHTML += `<div style="display:inline-block; padding:6px 14px; background:#ec4899; color:#fff; border-radius:8px; font-size:13px; font-weight:700; margin-left:8px; margin-bottom:10px;">🆕 NOUVEAU</div>`;
  }
  
  const price = p.price > 0 ? `${Number(p.price).toLocaleString()} AR` : '✨ MAIMAIM-POANA';
  const priceColor = p.price > 0 ? '#10b981' : '#f59e0b';
  
  // WhatsApp link
  const whatsappNumber = "261333106055";
  const productName = encodeURIComponent(p.title);
  const productPrice = p.price > 0 ? `${Number(p.price).toLocaleString()} AR` : 'MAIMAIM-POANA';
  const whatsappMessage = encodeURIComponent(
    `Salama! 👋\n\nTe-hanafatra aho:\n\n📦 *${p.title}*\n💰 Prix: ${productPrice}\n🆔 ID: ${p.id}\n\nMisaotra! 😊`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'miora-product-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  `;
  
  modal.innerHTML = `
    <div style="background:#1e293b; border-radius:16px; max-width:600px; width:100%; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.5); animation: slideUp 0.3s ease;">
      <div style="position:relative;">
        <button onclick="this.closest('.miora-product-modal').remove()" 
          style="position:absolute; top:15px; right:15px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:40px; height:40px; font-size:20px; cursor:pointer; z-index:10; transition:all 0.2s;"
          onmouseover="this.style.background='rgba(239,68,68,0.9)'; this.style.transform='rotate(90deg)'"
          onmouseout="this.style.background='rgba(0,0,0,0.7)'; this.style.transform='rotate(0)'"
          aria-label="Fermer">
          ✕
        </button>
        <img src="${imageUrl}" alt="${p.title}" 
          style="width:100%; height:300px; object-fit:cover; border-radius:16px 16px 0 0;"
          onerror="this.src='https://via.placeholder.com/600x300?text=Image+Indisponible'">
      </div>
      
      <div style="padding:24px; color:#fff;">
        ${badgeHTML}
        
        <h2 style="font-size:22px; font-weight:700; margin-bottom:12px; line-height:1.3;">${p.title}</h2>
        
        <div style="font-size:20px; font-weight:700; color:${priceColor}; margin-bottom:16px;">
          💰 ${price}
        </div>
        
        ${p.subtitle ? `<div style="font-size:15px; color:#94a3b8; margin-bottom:12px; font-weight:600;">${p.subtitle}</div>` : ''}
        
        ${p.description ? `<div style="color:#cbd5e1; font-size:14px; line-height:1.7; margin-bottom:16px;">${p.description}</div>` : ''}
        
        ${p.category ? `<div style="margin-bottom:12px;">
          <span style="display:inline-block; padding:6px 12px; background:rgba(96,165,250,0.2); color:#60a5fa; border-radius:6px; font-size:12px; font-weight:600;">
            🏷️ ${p.category}
          </span>
        </div>` : ''}
        
        ${p.product_type ? `<div style="margin-bottom:16px;">
          <span style="display:inline-block; padding:6px 12px; background:rgba(139,92,246,0.2); color:#a78bfa; border-radius:6px; font-size:12px; font-weight:600;">
            📦 ${p.product_type}
          </span>
        </div>` : ''}
        
        ${isNew ? `<div style="padding:12px; background:rgba(236,72,153,0.1); border-left:3px solid #ec4899; border-radius:6px; margin-bottom:16px;">
          <div style="color:#f9a8d4; font-size:13px; font-weight:600;">🆕 Produit ajouté le ${new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
        </div>` : ''}
        
        <a href="${whatsappUrl}" 
          target="_blank"
          rel="noopener noreferrer"
          style="display:block; padding:14px; background:linear-gradient(135deg, #25D366, #128C7E); color:white; text-align:center; border-radius:10px; font-weight:700; font-size:15px; text-decoration:none; transition:all 0.2s; margin-top:20px;"
          onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(37,211,102,0.4)'"
          onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
          📞 Commander via WhatsApp
        </a>
      </div>
    </div>
  `;
  
  // Add CSS animations if not exists
  if (!document.getElementById('miora-modal-animations')) {
    const style = document.createElement('style');
    style.id = 'miora-modal-animations';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Close on overlay click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  document.body.appendChild(modal);
  console.log('[Modal] ✅ Opened');
};
  function waitReady() {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      
      if (typeof window.mioraCallAI === 'function' &&
        typeof window.mioraAddMessage === 'function' &&
        window.MioraSearch &&
        window.detectQueryType) {
        clearInterval(check);
        console.log('[Miora Handler] ✅ Dependencies ready');
        resolve(true);
      } else if (attempts >= 100) {
        clearInterval(check);
        console.error('[Miora Handler] ❌ Timeout');
        resolve(false);
      }
    }, 100);
  });
}
  
  // ✅ FUNCTION: Add to cart
  // ==========================================
// CART SYSTEM - SYNCHRONIZED
// ==========================================
window.mioraAddToCart = function(productId, productTitle, productPrice) {
  console.log('[Cart] 🛒 Adding:', productTitle, productPrice);
  
  try {
    let cart = JSON.parse(localStorage.getItem('mijoro-cart') || '[]');
    
    const existingIndex = cart.findIndex(item => item.id === productId);
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
      showNotification(`✅ "${productTitle}" x${cart[existingIndex].quantity}`, 'success', 2000);
    } else {
      cart.push({
        id: productId,
        title: productTitle,
        price: productPrice,
        quantity: 1,
        addedAt: Date.now()
      });
      showNotification(`✅ "${productTitle}" ajouté au panier!`, 'success', 2000);
    }
    
    localStorage.setItem('mijoro-cart', JSON.stringify(cart));
    
    // ✅ VAOVAO: Update cart count visually
    updateCartUI(cart);
    
    // ✅ VAOVAO: Trigger custom event for main cart system
    window.dispatchEvent(new CustomEvent('miora-cart-updated', {
      detail: { cart, productId, action: 'add' }
    }));
    
    // ✅ VAOVAO: Call global cart function if exists
    if (typeof window.addToCart === 'function') {
      window.addToCart(productId);
    }
    
    if (typeof window.updateCartCount === 'function') {
      window.updateCartCount();
    }
    
    // ✅ VAOVAO: Animate cart icon
    animateCartIcon();
    
  } catch (error) {
    console.error('[Cart] ❌ Error:', error);
    showNotification('❌ Erreur lors de l\'ajout', 'error');
  }
};

// ✅ VAOVAO: Update cart UI
function updateCartUI(cart) {
  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  // Update cart badge
  let badge = document.querySelector('.cart-badge, .miora-cart-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'miora-cart-badge';
    badge.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    `;
    
    const cartIcon = document.querySelector('[href*="cart"], .cart-icon, #cart-btn');
    if (cartIcon) {
      cartIcon.style.position = 'relative';
      cartIcon.appendChild(badge);
    }
  }
  
  badge.textContent = totalItems > 99 ? '99+' : totalItems;
  badge.style.display = totalItems > 0 ? 'flex' : 'none';
}

// ✅ VAOVAO: Animate cart icon
function animateCartIcon() {
  const cartIcon = document.querySelector('[href*="cart"], .cart-icon, #cart-btn');
  if (cartIcon) {
    cartIcon.style.animation = 'none';
    setTimeout(() => {
      cartIcon.style.animation = 'cartBounce 0.5s ease';
    }, 10);
  }
}

// ✅ VAOVAO: Add CSS animation
if (!document.getElementById('miora-cart-styles')) {
  const style = document.createElement('style');
  style.id = 'miora-cart-styles';
  style.textContent = `
    @keyframes cartBounce {
      0%, 100% { transform: scale(1); }
      25% { transform: scale(1.15); }
      50% { transform: scale(0.95); }
      75% { transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);
}

// ✅ VAOVAO: Initialize cart on load
(function initCart() {
  try {
    const cart = JSON.parse(localStorage.getItem('mijoro-cart') || '[]');
    if (cart.length > 0) {
      updateCartUI(cart);
    }
  } catch (err) {
    console.error('[Cart] Init error:', err);
  }
})();
  
  // ✅ FUNCTION: View product details
  window.mioraViewProduct = function(productId) {
    console.log('[Product] Viewing:', productId);
    
    // Redirect to product page
    window.location.href = `/product.html?id=${productId}`;
  };
  
  // ✅ Expose notification function
  window.mioraShowNotification = function(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `miora-cart-notification miora-notification-${type}`;
    notification.textContent = message;
    
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${colors[type]};
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 10001;
      font-weight: 600;
      font-size: 15px;
      animation: slideInRight 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  };
  
  waitReady().then(async (ready) => {
        if (!ready) {
          console.error('[Miora Handler] ❌ Cannot initialize');
          return;
        }
        
        console.log('[Miora Handler] 🔧 Patching callAI...');
        
        const originalCallAI = window.mioraCallAI;
        
        window.mioraCallAI = async function(userMessage, addToHistory = true) {
              console.log('[Handler] 📨 Processing query:', userMessage);
              
              // ✅ FIX: Get assistant safely from localStorage
              let currentAssistant = 'miora';
              try {
                currentAssistant = localStorage.getItem('miora-current-assistant') || 'miora';
              } catch (err) {
                console.warn('[Handler] ⚠️ localStorage access error:', err);
              }
              console.log('[Handler] 👤 Current assistant:', currentAssistant);
              
       // ✅ VAOVAO: Agent Miora with Mijoro Boutique detection
if (currentAssistant === 'agent') {
  console.log('[Handler] 🌍 Agent Miora - Checking query...');
  
  // ✅ FIX: Get language safely BEFORE using it
  let currentLanguage = 'mg';
  try {
    currentLanguage = localStorage.getItem('miora-language') || 'mg';
  } catch (err) {
    console.warn('[Handler] Language access error:', err);
    currentLanguage = 'mg';
  }
  
  console.log('[Handler] 🌐 Using language:', currentLanguage);
  
  // Check if asking about Mijoro Boutique or products
  const isMijoroQuery = /mijoro\s*boutique|produits?\s+mijoro|boutique\s+mijoro|zavatra\s+ao\s+@\s*mijoro|produits?\s/i.test(userMessage);
  
  if (isMijoroQuery) {
    console.log('[Handler] 🏪 Mijoro Boutique query detected - Redirecting to Miora');
    
    const redirectMessages = {
      'mg': `🏪 **Momba ny Mijoro Boutique sy ny produits-ny aho kosa...**

Tsy mahafehy tsara ny momban'ny boutique sy ny produits aho fa **Miora no spécialiste** momba izany! 😊

🔄 **Tsara raha manantona an'i Miora ianao:**
1. Tsindrio "Miora (Boutique AI)" etsy ambony
2. Manontania azy momba ny produits, prix, commande...
3. Mahay kokoa izy noho izaho momba izany!

💡 **Izaho kosa afaka manampy anao amin'ny:**
- Culture générale 📚
- Marketing & Business 💼
- Prompt Engineering 🤖
- Creative tasks ✍️
- Technical help 💻

**Mila fanampiana amin'ny zavatra hafa ve ianao?** 😊`,
      
      'fr': `🏪 **Concernant Mijoro Boutique et ses produits...**

Je ne maîtrise pas bien les détails de la boutique et des produits, mais **Miora est la spécialiste** de ça! 😊

🔄 **Je vous recommande de contacter Miora:**
1. Cliquez sur "Miora (Boutique AI)" en haut
2. Posez-lui vos questions sur les produits, prix, commandes...
3. Elle connaît bien mieux que moi!

💡 **Moi je peux vous aider avec:**
- Culture générale 📚
- Marketing & Business 💼
- Prompt Engineering 🤖
- Tâches créatives ✍️
- Aide technique 💻

**Besoin d'aide sur autre chose?** 😊`,
      
      'en': `🏪 **About Mijoro Boutique and its products...**

I don't know the boutique and products details well, but **Miora is the specialist** for that! 😊

🔄 **I recommend contacting Miora:**
1. Click "Miora (Boutique AI)" above
2. Ask her about products, prices, orders...
3. She knows much better than me!

💡 **I can help you with:**
- General knowledge 📚
- Marketing & Business 💼
- Prompt Engineering 🤖
- Creative tasks ✍️
- Technical help 💻

**Need help with something else?** 😊`
    };
    
    const msg = redirectMessages[currentLanguage] || redirectMessages['mg'];
    
    // Don't add to history, just display
    return msg;
  }
  
  console.log('[Handler] 🌍 General query - Using AI directly');
  return await originalCallAI.call(this, userMessage, addToHistory);
}              
              // ✅ FIX: Get language safely
              let currentLanguage = 'mg';
              try {
                currentLanguage = localStorage.getItem('miora-language') || 'mg';
              } catch (err) {
                console.warn('[Handler] ⚠️ localStorage access error:', err);
              }
              console.log('[Handler] 🌐 Current language:', currentLanguage);
              
              // Detect query type
              const detection = window.detectQueryType(userMessage);
// ========================================
// IMAGE GENERATION HANDLER (AGENT MIORA ONLY)
// ========================================
if (detection && detection.type === 'image' && detection.prompt) {
  console.log('[Handler] 🎨 Image generation requested:', detection.prompt);
  
  // ✅ CHECK: Only Agent Miora can generate images
  if (currentAssistant !== 'agent') {
    console.log('[Handler] ⚠️ Image generation only available with Agent Miora');
    
    const redirectMessages = {
      'mg': `🎨 **Momba ny sary...**

Ny **Agent Miora** ihany no afaka mamorona sary! 😊

🔄 **Miverina any @ Agent Miora:**
1. Tsindrio "Agent Miora (Culture Générale)" etsy ambony
2. Manontania azy indray: "${detection.prompt}"
3. Hamorona sary tsara izy!

💡 **Izaho kosa (Miora Boutique) afaka manampy anao amin'ny:**
- 🔍 Mitady produit
- 🎁 Mahita produits gratuits
- 🛒 Fividianana sy commande
- 📞 Contact & info boutique

**Mila zavatra hafa ve ianao?** 😊`,
      
      'fr': `🎨 **Concernant la génération d'images...**

Seul **Agent Miora** peut générer des images! 😊

🔄 **Retournez vers Agent Miora:**
1. Cliquez sur "Agent Miora (Culture Générale)" en haut
2. Redemandez-lui: "${detection.prompt}"
3. Il créera une belle image pour vous!

💡 **Moi (Miora Boutique) je peux vous aider avec:**
- 🔍 Recherche de produits
- 🎁 Produits gratuits
- 🛒 Commandes & achats
- 📞 Contact & info boutique

**Besoin d'autre chose?** 😊`,
      
      'en': `🎨 **About image generation...**

Only **Agent Miora** can generate images! 😊

🔄 **Switch to Agent Miora:**
1. Click "Agent Miora (General Culture)" above
2. Ask him again: "${detection.prompt}"
3. He'll create a nice image for you!

💡 **I (Miora Boutique) can help you with:**
- 🔍 Product search
- 🎁 Free products
- 🛒 Orders & purchases
- 📞 Contact & boutique info

**Need something else?** 😊`
    };
    
    const msg = redirectMessages[currentLanguage] || redirectMessages['mg'];
    
    // Display redirect message (don't add to history)
    const msgDiv = window.mioraAddMessage('', false);
    const textDiv = msgDiv.querySelector('.miora-message-text');
    
    textDiv.innerHTML = `
      <div style="color:#fff; padding:16px; background:rgba(245,158,11,0.1); border-radius:10px; border-left:4px solid #f59e0b;">
        <div style="white-space:pre-line;">${msg.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</div>
      </div>
    `;
    
    return null; // Stop processing
  }
  
  // ✅ CONTINUE: Agent Miora can generate
  console.log('[Handler] ✅ Agent Miora confirmed - proceeding with image generation');
  
  try {
    // Show loading message
    const msgDiv = window.mioraAddMessage('', false);
    const textDiv = msgDiv.querySelector('.miora-message-text');
    
    textDiv.innerHTML = `
      <div style="color:#fff; padding:16px; background:rgba(139,92,246,0.1); border-radius:10px; border-left:4px solid #8b5cf6;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:32px; animation: spin 2s linear infinite;">🎨</div>
          <div>
            <div style="font-size:15px; font-weight:700; margin-bottom:4px;">Mamorona sary...</div>
            <div style="font-size:12px; opacity:0.8;">"${detection.prompt}"</div>
          </div>
        </div>
      </div>
      <style>
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    
    // Generate image
    const imageUrl = await window.mioraGenerateImage(
      detection.prompt,
      state.imageStyle || 'professional',
      state.imageSize || 'square'
    );
    
    // Update message with result
    const successMessages = {
      'mg': '🎨 Sary voaforona',
      'fr': '🎨 Image générée',
      'en': '🎨 Image generated'
    };
    
    textDiv.innerHTML = `
      <div style="color:#fff;">
        <div style="padding:12px; background:linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius:10px; margin-bottom:12px; text-align:center;">
          <div style="font-size:16px; font-weight:700;">${successMessages[currentLanguage] || successMessages['mg']}</div>
          <div style="font-size:13px; opacity:0.9; margin-top:4px;">📝 "${detection.prompt}"</div>
        </div>
        
        <div style="position:relative; border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
          <img src="${imageUrl}" alt="${detection.prompt}" 
            style="width:100%; height:auto; display:block; cursor:pointer; transition:transform 0.3s;"
            onclick="window.mioraViewImage('${imageUrl}')"
            onmouseover="this.style.transform='scale(1.02)'"
            onmouseout="this.style.transform='scale(1)'"
            loading="lazy">
        </div>
        
        <div style="display:flex; gap:8px;">
          <a href="${imageUrl}" download="agent-miora-${Date.now()}.png" 
            style="flex:1; padding:10px; background:rgba(16,185,129,0.2); color:#6ee7b7; border:1px solid #10b981; border-radius:8px; text-align:center; text-decoration:none; font-weight:600; font-size:13px; transition:all 0.2s;"
            onmouseover="this.style.background='rgba(16,185,129,0.3)'"
            onmouseout="this.style.background='rgba(16,185,129,0.2)'">
            💾 Download
          </a>
          <button onclick="
            const prompt = '${detection.prompt.replace(/'/g, "\\'")}';
            const lang = '${currentLanguage}';
            const msgs = {mg:'🔄 Mamorona indray...', fr:'🔄 Régénération...', en:'🔄 Regenerating...'};
            this.textContent = msgs[lang] || msgs.mg;
            this.disabled = true;
            window.mioraGenerateImage(prompt, '${state.imageStyle || 'professional'}', '${state.imageSize || 'square'}')
              .then(url => {
                this.closest('.miora-message-content').querySelector('img').src = url;
                this.closest('.miora-message-content').querySelector('a').href = url;
                this.textContent = '✅ Vita!';
                setTimeout(() => { this.textContent = '🔄 Regenerate'; this.disabled = false; }, 2000);
              })
              .catch(err => {
                this.textContent = '❌ Tsy afaka';
                setTimeout(() => { this.textContent = '🔄 Regenerate'; this.disabled = false; }, 2000);
              });
          "
            style="flex:1; padding:10px; background:rgba(139,92,246,0.2); color:#a78bfa; border:1px solid #8b5cf6; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.2s;"
            onmouseover="if(!this.disabled) this.style.background='rgba(139,92,246,0.3)'"
            onmouseout="this.style.background='rgba(139,92,246,0.2)'">
            🔄 Regenerate
          </button>
        </div>
        
        <div style="margin-top:12px; padding:10px; background:rgba(59,130,246,0.1); border-radius:8px; text-align:center; border:1px dashed rgba(59,130,246,0.3);">
          <div style="color:#60a5fa; font-size:11px;">
            💡 Powered by <strong>Pollinations AI</strong> via <strong>Agent Miora</strong> • Style: ${state.imageStyle || 'professional'} • Size: ${state.imageSize || 'square'}
          </div>
        </div>
      </div>
    `;
    
    console.log('[Handler] ✅ Image generated successfully by Agent Miora');
    return null; // Stop AI processing
    
  } catch (error) {
    console.error('[Handler] ❌ Image generation error:', error);
    
    const errorMessages = {
      'mg': '⚠️ Tsy afaka mamorona sary. Manandrama indray.',
      'fr': '⚠️ Impossible de générer l\'image. Réessayez.',
      'en': '⚠️ Failed to generate image. Try again.'
    };
    
    const msgDiv = window.mioraAddMessage('', false);
    const textDiv = msgDiv.querySelector('.miora-message-text');
    
    textDiv.innerHTML = `
      <div style="padding:16px; background:rgba(239,68,68,0.1); border-radius:10px; border-left:4px solid #ef4444; color:#fca5a5;">
        <div style="font-size:15px; font-weight:700; margin-bottom:8px;">${errorMessages[currentLanguage] || errorMessages['mg']}</div>
        <div style="font-size:12px; opacity:0.8;">Error: ${error.message}</div>
        <button onclick="document.getElementById('miora-input').value='${detection.prompt}'; document.getElementById('miora-send').click();"
          style="margin-top:12px; padding:8px 16px; background:rgba(239,68,68,0.2); color:#fca5a5; border:1px solid #ef4444; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">
          🔄 Retry
        </button>
      </div>
    `;
    
    return null; // Stop AI processing
  }
}
      if (detection) {
        console.log('[Handler] 🎯 Detected:', detection.type, detection.query || '');
        
        let products = [];
        
      try {
  // ✅ VAOVAO: Enhanced query handling with price filters
  if (detection.type === 'search' && detection.query) {
    console.log('[Handler] 🔍 Searching for:', detection.query);
    products = await window.MioraSearch.search(detection.query);
    
  } else if (detection.type === 'free') {
    console.log('[Handler] 🎁 Getting free products');
    products = await window.MioraSearch.getFree();
    
} else if (detection.type === 'nouveaute') {
  console.log('[Handler] 🆕 Getting recent products (7 days)');
  const allProducts = await window.MioraSearch.getAll(50);
  // ✅ VAOVAO: Filter - Created within last 7 days ONLY
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  products = allProducts.filter(p => {
    return p.created_at && new Date(p.created_at) > sevenDaysAgo;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
  } else if (detection.type === 'mora') {
    console.log('[Handler] 💰 Getting cheap products');
    const allProducts = await window.MioraSearch.getAll(100);
    // Filter: Price < 5000 AR
    products = allProducts.filter(p => {
      return p.price > 0 && p.price < 5000;
    }).sort((a, b) => a.price - b.price).slice(0, 10);
    
  } else if (detection.type === 'lafo') {
    console.log('[Handler] 💎 Getting expensive products');
    const allProducts = await window.MioraSearch.getAll(100);
    // Filter: Price > 20000 AR
    products = allProducts.filter(p => {
      return p.price >= 20000;
    }).sort((a, b) => b.price - a.price).slice(0, 10);
    
  } else if (detection.type === 'promo') {
    console.log('[Handler] 🎉 Getting promotions');
    const allProducts = await window.MioraSearch.getAll(100);
    // Filter: Has "promo", "promotion", or "réduction" badge/tag
    products = allProducts.filter(p => {
      const badge = (p.badge || '').toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
      return badge.includes('promo') || badge.includes('réduction') ||
        tags.includes('promo') || tags.includes('réduction');
    }).slice(0, 10);
    
  } else if (detection.type === 'category' && detection.category) {
    console.log('[Handler] 📂 Getting category:', detection.category);
    products = await window.MioraSearch.getCategory(detection.category);
  }
          
          console.log('[Handler] 📊 Results:', products.length, 'products');
          
          // Display results if found
          // ========================================
          // ✅ CONTEXT-AWARE SUGGESTIONS
          // ========================================
          
          // Check if query is too broad (asking for category overview)
          // ✅ IMPROVED: Detect broad queries
const isBroadQuery = /produits?\s+(numérique|physique|digital|physical|rehetra|tous|all)|categor(?:ie|y)|types?\s+de\s+produit|inona\s+(?:avy\s+)?(?:ny\s+)?produits?|quels?\s+produits?|what\s+products?/i.test(userMessage);
          // ✅ Get current language safely
let msgLanguage = 'mg';
try {
  msgLanguage = localStorage.getItem('miora-language') || 'mg';
} catch (err) {
  msgLanguage = 'mg';
}
          if (isBroadQuery && (!products || products.length === 0)) {
            console.log('[Handler] 💡 Broad query detected - showing category suggestions');
            
            const msgDiv = window.mioraAddMessage('', false);
            const textDiv = msgDiv.querySelector('.miora-message-text');
            
            // ✅ IMPROVED: Detect type with priority
const isDigital = /numérique|numerique|digital|ebook|video|app|jeu|jeux|game/i.test(userMessage);
const isPhysical = /physique|physical|vêtement|vetement|electronique|accessoire|livre.*physique|montre/i.test(userMessage);
const isGeneral = /rehetra|tous|all|generale?|misy|disponible|avy/i.test(userMessage) || (!isDigital && !isPhysical);
            
            let html = `<div style="color:#fff; font-family: system-ui, -apple-system, sans-serif;">`;
            
          if (isDigital && !isPhysical && !isGeneral) {
              // ========================================
              // DIGITAL PRODUCTS CATEGORIES
              // ========================================
              html += `<div style="font-size:16px; font-weight:700; margin-bottom:15px; padding:12px; background:linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                💻 Produits Numériques
              </div>`;
              
              html += `<div style="color:#94a3b8; font-size:14px; line-height:1.6; margin-bottom:16px;">
                Inona ny <strong>catégorie</strong> tadiavinao amin'ny produits numériques?
              </div>`;
              
              // Category cards
              const digitalCategories = [
                { icon: '📚', name: 'eBooks', mg: 'Boky elektronika', description: 'Livres numériques, formations PDF', query: 'ebook' },
                { icon: '🎬', name: 'Vidéos', mg: 'Horonan-tsary', description: 'Cours vidéo, tutoriels', query: 'video' },
                { icon: '📱', name: 'Applications', mg: 'Aplikasiona', description: 'Apps Android/iOS', query: 'app' },
                { icon: '🎮', name: 'Jeux', mg: 'Lalao', description: 'Jeux mobiles et PC', query: 'jeu' }
              ];
              
              html += `<div style="display:grid; gap:10px; margin-bottom:16px;">`;
              
              digitalCategories.forEach(cat => {
                html += `<div style="padding:14px; background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.3); border-radius:10px; cursor:pointer; transition:all 0.3s;" 
                  onclick="document.getElementById('miora-input').value='${cat.query}'; document.getElementById('miora-send').click();"
                  onmouseover="this.style.background='rgba(139,92,246,0.2)'; this.style.transform='translateX(5px)'"
                  onmouseout="this.style.background='rgba(139,92,246,0.1)'; this.style.transform='translateX(0)'">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:32px;">${cat.icon}</div>
                    <div style="flex:1;">
                      <div style="font-weight:700; font-size:15px; color:#fff; margin-bottom:4px;">
                        ${cat.name} <span style="font-size:12px; color:#a78bfa; font-weight:400;">(${cat.mg})</span>
                      </div>
                      <div style="font-size:12px; color:#94a3b8;">${cat.description}</div>
                    </div>
                    <div style="color:#a78bfa; font-size:18px;">→</div>
                  </div>
                </div>`;
              });
              
              html += `</div>`;
              
              // Or search
              html += `<div style="padding:12px; background:rgba(59,130,246,0.1); border-radius:8px; text-align:center; border:1px dashed rgba(59,130,246,0.3);">
                <div style="color:#60a5fa; font-size:13px; margin-bottom:8px;">💡 <strong>Na mitady zavatra manokana?</strong></div>
                <div style="color:#94a3b8; font-size:12px;">
                  Ohatra: "mitady formation développement personnel" na "cherche ebook motivation"
                </div>
              </div>`;
              
          } else if (isPhysical && !isDigital && !isGeneral) {
              // ========================================
              // PHYSICAL PRODUCTS CATEGORIES
              // ========================================
              html += `<div style="font-size:16px; font-weight:700; margin-bottom:15px; padding:12px; background:linear-gradient(135deg, #10b981, #059669); border-radius:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                📦 Produits Physiques
              </div>`;
              
              html += `<div style="color:#94a3b8; font-size:14px; line-height:1.6; margin-bottom:16px;">
                Inona ny <strong>catégorie</strong> tadiavinao amin'ny produits physiques?
              </div>`;
              
              // Category cards
              const physicalCategories = [
                { icon: '👕', name: 'Vêtements', mg: 'Akanjo', description: 'T-shirts, pantalons, robes...', query: 'vêtements' },
                { icon: '⚡', name: 'Électronique', mg: 'Elektronika', description: 'Gadgets, accessoires tech', query: 'électronique' },
                { icon: '⌚', name: 'Accessoires', mg: 'Kojakoja', description: 'Montres, bijoux, sacs...', query: 'accessoires' },
                { icon: '📖', name: 'Livres', mg: 'Boky', description: 'Livres physiques imprimés', query: 'livres' },
                { icon: '🎁', name: 'Autres', mg: 'Hafa', description: 'Décorations, cadeaux...', query: 'autres' }
              ];
              
              html += `<div style="display:grid; gap:10px; margin-bottom:16px;">`;
              
              physicalCategories.forEach(cat => {
                html += `<div style="padding:14px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; cursor:pointer; transition:all 0.3s;" 
                  onclick="document.getElementById('miora-input').value='${cat.query}'; document.getElementById('miora-send').click();"
                  onmouseover="this.style.background='rgba(16,185,129,0.2)'; this.style.transform='translateX(5px)'"
                  onmouseout="this.style.background='rgba(16,185,129,0.1)'; this.style.transform='translateX(0)'">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:32px;">${cat.icon}</div>
                    <div style="flex:1;">
                      <div style="font-weight:700; font-size:15px; color:#fff; margin-bottom:4px;">
                        ${cat.name} <span style="font-size:12px; color:#6ee7b7; font-weight:400;">(${cat.mg})</span>
                      </div>
                      <div style="font-size:12px; color:#94a3b8;">${cat.description}</div>
                    </div>
                    <div style="color:#6ee7b7; font-size:18px;">→</div>
                  </div>
                </div>`;
              });
              
              html += `</div>`;
              
              // Or search
              html += `<div style="padding:12px; background:rgba(59,130,246,0.1); border-radius:8px; text-align:center; border:1px dashed rgba(59,130,246,0.3);">
                <div style="color:#60a5fa; font-size:13px; margin-bottom:8px;">💡 <strong>Na mitady zavatra manokana?</strong></div>
                <div style="color:#94a3b8; font-size:12px;">
                  Ohatra: "mitady t-shirt" na "cherche montre"
                </div>
              </div>`;
              
            } else {
              // ========================================
              // GENERAL OVERVIEW (both digital + physical)
              // ========================================
              html += `<div style="font-size:16px; font-weight:700; margin-bottom:15px; padding:12px; background:linear-gradient(135deg, #3b82f6, #2563eb); border-radius:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                🏪 Nos Catégories de Produits
              </div>`;
              
              html += `<div style="color:#94a3b8; font-size:14px; line-height:1.6; margin-bottom:16px;">
                Inona no <strong>type de produit</strong> tadiavinao?
              </div>`;
              
              // Main type selector
              html += `<div style="display:grid; gap:12px; margin-bottom:20px;">`;
              
              // Digital products button
              html += `<div style="padding:16px; background:rgba(139,92,246,0.15); border:2px solid rgba(139,92,246,0.4); border-radius:12px; cursor:pointer; transition:all 0.3s;" 
                onclick="document.getElementById('miora-input').value='produits numériques'; document.getElementById('miora-send').click();"
                onmouseover="this.style.background='rgba(139,92,246,0.25)'; this.style.borderColor='rgba(139,92,246,0.6)'; this.style.transform='scale(1.02)'"
                onmouseout="this.style.background='rgba(139,92,246,0.15)'; this.style.borderColor='rgba(139,92,246,0.4)'; this.style.transform='scale(1)'">
                <div style="display:flex; align-items:center; gap:14px;">
                  <div style="font-size:40px;">💻</div>
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:16px; color:#fff; margin-bottom:6px;">
                      Produits Numériques <span style="font-size:13px; color:#a78bfa; font-weight:400;">(Zavatra Numérika)</span>
                    </div>
                    <div style="font-size:12px; color:#94a3b8; line-height:1.5;">
                      📚 eBooks • 🎬 Vidéos • 📱 Apps • 🎮 Jeux
                    </div>
                  </div>
                  <div style="color:#a78bfa; font-size:24px; font-weight:700;">→</div>
                </div>
              </div>`;
              
              // Physical products button
              html += `<div style="padding:16px; background:rgba(16,185,129,0.15); border:2px solid rgba(16,185,129,0.4); border-radius:12px; cursor:pointer; transition:all 0.3s;" 
                onclick="document.getElementById('miora-input').value='produits physiques'; document.getElementById('miora-send').click();"
                onmouseover="this.style.background='rgba(16,185,129,0.25)'; this.style.borderColor='rgba(16,185,129,0.6)'; this.style.transform='scale(1.02)'"
                onmouseout="this.style.background='rgba(16,185,129,0.15)'; this.style.borderColor='rgba(16,185,129,0.4)'; this.style.transform='scale(1)'">
                <div style="display:flex; align-items:center; gap:14px;">
                  <div style="font-size:40px;">📦</div>
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:16px; color:#fff; margin-bottom:6px;">
                      Produits Physiques <span style="font-size:13px; color:#6ee7b7; font-weight:400;">(Zavatra Physique)</span>
                    </div>
                    <div style="font-size:12px; color:#94a3b8; line-height:1.5;">
                      👕 Vêtements • ⚡ Électronique • ⌚ Accessoires • 📖 Livres
                    </div>
                  </div>
                  <div style="color:#6ee7b7; font-size:24px; font-weight:700;">→</div>
                </div>
              </div>`;
              
              html += `</div>`;
              
              // Quick actions
              html += `<div style="padding:14px; background:rgba(245,158,11,0.1); border-radius:10px; border-left:4px solid #f59e0b;">
                <div style="color:#fbbf24; font-size:14px; font-weight:700; margin-bottom:8px;">⚡ Actions rapides</div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  <button onclick="document.getElementById('miora-input').value='maimaim-poana'; document.getElementById('miora-send').click();" 
                    style="padding:8px 14px; background:rgba(16,185,129,0.2); color:#6ee7b7; border:1px solid rgba(16,185,129,0.4); border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;"
                    onmouseover="this.style.background='rgba(16,185,129,0.3)'"
                    onmouseout="this.style.background='rgba(16,185,129,0.2)'">
                    🎁 Produits Gratuits
                  </button>
                  <button onclick="document.getElementById('miora-input').value='nouveautés'; document.getElementById('miora-send').click();" 
                    style="padding:8px 14px; background:rgba(59,130,246,0.2); color:#60a5fa; border:1px solid rgba(59,130,246,0.4); border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;"
                    onmouseover="this.style.background='rgba(59,130,246,0.3)'"
                    onmouseout="this.style.background='rgba(59,130,246,0.2)'">
                    ✨ Nouveautés
                  </button>
                </div>
              </div>`;
            }
            
            html += `</div>`;
            
            textDiv.innerHTML = html;
            
            console.log('[Handler] ✅ Category suggestions displayed');
            return null; // Stop processing
          }
          if (products && products.length > 0) {
            console.log('[Handler] ✅ Displaying products with images + cart buttons');
            
            const msgDiv = window.mioraAddMessage('', false);
            const textDiv = msgDiv.querySelector('.miora-message-text');
            
            // Build better HTML display WITH IMAGES
            let html = `<div style="color:#fff; font-family: system-ui, -apple-system, sans-serif;">`;
            
           // ✅ SMART HEADERS with query display
const headers = {
  search: `🔍 Résultats pour "<strong>${detection.query}</strong>"`,
  free: detection.query ? 
    `🎁 Produits Gratuits <span style="color:#fbbf24; font-size:14px; font-weight:400;">(${detection.query})</span>` : 
    `🎁 Produits Gratuits`,
  nouveaute: `🆕 Produits Nouveaux <span style="opacity:0.9; font-size:14px;">(60 derniers jours)</span>`,
  mora: `💰 Produits Bon Marché <span style="opacity:0.9; font-size:14px;">(&lt; 5000 AR)</span>`,
  lafo: `💎 Produits Premium <span style="opacity:0.9; font-size:14px;">(&gt; 20000 AR)</span>`,
  promo: `🎉 Promotions & Réductions`,
  category: detection.query ?
    `📦 ${detection.query.charAt(0).toUpperCase() + detection.query.slice(1)}` :
    `📦 Catégorie: <strong>${detection.category}</strong>`
};
            
            const colors = {
              search: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              free: 'linear-gradient(135deg, #10b981, #059669)',
              category: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
            };
            
            html += `<div style="font-size:16px; font-weight:700; margin-bottom:15px; padding:12px; background:${colors[detection.type]}; border-radius:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
              ${headers[detection.type]} <span style="opacity:0.9; font-size:14px;">(${products.length})</span>
            </div>`;
            
            // Products grid WITH IMAGES
            products.forEach((p, i) => {
              const price = p.price > 0 ? `${Number(p.price).toLocaleString()} AR` : '✨ MAIMAIM-POANA';
              const priceColor = p.price > 0 ? '#10b981' : '#f59e0b';
              
      // ✅ FIX: Use correct column name + construct URL
let imageUrl = 'https://via.placeholder.com/300x200?text=No+Image';

if (p.thumbnail_url) {
  if (p.thumbnail_url.startsWith('http')) {
    imageUrl = p.thumbnail_url;
  } else {
    const cleanPath = p.thumbnail_url.startsWith('images/') || p.thumbnail_url.startsWith('gallery/') ?
      p.thumbnail_url :
      `images/${p.thumbnail_url}`;
    
    imageUrl = `https://zogohkfzplcuonkkfoov.supabase.co/storage/v1/object/public/products/${cleanPath}`;
  }
} else if (p.preview_url) {
  imageUrl = p.preview_url.startsWith('http') ?
    p.preview_url :
    `https://zogohkfzplcuonkkfoov.supabase.co/storage/v1/object/public/products/images/${p.preview_url}`;
}

console.log('[Display] 🖼️', p.title, '→', imageUrl);

// ✅ Gallery handling
let galleryImages = [];

if (p.gallery) {
  if (typeof p.gallery === 'string') {
    galleryImages = p.gallery.split(',').map(img => img.trim()).filter(Boolean);
  } else if (Array.isArray(p.gallery)) {
    galleryImages = p.gallery.filter(Boolean);
  }
}

if (imageUrl && !imageUrl.includes('placeholder')) {
  galleryImages.unshift(imageUrl);
}

console.log('[Display] 🖼️ Gallery:', galleryImages.length, 'images');

// ✅ VAOVAO: Enhanced badge & price detection
const isFree = p.is_free === true || p.price === 0;
const isNew = p.created_at && new Date(p.created_at) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // ⬅️ 30 → 60 jours
const isPromo = p.badge && /promo|promotion|réduction/i.test(p.badge);
const isCheap = p.price > 0 && p.price < 5000;
const isExpensive = p.price >= 20000;

let mainBadgeHTML = '';
let newBadgeHTML = '';

// Detect main badge
if (isFree) {
  mainBadgeHTML = `<div style="background:#f59e0b; color:#fff; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✨ GRATUIT</div>`;
} else if (p.badge) {
  const badgeColors = {
    'vip': '#8b5cf6',
    'promotion': '#ec4899',
    'populaire': '#3b82f6',
    'nouveau': '#10b981'
  };
  const badgeLower = p.badge.toLowerCase();
  const badgeColor = badgeColors[badgeLower] || '#3b82f6';
  mainBadgeHTML = `<div style="background:${badgeColor}; color:#fff; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.3);">⭐ ${p.badge.toUpperCase()}</div>`;
} else if (p.price > 0) {
  mainBadgeHTML = `<div style="background:#10b981; color:#fff; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.3);">💵 PAYANT</div>`;
}

// Detect if new
if (isNew) {
  newBadgeHTML = `<div style="background:#ec4899; color:#fff; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; margin-top:4px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">🆕 NOUVEAU</div>`;
}

html += `<div style="margin-bottom:16px; padding:0; background:rgba(30,41,59,0.4); border-radius:12px; overflow:hidden; border:1px solid rgba(148,163,184,0.2); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">`;

// ========================================
// IMAGE GALLERY SLIDER
// ========================================
if (galleryImages.length > 0) {
  html += `<div style="position:relative; width:100%; height:200px; background:#1e293b; overflow:hidden;">`;
  
  html += `<div id="gallery-${p.id}" style="display:flex; height:100%; overflow-x:auto; scroll-behavior:smooth; scrollbar-width:none; -ms-overflow-style:none;">`;
  
  galleryImages.forEach((img, idx) => {
    let fullImgUrl = img;
    if (!img.startsWith('http')) {
      const imgPath = img.startsWith('gallery/') || img.startsWith('images/') ?
        img :
        `gallery/${img}`;
      fullImgUrl = `https://zogohkfzplcuonkkfoov.supabase.co/storage/v1/object/public/products/${imgPath}`;
    }
    
// ✅ VAOVAO (lazy loading + observer):
html += `<img 
  data-src="${fullImgUrl}" 
  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 200'%3E%3Crect fill='%231e293b' width='300' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%2364748b' font-size='14'%3EChargement...%3C/text%3E%3C/svg%3E"
  alt="Image ${idx + 1} de ${p.title} - Photo de produit"
  class="miora-lazy-image"
  role="img"
  aria-label="Photo ${idx + 1} sur ${galleryImages.length} de ${p.title}"
  tabindex="0"
  style="min-width:100%; height:100%; object-fit:cover; cursor:pointer; transition: opacity 0.3s;"
  onerror="this.src='https://via.placeholder.com/300x200?text=Image+${idx+1}'; this.alt='Image indisponible'"
  loading="lazy"
  onclick="window.mioraViewImage('${fullImgUrl}')"
  onkeypress="if(event.key==='Enter'){window.mioraViewImage('${fullImgUrl}');event.preventDefault();}">`;
  });
  
  html += `</div>`;
  
  if (galleryImages.length > 1) {
    html += `<div style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%); display:flex; gap:6px; padding:6px 10px; background:rgba(0,0,0,0.5); border-radius:20px; z-index:10;">`;
    galleryImages.forEach((_, idx) => {
      html += `<div style="width:8px; height:8px; border-radius:50%; background:${idx === 0 ? '#fff' : 'rgba(255,255,255,0.4)'}; cursor:pointer; transition:all 0.3s;" onclick="document.getElementById('gallery-${p.id}').scrollLeft=${idx}*document.getElementById('gallery-${p.id}').offsetWidth" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'"></div>`;
    });
    html += `</div>`;
  }
  
  html += `<div style="position:absolute; top:10px; right:10px; display:flex; flex-direction:column; gap:6px; align-items:flex-end;">`;
  
  html += `${mainBadgeHTML}`;
  html += `${newBadgeHTML}`;


  if (galleryImages.length > 1) {
    html += `<div style="background:rgba(0,0,0,0.7); color:#fff; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600;">📸 ${galleryImages.length}</div>`;
  }
  
  html += `</div>`;
  html += `</div>`;
  
} else {
  html += `<div style="position:relative; width:100%; height:180px; background:#1e293b; display:flex; align-items:center; justify-content:center;">
                  <div style="color:#64748b; font-size:14px;">📷 Pas d'image</div>
                </div>`;
}
              
              // Product info
              html += `<div style="padding:14px;">`;
              
              // Title
              html += `<div style="font-weight:700; font-size:15px; margin-bottom:8px; color:#fff; line-height:1.4;">${p.title}</div>`;
              
              // Price
              html += `<div style="color:${priceColor}; font-weight:700; margin-bottom:10px; font-size:16px;">💰 ${price}</div>`;
              
              // Description (short)
              if (p.description || p.description_short) {
                const desc = (p.description || p.description_short).substring(0, 100);
                html += `<div style="color:#94a3b8; font-size:13px; line-height:1.5; margin-bottom:12px;">${desc}${desc.length >= 100 ? '...' : ''}</div>`;
              }
              
              // Category badge
              if (p.category) {
                html += `<div style="display:inline-block; padding:4px 10px; background:rgba(96,165,250,0.2); border-radius:6px; color:#60a5fa; font-size:11px; font-weight:600; margin-bottom:12px;">🏷️ ${p.category}</div>`;
              }
              
              // ========================================
// ACTION BUTTONS (ACCESSIBLE)
// ========================================
html += `<div style="display:flex; gap:8px; margin-top:12px;" role="group" aria-label="Actions pour ${p.title}">`;

// ✅ VAOVAO: WhatsApp Order Button
if (p.price >= 0) {
  const whatsappNumber = "261333106055"; // ⬅️ 0333106055
  const productName = encodeURIComponent(p.title);
  const productPrice = p.price > 0 ? `${Number(p.price).toLocaleString()} AR` : 'MAIMAIM-POANA';
  const whatsappMessage = encodeURIComponent(
    `Salama! 👋\n\nTe-hanafatra aho:\n\n📦 *${p.title}*\n💰 Prix: ${productPrice}\n🆔 ID: ${p.id}\n\nMisaotra! 😊`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  
  html += `<a 
    href="${whatsappUrl}" 
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Commander ${p.title} via WhatsApp"
    role="button"
    tabindex="0"
    style="flex:1; padding:10px 16px; background:linear-gradient(135deg, #25D366, #128C7E); color:white; border:none; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; transition:all 0.2s; text-decoration:none; text-align:center; display:block;"
    onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(37,211,102,0.4)'"
    onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
    onfocus="this.style.outline='2px solid #25D366'; this.style.outlineOffset='2px'"
    onblur="this.style.outline='none'">
    📞 Commander via WhatsApp
  </a>`;
}



// ✅ VAOVAO: Button "Voir détails" removed - WhatsApp only

html += `</div>`; // Close buttons (WhatsApp fotsiny)
              html += `</div>`; // Close product info
              html += `</div>`; // Close product card
            });
            
            // Footer
            html += `<div style="margin-top:20px; padding:14px; background:rgba(148,163,184,0.1); border-radius:10px; text-align:center; border:1px dashed rgba(148,163,184,0.3);">
              <div style="color:#94a3b8; font-size:13px; margin-bottom:8px;">💡 <strong>Mila fanampiana bebe kokoa?</strong></div>
              <div style="color:#64748b; font-size:12px; line-height:1.6;">
                Manontanya ahy momba ny produit, vidiny, na fomba fividianana!<br>
                Tsindrio "Ajouter au panier" mba handefasana commande via WhatsApp.
              </div>
            </div>`;
            
            html += `</div>`;
            
            textDiv.innerHTML = html;
            
            console.log('[Handler] ✅ Display complete with images + cart buttons');
            
            // ✅ IMPORTANT: Return null to prevent AI call
            return null;
            
          } else {
  // ========================================
  // NO PRODUCTS FOUND - SMART SUGGESTIONS
  // ========================================
  console.log('[Handler] ⚠️ No products found - generating suggestions');
  
  const msgDiv = window.mioraAddMessage('', false);
  const textDiv = msgDiv.querySelector('.miora-message-text');
  
  // ✅ SMART: Analyze failed query for suggestions
  const suggestions = await generateSmartSuggestions(detection.query || userMessage);
  
  let html = `<div style="color:#fff; font-family: system-ui, -apple-system, sans-serif;">`;
  
  // Header
  html += `<div style="padding:16px; background:rgba(245,158,11,0.15); border-radius:12px; border-left:4px solid #f59e0b; margin-bottom:16px;">
    <div style="font-size:16px; font-weight:700; color:#fbbf24; margin-bottom:8px;">
      🔍 Tsy nahita produit${detection.query ? ` momba "<strong>${detection.query}</strong>"` : ''}
    </div>
    <div style="color:#94a3b8; font-size:13px; line-height:1.6;">
      Fa misy suggestions ho anao...
    </div>
  </div>`;
  // ✅ NO MORE state.currentLanguage references below!
// All messages are hardcoded or use currentLanguage variable

  // ========================================
  // SECTION 1: Similar Products
  // ========================================
  if (suggestions.similar && suggestions.similar.length > 0) {
    html += `<div style="margin-bottom:20px;">
      <div style="font-size:15px; font-weight:700; color:#10b981; margin-bottom:12px;">
        💡 Zavatra mety tianao:
      </div>
      <div style="display:grid; gap:10px;">`;
    
    suggestions.similar.forEach(prod => {
      const price = prod.price > 0 ? `${Number(prod.price).toLocaleString()} AR` : '✨ MAIMAIM-POANA';
      html += `<div style="padding:12px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; cursor:pointer; transition:all 0.3s;"
        onclick="document.getElementById('miora-input').value='${prod.title}'; document.getElementById('miora-send').click();"
        onmouseover="this.style.background='rgba(16,185,129,0.2)'; this.style.transform='translateX(5px)'"
        onmouseout="this.style.background='rgba(16,185,129,0.1)'; this.style.transform='translateX(0)'">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:700; font-size:14px; color:#fff; margin-bottom:4px;">${prod.title}</div>
            <div style="color:#6ee7b7; font-size:13px; font-weight:600;">${price}</div>
          </div>
          <div style="color:#6ee7b7; font-size:18px;">→</div>
        </div>
      </div>`;
    });
    
    html += `</div></div>`;
  }
  
  // ========================================
  // SECTION 2: Trending Products
  // ========================================
  if (suggestions.trending && suggestions.trending.length > 0) {
    html += `<div style="margin-bottom:20px;">
      <div style="font-size:15px; font-weight:700; color:#f59e0b; margin-bottom:12px;">
        🔥 Malaza ankehitriny:
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">`;
    
    suggestions.trending.forEach(prod => {
      html += `<button 
        onclick="document.getElementById('miora-input').value='${prod.title}'; document.getElementById('miora-send').click();"
        style="padding:8px 14px; background:rgba(245,158,11,0.2); color:#fbbf24; border:1px solid rgba(245,158,11,0.4); border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;"
        onmouseover="this.style.background='rgba(245,158,11,0.3)'"
        onmouseout="this.style.background='rgba(245,158,11,0.2)'">
        ${prod.title}
      </button>`;
    });
    
    html += `</div></div>`;
  }
  
  // ========================================
  // SECTION 3: Category Suggestions
  // ========================================
  if (suggestions.categories && suggestions.categories.length > 0) {
    html += `<div style="margin-bottom:16px;">
      <div style="font-size:15px; font-weight:700; color:#3b82f6; margin-bottom:12px;">
        📂 Hijery ireo catégories ireto?
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">`;
    
    suggestions.categories.forEach(cat => {
      html += `<button 
        onclick="document.getElementById('miora-input').value='${cat.query}'; document.getElementById('miora-send').click();"
        style="padding:8px 14px; background:rgba(59,130,246,0.2); color:#60a5fa; border:1px solid rgba(59,130,246,0.4); border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.2s;"
        onmouseover="this.style.background='rgba(59,130,246,0.3)'"
        onmouseout="this.style.background='rgba(59,130,246,0.2)'">
        ${cat.icon} ${cat.name}
      </button>`;
    });
    
    html += `</div></div>`;
  }
  
  // ========================================
  // SECTION 4: Help
  // ========================================
  html += `<div style="margin-top:16px; padding:12px; background:rgba(59,130,246,0.1); border-radius:10px; text-align:center; border:1px dashed rgba(59,130,246,0.3);">
    <div style="color:#60a5fa; font-size:13px; margin-bottom:6px;">
      💬 <strong>Mila fanampiana?</strong>
    </div>
    <div style="color:#94a3b8; font-size:12px; line-height:1.6;">
      Afaka miresaka amin'i Miora ianao momba ny zavatra tadiavinao!<br>
      Exemple: "Mila ebook momba ny motivation" na "Cherche formation business"
    </div>
  </div>`;
  
  html += `</div>`;
  
  textDiv.innerHTML = html;
  
  console.log('[Handler] ✅ Smart suggestions displayed');
  
  // ✅ IMPORTANT: Return null to prevent AI call
  return null;
}
          
        } catch (error) {
          console.error('[Handler] ❌ Error:', error);
          
          const msgDiv = window.mioraAddMessage('', false);
          const textDiv = msgDiv.querySelector('.miora-message-text');
          
          textDiv.innerHTML = `<div style="padding:15px; background:rgba(239,68,68,0.1); border-radius:10px; border-left:4px solid #ef4444; color:#fca5a5;">
            ⚠️ Nisy olana: ${error.message}
          </div>`;
          
          // ✅ IMPORTANT: Return null to prevent AI call even on error
          return null;
        }
      }
      
      // ✅ Fallback to AI for non-product queries
      console.log('[Handler] 🤖 Using AI (no product query detected)');
      return await originalCallAI.call(this, userMessage, addToHistory);
    };
    
    console.log('[Miora Handler] ✅ Patched successfully');
    console.log('[Miora Handler] 🎯 Product queries → Client-side with images + cart');
    console.log('[Miora Handler] 🤖 Other queries → AI Edge Function');
  });
  
})();
// ========================================
// LAZY LOADING OBSERVER
// ========================================
(function initLazyLoading() {
  console.log('[Lazy Load] 🖼️ Initializing...');
  
  let imageObserver = null;
  let messagesObserver = null;
  
  // ✅ VAOVAO: Create observer only once
function createImageObserver() {
  if (imageObserver) return imageObserver;
  
  imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        
        if (src) {
          console.log('[Lazy Load] 📥 Loading:', src.substring(0, 50) + '...');
          
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.3s ease';
          
          // ✅ VAOVAO: Timeout protection (10 seconds max)
          const loadTimeout = setTimeout(() => {
            console.warn('[Lazy Load] ⏱️ Timeout for:', src.substring(0, 50));
            img.src = 'https://via.placeholder.com/300x200?text=Timeout';
            img.style.opacity = '0.6';
            img.removeAttribute('data-src');
          }, 10000);
          
          // ✅ Preload image
          const tempImg = new Image();
          
          tempImg.onload = () => {
            clearTimeout(loadTimeout); // ⬅️ Cancel timeout
            img.src = src;
            img.style.opacity = '1';
            img.removeAttribute('data-src');
            console.log('[Lazy Load] ✅ Loaded successfully');
          };
          
          tempImg.onerror = () => {
            clearTimeout(loadTimeout); // ⬅️ Cancel timeout
            console.error('[Lazy Load] ❌ Failed:', src);
            img.src = 'https://via.placeholder.com/300x200?text=Image+Error';
            img.style.opacity = '0.5';
            img.removeAttribute('data-src');
          };
          
          // ✅ VAOVAO: Try loading with retry logic
          let retryCount = 0;
          const maxRetries = 2;
          
          const tryLoad = () => {
            tempImg.src = src + (retryCount > 0 ? `?retry=${retryCount}` : '');
          };
          
          tempImg.onerror = () => {
            clearTimeout(loadTimeout);
            
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`[Lazy Load] 🔄 Retry ${retryCount}/${maxRetries}:`, src.substring(0, 50));
              setTimeout(tryLoad, 1000 * retryCount); // Wait 1s, 2s...
            } else {
              console.error('[Lazy Load] ❌ Failed after retries:', src);
              img.src = 'https://via.placeholder.com/300x200?text=Image+Error';
              img.style.opacity = '0.5';
              img.removeAttribute('data-src');
            }
          };
          
          tryLoad(); // Start loading
          
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px', // ⬅️ Reduced from 100px (more aggressive)
    threshold: 0.1 // ⬅️ Increased from 0.01 (better detection)
  });
  
  return imageObserver;
}
  function observeImages() {
    const observer = createImageObserver();
    const images = document.querySelectorAll('.miora-lazy-image[data-src]');
    console.log('[Lazy Load] 👁️ Observing:', images.length, 'images');
    images.forEach(img => observer.observe(img));
  }
  
  observeImages();
  
  // ✅ VAOVAO: Debounced observe
  let observeTimeout;
  function debouncedObserve() {
    clearTimeout(observeTimeout);
    observeTimeout = setTimeout(observeImages, 150);
  }
  
  const messagesDiv = document.getElementById('miora-messages');
  if (messagesDiv) {
    if (messagesObserver) messagesObserver.disconnect();
    
    messagesObserver = new MutationObserver(debouncedObserve);
    messagesObserver.observe(messagesDiv, {
      childList: true,
      subtree: true
    });
  }
  
  // ✅ VAOVAO: Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (imageObserver) {
      imageObserver.disconnect();
      imageObserver = null;
    }
    if (messagesObserver) {
      messagesObserver.disconnect();
      messagesObserver = null;
    }
    console.log('[Lazy Load] 🧹 Cleanup done');
  });
  
  console.log('[Lazy Load] ✅ Ready');
})();
// ==========================================
// END OF MIORA AI ASSISTANT
// ==========================================

console.log('✅ [Miora] All modules loaded successfully!');
console.log('📦 [Miora] Available modules:');
console.log('   - Global Utils');
console.log('   - Supabase Client');
console.log('   - Product Search');
console.log('   - Main Assistant');
console.log('   - Smart Handler (FIXED + IMAGES + CART)');
console.log('🎉 [Miora] System ready!');// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
window.addEventListener('error', function(event) {
  console.error('🚨 [Global Error]:', event.error);
  
  // Check if it's related to Miora
  if (event.error && event.error.stack && event.error.stack.includes('miora')) {
    console.error('🚨 [Miora Error Stack]:', event.error.stack);
    
    // Show user-friendly notification
    if (typeof showNotification === 'function') {
      showNotification('⚠️ Une erreur s\'est produite. Rechargez la page.', 'error', 5000);
    }
  }
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('🚨 [Unhandled Promise]:', event.reason);
  
  if (event.reason && event.reason.message && event.reason.message.includes('state')) {
    console.error('🚨 [State Error]:', event.reason);
    
    // Try to recover
    try {
      const lang = localStorage.getItem('miora-language') || 'mg';
      console.log('🔄 [Recovery] Using language:', lang);
    } catch (err) {
      console.error('❌ [Recovery Failed]:', err);
    }
  }
});

console.log('✅ [Miora] Error handlers installed');