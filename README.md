# Sitio personal — Felipe A. Carreño López

Sitio web personal construido con **Jekyll** y publicado con **GitHub Pages**.
Bilingüe español / inglés, sin base de datos y sin dependencias externas: todo
el contenido vive en archivos YAML dentro de `_data/`.

---

## 1. Publicarlo por primera vez

1. Crea en GitHub un repositorio **público** llamado exactamente
   `TU_USUARIO.github.io` (por ejemplo `facarreno.github.io`). El nombre debe
   coincidir con tu usuario; así el sitio queda en `https://TU_USUARIO.github.io`
   sin sufijos.

2. Reemplaza `facarreno` por tu usuario real en `_config.yml`
   (campos `url`, `author.github`) y en `robots.txt`.

3. Desde esta carpeta:

   ```bash
   git init -b main
   git add .
   git commit -m "Sitio personal: versión inicial"
   git remote add origin https://github.com/TU_USUARIO/TU_USUARIO.github.io.git
   git push -u origin main
   ```

4. En GitHub: **Settings → Pages → Build and deployment**, elige
   *Deploy from a branch*, rama `main`, carpeta `/ (root)`. En un par de minutos
   el sitio queda publicado.

> **Dropbox + git.** Esta carpeta vive dentro de Dropbox, así que conviene
> decirle a Dropbox que no sincronice el historial de git. Después de `git init`,
> en macOS:
>
> ```bash
> xattr -w com.dropbox.ignored 1 .git
> ```
>
> Así Dropbox deja de tocar `.git` y se acaba el riesgo de que dos máquinas
> sincronizando a la vez corrompan el repositorio. Repítelo en cada equipo donde
> clones o inicialices el repo. Regla práctica: **una máquina a la vez**, y
> `commit` + `push` antes de cambiar de equipo (igual que con el CV).

---

## 2. Estructura

```
.
├── _config.yml           # datos globales: nombre, ORCID, métricas, URL
├── _data/                # TODO el contenido editable
│   ├── es.yml            #   textos de interfaz en español
│   ├── en.yml            #   textos de interfaz en inglés
│   ├── research.yml      #   líneas de investigación (ES + EN)
│   ├── publications.yml  #   artículos, en preparación, patentes, congresos
│   ├── theses.yml        #   tesis dirigidas
│   ├── courses.yml       #   cursos
│   ├── cv.yml            #   educación, experiencia, fondos, premios, skills
│   ├── news.yml          #   novedades de la portada
│   └── collaborators.yml #   colaboraciones y financiamiento
├── _layouts/             # plantillas de página
├── _includes/            # cabecera, nav, footer, íconos
├── assets/
│   ├── css/style.css     # estilos (paleta y tipografía)
│   ├── img/              # foto de perfil, favicon
│   └── cv/               # CV en PDF (español e inglés)
├── index.html            # portada ES        → /
├── investigacion.html    #                   → /investigacion/
├── publicaciones.html    #                   → /publicaciones/
├── docencia.html         #                   → /docencia/
├── cv.html               #                   → /cv/
├── contacto.html         #                   → /contacto/
└── en/                   # las mismas páginas en inglés → /en/...
```

Cada página es un archivo de tres líneas: elige la plantilla, el idioma y la
página equivalente en el otro idioma. Todo lo demás sale de `_data/`.

---

## 3. Tareas frecuentes

**Agregar una publicación** → `_data/publications.yml`, bloque `indexed`.
Pon `featured: true` para que aparezca también en la portada.

```yaml
  - year: 2027
    authors: "Carreño-López, F. A., Otro, A."
    title: "Título del artículo"
    journal: "Nombre de la revista"
    details: "12(3), 45678"
    quartile: "Q1"
    impact: "9.9"
    doi: "10.1016/j.xxx.2027.123456"
    featured: true
```

Tu nombre se destaca solo: el sitio busca `Carreño-López, F. A.` y lo pone en
negrita. Escríbelo siempre igual.

**Agregar una novedad** → `_data/news.yml`, arriba de todo (orden cronológico
inverso). Requiere `date`, `tag`, `title` y `body`, cada uno con `es` y `en`.

**Agregar un tesista** → `_data/theses.yml`. `role: supervisor` (guía) o
`role: cosupervisor` (co-guía); `status: current` o `past`.

**Actualizar métricas de la portada** → `_config.yml`, bloque `metrics`.
El número de tesis y de fondos se cuenta solo desde los datos.

**Cambiar el CV en PDF** → reemplaza los archivos en `assets/cv/`
manteniendo los nombres `Felipe_Carreno_CV_ES.pdf` y `Felipe_Carreno_CV_EN.pdf`.

**Cambiar los colores** → primeras líneas de `assets/css/style.css`
(`--primary`, `--accent`, …).

**Regla de oro:** todo texto visible tiene versión `es` y `en`. Si agregas una,
agrega la otra.

---

## 4. Compilar y previsualizar en local

GitHub Pages compila el sitio por ti al hacer `push`, así que esto es opcional.
Sirve para ver los cambios antes de publicarlos y para detectar errores sin
esperar el build remoto.

Lo que necesitas: **Ruby**, **Bundler** y las gemas del `Gemfile`. No uses el
Ruby que viene con macOS (es viejo y obliga a instalar gemas con `sudo`);
instala uno propio.

### Atajo: script de instalación (macOS)

En vez de seguir los pasos a mano, desde esta carpeta:

```bash
bash instalar_jekyll.sh
```

Instala Homebrew (si falta), `chruby`, Ruby 3.3.4, Bundler y las gemas del
proyecto, y deja zsh configurado. Es idempotente: puedes correrlo de nuevo sin
romper nada. Te pedirá tu contraseña de macOS para Homebrew, y compilar Ruby
tarda entre 3 y 10 minutos.

Los pasos manuales equivalentes, por si prefieres verlos uno a uno:

### macOS (con Homebrew + chruby)

```bash
# 1. Homebrew, si no lo tienes
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Gestor de versiones de Ruby
brew install chruby ruby-install

# 3. Ruby 3.3.4 — la misma versión que usa GitHub Pages
ruby-install ruby 3.3.4

# 4. Activarlo en cada terminal nueva (zsh)
echo 'source $(brew --prefix)/opt/chruby/share/chruby/chruby.sh' >> ~/.zshrc
echo 'source $(brew --prefix)/opt/chruby/share/chruby/auto.sh'   >> ~/.zshrc
echo 'chruby ruby-3.3.4'                                          >> ~/.zshrc
exec zsh                      # recargar la terminal
ruby -v                       # debe decir 3.3.4
```

### Ubuntu (el PC de simulación)

```bash
sudo apt update
sudo apt install ruby-full build-essential zlib1g-dev
echo 'export GEM_HOME="$HOME/.gems"'            >> ~/.bashrc
echo 'export PATH="$HOME/.gems/bin:$PATH"'      >> ~/.bashrc
source ~/.bashrc
```

### En ambos, dentro de esta carpeta

```bash
gem install bundler
bundle install                # instala jekyll y el resto del Gemfile
bundle exec jekyll serve      # http://localhost:4000
```

`jekyll serve` se queda escuchando: cada vez que guardas un archivo, recompila.
Recarga el navegador y ves el cambio. `Ctrl+C` para detenerlo.

**Sobre las versiones.** GitHub Pages compila hoy con **Ruby 3.3.4, Jekyll 3.10.0
y la gema `github-pages` 232**. El `Gemfile` de este proyecto usa `github-pages`
justamente para que tu build local use esas mismas versiones y no te sorprenda
una diferencia al publicar. Puedes verificar las versiones vigentes en
<https://pages.github.com/versions/>.

**Si no quieres instalar nada:** edita, haz `push`, y mira la pestaña *Actions*
del repositorio. Si el build falla, ahí sale el error. Es más lento (1–2 min por
intento) pero funciona.

## 5. Dominio propio (más adelante)

1. Crea un archivo `CNAME` en la raíz con una sola línea: `tudominio.cl`
2. En tu proveedor DNS apunta el dominio a GitHub Pages
   (registros `A` a las IP de GitHub, o un `CNAME` a `TU_USUARIO.github.io`).
3. Actualiza `url:` en `_config.yml`.
4. En **Settings → Pages** activa *Enforce HTTPS*.
