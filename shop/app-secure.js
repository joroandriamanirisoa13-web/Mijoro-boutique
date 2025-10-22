// alert('JS ready'); // Esory rehefa OK
window.addEventListener('error', (e) => {
  console.error('JS error: ', e?.message || e);
});

// ========= CONFIG =========
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

// Buckets
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
  appFile: document.getElementById('appFile')
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
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (e) { console.error('getSession error: ', e.message); }
  computeIsOwner();
  reflectUI();

  supabase.auth.onAuthStateChange((_event, s) => {
    session = s;
    computeIsOwner();
    reflectUI();
    render();
  });
}

function computeIsOwner() {
  const email = session?.user?.email || '';
  isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

function reflectUI() {
  if (!els.loginBtn) return console.warn('No loginBtn in HTML');
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  if (els.addBtn) els.addBtn.hidden = !isOwner;
}

// ========= LOGIN MODAL =========
els.loginBtn?.addEventListener('click', async () => {
  if (session) {
    await supabase.auth.signOut();
    return;
  }
  if (!loginModal?.showModal) {
    const email = prompt('Owner email:', OWNER_EMAIL);
    const password = prompt('Password:');
    if (!email || !password) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Login failed: ' + error.message);
    return;
  }
  loginEmail.value = OWNER_EMAIL;
  loginPass.value = '';
  loginModal.showModal();
});
closeLogin?.addEventListener('click', () => loginModal?.close());
cancelLogin?.addEventListener('click', () => loginModal?.close());

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (loginEmail.value || '').trim();
  const password = loginPass.value || '';
  if (!email || !password) return alert('Fenoy email sy password');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert('Login failed: ' + error.message);
  else {
    loginModal.close();
    const { data } = await supabase.auth.getUser();
    alert('Logged in as: ' + (data?.user?.email || 'unknown'));
  }
});

// ========= DB HELPERS =========
async function listProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('listProducts error:', err.message);
    return [];
  }
}

async function saveProduct(p) {
  if (!isOwner || !session) return alert('Owner only');
  const payload = {
    title: p.title, type: p.type, is_free: p.is_free,
    price: p.price, promo: p.promo, is_vip: p.is_vip,
    image_url: p.image_url || null, media_url: p.media_url || null,
    description: p.description || null, tags: p.tags || [],
    platform: p.platform || null, version: p.version || null, build_number: p.build_number || null,
    file_url: p.file_url || null, file_size: p.file_size || null, file_type: p.file_type || null,
    screenshots: p.screenshots || [],
    owner: session.user.id
  };
  try {
    if (p.id) {
      await supabase.from('products').update(payload).eq('id', p.id);
    } else {
      await supabase.from('products').insert(payload);
    }
  } catch (err) { console.error('Save product error:', err.message); }
}

async function removeProduct(id) {
  if (!isOwner || !session) return alert('Owner only');
  try {
    await supabase.from('products').delete().eq('id', id);
  } catch (err) { console.error('Delete error:', err.message); }
}

// ========= STORAGE UPLOAD =========
async function uploadToBucket(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function uploadImage(file) { return uploadToBucket(BUCKET_MEDIA, `images/${Date.now()}-${file.name}`, file); }
async function uploadMedia(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const folder = ext === 'pdf' ? 'pdfs' : 'videos';
  return uploadToBucket(BUCKET_MEDIA, `${folder}/${Date.now()}-${file.name}`, file);
}
async function uploadAppFile(file) {
  const path = `binaries/${Date.now()}-${file.name}`;
  const url = await uploadToBucket(BUCKET_APPS, path, file);
  return { url, size: file.size, type: file.type || 'application/octet-stream' };
}

// File input listeners
els.imageFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { els.form.elements['image_url'].value = await uploadImage(f); alert('Image uploaded'); } 
  catch (err){ alert('Upload failed: ' + err.message); }
});
els.mediaFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { els.form.elements['media_url'].value = await uploadMedia(f); alert('Media uploaded'); } 
  catch (err){ alert('Upload failed: ' + err.message); }
});
els.appFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { 
    const info = await uploadAppFile(f);
    els.form.elements['file_url'].value = info.url;
    els.form.elements['file_type'].value = info.type;
    els.form.elements['file_size'].value = info.size;
    alert('App file uploaded'); 
  } catch (err){ alert('Upload failed: ' + err.message); }
});// ========= RENDER =========
async function render() {
  const products = await listProducts();

  // Apply search + filter
  const filtered = products.filter(p => {
    const matchFilter = filter === 'all' || (
      (filter === 'free' && p.is_free) ||
      (filter === 'promo' && p.promo > 0) ||
      (filter === 'vip' && p.is_vip) ||
      (filter === 'ebook' && p.type === 'ebook') ||
      (filter === 'video' && p.type === 'video') ||
      (filter === 'app' && p.type === 'app')
    );
    const searchStr = (p.title + ' ' + (p.tags || []).join(',')).toLowerCase();
    const matchSearch = q ? searchStr.includes(q.toLowerCase()) : true;
    return matchFilter && matchSearch;
  });

  els.grid.innerHTML = '';
  if (!filtered.length) {
    els.empty.hidden = false;
    return;
  } else els.empty.hidden = true;

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.style.backgroundImage = p.image_url ? `url(${p.image_url})` : 'linear-gradient(45deg,#0f1730,#0b1220)';
    card.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'card-body';

    const titleRow = document.createElement('div');
    titleRow.className = 'title-row';
    titleRow.innerHTML = `<strong>${p.title}</strong>`;
    if (p.promo) titleRow.innerHTML += `<span class="badge">-${p.promo}%</span>`;
    body.appendChild(titleRow);

    const typeRow = document.createElement('div');
    typeRow.innerHTML = `<small>${p.type.toUpperCase()} ${p.is_free?'• FREE':''} ${p.is_vip?'• VIP':''}</small>`;
    body.appendChild(typeRow);

    const priceRow = document.createElement('div');
    if (!p.is_free) priceRow.innerHTML = `<strong>${p.price} $</strong>`;
    body.appendChild(priceRow);

    if (p.description) {
      const desc = document.createElement('p');
      desc.style.fontSize='12px';
      desc.textContent = p.description;
      body.appendChild(desc);
    }

    // Tags
    if (p.tags?.length) {
      const tagsRow = document.createElement('div');
      tagsRow.style.marginTop = '6px';
      p.tags.forEach(t => {
        const tspan = document.createElement('span');
        tspan.className = 'badge';
        tspan.textContent = t;
        tagsRow.appendChild(tspan);
      });
      body.appendChild(tagsRow);
    }

    // Actions
    if (isOwner) {
      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => openModal(p);
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn danger';
      delBtn.textContent = 'Delete';
      delBtn.onclick = async () => {
        if (confirm('Delete this product?')) {
          await removeProduct(p.id);
          render();
        }
      };
      actions.appendChild(delBtn);

      body.appendChild(actions);
    }

    card.appendChild(body);
    els.grid.appendChild(card);
  });
}

// ========= FILTERS =========
els.chips.forEach(c => {
  c.addEventListener('click', () => {
    els.chips.forEach(ch => ch.classList.remove('active'));
    c.classList.add('active');
    filter = c.dataset.filter;
    render();
  });
});

els.search.addEventListener('input', e => {
  q = e.target.value.trim();
  render();
});

document.getElementById('resetFilters')?.addEventListener('click', () => {
  filter = 'all';
  q = '';
  els.search.value = '';
  els.chips.forEach(ch => ch.classList.remove('active'));
  els.chips.find(ch => ch.dataset.filter==='all')?.classList.add('active');
  render();
});

// ========= MODAL =========
function openModal(p=null) {
  els.modal.showModal();
  if (!p) {
    els.form.reset();
    els.form.elements['id'].value = '';
    return;
  }
  for (const key in p) {
    if (els.form.elements[key]) {
      els.form.elements[key].value = p[key];
    }
  }
}

els.closeBtn?.addEventListener('click', () => els.modal.close());
els.cancelBtn?.addEventListener('click', () => els.modal.close());

// ========= FORM SUBMIT =========
els.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = els.form.elements;
  const product = {
    id: f['id'].value || null,
    title: f['title'].value,
    type: f['type'].value,
    is_free: f['isFree'].checked,
    price: parseFloat(f['price'].value) || 0,
    promo: parseInt(f['promo'].value) || 0,
    is_vip: f['isVIP'].checked,
    image_url: f['image_url'].value || null,
    media_url: f['media_url'].value || null,
    description: f['description'].value || null,
    tags: (f['tags'].value || '').split(',').map(t=>t.trim()).filter(Boolean),
    platform: f['platform'].value || null,
    version: f['version'].value || null,
    build_number: f['build_number'].value || null,
    file_url: f['file_url'].value || null,
    file_type: f['file_type'].value || null,
    file_size: f['file_size'].value || null
  };
  await saveProduct(product);
  els.modal.close();
  render();
});

// ========= INIT =========
els.addBtn?.addEventListener('click', () => openModal());
initAuth();
render();