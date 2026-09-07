import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { GLib } from "astal";
import { bashAsync } from "../lib/utils";

const WINDOW_NAME = "screenshot-menu";

function screenshotDir(): string {
  const dir = `${GLib.get_home_dir()}/Pictures/Screenshots`;
  GLib.mkdir_with_parents(dir, 0o755);
  return dir;
}

function filename(): string {
  const ts = GLib.DateTime.new_now_local().format("%Y-%m-%d_%H-%M-%S");
  return `${screenshotDir()}/screenshot_${ts}.png`;
}

function close() {
  App.get_window(WINDOW_NAME)?.hide();
}

async function shootFullscreen() {
  const path = filename();
  await bashAsync(`grim "${path}"`);
  await bashAsync(`wl-copy < "${path}"`);
  close();
}

async function shootRegion(edit: boolean) {
  const path = filename();
  const geometry = await bashAsync("slurp");
  if (!geometry) {
    close();
    return;
  }
  await bashAsync(`grim -g "${geometry}" "${path}"`);
  if (edit) {
    await bashAsync(`swappy -f "${path}"`);
  } else {
    await bashAsync(`wl-copy < "${path}"`);
  }
  close();
}

async function shootActiveWindow() {
  const path = filename();
  const geometry = await bashAsync(
    `hyprctl activewindow -j | ` +
      `jq -r '"\\(.at[0]),\\(.at[1]) \\(.size[0])x\\(.size[1])"'`,
  );
  if (!geometry) {
    close();
    return;
  }
  await bashAsync(`grim -g "${geometry}" "${path}"`);
  await bashAsync(`wl-copy < "${path}"`);
  close();
}

interface Option {
  label: string;
  icon: string;
  action: () => void;
}

export default function ScreenshotMenu() {
  const options: Option[] = [
    { label: "Fullscreen", icon: "video-display-symbolic", action: shootFullscreen },
    { label: "Active Window", icon: "focus-windows-symbolic", action: shootActiveWindow },
    { label: "Region (copy)", icon: "select-rectangular-symbolic", action: () => shootRegion(false) },
    { label: "Region (edit)", icon: "applications-graphics-symbolic", action: () => shootRegion(true) },
  ];

  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["screenshot-window"]}
      visible={false}
      keymode={Astal.Keymode.EXCLUSIVE}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={0}
      application={App}
      onKeyPressed={(_self, keyval) => {
        if (keyval === Gdk.KEY_Escape) close();
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["screenshot-menu"]} spacing={8}>
        <label label="Screenshot" cssClasses={["screenshot-title"]} />
        {options.map((opt) => (
          <button cssClasses={["screenshot-btn"]} onClicked={opt.action}>
            <box spacing={10}>
              <icon icon={opt.icon} />
              <label label={opt.label} xalign={0} hexpand />
            </box>
          </button>
        ))}
      </box>
    </window>
  );
}
