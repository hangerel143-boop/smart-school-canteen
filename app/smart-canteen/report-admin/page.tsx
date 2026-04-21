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
    const channel = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Тайлангийн тооцоолол
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  return (
    <div style={{ padding: "2rem", background: "#0A0A0A", minHeight: "100vh", color: "#eee", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#D4A843", marginBottom: "2rem" }}>Захиалгын нэгдсэн тайлан</h1>

      {/* DASHBOARD CARDS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div style={{ flex: 1, background: "#141414", padding: "20px", borderRadius: "12px", border: "1px solid #333" }}>
          <p style={{ color: "#888", margin: 0 }}>Нийт борлуулалт</p>
          <h2 style={{ color: "#D4A843", fontSize: "2rem" }}>{totalRevenue.toLocaleString()}₮</h2>
        </div>
        <div style={{ flex: 1, background: "#141414", padding: "20px", borderRadius: "12px", border: "1px solid #333" }}>
          <p style={{ color: "#888", margin: 0 }}>Хүлээгдэж буй</p>
          <h2 style={{ color: "#D4A843", fontSize: "2rem" }}>{pendingOrders}</h2>
        </div>
        <div style={{ flex: 1, background: "#141414", padding: "20px", borderRadius: "12px", border: "1px solid #333" }}>
          <p style={{ color: "#888", margin: 0 }}>Нийт захиалга</p>
          <h2 style={{ color: "#D4A843", fontSize: "2rem" }}>{orders.length}</h2>
        </div>
      </div>

      {/* REPORT TABLE */}
      <div style={{ background: "#141414", borderRadius: "15px", overflow: "hidden", border: "1px solid #222" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1E1E1E", color: "#D4A843", textAlign: "left" }}>
              <th style={{ padding: "18px" }}>Хэрэглэгч</th>
              <th style={{ padding: "18px" }}>Захиалсан цаг</th>
              <th style={{ padding: "18px" }}>Авах цаг</th>
              <th style={{ padding: "18px" }}>Бараанууд</th>
              <th style={{ padding: "18px" }}>Дүн</th>
              <th style={{ padding: "18px" }}>Төлөв</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} style={{ borderBottom: "1px solid #222", fontSize: "0.9rem" }}>
                <td style={{ padding: "18px" }}>
                  <div style={{ fontWeight: "bold" }}>{order.user_email || "Тодорхойгүй"}</div>
                  <div style={{ fontSize: "0.7rem", color: "#555" }}>{order.user_id}</div>
                </td>
                <td style={{ padding: "18px", color: "#888" }}>
                  {new Date(order.created_at).toLocaleString('mn-MN')}
                </td>
                <td style={{ padding: "18px", fontWeight: "bold", color: "#D4A843" }}>{order.pickup_time}</td>
                <td style={{ padding: "18px" }}>
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx}>{item.emoji} {item.name} (x{item.qty})</div>
                  ))}
                </td>
                <td style={{ padding: "18px", fontWeight: "bold" }}>{order.total.toLocaleString()}₮</td>
                <td style={{ padding: "18px" }}>
                  <span style={{ 
                    padding: "4px 10px", 
                    borderRadius: "20px", 
                    fontSize: "0.8rem",
                    background: order.status === "ready" ? "#1b4332" : "#2d2d2d",
                    color: order.status === "ready" ? "#74c69d" : "#D4A843"
                  }}>
                    {order.status === "pending" ? "Хүлээгдэж буй" : order.status === "preparing" ? "Бэлтгэж байна" : "Бэлэн"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}