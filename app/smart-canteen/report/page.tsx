"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrderAdmin() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Өгөгдөл татах функц
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) console.error("Алдаа:", error.message);
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Real-time: Шинэ захиалга болон өөрчлөлтийг хянах
    const channel = supabase
      .channel("admin-orders-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. Төлөв өөрчлөх функц (Update)
  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) alert("Төлөв өөрчлөхөд алдаа гарлаа!");
  };

  // 3. Захиалга устгах функц (Delete)
  const deleteOrder = async (id: string) => {
    if (!confirm("Энэ захиалгыг устгахдаа итгэлтэй байна уу?")) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);

    if (error) alert("Устгахад алдаа гарлаа!");
  };

  if (loading) return <div style={{ color: "#D4A843", padding: "2rem" }}>Ачаалж байна...</div>;

  return (
    <div style={{ padding: "2rem", background: "#0A0A0A", minHeight: "100vh", color: "#eee", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1.5rem", color: "#D4A843" }}>Захиалгын хяналтын самбар</h1>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#141414", borderRadius: "12px" }}>
          <thead>
            <tr style={{ background: "#222", color: "#D4A843", textAlign: "left" }}>
              <th style={{ padding: "15px" }}>Захиалсан цаг</th>
              <th style={{ padding: "15px" }}>Авах цаг</th>
              <th style={{ padding: "15px" }}>Бараанууд</th>
              <th style={{ padding: "15px" }}>Нийт дүн</th>
              <th style={{ padding: "15px" }}>Төлөв</th>
              <th style={{ padding: "15px" }}>Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "15px", fontSize: "0.85rem" }}>
                  {new Date(order.created_at).toLocaleString('mn-MN')}
                </td>
                <td style={{ padding: "15px", fontWeight: "bold" }}>{order.pickup_time}</td>
                <td style={{ padding: "15px" }}>
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} style={{ fontSize: "0.9rem" }}>
                      {item.emoji} {item.name} x{item.qty}
                    </div>
                  ))}
                </td>
                <td style={{ padding: "15px", color: "#D4A843" }}>{order.total.toLocaleString()}₮</td>
                <td style={{ padding: "15px" }}>
                  <select 
                    value={order.status} 
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    style={{
                      background: "#1E1E1E",
                      color: order.status === "ready" ? "#4caf50" : "#D4A843",
                      border: "1px solid #333",
                      padding: "5px",
                      borderRadius: "5px",
                      cursor: "pointer"
                    }}
                  >
                    <option value="pending">⏳ Хүлээгдэж буй</option>
                    <option value="preparing">🍳 Бэлтгэж байна</option>
                    <option value="ready">✅ Бэлэн болсон</option>
                  </select>
                </td>
                <td style={{ padding: "15px" }}>
                  <button 
                    onClick={() => deleteOrder(order.id)}
                    style={{
                      background: "none",
                      border: "1px solid #ff4444",
                      color: "#ff4444",
                      padding: "5px 10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "0.8rem"
                    }}
                  >
                    Устгах
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}