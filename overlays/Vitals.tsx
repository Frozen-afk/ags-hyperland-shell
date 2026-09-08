import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import { bash, readFile, fmtBytes, fmtRate, pct } from "../lib/utils";

const HOT_TEMP_C = 80;

interface CpuSample {
  idle: number;
  total: number;
}

function readCpuSample(): CpuSample {
  const line = readFile("/proc/stat").split("\n")[0]; // "cpu  user nice system idle iowait irq softirq ..."
  const parts = line.trim().split(/\s+/).slice(1).map(Number);
  const idle = parts[3] + (parts[4] ?? 0);
  const total = parts.reduce((a, b) => a + b, 0);
  return { idle, total };
}

function cpuUsage(prev: CpuSample, cur: CpuSample): number {
  const idleDelta = cur.idle - prev.idle;
  const totalDelta = cur.total - prev.total;
  if (totalDelta <= 0) return 0;
  return pct(1 - idleDelta / totalDelta);
}

function readMemInfo(): { usedPct: number; used: number; total: number } {
  const raw = readFile("/proc/meminfo");
  const get = (key: string) => {
    const m = raw.match(new RegExp(`${key}:\\s+(\\d+)`));
    return m ? parseInt(m[1], 10) * 1024 : 0;
  };
  const total = get("MemTotal");
  const avail = get("MemAvailable");
  const used = total - avail;
  return { usedPct: total > 0 ? pct(used / total) : 0, used, total };
}

function readTemp(): number | null {
  // Try the most common hwmon zone (works on most laptops incl. AMD/Intel).
  for (let i = 0; i < 6; i++) {
    const raw = readFile(`/sys/class/thermal/thermal_zone${i}/temp`);
    if (raw) {
      const v = parseInt(raw.trim(), 10);
      if (!isNaN(v)) return Math.round(v / 1000);
    }
  }
  return null;
}

function readFanRpm(): number | null {
  // hwmon device numbering varies by board, so glob rather than guess an
  // index; skip zero readings (fan idle/absent on many laptops at low load).
  const raw = bash(
    "cat /sys/class/hwmon/hwmon*/fan1_input 2>/dev/null | grep -v '^0$' | head -1",
  );
  const v = parseInt(raw, 10);
  return isNaN(v) ? null : v;
}

interface NetSample {
  rx: number;
  tx: number;
  time: number;
}

function readNetSample(): NetSample {
  const raw = readFile("/proc/net/dev");
  let rx = 0;
  let tx = 0;
  for (const line of raw.split("\n")) {
    const [iface, rest] = line.split(":");
    if (!rest || !iface || iface.trim() === "lo") continue;
    const fields = rest.trim().split(/\s+/).map(Number);
    rx += fields[0] ?? 0;
    tx += fields[8] ?? 0;
  }
  return { rx, tx, time: GLib.get_monotonic_time() / 1e6 };
}

export default function Vitals(monitor: Gdk.Monitor) {
  let prevCpu = readCpuSample();
  let prevNet = readNetSample();

  const cpu = Variable(0).poll(1500, () => {
    const cur = readCpuSample();
    const usage = cpuUsage(prevCpu, cur);
    prevCpu = cur;
    return usage;
  });

  const mem = Variable(readMemInfo()).poll(2000, readMemInfo);
  const temp = Variable(readTemp()).poll(3000, readTemp);
  const fan = Variable(readFanRpm()).poll(3000, readFanRpm);
  const isHot = Variable.derive([bind(temp)], (t) => t !== null && t >= HOT_TEMP_C);

  const netRates = Variable({ rx: 0, tx: 0 }).poll(1500, () => {
    const cur = readNetSample();
    const dt = Math.max(cur.time - prevNet.time, 0.001);
    const rx = (cur.rx - prevNet.rx) / dt;
    const tx = (cur.tx - prevNet.tx) / dt;
    prevNet = cur;
    return { rx: Math.max(rx, 0), tx: Math.max(tx, 0) };
  });

  return (
    <window
      name="vitals"
      cssClasses={["vitals-window"]}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.RIGHT}
      marginBottom={10}
      marginRight={10}
      application={App}
    >
      <menubutton cssClasses={bind(isHot).as((hot) => ["vitals", "bar-pill", hot ? "vitals-hot" : ""])}>
        <box spacing={6}>
          <icon icon="utilities-system-monitor-symbolic" />
          <label label={bind(cpu).as((c) => `${c}%`)} />
        </box>
        <popover>
          <box orientation={Gtk.Orientation.VERTICAL} spacing={8} cssClasses={["vitals-popover"]}>
            <box spacing={8}>
              <label label="CPU" cssClasses={["vitals-label"]} widthChars={6} xalign={0} />
              <levelbar hexpand value={bind(cpu).as((c) => c / 100)} />
              <label label={bind(cpu).as((c) => `${c}%`)} widthChars={4} />
            </box>
            <box spacing={8}>
              <label label="RAM" cssClasses={["vitals-label"]} widthChars={6} xalign={0} />
              <levelbar hexpand value={bind(mem).as((m) => m.usedPct / 100)} />
              <label label={bind(mem).as((m) => `${m.usedPct}%`)} widthChars={4} />
            </box>
            <box spacing={8} visible={temp.get() !== null}>
              <label label="Temp" cssClasses={["vitals-label"]} widthChars={6} xalign={0} />
              <label
                label={bind(temp).as((t) => (t !== null ? `${t}°C` : "N/A"))}
                cssClasses={bind(isHot).as((hot) => (hot ? ["vitals-hot-text"] : []))}
                hexpand
                xalign={0}
              />
            </box>
            <box spacing={8} visible={fan.get() !== null}>
              <label label="Fan" cssClasses={["vitals-label"]} widthChars={6} xalign={0} />
              <label
                label={bind(fan).as((f) => (f !== null ? `${f} RPM` : "N/A"))}
                hexpand
                xalign={0}
              />
            </box>
            <box spacing={8}>
              <label label="Net ↓" cssClasses={["vitals-label"]} widthChars={6} xalign={0} />
              <label label={bind(netRates).as((n) => fmtRate(n.rx))} hexpand xalign={0} />
            </box>
            <box spacing={8}>
              <label label="Net ↑" cssClasses={["vitals-label"]} widthChars={6} xalign={0} />
              <label label={bind(netRates).as((n) => fmtRate(n.tx))} hexpand xalign={0} />
            </box>
            <box spacing={8}>
              <label label="Mem" cssClasses={["vitals-label"]} widthChars={6} xalign={0} />
              <label
                label={bind(mem).as((m) => `${fmtBytes(m.used)} / ${fmtBytes(m.total)}`)}
                hexpand
                xalign={0}
              />
            </box>
          </box>
        </popover>
      </menubutton>
    </window>
  );
}
