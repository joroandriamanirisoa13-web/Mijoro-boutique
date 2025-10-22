// =========================
// APP SECURE.JS — PARTIE 1/2
// =========================

// ⚙️ CONFIGURATION SUPABASE
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================
// 🔐 AUTHENTIFICATION
// =========================
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const appSection = document.getElementById('app');
const loginSection = document.getElementById('login-section');
const addProductForm = document.getElementById('add-product-form');
const productsList = document.getElementById('products-list');

let currentUser = null;

// Vérifie si une session existe déjà (pour éviter miverina null rehefa refresh)
async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    showApp();
  } else {
    showLogin();
  }
}

checkSession();

// Login handler
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();

    if (!email || !password) {
      alert('Ampidiro ny email sy mot de passe!');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('❌ Diso email na mot de passe.');
      console.error(error);
      return;
    }

    if (data.user.email !== OWNER_EMAIL) {
      alert('🚫 Tsy manana droit ianao hampiasa ity app ity.');
      await supabase.auth.signOut();
      return;
    }

    currentUser = data.user;
    showApp();
  });
}

// Logout handler
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    showLogin();
  });
}

// =========================
// 🧩 UI CONTROL
// =========================
function showApp() {
  loginSection.style.display = 'none';
  appSection.style.display = 'block';
  loadProducts();
}

function showLogin() {
  loginSection.style.display = 'flex';
  appSection.style.display = 'none';
}

// =========================
// 🛒 PRODUITS CRUD (LOAD + ADD)
// =========================
async function loadProducts() {
  productsList.innerHTML = '<p>Loading...</p>';
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    productsList.innerHTML = `<p class="error">❌ Erreur: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    productsList.innerHTML = '<p>Aucun produit trouvé.</p>';
    return;
  }

  productsList.innerHTML = '';
  data.forEach((p) => renderProduct(p));
}

// Créer un produit
if (addProductForm) {
  addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const price = parseFloat(e.target.price.value);
    const tag = e.target.tag.value.trim() || 'Autre';
    const preview = e.target.preview.value.trim();
    const description = e.target.description.value.trim();

    if (!name || !price) {
      alert('Ampidiro ny anarana sy ny vidiny.');
      return;
    }

    const { error } = await supabase.from('products').insert([
      {
        name,
        price,
        tag,
        preview,
        description,
        owner: currentUser?.email,
      },
    ]);

    if (error) {
      alert('❌ Erreur enregistrement: ' + error.message);
      console.error(error);
      return;
    }

    e.target.reset();
    loadProducts();
  });
}

// =========================
// 🧱 RENDER PRODUIT
// =========================
function renderProduct(p) {
  const div = document.createElement('div');
  div.className = 'product-card';

  div.innerHTML = `
    <h3>${p.name}</h3>
    <p class="price">${p.price.toFixed(2)} Ar</p>
    ${p.preview ? `<video src="${p.preview}" controls></video>` : ''}
    <p class="desc">${p.description || ''}</p>
    <span class="tag">${p.tag}</span>
    <div class="actions">
      <button class="edit">✏️</button>
      <button class="delete">🗑️</button>
    </div>
  `;

  const deleteBtn = div.querySelector('.delete');
  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Supprimer ce produit ?')) return;
    await supabase.from('products').delete().eq('id', p.id);
    div.remove();
  });

  productsList.appendChild(div);
}// =========================
// PARTIE 2/2 — FEATURES & PATCHES
// =========================

// 🔍 FILTER PRODUITS PAR TAG
const filterSelect = document.getElementById('filter-tag');
if (filterSelect) {
  filterSelect.addEventListener('change', async (e) => {
    const tag = e.target.value;
    if (tag === 'all') {
      loadProducts();
      return;
    }

    productsList.innerHTML = '<p>Chargement...</p>';
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tag', tag)
      .order('id', { ascending: false });

    if (error) {
      productsList.innerHTML = `<p class="error">${error.message}</p>`;
      return;
    }

    productsList.innerHTML = '';
    data.forEach((p) => renderProduct(p));
  });
}

// ✏️ EDIT PRODUIT EXISTANT
function renderProduct(p) {
  const div = document.createElement('div');
  div.className = 'product-card';

  div.innerHTML = `
    <div class="product-header">
      <h3>${p.name}</h3>
      <span class="tag">${p.tag || 'Autre'}</span>
    </div>
    ${p.preview ? renderPreview(p.preview) : ''}
    <p class="desc">${p.description || ''}</p>
    <p class="price">${p.price.toFixed(2)} Ar</p>
    <div class="actions">
      <button class="edit">✏️ Modifier</button>
      <button class="delete">🗑️ Supprimer</button>
    </div>
  `;

  const deleteBtn = div.querySelector('.delete');
  const editBtn = div.querySelector('.edit');

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Supprimer ce produit ?')) return;
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (!error) div.remove();
  });

  editBtn.addEventListener('click', () => openEditModal(p));

  productsList.appendChild(div);
}

// 🎞️ PREVIEW FUNCTION
function renderPreview(link) {
  if (link.endsWith('.mp4') || link.includes('video')) {
    return `<video src="${link}" controls class="preview"></video>`;
  } else if (link.endsWith('.pdf')) {
    return `<iframe src="${link}" class="preview" title="PDF preview"></iframe>`;
  } else {
    return `<img src="${link}" alt="Aperçu" class="preview"/>`;
  }
}

// 🧰 MODAL EDIT PRODUIT
function openEditModal(p) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Modifier le produit</h2>
      <form id="edit-form">
        <input type="text" name="name" value="${p.name}" required />
        <input type="number" name="price" value="${p.price}" required />
        <input type="text" name="tag" value="${p.tag}" />
        <input type="text" name="preview" value="${p.preview || ''}" placeholder="Lien image/vidéo/pdf" />
        <textarea name="description">${p.description || ''}</textarea>
        <div class="modal-actions">
          <button type="submit" class="save">💾 Enregistrer</button>
          <button type="button" class="cancel">❌ Annuler</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.cancel').addEventListener('click', () => modal.remove());

  modal.querySelector('#edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const price = parseFloat(e.target.price.value);
    const tag = e.target.tag.value.trim();
    const preview = e.target.preview.value.trim();
    const description = e.target.description.value.trim();

    const { error } = await supabase
      .from('products')
      .update({ name, price, tag, preview, description })
      .eq('id', p.id);

    if (error) {
      alert('Erreur modification: ' + error.message);
      return;
    }

    modal.remove();
    loadProducts();
  });
}

// =========================
// 🌈 UI POLISH
// =========================
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <style>
      .product-card {
        background: #fff;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        transition: transform 0.2s ease;
      }
      .product-card:hover {
        transform: scale(1.02);
      }
      .product-card h3 {
        color: #333;
        margin-bottom: 6px;
      }
      .product-card .price {
        font-weight: bold;
        color: #27ae60;
      }
      .product-card .tag {
        background: #3498db;
        color: #fff;
        padding: 3px 8px;
        border-radius: 8px;
        font-size: 12px;
      }
      .product-card video,
      .product-card img,
      .product-card iframe {
        width: 100%;
        border-radius: 10px;
        margin-top: 8px;
      }
      .modal {
        position: fixed;
        top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.6);
        display:flex; justify-content:center; align-items:center;
        z-index:999;
      }
      .modal-content {
        background:#fff;
        border-radius:10px;
        padding:20px;
        width:90%;
        max-width:400px;
      }
      .modal-actions {
        display:flex;
        justify-content:space-between;
        margin-top:10px;
      }
      .modal button {
        padding:8px 12px;
        border:none;
        border-radius:8px;
        cursor:pointer;
      }
      .modal .save { background:#27ae60; color:#fff; }
      .modal .cancel { background:#e74c3c; color:#fff; }
    </style>
    `
  );
});

console.log('✅ app-secure.js loaded successfully');