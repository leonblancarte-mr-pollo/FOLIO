import { palette, body, display } from "../../theme.js";
import { Sheet, PrimaryButton } from "./ui.jsx";

// Placeholder de monetización: aún NO hay pago real de Folio Plus.
function PlusUpsellModal({ reason, onClose }) {
  return (
    <Sheet title="✨ Folio Plus" onClose={onClose}>
      {reason && <p style={{ ...body, fontSize: "0.9rem", color: palette.inkSoft, margin: "0 0 0.6rem" }}>{reason}</p>}
      <p style={{ ...display, fontSize: "1.02rem", fontWeight: 600, color: palette.ink, margin: "0 0 1rem", lineHeight: 1.4 }}>
        Has llegado al límite gratuito. Upgrade a Folio Plus por $XX/mes o compra más gemas para seguir usando esta feature.
      </p>
      <ul style={{ ...body, fontSize: "0.9rem", color: palette.inkSoft, margin: "0 0 1.2rem", paddingLeft: "1.2rem", lineHeight: 1.6 }}>
        <li>Libros ofrecidos y buscados ilimitados</li>
        <li>Hasta 5 zonas de intercambio</li>
        <li>Búsquedas de matches sin gastar gemas</li>
      </ul>
      <PrimaryButton disabled>Próximamente</PrimaryButton>
      <button onClick={onClose} style={{ width: "100%", marginTop: "0.5rem", background: "none", border: "none", cursor: "pointer", ...body, fontSize: "0.9rem", color: palette.inkFaint, padding: "0.4rem" }}>
        Entendido
      </button>
    </Sheet>
  );
}

export { PlusUpsellModal };
