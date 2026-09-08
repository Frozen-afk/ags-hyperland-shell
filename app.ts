import { App, Gdk } from "astal/gtk4";
import GLib from "gi://GLib";

import Bar from "./bar/Bar";
import Launcher from "./menus/Launcher";
import Clipboard from "./menus/Clipboard";
import NotificationPopups from "./menus/NotificationPopups";
import PowerMenu from "./menus/PowerMenu";
import ScreenshotMenu from "./menus/ScreenshotMenu";
import Vitals from "./overlays/Vitals";
import DrawToggle from "./overlays/DrawToggle";
import OSD from "./overlays/OSD";
import ScreenRecorder from "./overlays/ScreenRecorder";
import Dock from "./dock/Dock";
import QuickSettings from "./menus/QuickSettings";
import WallpaperPicker from "./menus/WallpaperPicker";
import Overview from "./menus/Overview";

const SCSS = `${GLib.get_user_config_dir()}/ags/style.css`;

function forEachMonitor(fn: (mon: Gdk.Monitor, id: number) => void) {
  const display = Gdk.Display.get_default();
  if (!display) return;
  const monitors = display.get_monitors();
  for (let i = 0; i < monitors.get_n_items(); i++) {
    const mon = monitors.get_item(i) as Gdk.Monitor;
    fn(mon, i);
  }
}

App.start({
  css: SCSS,
  icons: `${GLib.get_user_config_dir()}/ags/icons`,

  main() {
    // Per-monitor surfaces: bar, notification popups, vitals, dock.
    forEachMonitor((monitor, id) => {
      Bar(monitor, id);
      NotificationPopups(monitor);
      Vitals(monitor);
      DrawToggle(monitor);
      Dock(monitor);
      ScreenRecorder(monitor);
    });

    // Single-instance global overlays/modals.
    Launcher();
    Clipboard();
    PowerMenu();
    ScreenshotMenu();
    OSD();
    QuickSettings();
    WallpaperPicker();
    Overview();

    // React to monitors being hot-plugged.
    const display = Gdk.Display.get_default();
    display?.get_monitors().connect("items-changed", () => {
      // Simplest robust approach: restart the shell process via `ags run`
      // handles teardown/recreate; here we log for visibility.
      console.log("Monitor configuration changed — restart AGS to remap windows.");
    });
  },

  // Handle `ags request <name>` / `ags toggle-window <name>` from Hyprland binds.
  requestHandler(request: string, res: (response: unknown) => void) {
    const [cmd, ...args] = request.split(" ");

    switch (cmd) {
      case "toggle-window": {
        const win = App.get_window(args[0]);
        if (win) win.visible = !win.visible;
        res(`toggled ${args[0]}`);
        return;
      }
      case "draw-toggle": {
        import("./overlays/DrawToggle").then(({ toggleDrawMode }) =>
          toggleDrawMode(),
        );
        res("ok");
        return;
      }
      default:
        res(`unknown request: ${request}`);
    }
  },
});
