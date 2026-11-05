# Mascotas de Sema (Lottie)

Animaciones del gato y del zorro en formato Lottie (JSON), listas para la app. Cada archivo es autónomo: las imágenes van incrustadas dentro del JSON, así que no hay que copiar nada más.

Abre `vista-previa.html` en el navegador para ver todas las mascotas y estados (necesita internet para cargar el reproductor).

## Archivos

| Archivo | Lienzo | Duración | Peso | ¿En bucle? | Cuándo usarlo |
|---|---|---|---|---|---|
| `gato-leyendo.json` | 399×540 | 4.0 s | 373 KB | sí | Pantalla de inicio: parpadeo, cola y respiración. |
| `gato-dormido.json` | 490×453 | 12.0 s | 325 KB | sí | Racha en pausa o noche: respira, se rasca la nariz, suspira, Zzz. |
| `gato-celebrando.json` | 466×712 | 6.0 s | 496 KB | no, una vez | Subir de nivel o completar racha: saltos, confeti y baile. |
| `gato-cafe.json` | 337×456 | 8.0 s | 391 KB | sí | Mañana o primera sesión del día: parpadeo lento, cola y vapor. |
| `zorro-leyendo.json` | 366×487 | 5.0 s | 336 KB | sí | Pantalla de inicio: parpadeo, cola esponjada y respiración. |
| `zorro-dormido.json` | 437×370 | 12.0 s | 255 KB | sí | Racha en pausa o noche: respira, se rasca la nariz, suspira, Zzz. |
| `zorro-brincando.json` | 408×667 | 6.0 s | 383 KB | no, una vez | Subir de nivel o completar racha: brincos, confeti y baile. |

Todas están dibujadas a la misma escala: la cabeza mide casi lo mismo en cada estado y en cada mascota. Para que no “salten” de tamaño al cambiar de estado, muéstralas a su tamaño natural multiplicado por el mismo factor (por ejemplo, todas al 60 %), en lugar de meterlas en un contenedor fijo igual para todas.

El fondo es transparente. El contorno es lila, así que se lee bien sobre crema o fondos oscuros y se pierde un poco sobre lila.

## Cómo usarlo en web (React / Next.js)

```bash
npm install lottie-react
```

```jsx
import Lottie from "lottie-react";
import gatoLeyendo from "./lottie/gato-leyendo.json";
import gatoDormido from "./lottie/gato-dormido.json";
import gatoCelebrando from "./lottie/gato-celebrando.json";
import gatoCafe from "./lottie/gato-cafe.json";
import zorroLeyendo from "./lottie/zorro-leyendo.json";
import zorroDormido from "./lottie/zorro-dormido.json";
import zorroBrincando from "./lottie/zorro-brincando.json";

const MASCOTAS = {
  gato:  { leyendo: gatoLeyendo,  dormido: gatoDormido,  celebrando: gatoCelebrando, cafe: gatoCafe },
  zorro: { leyendo: zorroLeyendo, dormido: zorroDormido, celebrando: zorroBrincando },
};
const ESCALA = 0.6; // mismo factor para todas

export default function Mascota({ mascota = "gato", estado = "leyendo", onFin }) {
  const data = MASCOTAS[mascota][estado] ?? MASCOTAS[mascota].leyendo;
  const unaVez = estado === "celebrando";
  return (
    <Lottie
      animationData={data}
      loop={!unaVez}
      onComplete={unaVez ? onFin : undefined}
      style={{ width: data.w * ESCALA, height: data.h * ESCALA }}
      aria-label="Mascota de Sema"
    />
  );
}
```

En el ejemplo, el estado `celebrando` del zorro usa el archivo `zorro-brincando.json`, para que la app pida el mismo estado a cualquier mascota. El zorro todavía no tiene versión con café; si se pide, el componente muestra el estado `leyendo`.

Para la celebración: muéstrala al subir de nivel y, en `onFin`, regresa a `"leyendo"`. Si alguien tiene activada la opción de reducir movimiento en su sistema, conviene pausar la animación (`autoplay={false}`).

## Cómo usarlo en móvil (React Native)

```bash
npm install lottie-react-native
```

```jsx
import LottieView from "lottie-react-native";
<LottieView source={require("./lottie/zorro-leyendo.json")} autoPlay loop style={{ width: 220, height: 292 }} />
```

## Notas

- Los JSON pesan entre 250 y 500 KB porque llevan las ilustraciones originales incrustadas. Si hace falta aligerar, se pueden exportar a menor resolución.
- Las orejas no se mueven a propósito: al recortarlas de la ilustración se abría un hueco con la cabeza.
- El gato con café salió de una imagen comprimida por WhatsApp; con el PNG original de Gemini se puede regenerar más nítido.
