// ===============================
//  APP-SECURE.JS — STABLE VERSION
// ===============================

// ---- CONFIG SUPABASE ----
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';

// ---- INITIALIZATION ----
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const OWNER_EMAIL = "joroandriamanirisoa13@gmail.com";

// ---- ELEMENTS ----
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const addProductForm = document.getElementById("add-product-form");
const grid = document.querySelector(".grid");
const productSection = document.getElementById("product-list");
const productFormSection = document.getElementById("product-form");
const loginBtnHeader = document.getElementById("login-btn");

// ---- AUTH STATE ----
let currentUser = null;

// ===============================
//   AUTHENTICATION
// ===============================

// Show modal
function showLogin() {
  loginModal.classList.remove("hidden");
}

// Hide modal
function hideLogin() {
  loginModal.classList.add("hidden");
  loginForm.reset();
}

// Check login state
async function checkAuth() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser && currentUser.email === OWNER_EMAIL) {
    productFormSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginBtnHeader.classList.add("hidden");
  } else {
    productFormSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    loginBtnHeader.classList.remove("hidden");
  }

  loadProducts();
}

// ---- Login form ----
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Login échoué : " + error.message);
  } else {
    hideLogin();
    checkAuth();
  }
});

// ---- Logout ----
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  currentUser = null;
  checkAuth();
});

// ---- Header login ----
loginBtnHeader.addEventListener("click", () => showLogin());

// ===============================
//   PRODUCTS MANAGEMENT
// ===============================

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("id", { ascending: false });

  if (error) {
    console.error("Erreur chargement:", error);
    grid.innerHTML = `<p class="empty">Erreur de chargement.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<p class="empty">Aucun produit pour le moment.</p>`;
    return;
  }

  grid.innerHTML = data
    .map((p) => `
      <div class="product-card">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : `<img src="https://via.placeholder.com/200x150?text=No+Image">`}
        <h3>${p.name}</h3>
        <p>${p.price ? p.price + " Ar" : ""}</p>
        ${currentUser?.email === OWNER_EMAIL ? `
          <button class="delete-btn" onclick="deleteProduct(${p.id})">Supprimer</button>
        ` : ""}
      </div>
    `)
    .join("");
}

// ---- Add Product ----
addProductForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = e.target.name.value.trim();
  const price = e.target.price.value.trim();
  const image_url = e.target.image_url.value.trim();

  if (!name) return alert("Veuillez entrer le nom du produit");

  const { error } = await supabase.from("products").insert([{ name, price, image_url }]);
  if (error) {
    alert("Erreur ajout produit : " + error.message);
  } else {
    e.target.reset();
    loadProducts();
  }
});

// ---- Delete Product ----
async function deleteProduct(id) {
  if (!confirm("Supprimer ce produit ?")) return;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) alert("Erreur suppression : " + error.message);
  else loadProducts();
}

// ===============================
//   START
// ===============================
checkAuth();