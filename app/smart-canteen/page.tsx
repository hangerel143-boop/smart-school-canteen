"use client"

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface MenuItem {
  id: number;
  name: string;
  price: number;
  description: string;
  emoji: string;
  tag: string;
}

interface Order {
  id: number;
  created_at: string;
  student_name: string;
  item_name: string;
  quantity: number;
  total_price: number;
}

// ─── MENU DATA ────────────────────────────────────────────────────────────────
const MENU_ITEMS: MenuItem[] = [
  { id: 1, name: "Beef Fried Rice",      price: 2500, description: "Wok-tossed jasmine rice with tender beef strips, egg, and seasonal vegetables.", emoji: "🍚", tag: "Best Seller"     },
  { id: 2, name: "Chicken Soup",         price: 2000, description: "Slow-cooked broth with shredded chicken, noodles, and fresh herbs.",             emoji: "🍜", tag: "Warm & Cozy"    },
  { id: 3, name: "Veggie Steamed Buns",  price: 1500, description: "Fluffy bao filled with seasoned cabbage, tofu, and shiitake mushrooms.",          emoji: "🥟", tag: "Vegetarian"     },
  { id: 4, name: "Grilled Lamb Skewers", price: 3000, description: "Seasoned Mongolian-style lamb on skewers, charred to perfection.",                emoji: "🍢", tag: "Today's Special" },
  { id: 5, name: "Milk Tea",             price: 1000, description: "Creamy Mongolian suutei tsai — salted milk tea brewed with black tea.",            emoji: "🍵", tag: "Drink"          },
  { id: 6, name: "Tsuivan Noodles",      price: 2200, description: "Hand-pulled noodles stir-fried with mutton and fresh carrots and onions.",         emoji: "🍝", tag: "Traditional"    },
];

const fmt = (p: number | undefined | null) => {
  if (p === undefined || p === null) return "₮0";
  return `₮${Number(p).toLocaleString()}`;
};

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="home-page">
      <div className="home-badge">🏫 School Canteen</div>
      <h1 className="home-title">Nom<span className="accent">.</span><br />Canteen</h1>
      <p className="home-desc">Fresh, warm meals crafted daily for hungry students. Browse today's menu, place your order in seconds, and pick up when it's ready.</p>
      <button className="cta-btn" onClick={() => onNavigate("menu")}>View Today's Menu <span>→</span></button>
      <div className="home-cards-row">
        {["🕗 Open 7–9AM", "🍽️ Fresh Daily", "📲 Order Fast"].map((t) => (
          <div key={t} className="home-chip">{t}</div>
        ))}
      </div>
      <div className="home-preview">
        {MENU_ITEMS.slice(0, 3).map((item) => (
          <div key={item.id} className="preview-card">
            <span className="preview-emoji">{item.emoji}</span>
            <span className="preview-name">{item.name}</span>
            <span className="preview-price">{fmt(item.price)}</span>
          </div>
        ))}
        <button className="preview-more" onClick={() => onNavigate("menu")}>+{MENU_ITEMS.length - 3} more items →</button>
      </div>
    </div>
  );
}

// ─── MENU PAGE ────────────────────────────────────────────────────────────────
function MenuPage() {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [orders, setOrders]             = useState<Order[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentName, setStudentName]   = useState("");
  const [quantity, setQuantity]         = useState(1);
  const [formError, setFormError]       = useState("");
  const [successMsg, setSuccessMsg]     = useState("");
  const [hoveredId, setHoveredId]       = useState<number | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as Order[]);
  }

  function handleSelectItem(item: MenuItem) {
    setSelectedItem(item);
    setStudentName(""); setQuantity(1); setFormError(""); setSuccessMsg("");
    setTimeout(() => document.getElementById("order-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    if (!studentName.trim()) { setFormError("Please enter your student name."); return; }
    
    setFormError(""); 
    setIsSubmitting(true);

    const orderData = {
      student_name: studentName.trim(),
      item_name:    selectedItem.name,
      quantity,
      total_price:  selectedItem.price * quantity,
    };

    // We use .select() to get the generated ID and created_at back from Supabase
    const { data, error } = await supabase
      .from("orders")
      .insert([orderData])
      .select();

    if (!error) {
      if (data && data[0]) {
        setOrders((prev) => [data[0] as Order, ...prev]);
      } else {
        // Fallback if select doesn't return data (due to RLS policies etc)
        setOrders((prev) => [{ id: Date.now(), created_at: new Date().toISOString(), ...orderData }, ...prev]);
      }
      
      setSelectedItem(null);
      setSuccessMsg(`✓ "${orderData.item_name}" order placed successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      // Direct peer-to-peer tip: If this still fails, check the column names in Supabase Dashboard!
      setFormError(`Database Error: ${error.message}`);
    }
    setIsSubmitting(false);
  }

  return (
    <div className="menu-page">
      <div className="page-header">
        <h2 className="page-title">Today&apos;s Menu</h2>
        <p className="page-sub">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      {successMsg && <div className="success-banner">{successMsg}</div>}

      <div className="menu-grid">
        {MENU_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`menu-card${hoveredId === item.id ? " hovered" : ""}${selectedItem?.id === item.id ? " selected" : ""}`}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="card-top">
              <span className="card-emoji">{item.emoji}</span>
              <span className="card-tag">{item.tag}</span>
            </div>
            <h3 className="card-name">{item.name}</h3>
            <p className="card-desc">{item.description}</p>
            <div className="card-footer">
              <span className="card-price">{fmt(item.price)}</span>
              <button
                className={`order-btn${selectedItem?.id === item.id ? " order-btn-active" : ""}`}
                onClick={() => handleSelectItem(item)}
              >
                {selectedItem?.id === item.id ? "Ordering ✓" : "Order"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <section id="order-form-section" className="order-form-section">
          <h3 className="form-section-title">Complete Your Order</h3>
          <form onSubmit={handlePlaceOrder} className="inline-form">

            <div className="if-field">
              <span className="if-label">Selected Item</span>
              <div className="if-item-box">
                <span>{selectedItem.emoji}</span>
                <span>{selectedItem.name}</span>
                <span className="if-item-price">{fmt(selectedItem.price)}</span>
              </div>
            </div>

            <label className="if-field">
              <span className="if-label">Student Name</span>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Enkhjargal B."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </label>

            <label className="if-field">
              <span className="if-label">Quantity</span>
              <div className="qty-row">
                <button type="button" className="qty-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span className="qty-display">{quantity}</span>
                <button type="button" className="qty-btn" onClick={() => setQuantity((q) => Math.min(10, q + 1))}>+</button>
              </div>
            </label>

            {formError && <p className="form-error">{formError}</p>}

            <div className="order-total">
              <span>Total</span>
              <span className="total-price">{fmt(selectedItem.price * quantity)}</span>
            </div>

            <div className="form-actions">
              <button type="button" className="ghost-btn" onClick={() => { setSelectedItem(null); setFormError(""); }}>Cancel</button>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Placing…" : "Confirm Order ✓"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="orders-section">
        <h3 className="orders-section-title">Recent Orders</h3>
        {orders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🍽️</span>
            <p>No orders placed yet. Hunger awaits!</p>
          </div>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr><th>Student</th><th>Item</th><th>Qty</th><th>Total</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="td-student">{o.student_name}</td>
                    <td>{o.item_name}</td>
                    <td>{o.quantity}</td>
                    <td className="td-total">{fmt(o.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({ page, onNavigate }: { page: string; onNavigate: (p: string) => void }) {
  return (
    <nav className="nav">
      <button className="nav-logo" onClick={() => onNavigate("home")}>Nom<span className="accent">.</span></button>
      <div className="nav-links">
        {["home", "menu"].map((p) => (
          <button key={p} className={`nav-link${page === p ? " active" : ""}`} onClick={() => onNavigate(p)}>
            {p === "home" ? "Home" : "Menu"}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function SmartCanteenPage() {
  const [page, setPage] = useState("home");
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --cream:#fdf6ec;--warm-white:#fffdf9;
          --amber:#e8840a;--amber-light:#fbb040;--amber-pale:#fff3d6;
          --brown:#3d2104;--brown-mid:#7a4310;
          --gray:#6b6258;--gray-light:#ede7df;
          --green:#3a7d44;--green-pale:#edf7ef;--red:#c0392b;
          --radius:16px;--radius-sm:10px;
          --shadow:0 4px 24px rgba(61,33,4,.10);--shadow-hover:0 8px 36px rgba(61,33,4,.18);
        }
        body{font-family:'DM Sans',sans-serif;background:var(--cream);color:var(--brown);min-height:100vh}
        button{cursor:pointer;border:none;background:none;font-family:inherit}
        .nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:60px;background:rgba(253,246,236,.92);backdrop-filter:blur(12px);border-bottom:1.5px solid var(--gray-light)}
        .nav-logo{font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:900;color:var(--brown)}
        .accent{color:var(--amber)}
        .nav-links{display:flex;gap:8px}
        .nav-link{padding:6px 16px;border-radius:20px;font-size:.9rem;font-weight:500;color:var(--gray);transition:all .2s;text-transform:capitalize}
        .nav-link.active,.nav-link:hover{background:var(--amber-pale);color:var(--amber)}
        .app-shell{max-width:600px;margin:0 auto;padding:0 16px 80px}
        .home-page{padding-top:40px}
        .home-badge{display:inline-block;background:var(--amber-pale);color:var(--amber);border-radius:20px;padding:6px 16px;font-size:.82rem;font-weight:600;letter-spacing:.04em;margin-bottom:20px}
        .home-title{font-family:'Playfair Display',serif;font-size:clamp(3rem,14vw,5rem);font-weight:900;line-height:1.0;color:var(--brown);margin-bottom:20px}
        .home-desc{font-size:1rem;color:var(--gray);line-height:1.7;max-width:400px;margin-bottom:32px}
        .cta-btn{display:inline-flex;align-items:center;gap:10px;background:var(--amber);color:white;padding:14px 28px;border-radius:40px;font-size:1rem;font-weight:600;transition:all .2s;box-shadow:0 4px 20px rgba(232,132,10,.35)}
        .cta-btn:hover{background:var(--brown-mid);transform:translateY(-2px)}
        .home-cards-row{display:flex;gap:10px;margin-top:36px;flex-wrap:wrap}
        .home-chip{background:var(--warm-white);border:1.5px solid var(--gray-light);border-radius:20px;padding:8px 16px;font-size:.84rem;font-weight:500;color:var(--brown-mid)}
        .home-preview{margin-top:32px;background:var(--warm-white);border:1.5px solid var(--gray-light);border-radius:var(--radius);padding:20px;display:flex;flex-direction:column;gap:12px}
        .preview-card{display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--gray-light)}
        .preview-card:last-of-type{border-bottom:none}
        .preview-emoji{font-size:1.6rem}
        .preview-name{flex:1;font-weight:600;font-size:.95rem}
        .preview-price{font-weight:700;color:var(--amber);font-size:.9rem}
        .preview-more{text-align:center;padding:10px;color:var(--amber);font-weight:600;font-size:.9rem}
        .preview-more:hover{text-decoration:underline}
        .menu-page{padding-top:32px;display:flex;flex-direction:column;gap:32px}
        .page-title{font-family:'Playfair Display',serif;font-size:2rem;font-weight:900;color:var(--brown)}
        .page-sub{font-size:.88rem;color:var(--gray);margin-top:4px}
        .success-banner{background:var(--green-pale);color:var(--green);border:1.5px solid #b7dfbd;border-radius:var(--radius-sm);padding:12px 18px;font-weight:600;font-size:.9rem;animation:slideIn .3s ease}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .menu-grid{display:flex;flex-direction:column;gap:16px}
        .menu-card{background:var(--warm-white);border:1.5px solid var(--gray-light);border-radius:var(--radius);padding:20px;transition:all .22s;box-shadow:var(--shadow)}
        .menu-card.hovered{border-color:var(--amber-light);box-shadow:var(--shadow-hover);transform:translateY(-2px)}
        .menu-card.selected{border-color:var(--amber);background:#fffbf5}
        .card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .card-emoji{font-size:2.4rem}
        .card-tag{background:var(--amber-pale);color:var(--amber);border-radius:12px;padding:4px 12px;font-size:.75rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
        .card-name{font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:var(--brown);margin-bottom:6px}
        .card-desc{font-size:.88rem;color:var(--gray);line-height:1.6;margin-bottom:16px}
        .card-footer{display:flex;align-items:center;justify-content:space-between}
        .card-price{font-size:1.15rem;font-weight:800;color:var(--brown)}
        .order-btn{background:var(--amber);color:white;padding:10px 22px;border-radius:24px;font-size:.9rem;font-weight:600;transition:all .18s}
        .order-btn:hover{background:var(--brown-mid);transform:scale(1.04)}
        .order-btn-active{background:var(--green) !important}
        .order-form-section{background:var(--amber-pale);border:1.5px solid #f5cc7f;border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);animation:slideIn .3s ease}
        .form-section-title{font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:800;color:var(--brown);margin-bottom:20px}
        .inline-form{display:flex;flex-direction:column;gap:18px}
        .if-field{display:flex;flex-direction:column;gap:6px}
        .if-label{font-size:.75rem;font-weight:700;color:var(--brown-mid);text-transform:uppercase;letter-spacing:.06em}
        .if-item-box{display:flex;align-items:center;gap:10px;background:white;border:1.5px solid #f5cc7f;border-radius:var(--radius-sm);padding:12px 16px;font-weight:700;font-size:.95rem;color:var(--brown)}
        .if-item-price{margin-left:auto;color:var(--amber);font-weight:800}
        .form-input{width:100%;padding:13px 16px;border:1.5px solid #f5cc7f;border-radius:var(--radius-sm);font-family:inherit;font-size:.95rem;color:var(--brown);background:white;transition:border-color .2s;outline:none}
        .form-input:focus{border-color:var(--amber)}
        .qty-row{display:flex;align-items:center;gap:16px}
        .qty-btn{width:40px;height:40px;border-radius:50%;background:white;color:var(--amber);font-size:1.3rem;font-weight:700;border:1.5px solid #f5cc7f;transition:all .15s;display:flex;align-items:center;justify-content:center}
        .qty-btn:hover{background:var(--amber);color:white;border-color:var(--amber)}
        .qty-display{font-size:1.4rem;font-weight:800;min-width:32px;text-align:center;color:var(--brown)}
        .form-error{background:#fdecea;color:var(--red);border-radius:var(--radius-sm);padding:10px 14px;font-size:.85rem;font-weight:500}
        .order-total{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-top:1.5px solid #f5cc7f;font-weight:600;font-size:.95rem;color:var(--brown-mid)}
        .total-price{font-size:1.3rem;font-weight:800;color:var(--brown)}
        .form-actions{display:flex;gap:12px;justify-content:flex-end}
        .submit-btn{background:var(--amber);color:white;padding:12px 28px;border-radius:40px;font-size:.95rem;font-weight:700;transition:all .2s;box-shadow:0 4px 16px rgba(232,132,10,.3)}
        .submit-btn:hover:not(:disabled){background:var(--brown-mid)}
        .submit-btn:disabled{opacity:.6;cursor:not-allowed}
        .ghost-btn{padding:12px 20px;border-radius:40px;border:1.5px solid #f5cc7f;font-size:.9rem;font-weight:600;color:var(--brown-mid);transition:all .2s;background:white}
        .ghost-btn:hover{border-color:var(--amber);color:var(--amber)}
        .orders-section-title{font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:800;color:var(--brown);margin-bottom:16px}
        .empty-state{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 20px;background:var(--warm-white);border:1.5px solid var(--gray-light);border-radius:var(--radius);color:var(--gray);font-size:.95rem}
        .empty-icon{font-size:2.5rem}
        .orders-table-wrap{background:var(--warm-white);border:1.5px solid var(--gray-light);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}
        .orders-table{width:100%;border-collapse:collapse;font-size:.88rem}
        .orders-table thead{background:var(--amber-pale)}
        .orders-table th{padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--brown-mid);text-transform:uppercase;letter-spacing:.06em}
        .orders-table tbody tr{border-top:1px solid var(--gray-light);transition:background .15s}
        .orders-table tbody tr:hover{background:#fffbf5}
        .orders-table td{padding:12px 16px;color:var(--brown)}
        .td-student{font-weight:600}
        .td-total{font-weight:800;color:var(--green)}
      `}</style>
      <Nav page={page} onNavigate={setPage} />
      <div className="app-shell">
        {page === "home" && <HomePage onNavigate={setPage} />}
        {page === "menu" && <MenuPage />}
      </div>
    </>
  );
}