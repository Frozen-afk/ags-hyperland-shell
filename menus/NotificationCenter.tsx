import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind } from "astal";
import Notifd from "gi://AstalNotifd";
import { notifHistory, timeAgo, HistoryEntry } from "../lib/notifs";
import { iconForApp } from "../lib/icons";

const WINDOW_NAME = "notifcenter";

function close() {
  App.get_window(WINDOW_NAME)?.hide();
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const { notif } = entry;

  return (
    <box cssClasses={["nfc-card", `urgency-${notif.urgency === Notifd.Urgency.CRITICAL ? "critical" : notif.urgency === Notifd.Urgency.LOW ? "low" : "normal"}`]} spacing={10}>
      <icon
        icon={iconForApp(notif.desktopEntry || notif.appIcon)}
        pixelSize={28}
        valign={Gtk.Align.START}
      />
      <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
        <box spacing={6}>
          <label label={notif.summary} xalign={0} hexpand cssClasses={["notif-summary"]} ellipsize={3} />
          <label label={timeAgo(entry.time)} cssClasses={["notif-time"]} />
        </box>
        <label
          label={notif.body ?? ""}
          xalign={0}
          wrap
          cssClasses={["notif-body"]}
          visible={!!notif.body}
        />
        {notif.actions.length > 0 ? (
          <box spacing={4} cssClasses={["nfc-actions"]}>
            {notif.actions.slice(0, 3).map((action) => (
              <button
                onClicked={() => {
                  notif.invoke(action.id);
                  notifHistory.dismiss(entry);
                }}
              >
                <label label={action.label} />
              </button>
            ))}
          </box>
        ) : (
          <box visible={false} />
        )}
      </box>
      <button cssClasses={["notif-close"]} valign={Gtk.Align.START} onClicked={() => notifHistory.dismiss(entry)}>
        <icon icon="window-close-symbolic" />
      </button>
    </box>
  );
}

/**
 * Notification center (SUPER+M): full history, Do Not Disturb switch and
 * clear-all. Opening it marks everything as read.
 */
export default function NotificationCenter() {
  const notifd = Notifd.Notifd.get_default();

  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["notifcenter-window"]}
      visible={false}
      keymode={Astal.Keymode.ON_DEMAND}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      marginTop={46}
      marginRight={8}
      application={App}
      onKeyPressed={(_self, keyval) => {
        if (keyval === Gdk.KEY_Escape) close();
      }}
      setup={(self) => {
        self.connect("notify::visible", () => {
          if (self.visible) notifHistory.markAllRead();
        });
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["notifcenter"]} spacing={8}>
        <box spacing={10} cssClasses={["nfc-header"]}>
          <icon icon="notification-symbolic" />
          <label label="Notifications" cssClasses={["nfc-title"]} hexpand xalign={0} />
          <box cssClasses={["bar-pill"]} spacing={6}>
            <icon icon="notifications-disabled-symbolic" pixelSize={14} />
            <label label="DND" />
            <switch
              active={bind(notifd, "dontDisturb")}
              onNotifyActive={(self) => (notifd.dontDisturb = self.active)}
            />
          </box>
          <button onClicked={() => notifHistory.clearAll()}>
            <box spacing={5}>
              <icon icon="user-trash-symbolic" pixelSize={14} />
              <label label="Clear all" />
            </box>
          </button>
        </box>
        <scrollable
          vexpand
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          cssClasses={["nfc-list"]}
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={7}>
            {bind(notifHistory.entries).as((list) =>
              list.length === 0
                ? [
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.CENTER}>
                      <icon icon="notification-symbolic" pixelSize={42} halign={Gtk.Align.CENTER} />
                      <label label="No notifications" halign={Gtk.Align.CENTER} cssClasses={["dim"]} />
                    </box>,
                  ]
                : [...list].reverse().map((entry) => <HistoryCard entry={entry} />),
            )}
          </box>
        </scrollable>
      </box>
    </window>
  );
}
