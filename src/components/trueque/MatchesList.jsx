import { palette, body, display } from "../../theme.js";
import { MatchCard } from "./MatchCard.jsx";

function Group({ title, hint, matches, onMessage, onRate }) {
  if (matches.length === 0) return null;
  return (
    <section style={{ marginBottom: "1.25rem" }}>
      <p style={{ ...display, fontSize: "1rem", fontWeight: 700, color: palette.ink, margin: "0 0 0.15rem" }}>{title} <span style={{ ...body, fontWeight: 400, color: palette.inkFaint }}>({matches.length})</span></p>
      <p style={{ ...body, fontSize: "0.8rem", color: palette.inkFaint, margin: "0 0 0.6rem" }}>{hint}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {matches.map((m) => <MatchCard key={m.match_id} match={m} onMessage={onMessage} onRate={onRate} />)}
      </div>
    </section>
  );
}

// Matches agrupados: 🟢 perfectos, 🟡 parciales, ✅ completados.
function MatchesList({ matches, onMessage, onRate }) {
  if (!matches || matches.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
        <p style={{ fontSize: "2rem", margin: 0 }}>🔍</p>
        <p style={{ ...display, fontSize: "1rem", fontWeight: 600, color: palette.ink, margin: "0.5rem 0 0.25rem" }}>Aún no tienes matches</p>
        <p style={{ ...body, fontSize: "0.88rem", color: palette.inkSoft, margin: 0 }}>
          Agrega libros en "Ofrezco" y "Busco", y toca "Buscar matches".
        </p>
      </div>
    );
  }
  const live = matches.filter((m) => m.status !== "completed");
  return (
    <div>
      <Group title="🟢 Matches perfectos" hint="Intercambio directo: los dos tienen lo que el otro busca." matches={live.filter((m) => m.match_type === "perfecto")} onMessage={onMessage} onRate={onRate} />
      <Group title="🟡 Matches parciales" hint="Uno de los dos tiene lo que el otro busca; negocien en el chat." matches={live.filter((m) => m.match_type === "parcial")} onMessage={onMessage} onRate={onRate} />
      <Group title="✅ Completados" hint="Intercambios cerrados." matches={matches.filter((m) => m.status === "completed")} onMessage={onMessage} onRate={onRate} />
    </div>
  );
}

export { MatchesList };
