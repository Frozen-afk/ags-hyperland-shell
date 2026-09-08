import { App, Astal, Gdk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import { bash, bashAsync, fmtDuration, hasBin } from "../lib/utils";

const HAS_WF_RECORDER = hasBin("wf-recorder");
const POLL_MS = 1000;

interface RecordingState {
  active: boolean;
  elapsed: number;
}

export default function ScreenRecorder(monitor: Gdk.Monitor) {
  if (!HAS_WF_RECORDER) return <box />;

  let startedAt = 0;

  // A single poll drives both "is it running" and "how long has it been
  // running" so we only spawn one `pgrep` per tick instead of two.
  const state = Variable<RecordingState>({ active: false, elapsed: 0 }).poll(
    POLL_MS,
    () => {
      const pid = bash("pgrep -x wf-recorder");
      const active = pid.length > 0;
      const now = GLib.get_monotonic_time() / 1e6;

      if (active && startedAt === 0) startedAt = now;
      if (!active) startedAt = 0;

      return { active, elapsed: active ? Math.floor(now - startedAt) : 0 };
    },
  );

  function stop() {
    bashAsync("pkill -INT wf-recorder");
  }

  return (
    <window
      name="recorder-pill"
      cssClasses={["recorder-window"]}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP}
      marginTop={12}
      application={App}
      visible={bind(state).as((s) => s.active)}
    >
      <box cssClasses={["recording-pill"]} spacing={8}>
        <box cssClasses={["pulse-dot"]} />
        <label label={bind(state).as((s) => `Recording ${fmtDuration(s.elapsed)}`)} />
        <button cssClasses={["recorder-stop"]} onClicked={stop}>
          <icon icon="media-playback-stop-symbolic" />
        </button>
      </box>
    </window>
  );
}
