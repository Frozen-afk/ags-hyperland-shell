import { bind, Variable } from "astal";
import { Gtk } from "astal/gtk4";
import Mpris, { Mpris as MprisService, Player } from "gi://AstalMpris";
import { fmtDuration } from "../lib/utils";

const MAX_TITLE = 34;

function truncate(s: string, n = MAX_TITLE): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function PlayerBox({ player }: { player: Player }) {
  const positionVar = Variable(player.position).poll(1000, () => player.position);

  return (
    <box cssClasses={["media-player"]} spacing={8}>
      <icon
        cssClasses={["media-art"]}
        visible={bind(player, "coverArt").as((c) => !!c)}
        icon={bind(player, "coverArt")}
        pixelSize={26}
      />
      <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
        <label
          label={bind(player, "title").as((t) => truncate(t || "Unknown Track"))}
          xalign={0}
          cssClasses={["media-title"]}
        />
        <label
          label={bind(player, "artist").as((a) => truncate(a || "", 30))}
          xalign={0}
          cssClasses={["media-artist"]}
        />
      </box>
      <box spacing={2}>
        <button
          onClicked={() => player.previous()}
          visible={bind(player, "canGoPrevious")}
        >
          <icon icon="media-skip-backward-symbolic" />
        </button>
        <button onClicked={() => player.play_pause()} visible={bind(player, "canPause")}>
          <icon
            icon={bind(player, "playbackStatus").as((s) =>
              s === Mpris.PlaybackStatus.PLAYING
                ? "media-playback-pause-symbolic"
                : "media-playback-start-symbolic",
            )}
          />
        </button>
        <button onClicked={() => player.next()} visible={bind(player, "canGoNext")}>
          <icon icon="media-skip-forward-symbolic" />
        </button>
      </box>
      <label
        label={bind(positionVar).as(
          (p) => `${fmtDuration(p)} / ${fmtDuration(player.length)}`,
        )}
        cssClasses={["media-time"]}
        visible={player.length > 0}
      />
    </box>
  );
}

export default function MediaBar() {
  const mpris = MprisService.get_default();

  return (
    <box cssClasses={["media-bar"]} visible={bind(mpris, "players").as((p) => p.length > 0)}>
      {bind(mpris, "players").as((players) =>
        players.length > 0 ? <PlayerBox player={players[0]} /> : <box />,
      )}
    </box>
  );
}
