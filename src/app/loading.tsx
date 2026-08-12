export default function Loading() {
  return (
    <div className="wrap sec">
      <div className="skel-title" />
      <div className="skel-line" style={{ width: '48%' }} />
      <div className="g3" style={{ marginTop: 'var(--s6)' }}>
        {[0, 1, 2].map((i) => (
          <div className="skel-card" key={i} />
        ))}
      </div>
    </div>
  );
}
