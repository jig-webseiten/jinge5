// apps/site/components/ProsCons.tsx
export function ProsCons({ pros = [], cons = [] }: { pros?: string[]; cons?: string[] }) {
  return (
    <div className="proscons">
      <div className="pros-card">
        <h3>Vorteile</h3>
        <ul>{pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </div>
      <div className="cons-card">
        <h3>Nachteile</h3>
        <ul>{cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>
    </div>
  );
}
