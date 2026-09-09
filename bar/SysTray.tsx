import { bind } from "astal";
import { Gtk } from "astal/gtk4";
import Tray, { TrayItem } from "gi://AstalTray";

function TrayItemButton({ item }: { item: TrayItem }) {
  return (
    <menubutton
      cssClasses={["tray-item"]}
      tooltipMarkup={bind(item, "tooltipMarkup").as((t) => t ?? item.title ?? "")}
      menuModel={bind(item, "menuModel")}
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

        // Menu actions need the dbusmenu action group inserted into the
        // widget tree under the prefix the importer names its actions with.
        const insertGroup = () => {
          if (item.actionGroup) self.insert_action_group("dbusmenu", item.actionGroup);
        };
        insertGroup();
        item.connect("notify::action-group", insertGroup);
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
        items.map((item) => <TrayItemButton item={item} />),
      )}
    </box>
  );
}
