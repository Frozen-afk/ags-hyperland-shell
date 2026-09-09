import { bind, Variable } from "astal";
import { App, Gtk } from "astal/gtk4";
import Battery from "gi://AstalBattery";
import Network, { Network as NetworkService } from "gi://AstalNetwork";
import Bluetooth, { Bluetooth as BtService } from "gi://AstalBluetooth";
import { bash, bashAsync, hasBin, pct } from "../lib/utils";
import { iconForWifi, iconForBattery } from "../lib/icons";

const HAS_SUPERGFXCTL = hasBin("supergfxctl");

function BatteryIcon() {
  const bat = Battery.get_default();
  if (!bat.isPresent) return <box />;

  return bind(bat, "percentage").as((p) => (
    <box
      cssClasses={["indicator", "battery", pct(p) < 15 ? "low" : ""]}
      spacing={4}
    >
      <icon icon={iconForBattery(pct(p), bat.charging)} />
      <label label={`${pct(p)}%`} />
    </box>
  ));
}

function NetworkIcon() {
  const network = NetworkService.get_default();

  return bind(network, "primary").as((primary) => {
    if (primary === Network.Primary.WIRED) {
      return (
        <box cssClasses={["indicator", "network"]}>
          <icon icon="network-wired-symbolic" />
        </box>
      );
    }
    const wifi = network.wifi;
    if (!wifi) {
      return (
        <box cssClasses={["indicator", "network"]}>
          <icon icon="network-wireless-offline-symbolic" />
        </box>
      );
    }
    return bind(wifi, "strength").as(() => (
      <box cssClasses={["indicator", "network"]}>
        <icon icon={iconForWifi(wifi.strength ?? 0, wifi.internet === Network.Internet.CONNECTED)} />
      </box>
    ));
  });
}

function BluetoothIcon() {
  const bt = BtService.get_default();

  return (
    <box cssClasses={["indicator", "bluetooth"]}>
      <icon
        icon={bind(bt, "isPowered").as((p) =>
          p ? "bluetooth-active-symbolic" : "bluetooth-disabled-symbolic",
        )}
      />
    </box>
  );
}

function LockKeysIndicator() {
  const poll = Variable("").poll(2000, () => bash(
    "hyprctl devices -j | grep -o '\"capsLock\":[a-z]*' | head -1",
  ));

  return (
    <box cssClasses={["indicator", "lock-keys"]} spacing={4}>
      <label
        label={bind(poll).as((v) => (v.includes("true") ? "CAPS" : ""))}
        visible={bind(poll).as((v) => v.includes("true"))}
        cssClasses={["lock-badge"]}
      />
    </box>
  );
}

function GpuModeIndicator() {
  if (!HAS_SUPERGFXCTL) return <box />;

  const mode = Variable("Unknown").poll(5000, () =>
    bash("supergfxctl -g 2>/dev/null || echo Unknown"),
  );

  return (
    <menubutton cssClasses={["indicator", "gpu-mode"]}>
      <icon icon="applications-graphics-symbolic" />
      <label label={bind(mode)} />
      <popover>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
          {["Integrated", "Hybrid", "AsusMuxDgpu"].map((m) => (
            <button onClicked={() => bashAsync(`supergfxctl -m ${m}`)}>
              <label label={m} xalign={0} />
            </button>
          ))}
        </box>
      </popover>
    </menubutton>
  );
}

/**
 * Network + Bluetooth + Battery are read-only glances on the bar; clicking
 * anywhere on the cluster opens the QuickSettings control center where the
 * actual toggles (Wi-Fi, Bluetooth, Night Light, DND) live.
 */
function QuickSettingsTrigger() {
  return (
    <button
      cssClasses={["quicksettings-trigger"]}
      onClicked={() => {
        const win = App.get_window("quicksettings");
        if (win) win.visible = !win.visible;
      }}
    >
      <box spacing={8}>
        <BluetoothIcon />
        <NetworkIcon />
        <BatteryIcon />
      </box>
    </button>
  );
}

export default function SystemIndicators() {
  return (
    <box cssClasses={["system-indicators", "bar-pill"]} spacing={10}>
      <GpuModeIndicator />
      <LockKeysIndicator />
      <QuickSettingsTrigger />
    </box>
  );
}
