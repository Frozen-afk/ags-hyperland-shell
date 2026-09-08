import { App, Astal, Gtk, Gdk } from "astal/gtk4";
import { bind, Variable } from "astal";
import Hyprland from "gi://AstalHyprland";
import { iconForApp } from "../lib/icons";

const WINDOW_NAME = "overview";

interface WorkspaceGroup {
  id: number;
  clients: Hyprland.Client[];
}

function close() {
  App.get_window(WINDOW_NAME)?.hide();
}

function ClientButton({
  client,
  hypr,
}: {
  client: Hyprland.Client;
  hypr: Hyprland.Hyprland;
}) {
  return (
    <button
      cssClasses={["overview-client"]}
      tooltipText={client.title || client.class || ""}
      onClicked={() => {
        hypr.dispatch("focuswindow", `address:${client.address}`);
        close();
      }}
      setup={(self) => {
        // Middle-click closes the window without leaving the overview.
        const click = new Gtk.GestureClick();
        click.set_button(2);
        click.connect("pressed", () => {
          hypr.dispatch("closewindow", `address:${client.address}`);
        });
        self.add_controller(click);
      }}
    >
      <box spacing={6}>
        <icon icon={iconForApp(client.class)} pixelSize={20} />
        <label
          label={client.title || client.class || "Unknown"}
          maxWidthChars={18}
          ellipsize={3}
        />
      </box>
    </button>
  );
}

function WorkspaceCard({
  group,
  hypr,
  isActive,
}: {
  group: WorkspaceGroup;
  hypr: Hyprland.Hyprland;
  isActive: boolean;
}) {
  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
      cssClasses={["workspace-card", isActive ? "active" : ""]}
    >
      <button
        cssClasses={["workspace-card-title"]}
        onClicked={() => {
          hypr.dispatch("workspace", String(group.id));
          close();
        }}
      >
        <label label={`Workspace ${group.id}`} />
      </button>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
        {group.clients.length === 0 ? (
          <label label="Empty" cssClasses={["dim"]} />
        ) : (
          group.clients.map((client) => <ClientButton client={client} hypr={hypr} />)
        )}
      </box>
    </box>
  );
}

export default function Overview() {
  const hypr = Hyprland.get_default();

  // Recompute per-workspace client groups whenever either the workspace
  // list or the global client list changes (AstalHyprland exposes
  // `clients` on the workspace as a plain getter, not a notify property,
  // so we derive the grouping ourselves from the two bindable lists).
  const groups = Variable.derive(
    [bind(hypr, "workspaces"), bind(hypr, "clients"), bind(hypr, "focusedWorkspace")],
    (workspaces, clients, focused): (WorkspaceGroup & { isActive: boolean })[] =>
      [...workspaces]
        .filter((w) => w.id > 0)
        .sort((a, b) => a.id - b.id)
        .map((ws) => ({
          id: ws.id,
          clients: clients.filter((c) => c.workspace?.id === ws.id),
          isActive: ws.id === focused?.id,
        })),
  );

  return (
    <window
      name={WINDOW_NAME}
      cssClasses={["overview-window"]}
      visible={false}
      keymode={Astal.Keymode.EXCLUSIVE}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      anchor={0}
      application={App}
      onKeyPressed={(_self, keyval) => {
        if (keyval === Gdk.KEY_Escape || keyval === Gdk.KEY_Tab) close();
      }}
    >
      <box
        spacing={24}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        cssClasses={["overview-container"]}
      >
        {bind(groups).as((list) =>
          list.length === 0
            ? [<label label="No workspaces" cssClasses={["dim"]} />]
            : list.map((group) => (
                <WorkspaceCard group={group} hypr={hypr} isActive={group.isActive} />
              )),
        )}
      </box>
    </window>
  );
}
