import { App, Astal, Gtk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import Wp from "gi://AstalWp";
import brightness from "../lib/brightness";

const HIDE_MS = 1500;

function speakerIcon(volume: number, muted: boolean): string {
  if (muted || volume <= 0) return "audio-volume-muted-symbolic";
  if (volume < 0.34) return "audio-volume-low-symbolic";
  if (volume < 0.67) return "audio-volume-medium-symbolic";
  return "audio-volume-high-symbolic";
}

export default function OSD() {
  const wp = Wp.get_default();
  const visible = Variable(false);
  const value = Variable(0);
  const icon = Variable("audio-volume-high-symbolic");
  let hideId = 0;

  function show(v: number, ic: string) {
    value.set(Math.min(Math.max(v, 0), 1));
    icon.set(ic);
    visible.set(true);
    if (hideId) GLib.source_remove(hideId);
    hideId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, HIDE_MS, () => {
      visible.set(false);
      hideId = 0;
      return GLib.SOURCE_REMOVE;
    });
  }

  // Wire up to whichever speaker is currently default, and re-wire whenever
  // the default output device changes (e.g. plugging in headphones).
  function bindSpeaker(speaker?: Wp.Endpoint | null) {
    if (!speaker) return;
    speaker.connect("notify::volume", () =>
      show(speaker.volume, speakerIcon(speaker.volume, speaker.mute)),
    );
    speaker.connect("notify::mute", () =>
      show(speaker.volume, speakerIcon(speaker.volume, speaker.mute)),
    );
  }

  if (wp) {
    bindSpeaker(wp.audio.defaultSpeaker);
    wp.audio.connect("notify::default-speaker", () =>
      bindSpeaker(wp.audio.defaultSpeaker),
    );
  }

  // Any brightness change — from the bar slider, QuickSettings, or a
  // hardware key bound straight to brightnessctl — pops the OSD too.
  brightness.value.subscribe((v) => show(v, "display-brightness-symbolic"));

  return (
    <window
      name="osd"
      cssClasses={["osd-window"]}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM}
      marginBottom={60}
      application={App}
      visible={bind(visible)}
    >
      <box cssClasses={["osd-container"]} spacing={12}>
        <icon icon={bind(icon)} />
        <levelbar hexpand cssClasses={["osd-levelbar"]} value={bind(value)} />
      </box>
    </window>
  );
}
