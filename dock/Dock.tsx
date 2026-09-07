import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import Hyprland from "gi://AstalHyprland";
import Apps from "gi://AstalApps";
import { iconForApp } from "../lib/icons";

const PINNED_APP_IDS = [
  "org.mozilla.firefox",
  "org.gnome.Nautilus",
  "org.gnome.Terminal",
  "code",
  "org.gnome.TextEditor",
];

const HIDE_DELAY_MS = 400;
const REVEAL_HEIGHT = 4; // px hotspot at bottom of screen

interface DockEntry {
  appId: string;
  name: string;
  running: boolean;
  focused: boolean;
  clientAddresses: string[];
}

export default function Dock(monitor: Gdk.Monitor) {
  const hypr = Hyprland.get_default();
  const apps = new Apps.Apps();
  const hovered = Variable(false);
  const hidden = Variable(true);
  let hideTimer = 0;

  function scheduleHide() {
    if (hideTimer) GLib.source_remove(hideTimer);
    hideTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, HIDE_DELAY_MS, () => {
      if (!hovered.get()) hidden.set(true);
      hideTimer = 0;
      return GLib.SOURCE_REMOVE;
    });
  }

  const entries = Variable.derive(
    [bind(hypr, "clients"), bind(hypr, "focusedClient")],
    (clients, focused) => {
      const byClass = new Map<string, DockEntry>();

      for (const id of PINNED_APP_IDS) {
        byClass.set(id.toLowerCase(), {
          appId: id,
          name: apps.fuzzy_query(id)[0]?.name ?? id,
          running: false,
          focused: false,
          clientAddresses: [],
        });
      }

      for (const client of clients) {
        const key = (client.class || client.initialClass || "").toLowerCase();
        if (!key) continue;
        const existing = byClass.get(key);
        if (existing) {
          existing.running = true;
          existing.clientAddresses.push(client.address);
          if (focused?.address === client.address) existing.focused = true;
        } else {
          byClass.set(key, {
            appId: key,
            name: client.class || key,
            running: true,
            focused: focused?.address === client.address,
            clientAddresses: [client.address],
          });
        }
      }

      return [...byClass.values()];
    },
  );

  function activateOrLaunch(entry: DockEntry) {
    if (entry.clientAddresses.length > 0) {
      hypr.dispatch("focuswindow", `address:${entry.clientAddresses[0]}`);
    } else {
      const app = apps.fuzzy_query(entry.appId)[0];
      app?.launch();
    }
  }

  return (
    <window
      name="dock"
      cssClasses={["dock-window"]}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM}
      marginBottom={0}
      application={App}
    >
      <box orientation={Gtk.Orientation.VERTICAL}>
        {/* Hotspot strip that reveals the dock on hover near the screen edge */}
        <box
          heightRequest={REVEAL_HEIGHT}
          cssClasses={["dock-hotspot"]}
          setup={(self) => {
            const motion = new Gtk.EventControllerMotion();
            motion.connect("enter", () => {
              hovered.set(true);
              hidden.set(false);
            });
            self.add_controller(motion);
          }}
        />
        <revealer
          revealChild={bind(hidden).as((h) => !h)}
          transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
          transitionDuration={200}
          setup={(self) => {
            const motion = new Gtk.EventControllerMotion();
            motion.connect("enter", () => {
              hovered.set(true);
              hidden.set(false);
            });
            motion.connect("leave", () => {
              hovered.set(false);
              scheduleHide();
            });
            self.add_controller(motion);
          }}
        >
          <box cssClasses={["dock"]} spacing={6} halign={Gtk.Align.CENTER}>
            {bind(entries).as((list) =>
              list.map((entry) => (
                <button
                  cssClasses={[
                    "dock-item",
                    entry.running ? "running" : "",
                    entry.focused ? "focused" : "",
                  ]}
                  tooltipText={entry.name}
                  onClicked={() => activateOrLaunch(entry)}
                >
                  <box orientation={Gtk.Orientation.VERTICAL}>
                    <icon icon={iconForApp(entry.appId)} pixelSize={40} />
                    <box cssClasses={["dock-indicator"]} visible={entry.running} />
                  </box>
                </button>
              )),
            )}
          </box>
        </revealer>
      </box>
    </window>
  );
}
