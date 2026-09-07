import { Variable, GLib } from "astal";
import { bind } from "astal";
import { Gtk } from "astal/gtk4";

function tick(fmt: string): Variable<string> {
  const v = Variable(GLib.DateTime.new_now_local().format(fmt) ?? "");
  const id = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
    v.set(GLib.DateTime.new_now_local().format(fmt) ?? "");
    return GLib.SOURCE_CONTINUE;
  });
  v.subscribe(() => {}); // keep var alive
  return v;
}

export default function ClockMenu() {
  const clock = tick("%H:%M");
  const date = tick("%A, %d %B %Y");

  return (
    <menubutton cssClasses={["clock-menu", "bar-pill"]}>
      <label label={bind(clock)} />
      <popover>
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={8}
          cssClasses={["clock-popover"]}
          setup={(self) => {
            const calendar = new Gtk.Calendar();
            calendar.show_heading = true;
            self.append(calendar);
          }}
        >
          <label label={bind(date)} cssClasses={["clock-date"]} />
        </box>
      </popover>
    </menubutton>
  );
}
