import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import { bashAsync, hasBin } from "../lib/utils";

const WINDOW_NAME = "wallpaperpicker";
const WALLPAPER_DIR = `${GLib.get_home_dir()}/Pictures/Wallpapers`;
const CSS_PATH = `${GLib.get_user_config_dir()}/ags/style.css`;

const HAS_SWWW = hasBin("swww");
const HAS_MATUGEN = hasBin("matugen");

interface Wallpaper {
  path: string;
  name: string;
}

function close() {
  App.get_window(WINDOW_NAME)?.hide();
}

export default function WallpaperPicker() {
  const wallpapers = Variable<Wallpaper[]>([]);

  function refresh() {
    bashAsync(
      `find "${WALLPAPER_DIR}" -maxdepth 1 -type f ` +
        `\\( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \\) ` +
        `2>/dev/null | sort`,
    ).then((out) => {
      const list = out
        .split("\n")
        .filter(Boolean)
        .map((path) => ({ path, name: path.split("/").pop() ?? path }));
      wallpapers.set(list);
    });
  }

  async function apply(wp: Wallpaper) {
    if (HAS_SWWW) {
      await bashAsync(
        `swww img "${wp.path}" --transition-type wipe --transition-fps 60`,
      );
    }
    if (HAS_MATUGEN) {
      await bashAsync(`matugen image "${wp.path}"`);
      // Re-apply the stylesheet so matugen's regenerated palette takes
      // effect immediately without restarting the shell.
      App.apply_css(CSS_PATH, true);
    }
    close();
  }

  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["wallpaper-window"]}
      visible={false}
      keymode={Astal.Keymode.EXCLUSIVE}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={0}
      application={App}
      onKeyPressed={(_self, keyval) => {
        if (keyval === Gdk.KEY_Escape) close();
      }}
      setup={(self) => {
        self.connect("notify::visible", () => {
          if (self.visible) refresh();
        });
      }}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["wallpaper-menu"]}
        spacing={8}
      >
        <label label="Select Wallpaper" cssClasses={["menu-title"]} />
        <scrollable vexpand cssClasses={["wallpaper-scroll"]}>
          <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
            {bind(wallpapers).as((list) =>
              list.length === 0
                ? [
                    <label
                      label={`No wallpapers found in ${WALLPAPER_DIR}`}
                      cssClasses={["dim"]}
                    />,
                  ]
                : list.map((wp) => (
                    <button cssClasses={["wallpaper-card"]} onClicked={() => apply(wp)}>
                      <label
                        label={wp.name}
                        ellipsize={3}
                        maxWidthChars={26}
                        xalign={0}
                      />
                    </button>
                  )),
            )}
          </box>
        </scrollable>
      </box>
    </window>
  );
}
