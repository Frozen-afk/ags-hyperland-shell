import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import { Network as NetworkService } from "gi://AstalNetwork";
import Bluetooth, { Bluetooth as BtService } from "gi://AstalBluetooth";
import Notifd from "gi://AstalNotifd";
import PowerProfiles from "gi://AstalPowerProfiles";
import Wp from "gi://AstalWp";
import { speaker, microphone, volumeIcon } from "../lib/audio";
import brightness from "../lib/brightness";
import { bashAsync, hasBin, clamp } from "../lib/utils";
import GLib from "gi://GLib";

const WINDOW_NAME = "quicksettings";
const HAS_HYPRSHADE = hasBin("hyprshade");

function close() {
  App.get_window(WINDOW_NAME)?.hide();
}

const userName = GLib.get_user_name();
const hostName = GLib.get_host_name();

/** User avatar + name + hostname, and a logout shortcut. */
function UserHeader() {
  return (
    <box spacing={10} cssClasses={["qs-header"]}>
      <label label={userName[0].toUpperCase()} cssClasses={["qs-avatar"]} />
      <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
        <label label={userName} cssClasses={["qs-username"]} xalign={0} />
        <label label={hostName} cssClasses={["qs-hostname"]} xalign={0} />
      </box>
      <button
        cssClasses={["qs-tile"]}
        tooltipText="Lock screen"
        onClicked={() => {
          close();
          bashAsync("hyprlock");
        }}
      >
        <icon icon="system-lock-screen-symbolic" />
      </button>
      <button
        cssClasses={["qs-tile"]}
        tooltipText="Power menu"
        onClicked={() => {
          close();
          App.get_window("power-menu")?.show();
        }}
      >
        <icon icon="system-shutdown-symbolic" />
      </button>
    </box>
  );
}

function WifiTile() {
  const network = NetworkService.get_default();
  const wifi = network.wifi;

  return (
    <button
      hexpand
      cssClasses={bind(network, "wifi").as((w) => [
        "qs-tile",
        w?.enabled ? "active" : "",
      ])}
      onClicked={() => {
        if (wifi) wifi.enabled = !wifi.enabled;
      }}
    >
      <box spacing={8}>
        <icon icon="network-wireless-symbolic" />
        <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START}>
          <label label="Wi-Fi" halign={Gtk.Align.START} />
          <label
            cssClasses={["qs-tile-sub"]}
            halign={Gtk.Align.START}
            ellipsize={3}
            maxWidthChars={12}
            label={bind(network, "wifi").as((w) =>
              w?.enabled ? (w.ssid ?? "On") : "Off",
            )}
          />
        </box>
      </box>
    </button>
  );
}

function BluetoothTile() {
  const bt = BtService.get_default();

  return (
    <button
      hexpand
      cssClasses={bind(bt, "isPowered").as((p) => [
        "qs-tile",
        p ? "active" : "",
      ])}
      onClicked={() => (bt.adapter.powered = !bt.adapter.powered)}
    >
      <box spacing={8}>
        <icon icon="bluetooth-symbolic" />
        <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START}>
          <label label="Bluetooth" halign={Gtk.Align.START} />
          <label
            cssClasses={["qs-tile-sub"]}
            halign={Gtk.Align.START}
            label={bind(bt, "isConnected").as((c) => (c ? "Connected" : "Off"))}
          />
        </box>
      </box>
    </button>
  );
}

function PowerProfileTile() {
  const profiles = PowerProfiles.get_default();
  const order = ["power-saver", "balanced", "performance"];

  return (
    <button
      hexpand
      cssClasses={bind(profiles, "activeProfile").as((p) => [
        "qs-tile",
        p === "performance" ? "active" : "",
      ])}
      onClicked={() => {
        const idx = order.indexOf(profiles.activeProfile);
        profiles.activeProfile = order[(idx + 1) % order.length];
      }}
    >
      <box spacing={8}>
        <icon icon={bind(profiles, "iconName")} />
        <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START}>
          <label label="Power" halign={Gtk.Align.START} />
          <label
            cssClasses={["qs-tile-sub"]}
            halign={Gtk.Align.START}
            label={bind(profiles, "activeProfile").as((p) => p)}
          />
        </box>
      </box>
    </button>
  );
}

function NightLightTile() {
  if (!HAS_HYPRSHADE) return <box visible={false} />;
  const active = Variable(false);

  return (
    <button
      hexpand
      cssClasses={bind(active).as((a) => ["qs-tile", a ? "active" : ""])}
      onClicked={() =>
        bashAsync("hyprshade toggle blue-light-filter").then(() =>
          active.set(!active.get()),
        )
      }
    >
      <box spacing={8}>
        <icon icon="night-light-symbolic" />
        <label label="Night Light" />
      </box>
    </button>
  );
}

function DndTile() {
  const notifd = Notifd.Notifd.get_default();

  return (
    <button
      hexpand
      cssClasses={bind(notifd, "dontDisturb").as((d) => [
        "qs-tile",
        d ? "active" : "",
      ])}
      onClicked={() => (notifd.dontDisturb = !notifd.dontDisturb)}
    >
      <box spacing={8}>
        <icon icon="notifications-disabled-symbolic" />
        <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START}>
          <label label="Silent" halign={Gtk.Align.START} />
          <label
            cssClasses={["qs-tile-sub"]}
            halign={Gtk.Align.START}
            label={bind(notifd, "dontDisturb").as((d) => (d ? "DND on" : "DND off"))}
          />
        </box>
      </box>
    </button>
  );
}

function MicTile() {
  const wp = Wp.get_default();

  return bind(microphone).as((mic) => {
    if (!wp || !mic) return <box visible={false} />;
    return (
      <button
        hexpand
        cssClasses={bind(mic, "mute").as((m) => ["qs-tile", m ? "" : "active"])}
        onClicked={() => (mic.mute = !mic.mute)}
      >
        <box spacing={8}>
          <icon
            icon={bind(mic, "mute").as((m) =>
              m
                ? "microphone-sensitivity-muted-symbolic"
                : "microphone-sensitivity-high-symbolic",
            )}
          />
          <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START}>
            <label label="Microphone" halign={Gtk.Align.START} />
            <label
              cssClasses={["qs-tile-sub"]}
              halign={Gtk.Align.START}
              label={bind(mic, "mute").as((m) => (m ? "Muted" : "Active"))}
            />
          </box>
        </box>
      </button>
    );
  });
}

function VolumeSlider() {
  return bind(speaker).as((sp) => {
    if (!sp) return <box visible={false} />;
    return (
      <box spacing={10}>
        <icon
          icon={bind(sp, "volume").as((v) => volumeIcon(v, sp.mute))}
        />
        <slider
          hexpand
          min={0}
          max={1.5}
          value={bind(sp, "volume")}
          onValueChanged={(self) => (sp.volume = clamp(self.value, 0, 1.5))}
        />
      </box>
    );
  });
}

function MicSlider() {
  return bind(microphone).as((mic) => {
    if (!mic) return <box visible={false} />;
    return (
      <box spacing={10}>
        <icon
          icon={bind(mic, "mute").as((m) =>
            m
              ? "microphone-sensitivity-muted-symbolic"
              : "microphone-sensitivity-high-symbolic",
          )}
        />
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

function BrightnessSlider() {
  if (!brightness.available) return <box visible={false} />;

  return (
    <box spacing={10}>
      <icon icon="display-brightness-symbolic" />
      <slider
        hexpand
        min={0.05}
        max={1}
        value={bind(brightness.value)}
        onValueChanged={(self) => brightness.set(self.value)}
      />
    </box>
  );
}

export default function QuickSettings() {
  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["quicksettings-window"]}
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
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["quicksettings-menu"]}
        spacing={12}
      >
        <UserHeader />
        <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <box spacing={6}>
            <WifiTile />
            <BluetoothTile />
          </box>
          <box spacing={6}>
            <PowerProfileTile />
            <MicTile />
          </box>
          <box spacing={6}>
            <NightLightTile />
            <DndTile />
          </box>
        </box>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10} cssClasses={["qs-sliders"]}>
          <VolumeSlider />
          <MicSlider />
          <BrightnessSlider />
        </box>
      </box>
    </window>
  );
}
