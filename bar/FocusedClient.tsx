import { bind } from "astal";
import Hyprland, { Client } from "gi://AstalHyprland";
import { iconForApp } from "../lib/icons";

const MAX_LEN = 60;

function truncate(s: string): string {
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN - 1) + "…" : s;
}

export default function FocusedClient() {
  const hypr = Hyprland.get_default();

  return bind(hypr, "focusedClient").as((client: Client | null) => (
    <box
      cssClasses={["focused-client"]}
      spacing={6}
      visible={!!client}
    >
      <icon icon={iconForApp(client?.class)} pixelSize={16} />
      <label label={truncate(client?.title || client?.class || "Desktop")} ellipsize={3} maxWidthChars={50} />
    </box>
  ));
}
