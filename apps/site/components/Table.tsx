
export function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table role="table">
      <thead>
        <tr>{headers.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
