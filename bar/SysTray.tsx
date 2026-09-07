import { bind } from "astal";
import { Gtk, Gdk } from "astal/gtk4";
import Tray from "gi://AstalTray";

function TrayItem({ item }: { item: Tray.TrayItem }) {
  return (
    <menubutton
      cssClasses={["tray-item"]}
      tooltipText={bind(item, "tooltipMarkup").as((t) => t ?? item.title ?? "")}
      menuModel={bind(item, "menuModel")}
      actionGroup={item.actionGroup ? ["dbusmenu", item.actionGroup] : undefined}
      setup={(self) => {
        // Left click activates (some tray apps expect activation, not a menu).
        const click = new Gtk.GestureClick();
        click.set_button(1);
        click.connect("pressed", () => {
          try {
            item.activate(0, 0);
          } catch {
            /* item has no primary activation, menu-only */
          }
        });
        self.add_controller(click);
      }}
    >
      <icon gicon={bind(item, "gicon")} pixelSize={16} />
    </menubutton>
  );
}

export default function SysTray() {
  const tray = Tray.get_default();

  return (
    <box cssClasses={["systray"]} spacing={6}>
      {bind(tray, "items").as((items) =>
        items.map((item) => <TrayItem item={item} />),
      )}
    </box>
  );
}
