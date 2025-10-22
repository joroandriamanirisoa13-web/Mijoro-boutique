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
  const storedSession = localStorage.getItem('supabaseSession');
  if (storedSession) {
    session = JSON.parse(storedSession);
    supabase.auth.setSession(session);
  } else {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }
  computeIsOwner();
  reflectUI();
}

function computeIsOwner() {
  const email = session?.user?.email || '';
  isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

function reflectUI() {
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  if (els.addBtn) els.addBtn.hidden = !isOwner;
}

// Login / Logout
els.loginBtn?.addEventListener('click', async () => {
  if (session) {
    await supabase.auth.signOut();
    session = null;
    localStorage.removeItem('supabaseSession');
    reflectUI();
    render();
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
  const email = loginEmail.value.trim();
  const password = loginPass.value;
  if (!email || !password) { alert('Fenoy email sy password'); return; }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert('Login failed: ' + error.message); return; }
  session = data.session;
  localStorage.setItem('supabaseSession', JSON.stringify(session));
  computeIsOwner();
  reflectUI();
  loginModal.close();
  await render();
});

// ========= DB HELPERS =========
async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { alert('listProducts error: ' + error.message); return []; }
  return data || [];
}

async function saveProduct(p) {
  if (!isOwner || !session) { alert('Owner only'); return; }
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
  let err;
  if (p.id) {
    ({ error: err } = await supabase.from('products').update(payload).eq('id', p.id));
  } else {
    ({ error: err } = await supabase.from('products').insert(payload));
  }
  if (err) { alert('Save product error: ' + err.message); return; }
}

// ========= RENDER FIX =========
async function render() {
  const items = (await listProducts()).filter(matchFilters);
  els.grid.innerHTML = '';
  if (!items.length) { els.empty.hidden = false; return; }
  els.empty.hidden = true;
  for (const p of items) {
    const card = document.createElement('div'); card.className = 'card';
    const thumb = document.createElement('div'); thumb.className = 'thumb';
    if (p.image_url) thumb.style.backgroundImage = `url("${p.image_url}")`;
    const body = document.createElement('div'); body.className = 'card-body';
    const row = document.createElement('div'); row.className = 'title-row';
    const h = document.createElement('h4'); h.textContent = p.title;
    const badges = document.createElement('div');
    const btype = document.createElement('span'); btype.className='badge'; btype.textContent=p.type.toUpperCase(); badges.appendChild(btype);
    if (p.is_vip){ const b=document.createElement('span'); b.className='badge'; b.textContent='VIP'; badges.appendChild(b); }
    if (p.is_free){ const b=document.createElement('span'); b.className='badge'; b.textContent='FREE'; badges.appendChild(b); }
    if (p.type==='app' && p.platform){ const b=document.createElement('span'); b.className='badge'; b.textContent=p.platform.toUpperCase(); badges.appendChild(b); }
    row.append(h,badges);
    const desc = document.createElement('p'); desc.textContent = p.description||'';
    const price = document.createElement('div'); price.textContent = priceText(p);
    const actions = document.createElement('div'); actions.className='card-actions';
    const openBtn = document.createElement('a'); openBtn.className='btn'; openBtn.target='_blank'; openBtn.rel='noopener';
    if (p.type==='video' && p.media_url){ openBtn.textContent='Play'; openBtn.href=p.media_url; }
    else if (p.type==='ebook' && p.media_url?.toLowerCase().endsWith('.pdf')){ openBtn.textContent='Read PDF'; openBtn.href=p.media_url; }
    else if (p.type==='app' && p.file_url){ openBtn.textContent='Download'; openBtn.href=p.file_url; openBtn.setAttribute('download',''); }
    else { openBtn.textContent='Open'; openBtn.href=p.media_url || p.image_url || '#'; }
    actions.appendChild(openBtn);
    if (isOwner){
      const edit = document.createElement('button'); edit.className='btn'; edit.textContent='Edit'; edit.onclick=()=>openModal('edit', p.id, p);
      const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.onclick=async()=>{ if(confirm(`Supprimer "${p.title}" ?`)){ await removeProduct(p.id); await render(); } };
      actions.append(edit,del);
    }
    body.append(row,desc,price); card.append(thumb,body,actions); els.grid.appendChild(card);
  }
}

// ========= START =========
initAuth().then(render);