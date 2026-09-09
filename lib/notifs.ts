import { Variable, GLib } from "astal";
import Notifd, { Notifd as NotifdService, Notification } from "gi://AstalNotifd";

const MAX_HISTORY = 100;

export interface HistoryEntry {
  notif: Notification;
  /** Monotonic receipt time in seconds, for relative timestamps. */
  time: number;
}

/**
 * Notification history + unread tracking, shared by the popups and the
 * notification center. Popups appear only when Do Not Disturb is off, but
 * everything lands in the history either way so the bell badge reflects
 * what you missed while DND was on (or while a popup was already closed).
 */
class NotifHistoryService {
  readonly entries: Variable<HistoryEntry[]> = Variable([]);
  readonly unreadCount = Variable(0);
  /** Bindable mirror of notifd's dontDisturb for widgets. */
  readonly dnd: Variable<boolean>;
  private notifd: NotifdService;

  constructor() {
    this.notifd = Notifd.Notifd.get_default();
    // Keep notifications around so the center can show history.
    this.notifd.cache_notifications = true;

    this.dnd = Variable(this.notifd.dontDisturb);
    this.notifd.connect("notify::dont-disturb", () =>
      this.dnd.set(this.notifd.dontDisturb),
    );

    this.notifd.connect("notified", (_src: unknown, id: number) => {
      const n = this.notifd.get_notification(id);
      if (!n) return;
      this.entries.set(
        [
          ...this.entries.get(),
          { notif: n, time: GLib.get_monotonic_time() / 1e6 },
        ].slice(-MAX_HISTORY),
      );
      this.unreadCount.set(this.unreadCount.get() + 1);
    });

    this.notifd.connect("resolved", (_src: unknown, id: number) => {
      this.entries.set(this.entries.get().filter((e) => e.notif.id !== id));
    });
  }

  get dontDisturb(): boolean {
    return this.notifd.dontDisturb;
  }

  set dontDisturb(v: boolean) {
    this.notifd.dontDisturb = v;
  }

  markAllRead() {
    this.unreadCount.set(0);
  }

  /** Remove one entry from history (dismisses the underlying notification). */
  dismiss(entry: HistoryEntry) {
    try {
      entry.notif.dismiss();
    } catch {
      this.entries.set(this.entries.get().filter((e) => e !== entry));
    }
  }

  clearAll() {
    for (const e of this.entries.get()) {
      try {
        e.notif.dismiss();
      } catch {
        /* already gone */
      }
    }
    this.entries.set([]);
    this.unreadCount.set(0);
  }
}

export const notifHistory = new NotifHistoryService();

/** "2m ago" style label for history cards. */
export function timeAgo(seconds: number): string {
  const d = Math.max(0, GLib.get_monotonic_time() / 1e6 - seconds);
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}
