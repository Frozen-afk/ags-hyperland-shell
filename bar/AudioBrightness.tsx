import { bind } from "astal";
import { Gtk } from "astal/gtk4";
import Wp from "gi://AstalWp";
import brightness from "../lib/brightness";
import { speaker, microphone, cycleSpeaker, volumeIcon } from "../lib/audio";
import { clamp, pct } from "../lib/utils";

/** Volume slider + device picker, re-rendered when the default sink changes. */
function VolumeSection() {
  return bind(speaker).as((sp) => {
    const wp = Wp.get_default();
    if (!wp || !sp) {
      return (
        <box cssClasses={["av-section"]}>
          <label label="No output device" cssClasses={["dim"]} />
        </box>
      );
    }

    return (
      <box orientation={Gtk.Orientation.VERTICAL} spacing={6} cssClasses={["av-section"]}>
        <box spacing={8}>
          <button
            cssClasses={["av-icon-btn"]}
            tooltipText={`${sp.description ?? "Default"} (right-click to switch device)`}
            onClicked={() => (sp.mute = !sp.mute)}
            setup={(self) => {
              // Right-click cycles the active output sink without opening the popover.
              const click = new Gtk.GestureClick();
              click.set_button(3);
              click.connect("pressed", () => cycleSpeaker());
              self.add_controller(click);
            }}
          >
            <icon
              icon={bind(sp, "volume").as((v) => volumeIcon(v, sp.mute))}
            />
          </button>
          <slider
            hexpand
            min={0}
            max={1.5}
            value={bind(sp, "volume")}
            onValueChanged={(self) => sp.volume = clamp(self.value, 0, 1.5)}
          />
          <label label={bind(sp, "volume").as((v) => `${pct(v)}%`)} widthChars={4} />
        </box>
        <box spacing={6}>
          <label label="Output:" cssClasses={["av-label"]} />
          <menubutton hexpand cssClasses={["av-device-select"]}>
            <label label={sp.description ?? "Default"} ellipsize={3} />
            <popover>
              <box orientation={Gtk.Orientation.VERTICAL}>
                {bind(wp.audio, "speakers").as((speakers) =>
                  speakers.map((s) => (
                    <button onClicked={() => (wp.audio.defaultSpeaker = s)}>
                      <label label={s.description ?? s.name} xalign={0} />
                    </button>
                  )),
                )}
              </box>
            </popover>
          </menubutton>
        </box>
      </box>
    );
  });
}

function MicSection() {
  return bind(microphone).as((mic) => {
    if (!mic) return <box />;
    return (
      <box spacing={8} cssClasses={["av-section"]}>
        <button cssClasses={["av-icon-btn"]} onClicked={() => (mic.mute = !mic.mute)}>
          <icon
            icon={bind(mic, "mute").as((m) =>
              m
                ? "microphone-sensitivity-muted-symbolic"
                : "microphone-sensitivity-high-symbolic",
            )}
          />
        </button>
        <slider
          hexpand
          min={0}
          max={1.5}
          value={bind(mic, "volume")}
          onValueChanged={(self) => (mic.volume = clamp(self.value, 0, 1.5))}
        />
      </box>
    );
  });
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
        onValueChanged={(self) => brightness.set(self.value)}
      />
      <label label={bind(brightness.value).as((v) => `${pct(v)}%`)} widthChars={4} />
    </box>
  );
}

export default function AudioBrightness() {
  return (
    <menubutton cssClasses={["audio-brightness", "bar-pill"]}>
      <icon
        icon={bind(speaker).as((sp) =>
          sp ? volumeIcon(sp.volume, sp.mute) : "audio-volume-muted-symbolic",
        )}
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
