/* ================================
   SAFETY / DEBUG / POLYFILLS
   ================================ */
(function safetyInit(){
  // Polyfill: CSS.escape (protection navigateur sans support)
  if (!window.CSS || typeof window.CSS.escape !== 'function') {
    window.CSS = window.CSS || {};
    window.CSS.escape = function (value) {
      return String(value).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
    };
  }

  // Logs errors (compat)
  window.addEventListener('error', function(e){
    console.error('[App Error]', e && e.message, e && e.filename, e && e.lineno, e && e.colno, e && e.error);
  });
  window.addEventListener('unhandledrejection', function(e){
    console.error('[Unhandled Promise]', e && e.reason);
  });

  // Kill-switch Loader: esory foana na dia misy crash aza
  (function safeHideLoader(){
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
      document.addEventListener('DOMContentLoaded', function(){ setTimeout(hide, 500); });
      window.addEventListener('load', hide, { once: true });
      setTimeout(hide, 3000); // killswitch
    }
  })();

  // Fallback: ataovy active ny home raha sendra very
  document.addEventListener('DOMContentLoaded', function(){
    var home = document.getElementById('home');
    if (home && !home.classList.contains('active')) {
      home.classList.add('active');
      home.setAttribute('aria-hidden', 'false');
    }
  });

  // Stub: raha antsoina nefa tsy mbola voadefina (hisorohana crash)
  if (typeof window.closeShop !== 'function') window.closeShop = function(){};
})();

/* ================================
   CONSTANTES + HELPERS
   ================================ */
var WHATSAPP_PHONE_INTL = '261333106055'; // 0333106055 => MG +261

function escapeHtml(s){
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(m){
    var map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'};
    return map[m] || m;
  });
}
function escapeAttr(s){
  return escapeHtml(s).replace(/"/g,'&quot;');
}
function fmtPrice(p){
  var n = Number(p);
  if (!isFinite(n) || n < 0) return '0 AR';
  try { return n.toLocaleString('fr-FR') + ' AR'; }
  catch(_){ return String(n) + ' AR'; }
}
function normalizeCategory(c){
  if(!c) return '';
  c = String(c).toLowerCase();
  if(['app','apps','jeu','jeux','game','games'].indexOf(c) !== -1) return 'apps';
  if(['ebook','ebooks','book','livre','livres'].indexOf(c) !== -1) return 'ebooks';
  if(['video','vidéo','videos','vidéos'].indexOf(c) !== -1) return 'videos';
  if(['promotion','promo'].indexOf(c) !== -1) return 'promo';
  if(['gratuit','gratuits','free'].indexOf(c) !== -1) return 'free';
  return c;
}

/* ================================
   WHATSAPP HELPERS
   ================================ */
function openWhatsAppMessage(text){
  try {
    var msg = encodeURIComponent(text || '');
    var wa = 'https://wa.me/' + WHATSAPP_PHONE_INTL + '?text=' + msg;
    window.open(wa, '_blank', 'noopener');
  } catch (err) {
    console.error('[WA Open Error]', err);
  }
}
function buildWAProductMessage(p, action){
  action = action || 'buy';
  var title = (p && p.title) ? p.title : '';
  var cat   = (p && p.category) ? p.category : '';
  var price = p && p.price;
  var id    = (p && p.id) ? p.id : '';
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
function buyOrRead(product){
  if(!product) return;
  try { if (typeof addToCart === 'function') addToCart(product); } catch (e) { console.warn('[addToCart]', e); }
  var isFree = Number(product.price) === 0;
  openWhatsAppMessage(buildWAProductMessage(product, isFree ? 'read' : 'buy'));
}

   LIKES (localStorage)
   ================================ */
var LIKE_KEY = 'likes:v1';
var LIKE_COUNT_KEY = 'likeCounts:v1';

function loadLikes(){
  try {
    var likedArr = JSON.parse(localStorage.getItem(LIKE_KEY) || '[]');
    var countsObj = JSON.parse(localStorage.getItem(LIKE_COUNT_KEY) || '{}');
    var likedSet = new Set(Array.isArray(likedArr) ? likedArr : []);
    var countsMap = new Map(Object.entries(countsObj));
    return { liked: likedSet, counts: countsMap };
  } catch (_){
    return { liked: new Set(), counts: new Map() };
  }
}
function saveLikes(state){
  try {
    localStorage.setItem(LIKE_KEY, JSON.stringify(Array.from(state.liked)));
    var obj = {};
    state.counts.forEach(function(v,k){ obj[k]=v; });
    localStorage.setItem(LIKE_COUNT_KEY, JSON.stringify(obj));
  } catch (_){}
}
var likeState = loadLikes();

function getLikeCount(id){
  var v = Number(likeState.counts.get(id));
  return isFinite(v) ? v : 0;
}
function isLiked(id){ return likeState.liked.has(id); }
function toggleLike(id){
  if(!id) return;
  var count = getLikeCount(id);
  if(isLiked(id)){
    likeState.liked.delete(id);
    count = Math.max(0, count - 1);
  } else {
    likeState.liked.add(id);
    count = count + 1;
  }
  likeState.counts.set(id, count);
  saveLikes(likeState);

  // Update UI
  try {
    var safeSel = '[data-id="' + window.CSS.escape(id) + '"] .icon-like';
    var nodes = document.querySelectorAll(safeSel);
    for (var i=0;i<nodes.length;i++){
      var btn = nodes[i];
      if (!btn || !btn.classList) continue;
      if (isLiked(id)) btn.classList.add('liked'); else btn.classList.remove('liked');
      btn.classList.add('burst');
      (function(b){ setTimeout(function(){ b.classList.remove('burst'); }, 480); })(btn);
      var cnt = btn.parentElement ? btn.parentElement.querySelector('.like-count') : null;
      if (cnt) cnt.textContent = String(getLikeCount(id));
    }
  } catch (err){
    console.error('[toggleLike UI error]', err);
  }
}

/* ================================
   BADGES helpers
   ================================ */
function badgeClassFor(cat){
  var c = (cat || '').toLowerCase();
  if (c === 'vip') return 'badge badge-vip';
  if (c === 'promo' || c === 'promotion') return 'badge badge-promo';
  if (c === 'free' || c === 'gratuit' || c === 'gratuits') return 'badge badge-free';
  if (c === 'videos' || c === 'vidéos') return 'badge badge-videos';
  if (c === 'ebooks') return 'badge badge-ebooks';
  return 'badge';
}
function badgeIconFor(cat){
  var c = (cat || '').toLowerCase();
  if (c === 'vip') return '<i class="fa-solid fa-crown"></i>';
  if (c === 'promo' || c === 'promotion') return '<i class="fa-solid fa-bolt"></i>';
  if (c === 'free' || c === 'gratuit' || c === 'gratuits') return '<i class="fa-solid fa-gift"></i>';
  if (c === 'videos' || c === 'vidéos') return '<i class="fa-solid fa-clapperboard"></i>';
  if (c === 'ebooks') return '<i class="fa-solid fa-book"></i>';
  return '<i class="fa-solid fa-tag"></i>';
}

/* ================================
   LANG / THEME (apply/select)
   ================================ */
var THEME_KEY = 'settings:theme';
var LANG_KEY  = 'settings:lang';

function applyTheme(theme){
  try {
    var allowed = ['dark','light','rose','jaune','marron'];
    var t = (allowed.indexOf(theme) !== -1) ? theme : 'dark';

    // Dataset + body class
    document.documentElement.setAttribute('data-theme', t);

    var cls = ['theme-dark','theme-light','theme-rose','theme-jaune','theme-marron'];
    for (var i=0;i<cls.length;i++){ document.body.classList.remove(cls[i]); }
    document.body.classList.add('theme-' + t);

    // UI active state (option-card)
    var btns = document.querySelectorAll('#theme-options .option-card');
    for (var j=0;j<btns.length;j++){
      var b = btns[j];
      var val = b.getAttribute('data-theme');
      b.classList.toggle('active', val === t);
    }
  } catch (err) {
    console.error('[applyTheme error]', err);
  }
}
function selectTheme(theme){
  try {
    var allowed = ['dark','light','rose','jaune','marron'];
    var t = (allowed.indexOf(theme) !== -1) ? theme : 'dark';
    try { localStorage.setItem(THEME_KEY, t); } catch(_){}
    applyTheme(t);
  } catch (err) {
    console.error('[selectTheme error]', err);
  }
}

function applyLang(lang){
  try {
    var l = (['mg','fr','en'].indexOf(lang) !== -1) ? lang : 'fr';
    document.documentElement.lang = l;

    var btns = document.querySelectorAll('#lang-options .option-card');
    for (var i=0;i<btns.length;i++){
      var b = btns[i];
      var val = b.getAttribute('data-lang');
      b.classList.toggle('active', val === l);
    }
  } catch (err) {
    console.error('[applyLang error]', err);
  }
}
function selectLang(lang){
  try {
    var l = (['mg','fr','en'].indexOf(lang) !== -1) ? lang : 'fr';
    try { localStorage.setItem(LANG_KEY, l); } catch(_){}
    applyLang(l);
  } catch (err) {
    console.error('[selectLang error]', err);
  }
}

// Init settings on load (theme + lang)
document.addEventListener('DOMContentLoaded', function(){
  try {
    var theme = 'dark';
    try { var t = localStorage.getItem(THEME_KEY); if (t) theme = t; } catch(_){}
    applyTheme(theme);

    var lang = 'fr';
    try { var l = localStorage.getItem(LANG_KEY); if (l) lang = l; } catch(_){}
    applyLang(lang);
  } catch (err) {
    console.error('[settings init error]', err);
  }
});

/* ================================
   INJECTION: Boutons thème (rose/jaune/marron) tsy manova index.html
   ================================ */
document.addEventListener('DOMContentLoaded', function(){
  var wrap = document.getElementById('theme-options');
  if (!wrap) return;

  var needRose   = !wrap.querySelector('[data-theme="rose"]');
  var needJaune  = !wrap.querySelector('[data-theme="jaune"]');
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

  // Bind all theme buttons (including existing dark/light)
  var allBtns = wrap.querySelectorAll('.option-card[data-theme]');
  for (var i=0;i<allBtns.length;i++){
    (function(btn){
      btn.addEventListener('click', function(){
        selectTheme(btn.getAttribute('data-theme'));
      });
    })(allBtns[i]);
  }
});
   Données Produits (fallback raha tsy misy window.products)
   ================================ */
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

/* ================================
   Renderer principal (vertical cards)
   ================================ */
function renderProducts(filter, search) {
  try {
    var row = document.getElementById('products-row');
    var box = document.getElementById('products-box'); // popup grid

    var normalizedFilter = normalizeCategory(filter || 'all');
    var q = (search || '').toLowerCase();

    var filtered = (products || []).filter(function(prod){
      var cat = normalizeCategory(prod.category);
      var catOk = (normalizedFilter === 'all') || (cat === normalizedFilter);
      var t1 = prod.title || '';
      var t2 = prod.description_short || '';
      var t3 = prod.description || '';
      var text = (t1 + ' ' + t2 + ' ' + t3).toLowerCase();
      var searchOk = !q || text.indexOf(q) !== -1;
      return catOk && searchOk;
    });

    function makeActions(p){
      var isFree = Number(p.price) === 0;
      return '' +
        '<div class="card-actions">' +
        '  <button type="button" class="icon-btn icon-info" title="Détails"><i class="fa-solid fa-info"></i></button>' +
        '  <button type="button" class="icon-btn icon-buy" title="' + (isFree ? 'Obtenir (WhatsApp)' : 'Acheter (WhatsApp)') + '">' +
        '    <i class="fa-brands fa-whatsapp"></i>' +
        '  </button>' +
        '</div>';
    }

    function makeLike(p){
      var liked = isLiked(p.id);
      var likeCnt = getLikeCount(p.id);
      return '' +
        '<div style="display:flex; align-items:center; gap:6px;">' +
        '  <button type="button" class="icon-like ' + (liked ? 'liked' : '') + '" title="Like" aria-label="Like"><i class="fa-solid fa-heart"></i></button>' +
        '  <span class="like-count">' + String(likeCnt) + '</span>' +
        '</div>';
    }

    function makeBadge(p){
      var cat = normalizeCategory(p.category);
      return '<span class="' + badgeClassFor(cat) + '">' + badgeIconFor(cat) + ' ' + escapeHtml(cat || 'produit') + '</span>';
    }

    function makeCard(p, compact){
      var imgUrl = escapeAttr((p.image && p.image.url) ? p.image.url : FALLBACK_IMG);
      var imgAlt = escapeAttr((p.image && p.image.alt) ? p.image.alt : (p.title || 'Produit'));
      var priceStr = fmtPrice(p.price);
      var badgeHTML = makeBadge(p);
      var actions = makeActions(p);
      var likeBtn = makeLike(p);
      var titleSafe = escapeHtml(p.title || 'Produit');
      var descShort = escapeHtml(p.description_short || '');

      if (compact) {
        return '' +
          '<img src="' + imgUrl + '" alt="' + imgAlt + '" loading="lazy" decoding="async">' +
          '<h3>' + titleSafe + '</h3>' +
          '<p class="desc">' + descShort + '</p>' +
          '<div class="meta" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">' +
          '  <div class="price">' + priceStr + '</div>' +
               actions +
          '</div>' +
          '<div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">' +
               badgeHTML +
               likeBtn +
          '</div>';
      }

      return '' +
        '<img src="' + imgUrl + '" alt="' + imgAlt + '" loading="lazy" decoding="async">' +
        '<div style="padding:8px 4px; flex:1; display:flex; flex-direction:column; justify-content:space-between">' +
        '  <div>' +
        '    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px">' +
        '      <h3 style="font-size:15px; margin:0">' + titleSafe + '</h3>' +
               badgeHTML +
        '    </div>' +
        '    <p class="desc" style="margin-top:6px; font-size:13px; color:#e9e9e9">' + descShort + '</p>' +
        '  </div>' +
        '  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; gap:8px">' +
        '    <div><div class="product-price">' + priceStr + '</div></div>' +
             actions +
        '  </div>' +
        '  <div style="margin-top:8px; display:flex; justify-content:flex-end;">' +
             likeBtn +
        '  </div>' +
        '</div>';
    }

    // Vertical list (section principale)
    if (row) {
      row.innerHTML = '';
      if (filtered.length === 0) {
        row.innerHTML = '<div style="color:#ddd;padding:12px">Aucun produit trouvé.</div>';
      } else {
        var frag = document.createDocumentFragment();
        for (var i=0;i<filtered.length;i++){
          var p = filtered[i];
          var card = document.createElement('article');
          card.className = 'product-card';
          card.setAttribute('data-id', p.id);
          card.setAttribute('data-category', normalizeCategory(p.category || ''));
          card.setAttribute('role', 'listitem');
          card.innerHTML = makeCard(p, false);
          frag.appendChild(card);
        }
        row.appendChild(frag);
      }
    }

    // Popup grid
    if (box) {
      box.innerHTML = '';
      if (filtered.length === 0) {
        box.innerHTML = '<div style="color:#ddd;padding:12px">Aucun produit trouvé.</div>';
      } else {
        var grid = document.createElement('div');
        grid.className = 'products-grid';
        var frag2 = document.createDocumentFragment();
        for (var j=0;j<filtered.length;j++){
          var pp = filtered[j];
          var node = document.createElement('div');
          node.className = 'product-card';
          node.setAttribute('data-id', pp.id);
          node.setAttribute('data-category', normalizeCategory(pp.category || ''));
          node.innerHTML = makeCard(pp, true);
          frag2.appendChild(node);
        }
        grid.appendChild(frag2);
        box.appendChild(grid);
      }
    }

    bindProductActions();
  } catch (err) {
    console.error('[renderProducts error]', err);
  }
}

/* ================================
   Bind events ho an'ny cards (click actions)
   ================================ */
function bindProductActions(){
  try {
    function handler(root){
      root.addEventListener('click', function(e){
        var tgt = e.target;
        var card = tgt && tgt.closest ? tgt.closest('.product-card') : null;
        if(!card) return;
        var id = card.getAttribute('data-id');
        var p = null;
        for (var i=0;i<(products||[]).length;i++){ if (products[i].id === id){ p = products[i]; break; } }

        var isInfo = tgt.closest ? tgt.closest('.icon-info') : null;
        var isBuy  = tgt.closest ? tgt.closest('.icon-buy')  : null;
        var isLike = tgt.closest ? tgt.closest('.icon-like') : null;

        if (isInfo){ if (p && typeof showProduct === 'function') showProduct(id); return; }
        if (isBuy){ if (p) buyOrRead(p); return; }
        if (isLike){ if (id) toggleLike(id); return; }
      });
    }

    var row = document.getElementById('products-row');
    if (row && !row._bound) { handler(row); row._bound = true; }

    var box = document.getElementById('products-box');
    if (box && !box._bound) { handler(box); box._bound = true; }
  } catch (err) {
    console.error('[bindProductActions error]', err);
  }
}

/* ================================
   Bindings Filtres + Recherche (toolbar sy popup)
   ================================ */
document.addEventListener('DOMContentLoaded', function(){
  try {
    // Initial render
    renderProducts('all', '');

    // Filters (section toolbar)
    var toolbar = document.getElementById('shop-filters');
    if (toolbar) {
      toolbar.addEventListener('click', function(e){
        var btn = e.target && e.target.closest ? e.target.closest('.filter-btn') : null;
        if (!btn) return;
        var all = toolbar.querySelectorAll('.filter-btn');
        for (var i=0;i<all.length;i++){ all[i].classList.toggle('active', all[i] === btn); }
        var f = btn.getAttribute('data-filter') || 'all';
        var sEl = document.getElementById('search');
        var sVal = sEl ? (sEl.value || '') : '';
        renderProducts(f, sVal);
      });
    }

    // Search (popup)
    var search = document.getElementById('search');
    if (search) {
      var t = null;
      search.addEventListener('input', function(){
        if (t) clearTimeout(t);
        t = setTimeout(function(){
          var activePopupBtn = document.querySelector('#filters .filter-btn.active');
          var f = 'all';
          if (activePopupBtn && activePopupBtn.getAttribute) {
            f = activePopupBtn.getAttribute('data-category') || 'all';
          }
          renderProducts(f, search.value || '');
        }, 200);
      });
    }

    // Popup filters
    var popupFilters = document.getElementById('filters');
    if (popupFilters) {
      popupFilters.addEventListener('click', function(e){
        var btn = e.target && e.target.closest ? e.target.closest('.filter-btn') : null;
        if (!btn) return;
        var all = popupFilters.querySelectorAll('.filter-btn');
        for (var i=0;i<all.length;i++){ all[i].classList.toggle('active', all[i] === btn); }
        var f = btn.getAttribute('data-category') || 'all';
        var sEl2 = document.getElementById('search');
        var sVal2 = sEl2 ? (sEl2.value || '') : '';
        renderProducts(f, sVal2);
      });
    }
  } catch (err) {
    console.error('[Filters/Search init error]', err);
  }
});
   PANIER (persistant) + Drawer + Checkout WhatsApp
   ================================ */
var CART_KEY = 'cart:v1';
var cartItems = new Map(); // id -> { id,title,price,qty,image }

/* Storage helpers */
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
  cartItems.forEach(function(item){ out.push(item); });
  return out;
}
function cartArrayToMap(arr) {
  cartItems.clear();
  for (var i=0;i<arr.length;i++){
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

/* Cart operations */
function addToCart(p){
  try {
    if(!p || !p.id) return;
    var cur = cartItems.get(p.id);
    if (cur) cur.qty += 1;
    else cartItems.set(p.id, {
      id: p.id,
      title: p.title || 'Produit',
      price: Number(p.price)||0,
      qty: 1,
      image: (p.image && p.image.url) ? p.image.url : ''
    });
    updateCartUI();

    // Pulse amin'ny menu Shop
    var shopBtn = document.querySelector('.menu-shop');
    if (shopBtn){
      shopBtn.classList.add('pulse');
      setTimeout(function(){ shopBtn.classList.remove('pulse'); }, 450);
    }
  } catch (err) {
    console.error('[addToCart error]', err);
  }
}
function removeFromCart(id){
  try { cartItems.delete(id); updateCartUI(); }
  catch (err) { console.error('[removeFromCart error]', err); }
}
function changeQty(id, delta){
  try {
    var item = cartItems.get(id);
    if(!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) cartItems.delete(id);
    updateCartUI();
  } catch (err) {
    console.error('[changeQty error]', err);
  }
}
function clearCart(){
  try { cartItems.clear(); updateCartUI(); }
  catch (err) { console.error('[clearCart error]', err); }
}

/* Totals */
function cartTotals(){
  var count = 0, total = 0;
  cartItems.forEach(function(item){
    count += item.qty;
    total += item.qty * (Number(item.price)||0);
  });
  return { count: count, total: total };
}

/* Update UI (panel + drawer) */
function updateCartUI(){
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
    if (drawer && totalDrawer){
      drawer.innerHTML = '';
      if (cartItems.size === 0){
        drawer.innerHTML = '<div class="cart-empty">Panier vide.</div>';
      } else {
        var frag = document.createDocumentFragment();
        cartItems.forEach(function(it, id){
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
            '  <div>' + fmtPrice((Number(it.price)||0) * it.qty) + '</div>' +
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

/* Drawer toggle + actions */
(function initCartDrawer(){
  try {
    var toggle = document.getElementById('cart-toggle');
    var drawer = document.getElementById('cart-drawer');
    if (toggle && drawer){
      toggle.addEventListener('click', function(){
        var show = !drawer.classList.contains('show');
        drawer.classList.toggle('show', show);
        drawer.setAttribute('aria-hidden', show ? 'false' : 'true');
      });
      drawer.addEventListener('click', function(e){
        var item = e.target && e.target.closest ? e.target.closest('.cart-item') : null;
        if(!item) return;
        var id = item.getAttribute('data-id');
        var btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
        if(!btn) return;
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

/* Init cart from storage on load */
document.addEventListener('DOMContentLoaded', function(){
  try {
    var initial = loadCartFromStorage();
    cartArrayToMap(initial);
    updateCartUI();
  } catch (err) {
    console.error('[Cart init error]', err);
  }
});

/* Checkout WhatsApp */
function checkoutWhatsApp(){
  try {
    if(cartItems.size === 0){
      openWhatsAppMessage('Salama! Te-hanao commande (panier vide).');
      return;
    }
    var lines = ['Salama! Commande avy amin’ny Mijoro Boutique:', ''];
    var total = 0;
    cartItems.forEach(function(item){
      total += (Number(item.price)||0) * item.qty;
      lines.push('• ' + item.title + ' x' + item.qty + ' — ' + fmtPrice((Number(item.price)||0)*item.qty));
    });
    lines.push('', 'Total: ' + fmtPrice(total), 'Misaotra!');
    openWhatsAppMessage(lines.join('\n'));
  } catch (err) {
    console.error('[checkoutWhatsApp error]', err);
  }
}

/* ================================
   Helper: Antoka fa tsy misarona ny bottom menu
   ================================ */
function __ensureBottomMenuClickable(){
  var bm = document.querySelector('.bottom-menu');
  if (bm){
    bm.style.pointerEvents = 'auto';
    bm.style.zIndex = '3200';
  }
}

/* Rehefa vita ny load, antoka fa cliquable ny bottom menu */
document.addEventListener('DOMContentLoaded', function(){
  __ensureBottomMenuClickable();
});
   Slideshow (auto + dots + touch)
   ================================ */
(function initSlideshow(){
  try {
    var track = document.getElementById('slide-track');
    var dotsWrap = document.getElementById('slide-dots');
    if (!track) return;

    var slides = Array.prototype.slice.call(track.children || []);
    var count = slides.length;
    if (count === 0) return;

    var index = 0;
    var timer = null;
    var DURATION = 5000; // 5s

    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < count; i++){
        (function(iIdx){
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'dot' + (iIdx === 0 ? ' active' : '');
          btn.setAttribute('aria-label', 'Aller à la diapo ' + (iIdx+1));
          btn.addEventListener('click', function(){ goTo(iIdx, true); });
          dotsWrap.appendChild(btn);
        })(i);
      }
    }

    function updateUI(){
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      if (dotsWrap){
        var kids = Array.prototype.slice.call(dotsWrap.children || []);
        for (var d=0; d<kids.length; d++){
          if (d === index) kids[d].classList.add('active');
          else kids[d].classList.remove('active');
        }
      }
    }
    function next(){ index = (index + 1) % count; updateUI(); }
    function prev(){ index = (index - 1 + count) % count; updateUI(); }
    function goTo(i, user){ index = (i + count) % count; updateUI(); if (user) restart(); }
    function start(){ if (timer) clearInterval(timer); timer = setInterval(next, DURATION); }
    function stop(){ if (timer) { clearInterval(timer); timer = null; } }
    function restart(){ stop(); start(); }

    var startX = null;
    track.addEventListener('touchstart', function(e){
      var t0 = (e.touches && e.touches[0]) ? e.touches[0].clientX : null;
      startX = t0;
      stop();
    }, { passive: true });

    track.addEventListener('touchend', function(e){
      var t1 = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : null;
      if (startX != null && t1 != null){
        var dx = t1 - startX;
        if (Math.abs(dx) > 40){ if (dx < 0) next(); else prev(); }
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

/* ================================
   Navigation sections (Home/Shop) + Home fixe + Overlays safety
   ================================ */
var SECTION_IDS = ['home', 'shop'];

function __ensureBottomMenuClickable(){
  var bm = document.querySelector('.bottom-menu');
  if (bm){
    bm.style.pointerEvents = 'auto';
    bm.style.zIndex = '3200';
  }
}
function __ensureOverlaysHidden(){
  try {
    var popup = document.getElementById('shop-popup');
    if (popup && !popup.classList.contains('show')) {
      popup.style.pointerEvents = 'none';
      popup.setAttribute('aria-hidden','true');
    }
    var param = document.getElementById('param-fixed');
    if (param && param.classList.contains('hidden')) {
      param.style.pointerEvents = 'none';
      param.setAttribute('aria-hidden','true');
    }
  } catch(_){}
}

function showSection(id, btn){
  try {
    if (SECTION_IDS.indexOf(id) === -1) return;

    if (typeof closeParamFixed === 'function') closeParamFixed();

    // Toggle sections
    for (var i=0;i<SECTION_IDS.length;i++){
      var secId = SECTION_IDS[i];
      var sec = document.getElementById(secId);
      if (!sec) continue;
      var active = (secId === id);
      sec.classList.toggle('active', active);
      sec.setAttribute('aria-hidden', String(!active));
    }

    // Toggle menu active state
    var menuBtns = document.querySelectorAll('.bottom-menu .menu-btn');
    for (var j=0;j<menuBtns.length;j++){ menuBtns[j].classList.remove('active'); }
    var targetBtn = btn || document.querySelector('.bottom-menu .menu-' + id);
    if (targetBtn && targetBtn.classList) targetBtn.classList.add('active');

    // HOME fixe: tsy scroll amin'ny pejy
    var homeEl = document.getElementById('home');
    if (homeEl){
      if (id === 'home'){
        homeEl.classList.add('home-fixed');
        document.body.style.overflow = 'hidden';
      } else {
        homeEl.classList.remove('home-fixed');
        document.body.style.overflow = '';
      }
    }

    // Focus + scroll behavior (tsy mi-scroll raha home)
    var activeSec = document.getElementById(id);
    if (activeSec) {
      var heading = activeSec.querySelector('h1, h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        if (heading.focus) heading.focus({ preventScroll: true });
        setTimeout(function(){ heading.removeAttribute('tabindex'); }, 250);
      }
      if (id !== 'home' && activeSec.scrollIntoView) {
        activeSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    // Safety: menu bas cliquable + overlays tsy manarona
    __ensureBottomMenuClickable();
    __ensureOverlaysHidden();
  } catch (err) {
    console.error('[showSection error]', err);
  }
}

// Ensure Home fixe amin'ny load voalohany
document.addEventListener('DOMContentLoaded', function(){
  try {
    var homeEl = document.getElementById('home');
    if (homeEl && homeEl.classList.contains('active')) {
      homeEl.classList.add('home-fixed');
      document.body.style.overflow = 'hidden';
    }
    __ensureBottomMenuClickable();
  } catch(e){}
});

/* ================================
   Param panel: toggle/close + click-outside
   ================================ */
var __paramOpen = false;

function toggleParamFixed(){
  try {
    var el = document.getElementById('param-fixed');
    if(!el) return;

    __paramOpen = !__paramOpen;

    // Esory inert raha manokatra
    if (__paramOpen){
      el.removeAttribute('inert');
    }

    el.classList.toggle('hidden', !__paramOpen);
    el.setAttribute('aria-hidden', String(!__paramOpen));

    if (__paramOpen){
      document.body.classList.add('param-open');
      var first = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (first && first.focus) first.focus({ preventScroll:true });

      // Safety: antoka ambony izy
      el.style.zIndex = '5000';
      el.style.pointerEvents = 'auto';

      // Raha misokatra ny shop-popup dia akatona (overlay conflict)
      var popup = document.getElementById('shop-popup');
      if (popup && popup.classList && popup.classList.contains('show')) closeShop();
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
function closeParamFixed(){
  try {
    var el = document.getElementById('param-fixed');
    if(!el) return;
    __paramOpen = false;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden','true');
    el.setAttribute('inert','');
    el.style.pointerEvents = 'none';
    document.body.classList.remove('param-open');
    __ensureBottomMenuClickable();
  } catch (err) {
    console.error('[closeParamFixed error]', err);
  }
}

// Aza avela hikatona avy hatrany rehefa tsindrina ao anatiny (stopPropagation)
document.addEventListener('DOMContentLoaded', function(){
  var panel = document.getElementById('param-fixed');
  if (panel) {
    panel.addEventListener('click', function(e){ e.stopPropagation(); });
  }
});

// Click-outside: akatona raha ivelan'ny panel sy tsy ilay trigger
document.addEventListener('click', function(e){
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
   Modals: Info + Quit
   ================================ */
function openInfo(type){
  try {
    var modal = document.getElementById('info-modal');
    var content = document.getElementById('info-content');
    var title = document.getElementById('info-title');
    if (!modal || !content || !title) return;

    var html = '';
    var t = 'Informations';
    if (type === 'about'){
      t = 'À propos';
      html = '' +
        '<p>Mijoro Boutique — produits numériques (ebooks, vidéos, apps/jeux).</p>' +
        '<p>Objectif: faciliter l’accès aux contenus utiles pour réussir en ligne.</p>';
    } else if (type === 'contact'){
      t = 'Contact';
      html = '' +
        '<p>WhatsApp: <strong>+261 33 31 060 55</strong></p>' +
        '<p>Vous pouvez aussi commander via le panier.</p>';
    } else {
      html = '<p>Informations générales de l’application.</p>';
    }

    title.textContent = t;
    content.innerHTML = html;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');

    var focusEl = modal.querySelector('.info-actions .param-btn');
    if (!focusEl) focusEl = modal.querySelector('button');
    if (focusEl && focusEl.focus) focusEl.focus({ preventScroll:true });
  } catch (err) {
    console.error('[openInfo error]', err);
  }
}
function closeInfo(){
  try {
    var modal = document.getElementById('info-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  } catch (err) {
    console.error('[closeInfo error]', err);
  }
}
// Fermeture au clic hors carte
document.addEventListener('click', function(e){
  try {
    var modal = document.getElementById('info-modal');
    if (!modal || !modal.classList.contains('show')) return;
    var inside = e.target && e.target.closest ? e.target.closest('.info-card') : null;
    var isBtn = e.target && e.target.closest ? e.target.closest('.param-btn') : null;
    if (!inside && !isBtn) closeInfo();
  } catch (err) {
    console.warn('[info-modal click-outside]', err);
  }
});

function openQuitModal(){
  try {
    var modal = document.getElementById('quit-modal');
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');

    var btn = modal.querySelector('button.param-btn');
    if (btn && btn.focus) btn.focus({ preventScroll:true });
  } catch (err) {
    console.error('[openQuitModal error]', err);
  }
}
function closeQuitModal(){
  try {
    var modal = document.getElementById('quit-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
  } catch (err) {
    console.error('[closeQuitModal error]', err);
  }
}
function quitApp(){
  try {
    closeQuitModal();
    showSection('home', document.querySelector('.bottom-menu .menu-home'));
    alert('Misaotra nitsidika!');
  } catch (err) {
    console.error('[quitApp error]', err);
  }
}

/* ================================
   Shop Popup
   ================================ */
function openShop(){
  try {
    var popup = document.getElementById('shop-popup');
    if (!popup) return;
    popup.classList.add('show');
    popup.setAttribute('aria-hidden','false');
    popup.style.pointerEvents = 'auto';

    var s = document.getElementById('search');
    if (s && s.focus) s.focus({ preventScroll:true });
  } catch (err) {
    console.error('[openShop error]', err);
  }
}
function closeShop(){
  try {
    var popup = document.getElementById('shop-popup');
    if (!popup) return;
    popup.classList.remove('show');
    popup.setAttribute('aria-hidden','true');
    popup.style.pointerEvents = 'none';
  } catch (err) {
    console.error('[closeShop error]', err);
  }
}

/* ================================
   Détails produit (showProduct via info-modal)
   ================================ */
function showProduct(id){
  try {
    var p = null;
    for (var i=0;i<(products||[]).length;i++){
      if (products[i].id === id){ p = products[i]; break; }
    }
    if (!p) return;

    var title = p.title || 'Produit';
    var img = escapeAttr((p.image && p.image.url) ? p.image.url : 'https://via.placeholder.com/600x400?text=Produit');
    var imgAlt = escapeAttr((p.image && p.image.alt) ? p.image.alt : (p.title || 'Produit'));
    var cat = normalizeCategory(p.category);
    var badge = '<span class="' + badgeClassFor(cat) + '">' + badgeIconFor(cat) + ' ' + escapeHtml(cat || 'produit') + '</span>';

    var safeId = escapeAttr(p.id);
    var html = '' +
      '<div style="display:grid; gap:10px;">' +
      '  <img src="' + img + '" alt="' + imgAlt + '" style="width:100%;height:auto;border-radius:10px;object-fit:cover;aspect-ratio:16/9">' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
      '    <h4 style="margin:0">' + escapeHtml(title) + '</h4>' +
           badge +
      '  </div>' +
      '  <div style="opacity:.9">' + escapeHtml(p.description || p.description_short || '') + '</div>' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">' +
      '    <strong>' + fmtPrice(p.price) + '</strong>' +
      '    <div class="card-actions">' +
      '      <button type="button" class="icon-btn icon-buy" title="' + (Number(p.price)===0?'Obtenir (WhatsApp)':'Acheter (WhatsApp)') + '"' +
      '        onclick="(function(){var a=null;for(var i=0;i<(products||[]).length;i++){if(products[i].id===\'' + safeId + '\'){a=products[i];break;}} if(a){buyOrRead(a);} })()">' +
      '        <i class="fa-brands fa-whatsapp"></i>' +
      '      </button>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    var modal = document.getElementById('info-modal');
    var content = document.getElementById('info-content');
    var titleEl = document.getElementById('info-title');
    if (!modal || !content || !titleEl) return;

    titleEl.textContent = 'Détails du produit';
    content.innerHTML = html;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');

    var closeBtn = modal.querySelector('.info-actions .param-btn');
    if (closeBtn && closeBtn.focus) closeBtn.focus({ preventScroll:true });
  } catch (err) {
    console.error('[showProduct error]', err);
  }
}