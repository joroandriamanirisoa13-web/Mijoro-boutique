
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
  if (!isFinite(n) || n < 0) return '0 AR';
  try { return n.toLocaleString('fr-FR') + ' AR'; }
  catch (_) { return String(n) + ' AR'; }
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
  var price = p && p.price;
  var id = (p && p.id) ? p.id : '';
  var isFree = Number(price) === 0;
  var actionText = isFree ? 'Demande: Obtenir (gratuit)' : (action === 'read' ? 'Demande: Lire' : 'Demande: Acheter');
  var lines = [
    'Salama! ' + actionText,
    '• Produit: ' + title,
    '• Catégorie: ' + cat,
    '• Prix: ' + fmtPrice(price)
  ];
  if (id) lines.push('• ID: ' + id);
  lines.push('Misaotra!');
  return lines.join('\n');
}
function buyOrRead(product) {
  if (!product) return;
  try { if (typeof addToCart === 'function') addToCart(product); } catch (e) { console.warn('[addToCart]', e); }
  var isFree = Number(product.price) === 0;
  openWhatsAppMessage(buildWAProductMessage(product, isFree ? 'read' : 'buy'));
}

/* LIKES (localStorage) */
var LIKE_KEY = 'likes:v1';
var LIKE_COUNT_KEY = 'likeCounts:v1';

function loadLikes() {
  try {
    var likedArr = JSON.parse(localStorage.getItem(LIKE_KEY) || '[]');
    var countsObj = JSON.parse(localStorage.getItem(LIKE_COUNT_KEY) || '{}');
    var likedSet = new Set(Array.isArray(likedArr) ? likedArr : []);
    var countsMap = new Map(Object.entries(countsObj));
    return { liked: likedSet, counts: countsMap };
  } catch (_) {
    return { liked: new Set(), counts: new Map() };
  }
}
function saveLikes(state) {
  try {
    localStorage.setItem(LIKE_KEY, JSON.stringify(Array.from(state.liked)));
    var obj = {};
    state.counts.forEach(function (v, k) { obj[k] = v; });
    localStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(obj));
  } catch (_) { }
}
var likeState = loadLikes();

function getLikeCount(id) {
  var v = Number(likeState.counts.get(id));
  return isFinite(v) ? v : 0;
}
function isLiked(id) { return likeState.liked.has(id); }
function toggleLike(id) {
  if (!id) return;
  var count = getLikeCount(id);
  if (isLiked(id)) {
    likeState.liked.delete(id);
    count = Math.max(0, count - 1);
  } else {
    likeState.liked.add(id);
    count = count + 1;
  }
  likeState.counts.set(id, count);
  saveLikes(likeState);

  try {
    var safeSel = '[data-id="' + window.CSS.escape(id) + '"] .icon-like';
    var nodes = document.querySelectorAll(safeSel);
    for (var i = 0; i < nodes.length; i++) {
      var btn = nodes[i];
      if (!btn || !btn.classList) continue;
      if (isLiked(id)) btn.classList.add('liked'); else btn.classList.remove('liked');
      btn.classList.add('burst');
      (function (b) { setTimeout(function () { b.classList.remove('burst'); }, 480); })(btn);
      var cnt = btn.parentElement ? btn.parentElement.querySelector('.like-count') : null;
      if (cnt) cnt.textContent = String(getLikeCount(id));
    }
  } catch (err) {
    console.error('[toggleLike UI error]', err);
  }
}

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
  if (c === 'vip') return '<i class="fa-solid fa-crown"></i>';
  if (c === 'promo' || c === 'promotion') return '<i class="fa-solid fa-bolt"></i>';
  if (c === 'free' || c === 'gratuit' || c === 'gratuits') return '<i class="fa-solid fa-gift"></i>';
  if (c === 'videos' || c === 'vidéos') return '<i class="fa-solid fa-clapperboard"></i>';
  if (c === 'ebooks') return '<i class="fa-solid fa-book"></i>';
  return '<i class="fa-solid fa-tag"></i>';
}

/* LANG / THEME (apply/select) */
var THEME_KEY = 'settings:theme';
var LANG_KEY = 'settings:lang';

var TRANSLATIONS = {
  fr: {
    "home_title": "Tongasoa eto  amin'ny varotra malagasy!",
    "home_sub": "Découvre des eBooks, vidéos et apps/jeux pour t’aider à réussir en ligne.",
    "filter_all": "Tous",
    "filter_ebooks": "Ebooks",
    "filter_videos": "Vidéos",
    "filter_vip": "VIP",
    "filter_promo": "Promo",
    "filter_free": "Gratuit",
    "shop_no_products": "Aucun produit trouvé.",
    "search_placeholder": "Rechercher...",
    "cart_label": "Cart",
    "cart_total": "Total",
    "param_settings": "Paramètres",
    "param_language": "Langue",
    "param_theme": "Thème",
    "about": "À propos",
    "contact": "Contact",
    "quit": "Quit",
    "read": "Lire"
  },
  en: {
    "home_title": "Welcome to our boutique!",
    "home_sub": "Discover eBooks, videos and apps/games to help you succeed online.",
    "filter_all": "All",
    "filter_ebooks": "Ebooks",
    "filter_videos": "Videos",
    "filter_vip": "VIP",
    "filter_promo": "Promo",
    "filter_free": "Free",
    "shop_no_products": "No products found.",
    "search_placeholder": "Search...",
    "cart_label": "Cart",
    "cart_total": "Total",
    "param_settings": "Settings",
    "param_language": "Language",
    "param_theme": "Theme",
    "about": "About",
    "contact": "Contact",
    "quit": "Quit",
    "read": "Read"
  },
  mg: {
    "home_title": "Tongasoa ato amin'ny boutique!",
    "home_sub": "Jereo ny eBooks, vidéos ary apps/jeux hanampy anao hiroso amin'ny aterineto.",
    "filter_all": "Rehetra",
    "filter_ebooks": "eBooks",
    "filter_videos": "Vidéos",
    "filter_vip": "VIP",
    "filter_promo": "Promo",
    "filter_free": "Maimaim-poana",
    "shop_no_products": "Tsy misy vokatra hita.",
    "search_placeholder": "Mitadiava...",
    "cart_label": "Panier",
    "cart_total": "Total",
    "param_settings": "Paramètres",
    "param_language": "Langue",
    "param_theme": "Thème",
    "about": "À propos",
    "contact": "Contact",
    "quit": "Quit",
    "read": "Vakio"
  }
};

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

/* INJECTION: Boutons thème (rose/jaune/marron) */
document.addEventListener('DOMContentLoaded', function () {
  var wrap = document.getElementById('theme-options');
  if (!wrap) return;
  var needRose = !wrap.querySelector('[data-theme="rose"]');
  var needJaune = !wrap.querySelector('[data-theme="jaune"]');
  var needMarron = !wrap.querySelector('[data-theme="marron"]');
  var html = '';
  if (needRose) {
    html += '' +
      '<button type="button" class="option-card" data-theme="rose">' +
      '  <div class="option-icon" style="background:linear-gradient(135deg,#f472b6,#fb7185)">🌸</div>' +
      '  <div class="option-texts">' +
      '    <div class="option-title">Rose</div>' +
      '    <div class="option-sub">Douce et moderne</div>' +
      '  </div>' +
      '</button>';
  }
  if (needJaune) {
    html += '' +
      '<button type="button" class="option-card" data-theme="jaune">' +
      '  <div class="option-icon" style="background:linear-gradient(135deg,#f59e0b,#fde68a);color:#111">🌞</div>' +
      '  <div class="option-texts">' +
      '    <div class="option-title">Jaune</div>' +
      '    <div class="option-sub">Chaleureux</div>' +
      '  </div>' +
      '</button>';
  }
  if (needMarron) {
    html += '' +
      '<button type="button" class="option-card" data-theme="marron">' +
      '  <div class="option-icon" style="background:linear-gradient(135deg,#8b5e3c,#3a2b24)">🍂</div>' +
      '  <div class="option-texts">' +
      '    <div class="option-title">Marron</div>' +
      '    <div class="option-sub">Classique & cosy</div>' +
      '  </div>' +
      '</button>';
  }
  if (html) wrap.insertAdjacentHTML('beforeend', html);
  var allBtns = wrap.querySelectorAll('.option-card[data-theme]');
  for (var i = 0; i < allBtns.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        selectTheme(btn.getAttribute('data-theme'));
      });
    })(allBtns[i]);
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
      return '' +
        '<div class="card-actions">' +
        '  <button type="button" class="icon-btn icon-info" title="Détails"><i class="fa-solid fa-info"></i></button>' +
           (isFree ? '  <button type="button" class="icon-btn icon-read" data-action="read" title="Lire (gratuit)"><i class="fa-solid fa-book-open-reader"></i></button>' : '') +
        '  <button type="button" class="icon-btn icon-buy" title="' + (isFree ? 'Obtenir (WhatsApp)' : 'Acheter (WhatsApp)') + '">' +
        '    <i class="fa-brands fa-whatsapp"></i>' +
        '  </button>' +
        '  <button type="button" class="icon-btn owner-tool" data-tool="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
        '  <button type="button" class="icon-btn owner-tool" data-tool="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
        '</div>';
    }

    function makeLike(p) {
      var liked = isLiked(p.id);
      var likeCnt = getLikeCount(p.id);
      return '<div style="display:flex; align-items:center; gap:6px;">' +
             '<button type="button" class="icon-like ' + (liked ? 'liked' : '') + '" title="Like" aria-label="Like"><i class="fa-solid fa-heart"></i></button>' +
             '<span class="like-count">' + String(likeCnt) + '</span>' +
             '</div>';
    }

    function makeBadge(p) {
      var cat = normalizeCategory(p.category);
      return '<span class="' + badgeClassFor(cat) + '">' + badgeIconFor(cat) + ' ' + escapeHtml(cat || 'produit') + '</span>';
    }

    function makeCard(p, compact) {
      var imgUrl = escapeAttr((p.image && p.image.url) ? p.image.url : FALLBACK_IMG);
      var imgAlt = escapeAttr((p.image && p.image.alt) ? p.image.alt : (p.title || 'Produit'));
      var priceStr = fmtPrice(p.price);
      var badgeHTML = makeBadge(p);
      var actions = makeActions(p);
      var likeBtn = makeLike(p);
      var titleSafe = escapeHtml(p.title || 'Produit');
      var descShort = escapeHtml(p.description_short || '');

      if (compact) {
        return '<img src="' + imgUrl + '" alt="' + imgAlt + '" loading="lazy" decoding="async">' +
               '<h3>' + titleSafe + '</h3>' +
               '<p class="desc">' + descShort + '</p>' +
               '<div class="meta" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">' +
               '<div class="price">' + priceStr + '</div>' +
               actions +
               '</div>' +
               '<div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">' +
               badgeHTML + likeBtn + '</div>';
      }

      return '<img src="' + imgUrl + '" alt="' + imgAlt + '" loading="lazy" decoding="async">' +
             '<div style="padding:8px 4px; flex:1; display:flex; flex-direction:column; justify-content:space-between">' +
             '<div>' +
             '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px">' +
             '<h3 style="font-size:15px; margin:0">' + titleSafe + '</h3>' + badgeHTML +
             '</div>' +
             '<p class="desc" style="margin-top:6px; font-size:13px; color:#e9e9e9">' + descShort + '</p>' +
             '</div>' +
             '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; gap:8px">' +
             '<div><div class="product-price">' + priceStr + '</div></div>' +
             actions +
             '</div>' +
             '<div style="margin-top:8px; display:flex; justify-content:flex-end;">' + likeBtn + '</div>' +
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
      if (tgt.closest('.icon-like')) { toggleLike?.(id); return; }
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
function updateCartUI() {
  try {
    var totals = cartTotals();
    var count = totals.count;
    var total = totals.total;
    var countEl = document.getElementById('cart-count');
    var totalEl = document.getElementById('cart-total');
    if (countEl) countEl.textContent = String(count);
    if (totalEl) totalEl.textContent = fmtPrice(total);

    var drawer = document.getElementById('cart-list');
    var totalDrawer = document.getElementById('cart-total-drawer');
    if (drawer && totalDrawer) {
      drawer.innerHTML = '';
      if (cartItems.size === 0) {
        drawer.innerHTML = '<div class="cart-empty">Panier vide.</div>';
      } else {
        var frag = document.createDocumentFragment();
        cartItems.forEach(function (it, id) {
          var div = document.createElement('div');
          div.className = 'cart-item';
          div.setAttribute('data-id', id);
          var imgUrl = escapeAttr(it.image || 'https://via.placeholder.com/56?text=~');
          var imgAlt = escapeAttr(it.title || 'Produit');
          div.innerHTML = '' +
            '<img src="' + imgUrl + '" alt="' + imgAlt + '">' +
            '<div>' +
            '  <h4>' + escapeHtml(it.title || 'Produit') + '</h4>' +
            '  <div class="qty">' +
            '    <button type="button" data-action="dec" aria-label="Moins"><i class="fa-solid fa-minus"></i></button>' +
            '    <span>' + String(it.qty) + '</span>' +
            '    <button type="button" data-action="inc" aria-label="Plus"><i class="fa-solid fa-plus"></i></button>' +
            '  </div>' +
            '</div>' +
            '<div style="display:flex; flex-direction:column; align-items:end; gap:6px;">' +
            '  <div>' + fmtPrice((Number(it.price) || 0) * it.qty) + '</div>' +
            '  <button type="button" data-action="remove" title="Supprimer" class="icon-btn"><i class="fa-solid fa-xmark"></i></button>' +
            '</div>';
          frag.appendChild(div);
        });
        drawer.appendChild(frag);
      }
      totalDrawer.textContent = fmtPrice(total);
    }
    saveCartToStorage(cartMapToArray());
  } catch (err) {
    console.error('[updateCartUI error]', err);
  }
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
document.addEventListener('DOMContentLoaded', function () {
  try {
    var initial = loadCartFromStorage();
    cartArrayToMap(initial);
    updateCartUI();
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
    var lines = ['Salama! Commande avy amin’ny Mijoro Boutique:', ''];
    var total = 0;
    cartItems.forEach(function (item) {
      total += (Number(item.price) || 0) * item.qty;
      lines.push('• ' + item.title + ' x' + item.qty + ' — ' + fmtPrice((Number(item.price) || 0) * item.qty));
    });
    lines.push('', 'Total: ' + fmtPrice(total), 'Misaotra!');
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

/* Navigation sections (Home/Shop) — simplified */
var SECTION_IDS = ['home', 'shop'];
function showSection(id, btn) {
  try {
    if (SECTION_IDS.indexOf(id) === -1) return;
    SECTION_IDS.forEach(function (secId) {
      var el = document.getElementById(secId);
      if (!el) return;
      var active = (secId === id);
      el.classList.toggle('active', active);
      el.setAttribute('aria-hidden', String(!active));
    });
    document.querySelectorAll('.bottom-menu .menu-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn && btn.classList) btn.classList.add('active');
    document.body.classList.toggle('shop-active', id === 'shop');
    var activeSec = document.getElementById(id);
    if (activeSec && activeSec.scrollIntoView && id !== 'home') {
      activeSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (typeof closeParamFixed === 'function') closeParamFixed();
    var popup = document.getElementById('shop-popup');
    if (popup) {
      popup.classList.remove('show');
      popup.setAttribute('aria-hidden', 'true');
      popup.style.pointerEvents = 'none';
    }
    __ensureBottomMenuClickable();
  } catch (err) {
    console.error('[showSection error]', err);
  }
}

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

    var url = null;
    if (p && p._db && p._db.preview_url) url = p._db.preview_url;
    else if (p && p.preview_url) url = p.preview_url;

    title.textContent = (p && p.title) ? p.title + ' — Preview' : 'Preview';

    if (!url) {
      content.innerHTML = '<p style="color:#ddd">Tsy misy Preview URL ho an\'ity produit ity.</p>';
    } else if (/\.pdf(\?|#|$)/i.test(url)) {
      content.innerHTML = '<embed type="application/pdf" src="' + escapeAttr(url) + '#toolbar=1&navpanes=0&statusbar=0" style="width:100%; height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)">';
    } else if (/\.(mp4|webm|mkv)(\?|#|$)/i.test(url)) {
      content.innerHTML = '<video controls src="' + escapeAttr(url) + '" style="width:100%; height:auto; max-height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)"></video>';
    } else if (/\.m3u8(\?|#|$)/i.test(url)) {
      // HLS support with hls.js
      var vidId = 'hls-player-' + Date.now();
      content.innerHTML = '<video id="'+vidId+'" controls style="width:100%; height:auto; max-height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)"></video>';
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
      script.onload = function(){
        var video = document.getElementById(vidId);
        if (window.Hls && window.Hls.isSupported()) {
          var hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
        } else {
          video.replaceWith(Object.assign(document.createElement('iframe'), {
            src: escapeAttr(url),
            style: 'width:100%; height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)'
          }));
        }
      };
      document.body.appendChild(script);
    } else {
      // generic URL -> iframe
      content.innerHTML = '<iframe src="' + escapeAttr(url) + '" allow="autoplay; fullscreen" style="width:100%; height:70vh; border-radius:10px; border:1px solid rgba(255,255,255,.12)"></iframe>';
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    var closeBtn = modal.querySelector('.info-actions .param-btn');
    if (closeBtn && closeBtn.focus) closeBtn.focus({ preventScroll: true });
    // PATCH: add close handler ho an'ny info-modal preview
var closeBtn = modal.querySelector('.info-actions .param-btn');
if (closeBtn && !closeBtn._bound) {
  closeBtn.addEventListener('click', function() {
    try {
      // Atsahatra aloha ny video raha misy
      var vids = modal.querySelectorAll('video');
      vids.forEach(function(v){ if (!v.paused) v.pause(); v.src = ''; });

      // Esorina koa ny embed sy iframe raha mila manadio mémoire
      modal.querySelectorAll('embed, iframe').forEach(function(el){
        el.remove();
      });

      // Fenoy fotsy indray ny content
      content.innerHTML = '';

      // Akatona tanteraka ny modal
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    } catch (err2) {
      console.error('[close preview error]', err2);
    }
  });
  closeBtn._bound = true;
}
  } catch (err) {
    console.error('[openPreview error]', err);
  }
}
   /*PART 4/4 — SUPABASE AUTH + OWNER CRUD + DB
   ========================================= */

(function () {
  // CONFIG: soloina raha ilaina
  const SUPABASE_URL = "https://zogohkfzplcuonkkfoov.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw";
  const OWNER_EMAIL = "joroandriamanirisoa13@gmail.com";

  let supabase = null;
  let authState = { user: null };
  let authSub = null;

  /* ---------- Utils ---------- */
  function isOwner() {
    return !!authState.user && String(authState.user.email || '').toLowerCase() === OWNER_EMAIL.toLowerCase();
  }
  window.isOwner = isOwner;

  function applyAuthUI() {
    try {
      const addBtn = document.getElementById('btnAddProduct');
      const loginBtn = document.getElementById('btnLogin');
      const logoutBtn = document.getElementById('btnLogout');

      if (addBtn) addBtn.disabled = !isOwner();
      if (loginBtn) loginBtn.style.display = authState.user ? 'none' : '';
      if (logoutBtn) logoutBtn.style.display = authState.user ? '' : 'none';

      const show = isOwner();
      document.querySelectorAll('.owner-tool').forEach(el => {
        el.style.display = show ? '' : 'none';
      });
    } catch (e) { console.error('[applyAuthUI]', e); }
  }
  window.applyAuthUI = applyAuthUI;

  async function ensureSupabase() {
    if (supabase) return supabase;
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
          <small style="opacity:.8">Midira amin’ny email/password (tsy OTP).</small>
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

      if (authSub && typeof authSub.subscription?.unsubscribe === 'function') {
        authSub.subscription.unsubscribe();
      }
      authSub = sb.auth.onAuthStateChange((_event, session2) => {
        authState.user = session2?.user || null;
        applyAuthUI();
        fetchSupabaseProducts().catch(console.error);
      });
    } catch (e) { console.error('[initAuth]', e); }
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
      image: { url: r.thumbnail_url || r.preview_url || (typeof FALLBACK_IMG !== 'undefined' ? FALLBACK_IMG : ''), alt: r.title || 'Produit' },
      price: r.is_free ? 0 : (Number(r.price) || 0),
      currency: "AR",
      stock: "available",
      description_short: r.badge ? (r.badge + (Array.isArray(r.tags) && r.tags.length ? ' — ' + r.tags.join(', ') : '')) : '',
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
      const f = toolbarBtn ? (toolbarBtn.getAttribute('data-filter') || 'all') : 'all';
      const sEl = document.getElementById('search');
      const sVal = sEl ? (sEl.value || '') : '';
      renderProducts(f, sVal);
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

            <div class="pe-uploader" data-kind="preview" style="border:1px dashed #2a2d38;border-radius:12px;padding:10px;min-height:160px;display:flex;gap:10px">
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

          <div style="display:flex;gap:8px;align-items:center">
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
    modal.querySelector('#pe-category').value = normalizeCategory(product?.category || 'ebooks');
    modal.querySelector('#pe-badge').value = product?._db?.badge || '';
    modal.querySelector('#pe-tags').value = Array.isArray(product?._db?.tags) ? product._db.tags.join(', ') : '';
    modal.querySelector('#pe-description').value = product?.description || product?.description_short || '';
    modal.querySelector('#pe-preview-url').value = product?.preview_url || product?._db?.preview_url || '';

    const imgPrev = modal.querySelector('#pe-image-preview');
    imgPrev.innerHTML = product?.image?.url
      ? `<img src="${escapeAttr(product.image.url)}" alt="thumbnail" style="width:100%;height:110px;object-fit:cover">`
      : `<span style="opacity:.6">Tsy misy sary</span>`;

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
      openPreview({ title: modal.querySelector('#pe-title-input').value.trim() || 'Preview', preview_url: url });
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
    if (kind === 'image' && detectKind !== 'image') { return alert('Safidio sary ho an’ny thumbnail.'); }
    if (kind === 'preview' && !(detectKind === 'video' || detectKind === 'pdf')) { return alert('Safidio vidéo na PDF ho an’ny preview.'); }

    if (kind === 'image') {
      peLocal.imageFile = file;
      const url = URL.createObjectURL(file);
      modal.querySelector('#pe-image-preview').innerHTML = `<img src="${url}" alt="thumbnail" style="width:100%;height:110px;object-fit:cover">`;
    } else {
      peLocal.previewFile = file;
      const pvBox = modal.querySelector('#pe-preview-preview');
      if (detectKind === 'pdf') {
        pvBox.innerHTML = `<div style="opacity:.85"><i class="fa-solid fa-file-pdf"></i> ${escapeHtml(file.name)}</div>`;
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
    const category = normalizeCategory(document.getElementById('pe-category').value || 'ebooks');
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
      const { error } = await sb.from('products').insert(payload);
      if (error) throw error;
      alert('Produit ajouté.');
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
})();


// Utilities
// =====================================================
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $all(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }
function debounce(fn, wait = 200) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// =====================================================
// showSection fallback (raha mbola tsy voafaritra amin'ny script-nao)
// Havaozy/Esory ity raha efa manana showSection ianao.
// =====================================================
if (typeof window.showSection !== 'function') {
  window.showSection = function(id, btn) {
    const sections = ['home', 'shop', 'param']; // raha hafa ny id-n'ilay "Paramètre", ovao eto
    sections.forEach(s => {
      const el = document.getElementById(s);
      if (el) {
        el.classList.toggle('active', s === id);
        el.setAttribute('aria-hidden', s === id ? 'false' : 'true');
      }
    });
    const bottomMenu = $('.bottom-menu');
    if (bottomMenu) {
      $all('.menu-btn', bottomMenu).forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }
  };
}

// =====================================================
// Search input + Filters -> renderProducts(category, term)
// (mifanaraka amin'ny JS snippet nomenao)
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Search
    const search = document.getElementById('search');
    const filters = document.getElementById('filters');
    const getActiveCategory = () => {
      const activeBtn = filters ? filters.querySelector('.filter-btn.active') : null;
      return activeBtn?.getAttribute('data-category') || 'all';
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

        curr?.classList.remove('active');
        btn.classList.add('active');

        const term = search?.value || '';
        const cat = btn.getAttribute('data-category') || 'all';
        if (typeof renderProducts === 'function') {
          renderProducts(cat, term);
        }
      });
    }
  } catch(err) {
    console.error('[Search/Filters error]', err);
  }
});


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
    // Ampiasao rect.height ho stable kokoa
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
    // (ilaina mba ho avy amin'ny toerana marina ny animation)
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

    // Mifehy range: 0 .. targetHidden (tsy manao rubber band amin'ity version stable ity)
    let next = Math.max(0, Math.min(targetHidden, startTranslate + dy));
    // Ampidiro inline transform mivantana
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
    e.preventDefault?.(); // Tazomy amin'ny drag vertical
    onMove(t.clientY);
  }, { passive: false });

  menu.addEventListener('touchend', (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    onEnd(t.clientY);
  }, { passive: true });

  // Drag avy amin'ny edge rehefa miafina (miakatra hanokatra)
  edge.addEventListener('touchstart', (e) => {
    if (!menu.classList.contains('is-hidden')) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    // Apetraho amin'ny toerana miafina marina aloha ny inline transform (ho smooth)
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

(function(){
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  const btnAdd = document.getElementById('btnAddProduct');

  function setOwnerUI(logged) {
    if (!btnLogin || !btnLogout || !btnAdd) return;
    btnLogin.style.display  = logged ? 'none' : '';
    btnLogout.style.display = logged ? '' : 'none';
    btnAdd.style.display    = logged ? '' : 'none';
  }

  // Raha manana persisted state:
  let ownerLogged = false; // alao amin'ny storage raha ilaina
  setOwnerUI(ownerLogged);

  btnLogin?.addEventListener('click', () => {
    // Ataovy eto ny vrai login (modal, oauth, etc.)
    ownerLogged = true;
    setOwnerUI(ownerLogged);
  });

  btnLogout?.addEventListener('click', () => {
    ownerLogged = false;
    setOwnerUI(ownerLogged);
  });
})();

  
(() => {
  if (window.__shopToolsInit) return; // guard hisorohana double init
  window.__shopToolsInit = true;

  const init = () => {
    const shopEl   = document.getElementById('shop');
    const toggleEl = document.getElementById('shopToolsToggle');
    const toolsEl  = document.getElementById('shop-tools');

    if (!shopEl || !toggleEl || !toolsEl) {
      console.warn('[ShopTools] missing elements:', { shopEl, toggleEl, toolsEl });
      return;
    }

    // Ataovy clickable tsara ilay bouton (indrindra amin'ny mobile)
    toggleEl.style.pointerEvents = 'auto';

    // Etat initial: miafina
    let open = false;
    apply(open);

    // Toggle amin'ny click
    toggleEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      open = !open;
      apply(open);
    }, { passive: true });

    // Recompute maxHeight rehefa resize/orientation
    window.addEventListener('resize', () => {
      if (open) toolsEl.style.maxHeight = toolsEl.scrollHeight + 'px';
    });

    function apply(isOpen) {
      // Class CSS (raha manana règle #shop.tools-open #shop-tools ianao)
      shopEl.classList.toggle('tools-open', isOpen);
      toggleEl.setAttribute('aria-expanded', String(isOpen));

      // Inline style fallback (miasa na dia tsy misy règle CSS aza)
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


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY) // na service_role raha backend

async function uploadProduct({ title, file }) {
  if (!file) throw new Error('File required')

  // Fantaro ny mime sy extension
  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')
  const isVideo = file.type.startsWith('video/') ||
    /\.(mp4|mov|avi|mkv)$/i.test(file.name || '')

  if (!isPdf && !isVideo) {
    throw new Error(`File type not supported: ${file.type || file.name}`)
  }

  // Bucket sy path
  const bucket = 'products' // soloina amin'ny anaran'ny bucket-nao
  const folder = isPdf ? 'docs' : 'videos'
  const ext = isPdf ? '.pdf' : (file.name?.split('.').pop() ? '.' + file.name.split('.').pop() : '')
  const fileName = `${crypto.randomUUID()}${ext || (isPdf ? '.pdf' : '')}`
  const filePath = `${folder}/${fileName}`

  // Upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: isPdf ? 'application/pdf' : (file.type || 'application/octet-stream'),
      upsert: false
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw uploadError
  }

  // Get public URL (raha public bucket) na signed URL raha private
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(uploadData.path)
  const fileUrl = pub?.publicUrl

  // Insert produit ao amin'ny table
  const payload = {
    title,
    file_path: uploadData.path,
    file_url: fileUrl,          // raha ilaina
    file_mime: isPdf ? 'application/pdf' : file.type,
    file_type: isPdf ? 'pdf' : 'video'
  }

  const { data: product, error: insertError } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single()

  if (insertError) {
    console.error('DB insert error:', insertError)
    // Raha mila: delete ilay file raha tsy tafiditra ny DB
    await supabase.storage.from(bucket).remove([uploadData.path])
    throw insertError
  }

  return product
}
