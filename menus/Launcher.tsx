import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import Apps from "gi://AstalApps";

const WINDOW_NAME = "launcher";
const MAX_RESULTS = 9;

export default function Launcher() {
  const apps = new Apps.Apps();
  const query = Variable("");
  const selected = Variable(0);

  const results = Variable.derive([bind(query)], (q) => {
    const matches = q.trim() ? apps.fuzzy_query(q) : apps.get_list();
    return matches.slice(0, MAX_RESULTS);
  });

  function launch(app?: Apps.Application) {
    const list = results.get();
    const target = app ?? list[selected.get()];
    if (target) {
      target.launch();
      close();
    }
  }

  function close() {
    query.set("");
    selected.set(0);
    App.get_window(WINDOW_NAME)?.hide();
  }

  function moveSelection(delta: number) {
    const len = results.get().length;
    if (len === 0) return;
    selected.set(((selected.get() + delta) % len + len) % len);
  }

  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["launcher-window"]}
      visible={false}
      keymode={Astal.Keymode.EXCLUSIVE}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP}
      marginTop={120}
      application={App}
      onKeyPressed={(_self, keyval) => {
        if (keyval === Gdk.KEY_Escape) close();
        else if (keyval === Gdk.KEY_Down) moveSelection(1);
        else if (keyval === Gdk.KEY_Up) moveSelection(-1);
        else if (keyval === Gdk.KEY_Return) launch();
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["launcher"]} spacing={6}>
        <entry
          placeholderText="Search applications…"
          text={bind(query)}
          onNotifyText={(self) => {
            query.set(self.text);
            selected.set(0);
          }}
          setup={(self) => {
            self.connect("map", () => self.grab_focus());
          }}
        />
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["launcher-results"]}>
          {bind(results).as((list) =>
            list.map((app, i) => (
              <button
                cssClasses={bind(selected).as((s) => [
                  "launcher-item",
                  s === i ? "selected" : "",
                ])}
                onClicked={() => launch(app)}
              >
                <box spacing={10}>
                  <icon gicon={app.iconName ? undefined : undefined} icon={app.iconName ?? "application-x-executable-symbolic"} pixelSize={32} />
                  <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                    <label label={app.name} xalign={0} cssClasses={["launcher-item-name"]} />
                    <label
                      label={app.description ?? ""}
                      xalign={0}
                      ellipsize={3}
                      cssClasses={["launcher-item-desc"]}
                    />
                  </box>
                </box>
              </button>
            )),
          )}
        </box>
      </box>
    </window>
  );
}
