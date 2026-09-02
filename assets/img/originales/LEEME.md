# Logos originales

Copias sin modificar de los archivos que están en `Dropbox/04_Biblioteca/`.
El sitio **no** usa estos archivos: usa las versiones optimizadas que están un
nivel más arriba (`assets/img/logo_*.png`), recortadas al contenido y
redimensionadas a 160–240 px de alto.

| Archivo | Original | Versión del sitio |
|---|---|---|
| `logo_uandes.png` | 474 × 92 | recortado y escalado a 160 px de alto |
| `logo_gtech.png`  | 402 × 144 | recortado y escalado a 160 px de alto |
| `logo_anid.png`   | 988 × 534, **versión blanca** | invertido a monocromo oscuro y escalado a 240 px de alto |

## Sobre el logo de ANID

El original es la versión blanca, para fondos oscuros: sobre el fondo claro del
sitio es invisible. La versión que se publica está invertida a monocromo oscuro,
conservando la transparencia. Si consigues la versión oficial en color o el
negativo para fondo claro, reemplaza `assets/img/logo_anid.png` y no hace falta
tocar nada más.

## Si reemplazas algún logo

Los tamaños en pantalla se controlan por CSS (`.logos img` en
`assets/css/style.css`), no por el archivo. Basta con que el PNG tenga fondo
transparente y al menos 160 px de alto.
