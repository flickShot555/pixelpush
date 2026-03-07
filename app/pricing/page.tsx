export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto" style={{ maxWidth: 900, padding: "120px 48px 80px" }}>
        <h1
          style={{
            fontFamily: "var(--pp-font-head)",
            fontSize: 28,
            fontWeight: 800,
            color: "var(--pp-text)",
            marginBottom: 12,
          }}
        >
          Pricing
        </h1>
        <p style={{ color: "var(--pp-muted)", fontFamily: "var(--pp-font-body)", fontSize: 14 }}>
          Placeholder page. We’ll build this screen from your screenshot next.
        </p>
      </main>
    </div>
  );
}
