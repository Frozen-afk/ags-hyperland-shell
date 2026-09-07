import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import { bash, bashAsync, hasBin, spawn } from "../lib/utils";

const HAS_GROMIT = hasBin("gromit-mpx");

export default function DrawToggle(monitor: Gdk.Monitor) {
  if (!HAS_GROMIT) return <box />;

  const active = Variable(false);
  let started = false;

  function ensureStarted() {
    if (started) return;
    // gromit-mpx runs as a background daemon; start it hidden/undecorated.
    spawn(["gromit-mpx"]);
    started = true;
  }

  function toggle() {
    ensureStarted();
    bashAsync("gromit-mpx -t").then(() => active.set(!active.get()));
  }

  function clear() {
    bashAsync("gromit-mpx -c").then(() => {});
  }

  return (
    <window
      name="draw-toggle"
      cssClasses={["draw-toggle-window"]}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT}
      marginBottom={10}
      marginLeft={10}
      application={App}
      visible={bind(active)}
    >
      <box spacing={6} cssClasses={["draw-toggle", "bar-pill"]}>
        <icon icon="applications-graphics-symbolic" />
        <label label="Draw Mode" />
        <button onClicked={clear}>
          <icon icon="edit-clear-symbolic" />
        </button>
        <button onClicked={toggle}>
          <icon icon="window-close-symbolic" />
        </button>
      </box>
    </window>
  );
}

/**
 * Call from a keybind (e.g. Hyprland `bind = SUPER, D, exec, ags request draw-toggle`)
 * to flip gromit-mpx annotation mode and reveal the indicator window.
 */
export function toggleDrawMode() {
  bashAsync("gromit-mpx -t");
  const win = App.get_window("draw-toggle");
  if (win) win.visible = !win.visible;
}
