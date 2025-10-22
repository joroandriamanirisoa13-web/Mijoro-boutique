/* ==============================
   Mijoro Boutique - app-secure.js
   Stable version with patches
   ============================== */

const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

/* -------------------------
   UI Helper Functions
------------------------- */
function showOwnerUI() {
  document.getElementById('addBtn').hidden = false;
}

function hideOwnerUI() {
  document.getElementById('addBtn').hidden = true;
}

function clearForm() {
  const form = document.getElementById('form');
  form.reset();
  form.id.value = '';
}

/* -------------------------
   Auth Functions
------------------------- */
async function login(email, password) {
  if (email !== OWNER_EMAIL) {
    alert('Access denied: only owner.');
    return false;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert('Login failed: ' + error.message);
    return false;
  }

  currentUser = data.user.email;
  showOwnerUI();
  fetchProducts();
  return true;
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  hideOwnerUI();
  fetchProducts();
}

/* -------------------------
   Products Functions
------------------------- */
async function fetchProducts(filter = 'all', search = '') {
  let query = supabase.from('products').select('*').order('created_at', { ascending: false });

  // Filter by owner only if logged in
  if (currentUser) query = query.eq('owner_email', currentUser);

  const { data: products, error } = await query;
  if (error) {
    console.error('Fetch products error:', error);
    return;
  }

  renderProducts(products, filter, search);
}

function renderProducts(products, filter, search) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const filtered = products.filter(p => {
    const matchesFilter = filter === 'all' || p.type === filter || (filter === 'free' && p.isFree) || (filter === 'vip' && p.isVIP) || (filter === 'promo' && p.promo > 0);
    const matchesSearch = !search || (p.title.toLowerCase().includes(search.toLowerCase()) || (p.tags && p.tags.toLowerCase().includes(search.toLowerCase())));
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    document.getElementById('empty').hidden = false;
    return;
  } else {
    document.getElementById('empty').hidden = true;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (p.image_url) thumb.style.backgroundImage = `url(${p.image_url})`;

    const body = document.createElement('div');
    body.className = 'card-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'title-row';
    titleRow.innerHTML = `<strong>${p.title}</strong>`;

    const badges = document.createElement('div');
    if (p.isFree) badges.innerHTML += '<span class="badge">Free</span>';
    if (p.promo > 0) badges.innerHTML += `<span class="badge">Promo ${p.promo}%</span>`;
    if (p.isVIP) badges.innerHTML += '<span class="badge">VIP</span>';

    body.appendChild(titleRow);
    body.appendChild(badges);

    // Actions (Edit/Delete) only for owner
    if (currentUser && p.owner_email === currentUser) {
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.innerHTML = `
        <button class="btn" onclick="editProduct(${p.id})">Edit</button>
        <button class="btn danger" onclick="deleteProduct(${p.id})">Delete</button>
      `;
      body.appendChild(actions);
    }

    card.appendChild(thumb);
    card.appendChild(body);
    grid.appendChild(card);
  });
}/* -------------------------
   Product CRUD Functions
------------------------- */
async function addOrUpdateProduct(event) {
  event.preventDefault();
  const form = event.target;

  const product = {
    title: form.title.value,
    type: form.type.value,
    isFree: form.isFree.checked,
    price: parseFloat(form.price.value) || 0,
    promo: parseInt(form.promo.value) || 0,
    isVIP: form.isVIP.checked,
    description: form.description.value,
    tags: form.tags.value,
    platform: form.platform.value,
    version: form.version.value,
    build_number: form.build_number.value,
    owner_email: currentUser,
    image_url: form.image_url.value,
    media_url: form.media_url.value,
    file_url: form.file_url.value,
    file_type: form.file_type.value,
    file_size: form.file_size.value
  };

  let result;
  if (form.id.value) {
    // Update
    result = await supabase.from('products').update(product).eq('id', form.id.value);
  } else {
    // Insert
    result = await supabase.from('products').insert(product);
  }

  if (result.error) {
    alert('Error saving product: ' + result.error.message);
    return;
  }

  clearForm();
  document.getElementById('modal').close();
  fetchProducts();
}

/* -------------------------
   Edit/Delete Product
------------------------- */
async function editProduct(id) {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) {
    alert('Error fetching product: ' + error.message);
    return;
  }

  const form = document.getElementById('form');
  form.id.value = data.id;
  form.title.value = data.title;
  form.type.value = data.type;
  form.isFree.checked = data.isFree;
  form.price.value = data.price;
  form.promo.value = data.promo;
  form.isVIP.checked = data.isVIP;
  form.description.value = data.description;
  form.tags.value = data.tags;
  form.platform.value = data.platform;
  form.version.value = data.version;
  form.build_number.value = data.build_number;
  form.image_url.value = data.image_url;
  form.media_url.value = data.media_url;
  form.file_url.value = data.file_url;
  form.file_type.value = data.file_type;
  form.file_size.value = data.file_size;

  document.getElementById('modalTitle').innerText = 'Edit product';
  document.getElementById('modal').showModal();
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) alert('Error deleting product: ' + error.message);
  fetchProducts();
}

/* -------------------------
   Filters & Search
------------------------- */
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    fetchProducts(chip.dataset.filter, document.getElementById('searchInput').value);
  });
});

document.getElementById('searchInput').addEventListener('input', e => {
  const activeFilter = document.querySelector('.chip.active').dataset.filter;
  fetchProducts(activeFilter, e.target.value);
});

document.getElementById('resetFilters').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.chip[data-filter="all"]').classList.add('active');
  fetchProducts();
});

/* -------------------------
   Modal Buttons
------------------------- */
document.getElementById('addBtn').addEventListener('click', () => {
  clearForm();
  document.getElementById('modalTitle').innerText = 'Add product';
  document.getElementById('modal').showModal();
});

document.getElementById('closeBtn').addEventListener('click', () => {
  document.getElementById('modal').close();
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('modal').close();
});

/* -------------------------
   Login Modal Buttons
------------------------- */
document.getElementById('loginBtn').addEventListener('click', () => {
  document.getElementById('loginModal').showModal();
});

document.getElementById('closeLogin').addEventListener('click', () => {
  document.getElementById('loginModal').close();
});

document.getElementById('cancelLogin').addEventListener('click', () => {
  document.getElementById('loginModal').close();
});

/* -------------------------
   Login Form
------------------------- */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPass').value;
  const success = await login(email, password);
  if (success) document.getElementById('loginModal').close();
});

/* -------------------------
   Product Form Submit
------------------------- */
document.getElementById('form').addEventListener('submit', addOrUpdateProduct);

/* -------------------------
   Initial Fetch
------------------------- */
window.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
});