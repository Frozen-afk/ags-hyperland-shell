import { App, Gtk } from "astal/gtk4";
import { bind } from "astal";
import { notifHistory } from "../lib/notifs";

/**
 * Bar bell that opens the notification center. The unread badge counts
 * notifications that arrived while the panel was closed.
 */
export default function NotificationBell() {
  return (
    <button
      cssClasses={bind(notifHistory.unreadCount).as((n) => [
        "bell",
        "bar-pill",
        n > 0 ? "has-unread" : "",
      ])}
      tooltipText="Notifications"
      onClicked={() => {
        const win = App.get_window("notifcenter");
        if (win) win.visible = !win.visible;
      }}
      setup={(self) => {
        // Middle/secondary click toggles Do Not Disturb.
        const click = new Gtk.GestureClick();
        click.set_button(3);
        click.connect("pressed", () => {
          notifHistory.dontDisturb = !notifHistory.dontDisturb;
        });
        self.add_controller(click);
      }}
    >
      <box spacing={0}>
        <icon
          icon={bind(notifHistory.dnd).as((d) =>
            d ? "notifications-disabled-symbolic" : "notification-symbolic",
          )}
        />
        <label
          cssClasses={["bell-badge"]}
          visible={bind(notifHistory.unreadCount).as((n) => n > 0)}
          label={bind(notifHistory.unreadCount).as((n) => String(n))}
        />
      </box>
    </button>
  );
}
