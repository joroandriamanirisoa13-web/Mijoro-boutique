// =======================
// Mijoro Boutique – Secure App Logic (Stable Patch)
// =======================

// ✅ Config
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

// ✅ Init Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================
// STATE & HELPERS
// ============================

let currentUser = null;
let products = [];

function $(sel) {
  return document.querySelector(sel);
}

function showLogin() {
  $('#loginModal').showModal();
  $('#email').value = '';
  $('#password').value = '';
}

function showApp() {
  $('#loginModal').close();
  loadProducts();
}

function setLoading(state) {
  const btn = $('#saveBtn');
  if (!btn) return;
  btn.disabled = state;
  btn.textContent = state ? 'Enregistrement...' : 'Enregistrer';
}

// ============================
// LOGIN SYSTEM
// ============================

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;
    localStorage.setItem('sb-user', JSON.stringify(session.user));
    showApp();
  } else {
    localStorage.removeItem('sb-user');
    showLogin();
  }
});

// Reload session if available
const savedUser = localStorage.getItem('sb-user');
if (savedUser) {
  currentUser = JSON.parse(savedUser);
  showApp();
} else {
  showLogin();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#email').value.trim();
  const password = $('#password').value.trim();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert('Email ou mot de passe incorrect.');
  } else {
    currentUser = data.user;
    localStorage.setItem('sb-user', JSON.stringify(data.user));
    showApp();
  }
});

$('#logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('sb-user');
  showLogin();
});

// ============================
// PRODUCT LOGIC
// ============================

async function loadProducts() {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
  if (error) {
    console.error('Erreur chargement produits:', error);
    return;
  }
  products = data || [];
  renderProducts();
}

function renderProducts() {
  const grid = $('#productGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!products.length) {
    grid.innerHTML = `<p class="empty">Aucun produit trouvé.</p>`;
    return;
  }

  for (const p of products) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb" style="background-image:url('${p.image_url || 'https://via.placeholder.com/300x200?text=Produit'}')"></div>
      <div class="card-body">
        <div class="title-row">
          <h3>${p.title}</h3>
          <span class="badge">${p.price || ''} Ar</span>
        </div>
        <p class="desc">${p.description || ''}</p>
        ${p.preview_url ? `<video src="${p.preview_url}" controls width="100%"></video>` : ''}
      </div>
      ${currentUser?.email === OWNER_EMAIL ? `
      <div class="card-actions">
        <button class="btn" onclick="editProduct(${p.id})">Modifier</button>
        <button class="btn danger" onclick="deleteProduct(${p.id})">Supprimer</button>
      </div>` : ''}
    `;
    grid.appendChild(card);
  }
}// ============================
// ADD / EDIT / DELETE PRODUCTS
// ============================

const modal = $('#modal');
const form = $('#form');
const addBtn = $('#addBtn');

addBtn.addEventListener('click', () => {
  form.reset();
  $('#modalTitle').textContent = 'Add product';
  modal.showModal();
});

$('#closeBtn').addEventListener('click', () => modal.close());
$('#cancelBtn').addEventListener('click', () => modal.close());

// Save form
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setLoading(true);

  const formData = new FormData(form);
  const obj = Object.fromEntries(formData.entries());
  obj.price = parseFloat(obj.price || 0);
  obj.promo = parseInt(obj.promo || 0);
  obj.isFree = form.isFree.checked;
  obj.isVIP = form.isVIP.checked;
  obj.owner = currentUser?.email;

  // Insert or Update
  if (obj.id) {
    const { error } = await supabase.from('products').update(obj).eq('id', obj.id);
    if (error) alert('Erreur modification: ' + error.message);
    else alert('Produit modifié !');
  } else {
    const { error } = await supabase.from('products').insert([obj]);
    if (error) alert('Erreur ajout: ' + error.message);
    else alert('Produit ajouté !');
  }

  modal.close();
  setLoading(false);
  loadProducts();
});

// Edit product
window.editProduct = async function (id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  $('#modalTitle').textContent = 'Edit product';
  for (const key in p) {
    if (form[key]) {
      if (form[key].type === 'checkbox') form[key].checked = !!p[key];
      else form[key].value = p[key] || '';
    }
  }
  modal.showModal();
};

// Delete
window.deleteProduct = async function (id) {
  if (!confirm('Supprimer ce produit ?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) alert('Erreur suppression: ' + error.message);
  else {
    alert('Produit supprimé !');
    loadProducts();
  }
};

// ============================
// FILTERS / SEARCH
// ============================

const searchInput = $('#searchInput');
const resetBtn = $('#resetFilters');
const chipButtons = document.querySelectorAll('.chip');

chipButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    chipButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
});

searchInput.addEventListener('input', applyFilters);
resetBtn.addEventListener('click', () => {
  searchInput.value = '';
  document.querySelector('[data-filter="all"]').click();
  renderProducts();
});

function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const activeFilter = document.querySelector('.chip.active').dataset.filter;

  let filtered = [...products];

  if (activeFilter && activeFilter !== 'all') {
    if (activeFilter === 'free') filtered = filtered.filter(p => p.isFree);
    else if (activeFilter === 'promo') filtered = filtered.filter(p => p.promo > 0);
    else if (activeFilter === 'vip') filtered = filtered.filter(p => p.isVIP);
    else filtered = filtered.filter(p => p.type === activeFilter);
  }

  if (search) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(search) ||
      (p.tags || '').toLowerCase().includes(search)
    );
  }

  const grid = $('#productGrid');
  grid.innerHTML = '';
  if (!filtered.length) {
    grid.innerHTML = `<p class="empty">Aucun produit trouvé.</p>`;
    return;
  }

  for (const p of filtered) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb" style="background-image:url('${p.image_url || 'https://via.placeholder.com/300x200?text=Produit'}')"></div>
      <div class="card-body">
        <div class="title-row">
          <h3>${p.title}</h3>
          ${p.isFree ? '<span class="badge">Gratuit</span>' : ''}
          ${p.promo > 0 ? `<span class="badge">-${p.promo}%</span>` : ''}
        </div>
        <p class="desc">${p.description || ''}</p>
        ${p.media_url ? renderPreview(p.media_url) : ''}
      </div>
      ${currentUser?.email === OWNER_EMAIL ? `
      <div class="card-actions">
        <button class="btn" onclick="editProduct(${p.id})">Modifier</button>
        <button class="btn danger" onclick="deleteProduct(${p.id})">Supprimer</button>
      </div>` : ''}
    `;
    grid.appendChild(card);
  }
}

function renderPreview(url) {
  if (url.endsWith('.mp4') || url.includes('video')) {
    return `<video src="${url}" controls width="100%" style="border-radius:8px;margin-top:8px"></video>`;
  }
  if (url.endsWith('.pdf')) {
    return `<iframe src="${url}" width="100%" height="180" style="border-radius:8px;margin-top:8px"></iframe>`;
  }
  return '';
}

// ============================
// READY
// ============================

document.addEventListener('DOMContentLoaded', () => {
  if (currentUser) showApp();
  else showLogin();
});