import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import { bash, bashAsync } from "../lib/utils";

const WINDOW_NAME = "clipboard";

interface ClipEntry {
  id: string;
  preview: string;
}

function parseCliphist(raw: string): ClipEntry[] {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, ...rest] = line.split("\t");
      return { id, preview: rest.join("\t").slice(0, 120) };
    });
}

export default function Clipboard() {
  const query = Variable("");
  const entries = Variable<ClipEntry[]>([]);

  function refresh() {
    bashAsync("cliphist list").then((out) => entries.set(parseCliphist(out)));
  }

  const filtered = Variable.derive([bind(query), bind(entries)], (q, list) =>
    q.trim()
      ? list.filter((e) => e.preview.toLowerCase().includes(q.toLowerCase()))
      : list,
  );

  function copyEntry(entry: ClipEntry) {
    bashAsync(`cliphist decode ${entry.id} | wl-copy`).then(close);
  }

  function deleteEntry(entry: ClipEntry) {
    bashAsync(`cliphist delete ${entry.id}`).then(refresh);
  }

  function clearAll() {
    bashAsync("cliphist wipe").then(refresh);
  }

  function close() {
    query.set("");
    App.get_window(WINDOW_NAME)?.hide();
  }

  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["clipboard-window"]}
      visible={false}
      keymode={Astal.Keymode.EXCLUSIVE}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP}
      marginTop={120}
      application={App}
      onKeyPressed={(_self, keyval) => {
        if (keyval === Gdk.KEY_Escape) close();
      }}
      setup={(self) => {
        self.connect("notify::visible", () => {
          if (self.visible) refresh();
        });
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["clipboard"]} spacing={6}>
        <box spacing={6}>
          <entry
            hexpand
            placeholderText="Search clipboard history…"
            text={bind(query)}
            onNotifyText={(self) => query.set(self.text)}
          />
          <button cssClasses={["clip-clear"]} onClicked={clearAll}>
            <icon icon="user-trash-symbolic" />
          </button>
        </box>
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["clipboard-list"]}>
          {bind(filtered).as((list) =>
            list.length === 0
              ? [<label label="No clipboard history" cssClasses={["dim"]} />]
              : list.map((entry) => (
                  <box cssClasses={["clip-entry"]} spacing={6}>
                    <button hexpand onClicked={() => copyEntry(entry)}>
                      <label label={entry.preview} xalign={0} ellipsize={3} />
                    </button>
                    <button cssClasses={["clip-delete"]} onClicked={() => deleteEntry(entry)}>
                      <icon icon="edit-delete-symbolic" />
                    </button>
                  </box>
                )),
          )}
        </box>
      </box>
    </window>
  );
}
