import { App } from "astal/gtk4";
import GLib from "gi://GLib";
import { bashAsync, hasBin } from "./utils";

const CONFIG_DIR = GLib.get_user_config_dir();
const STYLE_CSS = `${CONFIG_DIR}/ags/style.css`;

/**
 * Regenerates the palette from a wallpaper image and hot-applies the
 * stylesheet. With matugen installed the Material You palette is written to
 * ~/.config/ags/theme/colors.css (template in theme/colors.css.template); without
 * it the default Tokyonight palette stays in effect — the wallpaper is still
 * applied by the caller.
 */
export async function applyWallpaperTheme(wallpaperPath: string): Promise<void> {
  if (hasBin("matugen")) {
    await bashAsync(
      `matugen image "${wallpaperPath}" --mode dark ` +
        `--config "${CONFIG_DIR}/ags/theme/matugen-config.toml"`,
    );
  }
  // reset=true rebuilds the whole CSS tree so the freshly written
  // colors.css (imported by style.css) takes effect without restarting.
  App.apply_css(STYLE_CSS, true);
}

/**
 * Re-applies the stylesheet, e.g. after manually editing colors.css while
 * the shell is running (usable from `ags request reload-css`).
 */
export function reloadCss(): void {
  App.apply_css(STYLE_CSS, true);
}
