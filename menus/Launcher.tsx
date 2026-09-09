import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import Apps, { Application } from "gi://AstalApps";
import { bashAsync } from "../lib/utils";

const WINDOW_NAME = "launcher";
const MAX_RESULTS = 8;
const WEB_SEARCH_URL = "https://duckduckgo.com/?q=";

const apps = new Apps.Apps();
const query = Variable("");
const selected = Variable(0);

interface Result {
  name: string;
  desc: string;
  icon: string;
  tag: string;
  action: () => void;
}

/** Strict arithmetic check so Function() never sees arbitrary input. */
const MATH_RE = /^[0-9+\-*/().,%\s^e]+$/i;

function calc(q: string): string | null {
  if (!MATH_RE.test(q) || !/[0-9]/.test(q) || !/[+\-*/^%]/.test(q)) return null;
  try {
    const expr = q.replace(/\^/g, "**").replace(/,/g, ".");
    const value = Function(`"use strict"; return (${expr});`)() as number;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return String(Math.round(value * 1e6) / 1e6);
  } catch {
    return null;
  }
}

const results = Variable.derive([bind(query)], (q): Result[] => {
  const out: Result[] = [];
  const trimmed = q.trim();

  // Calculator plugin: "=2+2" or a bare arithmetic expression.
  const expression = trimmed.startsWith("=") ? trimmed.slice(1).trim() : trimmed;
  if (expression) {
    const value = calc(expression);
    if (value !== null) {
      out.push({
        name: value,
        desc: expression,
        icon: "accessories-calculator-symbolic",
        tag: "calc",
        action: () => {
          bashAsync(`wl-copy "${value}"`);
          close();
        },
      });
    }
  }

  // Shell command plugin: ">systemctl status".
  if (trimmed.startsWith(">") && trimmed.length > 1) {
    const cmd = trimmed.slice(1).trim();
    out.push({
      name: `Run “${cmd}”`,
      desc: "Execute in a shell",
      icon: "utilities-terminal-symbolic",
      tag: "shell",
      action: () => {
        bashAsync(cmd);
        close();
      },
    });
  }

  // Applications.
  const matches = trimmed && !trimmed.startsWith(">")
    ? apps.fuzzy_query(trimmed)
    : apps.get_list();
  for (const app of matches.slice(0, MAX_RESULTS - out.length)) {
    out.push({
      name: app.name,
      desc: app.description ?? app.executable,
      icon: app.iconName ?? "application-x-executable-symbolic",
      tag: "app",
      action: () => {
        app.launch();
        close();
      },
    });
  }

  // Web search fallback — always offered for plain queries.
  if (trimmed && !trimmed.startsWith(">")) {
    out.push({
      name: `Search the web for “${trimmed}”`,
      desc: "DuckDuckGo",
      icon: "web-browser-symbolic",
      tag: "web",
      action: () => {
        bashAsync(`xdg-open "${WEB_SEARCH_URL}${encodeURIComponent(trimmed)}"`);
        close();
      },
    });
  }

  return out.slice(0, MAX_RESULTS + 1);
});

function launch(result?: Result) {
  const list = results.get();
  const target = result ?? list[selected.get()];
  target?.action();
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

export default function Launcher() {
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
          placeholderText="Search apps, =calculate, >run command, or search the web…"
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
            list.map((result, i) => (
              <button
                cssClasses={bind(selected).as((s) => [
                  "launcher-item",
                  s === i ? "selected" : "",
                ])}
                onClicked={() => launch(result)}
              >
                <box spacing={12}>
                  <icon icon={result.icon} pixelSize={28} />
                  <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
                    <label label={result.name} xalign={0} cssClasses={["launcher-item-name"]} ellipsize={3} />
                    <label
                      label={result.desc}
                      xalign={0}
                      ellipsize={3}
                      cssClasses={["launcher-item-desc"]}
                      visible={!!result.desc}
                    />
                  </box>
                  <label label={result.tag} cssClasses={["launcher-tag"]} />
                </box>
              </button>
            )),
          )}
        </box>
        <label
          label="↑↓ select · Enter run · Esc close — try =12*4, >uptime, ?query"
          cssClasses={["launcher-hint"]}
          xalign={0}
        />
      </box>
    </window>
  );
}
