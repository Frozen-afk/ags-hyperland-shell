#!/usr/bin/env bash
# ===========================================================
# Astral shell installer — AGS v2 + Hyprland on Fedora
# Copies the shell into ~/.config/ags, wires up Hyprland
# configs (never overwriting your existing ones), and creates
# the directories the widgets expect.
# ===========================================================
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGS_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/ags"
HYPR_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/hypr"

echo "==> Installing AGS shell to $AGS_DIR"
mkdir -p "$AGS_DIR"
cp -r "$HERE"/app.ts "$HERE"/style.css "$HERE"/lib "$HERE"/bar \
      "$HERE"/menus "$HERE"/overlays "$HERE"/dock "$HERE"/theme \
      "$AGS_DIR/"

echo "==> Installing Hyprland configs to $HYPR_DIR"
mkdir -p "$HYPR_DIR"

# Shell integration snippet is always deployed (it is our file).
cp "$HERE/hypr-snippet.conf" "$HYPR_DIR/shell.conf"

# A full rice config is only installed when you don't have one yet.
if [ ! -f "$HYPR_DIR/hyprland.conf" ]; then
    cp "$HERE/hypr/hyprland.conf" "$HYPR_DIR/hyprland.conf"
    echo "    -> hyprland.conf created (edit monitor lines for your setup)"
else
    echo "    -> keeping your existing hyprland.conf"
    echo "       add this line to it if not present:  source = ~/.config/hypr/shell.conf"
fi

# Lock screen / idle config: never clobber existing files.
[ -f "$HYPR_DIR/hyprlock.conf" ] || cp "$HERE/hypr/hyprlock.conf" "$HYPR_DIR/"
[ -f "$HYPR_DIR/hypridle.conf" ] || cp "$HERE/hypr/hypridle.conf" "$HYPR_DIR/"

echo "==> Creating media directories"
mkdir -p "$HOME/Pictures/Wallpapers" "$HOME/Pictures/Screenshots" "$HOME/Videos"

# Default wallpaper for the first boot (optional).
WP="$HOME/Pictures/Wallpapers"
if [ -d "$WP" ] && [ -z "$(ls -A "$WP" 2>/dev/null)" ]; then
    echo "==> $WP is empty — drop wallpapers in there and pick one with SUPER+W"
fi

cat <<'NOTE'

==> Done. Remaining manual steps:

  1. Install packages (see README §1 for the full dnf/copr list).
  2. Log out, choose "Hyprland" in GDM, log back in.
  3. Keybinds to try:  SUPER+Space launcher · SUPER+N quick settings
     SUPER+M notification center · SUPER+TAB window switcher
     SUPER+W wallpapers  ·  SUPER+O overview  ·  SUPER+V clipboard
NOTE
