import { Variable, GLib } from "astal";
import Gio from "gi://Gio";
import { bash, bashAsync, clamp, debounce, hasBin } from "./utils";

const HAS_BRIGHTNESSCTL = hasBin("brightnessctl");
const BACKLIGHT_DIR = "/sys/class/backlight";

/**
 * Reactive wrapper around brightnessctl. Exposes `value` as a Variable<number>
 * in the 0..1 range, plus set() to change it. Also watches the backlight
 * sysfs node so external changes (hardware keys bound directly to
 * brightnessctl in Hyprland) are reflected without AGS having driven them.
 */
class BrightnessService {
  readonly available: boolean;
  readonly value: Variable<number>;
  private max = 1;
  private monitor?: Gio.FileMonitor;

  constructor() {
    this.available = HAS_BRIGHTNESSCTL;
    this.value = Variable(0);

    if (!this.available) {
      console.warn("brightness: brightnessctl not found, brightness controls disabled.");
      return;
    }

    this.max = parseInt(bash("brightnessctl max"), 10) || 1;
    this.refresh();
    this.watchBacklight();
  }

  private refresh() {
    const current = parseInt(bash("brightnessctl get"), 10) || 0;
    this.value.set(this.max > 0 ? clamp(current / this.max, 0, 1) : 0);
  }

  private watchBacklight() {
    try {
      const base = Gio.File.new_for_path(BACKLIGHT_DIR);
      const children = base.enumerate_children(
        "standard::name",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );
      const info = children.next_file(null);
      children.close(null);
      if (!info) return;

      const devicePath = `${BACKLIGHT_DIR}/${info.get_name()}/brightness`;
      const file = Gio.File.new_for_path(devicePath);
      this.monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);

      const onChange = debounce(() => this.refresh(), 120);
      this.monitor.connect("changed", () => onChange());
    } catch (err) {
      console.error("brightness: failed to watch backlight device", err);
    }
  }

  /** Set brightness as a 0..1 fraction; drives brightnessctl and updates the Variable. */
  set(percent: number) {
    if (!this.available) return;
    const clamped = clamp(percent, 0, 1);
    this.value.set(clamped);
    bashAsync(`brightnessctl set ${Math.round(clamped * 100)}% -q`);
  }
}

const brightness = new BrightnessService();
export default brightness;
