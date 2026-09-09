import { Variable } from "astal";
import Wp, { Endpoint } from "gi://AstalWp";

const wp = Wp.get_default();

/**
 * Reactive default audio endpoints. They re-resolve whenever the default
 * device changes (plugging headphones, switching sinks…), so widgets can
 * simply bind to these instead of capturing a stale endpoint at startup —
 * which is what broke the old volume slider after device switches.
 */
export const speaker = Variable<Endpoint | null>(wp?.audio.defaultSpeaker ?? null);
export const microphone = Variable<Endpoint | null>(
  wp?.audio.defaultMicrophone ?? null,
);

if (wp) {
  wp.audio.connect("notify::default-speaker", () =>
    speaker.set(wp.audio.defaultSpeaker),
  );
  wp.audio.connect("notify::default-microphone", () =>
    microphone.set(wp.audio.defaultMicrophone),
  );
}

/** Cycles the default output sink to the next available device. */
export function cycleSpeaker(): void {
  if (!wp) return;
  const speakers = wp.audio.speakers;
  if (speakers.length <= 1) return;
  const current = wp.audio.defaultSpeaker;
  const idx = speakers.findIndex((s) => s.id === current?.id);
  wp.audio.defaultSpeaker = speakers[(idx + 1) % speakers.length];
}

export function volumeIcon(volume: number, muted: boolean): string {
  if (muted || volume <= 0) return "audio-volume-muted-symbolic";
  if (volume < 0.34) return "audio-volume-low-symbolic";
  if (volume < 0.67) return "audio-volume-medium-symbolic";
  return "audio-volume-high-symbolic";
}
