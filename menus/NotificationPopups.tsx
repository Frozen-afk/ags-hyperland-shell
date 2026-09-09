import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import Notifd, { Notification } from "gi://AstalNotifd";
import { notifHistory } from "../lib/notifs";
import { iconForApp } from "../lib/icons";

const TIMEOUT_MS = 6000;
const TICK_MS = 50;
const MAX_VISIBLE = 5;

function urgencyClass(n: Notification): string {
  switch (n.urgency) {
    case Notifd.Urgency.CRITICAL:
      return "urgency-critical";
    case Notifd.Urgency.LOW:
      return "urgency-low";
    default:
      return "urgency-normal";
  }
}

/**
 * A single popup card. Closing it only hides the popup — the notification
 * stays in the history (and keeps the bell badge unread) until it is
 * dismissed from the notification center.
 */
function NotificationCard({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const persistent = notification.urgency === Notifd.Urgency.CRITICAL;
  const progress = Variable(1);
  let timeoutId = 0;
  let tickId = 0;

  if (!persistent) {
    const startMs = GLib.get_monotonic_time() / 1000;

    tickId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TICK_MS, () => {
      const elapsed = GLib.get_monotonic_time() / 1000 - startMs;
      progress.set(Math.max(0, 1 - elapsed / TIMEOUT_MS));
      return GLib.SOURCE_CONTINUE;
    });

    timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TIMEOUT_MS, () => {
      onClose();
      return GLib.SOURCE_REMOVE;
    });
  }

  return (
    <box
      cssClasses={["notification", urgencyClass(notification)]}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={4}
      setup={(self) => {
        self.connect("destroy", () => {
          if (timeoutId) GLib.source_remove(timeoutId);
          if (tickId) GLib.source_remove(tickId);
        });
      }}
    >
      <box spacing={10}>
        <icon
          icon={iconForApp(notification.desktopEntry || notification.appIcon)}
          pixelSize={30}
        />
        <box orientation={Gtk.Orientation.VERTICAL} hexpand valign={Gtk.Align.CENTER}>
          <box spacing={6}>
            <label label={notification.summary} xalign={0} hexpand cssClasses={["notif-summary"]} ellipsize={3} />
            <label
              label={GLib.DateTime.new_now_local().format("%H:%M") ?? ""}
              cssClasses={["notif-time"]}
            />
          </box>
          <label
            label={notification.body ?? ""}
            xalign={0}
            wrap
            cssClasses={["notif-body"]}
            visible={!!notification.body}
          />
        </box>
        <button cssClasses={["notif-close"]} onClicked={onClose}>
          <icon icon="window-close-symbolic" />
        </button>
      </box>
      {notification.actions.length > 0 ? (
        <box spacing={4} cssClasses={["notif-actions"]}>
          {notification.actions.map((action) => (
            <button
              hexpand
              onClicked={() => {
                notification.invoke(action.id);
                onClose();
              }}
            >
              <label label={action.label} />
            </button>
          ))}
        </box>
      ) : (
        <box visible={false} />
      )}
      {persistent ? (
        <box visible={false} />
      ) : (
        <levelbar cssClasses={["notif-progress"]} value={bind(progress)} />
      )}
    </box>
  );
}

export default function NotificationPopups(monitor: Gdk.Monitor) {
  const notifd = Notifd.Notifd.get_default();
  const active = Variable<Notification[]>([]);

  notifd.connect("notified", (_src, id: number) => {
    if (notifd.dontDisturb) return;
    const n = notifd.get_notification(id);
    if (n) active.set([...active.get().filter((x) => x.id !== id), n]);
  });

  function dismiss(n: Notification) {
    active.set(active.get().filter((x) => x.id !== n.id));
  }

  return (
    <window
      name="notification-popups"
      cssClasses={["notification-popups"]}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      marginTop={52}
      marginRight={10}
      application={App}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        {bind(active).as((list) =>
          list.slice(-MAX_VISIBLE).map((n) => (
            <NotificationCard notification={n} onClose={() => dismiss(n)} />
          )),
        )}
      </box>
    </window>
  );
}
