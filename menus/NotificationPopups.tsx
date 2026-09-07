import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import Notifd from "gi://AstalNotifd";

const TIMEOUT_MS = 6000;

function urgencyClass(n: Notifd.Notification): string {
  switch (n.urgency) {
    case Notifd.Urgency.CRITICAL:
      return "urgency-critical";
    case Notifd.Urgency.LOW:
      return "urgency-low";
    default:
      return "urgency-normal";
  }
}

function NotificationCard({
  notification,
  onClose,
}: {
  notification: Notifd.Notification;
  onClose: () => void;
}) {
  let timeoutId = 0;
  if (notification.urgency !== Notifd.Urgency.CRITICAL) {
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
        });
      }}
    >
      <box spacing={8}>
        <icon
          icon={notification.appIcon || notification.desktopEntry || "dialog-information-symbolic"}
          pixelSize={32}
        />
        <box orientation={Gtk.Orientation.VERTICAL} hexpand valign={Gtk.Align.CENTER}>
          <label label={notification.summary} xalign={0} cssClasses={["notif-summary"]} ellipsize={3} />
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
      {notification.actions.length > 0 && (
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
      )}
    </box>
  );
}

export default function NotificationPopups(monitor: Gdk.Monitor) {
  const notifd = Notifd.get_default();
  const active = Variable<Notifd.Notification[]>([]);

  notifd.connect("notified", (_src, id) => {
    const n = notifd.get_notification(id);
    if (n) active.set([...active.get().filter((x) => x.id !== id), n]);
  });

  notifd.connect("resolved", (_src, id) => {
    active.set(active.get().filter((n) => n.id !== id));
  });

  function dismiss(n: Notifd.Notification) {
    n.dismiss();
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
      marginTop={10}
      marginRight={10}
      application={App}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        {bind(active).as((list) =>
          list.map((n) => (
            <NotificationCard notification={n} onClose={() => dismiss(n)} />
          )),
        )}
      </box>
    </window>
  );
}
