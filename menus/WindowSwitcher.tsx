import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import Hyprland, { Client } from "gi://AstalHyprland";
import { iconForApp } from "../lib/icons";

const WINDOW_NAME = "switcher";

const hypr = Hyprland.get_default();
const selected = Variable(0);
const visible = Variable(false);

/**
 * Clients ordered so the focused workspace's windows come first, then the
 * rest — a usable approximation of most-recently-used order, which
 * AstalHyprland does not expose.
 */
const clients = Variable.derive(
  [bind(hypr, "clients"), bind(hypr, "focusedWorkspace")],
  (all, focused): Client[] => {
    const mine = all.filter((c) => c.workspace?.id === focused?.id);
    const rest = all.filter((c) => c.workspace?.id !== focused?.id);
    return [...mine, ...rest].filter((c) => c.class);
  },
);

function focusSelected() {
  const list = clients.get();
  const client = list[selected.get()];
  if (client) {
    hypr.dispatch("focuswindow", `address:${client.address}`);
  }
  close();
}

function close() {
  visible.set(false);
  App.get_window(WINDOW_NAME)?.hide();
}

export function openSwitcher() {
  if (clients.get().length === 0) return;
  selected.set(0);
  visible.set(true);
  App.get_window(WINDOW_NAME)?.show();
}

export function advance(delta: number) {
  const len = clients.get().length;
  if (!visible.get() || len === 0) return openSwitcher();
  selected.set(((selected.get() + delta) % len + len) % len);
}

export default function WindowSwitcher() {
  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["switcher-window"]}
      visible={bind(visible)}
      keymode={Astal.Keymode.EXCLUSIVE}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP}
      marginTop={140}
      application={App}
      onKeyPressed={(_self, keyval) => {
        if (keyval === Gdk.KEY_Escape) close();
        else if (keyval === Gdk.KEY_Return) focusSelected();
        else if (keyval === Gdk.KEY_Left) advance(-1);
        else if (keyval === Gdk.KEY_Right) advance(1);
        else if (keyval === Gdk.KEY_Tab) advance(1);
        else if (keyval === Gdk.KEY_ISO_Left_Tab) advance(-1);
      }}
    >
      <box cssClasses={["switcher"]} spacing={8}>
        {bind(clients).as((list) =>
          list.map((client, i) => (
            <button
              cssClasses={bind(selected).as((s) => [
                "switcher-item",
                s === i ? "selected" : "",
              ])}
              onClicked={() => {
                selected.set(i);
                focusSelected();
              }}
              tooltipText={client.title || client.class}
            >
              <box orientation={Gtk.Orientation.VERTICAL}>
                <icon icon={iconForApp(client.class)} pixelSize={38} />
                <label
                  label={client.class}
                  maxWidthChars={12}
                  ellipsize={3}
                  justify={Gtk.Justification.CENTER}
                />
              </box>
            </button>
          )),
        )}
      </box>
    </window>
  );
}
