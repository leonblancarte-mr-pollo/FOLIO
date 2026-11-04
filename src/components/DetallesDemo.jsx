import { FONT_LINK, palette, PALETTE_LIGHT, PALETTE_DARK, applyPaletteCssVars, SEMA_EXTENDIDA, display, body, ts } from "../theme.js";
import { CintaAdhesiva, SelloTinta, Boleto, NotaMano } from "./Detalles.jsx";

// Página de muestra del kit de detalles (ronda 4, 2026-11-03). Se monta SOLO en desarrollo con
// `?detalles=1` (ver main.jsx); no forma parte de la app. Es un catálogo: aquí van todas las
// variantes juntas, cosa que en una pantalla real está prohibida (máximo dos detalles por tarjeta).
// El tema se lee de `folio_theme` como hace MainApp, para capturar en claro y oscuro.

const EXT = Object.fromEntries(SEMA_EXTENDIDA.map((c) => [c.key, c]));

function Titulo({ children }) {
  return <h2 style={{ ...display, fontSize: 17, fontWeight: 700, margin: "0 0 0.9rem", color: palette.ink }}>{children}</h2>;
}
function Nota({ children, color }) {
  return <p style={{ ...body, fontSize: 13, lineHeight: 1.4, margin: "0 0 0.75rem", color: color || palette.inkSoft }}>{children}</p>;
}
function Fila({ children, gap = "1rem", align = "center" }) {
  return <div style={{ display: "flex", flexWrap: "wrap", alignItems: align, gap, marginBottom: "1.1rem" }}>{children}</div>;
}

// Una tarjeta con cinta: el único caso en que el detalle sale del contenedor (el padre no recorta).
function TarjetaConCinta({ cinta, fondo, tinta, children }) {
  return (
    <div style={{ position: "relative", marginTop: 14, border: `2px solid ${tinta}`, borderRadius: 14, padding: "1.1rem 1rem 0.9rem", backgroundColor: fondo, color: tinta }}>
      {cinta}
      {children}
    </div>
  );
}

function Bloque({ isDark, fondo, tinta, titulo, nota, cinta, sellos, boletos }) {
  return (
    <section style={{ backgroundColor: fondo, color: tinta, padding: "1.25rem 1rem 1rem", borderRadius: fondo === palette.bg ? 0 : 16, marginBottom: "1.25rem" }}>
      <Titulo>{titulo}</Titulo>
      {nota && <Nota color={fondo === palette.bg ? palette.inkSoft : tinta}>{nota}</Nota>}

      <TarjetaConCinta cinta={cinta} fondo={fondo} tinta={tinta}>
        <p style={{ ...ts.quote, fontSize: 18, margin: 0, color: tinta }}>Lo leí en dos tardes y todavía no sé si Meursault me cae bien o me da miedo.</p>
        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
          <SelloTinta angulo={-6}>Libro terminado</SelloTinta>
        </div>
      </TarjetaConCinta>

      <div style={{ height: "1.1rem" }} />
      <Fila gap="1.1rem">{sellos}</Fila>
      <Fila gap="0.9rem 1.2rem">{boletos}</Fila>

      <Fila gap="1.5rem" align="flex-end">
        <div>
          <div style={{ ...display, fontSize: 30, fontWeight: 700, lineHeight: 1, color: tinta }}>217</div>
          <NotaMano flecha="arriba" angulo={-3} style={{ marginTop: 6 }}>te faltan 783 páginas</NotaMano>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...display, fontSize: 30, fontWeight: 700, lineHeight: 1, color: tinta }}>12</div>
          <NotaMano flecha="izquierda" angulo={2}>días seguidos, no pasa nada si mañana no</NotaMano>
        </div>
      </Fila>
      <NotaMano angulo={-1}>sin flecha, solo la raya</NotaMano>
    </section>
  );
}

export default function DetallesDemo() {
  const isDark = typeof localStorage !== "undefined" && localStorage.getItem("folio_theme") === "dark";
  Object.assign(palette, isDark ? PALETTE_DARK : PALETTE_LIGHT);
  applyPaletteCssVars(isDark);
  const mostaza = EXT.mostaza;

  return (
    <div style={{ ...body, minHeight: "100vh", backgroundColor: palette.bg, color: palette.ink, maxWidth: 480, margin: "0 auto", paddingBottom: "2rem" }}>
      <style>{FONT_LINK}</style>
      <header style={{ padding: "1.25rem 1rem 0.25rem" }}>
        <h1 style={{ ...display, fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Kit de detalles</h1>
        <Nota>Catálogo de muestra ({isDark ? "oscuro" : "claro"}). En una pantalla real: máximo dos detalles por tarjeta y un protagonista.</Nota>
      </header>

      <Bloque
        isDark={isDark}
        fondo={palette.bg}
        tinta={palette.ink}
        titulo="Sobre el fondo"
        nota={isDark ? "Sello: tinta (default), firma y éxito pasan sobre negro; frío no (3.68)." : "Sello: tinta (default), frío y éxito pasan sobre blanco; firma no (1.99)."}
        cinta={<CintaAdhesiva color="superficie" angulo={-4} position="top-left" />}
        sellos={<>
          <SelloTinta>Récord personal</SelloTinta>
          <SelloTinta size="sm" angulo={5}>Nº 1 del mes</SelloTinta>
          {isDark ? <SelloTinta color="firma" angulo={-4}>Racha viva</SelloTinta> : <SelloTinta color="frio" angulo={-4}>Reseñado</SelloTinta>}
          <SelloTinta color="exito" angulo={3}>Leído</SelloTinta>
        </>}
        boletos={<>
          <Boleto color="superficie" talon="03 NOV">Cuento del día</Boleto>
          <Boleto color="firma" talon="12 días" talonAncho={70} angulo={2}>Racha</Boleto>
          <Boleto color="cielo" perforado="lados" angulo={-2}>14 min de lectura</Boleto>
          <Boleto color="mostaza" perforado="ninguno" angulo={1} size="sm">Logro</Boleto>
        </>}
      />

      <div style={{ padding: "0 1rem" }}>
        <Bloque
          isDark={isDark}
          fondo={palette.superficieSuave}
          tinta={palette.ink}
          titulo="Sobre superficie suave"
          nota="Sello solo en tinta (frío y éxito no alcanzan a 13 px sobre arena)."
          cinta={<CintaAdhesiva color="firma" angulo={3} position="top-right" />}
          sellos={<>
            <SelloTinta>Récord personal</SelloTinta>
            <SelloTinta size="sm" angulo={6}>Nº 1 del mes</SelloTinta>
          </>}
          boletos={<>
            <Boleto color="firma" talon="03 NOV">Cuento del día</Boleto>
            <Boleto color="cielo" perforado="lados" angulo={2}>14 min de lectura</Boleto>
            <Boleto color="papel" perforado="ninguno" angulo={-1}>Papel fijo</Boleto>
          </>}
        />

        <Bloque
          isDark={isDark}
          fondo={mostaza.hex}
          tinta={mostaza.on}
          titulo="Sobre mostaza (extendida)"
          nota="Texto encima siempre en el «on» del color; sello en tinta; boleto de papel fijo (SEMA_PAPEL)."
          cinta={<CintaAdhesiva color="papel" angulo={-2} position="top-center" width={96} />}
          sellos={<>
            <SelloTinta>Récord personal</SelloTinta>
            <SelloTinta size="sm" angulo={4}>Nº 1 del mes</SelloTinta>
          </>}
          boletos={<>
            <Boleto color="papel" talon="03 NOV">Cuento del día</Boleto>
            <Boleto color="papel" perforado="lados" angulo={2}>14 min de lectura</Boleto>
            <Boleto color="firma" perforado="ninguno" angulo={-2}>Racha</Boleto>
          </>}
        />
      </div>
    </div>
  );
}
