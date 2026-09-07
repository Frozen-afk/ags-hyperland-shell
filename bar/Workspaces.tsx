import { bind, Variable } from "astal";
import { Gtk, Astal } from "astal/gtk4";
import Hyprland from "gi://AstalHyprland";

const WORKSPACES_PER_MONITOR = 10;

export default function Workspaces({ monitorId }: { monitorId: number }) {
  const hypr = Hyprland.get_default();

  // Derive the sorted list of workspace ids that belong to this monitor,
  // padded up to WORKSPACES_PER_MONITOR so the bar doesn't jump around.
  const wsIds = Variable.derive(
    [bind(hypr, "workspaces"), bind(hypr, "focusedWorkspace")],
    (workspaces) => {
      const mine = workspaces
        .filter((w) => w.monitor?.id === monitorId)
        .map((w) => w.id)
        .sort((a, b) => a - b);

      const min = monitorId * WORKSPACES_PER_MONITOR + 1;
      const max = min + WORKSPACES_PER_MONITOR - 1;
      const set = new Set(mine);
      for (let i = min; i <= max; i++) set.add(i);
      return [...set].sort((a, b) => a - b);
    },
  );

  return (
    <box cssClasses={["workspaces"]} spacing={4}>
      {bind(wsIds).as((ids) =>
        ids.map((id) => (
          <button
            cssClasses={bind(hypr, "focusedWorkspace").as((fw) => [
              "workspace-btn",
              fw?.id === id ? "active" : "",
              hypr
                .get_workspace(id)
                ?.get_clients()?.length
                ? "occupied"
                : "empty",
            ])}
            onClicked={() => hypr.dispatch("workspace", String(id))}
            setup={(self) => {
              const click = new Gtk.GestureClick();
              click.set_button(0);
              click.connect("pressed", (_gesture, _n, _x, _y) => {
                const btn = click.get_current_button();
                if (btn === 8) hypr.dispatch("workspace", "e-1"); // back
                if (btn === 9) hypr.dispatch("workspace", "e+1"); // forward
              });
              self.add_controller(click);

              const scroll = new Gtk.EventControllerScroll();
              scroll.set_flags(Gtk.EventControllerScrollFlags.VERTICAL);
              scroll.connect("scroll", (_ctrl, _dx, dy) => {
                hypr.dispatch("workspace", dy > 0 ? "e+1" : "e-1");
                return true;
              });
              self.add_controller(scroll);
            }}
          >
            <label label={String(id)} />
          </button>
        )),
      )}
      <SpecialWorkspaceBadge />
    </box>
  );
}

/**
 * Badge for Hyprland's special workspace (scratchpad). Only visible while
 * it actually holds windows, so it doesn't clutter the bar when unused.
 */
function SpecialWorkspaceBadge() {
  const hypr = Hyprland.get_default();

  const special = Variable.derive([bind(hypr, "workspaces")], (workspaces) =>
    workspaces.find((w) => w.name?.startsWith("special")),
  );

  return (
    <button
      cssClasses={["workspace-btn", "special-ws"]}
      visible={bind(special).as((w) => (w?.get_clients()?.length ?? 0) > 0)}
      tooltipText={bind(special).as(
        (w) => `${w?.get_clients()?.length ?? 0} window(s) in Scratchpad`,
      )}
      onClicked={() => hypr.dispatch("togglespecialworkspace", "")}
    >
      <icon icon="user-bookmarks-symbolic" />
    </button>
  );
}
