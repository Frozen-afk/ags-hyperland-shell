import { Gtk, Gdk } from "astal/gtk4";
import Apps from "gi://AstalApps";

const theme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!);

/** Generic per-category fallback icon names (Adwaita / hicolor symbolic set). */
const FALLBACKS: Record<string, string> = {
  terminal: "utilities-terminal-symbolic",
  browser: "web-browser-symbolic",
  editor: "text-editor-symbolic",
  file: "system-file-manager-symbolic",
  media: "multimedia-player-symbolic",
  unknown: "application-x-executable-symbolic",
};

/** Returns true if the icon name is present in the current icon theme. */
export function iconExists(name?: string | null): boolean {
  if (!name) return false;
  return theme.has_icon(name);
}

/** Best-effort icon name for a given app id / wm class, never empty. */
export function iconForApp(appId?: string | null): string {
  if (!appId) return FALLBACKS.unknown;
  if (iconExists(appId)) return appId;

  const lower = appId.toLowerCase();
  if (iconExists(lower)) return lower;

  // Try resolving through AstalApps' desktop-file fuzzy matcher.
  try {
    const apps = new Apps.Apps();
    const [match] = apps.fuzzy_query(appId);
    if (match?.iconName && iconExists(match.iconName)) {
      return match.iconName;
    }
  } catch {
    /* AstalApps not available / no match */
  }

  if (lower.includes("term")) return FALLBACKS.terminal;
  if (/(firefox|chrom|brave|zen|vivaldi)/.test(lower)) return FALLBACKS.browser;
  if (/(code|vim|nvim|jetbrains|sublime|zed)/.test(lower)) return FALLBACKS.editor;
  if (/(nautilus|files|thunar|dolphin)/.test(lower)) return FALLBACKS.file;
  if (/(mpv|vlc|spotify|rhythmbox)/.test(lower)) return FALLBACKS.media;

  return FALLBACKS.unknown;
}

/** Icon name for network strength 0-100, using standard Adwaita signal icons. */
export function iconForWifi(strength: number, connected: boolean): string {
  if (!connected) return "network-wireless-offline-symbolic";
  if (strength >= 80) return "network-wireless-signal-excellent-symbolic";
  if (strength >= 55) return "network-wireless-signal-good-symbolic";
  if (strength >= 30) return "network-wireless-signal-ok-symbolic";
  if (strength > 0) return "network-wireless-signal-weak-symbolic";
  return "network-wireless-signal-none-symbolic";
}

/** Icon name for battery percent + charging state. */
export function iconForBattery(percent: number, charging: boolean): string {
  const bucket = Math.min(100, Math.max(0, Math.round(percent / 10) * 10));
  const suffix = charging ? "-charging" : "";
  if (bucket <= 0) return `battery-empty${suffix}-symbolic`;
  if (bucket >= 100) return `battery-full${suffix}-symbolic`;
  return `battery-${bucket >= 90 ? "090" : String(bucket).padStart(3, "0")}${suffix}-symbolic`;
}

export { FALLBACKS };
