/* =======================================================
   Mijoro Boutique — App Secure JS (Full Stable Patch)
   ======================================================= */

/* --- CONFIG SUPABASE --- */
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY_HERE';
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

// Init supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* --- VARIABLES GLOBALES --- */
let session = null;
let isOwner = false;
let products = [];

/* =======================================================
   AUTH MANAGEMENT
   ======================================================= */
async function initAuth() {
  try {
    // 1) Try restoring session
    const { data: sessionData } = await supabase.auth.getSession();
    session = sessionData?.session || null;

    // 2) Fallback getUser
    if (!session) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        session = { user: userData.user };
      }
    }

    computeIsOwner();
    reflectUI();

    // 3) Watch auth changes
    supabase.auth.onAuthStateChange((_event, newSession) => {
      session = newSession || null;
      computeIsOwner();
      reflectUI();
      loadProducts(); // always reload products after auth state change
    });
  } catch (e) {
    console.error('initAuth error:', e);
  }
}

function computeIsOwner() {
  const email = session?.user?.email || '';
  isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

function reflectUI() {
  const loginBtn = document.getElementById('loginBtn');
  const addBtn = document.getElementById('addBtn');
  if (loginBtn) loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  if (addBtn) addBtn.hidden = !isOwner;
}

/* =======================================================
   LOGIN / LOGOUT HANDLER
   ======================================================= */
async function handleLogin() {
  if (session) {
    await supabase.auth.signOut();
    session = null;
    isOwner = false;
    reflectUI();
    return;
  }

  const email = prompt("Ampidiro ny mailakao (Supabase auth magic link)");
  if (!email) return alert("Mail manan-kery no ilaina.");

  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) {
    console.error(error);
    alert("Tsy tafiditra: " + error.message);
  } else {
    alert("Jereo ny mail-nao hanamarinana login (magic link).");
  }
}

/* =======================================================
   LOAD PRODUCTS (READ)
   ======================================================= */
async function loadProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    products = data || [];
    renderProducts();
  } catch (e) {
    console.error('loadProducts error:', e);
  }
}

/* =======================================================
   SAVE PRODUCT (INSERT)
   ======================================================= */
async function saveProduct() {
  if (!isOwner) {
    alert("Tsy afaka manampy produit ianao.");
    return;
  }

  const title = document.getElementById('pTitle').value.trim();
  const price = parseFloat(document.getElementById('pPrice').value.trim()) || 0;
  const desc = document.getElementById('pDesc').value.trim();

  if (!title) return alert("Ampidiro ny anaran'ny produit.");

  try {
    const { error } = await supabase
      .from('products')
      .insert([{ title, price, description: desc, owner: session?.user?.id || null }]);

    if (error) throw error;

    document.getElementById('pTitle').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pDesc').value = '';

    await loadProducts();
    alert("Produit nampidirina tsara!");
  } catch (e) {
    console.error('saveProduct error:', e);
    alert("Nisy olana nandritra ny fanampiana produit.");
  }
}

/* =======================================================
   DELETE PRODUCT
   ======================================================= */
async function deleteProduct(id) {
  if (!isOwner) return alert("Tsy manana alalana ianao.");
  if (!confirm("Esorina tokoa ve ity produit ity?")) return;

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await loadProducts();
  } catch (e) {
    console.error('deleteProduct error:', e);
    alert("Tsy voafafa ny produit.");
  }
}

/* =======================================================
   RENDER PRODUCT LIST
   ======================================================= */
function renderProducts() {
  const list = document.getElementById('productList');
  if (!list) return;

  if (!products.length) {
    list.innerHTML = `<p class="empty">Tsy misy produit hita.</p>`;
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="card">
      <h3>${p.title}</h3>
      <p class="price">${p.price ? p.price + ' Ar' : '---'}</p>
      <p>${p.description || ''}</p>
      ${isOwner ? `<button onclick="deleteProduct(${p.id})" class="delBtn">❌</button>` : ''}
    </div>
  `).join('');
}

/* =======================================================
   INITIALIZE APP
   ======================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadProducts();

  const loginBtn = document.getElementById('loginBtn');
  const addBtn = document.getElementById('addBtn');

  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (addBtn) addBtn.addEventListener('click', saveProduct);
});