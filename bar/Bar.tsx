import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import Workspaces from "./Workspaces";
import FocusedClient from "./FocusedClient";
import SysTray from "./SysTray";
import AudioBrightness from "./AudioBrightness";
import SystemIndicators from "./SystemIndicators";
import MediaBar from "./MediaBar";
import ClockMenu from "./ClockMenu";

export default function Bar(monitor: Gdk.Monitor, monitorId: number) {
  return (
    <window
      name={`bar-${monitorId}`}
      cssClasses={["bar"]}
      gdkmonitor={monitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
      layer={Astal.Layer.TOP}
      application={App}
      marginTop={6}
      marginLeft={8}
      marginRight={8}
    >
      <centerbox cssClasses={["bar-content"]}>
        <box $type="start" spacing={8}>
          <Workspaces monitorId={monitorId} />
          <FocusedClient />
        </box>

        <box $type="center">
          <MediaBar />
        </box>

        <box $type="end" spacing={10} halign={Gtk.Align.END}>
          <SysTray />
          <AudioBrightness />
          <SystemIndicators />
          <ClockMenu />
        </box>
      </centerbox>
    </window>
  );
}
