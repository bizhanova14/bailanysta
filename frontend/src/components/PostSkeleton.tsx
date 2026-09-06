export function PostSkeleton() {
  return (
    <div className="card">
      <div className="skeleton" style={{ width: "40%", height: 14, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: "100%", height: 14, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: "80%", height: 14, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: "30%", height: 14 }} />
    </div>
  );
}
