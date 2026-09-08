import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable, GLib } from "astal";
import { bashAsync } from "../lib/utils";

const WINDOW_NAME = "clipboard";
const THUMB_DIR = `${GLib.get_tmp_dir()}/ags-clip-thumbs`;
GLib.mkdir_with_parents(THUMB_DIR, 0o755);

interface ClipEntry {
  id: string;
  preview: string;
  isImage: boolean;
  dimensions?: string;
}

function parseCliphist(raw: string): ClipEntry[] {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, ...rest] = line.split("\t");
      const preview = rest.join("\t");
      const imgMatch = preview.match(
        /\[\[\s*binary data \d+ bytes,\s*image\/\S+,\s*(\d+x\d+)/,
      );
      return {
        id,
        preview: preview.slice(0, 120),
        isImage: !!imgMatch,
        dimensions: imgMatch?.[1],
      };
    });
}

export default function Clipboard() {
  const query = Variable("");
  const entries = Variable<ClipEntry[]>([]);
  // id -> decoded thumbnail path, populated asynchronously as images decode.
  const thumbs = Variable<Record<string, string>>({});

  function refresh() {
    bashAsync("cliphist list").then((out) => entries.set(parseCliphist(out)));
  }

  function ensureThumb(entry: ClipEntry) {
    if (!entry.isImage || thumbs.get()[entry.id]) return;
    const path = `${THUMB_DIR}/${entry.id}.png`;
    bashAsync(`test -f "${path}" || cliphist decode ${entry.id} > "${path}"`).then(
      () => thumbs.set({ ...thumbs.get(), [entry.id]: path }),
    );
  }

  // Re-render whenever the filtered list OR the thumbnail cache changes,
  // so an image entry upgrades from a text row to a thumbnail once decoded.
  const view = Variable.derive(
    [bind(query), bind(entries), bind(thumbs)],
    (q, list, thumbMap) => {
      const filtered = q.trim()
        ? list.filter((e) => e.preview.toLowerCase().includes(q.toLowerCase()))
        : list;
      return filtered.map((entry) => ({ entry, thumb: thumbMap[entry.id] }));
    },
  );

  function copyEntry(entry: ClipEntry) {
    bashAsync(`cliphist decode ${entry.id} | wl-copy`).then(close);
  }

  function deleteEntry(entry: ClipEntry) {
    bashAsync(`cliphist delete ${entry.id}`).then(refresh);
  }

  function clearAll() {
    bashAsync("cliphist wipe").then(() => {
      thumbs.set({});
      refresh();
    });
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
          {bind(view).as((rows) =>
            rows.length === 0
              ? [<label label="No clipboard history" cssClasses={["dim"]} />]
              : rows.map(({ entry, thumb }) => {
                  ensureThumb(entry);
                  return (
                    <box cssClasses={["clip-entry"]} spacing={6}>
                      <button hexpand onClicked={() => copyEntry(entry)}>
                        {entry.isImage ? (
                          <box spacing={8}>
                            <box
                              cssClasses={["clip-thumb"]}
                              visible={!!thumb}
                              css={thumb ? `background-image: url("${thumb}");` : ""}
                            />
                            <label
                              label={`Image${entry.dimensions ? ` · ${entry.dimensions}` : ""}`}
                              xalign={0}
                            />
                          </box>
                        ) : (
                          <label label={entry.preview} xalign={0} ellipsize={3} />
                        )}
                      </button>
                      <button cssClasses={["clip-delete"]} onClicked={() => deleteEntry(entry)}>
                        <icon icon="edit-delete-symbolic" />
                      </button>
                    </box>
                  );
                }),
          )}
        </box>
      </box>
    </window>
  );
}
