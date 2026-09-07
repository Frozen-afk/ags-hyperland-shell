import { exec, execAsync, GLib, subprocess } from "astal";

/**
 * Run a shell command synchronously through /bin/bash -c so pipes,
 * globs and redirection all work. Returns trimmed stdout, or "" on error.
 */
export function bash(cmd: string): string {
  try {
    return exec(["bash", "-c", cmd]).trim();
  } catch (err) {
    console.error(`bash() failed: ${cmd}\n`, err);
    return "";
  }
}

/**
 * Async variant of bash(). Resolves to trimmed stdout, rejects with stderr.
 */
export function bashAsync(cmd: string): Promise<string> {
  return execAsync(["bash", "-c", cmd])
    .then((out) => out.trim())
    .catch((err) => {
      console.error(`bashAsync() failed: ${cmd}\n`, err);
      return "";
    });
}

/**
 * Fire-and-forget a long running command, returns the AstalIO.Subprocess
 * handle so callers can kill() it (used for gromit-mpx, swappy, etc).
 */
export function spawn(
  cmd: string[],
  onOut?: (line: string) => void,
  onErr?: (line: string) => void,
): ReturnType<typeof subprocess> {
  return subprocess(
    cmd,
    (out) => onOut?.(out),
    (err) => onErr?.(err ?? ""),
  );
}

/** True if a binary exists on PATH. */
export function hasBin(name: string): boolean {
  try {
    exec(["bash", "-c", `command -v ${name}`]);
    return true;
  } catch {
    return false;
  }
}

/** Human readable byte size, e.g. 1536 -> "1.5 KiB". */
export function fmtBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${units[i]}`;
}

/** Human readable transfer rate, e.g. 1536 -> "1.5 KiB/s". */
export function fmtRate(bytesPerSec: number): string {
  return `${fmtBytes(bytesPerSec)}/s`;
}

/** Format seconds as H:MM:SS or M:SS. */
export function fmtDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Clock string, e.g. "14:32". */
export function fmtTime(date: Date, fmt = "%H:%M"): string {
  return GLib.DateTime.new_now_local().format(fmt) ?? date.toTimeString();
}

/** Clamp a number between min and max. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Round a 0..1 fraction to an integer percent. */
export function pct(fraction: number): number {
  return Math.round(clamp(fraction, 0, 1) * 100);
}

/** Debounce helper for high-frequency signals (e.g. slider drags). */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): T {
  let id = 0;
  return ((...args: any[]) => {
    if (id) GLib.source_remove(id);
    id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      fn(...args);
      id = 0;
      return GLib.SOURCE_REMOVE;
    });
  }) as T;
}

/** Read a whole file synchronously, "" if missing/unreadable. */
export function readFile(path: string): string {
  try {
    const [ok, bytes] = GLib.file_get_contents(path);
    return ok ? new TextDecoder().decode(bytes) : "";
  } catch {
    return "";
  }
}
