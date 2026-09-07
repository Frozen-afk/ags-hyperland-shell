import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import { bashAsync } from "../lib/utils";

const WINDOW_NAME = "power-menu";

interface Action {
  label: string;
  icon: string;
  cmd: string;
}

const ACTIONS: Action[] = [
  { label: "Lock", icon: "system-lock-screen-symbolic", cmd: "hyprlock" },
  { label: "Logout", icon: "system-log-out-symbolic", cmd: "hyprctl dispatch exit" },
  { label: "Suspend", icon: "weather-clear-night-symbolic", cmd: "systemctl suspend" },
  { label: "Reboot", icon: "system-reboot-symbolic", cmd: "systemctl reboot" },
  { label: "Shutdown", icon: "system-shutdown-symbolic", cmd: "systemctl poweroff" },
];

export default function PowerMenu() {
  const pending = Variable<Action | null>(null);

  function close() {
    pending.set(null);
    App.get_window(WINDOW_NAME)?.hide();
  }

  function confirm() {
    const action = pending.get();
    if (action) bashAsync(action.cmd);
    close();
  }

  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["power-menu-window"]}
      visible={false}
      keymode={Astal.Keymode.EXCLUSIVE}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={0}
      application={App}
      onKeyPressed={(_self, keyval) => {
        if (keyval === Gdk.KEY_Escape) close();
        else if (keyval === Gdk.KEY_Return) confirm();
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["power-menu"]} spacing={16}>
        {bind(pending).as((action) =>
          action ? (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={12} cssClasses={["power-confirm"]}>
              <label label={`${action.label}?`} cssClasses={["power-confirm-label"]} />
              <box spacing={8} halign={Gtk.Align.CENTER}>
                <button cssClasses={["power-confirm-yes"]} onClicked={confirm}>
                  <label label="Confirm" />
                </button>
                <button cssClasses={["power-confirm-no"]} onClicked={() => pending.set(null)}>
                  <label label="Cancel" />
                </button>
              </box>
            </box>
          ) : (
            <box spacing={16} halign={Gtk.Align.CENTER}>
              {ACTIONS.map((action) => (
                <button
                  cssClasses={["power-btn"]}
                  onClicked={() =>
                    action.label === "Lock" ? bashAsync(action.cmd).then(close) : pending.set(action)
                  }
                >
                  <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                    <icon icon={action.icon} pixelSize={40} />
                    <label label={action.label} />
                  </box>
                </button>
              ))}
            </box>
          ),
        )}
      </box>
    </window>
  );
}
