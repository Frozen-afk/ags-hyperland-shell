import { App, Astal, Gtk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import { Endpoint as WpEndpoint } from "gi://AstalWp";
import { speaker, volumeIcon } from "../lib/audio";
import brightness from "../lib/brightness";
import { clamp } from "../lib/utils";

const HIDE_MS = 1500;

export default function OSD() {
  const visible = Variable(false);
  const value = Variable(0);
  const icon = Variable("audio-volume-high-symbolic");
  let hideId = 0;

  function show(v: number, ic: string) {
    value.set(clamp(v, 0, 1));
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
  let wired: WpEndpoint | null = null;
  function showVolume(sp: WpEndpoint) {
    show(sp.volume, volumeIcon(sp.volume, sp.mute));
  }
  function bindSpeaker(sp: WpEndpoint | null) {
    if (!sp || sp === wired) return;
    sp.connect("notify::volume", () => showVolume(sp));
    sp.connect("notify::mute", () => showVolume(sp));
    wired = sp;
  }
  bindSpeaker(speaker.get());
  speaker.subscribe((sp) => bindSpeaker(sp));

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
      marginBottom={70}
      application={App}
      visible={bind(visible)}
    >
      <box cssClasses={["osd-container"]} spacing={14}>
        <icon icon={bind(icon)} pixelSize={22} />
        <levelbar hexpand cssClasses={["osd-levelbar"]} value={bind(value)} />
      </box>
    </window>
  );
}
