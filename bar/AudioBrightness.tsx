import { bind, Variable } from "astal";
import { Gtk } from "astal/gtk4";
import Wp from "gi://AstalWp";
import brightness from "../lib/brightness";
import { clamp, pct } from "../lib/utils";

function speakerIcon(volume: number, muted: boolean): string {
  if (muted || volume <= 0) return "audio-volume-muted-symbolic";
  if (volume < 0.34) return "audio-volume-low-symbolic";
  if (volume < 0.67) return "audio-volume-medium-symbolic";
  return "audio-volume-high-symbolic";
}

/** Cycles AstalWp's default speaker to the next available output device. */
function cycleSpeaker(wp: Wp.Wp) {
  const speakers = wp.audio.speakers;
  if (speakers.length <= 1) return;
  const current = wp.audio.defaultSpeaker;
  const idx = speakers.findIndex((s) => s.id === current?.id);
  wp.audio.defaultSpeaker = speakers[(idx + 1) % speakers.length];
}

function VolumeSection() {
  const wp = Wp.get_default();
  const speaker = wp?.audio.defaultSpeaker;
  if (!wp || !speaker) return <box />;

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={6} cssClasses={["av-section"]}>
      <box spacing={8}>
        <button
          cssClasses={["av-icon-btn"]}
          tooltipText={bind(wp.audio, "speakers").as(
            (s) =>
              `Device: ${speaker.description ?? "Default"}` +
              (s.length > 1 ? " (right-click to switch)" : ""),
          )}
          onClicked={() => (speaker.mute = !speaker.mute)}
          setup={(self) => {
            // Right-click cycles the active output sink without opening the popover.
            const click = new Gtk.GestureClick();
            click.set_button(3);
            click.connect("pressed", () => cycleSpeaker(wp));
            self.add_controller(click);
          }}
        >
          <icon
            icon={bind(speaker, "volume").as((v) =>
              speakerIcon(v, speaker.mute),
            )}
          />
        </button>
        <slider
          hexpand
          min={0}
          max={1.5}
          value={bind(speaker, "volume")}
          onChangeValue={({ value }) => {
            speaker.volume = clamp(value, 0, 1.5);
          }}
        />
        <label
          label={bind(speaker, "volume").as((v) => `${pct(v)}%`)}
          widthChars={4}
        />
      </box>
      <box spacing={6}>
        <label label="Output:" cssClasses={["av-label"]} />
        <menubutton hexpand cssClasses={["av-device-select"]}>
          <label
            label={bind(speaker, "description").as((d) => d ?? "Default")}
            ellipsize={3}
          />
          <popover>
            <box orientation={Gtk.Orientation.VERTICAL}>
              {bind(wp.audio, "speakers").as((speakers) =>
                speakers.map((s) => (
                  <button onClicked={() => (wp.audio.defaultSpeaker = s)}>
                    <label label={s.description ?? s.name} />
                  </button>
                )),
              )}
            </box>
          </popover>
        </menubutton>
      </box>
    </box>
  );
}

function MicSection() {
  const wp = Wp.get_default();
  const mic = wp?.audio.defaultMicrophone;
  if (!mic) return <box />;

  return (
    <box spacing={8} cssClasses={["av-section"]}>
      <button cssClasses={["av-icon-btn"]} onClicked={() => (mic.mute = !mic.mute)}>
        <icon
          icon={bind(mic, "mute").as((m) =>
            m ? "microphone-sensitivity-muted-symbolic" : "microphone-sensitivity-high-symbolic",
          )}
        />
      </button>
      <slider
        hexpand
        min={0}
        max={1.5}
        value={bind(mic, "volume")}
        onChangeValue={({ value }) => (mic.volume = clamp(value, 0, 1.5))}
      />
    </box>
  );
}

function BrightnessSection() {
  if (!brightness.available) return <box />;

  return (
    <box spacing={8} cssClasses={["av-section"]}>
      <icon icon="display-brightness-symbolic" />
      <slider
        hexpand
        min={0.05}
        max={1}
        value={bind(brightness.value)}
        onChangeValue={({ value }) => brightness.set(value)}
      />
      <label label={bind(brightness.value).as((v) => `${pct(v)}%`)} widthChars={4} />
    </box>
  );
}

export default function AudioBrightness() {
  const wp = Wp.get_default();
  const speaker = wp?.audio.defaultSpeaker;

  return (
    <menubutton cssClasses={["audio-brightness", "bar-pill"]}>
      <icon
        icon={
          speaker
            ? bind(speaker, "volume").as((v) => speakerIcon(v, speaker.mute))
            : "audio-volume-muted-symbolic"
        }
      />
      <popover>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10} cssClasses={["av-popover"]}>
          <VolumeSection />
          <MicSection />
          <BrightnessSection />
        </box>
      </popover>
    </menubutton>
  );
}
