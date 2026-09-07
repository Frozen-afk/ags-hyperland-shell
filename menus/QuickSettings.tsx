import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import Network from "gi://AstalNetwork";
import Bluetooth from "gi://AstalBluetooth";
import Notifd from "gi://AstalNotifd";
import Wp from "gi://AstalWp";
import brightness from "../lib/brightness";
import { bashAsync, hasBin, clamp } from "../lib/utils";

const WINDOW_NAME = "quicksettings";
const HAS_HYPRSHADE = hasBin("hyprshade");

function close() {
  App.get_window(WINDOW_NAME)?.hide();
}

function WifiTile() {
  const network = Network.get_default();

  return (
    <button
      hexpand
      cssClasses={bind(network, "wifi").as((w) => [
        "qs-tile",
        w?.enabled ? "active" : "",
      ])}
      onClicked={() => {
        const wifi = network.wifi;
        if (wifi) wifi.enabled = !wifi.enabled;
      }}
    >
      <box spacing={8}>
        <icon icon="network-wireless-symbolic" />
        <label
          label={bind(network, "wifi").as((w) => w?.ssid ?? "Wi-Fi")}
          ellipsize={3}
        />
      </box>
    </button>
  );
}

function BluetoothTile() {
  const bt = Bluetooth.get_default();

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
        <label label="Bluetooth" />
      </box>
    </button>
  );
}

function NightLightTile() {
  if (!HAS_HYPRSHADE) return <box />;
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
  const notifd = Notifd.get_default();

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
        <label label="Silent" />
      </box>
    </button>
  );
}

function VolumeSlider() {
  const wp = Wp.get_default();
  const speaker = wp?.audio.defaultSpeaker;
  if (!speaker) return <box />;

  return (
    <box spacing={8}>
      <icon
        icon={bind(speaker, "volume").as((v) =>
          speaker.mute || v <= 0
            ? "audio-volume-muted-symbolic"
            : "audio-volume-high-symbolic",
        )}
      />
      <slider
        hexpand
        min={0}
        max={1.5}
        value={bind(speaker, "volume")}
        onChangeValue={({ value }) => (speaker.volume = clamp(value, 0, 1.5))}
      />
    </box>
  );
}

function BrightnessSlider() {
  if (!brightness.available) return <box />;

  return (
    <box spacing={8}>
      <icon icon="display-brightness-symbolic" />
      <slider
        hexpand
        min={0.05}
        max={1}
        value={bind(brightness.value)}
        onChangeValue={({ value }) => brightness.set(value)}
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
      marginTop={44}
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
        <box orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <box spacing={6}>
            <WifiTile />
            <BluetoothTile />
          </box>
          <box spacing={6}>
            <NightLightTile />
            <DndTile />
          </box>
        </box>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8} cssClasses={["qs-sliders"]}>
          <VolumeSlider />
          <BrightnessSlider />
        </box>
      </box>
    </window>
  );
}
