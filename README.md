# AGS v2 + Astal Desktop Shell — Hyprland / Fedora

A complete GTK4 desktop shell (bar, launcher, clipboard manager, notification
popups, power menu, screenshot menu, system vitals, draw-mode indicator, and
a dash-to-dock style dock) built with **AGS v2**, **Astal**, TypeScript/TSX.

## 1. Fedora installation

```bash
# --- Core Wayland compositor + AGS/Astal toolchain -----------------------
sudo dnf install -y hyprland hyprland-devel xdg-desktop-portal-hyprland \
    gtk4 gtk4-devel gjs gjs-devel gobject-introspection-devel \
    NetworkManager-libnm bluez glib2-devel

# AGS v2 ships as a Fedora COPR build; astal libraries come from the
# official Astal COPR repo maintained by the Astal project.
sudo dnf copr enable solopasha/hyprland -y
sudo dnf copr enable atim/aylurs-gtk-shell -y      # ags v2 build for Fedora
sudo dnf install -y aylurs-gtk-shell

# Astal core + widget libraries (gir bindings consumed via gi://Astal*)
sudo dnf copr enable atim/astal -y
sudo dnf install -y astal-io astal-gtk4 \
    astal-hyprland astal-apps astal-tray astal-notifd \
    astal-wireplumber astal-network astal-bluetooth \
    astal-battery astal-mpris astal-powerprofiles

# Node/TypeScript toolchain (AGS compiles TSX via esbuild under the hood)
sudo dnf install -y nodejs npm

# --- CLI utilities the widgets shell out to --------------------------------
sudo dnf install -y grim slurp swappy wl-clipboard cliphist \
    brightnessctl playerctl jq

# gromit-mpx (annotation overlay) — Fedora main repo
sudo dnf install -y gromit-mpx

# supergfxctl (hybrid GPU switching, ASUS/Optimus laptops) — COPR
sudo dnf copr enable lukenukem/asus-linux -y
sudo dnf install -y supergfxctl

# power-profiles-daemon (used by AstalPowerProfiles), usually preinstalled
sudo dnf install -y power-profiles-daemon
sudo systemctl enable --now power-profiles-daemon

# hyprlock, for the power menu's Lock action
sudo dnf install -y hyprlock

# --- Wallpaper picker + dynamic theming + night light (optional) ----------
sudo dnf copr enable tofik/hyprland -y
sudo dnf install -y swww hyprshade

# matugen isn't packaged for Fedora; install via cargo or its release binary
cargo install matugen
# or: download a prebuilt binary from https://github.com/InioX/matugen/releases
```

## 2. Deploy the shell

```bash
mkdir -p ~/.config/ags
cp -r app.ts style.css lib bar menus overlays dock package.json tsconfig.json \
  ~/.config/ags/
```

Merge `hypr-snippet.conf` into `~/.config/hypr/hyprland.conf` (see file for
`exec-once`, `layerrule`, keybind, and windowrule blocks), then reload:

```bash
hyprctl reload
```

## 3. Run standalone (for iteration/debugging)

```bash
ags run ~/.config/ags/app.ts
```

AGS auto-restarts on file changes when run this way; for production use the
`exec-once = ags run ...` line in the Hyprland config so it launches at
compositor start.

## 4. Feature → file mapping

| Feature                                             | File                                |
|------------------------------------------------------|--------------------------------------|
| App entry point, multi-monitor window registration    | `app.ts`                             |
| GNOME Dark theme (#1e1e1e/#2a2a2a, #3584e4 accent)     | `style.css`                          |
| Bash/exec helpers, byte/time formatters                | `lib/utils.ts`                       |
| Icon fallback resolution                                | `lib/icons.ts`                       |
| Top bar layout per monitor                              | `bar/Bar.tsx`                        |
| Hyprland workspace indicators (scroll/click)             | `bar/Workspaces.tsx`                 |
| Active window title                                      | `bar/FocusedClient.tsx`              |
| System tray (AstalTray, dbusmenu)                         | `bar/SysTray.tsx`                    |
| Volume + brightness popover                                | `bar/AudioBrightness.tsx`            |
| Battery / network / bluetooth / lock-keys / GPU mode        | `bar/SystemIndicators.tsx`           |
| Mpris mini media player                                       | `bar/MediaBar.tsx`                   |
| Clock + calendar popover                                       | `bar/ClockMenu.tsx`                  |
| App launcher (AstalApps fuzzy search)                            | `menus/Launcher.tsx`                 |
| Clipboard history (cliphist)                                       | `menus/Clipboard.tsx`                |
| Notification popups + action buttons (AstalNotifd)                   | `menus/NotificationPopups.tsx`       |
| Power menu (reboot/shutdown/suspend/logout + confirm)                   | `menus/PowerMenu.tsx`                |
| Screenshot menu (grim/slurp/swappy)                                        | `menus/ScreenshotMenu.tsx`           |
| CPU/RAM/Temp/Net vitals popover                                              | `overlays/Vitals.tsx`                |
| gromit-mpx draw-mode toggle                                                    | `overlays/DrawToggle.tsx`            |
| Transient on-screen display for volume/brightness (hardware keys too)             | `overlays/OSD.tsx`                   |
| Reactive brightnessctl wrapper + backlight file watcher                              | `lib/brightness.ts`                  |
| Unified Control Center (Wi-Fi, Bluetooth, Night Light, DND, sliders)                    | `menus/QuickSettings.tsx`            |
| Wallpaper picker (swww apply + matugen dynamic theme reload)                              | `menus/WallpaperPicker.tsx`          |
| Special workspace (scratchpad) badge                                                        | `bar/Workspaces.tsx`                 |
| Output-sink cycling (right-click) on the volume icon                                          | `bar/AudioBrightness.tsx`            |
| Dash-to-dock style dock (pinned + running, hover reveal)                          | `dock/Dock.tsx`                      |
| Hyprland exec-once / layerrule / keybind / windowrule integration                    | `hypr-snippet.conf`                  |
| Fedora dependency installation                                                          | this file (§1)                       |

## 5. Changelog — v2 (QuickSettings / OSD / WallpaperPicker pass)

- **`lib/brightness.ts` (new)** — reactive `brightnessctl` wrapper (`Variable<number>` 0..1) with
  a `Gio.FileMonitor` on `/sys/class/backlight/*/brightness` so brightness changes from any
  source (bar slider, QuickSettings, or hardware keys bound straight to `brightnessctl` in Hyprland)
  stay in sync. `bar/AudioBrightness.tsx` and `menus/QuickSettings.tsx` now both read/write through it.
- **`overlays/OSD.tsx` (new)** — transient bottom-center HUD. Subscribes directly to `AstalWp`'s
  `notify::volume`/`notify::mute` signals (re-binding whenever the default sink changes) and to
  `brightness.value`, so it pops for *any* volume/brightness change — including ones driven purely
  by Hyprland's `bindle` hardware-key binds, with no `ags request` round-trip needed.
- **`menus/QuickSettings.tsx` (new)** — singleton control-center window (`SUPER+N`) with Wi-Fi,
  Bluetooth, Night Light (`hyprshade toggle blue-light-filter`, no-ops if not installed), and DND
  (`AstalNotifd.dontDisturb`) toggle tiles, plus volume/brightness sliders.
- **`menus/WallpaperPicker.tsx` (new)** — singleton window (`SUPER+W`) listing images from
  `~/Pictures/Wallpapers`; applying one runs `swww img` and, if `matugen` is installed, regenerates
  the palette and hot-reloads `style.css` via `App.apply_css(path, true)`.
- **`bar/Workspaces.tsx`** — added a scratchpad badge that only appears while Hyprland's special
  workspace holds windows; dispatches `togglespecialworkspace`.
- **`bar/AudioBrightness.tsx`** — right-click on the volume icon now cycles the default output sink
  (`AstalWp` `audio.speakers`) without opening the popover; brightness section now delegates to
  `lib/brightness.ts` instead of a local poller.
- **`bar/SystemIndicators.tsx`** — network/Bluetooth/battery are now a single glance cluster that
  opens `QuickSettings` on click, instead of each carrying its own popover (the actual toggles moved
  into QuickSettings). GPU-mode and lock-key indicators are unchanged.
- **`app.ts`** — registers `OSD()`, `QuickSettings()`, `WallpaperPicker()` as singleton windows.
- **`hypr-snippet.conf`** — fixed a bug where the launcher/clipboard/power-menu/screenshot-menu
  keybinds sent `toggle-window:name` (colon) but `app.ts`'s `requestHandler` parses on a **space**
  (`request.split(" ")`), so those binds never actually matched the `"toggle-window"` case. All
  binds now send `"toggle-window <name>"`. Added `SUPER+N` (QuickSettings), `SUPER+W` (WallpaperPicker),
  `exec-once = swww-daemon`, and `bindle`/`bindl` hardware volume/brightness keys via `wpctl`/`brightnessctl`.

## 5. Notes & assumptions

- `hypr-snippet.conf`'s `layerrule` target names match each `<window name="...">`
  in the TSX (Hyprland layer-shell surfaces are addressed by their `namespace`,
  which Astal sets from the `name` prop).
- `SystemIndicators.tsx`'s caps-lock check shells out to `hyprctl devices -j`
  since GTK4 doesn't expose keyboard LED state directly on Wayland; swap in
  `libinput` udev monitoring if you need lower latency.
- `GpuModeIndicator` and `DrawToggle` no-op gracefully (render an empty box)
  if `supergfxctl` / `gromit-mpx` aren't installed, so the shell still starts
  on non-hybrid-GPU machines.
- `ScreenshotMenu`'s active-window capture depends on `jq` for JSON parsing
  of `hyprctl activewindow -j`.
