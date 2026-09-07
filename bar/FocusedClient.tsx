import { bind } from "astal";
import Hyprland from "gi://AstalHyprland";

const MAX_LEN = 60;

function truncate(s: string): string {
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN - 1) + "…" : s;
}

export default function FocusedClient() {
  const hypr = Hyprland.get_default();

  const title = bind(hypr, "focusedClient").as((client) => {
    if (!client) return "Desktop";
    return truncate(client.title || client.class || "Desktop");
  });

  const visible = bind(hypr, "focusedClient").as((c) => !!c);

  return (
    <box cssClasses={["focused-client"]} spacing={6} visible={visible}>
      <icon
        icon={bind(hypr, "focusedClient").as(
          (c) => c?.class?.toLowerCase() || "application-x-executable-symbolic",
        )}
      />
      <label label={title} ellipsize={3} maxWidthChars={50} />
    </box>
  );
}
