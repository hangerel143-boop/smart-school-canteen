"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient, User } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ... (MenuItem, CartEntry, CATEGORIES, SEED_MENU types are same as before)

export default function SmartCanteen() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [cart, setCart] = useState<Record<string, any>>({});
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [menu, setMenu] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // ЗАХИАЛГА ӨГӨХ ФУНКЦ (Шинэчлэгдсэн)
  const placeOrder = async () => {
    if (!selectedTime || Object.keys(cart).length === 0 || !user) return;
    setOrdering(true);
    
    const cartEntries = Object.values(cart);
    const cartTotal = cartEntries.reduce((a, e) => a + e.item.price * e.qty, 0);

    try {
      const { error } = await supabase.from("orders").insert({
        items: cartEntries.map(({ item, qty }) => ({ 
          id: item.id, name: item.name, price: item.price, qty, emoji: item.emoji 
        })),
        total: cartTotal,
        pickup_time: selectedTime,
        status: "pending",
        user_id: user.id,
        user_email: user.email // Хэрэглэгчийн имэйлийг энд хадгалж байна
      });

      if (error) throw error;
      setCart({});
      setSelectedTime(null);
      alert("Захиалга амжилттай бүртгэгдлээ!");
    } catch (err) {
      alert("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setOrdering(false);
    }
  };

  if (!user) {
    return (
      /* Login Form UI (Same as your original code) */
      <div>Login Required</div> 
    );
  }

  return (
    /* Main UI with placeOrder button */
    <div>
       {/* ... Your Nav and Menu UI ... */}
       <button onClick={placeOrder} disabled={ordering}>
         {ordering ? "Илгээж байна..." : "Захиалга өгөх"}
       </button>
    </div>
  );
}