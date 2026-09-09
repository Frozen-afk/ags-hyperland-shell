#!/usr/bin/env bash
# ===========================================================
# Astral shell — Fedora dependency installer (run with sudo)
#
#   sudo ./install-fedora.sh
#
# Installs Hyprland + the AGS v2 toolchain from pinned sources
# into a self-contained /opt/astral prefix, so everything can be
# removed again with ./uninstall-astral.sh in one shot.
#
# What goes where:
#   - dnf (COPR sachesi/hyprland + official repos): Hyprland and
#     CLI tools — reversible via dnf remove + autoremove
#   - /opt/astral: ags v2.3.0 binary, astal libraries (pinned
#     rev), the astal gjs glue, wrappers — one rm -rf
#   - /usr/local/bin/ags: shim -> /opt/astral wrapper
#   - ~/.config/ags, ~/.config/hypr: shell + compositor configs
#     (deployed by ./install.sh as your user; nothing overwritten)
# ===========================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REAL_USER="${SUDO_USER:-$(logname)}"
REAL_HOME="$(getent passwd "$REAL_USER" | cut -d: -f6)"
OPT=/opt/astral

fail() { echo "!! $*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || fail "run this with sudo"
echo "==> Installing for user $REAL_USER (repo: $REPO)"

# ---------------------------------------------------------------
echo "==> [1/8] Installing packages"
# The COPR repo file is installed directly (no copr-frontend API call —
# that host is the one with flaky DNS). dnf then resolves a coherent
# package set from the COPR download host + official mirrors.
if ! ls /etc/yum.repos.d/ | grep -q "sachesi:hyprland\|sachesi-hyprland"; then
    cp "$REPO/rpms/sachesi-hyprland.repo" /etc/yum.repos.d/sachesi-hyprland.repo
    echo "    COPR repo file installed"
fi

dnf install -y \
    hyprland hyprlock hypridle hyprpaper hyprpolkitagent \
    xdg-desktop-portal-hyprland \
    grim slurp cliphist brightnessctl playerctl wf-recorder gromit-mpx \
    meson ninja-build vala valadoc glib2-devel gtk4-devel \
    gtk4-layer-shell-devel gobject-introspection-devel json-glib-devel \
    NetworkManager-libnm-devel gdk-pixbuf2-devel upower-devel \
    wireplumber-devel \
    "$REPO/rpms/swww.rpm" \
    "$REPO/rpms/matugen.rpm" \
    "$REPO/rpms/appmenu-glib-translator.rpm" \
    "$REPO/rpms/appmenu-glib-translator-devel.rpm"

# ---------------------------------------------------------------
echo "==> [2/8] Building astal libraries (pinned rev) into $OPT"
export PKG_CONFIG_PATH="$OPT/lib64/pkgconfig:$OPT/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
export XDG_DATA_DIRS="$OPT/share:/usr/local/share:/usr/share"
export GI_TYPELIB_PATH="$OPT/lib64/girepository-1.0:$OPT/lib/girepository-1.0:/usr/lib64/girepository-1.0"
export C_INCLUDE_PATH="$OPT/include:$OPT/include/astal:$OPT/include/astal-io:/usr/local/include:${C_INCLUDE_PATH:-}"
export CPLUS_INCLUDE_PATH="$C_INCLUDE_PATH"
ASTAL_SRC="$REPO/vendor/astal-src"
build_lib() {
    local dir="$1" name="$2"
    echo "    - $name"
    rm -rf "$dir/_build"
    meson setup --prefix="$OPT" "$dir/_build" "$dir" >"/tmp/astral-$name-meson.log" 2>&1 || {
        tail -30 "/tmp/astral-$name-meson.log" >&2; fail "meson setup failed: $name (see /tmp/astral-$name-meson.log)"
    }
    meson install -C "$dir/_build" >"/tmp/astral-$name-build.log" 2>&1 || {
        tail -30 "/tmp/astral-$name-build.log" >&2; fail "build failed: $name (see /tmp/astral-$name-build.log)"
    }
}

build_lib "$ASTAL_SRC/lib/astal/io"          io
build_lib "$ASTAL_SRC/lib/astal/gtk4"        gtk4
build_lib "$ASTAL_SRC/lib/apps"              apps
build_lib "$ASTAL_SRC/lib/battery"           battery
build_lib "$ASTAL_SRC/lib/bluetooth"         bluetooth
build_lib "$ASTAL_SRC/lib/hyprland"          hyprland
build_lib "$ASTAL_SRC/lib/mpris"             mpris
build_lib "$ASTAL_SRC/lib/network"           network
build_lib "$ASTAL_SRC/lib/notifd"            notifd
build_lib "$ASTAL_SRC/lib/powerprofiles"     powerprofiles
build_lib "$ASTAL_SRC/lib/tray"              tray
build_lib "$ASTAL_SRC/lib/wireplumber"       wireplumber

# ---------------------------------------------------------------
echo "==> [3/8] Installing the astal gjs glue (needed by ags at build time)"
mkdir -p "$OPT/share/astal"
rm -rf "$OPT/share/astal/gjs"
cp -r "$ASTAL_SRC/lang/gjs" "$OPT/share/astal/gjs"

# ---------------------------------------------------------------
echo "==> [4/8] Building ags v2.3.0"
(cd "$REPO/vendor/ags-src" && \
    go build -mod=vendor \
        -o "$OPT/bin/ags.bin" \
        -ldflags "-X main.gtk4LayerShell=/usr/lib64/libgtk4-layer-shell.so -X main.astalGjs=$OPT/share/astal/gjs" \
        .)

# ---------------------------------------------------------------
echo "==> [5/8] Creating ags wrapper (loads /opt/astral typelibs) + shim"
cat >"$OPT/bin/ags" <<'WRAPPER'
#!/usr/bin/env bash
# Load the astal libraries/typelibs installed under /opt/astral.
libdirs=/opt/astral/lib64:/opt/astral/lib
export GI_TYPELIB_PATH="$libdirs/girepository-1.0${GI_TYPELIB_PATH:+:$GI_TYPELIB_PATH}"
export LD_LIBRARY_PATH="$libdirs${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec /opt/astral/bin/ags.bin "$@"
WRAPPER
chmod +x "$OPT/bin/ags"
ln -sf "$OPT/bin/ags" /usr/local/bin/ags

# ---------------------------------------------------------------
echo "==> [6/8] Verifying"
"$OPT/bin/ags" --version || true
swww --version || true
matugen --version || true

# ---------------------------------------------------------------
echo "==> [7/8] Deploying shell + compositor configs (as $REAL_USER)"
su - "$REAL_USER" -c "cd '$REPO' && ./install.sh"

# ---------------------------------------------------------------
echo "==> [8/8] Done."
cat <<'NOTE'

Everything installed. To try it:

  1. Log out of GNOME.
  2. On the GDM login screen pick your user, click the gear icon
     at the bottom right and choose "Hyprland".
  3. Log in — the bar/dock appear, then try:
       SUPER+Space launcher    SUPER+N quick settings
       SUPER+M notifications   SUPER+TAB window switcher
       SUPER+W wallpapers      SUPER+O overview

To remove everything this script installed, run:

  sudo ./uninstall-astral.sh

Your GNOME session is untouched — Hyprland is just another entry
in the GDM session picker.
NOTE
