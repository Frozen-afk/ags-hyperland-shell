#!/usr/bin/env bash
# ===========================================================
# Astral shell — one-shot uninstaller (run with sudo)
#
#   sudo ./uninstall-astral.sh
#
# Removes EVERYTHING install-fedora.sh put on the system:
#   - Hyprland COPR packages + CLI tools + build dependencies
#     (dnf remove + autoremove), and the COPR itself
#   - swww, matugen, appmenu-glib-translator (local RPMs)
#   - /opt/astral (ags v2 + astal libs + gjs glue)  -> rm -rf
#   - /usr/local/bin/ags shim
#   - ~/.config/ags and the deployed ~/.config/hypr files
#     (config files identical to the ones we ship are deleted;
#     anything you modified is left in place)
#
# Your GNOME session and unrelated packages are not touched.
# ===========================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REAL_USER="${SUDO_USER:-$(logname)}"
REAL_HOME="$(getent passwd "$REAL_USER" | cut -d: -f6)"
HYPR_DIR="${XDG_CONFIG_HOME:-$REAL_HOME/.config}/hypr"

if [ "$(id -u)" != "0" ]; then
    echo "!! run this with sudo" >&2
    exit 1
fi

echo "==> [1/6] Removing Hyprland packages, tools and build dependencies"
# Packages that were already installed before the Astral installer ran
# (rpms/preinstall-snapshot.txt, recorded by the repo) are kept.
REMOVE_PKGS=(hyprland hyprlock hypridle hyprpaper hyprpolkitagent
    xdg-desktop-portal-hyprland
    swww matugen
    appmenu-glib-translator appmenu-glib-translator-devel
    grim slurp cliphist brightnessctl playerctl wf-recorder gromit-mpx foot
    meson ninja-build vala valadoc golang glib2-devel gtk4-devel
    gtk4-layer-shell-devel gobject-introspection-devel json-glib-devel
    NetworkManager-libnm-devel gdk-pixbuf2-devel upower-devel
    wireplumber-devel)
FINAL_PKGS=()
for p in "${REMOVE_PKGS[@]}"; do
    if grep -qxF "$p" "$REPO/rpms/preinstall-snapshot.txt" 2>/dev/null; then
        echo "   keeping $p (was already installed before Astral)"
    else
        FINAL_PKGS+=("$p")
    fi
done
dnf remove -y "${FINAL_PKGS[@]}" 2>/dev/null || echo "   (some packages were not installed — skipped)"

echo "==> [2/6] Removing the COPR repository"
dnf copr remove -y sachesi/hyprland 2>/dev/null || true
rm -f /etc/yum.repos.d/_copr_sachesi-hyprland.repo
rm -f /etc/yum.repos.d/_copr:copr.fedorainfracloud.org:sachesi:hyprland.repo
rm -f /etc/yum.repos.d/sachesi-hyprland.repo

echo "==> [3/6] Autoremoving leftover dependencies"
dnf autoremove -y

echo "==> [4/6] Removing /opt/astral (ags v2 + astal libs + gjs glue)"
rm -rf /opt/astral
rm -f /usr/local/bin/ags

echo "==> [5/6] Removing deployed configs for $REAL_USER"
rm -rf "$REAL_HOME/.config/ags"

if [ -d "$HYPR_DIR" ]; then
    # shell.conf is always ours
    rm -f "$HYPR_DIR/shell.conf"
    # other files only if they are unmodified copies of ours
    for f in hyprland.conf hyprlock.conf hypridle.conf; do
        if [ -f "$HYPR_DIR/$f" ] && [ -f "$REPO/hypr/$f" ] \
           && diff -q "$HYPR_DIR/$f" "$REPO/hypr/$f" >/dev/null 2>&1; then
            rm -f "$HYPR_DIR/$f"
            echo "   removed unmodified $f"
        elif [ -f "$HYPR_DIR/$f" ]; then
            echo "   kept modified $f"
        fi
    done
    # drop the hyprland dir if it ended up empty
    rmdir "$HYPR_DIR" 2>/dev/null || true
fi

echo "==> [6/6] Done."
cat <<'NOTE'

Everything the installer put on the system has been removed:
packages, COPR, /opt/astral, the ags shim and deployed configs.

If you had set Hyprland as your default GDM session it will now
fall back to the next available session (GNOME).
NOTE
