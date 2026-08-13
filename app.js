import firebase from "./firebase.js";

const {
  auth,
  db,
  cloudinaryConfig,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc
} = firebase;

const state = {
  sort: localStorage.getItem("skyshop_sort") || "default",
  user: null,
  profile: null,
  restriction: null,
  products: [],
  cart: JSON.parse(localStorage.getItem("skyshop_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("skyshop_wishlist") || "[]"),
  theme: localStorage.getItem("skyshop_theme") || "light",
  lang: localStorage.getItem("skyshop_lang") || "en",
  site: {
    name: "SkyShop",
    logoUrl: "",
    primaryColor: "#6c5ce7",
    secondaryColor: "#00c2ff",
    currency: "EGP",
    currencySymbol: "ج.م"
  }
};


const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const money = n => `${Number(n || 0).toLocaleString("en-US")} ${state.site.currencySymbol}`;
const save = () => {
  localStorage.setItem("skyshop_cart", JSON.stringify(state.cart));
  localStorage.setItem("skyshop_wishlist", JSON.stringify(state.wishlist));
  localStorage.setItem("skyshop_theme", state.theme);
};


const sound = {
  ctx: null,
  ready: false,
  init(){
    if(this.ready) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ready = true;
    } catch(_) {}
  },
  play(type="click"){
    try{
      this.init();
      if(!this.ctx) return;
      if(this.ctx.state==="suspended") this.ctx.resume().catch(()=>{});
      const now=this.ctx.currentTime;
      const osc=this.ctx.createOscillator(), gain=this.ctx.createGain();
      const presets={
        click:[520,.035,"sine"],
        add:[680,.06,"sine"],
        success:[740,.09,"sine"],
        error:[180,.12,"sawtooth"],
        pop:[420,.045,"triangle"]
      };
      const [freq,dur,wave]=presets[type]||presets.click;
      osc.type=wave; osc.frequency.setValueAtTime(freq,now);
      if(type==="success") osc.frequency.exponentialRampToValueAtTime(980,now+dur);
      if(type==="error") osc.frequency.exponentialRampToValueAtTime(120,now+dur);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.045,now+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now); osc.stop(now+dur+.02);
    }catch(_){}
  }
};
function playSound(type){ sound.play(type); }

function hideLoader() {
  clearTimeout(window.__SKYSHOP_LOADER_FAILSAFE__);
  const loader = $("#app-loader");
  if (!loader) return;
  loader.classList.add("is-hidden");
  setTimeout(() => loader.remove(), 700);
}

function toast(message, type="success") {
  playSound(type==="error"?"error":type==="success"?"success":"click");
  const root = $("#toast-root");
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.innerHTML = `<span>${type==="success"?"✓":type==="error"?"!":"i"}</span><b>${escapeHtml(message)}</b>`;
  root.appendChild(item);
  requestAnimationFrame(() => item.classList.add("show"));
  setTimeout(() => { item.classList.remove("show"); setTimeout(()=>item.remove(),300); }, 3200);
}

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, "products"));
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.isActive !== false);
    if (products.length) return products;
  } catch (_) {}

  // Local fallback keeps the storefront previewable before Firestore is seeded.
  try {
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Fallback catalog unavailable");
    const data = await res.json();
    const list = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
    return list.filter(p => p && p.isActive !== false).map((p, i) => ({ id: String(p.id ?? `local-${i+1}`), ...p }));
  } catch (_) {
    return [];
  }
}

async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "main"));
    if (snap.exists()) state.site = {...state.site, ...snap.data()};
  } catch (_) {}
  document.documentElement.style.setProperty("--primary", state.site.primaryColor || "#6c5ce7");
  document.documentElement.style.setProperty("--secondary", state.site.secondaryColor || "#00c2ff");
  document.title = state.site.name || "SkyShop";
}


const i18n={
 en:{home:"Home",shop:"Shop",wishlist:"Wishlist",cart:"Cart",profile:"Profile",orders:"Orders",notifications:"Notifications",login:"Sign in",logout:"Sign out",add:"Add to cart",reviews:"Ratings & reviews",track:"Track order",allProducts:"All products",noProducts:"No products yet",noProductsText:"Products added by the administrator will appear here.",accountBlocked:"Account blocked",accountSuspended:"Account suspended",language:"Language"},
 ar:{home:"الرئيسية",shop:"المتجر",wishlist:"المفضلة",cart:"السلة",profile:"الحساب",orders:"الطلبات",notifications:"الإشعارات",login:"تسجيل الدخول",logout:"تسجيل الخروج",add:"أضف إلى السلة",reviews:"التقييمات والمراجعات",track:"تتبع الطلب",allProducts:"كل المنتجات",noProducts:"لا توجد منتجات بعد",noProductsText:"ستظهر المنتجات التي يضيفها المسؤول هنا.",accountBlocked:"الحساب محظور",accountSuspended:"الحساب موقوف",language:"اللغة"},
 fr:{home:"Accueil",shop:"Boutique",wishlist:"Favoris",cart:"Panier",profile:"Profil",orders:"Commandes",notifications:"Notifications",login:"Connexion",logout:"Déconnexion",add:"Ajouter au panier",reviews:"Avis clients",track:"Suivre la commande",allProducts:"Tous les produits",noProducts:"Aucun produit",noProductsText:"Les produits ajoutés par l'administrateur apparaîtront ici.",accountBlocked:"Compte bloqué",accountSuspended:"Compte suspendu",language:"Langue"}
};
function t(key){return i18n[state.lang]?.[key]||i18n.en[key]||key;}
function setLanguage(lang){
  state.lang=i18n[lang]?lang:"en";
  localStorage.setItem("skyshop_lang",state.lang);
  document.documentElement.lang=state.lang;
  document.documentElement.dir=state.lang==="ar"?"rtl":"ltr";
}

function setTheme() {
  setLanguage(state.lang);
  document.documentElement.dataset.theme = state.theme;
  save();
}

function shell(content, active="home") {
  const cartCount = state.cart.reduce((s,x)=>s+x.qty,0);
  return `
    <header class="nav">
      <a class="brand" href="#/home" aria-label="SkyShop home"><span class="brand-mark">S</span><span>Sky<span class="brand-accent">Shop</span></span></a>
      <nav class="nav-links" aria-label="Primary navigation">
        <a class="${active==="home"?"active":""}" href="#/home">${t("home")}</a>
        <a class="${active==="shop"?"active":""}" href="#/shop">${t("shop")}</a>
        <a href="#/shop?category=Tech">Tech</a>
        <a href="#/shop?category=Fashion">Fashion</a>
      </nav>
      <div class="nav-actions">
        <button class="icon-btn nav-desktop-control" data-action="theme" aria-label="Toggle theme">${state.theme==="dark"?"☀":"☾"}</button>
        <select class="language-select nav-desktop-control" data-language aria-label="${t("language")}"><option value="en" ${state.lang==="en"?"selected":""}>EN</option><option value="ar" ${state.lang==="ar"?"selected":""}>AR</option><option value="fr" ${state.lang==="fr"?"selected":""}>FR</option></select>
        <button class="icon-btn nav-desktop-control" data-action="search" aria-label="Search">⌕</button>
        <a class="icon-btn nav-desktop-control" href="#/wishlist" aria-label="Wishlist">♡</a>
        <a class="cart-pill" href="#/cart" aria-label="Cart">🛒 <b>${cartCount}</b></a>
        ${state.user ? `<a class="avatar nav-desktop-control" href="#/profile" title="${escapeHtml(state.profile?.displayName || state.user.email)}">${escapeHtml((state.profile?.displayName||state.user.email||"U").charAt(0).toUpperCase())}</a>` : `<a class="login-mini nav-desktop-control" href="#/login">${t("login")}</a>`}
        <button class="mobile-menu-toggle" data-action="open-menu" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-nav-drawer"><span></span><span></span><span></span></button>
      </div>
    </header>
    <div class="mobile-nav-overlay" data-action="close-menu" aria-hidden="true"></div>
    <aside class="mobile-nav-drawer" id="mobile-nav-drawer" aria-hidden="true" aria-label="Mobile navigation">
      <div class="mobile-nav-head">
        <a class="brand" href="#/home" data-action="close-menu"><span class="brand-mark">S</span><span>Sky<span class="brand-accent">Shop</span></span></a>
        <button class="mobile-menu-close" data-action="close-menu" aria-label="Close navigation menu">×</button>
      </div>
      <nav class="mobile-nav-links">
        <a class="${active==="home"?"active":""}" href="#/home">${t("home")}<span>→</span></a>
        <a class="${active==="shop"?"active":""}" href="#/shop">${t("shop")}<span>→</span></a>
        <a href="#/shop?category=Tech">Tech<span>→</span></a>
        <a href="#/shop?category=Fashion">Fashion<span>→</span></a>
        <a href="#/wishlist">${t("wishlist")}<span>♡</span></a>
        <a href="#/orders">${t("orders")}<span>→</span></a>
        <a href="#/notifications">${t("notifications")}<span>→</span></a>
        <a href="#/profile">${t("profile")}<span>→</span></a>
      </nav>
      <div class="mobile-nav-tools">
        <button class="mobile-tool" data-action="theme">${state.theme==="dark"?"☀":"☾"} <span>${state.theme==="dark"?"Light mode":"Dark mode"}</span></button>
        <label class="mobile-tool">🌐 <span>${t("language")}</span><select data-language><option value="en" ${state.lang==="en"?"selected":""}>English</option><option value="ar" ${state.lang==="ar"?"selected":""}>العربية</option><option value="fr" ${state.lang==="fr"?"selected":""}>Français</option></select></label>
        ${state.user ? `<a class="mobile-account" href="#/profile">${escapeHtml(state.profile?.displayName || state.user.email)}</a>` : `<a class="mobile-account" href="#/login">${t("login")}</a>`}
      </div>
    </aside>
    <main>${content}</main>
    <footer class="footer">
      <div><div class="brand"><span class="brand-mark">S</span><span>Sky<span class="brand-accent">Shop</span></span></div><p>Premium shopping, designed for everyday life.</p></div>
      <div><b>Explore</b><a href="#/shop">Shop</a><a href="#/wishlist">Wishlist</a><a href="#/cart">Cart</a></div>
      <div><b>Account</b><a href="#/profile">Profile</a><a href="#/orders">Orders</a><a href="#/notifications">Notifications</a><a href="#/login">Login</a></div>
      <div><b>Support</b><span>support@skyshop.local</span><span>Available every day</span></div>
    </footer>
  `;
}

function searchModal() {
  const current = new URLSearchParams(location.hash.split("?")[1] || "").get("q") || "";
  const results = state.products.filter(p => {
    const hay = `${p.name||""} ${p.category||""} ${p.description||""}`.toLowerCase();
    return current.trim() && hay.includes(current.trim().toLowerCase());
  }).slice(0, 6);
  document.body.insertAdjacentHTML("beforeend", `
    <div class="search-modal-backdrop" data-action="close-search">
      <section class="search-modal" role="dialog" aria-modal="true" aria-labelledby="sky-search-title" onclick="event.stopPropagation()">
        <div class="search-modal-head"><div><span class="eyebrow">DISCOVER</span><h2 id="sky-search-title">Search SkyShop</h2></div><button class="modal-x" data-action="close-search" aria-label="Close search">×</button></div>
        <form class="search-form" id="sky-search-form"><input name="q" value="${escapeHtml(current)}" placeholder="Search products, categories…" autocomplete="off" autofocus><button class="btn primary" type="submit">Search</button></form>
        <div class="search-results">${results.map(p => { const image=p.coverImage||p.image||(Array.isArray(p.images)?p.images[0]:""); return `<a href="#/product?id=${encodeURIComponent(p.id)}" data-action="close-search" class="search-result"><img src="${escapeHtml(image)}" alt=""><span><b>${escapeHtml(p.name||"Untitled")}</b><small>${escapeHtml(p.category||"SkyShop")}</small></span><strong>${money(p.price)}</strong></a>`; }).join("") || `<div class="search-empty"><b>Nothing found yet</b><span>Try a product name or category.</span></div>`}</div>
      </section>
    </div>`);
}

function productCard(p) {
  const wished = state.wishlist.includes(p.id);
  const cover=p.coverImage||p.image||(Array.isArray(p.images)?p.images[0]:"");
  const stock=Number(p.stock||0);
  return `<article class="product-card reveal" data-product-card="${escapeHtml(p.id)}">
    <div class="product-media">
      ${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : ""}
      <button class="wish ${wished?"active":""}" data-wish="${p.id}" aria-label="Wishlist">${wished?"♥":"♡"}</button>
      ${cover ? `<img loading="lazy" src="${escapeHtml(cover)}" alt="${escapeHtml(p.name || "SkyShop product")}" onerror="this.classList.add('image-failed');this.removeAttribute('src')">` : `<div class="product-image-placeholder" aria-label="Product image unavailable"><span>Sky<span>Shop</span></span></div>`}
      <button class="quick-add" data-add="${p.id}" ${stock<=0?"disabled":""}>${stock<=0?"Out of stock":t("add")}</button>
    </div>
    <div class="product-info">
      <small>${escapeHtml(p.category||"")}</small>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="rating">★ ${Number(p.rating||0).toFixed(1)} <span>(${Number(p.reviewCount||0)})</span></div>
      <div class="price-row"><strong>${money(p.price)}</strong>${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:""}</div>
      <small class="stock-label ${stock<5?"low":""}">${stock>0?`${stock} in stock`:"Out of stock"}</small>
    </div>
  </article>`;
}

function homePage() {
  const featured = state.products.slice(0,4);
  return shell(`
    <section class="hero">
      <div class="hero-copy reveal">
        <span class="eyebrow">THE NEW STANDARD OF SHOPPING</span>
        <h1>Find your next <em>favorite.</em></h1>
        <p>Curated products, expressive design, and a checkout experience that simply gets out of the way.</p>
        <div class="hero-actions"><a class="btn primary" href="#/shop">Explore collection <span>→</span></a><a class="btn ghost" href="#/shop?category=Tech">Discover tech</a></div>
        <div class="hero-stats"><span><b>4.9/5</b> customer rating</span><span><b>24h</b> fast dispatch</span></div>
      </div>
      <div class="hero-art reveal"><div class="orb orb-a"></div><div class="orb orb-b"></div><div class="hero-card"><span>SKY SELECT</span><strong>Made to<br>stand out.</strong><small>01 / 04</small></div></div>
    </section>
    <section class="section">
      <div class="section-head"><div><span class="eyebrow">CURATED FOR YOU</span><h2>Featured picks</h2></div><a href="#/shop">View all →</a></div>
      <div class="product-grid">${featured.map(productCard).join("")}</div>
    </section>
    <section class="promo reveal"><div><span class="eyebrow">SKYSHOP ESSENTIALS</span><h2>Less noise.<br><em>Better choices.</em></h2><p>Premium essentials selected for style, utility and everyday performance.</p><a class="btn light" href="#/shop">Shop essentials</a></div><div class="promo-shape"></div></section>
    <section class="section"><div class="section-head"><div><span class="eyebrow">WHY SKYSHOP</span><h2>Designed around you</h2></div></div><div class="feature-grid">
      <div class="feature"><span>01</span><h3>Curated quality</h3><p>We focus on products worth keeping, not endless scrolling.</p></div>
      <div class="feature"><span>02</span><h3>Simple checkout</h3><p>Flexible payment options and a clean, frictionless flow.</p></div>
      <div class="feature"><span>03</span><h3>Human support</h3><p>Real help when you need it, from order to delivery.</p></div>
    </div></section>
  `);
}

function shopPage() {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const cat = params.get("category") || "";
  let list = state.products.filter(p => !cat || p.category === cat);
  return shell(`
    <section class="page-head"><span class="eyebrow">DISCOVER</span><h1>${cat ? escapeHtml(cat) : "All products"}</h1><p>Explore the latest SkyShop collection.</p></section>
    <section class="section shop-layout">
      <aside class="filters"><b>Categories</b><a href="#/shop">All</a><a href="#/shop?category=Tech">Tech</a><a href="#/shop?category=Fashion">Fashion</a><a href="#/shop?category=Footwear">Footwear</a><a href="#/shop?category=Accessories">Accessories</a><a href="#/shop?category=Home">Home</a></aside>
      <div><div class="shop-toolbar"><span>${list.length} products</span><button class="btn small ghost" data-action="sort">Sort by price</button></div><div class="product-grid">${list.length ? list.map(productCard).join("") : `<div class="catalog-empty"><div class="big404">✦</div><h2>No products yet</h2><p>SkyShop is ready. Products added by the administrator will appear here.</p></div>`}</div></div>
    </section>
  `);
}

function cartPage() {
  const items = state.cart.map(x => ({...x, product: state.products.find(p=>p.id===x.id)})).filter(x=>x.product);
  const subtotal = items.reduce((s,x)=>s+x.product.price*x.qty,0);
  const shipping = subtotal ? (subtotal >= 3000 ? 0 : 99) : 0;
  return shell(`
    <section class="page-head"><span class="eyebrow">YOUR BAG</span><h1>Shopping cart</h1></section>
    <section class="section cart-layout">
      <div class="cart-list">${items.length ? items.map(x=>`<div class="cart-item"><img src="${x.product.image}" alt=""><div class="cart-meta"><h3>${escapeHtml(x.product.name)}</h3><small>${escapeHtml(x.product.category)}</small><strong>${money(x.product.price)}</strong></div><div class="qty"><button data-qty="${x.id}" data-delta="-1">−</button><b>${x.qty}</b><button data-qty="${x.id}" data-delta="1">+</button></div><button class="remove" data-remove="${x.id}">Remove</button></div>`).join("") : `<div class="empty"><div>🛍️</div><h2>Your cart is empty</h2><p>Add something beautiful.</p><a class="btn primary" href="#/shop">Browse products</a></div>`}</div>
      <aside class="summary"><h2>Order summary</h2><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div><span>Shipping</span><b>${shipping?money(shipping):"Free"}</b></div><hr><div class="total"><span>Total</span><strong>${money(subtotal+shipping)}</strong></div><a class="btn primary full" href="${items.length?"#/checkout":"#/shop"}">${items.length?"Checkout":"Continue shopping"} →</a></aside>
    </section>
  `);
}


function restrictionPage(kind){
  const blocked = kind==="blocked";
  return `<div class="restriction-screen ${blocked?"blocked":"suspended"}">
    <div class="restriction-card reveal visible">
      <div class="restriction-orb">${blocked?"⛔":"⏸"}</div>
      <span class="eyebrow">${blocked?"ACCOUNT BLOCKED":"ACCOUNT SUSPENDED"}</span>
      <h1>${blocked?"Access to SkyShop is blocked.":"Your SkyShop account is temporarily suspended."}</h1>
      <p>${blocked
        ?"This account has been blocked by the administration and cannot access the store. Access will return only after an administrator removes the block."
        :"Your account is currently suspended. Shopping, checkout, reviews, wishlist and other interactions are disabled until an administrator restores your account."}</p>
      <div class="restriction-status">${escapeHtml(state.profile?.adminNote||"Please contact SkyShop support if you believe this is a mistake.")}</div>
      <button class="btn primary" data-action="logout">Sign out</button>
    </div>
  </div>`;
}
function isRestricted(){ return state.restriction==="blocked" || state.restriction==="suspended"; }

function authPage(mode="login") {
  const register = mode === "register";
  return `<div class="auth-page"><div class="auth-panel reveal"><a class="brand center" href="#/home"><span class="brand-mark">S</span><span>Sky<span class="brand-accent">Shop</span></span></a><span class="eyebrow">${register?"JOIN SKYSHOP":"WELCOME BACK"}</span><h1>${register?"Create your account":"Sign in"}</h1><p>${register?"Start your premium shopping journey.":"Access your orders, wishlist and account."}</p>
  <form id="auth-form">${register?`<label>Name<input name="name" required minlength="2" autocomplete="name" placeholder="Your name"></label>`:""}<label>Email<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label><label>Password<input type="password" name="password" required minlength="6" autocomplete="${register?"new-password":"current-password"}" placeholder="••••••••"></label>${register?`<label>Phone<input name="phone" autocomplete="tel" placeholder="01xxxxxxxxx"></label>`:""}<button class="btn primary full" type="submit">${register?"Create account":"Sign in"} <span>→</span></button></form>
  <div class="auth-switch">${register?"Already have an account?":"New to SkyShop?"} <a href="#/${register?"login":"register"}">${register?"Sign in":"Create account"}</a></div>
  <div id="auth-error" class="form-error" role="alert"></div></div></div>`;
}


async function productPage(id){
  const p=state.products.find(x=>x.id===id);
  if(!p) return notFound();
  let reviews=[];
  try{
    const snap=await getDocs(collection(db,"reviews"));
    reviews=snap.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.productId===id && r.status!=="hidden");
  }catch(_){}
  const avg=reviews.length?reviews.reduce((sum,r)=>sum+Number(r.rating||0),0)/reviews.length:Number(p.rating||0);
  const gallery=[p.coverImage||p.image,...(Array.isArray(p.images)?p.images:[])].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);
  const stock=Number(p.stock||0);
  const userReview=state.user?reviews.find(r=>r.userId===state.user.uid):null;
  return shell(`<section class="section product-detail">
    <div class="product-gallery">
      <div class="gallery-main"><img id="gallery-main-image" src="${escapeHtml(gallery[0]||"")}" alt="${escapeHtml(p.name)}"></div>
      <div class="gallery-thumbs">${gallery.map((img,i)=>`<button class="gallery-thumb ${i===0?"active":""}" data-gallery-image="${escapeHtml(img)}"><img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)} image ${i+1}" loading="lazy"></button>`).join("")}</div>
    </div>
    <div class="detail-copy">
      <span class="eyebrow">${escapeHtml(p.category||"SkyShop")}</span><h1>${escapeHtml(p.name)}</h1>
      <div class="detail-rating"><span>★ ${avg.toFixed(1)}</span><small>${reviews.length} reviews</small></div>
      <p class="detail-description">${escapeHtml(p.description||"A premium SkyShop selection.")}</p>
      <div class="detail-price">${money(p.price)} ${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:""}</div>
      <div class="product-stock ${stock<5?"low":""}">${stock>0?`✓ ${stock} available`:"✕ Out of stock"}</div>
      <div class="detail-actions"><button class="btn primary" data-add="${p.id}" ${stock<=0?"disabled":""}>${stock>0?t("add"):"Out of stock"}</button><button class="btn ghost" data-wish="${p.id}">${state.wishlist.includes(p.id)?"♥ Saved":"♡ Wishlist"}</button></div>
    </div>
  </section>
  <section class="section reviews-section">
    <div class="section-head"><div><span class="eyebrow">CUSTOMER VOICE</span><h2>${t("reviews")}</h2></div><div class="review-summary"><strong>${avg.toFixed(1)}</strong><span>★</span><small>${reviews.length}</small></div></div>
    ${state.user&&!userReview&&!isRestricted()?`<form id="review-form" class="review-form" data-product-id="${escapeHtml(p.id)}">
      <div class="review-stars-label"><b>Your rating</b><div class="stars-input">${[1,2,3,4,5].map(n=>`<button type="button" data-rating="${n}">★</button>`).join("")}</div><input type="hidden" name="rating" value="5"></div>
      <label><span>Comment</span><textarea name="comment" maxlength="1000" required placeholder="Share your experience with this product…"></textarea></label>
      <label class="upload-drop"><span>📷 Add a photo</span><input type="file" name="image" accept="image/png,image/jpeg,image/webp"><small>Optional · JPG, PNG or WebP</small></label>
      <div id="review-preview" class="review-preview"></div>
      <button class="btn primary" type="submit">Publish review</button>
    </form>`:userReview?`<div class="already-reviewed">You already reviewed this product.</div>`:""}
    <div class="reviews-list">${reviews.length?reviews.map(r=>`<article class="review-card"><div class="review-avatar">${escapeHtml((r.userName||"U")[0].toUpperCase())}</div><div><div class="review-meta"><b>${escapeHtml(r.userName||"Customer")}</b><span>${"★".repeat(Number(r.rating||0))}${"☆".repeat(5-Number(r.rating||0))}</span></div><p>${escapeHtml(r.comment||"")}</p>${r.imageUrl?`<img src="${escapeHtml(r.imageUrl)}" alt="Customer review" loading="lazy">`:""}</div></article>`).join(""):`<div class="empty"><h2>No reviews yet</h2><p>Be the first to review this product.</p></div>`}</div>
  </section>`);
}

function profilePage() {
  if (!state.user) return authPage("login");
  const p = state.profile || {};
  return shell(`<section class="page-head"><span class="eyebrow">ACCOUNT</span><h1>Your profile</h1></section><section class="section profile-card"><div class="avatar large">${escapeHtml((p.displayName||state.user.email||"U").charAt(0).toUpperCase())}</div><div><h2>${escapeHtml(p.displayName||"SkyShop customer")}</h2><p>${escapeHtml(state.user.email||"")}</p><p>Account status: <b>${escapeHtml(p.status||"active")}</b></p><button class="btn primary" data-action="logout">Sign out</button></div></section>`);
}

function wishlistPage() {
  const list = state.products.filter(p=>state.wishlist.includes(p.id));
  return shell(`<section class="page-head"><span class="eyebrow">SAVED</span><h1>Wishlist</h1></section><section class="section"><div class="product-grid">${list.length?list.map(productCard).join(""):`<div class="empty"><div>♡</div><h2>Your wishlist is empty</h2><a class="btn primary" href="#/shop">Explore products</a></div>`}</div></section>`);
}

function checkoutPage() {
  if (!state.cart.length) return `<div class="empty page-empty"><h2>Your cart is empty</h2><a class="btn primary" href="#/shop">Shop now</a></div>`;
  const items = state.cart.map(x => ({...x, product: state.products.find(p => p.id === x.id)})).filter(x => x.product);
  const subtotal = items.reduce((sum,x)=>sum + Number(x.product.price||0)*Number(x.qty||0),0);
  const shipping = subtotal ? (subtotal >= 3000 ? 0 : 99) : 0;
  const personal = calculateDiscountedTotal(subtotal);
  const finalTotal = Math.max(0, personal.finalTotal + shipping);
  return shell(`<section class="page-head"><span class="eyebrow">SECURE CHECKOUT</span><h1>Complete your order</h1></section><section class="section checkout-layout">
    <form id="checkout-form" class="checkout-form">
      <h2>Delivery details</h2>
      <label>Full name<input name="name" required value="${escapeHtml(state.profile?.displayName||"")}"></label>
      <label>Phone<input name="phone" required value="${escapeHtml(state.profile?.phone||"")}"></label>
      <label>Second contact<input name="phone2" placeholder="Optional"></label>
      <label>Delivery location<textarea name="address" required placeholder="City, area, street, building..."></textarea></label>
      <label>Payment method<select name="payment" required><option>Cash on Delivery</option><option>Vodafone Cash</option><option>Etisalat Cash</option><option>Orange Cash</option><option>WE Pay</option><option>InstaPay</option><option>Bank Transfer</option></select></label>
      <div id="transfer-fields" class="transfer-fields hidden"><label>Transferred number<input name="transferredNumber"></label><label>Transaction ID<input name="transactionId"></label><label>Receipt image<input type="file" name="receipt" accept="image/*"></label></div>
      <button class="btn primary full" type="submit">Place order · ${money(finalTotal)}</button>
    </form>
    <aside class="summary">
      <h2>Order total</h2>
      <div><span>Items</span><b>${items.reduce((sum,x)=>sum+x.qty,0)}</b></div>
      <div><span>Original total</span><b>${money(subtotal)}</b></div>
      ${personal.discountPercent ? `<div class="discount-line"><span>Permanent discount (${personal.discountPercent}%)</span><b>− ${money(personal.discountAmount)}</b></div>` : ""}
      <div><span>Shipping</span><b>${shipping?money(shipping):"Free"}</b></div>
      <hr><div class="total"><span>Amount to pay</span><strong>${money(finalTotal)}</strong></div>
    </aside>
  </section>`);
}

async function notificationsPage(){
 if(!state.user) return authPage("login");
 let list=[];
 try{const snap=await getDocs(collection(db,"users",state.user.uid,"notifications"));list=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));}catch(_){}
 const cards=list.length?list.map(n=>`<article class="notification-card ${n.isRead?"read":"unread"}" data-notification-open="${n.id}">
   <div class="notification-icon">${n.type==="promotion"?"%":n.type==="order"?"▣":"✦"}</div>
   <div class="notification-body"><div class="notification-top"><span class="eyebrow">${escapeHtml(n.type||"info")}</span><small>${n.createdAt?.toDate?n.createdAt.toDate().toLocaleString():"Just now"}</small></div><h3>${escapeHtml(n.title||"SkyShop notification")}</h3><p>${escapeHtml(n.message||"")}</p></div>
   <button class="notification-delete" data-notification-delete="${n.id}" aria-label="Delete">×</button>
 </article>`).join(""):`<div class="empty"><h2>No notifications</h2><p>You're all caught up.</p></div>`;
 return shell(`<section class="page-head"><span class="eyebrow">YOUR INBOX</span><h1>${t("notifications")}</h1><p>Offers, order updates and messages from SkyShop.</p></section><section class="section notifications-list">${cards}</section><div id="notification-modal-root"></div>`);
}

async function ordersPage() {
  if(!state.user) return authPage("login");
  let list=[];
  try{
    const snap=await getDocs(collection(db,"orders"));
    list=snap.docs.map(d=>({id:d.id,...d.data()})).filter(o=>o.userId===state.user.uid).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0));
  }catch(_){}
  if(!list.length) return shell(`<section class="page-head"><span class="eyebrow">HISTORY</span><h1>${t("orders")}</h1></section><section class="section"><div class="empty"><div>📦</div><h2>No orders yet</h2><a class="btn primary" href="#/shop">Start shopping</a></div></section>`);
  const statuses=["pending","confirmed","processing","shipped","delivered"];
  return shell(`<section class="page-head"><span class="eyebrow">ORDER TRACKING</span><h1>${t("orders")}</h1><p>Follow every order from confirmation to delivery.</p></section><section class="section orders-list">${list.map(o=>{
    const current=statuses.indexOf(o.status); const cancelled=o.status==="cancelled";
    return `<article class="order-card"><div class="order-head"><div><b>${escapeHtml(o.orderNumber||o.id)}</b><small>${o.createdAt?.toDate?o.createdAt.toDate().toLocaleString():""}</small></div><strong>${money(o.finalTotal??o.total)}</strong></div>
    <div class="order-items">${(o.items||[]).slice(0,3).map(i=>`<div><img src="${escapeHtml(i.image||"")}" alt=""><span>${escapeHtml(i.name||"Product")} × ${i.quantity}</span></div>`).join("")}</div>
    <div class="order-tracker ${cancelled?"cancelled":""}">${cancelled?`<div class="tracker-cancelled">Order cancelled</div>`:statuses.map((st,i)=>`<div class="tracker-step ${i<=current?"done":""}"><span>${i<current?"✓":i===current?"●":"○"}</span><small>${st}</small></div>`).join("")}</div>
    <div class="order-meta"><span>Payment: ${escapeHtml(o.paymentMethodName||"—")}</span><span>Delivery: ${escapeHtml(o.deliveryAddress||"—")}</span></div></article>`;
  }).join("")}</section>`);
}


async function openNotification(id){
  const ref=doc(db,"users",state.user.uid,"notifications",id);
  const snap=await getDoc(ref); if(!snap.exists()) return;
  const n={id:snap.id,...snap.data()};
  await updateDoc(ref,{isRead:true}).catch(()=>{});
  const root=$("#notification-modal-root"); if(!root) return;
  root.innerHTML=`<div class="notification-modal-backdrop"><div class="notification-modal"><button data-action="close-notification">×</button><span class="eyebrow">${escapeHtml(n.type||"info")}</span><h2>${escapeHtml(n.title||"Notification")}</h2><p>${escapeHtml(n.message||"")}</p>${n.imageUrl?`<img src="${escapeHtml(n.imageUrl)}" alt="${escapeHtml(n.title||"Notification")}">`:""}${n.actionUrl?`<a class="btn primary" href="${escapeHtml(n.actionUrl)}">${escapeHtml(n.actionLabel||"Open")}</a>`:""}</div></div>`;
}

function notFound() {
  return shell(`<section class="empty page-empty"><div class="big404">404</div><h1>Page not found</h1><p>The page you requested does not exist.</p><a class="btn primary" href="#/home">Back home</a></section>`);
}

function showAppError(err){
  console.error("SkyShop error:", err);
  const app=$("#app");
  if(app) app.innerHTML=`<section class="empty page-empty"><div class="big404">!</div><h1>SkyShop could not load</h1><p>${escapeHtml(err?.message||"Unexpected application error.")}</p><button class="btn primary" onclick="location.reload()">Reload</button></section>`;
  hideLoader();
}
async function render() {
  setTheme();
  const app = $("#app");
  if(!app) throw new Error("SkyShop root element #app was not found.");
  if(isRestricted()){ app.innerHTML=restrictionPage(state.restriction); setTimeout(()=>$$(".reveal").forEach(el=>el.classList.add("visible")),30); return; }
  const raw = location.hash.slice(2) || "home";
  const path = raw.split("?")[0];
  let html;
  if (path==="home") html=homePage();
  else if (path==="shop") html=shopPage();
  else if (path==="cart") html=cartPage();
  else if (path==="checkout") html=checkoutPage();
  else if (path==="login") html=authPage("login");
  else if (path==="register") html=authPage("register");
  else if (path==="profile") html=profilePage();
  else if (path==="wishlist") html=wishlistPage();
  else if (path==="orders") html=ordersPage();
  else if (path==="notifications") html=await notificationsPage();
  else if (path==="product") html=await productPage(new URLSearchParams(raw.split("?")[1]||"").get("id"));
  else html=notFound();
  app.innerHTML = html;
  setTimeout(()=>$$(".reveal").forEach(el=>el.classList.add("visible")),30);
}

function addToCart(id) {
  const item = state.cart.find(x=>x.id===id);
  if (item) item.qty += 1; else state.cart.push({id,qty:1});
  save(); toast("Added to cart"); render().catch(showAppError);
}

function toggleWish(id) {
  state.wishlist = state.wishlist.includes(id) ? state.wishlist.filter(x=>x!==id) : [...state.wishlist,id];
  save(); toast(state.wishlist.includes(id) ? "Added to wishlist" : "Removed from wishlist"); render().catch(showAppError);
}

function firebaseMessage(code) {
  const map = {
    "auth/email-already-in-use":"This email is already registered.",
    "auth/invalid-email":"Please enter a valid email.",
    "auth/weak-password":"Password should be at least 6 characters.",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/user-not-found":"No account was found with this email.",
    "auth/wrong-password":"Email or password is incorrect.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "auth/too-many-requests":"Too many attempts. Please try again later."
  };
  return map[code] || "Authentication failed. Please try again.";
}

async function handleAuth(form) {
  const data = new FormData(form);
  const email = String(data.get("email")||"").trim();
  const password = String(data.get("password")||"");
  const register = !!data.get("name");
  const error = $("#auth-error");
  const button = $("button[type=submit]", form);
  button.disabled = true; button.innerHTML = "Please wait…";
  error.textContent = "";
  try {
    if (register) {
      const cred = await createUserWithEmailAndPassword(auth,email,password);
      const name = String(data.get("name")||"").trim();
      const phone = String(data.get("phone")||"").trim();
      await updateProfile(cred.user,{displayName:name});
      await setDoc(doc(db,"users",cred.user.uid),{
        uid:cred.user.uid, displayName:name, email:cred.user.email, phone, whatsapp:"",
        photoURL:cred.user.photoURL||"", role:"customer", status:"active",
        totalOrders:0, completedOrders:0, cancelledOrders:0, totalSpent:0,
        createdAt:serverTimestamp(), updatedAt:serverTimestamp(), lastLoginAt:serverTimestamp()
      });
      toast("Account created successfully");
    } else {
      const cred = await signInWithEmailAndPassword(auth,email,password);
      await updateDoc(doc(db,"users",cred.user.uid),{lastLoginAt:serverTimestamp(),updatedAt:serverTimestamp()}).catch(()=>{});
      toast("Welcome back");
    }
    location.hash = "#/home";
  } catch (err) {
    error.textContent = firebaseMessage(err.code);
  } finally {
    button.disabled = false; button.innerHTML = register ? "Create account <span>→</span>" : "Sign in <span>→</span>";
  }
}

async function uploadToCloudinary(file, folder) {
  if (!file) return "";
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", cloudinaryConfig.uploadPreset);
  form.append("folder", `skyshop/${folder}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,{method:"POST",body:form});
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url;
}

document.addEventListener("click", async e => {
  const openMenu=e.target.closest("[data-action='open-menu']");
  if(openMenu){ document.body.classList.add("mobile-menu-open"); const drawer=$("#mobile-nav-drawer"); const overlay=$(".mobile-nav-overlay"); if(drawer)drawer.setAttribute("aria-hidden","false"); if(overlay)overlay.setAttribute("aria-hidden","false"); openMenu.setAttribute("aria-expanded","true"); return; }
  const closeMenu=e.target.closest("[data-action='close-menu']");
  if(closeMenu){ closeMobileMenu(); return; }

  const lang=e.target.closest("[data-language]");
  if(lang){ setLanguage(lang.value); render().catch(showAppError); return; }
  const nm=e.target.closest("[data-notification-delete]");
  if(nm){ e.stopPropagation(); await deleteDoc(doc(db,"users",state.user.uid,"notifications",nm.dataset.notificationDelete)); playSound("success"); toast("Notification deleted"); render().catch(showAppError); return; }
  const no=e.target.closest("[data-notification-open]");
  if(no && !e.target.closest("[data-notification-delete]")){ await openNotification(no.dataset.notificationOpen); return; }
  if(e.target.closest("[data-action='close-notification']")){ $("#notification-modal-root").innerHTML=""; return; }
  if(e.target.closest("[data-action='search']")){ searchModal(); return; }
  if(e.target.closest("[data-action='close-search']")){ $(".search-modal-backdrop")?.remove(); return; }
  const gi=e.target.closest("[data-gallery-image]");
  if(gi){ const main=$("#gallery-main-image"); if(main) main.src=gi.dataset.galleryImage; $$(".gallery-thumb").forEach(x=>x.classList.remove("active")); gi.classList.add("active"); playSound("pop"); return; }
  const card=e.target.closest("[data-product-card]");
  if(card && !e.target.closest("button,a")){ location.hash=`#/product?id=${encodeURIComponent(card.dataset.productCard)}`; playSound("pop"); return; }
  const add = e.target.closest("[data-add]"); if (add) return addToCart(add.dataset.add);
  const wish = e.target.closest("[data-wish]"); if (wish) return toggleWish(wish.dataset.wish);
  const rem = e.target.closest("[data-remove]"); if (rem) { state.cart=state.cart.filter(x=>x.id!==rem.dataset.remove); save(); render(); toast("Removed from cart","info"); return; }
  const qty = e.target.closest("[data-qty]"); if (qty) { const item=state.cart.find(x=>x.id===qty.dataset.qty); if(item){item.qty+=Number(qty.dataset.delta); if(item.qty<=0)state.cart=state.cart.filter(x=>x.id!==item.id);save();render().catch(showAppError);} return; }
  const action = e.target.closest("[data-action]"); if (!action) return;
  if(action.dataset.action==="theme"){state.theme=state.theme==="dark"?"light":"dark";save();render().catch(showAppError);}
  if(action.dataset.action==="logout"){await signOut(auth);toast("Signed out","info");location.hash="#/home";}
  if(action.dataset.action==="sort"){
    state.sort = state.sort === "price-asc" ? "price-desc" : "price-asc";
    localStorage.setItem("skyshop_sort", state.sort);
    render().catch(showAppError);
  }
});

document.addEventListener("submit", async e => {
  if(e.target.id==="sky-search-form"){
    e.preventDefault();
    const q=String(new FormData(e.target).get("q")||"").trim();
    location.hash=`#/shop${q?`?q=${encodeURIComponent(q)}`:""}`;
    $(".search-modal-backdrop")?.remove();
    return;
  }
  if(e.target.id==="auth-form"){e.preventDefault();await handleAuth(e.target);}

  if(e.target.id==="review-form"){
    e.preventDefault();
    if(isRestricted()){toast("Your account is restricted","error");return;}
    const form=e.target, data=new FormData(form), productId=form.dataset.productId;
    const rating=Math.max(1,Math.min(5,Number(data.get("rating")||5)));
    const comment=String(data.get("comment")||"").trim();
    if(!comment){toast("Please write a comment","error");return;}
    const button=$("button[type=submit]",form); button.disabled=true; button.textContent="Publishing…";
    try{
      let imageUrl="";
      const file=data.get("image");
      if(file && file.size) imageUrl=await uploadToCloudinary(file,"reviews");
      await setDoc(doc(db,"reviews",`${state.user.uid}_${productId}`),{
        productId,userId:state.user.uid,userName:state.profile?.displayName||state.user.displayName||state.user.email,
        userEmail:state.user.email,rating,comment,imageUrl,status:"published",createdAt:serverTimestamp()
      });
      playSound("success"); toast("Review published");
      await render();
    }catch(err){toast(err.message||"Could not publish review","error");button.disabled=false;button.textContent="Publish review";}
  }

  if(e.target.id==="checkout-form"){
    e.preventDefault();
    if(!state.user){toast("Please sign in before checkout","error");location.hash="#/login";return;}
    if(isRestricted()){toast("Your account is restricted","error");return;}
    const form=e.target; const data=new FormData(form); const button=$("button[type=submit]",form); button.disabled=true; button.textContent="Placing order…";
    try {
      let receiptUrl="";
      const file=data.get("receipt");
      if(file && file.size) receiptUrl=await uploadToCloudinary(file,"receipts");

      const items=state.cart.map(x=>{
        const product=state.products.find(p=>p.id===x.id);
        return product ? {productId:x.id,name:product.name,image:product.image,price:Number(product.price||0),quantity:Number(x.qty||0),subtotal:Number(product.price||0)*Number(x.qty||0)} : null;
      }).filter(Boolean);

      const subtotal=items.reduce((sum,x)=>sum+x.subtotal,0);
      const shipping=subtotal ? (subtotal>=3000 ? 0 : 99) : 0;
      const personal=calculateDiscountedTotal(subtotal);
      const originalTotal=subtotal+shipping;
      const finalTotal=Math.max(0,personal.finalTotal+shipping);
      const orderId=`SKY-${Date.now()}`;

      await setDoc(doc(db,"orders",orderId),{
        orderNumber:orderId,userId:state.user.uid,
        customerName:data.get("name"),customerEmail:state.user.email,
        customerPhone:data.get("phone"),customerPhone2:data.get("phone2")||"",
        items,subtotal,couponDiscount:0,
        personalDiscountPercent:personal.discountPercent,
        personalDiscountAmount:personal.discountAmount,
        discount:personal.discountAmount,
        shippingCost:shipping,tax:0,
        originalTotal,finalTotal,total:finalTotal,currency:state.site.currency,
        deliveryAddress:data.get("address"),deliveryCity:"",deliveryArea:"",deliveryNotes:"",
        paymentMethodName:data.get("payment"),paymentStatus:"pending",
        paymentDetails:{transferredNumber:data.get("transferredNumber")||"",transactionId:data.get("transactionId")||"",receiptUrl},
        status:"pending",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
      });

      state.cart=[];save();toast("Order placed successfully");location.hash="#/orders";
    } catch(err) {
      toast(err.message||"Could not place order","error");
      button.disabled=false; button.textContent="Try again";
    }
  }
});

document.addEventListener("change",e=>{
  if(e.target.name==="image" && e.target.closest("#review-form")){
    const file=e.target.files?.[0], box=$("#review-preview");
    if(box && file){ const url=URL.createObjectURL(file); box.innerHTML=`<img src="${url}" alt="Review preview">`; }
  }
  if(e.target.name==="payment"){
    const show=!["Cash on Delivery"].includes(e.target.value);
    $("#transfer-fields")?.classList.toggle("hidden",!show);
  }
});

function closeMobileMenu(){
  document.body.classList.remove("mobile-menu-open");
  const drawer=$("#mobile-nav-drawer"), overlay=$(".mobile-nav-overlay"), toggle=$(".mobile-menu-toggle");
  if(drawer) drawer.setAttribute("aria-hidden","true");
  if(overlay) overlay.setAttribute("aria-hidden","true");
  if(toggle) toggle.setAttribute("aria-expanded","false");
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMobileMenu();});
window.addEventListener("hashchange",()=>{ render().catch(showAppError); });

onAuthStateChanged(auth, async user => {
  state.user=user;
  if(user){
    try {
      const snap=await getDoc(doc(db,"users",user.uid));
      state.profile=snap.exists()?snap.data():null;
      state.restriction = state.profile?.status==="blocked" ? "blocked" : state.profile?.status==="suspended" ? "suspended" : null;
      if(state.restriction) playSound("error");
    } catch(_){state.profile=null;state.restriction=null;}
  } else { state.profile=null; state.restriction=null; }
  render().catch(showAppError);
});

(async function boot(){
  try{
    const [products] = await Promise.all([loadProducts(),loadSiteSettings()]);
    state.products = Array.isArray(products) ? products : [];
    await render();
  }catch(err){
    showAppError(err);
  }finally{
    setTimeout(hideLoader,650);
  }
})();
function getUserDiscountPercent() {
  return Math.max(0, Math.min(100, Number(state.profile?.permanentDiscountPercent || 0)));
}
function calculateDiscountedTotal(subtotal) {
  const percent = getUserDiscountPercent();
  const discountAmount = Math.round((Number(subtotal || 0) * percent / 100) * 100) / 100;
  return {
    originalTotal: Number(subtotal || 0),
    discountPercent: percent,
    discountAmount,
    finalTotal: Math.max(0, Number(subtotal || 0) - discountAmount)
  };
}

function getCheckoutTotals() {
  const subtotal = state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const couponDiscount = Number(state.appliedCoupon?.discountAmount || 0);
  const afterCoupon = Math.max(0, subtotal - couponDiscount);
  const personal = calculateDiscountedTotal(afterCoupon);
  const shipping = Number(state.shippingCost || 0);
  const tax = Number(state.taxAmount || 0);
  return {
    subtotal,
    couponDiscount,
    personalDiscountPercent: personal.discountPercent,
    personalDiscountAmount: personal.discountAmount,
    shipping,
    tax,
    originalTotal: Math.max(0, afterCoupon + shipping + tax),
    finalTotal: Math.max(0, personal.finalTotal + shipping + tax)
  };
}


// Permanent customer discount is applied to the final merchandise/coupon subtotal.
// Checkout integrations should call getCheckoutTotals() and persist its fields on the order.
window.SkyShopPricing = { getCheckoutTotals };

document.addEventListener("click",e=>{
  const star=e.target.closest("[data-rating]");
  if(star){
    const form=star.closest("#review-form");
    if(form){
      $("input[name=rating]",form).value=star.dataset.rating;
      $$("[data-rating]",form).forEach(x=>x.classList.toggle("active",Number(x.dataset.rating)<=Number(star.dataset.rating)));
      playSound("click");
    }
  }
});
