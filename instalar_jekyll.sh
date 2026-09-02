#!/usr/bin/env bash
# =============================================================================
#  Instala el entorno para compilar este sitio Jekyll en local (macOS).
#
#  Uso:   cd ~/Library/CloudStorage/Dropbox/pagina_web
#         bash instalar_jekyll.sh
#
#  Es idempotente: si algo ya está instalado, lo salta.
#  Instala Ruby 3.3.4, la misma versión que usa GitHub Pages.
# =============================================================================
set -o pipefail

RUBY_V="3.3.4"
ok()   { printf '\033[32m  ✓\033[0m %s\n' "$1"; }
info() { printf '\033[36m  →\033[0m %s\n' "$1"; }
warn() { printf '\033[33m  !\033[0m %s\n' "$1"; }
die()  { printf '\033[31m  ✗\033[0m %s\n' "$1"; exit 1; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

[ "$(uname)" = "Darwin" ] || die "Este script es para macOS. En Ubuntu: sudo apt install ruby-full build-essential zlib1g-dev"
[ -f "_config.yml" ] || die "Ejecútalo desde la carpeta pagina_web/ (no encuentro _config.yml)."

# --- 1. Homebrew -------------------------------------------------------------
step "1/5  Homebrew"
if command -v brew >/dev/null 2>&1; then
  ok "ya instalado ($(brew --version | head -1))"
else
  info "instalando… (te va a pedir tu contraseña de macOS)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || die "falló la instalación de Homebrew"
  # Apple Silicon deja brew en /opt/homebrew
  [ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
  [ -x /usr/local/bin/brew ]    && eval "$(/usr/local/bin/brew shellenv)"
  command -v brew >/dev/null 2>&1 || die "brew quedó instalado pero no está en el PATH. Abre una terminal nueva y vuelve a correr el script."
  ok "instalado"
fi
BREW_PREFIX="$(brew --prefix)"

# --- 2. chruby + ruby-install ------------------------------------------------
step "2/5  chruby y ruby-install"
if [ -f "$BREW_PREFIX/opt/chruby/share/chruby/chruby.sh" ] && command -v ruby-install >/dev/null 2>&1; then
  ok "ya instalados"
else
  brew install chruby ruby-install || die "falló brew install chruby ruby-install"
  ok "instalados"
fi

# --- 3. Ruby -----------------------------------------------------------------
step "3/5  Ruby $RUBY_V"
if [ -d "$HOME/.rubies/ruby-$RUBY_V" ]; then
  ok "ya está en ~/.rubies/ruby-$RUBY_V"
else
  info "compilando Ruby $RUBY_V — esto tarda entre 3 y 10 minutos, es normal"
  ruby-install --no-reinstall ruby "$RUBY_V" || die "falló ruby-install"
  ok "instalado"
fi

# --- 4. Activarlo en la shell ------------------------------------------------
step "4/5  Configurar zsh"
ZSHRC="$HOME/.zshrc"
touch "$ZSHRC"
add_line() {
  grep -qF "$1" "$ZSHRC" 2>/dev/null && { info "ya estaba: $1"; return; }
  printf '%s\n' "$1" >> "$ZSHRC"; ok "agregado a ~/.zshrc: $1"
}
grep -qF '# --- Ruby (chruby) ---' "$ZSHRC" || printf '\n# --- Ruby (chruby) ---\n' >> "$ZSHRC"
add_line 'source $(brew --prefix)/opt/chruby/share/chruby/chruby.sh'
add_line 'source $(brew --prefix)/opt/chruby/share/chruby/auto.sh'
add_line "chruby ruby-$RUBY_V"

# activarlo también en ESTA sesión
set +u                      # chruby.sh referencia variables sin definir
source "$BREW_PREFIX/opt/chruby/share/chruby/chruby.sh"
chruby "ruby-$RUBY_V" || die "chruby no pudo activar ruby-$RUBY_V"
ok "ruby activo: $(ruby -v)"

# --- 5. Gemas del proyecto ---------------------------------------------------
step "5/5  Bundler y gemas del sitio"
command -v bundle >/dev/null 2>&1 || gem install bundler --no-document || die "falló gem install bundler"
ok "bundler $(bundle --version | awk '{print $3}')"
info "instalando jekyll y dependencias (bundle install)…"
bundle install || die "falló bundle install"
ok "gemas instaladas"

# --- listo -------------------------------------------------------------------
cat <<'FIN'

────────────────────────────────────────────────────────────
  Listo. Para levantar el sitio:

      bundle exec jekyll serve

  y abre  http://localhost:4000
  (Ctrl+C para detenerlo. Recompila solo al guardar archivos.)

  Abre una terminal NUEVA para que chruby quede activo por defecto.
────────────────────────────────────────────────────────────
FIN
