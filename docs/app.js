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

var products = (window.products && Array.isArray(window.products)) ? window.products : [];
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Init] Waiting for Supabase products...');
  if (typeof fetchSupabaseProducts === 'function') {
    setTimeout(function() {
      fetchSupabaseProducts().catch(function(err) {
        console.error('[Init] Failed to load products:', err);
        renderProducts('all', '');
      });
    }, 500);
  }
});
var FALLBACK_IMG = 'https://via.placeholder.com/600x400?text=Produit';

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

  /* ---------- Auth (Email/Password) ---------- */
  function ensureOwnerLoginModal(){
    let m = document.getElementById('owner-login-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'owner-login-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:7000';
    m.innerHTML = `
      <div style="background:#0e0f13;color:#fff;border-radius:12px;width:min(420px,94%);padding:16px;box-shadow:0 10px 35px rgba(0,0,0,.5)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0">Owner Login</h3>
          <button type="button" class="param-btn" id="ol-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="ol-email" type="email" placeholder="Email" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          <input id="ol-pass" type="password" placeholder="Mot de passe" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          <small style="opacity:.8">Midira amin'ny email/password (tsy OTP).</small>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button type="button" class="param-btn" id="ol-submit"><i class="fa-solid fa-right-to-bracket"></i> Login</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    m.querySelector('#ol-close').onclick = () => { m.style.display='none'; m.setAttribute('aria-hidden','true'); };
    return m;
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
    console.log('[fetchSupabaseProducts] 📡 Connecting to Supabase...');
    const sb = await ensureSupabase();
    
    console.log('[fetchSupabaseProducts] 📥 Fetching data...');
    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[fetchSupabaseProducts] ❌ Error:', error);
      throw error;
    }
    
    console.log('[fetchSupabaseProducts] ✅ Received', data?.length || 0, 'products');
    
    const converted = (data || []).map(mapRowToUI);
    
    if (converted.length > 0) {
      window.products = converted;
      console.log('[fetchSupabaseProducts] ✅ Products updated globally');
    } else {
      console.warn('[fetchSupabaseProducts] ⚠️ No products in database');
      window.products = [];
    }
    
    const activeFilter = document.querySelector('.filters .filter-btn.active');
    const filter = activeFilter ?
      (activeFilter.getAttribute('data-filter') || activeFilter.getAttribute('data-category') || 'all') :
      'all';
    const searchInput = document.getElementById('search');
    const searchValue = searchInput ? searchInput.value : '';
    
    if (typeof renderProducts === 'function') {
      renderProducts(filter, searchValue);
    }
    
    if (typeof applyAuthUI === 'function') {
      applyAuthUI();
    }
    
  } catch (e) {
    console.error('[fetchSupabaseProducts] 💥 FATAL ERROR:', e);
    window.products = [];
    if (typeof renderProducts === 'function') {
      renderProducts('all', '');
    }
  }
}

  /* ---------- Upload helpers (image / video / pdf) ---------- */
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

  /* ---------- Modal UI Add/Edit + File picker ---------- */
 function ensureProductModal() {
  let modal = document.getElementById('product-edit-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'product-edit-modal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:6000;';
  modal.innerHTML = `
    <div class="pe-card" role="dialog" aria-modal="true" aria-labelledby="pe-title" style="
      width:min(720px,94%);background:#0e0f13;color:#fff;border-radius:14px;padding:14px 14px 12px;box-shadow:0 10px 35px rgba(0,0,0,.4)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
        <h3 id="pe-title" style="margin:0">Product</h3>
        <button type="button" class="param-btn" id="pe-close" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form id="pe-form" style="display:grid;gap:10px">
        <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
          
          <!-- ✅ TYPE DE PRODUIT - EN PREMIER -->
          <label style="grid-column:1/-1;display:flex;flex-direction:column;gap:6px">
            <span style="font-weight:700;font-size:15px">Type de produit</span>
            <select id="pe-product-type" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff;font-size:14px">
              <option value="numeric">💻 Numérique (eBooks, vidéos, apps)</option>
              <option value="physical">📦 Physique (vêtements, électronique, etc.)</option>
            </select>
          </label>
          
          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Titre</span>
            <input id="pe-title-input" required placeholder="Titre du produit" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          </label>

          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Prix (AR)</span>
            <input id="pe-price-input" type="number" min="0" step="1" placeholder="0" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          </label>

          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Catégorie</span>
            <select id="pe-category" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
              <!-- Sera rempli dynamiquement -->
            </select>
          </label>

          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Badge (optionnel)</span>
            <input id="pe-badge" placeholder="ex: Hot, New..." style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          </label>

          <label style="grid-column:1 / -1;display:flex;flex-direction:column;gap:6px">
            <span>Tags (séparés par des virgules)</span>
            <input id="pe-tags" placeholder="business, mobile, formation" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          </label>

          <label style="grid-column:1 / -1;display:flex;flex-direction:column;gap:6px">
            <span>Description</span>
            <textarea id="pe-description" rows="3" placeholder="Description du produit" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff;resize:vertical"></textarea>
          </label>
        </div>

        <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr">
          <div class="pe-uploader" data-kind="image" style="border:1px dashed #2a2d38;border-radius:12px;padding:10px;min-height:160px;display:flex;gap:10px">
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>Image (thumbnail)</strong>
                <button class="param-btn" type="button" id="pe-pick-image"><i class="fa-solid fa-image"></i> Choisir</button>
              </div>
              <small style="opacity:.8">Formats: JPG/PNG/WebP.</small>
              <div id="pe-image-preview" style="border:1px solid #2a2d38;border-radius:10px;min-height:110px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#11151f">
                <span style="opacity:.6">Tsy misy sary</span>
              </div>
            </div>
          </div>

          <div class="pe-uploader" data-kind="preview" id="pe-preview-uploader" style="border:1px dashed #2a2d38;border-radius:12px;padding:10px;min-height:160px;display:flex;gap:10px">
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>Preview (Vidéo/PDF)</strong>
                <button class="param-btn" type="button" id="pe-pick-preview"><i class="fa-solid fa-upload"></i> Choisir</button>
              </div>
              <small style="opacity:.8">Vidéo (mp4/webm) na PDF.</small>
              <div id="pe-preview-preview" style="border:1px solid #2a2d38;border-radius:10px;min-height:110px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#11151f">
                <span style="opacity:.6">Tsy misy vidéo/PDF</span>
              </div>
            </div>
          </div>
        </div>

        <div id="pe-preview-url-container" style="display:flex;gap:8px;align-items:center">
          <input id="pe-preview-url" placeholder="na URL preview: https://..." style="flex:1;padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          <button class="param-btn" type="button" id="pe-test-preview"><i class="fa-solid fa-eye"></i> Test</button>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
          <button class="param-btn" type="button" id="pe-cancel">Annuler</button>
          <button class="param-btn" type="submit" id="pe-submit"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);

  // ✅ WIRE EVENTS
  modal.querySelector('#pe-close').addEventListener('click', () => peClose());
  modal.querySelector('#pe-cancel').addEventListener('click', () => peClose());

  // ✅ PRODUCT TYPE CHANGE -> Update categories
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
    const options = categoryOptions[productType] || categoryOptions.numeric;
    const currentValue = categorySelect.value;
    
    categorySelect.innerHTML = '';
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      categorySelect.appendChild(option);
    });

    // Restore value if exists
    const optionExists = options.find(opt => opt.value === currentValue);
    if (optionExists) {
      categorySelect.value = currentValue;
    } else {
      categorySelect.value = options[0].value;
    }

    // Show/hide preview fields
    if (productType === 'physical') {
      previewUploader.style.display = 'none';
      previewUrlContainer.style.display = 'none';
    } else {
      previewUploader.style.display = '';
      previewUrlContainer.style.display = '';
    }
    
    console.log('[Modal] Categories updated for:', productType);
  }

  productTypeSelect.addEventListener('change', function() {
    updateCategories(this.value);
  });

  // Initial load
  updateCategories('numeric');

  // Drag & drop
  modal.querySelectorAll('.pe-uploader').forEach(box => {
    box.addEventListener('dragover', e => { e.preventDefault(); box.style.borderColor = '#5b78ff'; });
    box.addEventListener('dragleave', () => { box.style.borderColor = '#2a2d38'; });
    box.addEventListener('drop', e => {
      e.preventDefault();
      box.style.borderColor = '#2a2d38';
      const files = Array.from(e.dataTransfer.files || []);
      if (!files.length) return;
      if (box.getAttribute('data-kind') === 'image') peSetLocalFile('image', files[0]);
      else peSetLocalFile('preview', files[0]);
    });
  });

  return modal;
}

  const peLocal = { imageFile: null, previewFile: null, mode: 'add', recordId: null };

  function peOpen({ mode = 'add', product = null, productType = 'numeric' } = {}) {
  if (!isOwner()) {
    alert('Owner ihany no afaka manao izao.');
    return;
  }
  
  const modal = ensureProductModal();
  peLocal.mode = mode;
  peLocal.recordId = product?.id || null;
  peLocal.imageFile = null;
  peLocal.previewFile = null;
  
  // ✅ SET PRODUCT TYPE (priorité: product existant, sinon paramètre, sinon 'numeric')
  const productTypeSelect = modal.querySelector('#pe-product-type');
  const finalProductType = product?.product_type || product?._db?.product_type || productType;
  
  if (productTypeSelect) {
    productTypeSelect.value = finalProductType;
    console.log('[peOpen] Product type set to:', finalProductType);
    
    // ✅ Trigger change pour update categories
    productTypeSelect.dispatchEvent(new Event('change'));
  }
  
  // Title
  const typeLabel = finalProductType === 'physical' ? '📦 Produit Physique' : '💻 Produit Numérique';
  modal.querySelector('#pe-title').textContent = (mode === 'add') ? `Ajouter ${typeLabel}` : `Éditer ${typeLabel}`;
  
  // Fill fields
  modal.querySelector('#pe-title-input').value = product?.title || '';
  modal.querySelector('#pe-price-input').value = Number(product?.price || 0);
  modal.querySelector('#pe-category').value = normalizeCategory(product?.category || (finalProductType === 'physical' ? 'other' : 'ebooks'));
  modal.querySelector('#pe-badge').value = product?._db?.badge || '';
  modal.querySelector('#pe-tags').value = Array.isArray(product?._db?.tags) ? product._db.tags.join(', ') : '';
  modal.querySelector('#pe-description').value = product?.description || product?.description_short || '';
  modal.querySelector('#pe-preview-url').value = product?.preview_url || product?._db?.preview_url || '';
  
  // Image preview
  const imgPrev = modal.querySelector('#pe-image-preview');
  imgPrev.innerHTML = product?.image?.url ?
    `<img src="${escapeAttr(product.image.url)}" alt="thumbnail" style="width:100%;height:110px;object-fit:cover">` :
    `<span style="opacity:.6">Tsy misy sary</span>`;
  
  // Preview preview
  const pvPrev = modal.querySelector('#pe-preview-preview');
  const existingPreview = product?.preview_url || product?._db?.preview_url || '';
  if (existingPreview) {
    if (/\.pdf(\?|#|$)/i.test(existingPreview)) {
      pvPrev.innerHTML = `<div style="opacity:.85"><i class="fa-solid fa-file-pdf"></i> PDF</div>`;
    } else if (/\.(mp4|webm|mkv)(\?|#|$)/i.test(existingPreview)) {
      pvPrev.innerHTML = `<video src="${escapeAttr(existingPreview)}" style="max-width:100%;max-height:110px" muted></video>`;
    } else {
      pvPrev.innerHTML = `<div style="opacity:.8">${escapeHtml(existingPreview)}</div>`;
    }
  } else {
    pvPrev.innerHTML = `<span style="opacity:.6">Tsy misy vidéo/PDF</span>`;
  }
  
  // Wire file pickers
  modal.querySelector('#pe-pick-image').onclick = async () => {
    const files = await pickFiles({ multiple: false });
    if (files && files[0]) peSetLocalFile('image', files[0]);
  };
  
  modal.querySelector('#pe-pick-preview').onclick = async () => {
    const files = await pickFiles({ multiple: false });
    if (files && files[0]) peSetLocalFile('preview', files[0]);
  };
  
  modal.querySelector('#pe-test-preview').onclick = () => {
    const url = modal.querySelector('#pe-preview-url').value.trim();
    if (!url) return alert('Ampidiro URL preview aloha na misafidiana vidéo/PDF.');
    if (typeof openPreview === 'function') {
      openPreview({ title: modal.querySelector('#pe-title-input').value.trim() || 'Preview', preview_url: url });
    }
  };
  
  // Submit form
  modal.querySelector('#pe-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await peSubmitForm();
      peClose();
      await fetchSupabaseProducts();
    } catch (err) {
      console.error('[peSubmitForm]', err);
      alert('Erreur: ' + err.message);
    }
  };
  
  // Show modal
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('#pe-title-input').focus();
}
// ✅ Helper function pour remplir les catégories
function updateCategoryOptions(productType) {
  const categorySelect = document.getElementById('pe-category');
  if (!categorySelect) return;
  
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
}

  function peClose() {
    const modal = document.getElementById('product-edit-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function peSetLocalFile(kind, file) {
    const modal = ensureProductModal();
    const { kind: detectKind } = detectAssetKind(file);
    if (kind === 'image' && detectKind !== 'image') { return alert('Safidio sary ho an\'ny thumbnail.'); }
    if (kind === 'preview' && !(detectKind === 'video' || detectKind === 'pdf')) { return alert('Safidio vidéo na PDF ho an\'ny preview.'); }

    if (kind === 'image') {
      peLocal.imageFile = file;
      const url = URL.createObjectURL(file);
      modal.querySelector('#pe-image-preview').innerHTML = `<img src="${url}" alt="thumbnail" style="width:100%;height:110px;object-fit:cover">`;
    } else {
      peLocal.previewFile = file;
      const pvBox = modal.querySelector('#pe-preview-preview');
      if (detectKind === 'pdf') {
        pvBox.innerHTML = `<div style="opacity:.85"><i class="fa-solid fa-file-pdf"></i> ${(typeof escapeHtml === 'function') ? escapeHtml(file.name) : file.name}</div>`;
      } else {
        const url = URL.createObjectURL(file);
        pvBox.innerHTML = `<video src="${url}" style="max-width:100%;max-height:110px" muted></video>`;
      }
    }
  }

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

  async function peSubmitForm() {
  if (!isOwner()) throw new Error('Owner ihany no afaka manova.');
  const sb = await ensureSupabase();
  
  // ✅ GET FORM VALUES
  const title = document.getElementById('pe-title-input').value.trim();
  const price = Number(document.getElementById('pe-price-input').value || 0);
  const category = normalizeCategory(document.getElementById('pe-category').value || 'ebooks');
  const badge = document.getElementById('pe-badge').value.trim() || null;
  const tagsRaw = document.getElementById('pe-tags').value.trim();
  const description = document.getElementById('pe-description').value.trim() || null;
  let preview_url = document.getElementById('pe-preview-url').value.trim() || null;
  
  // ✅ CRITICAL: Get product_type
  const productTypeSelect = document.getElementById('pe-product-type');
  if (!productTypeSelect) {
    console.error('[peSubmitForm] ❌ product_type select not found!');
    throw new Error('Product type field missing');
  }
  
  const product_type = productTypeSelect.value || 'numeric';
  console.log('[peSubmitForm] 📋 Product type:', product_type);
  console.log('[peSubmitForm] 📋 Title:', title);
  console.log('[peSubmitForm] 📋 Price:', price);
  
  // Upload files
  const uploaded = await peUploadSelectedFiles();
  let thumbnail_url = uploaded.thumbnail_url || null;
  if (!preview_url) preview_url = uploaded.preview_url || null;
  
  // ✅ BUILD PAYLOAD
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
    product_type // ✅ CRITICAL
  };
  
  console.log('[peSubmitForm] 📦 Payload:', payload);
  
  if (peLocal.mode === 'add') {
    // ========================================
    // INSERT NEW PRODUCT
    // ========================================
    const { data: inserted, error } = await sb
      .from('products')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      console.error('[peSubmitForm] ❌ Insert error:', error);
      throw error;
    }
    
    console.log('[peSubmitForm] ✅ Product inserted:', inserted);
    
    // ========================================
    // 🔥 SEND PUSH NOTIFICATIONS
    // ========================================
    try {
      console.log('[peSubmitForm] 📤 Sending push notifications...');
      console.log('[peSubmitForm] 📤 Product type for notification:', product_type);
      
      const notifPayload = {
        productId: inserted.id,
        productTitle: title,
        productPrice: price,
        productType: product_type // ✅ CRITICAL
      };
      
      console.log('[peSubmitForm] 📤 Notification payload:', notifPayload);
      
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
      
      console.log('[peSubmitForm] 📤 Response status:', notifResponse.status);
      
      if (notifResponse.ok) {
        const result = await notifResponse.json();
        console.log('[peSubmitForm] ✅ Notifications sent:', result);
        console.log('[peSubmitForm] ✅ Sent to', result.sent || 0, '/', result.total || 0, 'subscribers');
      } else {
        const errorText = await notifResponse.text();
        console.error('[peSubmitForm] ❌ Push notification failed:', errorText);
      }
    } catch (notifErr) {
      console.error('[peSubmitForm] ❌ Notification error:', notifErr);
      // Don't block success for notification failure
    }
    
    // ========================================
    // 🔥 LOCAL NOTIFICATION
    // ========================================
    if (typeof window.notifyNewProduct === 'function') {
      console.log('[peSubmitForm] 🔔 Showing local notification');
      window.notifyNewProduct({
        id: inserted.id,
        title: title,
        price: price,
        product_type: product_type
      });
    }
    
    // ========================================
    // SUCCESS MESSAGE
    // ========================================
    const typeLabel = product_type === 'physical' ? '📦 Produit physique' : '💻 Produit numérique';
    const message = `${typeLabel} ajouté avec succès! 🎉\n\nNotifications envoyées aux abonnés.`;
    
    alert(message);
    console.log('[peSubmitForm] ✅ Complete');
    
  } else {
    // ========================================
    // UPDATE EXISTING PRODUCT
    // ========================================
    const { error } = await sb.from('products').update(payload).eq('id', peLocal.recordId);
    if (error) throw error;
    alert('Produit modifié.');
  }
}

// ✅ Make it global
window.peSubmitForm = peSubmitForm;

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
// ✅✅✅ AMPIO ITY FARANY ✅✅✅
  // Expose functions globally
  window.peOpen = peOpen;
  window.peClose = peClose;
  window.updateCategoryOptions = updateCategoryOptions;
  window.addProductPrompt = addProductPrompt;
  window.addPhysicalProductPrompt = addPhysicalProductPrompt;
  window.editProductPrompt = editProductPrompt;
  window.deleteProductConfirm = deleteProductConfirm;
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
  var imgUrl = escapeAttr((p.image && p.image.url) ? p.image.url : FALLBACK_IMG);
  var imgAlt = escapeAttr((p.image && p.image.alt) ? p.image.alt : (p.title || 'Produit'));
  var priceStr = fmtPrice(p.price);
  var badgeHTML = makeBadge(p);
  var actions = makeActions(p);
  var titleSafe = escapeHtml(p.title || 'Produit');
  var descShort = escapeHtml(p.description_short || '');
  
  // ✅ VAOVAO: Like button conditional
  var category = normalizeCategory(p.category || '');
  var showLike = (category === 'videos' || category === 'free' || category === 'gratuit');
  var likeBtn = showLike ? makeLike(p) : '';
  
  // ✅ Structure with conditional like
  return '<div class="card-header">' +
    badgeHTML +
    likeBtn + // ✅ Empty string raha tsy videos/free
    '</div>' +
    createProgressiveImage(imgUrl, imgAlt, 'product-image') +
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
  function ensureOwnerLoginModal(){
    let m = document.getElementById('owner-login-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'owner-login-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:7000';
    m.innerHTML = `
      <div style="background:#0e0f13;color:#fff;border-radius:12px;width:min(420px,94%);padding:16px;box-shadow:0 10px 35px rgba(0,0,0,.5)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0">Owner Login</h3>
          <button type="button" class="param-btn" id="ol-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="ol-email" type="email" placeholder="Email" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          <input id="ol-pass" type="password" placeholder="Mot de passe" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          <small style="opacity:.8">Midira amin'ny email/password (tsy OTP).</small>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button type="button" class="param-btn" id="ol-submit"><i class="fa-solid fa-right-to-bracket"></i> Login</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    m.querySelector('#ol-close').onclick = () => { m.style.display='none'; m.setAttribute('aria-hidden','true'); };
    return m;
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

  /* ---------- Fetch DB ---------- */
  async function fetchSupabaseProducts() {
    try {
      const sb = await ensureSupabase();
      const { data, error } = await sb.from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const converted = (data || []).map(mapRowToUI);
      if (converted.length) {
        window.products = converted;
      }
      const toolbarBtn = document.querySelector('.filters .filter-btn.active');
      const f = toolbarBtn ? (toolbarBtn.getAttribute('data-filter') || toolbarBtn.getAttribute('data-category') || 'all') : 'all';
      const sEl = document.getElementById('search');
      const sVal = sEl ? (sEl.value || '') : '';
      if (typeof renderProducts === 'function') {
        renderProducts(f, sVal);
      }
      applyAuthUI();
    } catch (e) {
      console.error('[fetchSupabaseProducts]', e);
    }
  }

  /* ---------- Upload helpers (image / video / pdf) ---------- */
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

  /* ---------- Modal UI Add/Edit + File picker ---------- */
  function ensureProductModal() {
  let modal = document.getElementById('product-edit-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'product-edit-modal';
  modal.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:6000;';
  modal.innerHTML = `
    <div class="pe-card" role="dialog" aria-modal="true" aria-labelledby="pe-title" style="
      width:min(720px,94%);background:#0e0f13;color:#fff;border-radius:14px;padding:14px 14px 12px;box-shadow:0 10px 35px rgba(0,0,0,.4)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
        <h3 id="pe-title" style="margin:0">Product</h3>
        <button type="button" class="param-btn" id="pe-close" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form id="pe-form" style="display:grid;gap:10px">
        <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Titre</span>
            <input id="pe-title-input" required placeholder="Titre du produit" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          </label>

          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Prix (AR)</span>
            <input id="pe-price-input" type="number" min="0" step="1" placeholder="0" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          </label>

          <!-- ✅ NOUVEAU: Type de produit -->
          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Type de produit</span>
            <select id="pe-product-type" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
              <option value="numeric">💻 Numérique</option>
              <option value="physical">📦 Physique</option>
            </select>
          </label>

          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Catégorie</span>
            <select id="pe-category" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
              <option value="ebooks">eBooks</option>
              <option value="videos">Vidéos</option>
              <option value="apps">Apps/Jeux</option>
              <option value="vip">VIP</option>
              <option value="promo">Promo</option>
              <option value="free">Gratuit</option>
            </select>
          </label>

          <label style="display:flex;flex-direction:column;gap:6px">
            <span>Badge (optionnel)</span>
            <input id="pe-badge" placeholder="ex: Hot, New..." style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          </label>

          <label style="grid-column:1 / -1;display:flex;flex-direction:column;gap:6px">
            <span>Tags (séparés par des virgules)</span>
            <input id="pe-tags" placeholder="business, mobile, formation" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          </label>

          <label style="grid-column:1 / -1;display:flex;flex-direction:column;gap:6px">
            <span>Description</span>
            <textarea id="pe-description" rows="3" placeholder="Description du produit" style="padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff;resize:vertical"></textarea>
          </label>
        </div>

        <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr">
          <div class="pe-uploader" data-kind="image" style="border:1px dashed #2a2d38;border-radius:12px;padding:10px;min-height:160px;display:flex;gap:10px">
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>Image (thumbnail)</strong>
                <button class="param-btn" type="button" id="pe-pick-image"><i class="fa-solid fa-image"></i> Choisir</button>
              </div>
              <small style="opacity:.8">Formats: JPG/PNG/WebP.</small>
              <div id="pe-image-preview" style="border:1px solid #2a2d38;border-radius:10px;min-height:110px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#11151f">
                <span style="opacity:.6">Tsy misy sary</span>
              </div>
            </div>
          </div>

          <div class="pe-uploader" data-kind="preview" id="pe-preview-uploader" style="border:1px dashed #2a2d38;border-radius:12px;padding:10px;min-height:160px;display:flex;gap:10px">
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <strong>Preview (Vidéo/PDF)</strong>
                <button class="param-btn" type="button" id="pe-pick-preview"><i class="fa-solid fa-upload"></i> Choisir</button>
              </div>
              <small style="opacity:.8">Vidéo (mp4/webm) na PDF.</small>
              <div id="pe-preview-preview" style="border:1px solid #2a2d38;border-radius:10px;min-height:110px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#11151f">
                <span style="opacity:.6">Tsy misy vidéo/PDF</span>
              </div>
            </div>
          </div>
        </div>

        <div id="pe-preview-url-container" style="display:flex;gap:8px;align-items:center">
          <input id="pe-preview-url" placeholder="na URL preview: https://..." style="flex:1;padding:10px;border:1px solid #2a2d38;border-radius:10px;background:#14161c;color:#fff">
          <button class="param-btn" type="button" id="pe-test-preview"><i class="fa-solid fa-eye"></i> Test</button>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px">
          <button class="param-btn" type="button" id="pe-cancel">Annuler</button>
          <button class="param-btn" type="submit" id="pe-submit"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#pe-close').addEventListener('click', () => peClose());
  modal.querySelector('#pe-cancel').addEventListener('click', () => peClose());

  // ✅ NOUVEAU: Category switcher logic
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
    const options = categoryOptions[productType] || categoryOptions.numeric;
    categorySelect.innerHTML = '';
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      categorySelect.appendChild(option);
    });

    // Show/hide preview fields
    if (productType === 'physical') {
      previewUploader.style.display = 'none';
      previewUrlContainer.style.display = 'none';
    } else {
      previewUploader.style.display = '';
      previewUrlContainer.style.display = '';
    }
  }

  productTypeSelect.addEventListener('change', function() {
    updateCategories(this.value);
  });

  // Drag & drop handlers (keep existing code)
  modal.querySelectorAll('.pe-uploader').forEach(box => {
    box.addEventListener('dragover', e => { e.preventDefault(); box.style.borderColor = '#5b78ff'; });
    box.addEventListener('dragleave', () => { box.style.borderColor = '#2a2d38'; });
    box.addEventListener('drop', e => {
      e.preventDefault();
      box.style.borderColor = '#2a2d38';
      const files = Array.from(e.dataTransfer.files || []);
      if (!files.length) return;
      if (box.getAttribute('data-kind') === 'image') peSetLocalFile('image', files[0]);
      else peSetLocalFile('preview', files[0]);
    });
  });

  return modal;
}

  const peLocal = { imageFile: null, previewFile: null, mode: 'add', recordId: null };

  function peOpen({ mode = 'add', product = null } = {}) {
    if (!isOwner()) { alert('Owner ihany no afaka manao izao.'); return; }
    const modal = ensureProductModal();
    peLocal.mode = mode;
    peLocal.recordId = product?.id || null;
    peLocal.imageFile = null;
    peLocal.previewFile = null;

    modal.querySelector('#pe-title').textContent = (mode === 'add') ? 'Ajouter un produit' : 'Éditer le produit';
    modal.querySelector('#pe-title-input').value = product?.title || '';
    modal.querySelector('#pe-price-input').value = Number(product?.price || 0);
    modal.querySelector('#pe-category').value = (typeof normalizeCategory === 'function') ? normalizeCategory(product?.category || 'ebooks') : (product?.category || 'ebooks');
    modal.querySelector('#pe-badge').value = product?._db?.badge || '';
    modal.querySelector('#pe-tags').value = Array.isArray(product?._db?.tags) ? product._db.tags.join(', ') : '';
    modal.querySelector('#pe-description').value = product?.description || product?.description_short || '';
    modal.querySelector('#pe-preview-url').value = product?.preview_url || product?._db?.preview_url || '';

    const imgPrev = modal.querySelector('#pe-image-preview');
    imgPrev.innerHTML = product?.image?.url
      ? `<img src="${(typeof escapeAttr === 'function') ? escapeAttr(product.image.url) : product.image.url}" alt="thumbnail" style="width:100%;height:110px;object-fit:cover">`
      : `<span style="opacity:.6">Tsy misy sary</span>`;

    const pvPrev = modal.querySelector('#pe-preview-preview');
    const existingPreview = product?.preview_url || product?._db?.preview_url || '';
    if (existingPreview) {
      if (/\.pdf(\?|#|$)/i.test(existingPreview)) {
        pvPrev.innerHTML = `<div style="opacity:.85"><i class="fa-solid fa-file-pdf"></i> PDF</div>`;
      } else if (/\.(mp4|webm|mkv)(\?|#|$)/i.test(existingPreview)) {
        pvPrev.innerHTML = `<video src="${(typeof escapeAttr === 'function') ? escapeAttr(existingPreview) : existingPreview}" style="max-width:100%;max-height:110px" muted></video>`;
      } else {
        pvPrev.innerHTML = `<div style="opacity:.8">${(typeof escapeHtml === 'function') ? escapeHtml(existingPreview) : existingPreview}</div>`;
      }
    } else {
      pvPrev.innerHTML = `<span style="opacity:.6">Tsy misy vidéo/PDF</span>`;
    }

    modal.querySelector('#pe-pick-image').onclick = async () => {
      const files = await pickFiles({ multiple: false });
      if (files && files[0]) peSetLocalFile('image', files[0]);
    };
    modal.querySelector('#pe-pick-preview').onclick = async () => {
      const files = await pickFiles({ multiple: false });
      if (files && files[0]) peSetLocalFile('preview', files[0]);
    };

    modal.querySelector('#pe-test-preview').onclick = () => {
      const url = modal.querySelector('#pe-preview-url').value.trim();
      if (!url) return alert('Ampidiro URL preview aloha na misafidiana vidéo/PDF.');
      if (typeof openPreview === 'function') {
        openPreview({ title: modal.querySelector('#pe-title-input').value.trim() || 'Preview', preview_url: url });
      }
    };

    modal.querySelector('#pe-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await peSubmitForm();
        peClose();
        await fetchSupabaseProducts();
      } catch (err) {
        console.error('[peSubmitForm]', err);
        alert('Erreur: ' + err.message);
      }
    };

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('#pe-title-input').focus();
  }

  function peClose() {
    const modal = document.getElementById('product-edit-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function peSetLocalFile(kind, file) {
    const modal = ensureProductModal();
    const { kind: detectKind } = detectAssetKind(file);
    if (kind === 'image' && detectKind !== 'image') { return alert('Safidio sary ho an\'ny thumbnail.'); }
    if (kind === 'preview' && !(detectKind === 'video' || detectKind === 'pdf')) { return alert('Safidio vidéo na PDF ho an\'ny preview.'); }

    if (kind === 'image') {
      peLocal.imageFile = file;
      const url = URL.createObjectURL(file);
      modal.querySelector('#pe-image-preview').innerHTML = `<img src="${url}" alt="thumbnail" style="width:100%;height:110px;object-fit:cover">`;
    } else {
      peLocal.previewFile = file;
      const pvBox = modal.querySelector('#pe-preview-preview');
      if (detectKind === 'pdf') {
        pvBox.innerHTML = `<div style="opacity:.85"><i class="fa-solid fa-file-pdf"></i> ${(typeof escapeHtml === 'function') ? escapeHtml(file.name) : file.name}</div>`;
      } else {
        const url = URL.createObjectURL(file);
        pvBox.innerHTML = `<video src="${url}" style="max-width:100%;max-height:110px" muted></video>`;
      }
    }
  }

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
 
  async function peSubmitForm() {
    if (!isOwner()) throw new Error('Owner ihany no afaka manova.');
    const sb = await ensureSupabase();

    const title = document.getElementById('pe-title-input').value.trim();
    const price = Number(document.getElementById('pe-price-input').value || 0);
    const category = (typeof normalizeCategory === 'function') 
      ? normalizeCategory(document.getElementById('pe-category').value || 'ebooks')
      : (document.getElementById('pe-category').value || 'ebooks');
    const badge = document.getElementById('pe-badge').value.trim() || null;
    const tagsRaw = document.getElementById('pe-tags').value.trim();
    const description = document.getElementById('pe-description').value.trim() || null;
    let preview_url = document.getElementById('pe-preview-url').value.trim() || null;

    const uploaded = await peUploadSelectedFiles();
    let thumbnail_url = uploaded.thumbnail_url || null;
    if (!preview_url) preview_url = uploaded.preview_url || null;

    const payload = {
      title, category,
      price, is_free: price === 0,
      preview_url, thumbnail_url,
      badge,
      tags: tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
      description
    };

    if (peLocal.mode === 'add') {
  const { data: inserted, error } = await sb
    .from('products')
    .insert(payload)
    .select()
    .single();
  
  if (error) throw error;
  
  console.log('[peSubmitForm] ✓ Product inserted:', inserted);
  
  // 🔥 TRIGGER SERVER PUSH NOTIFICATION
  try {
    console.log('[peSubmitForm] Sending push notification...');
    
    const notifResponse = await fetch(
      window.SUPABASE_URL + '/functions/v1/send-push',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
          'apikey': window.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          productId: inserted.id,
          productTitle: title,
          productPrice: price
        })
      }
    );
    
    if (notifResponse.ok) {
      const result = await notifResponse.json();
      console.log('[peSubmitForm] ✓ Push notification sent to', result.sent || 0, 'subscribers');
    } else {
      const errorText = await notifResponse.text();
      console.error('[peSubmitForm] ❌ Push notification failed:', errorText);
    }
  } catch (notifErr) {
    console.error('[peSubmitForm] ❌ Notification error:', notifErr);
  }
  
  // 🔥 SHOW LOCAL NOTIFICATION (bonus)
  if (typeof window.notifyNewProduct === 'function') {
    window.notifyNewProduct({
      id: inserted.id,
      title: title,
      price: price
    });
  }
  
  const typeLabel = product_type === 'physical' ? '📦 Produit physique' : '💻 Produit numérique';
alert(`${typeLabel} ajouté avec succès! 🎉\nNotifications envoyées aux abonnés.`);

    } else {
      const { error } = await sb.from('products').update(payload).eq('id', peLocal.recordId);
      if (error) throw error;
      alert('Produit modifié.');
    }
  }

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
  // STORAGE
  // ========================================
  
  function loadQOProducts() {
    try {
      const raw = localStorage.getItem(QO_STORAGE_KEY);
      if (raw) {
        qoProducts = JSON.parse(raw);
        console.log('[QO] Loaded', qoProducts.length, 'products');
      }
    } catch (e) {
      console.error('[QO] Load error:', e);
      qoProducts = [];
    }
  }
  
  function saveQOProducts() {
  try {
    localStorage.setItem(QO_STORAGE_KEY, JSON.stringify(qoProducts));
    updateCounter(); // ✅ NOUVEAU
    console.log('[QO] Saved', qoProducts.length, 'products');
  } catch (e) {
    console.error('[QO] Save error:', e);
  }
}

// ✅ NOUVEAU: Counter update function
function updateCounter() {
  const counter = document.getElementById('qoCounter');
  if (!counter) return;
  
  const count = qoProducts.length;
  const max = 8;
  
  counter.textContent = `${count}/${max}`;
  
  // Update state classes
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
  }// ========================================
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
  exportQO, // ✅ NOUVEAU
  importQO // ✅ NOUVEAU
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
  
  // ========================================
  // DRAG LOGIC (icon + header)
  // ========================================
  
  function dragStart(e) {
    const target = e.target.closest('#cart-icon-collapsed, #cart-drag-handle');
    if (!target) return;
    
    initialX = (e.type === 'touchstart' ? e.touches[0].clientX : e.clientX) - xOffset;
    initialY = (e.type === 'touchstart' ? e.touches[0].clientY : e.clientY) - yOffset;
    
    isDragging = true;
    drawer.style.transition = 'none';
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    
    currentX = (e.type === 'touchmove' ? e.touches[0].clientX : e.clientX) - initialX;
    currentY = (e.type === 'touchmove' ? e.touches[0].clientY : e.clientY) - initialY;
    
    xOffset = currentX;
    yOffset = currentY;
    
    setTranslate(currentX, currentY, drawer);
  }
  
  function dragEnd() {
    if (!isDragging) return;
    
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    
    drawer.style.transition = '';
  }
  
  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }
  
  // Wire events (icon)
  iconCollapsed.addEventListener('mousedown', dragStart);
  iconCollapsed.addEventListener('touchstart', dragStart);
  
  // Wire events (header)
  dragHandle.addEventListener('mousedown', dragStart);
  dragHandle.addEventListener('touchstart', dragStart);
  
  // ✅ PATCH: Dragable ny drawer manontolo (expanded mode)
  drawer.addEventListener('mousedown', function(e) {
    // Tsy drag raha mipoitsika button/input/content
    if (e.target.closest('button, input, a, .cart-list')) return;
    if (drawer.classList.contains('expanded')) {
      dragStart(e);
    }
  });
  
  drawer.addEventListener('touchstart', function(e) {
    if (e.target.closest('button, input, a, .cart-list')) return;
    if (drawer.classList.contains('expanded')) {
      dragStart(e);
    }
  }, { passive: true });
  
  // Global move/end
  document.addEventListener('mousemove', drag);
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchend', dragEnd);
  
  console.log('[Cart Drawer] ✓ Drag + Collapse initialized');
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