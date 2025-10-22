// ========= CONFIG =========
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw'; // Fenoy!
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';
const BUCKET_MEDIA = 'Media';
const BUCKET_APPS  = 'apps';

// ========= INIT =========
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const els = {
  grid: document.getElementById('grid'),
  empty: document.getElementById('empty'),
  loginBtn: document.getElementById('loginBtn'),
  addBtn: document.getElementById('addBtn'),
  chips: Array.from(document.querySelectorAll('.chip')),
  search: document.getElementById('searchInput'),
  modal: document.getElementById('modal'),
  form: document.getElementById('form'),
  closeBtn: document.getElementById('closeBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  imageFile: document.getElementById('imageFile'),
  mediaFile: document.getElementById('mediaFile'),
  appFile: document.getElementById('appFile'),
};
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPass = document.getElementById('loginPass');
const closeLogin = document.getElementById('closeLogin');
const cancelLogin = document.getElementById('cancelLogin');

let session = null;
let isOwner = false;
let filter = 'all';
let q = '';

// ========= AUTH =========
async function initAuth() {
  // Try from localStorage
  const saved = localStorage.getItem('supabase_session');
  if (saved) {
    try {
      session = JSON.parse(saved);
      isOwner = session.user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    } catch(e){ console.error('Invalid local session', e); }
  }

  // Reflect UI
  reflectUI();
  render();

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((_event, s) => {
    session = s;
    if (session) localStorage.setItem('supabase_session', JSON.stringify(session));
    else localStorage.removeItem('supabase_session');
    isOwner = session?.user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    reflectUI();
    render();
  });
}

function reflectUI() {
  if (!els.loginBtn) return;
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  if (els.addBtn) els.addBtn.hidden = !isOwner;
}

// Open/close login
els.loginBtn?.addEventListener('click', async () => {
  if (session) {
    await supabase.auth.signOut();
    return;
  }
  loginEmail.value = OWNER_EMAIL;
  loginPass.value = '';
  loginModal?.showModal();
});

closeLogin?.addEventListener('click', () => loginModal?.close());
cancelLogin?.addEventListener('click', () => loginModal?.close());

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (loginEmail?.value || '').trim();
  const password = loginPass?.value || '';
  if (!email || !password) { alert('Fenoy email sy password'); return; }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login failed: ' + error.message);
    return;
  }

  session = data.session;
  if (!session) { alert('Login failed'); return; }

  localStorage.setItem('supabase_session', JSON.stringify(session));
  isOwner = session.user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  loginModal?.close();
  reflectUI();
  await render();
});// ========= HELPER =========
function byFilter(item) {
  const matchesFilter = filter === 'all' || (filter === 'free' ? item.is_free : (item.tags||[]).includes(filter));
  const matchesSearch = !q || (item.title?.toLowerCase().includes(q) || (item.tags||[]).join(',').toLowerCase().includes(q));
  return matchesFilter && matchesSearch;
}

function formatPrice(p, promo) {
  if (p <= 0) return 'Free';
  if (promo > 0) return `$${(p*(1-promo/100)).toFixed(2)} (-${promo}%)`;
  return `$${p.toFixed(2)}`;
}

// ========= FETCH & RENDER PRODUCTS =========
async function listProducts() {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

async function render() {
  const all = await listProducts();
  const filtered = all.filter(byFilter);

  els.grid.innerHTML = '';
  if (!filtered.length) {
    els.empty.hidden = false;
    return;
  }
  els.empty.hidden = true;

  filtered.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="thumb" style="background-image:url(${p.image_url || ''})"></div>
      <div class="card-body">
        <div class="title-row">
          <strong>${p.title}</strong>
          ${p.is_vip?'<span class="badge">VIP</span>':''}
          ${p.is_free?'<span class="badge">FREE</span>':''}
        </div>
        <small>${p.tags||[]}</small>
        <p>${p.description||''}</p>
        <p>${formatPrice(p.price, p.promo)}</p>
      </div>
      ${isOwner?`<div class="card-actions">
        <button class="btn" data-id="${p.id}" data-action="edit">Edit</button>
        <button class="btn danger" data-id="${p.id}" data-action="delete">Delete</button>
      </div>`:''}
    `;
    els.grid.appendChild(div);
  });
}

// ========= FILTERS =========
els.chips.forEach(c => {
  c.addEventListener('click', () => {
    els.chips.forEach(cc=>cc.classList.remove('active'));
    c.classList.add('active');
    filter = c.dataset.filter;
    render();
  });
});
els.search.addEventListener('input', e => { q = e.target.value.toLowerCase(); render(); });

// ========= ADD / EDIT / DELETE =========
els.addBtn?.addEventListener('click', () => {
  els.form.reset();
  els.modal.showModal();
});

els.closeBtn?.addEventListener('click', () => els.modal.close());
els.cancelBtn?.addEventListener('click', () => els.modal.close());

els.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOwner) { alert('Owner only'); return; }

  const form = e.target;
  const id = form.id.value;
  const values = {
    title: form.title.value,
    type: form.type.value,
    is_free: form.isFree.checked,
    price: parseFloat(form.price.value) || 0,
    promo: parseInt(form.promo.value) || 0,
    is_vip: form.isVIP.checked,
    description: form.description.value,
    tags: form.tags.value.split(',').map(t=>t.trim()).filter(Boolean),
    image_url: form.image_url.value,
    media_url: form.media_url.value,
    platform: form.platform.value,
    version: form.version.value,
    build_number: form.build_number.value,
    file_url: form.file_url.value
  };

  if (id) {
    // UPDATE
    const { error } = await supabase.from('products').update(values).eq('id', id);
    if (error) { alert(error.message); return; }
  } else {
    // INSERT
    const { error } = await supabase.from('products').insert([values]);
    if (error) { alert(error.message); return; }
  }

  els.modal.close();
  render();
});

// Delete product
els.grid.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="delete"]');
  if (!btn) return;
  if (!isOwner) return;
  const id = btn.dataset.id;
  if (!confirm('Delete product?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  render();
});

// ========= UPLOADS =========
async function uploadFile(file, bucket) {
  if (!file) return '';
  const fileName = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
  if (error) { console.error(error); return ''; }
  return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
}

// Auto-upload file inputs
els.imageFile?.addEventListener('change', async e => {
  const url = await uploadFile(e.target.files[0], 'media');
  els.form.image_url.value = url;
});
els.mediaFile?.addEventListener('change', async e => {
  const url = await uploadFile(e.target.files[0], BUCKET_MEDIA);
  els.form.media_url.value = url;
});
els.appFile?.addEventListener('change', async e => {
  const url = await uploadFile(e.target.files[0], BUCKET_APPS);
  els.form.file_url.value = url;
});

// ========= INIT =========
initAuth();
render();