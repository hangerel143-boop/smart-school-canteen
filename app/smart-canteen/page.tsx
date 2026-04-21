"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient, User } from "@supabase/supabase-js";

// ============================================================
// SUPABASE CONFIG
// ============================================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// TYPES
// ============================================================
interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji?: string;
  image_url?: string;
  description?: string;
  is_new?: boolean;
  available?: boolean;
}

interface CartEntry {
  item: MenuItem;
  qty: number;
}

interface Toast {
  msg: string;
  visible: boolean;
}

const CATEGORIES = [
  { key: "Бүгд", label: "Бүгд", emoji: "🍽" },
  { key: "Монгол хоол", label: "Монгол хоол", emoji: "🥟" },
  { key: "Fast Food", label: "Fast Food", emoji: "🍔" },
  { key: "Зууш", label: "Зууш", emoji: "🍟" },
  { key: "Ундаа", label: "Ундаа", emoji: "🥤" },
  { key: "Амттан", label: "Амттан", emoji: "🍫" },
];

// Fallback seed data
const SEED_MENU: MenuItem[] = [
  { id: "1", name: "Бууз", price: 12000, category: "Монгол хоол", emoji: "🥟", description: "Уламжлалт гарын бууз (10 ш)", is_new: false, available: true },
  { id: "2", name: "Хуушуур", price: 9500, category: "Монгол хоол", emoji: "🫓", description: "Шарсан хуушуур (5 ш), малын мах", is_new: true, available: true },
  { id: "5", name: "Chicken Burger", price: 18500, category: "Fast Food", emoji: "🍔", description: "Crispy chicken, coleslaw, BBQ sauce", is_new: true, available: true },
  { id: "11", name: "Monster Energy", price: 6500, category: "Ундаа", emoji: "⚡", description: "Monster Energy Original 500ml", is_new: false, available: true },
];

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  const now = new Date();
  let h = now.getHours();
  let m = Math.ceil(now.getMinutes() / 15) * 15;
  if (m >= 60) { m = 0; h++; }
  h += 1;
  for (let i = 0; i < 10; i++) {
    const totalMin = h * 60 + m + i * 15;
    const th = Math.floor(totalMin / 60);
    const tm = totalMin % 60;
    if (th < 8 || th > 21) continue;
    slots.push(`${String(th).padStart(2, "0")}:${String(tm).padStart(2, "0")}`);
  }
  return [...new Set(slots)].slice(0, 6);
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SmartCanteen() {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);

  // --- App State ---
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [activeCategory, setActiveCategory] = useState("Бүгд");
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [toast, setToast] = useState<Toast>({ msg: "", visible: false });
  const [timeSlots] = useState<string[]>(generateTimeSlots());

  // 1. Authentication Lifecycle
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Menu
  useEffect(() => {
    if (!user) return;
    async function fetchMenu() {
      try {
        const { data, error } = await supabase
          .from("foods")
          .select("*")
          .eq("available", true)
          .order("category");
        if (error) throw error;
        setMenu(data && data.length > 0 ? data : SEED_MENU);
      } catch (err) {
        setMenu(SEED_MENU);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [user]);

  // 3. Auth Actions
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { error } = authMode === "login" 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      
      if (error) throw error;
      if (authMode === "signup") showToast("Бүртгэл амжилттай. Имэйлээ баталгаажуулна уу.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCart({});
  };

  // 4. Cart Logic
  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: { item, qty: (prev[item.id]?.qty ?? 0) + 1 },
    }));
    showToast(`${item.name} нэмэгдлээ`);
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const entry = prev[id];
      if (!entry) return prev;
      const newQty = entry.qty + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...entry, qty: newQty } };
    });
  }, []);

  const cartEntries = Object.values(cart);
  const cartCount = cartEntries.reduce((a, e) => a + e.qty, 0);
  const cartTotal = cartEntries.reduce((a, e) => a + e.item.price * e.qty, 0);

  // 5. Order Logic
  const placeOrder = async () => {
    if (!selectedTime || cartCount === 0 || !user) return;
    setOrdering(true);
    try {
      const { error } = await supabase.from("orders").insert({
        items: cartEntries.map(({ item, qty }) => ({ id: item.id, name: item.name, price: item.price, qty, emoji: item.emoji })),
        total: cartTotal,
        pickup_time: selectedTime,
        status: "pending",
        user_id: user.id
      });

      if (error) throw error;

      setCart({});
      setSelectedTime(null);
      setCartOpen(false);
      showToast(`Захиалга баталгаажлаа!`);
    } catch (err) {
      showToast("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setOrdering(false);
    }
  };

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  };

  // 6. Filter Groups
  const catGroups = activeCategory === "Бүгд"
    ? CATEGORIES.slice(1).map((c) => ({
        label: c.label,
        items: menu.filter((i) => i.category === c.key),
      })).filter((g) => g.items.length > 0)
    : [{ label: activeCategory, items: menu.filter((i) => i.category === activeCategory) }];

  // --- RENDER LOGIN IF NO USER ---
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <form onSubmit={handleAuth} style={{ background: "#141414", padding: "2.5rem", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)", width: "100%", maxWidth: "400px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
          <h1 style={{ color: "#D4A843", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", textAlign: "center", marginBottom: "0.5rem", letterSpacing: "2px" }}>SmartHub</h1>
          <p style={{ color: "#666", textAlign: "center", fontSize: "0.9rem", marginBottom: "2rem" }}>Захиалга өгөхийн тулд нэвтэрнэ үү</p>
          
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", color: "#888", fontSize: "0.75rem", marginBottom: "0.5rem", textTransform: "uppercase" }}>Имэйл хаяг</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: "0.9rem", background: "#1E1E1E", border: "1px solid #333", color: "white", borderRadius: "10px", outline: "none" }} placeholder="email@example.com" />
          </div>
          
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", color: "#888", fontSize: "0.75rem", marginBottom: "0.5rem", textTransform: "uppercase" }}>Нууц үг</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: "0.9rem", background: "#1E1E1E", border: "1px solid #333", color: "white", borderRadius: "10px", outline: "none" }} placeholder="••••••••" />
          </div>

          <button type="submit" disabled={authLoading} style={{ width: "100%", padding: "1rem", background: "#D4A843", border: "none", borderRadius: "10px", color: "black", fontWeight: 700, cursor: "pointer", fontSize: "1rem", transition: "0.2s" }}>
            {authLoading ? "Түр хүлээнэ үү..." : authMode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
          </button>

          <div onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} style={{ marginTop: "1.5rem", textAlign: "center", color: "#888", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}>
            {authMode === "login" ? "Шинээр бүртгэл үүсгэх үү?" : "Нэвтрэх хэсэг рүү буцах"}
          </div>
        </form>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#F5F0E8", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        .food-card { background: #141414; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; transition: 0.25s; position: relative; }
        .food-card:hover { border-color: #D4A843; transform: translateY(-3px); }
        .add-btn { background: #D4A843; color: #000; border: none; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 700; cursor: pointer; }
        .cat-btn { display: flex; align-items: center; gap: 0.8rem; width: 100%; padding: 0.8rem 1.25rem; background: none; border: none; color: #888; cursor: pointer; text-align: left; border-left: 3px solid transparent; }
        .cat-btn.active { color: #D4A843; border-left-color: #D4A843; background: rgba(212,168,67,0.05); }
        .time-slot { background: #1E1E1E; border: 1px solid #333; color: #888; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; }
        .time-slot.selected { background: #D4A843; color: black; border-color: #D4A843; }
        .order-btn { width: 100%; padding: 1rem; background: #D4A843; color: black; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .qty-btn { width: 28px; height: 28px; background: #333; border: none; color: white; border-radius: 6px; cursor: pointer; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,10,0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid #222", padding: "0 2rem", height: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: 2 }}>Smart<span style={{ color: "#D4A843" }}>Hub</span></div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ textAlign: "right", display: "none", md: "block" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{user.email}</div>
            <div onClick={handleLogout} style={{ fontSize: "0.7rem", color: "#D4A843", cursor: "pointer", textDecoration: "underline" }}>Системээс гарах</div>
          </div>
          
          <button onClick={() => setCartOpen(true)} style={{ background: "#D4A843", border: "none", padding: "0.6rem 1.2rem", borderRadius: "50px", fontWeight: 700, cursor: "pointer", display: "flex", gap: "0.5rem" }}>
             🛒 {cartTotal.toLocaleString()}₮
          </button>
        </div>
      </nav>

      <div style={{ display: "flex" }}>
        {/* SIDEBAR */}
        <aside style={{ width: 240, background: "#141414", borderRight: "1px solid #222", height: "calc(100vh - 70px)", position: "sticky", top: 70, padding: "2rem 0" }}>
          <p style={{ padding: "0 1.5rem", fontSize: "0.7rem", color: "#555", letterSpacing: 2, marginBottom: "1rem" }}>КАТЕГОРИ</p>
          {CATEGORIES.map(cat => (
            <button key={cat.key} className={`cat-btn ${activeCategory === cat.key ? 'active' : ''}`} onClick={() => setActiveCategory(cat.key)}>
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </aside>

        {/* MAIN MENU */}
        <main style={{ flex: 1, padding: "2.5rem" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", marginBottom: "2rem" }}>{activeCategory}</h1>
          
          {catGroups.map(group => (
            <div key={group.label} style={{ marginBottom: "3rem" }}>
              <h3 style={{ borderBottom: "1px solid #222", paddingBottom: "0.5rem", marginBottom: "1.5rem", color: "#D4A843" }}>{group.label}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                {group.items.map(item => (
                  <div key={item.id} className="food-card">
                    <div style={{ height: 160, background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>{item.emoji}</div>
                    <div style={{ padding: "1.2rem" }}>
                      <p style={{ fontSize: "0.7rem", color: "#D4A843", fontWeight: 600 }}>{item.category}</p>
                      <h4 style={{ margin: "0.3rem 0" }}>{item.name}</h4>
                      <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "1rem", height: "2.4rem", overflow: "hidden" }}>{item.description}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700 }}>{item.price.toLocaleString()}₮</span>
                        <button className="add-btn" onClick={() => addToCart(item)}>+ Нэмэх</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>

      {/* CART DRAWER */}
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 400, background: "#141414", borderLeft: "1px solid #222", zIndex: 200, transform: cartOpen ? "translateX(0)" : "translateX(100%)", transition: "0.3s ease", padding: "2rem", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif" }}>САГС</h2>
          <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {cartEntries.map(({ item, qty }) => (
            <div key={item.id} style={{ display: "flex", gap: "1rem", padding: "1rem 0", borderBottom: "1px solid #222" }}>
              <div style={{ width: 50, height: 50, background: "#1E1E1E", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>{item.emoji}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.name}</p>
                <p style={{ color: "#D4A843", fontSize: "0.8rem" }}>{item.price.toLocaleString()}₮</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                <span>{qty}</span>
                <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "2rem" }}>
          <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.5rem" }}>ХҮЛЭЭН АВАХ ЦАГ</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
            {timeSlots.map(slot => (
              <button key={slot} className={`time-slot ${selectedTime === slot ? 'selected' : ''}`} onClick={() => setSelectedTime(slot)}>{slot}</button>
            ))}
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <span>Нийт:</span>
            <span style={{ color: "#D4A843", fontWeight: 700, fontSize: "1.2rem" }}>{cartTotal.toLocaleString()}₮</span>
          </div>
          <button className="order-btn" onClick={placeOrder} disabled={ordering || !selectedTime || cartCount === 0}>
            {ordering ? "Илгээж байна..." : "Захиалга өгөх"}
          </button>
        </div>
      </div>

      {/* TOAST */}
      {toast.visible && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: "#D4A843", color: "black", padding: "1rem 2rem", borderRadius: "10px", fontWeight: 700, zIndex: 1000 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}