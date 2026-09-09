import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import { bashAsync, hasBin } from "../lib/utils";
import { applyWallpaperTheme } from "../lib/theme";

const WINDOW_NAME = "wallpaperpicker";
const WALLPAPER_DIR = `${GLib.get_home_dir()}/Pictures/Wallpapers`;
const PER_ROW = 3;

const HAS_SWWW = hasBin("swww");

interface Wallpaper {
  path: string;
  name: string;
}

function close() {
  App.get_window(WINDOW_NAME)?.hide();
}

const current = Variable("");

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function apply(wp: Wallpaper) {
  current.set(wp.path);
  if (HAS_SWWW) {
    await bashAsync(
      `swww img "${wp.path}" --transition-type any --transition-step 90 --transition-fps 60`,
    );
  }
  // Regenerate the Material You palette (no-op without matugen) and
  // hot-apply the stylesheet so the whole shell re-colors instantly.
  await applyWallpaperTheme(wp.path);
  close();
}

function WallpaperCard({ wp }: { wp: Wallpaper }) {
  return (
    <button
      cssClasses={bind(current).as((c) => [
        "wallpaper-card",
        c === wp.path ? "selected" : "",
      ])}
      tooltipText={wp.name}
      onClicked={() => apply(wp)}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        <picture
          file={Gio.File.new_for_path(wp.path)}
          contentFit={Gtk.ContentFit.COVER}
          widthRequest={150}
          heightRequest={86}
          cssClasses={["wallpaper-thumb"]}
        />
        <label label={wp.name} cssClasses={["wallpaper-name"]} ellipsize={3} maxWidthChars={20} />
      </box>
    </button>
  );
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
    bashAsync("swww query 2>/dev/null | head -1 | sed 's/.*: //'").then((out) => {
      if (out && out.startsWith("/")) current.set(out);
    });
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
        <scrollable
          vexpand
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          cssClasses={["wallpaper-scroll"]}
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            {bind(wallpapers).as((list) =>
              list.length === 0
                ? [
                    <label
                      label={`No wallpapers found in ${WALLPAPER_DIR}`}
                      cssClasses={["dim"]}
                    />,
                  ]
                : chunks(list, PER_ROW).map((row) => (
                    <box spacing={4}>
                      {row.map((wp) => (
                        <WallpaperCard wp={wp} />
                      ))}
                    </box>
                  )),
            )}
          </box>
        </scrollable>
        <label
          label={HAS_SWWW ? "Click to apply" : "Install swww to apply wallpapers"}
          cssClasses={["dim"]}
          xalign={0}
        />
      </box>
    </window>
  );
}
