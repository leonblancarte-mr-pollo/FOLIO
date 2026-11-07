// Compartir una imagen de collage (2026-11-06). Sin datos nuevos: solo el navegador y el archivo.
//   · Con hoja nativa (celular): navigator.share con el archivo. Ahí aparecen Instagram, WhatsApp, etc.
//     Instagram web no recibe imágenes desde el navegador, así que no se integra su API.
//   · Sin hoja nativa (escritorio, navegadores viejos): descarga el archivo.
// Devuelve "compartido" | "cancelado" | "descargado". Lanza error si no se pudo armar o descargar.

export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function compartirArchivo(blob, nombre, titulo = "Mi collage") {
  const tipo = blob.type || "image/png";
  const file = new File([blob], nombre, { type: tipo });
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titulo });
      return "compartido";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelado";
      throw err;
    }
  }
  descargarArchivo(blob, nombre);
  return "descargado";
}
