/**
 * Hand-written stand-ins for the Astal GIR types (Astal core + AstalHyprland,
 * AstalApps, …). AGS generates these from the installed GIRs at runtime; they
 * are not published to npm, so these stubs mirror the public API the shell
 * uses to make local typechecking possible.
 *
 * Shapes follow the real libraries: the default import is the GI namespace
 * object (classes + enums as properties), and namespace-level `get_default()`
 * exists ONLY where the actual vala/C sources define one — AstalHyprland,
 * AstalWp, AstalBattery, AstalTray and AstalPowerProfiles have it; AstalNetwork,
 * AstalBluetooth, AstalNotifd and AstalMpris expose it on their main class
 * instead, so call `Network.Network.get_default()` etc. for those.
 *
 * NOTE: this file must stay a global script (no top-level imports) — imports
 * live inside the `declare module` blocks, otherwise the ambient declarations
 * would become module augmentations and stop registering.
 */

/* ================= Astal core (gi://Astal) ================= */
declare module "gi://Astal?version=4.0" {
    import Gtk from "gi://Gtk";
    import Gdk from "gi://Gdk";

    export enum WindowAnchor {
        TOP = 1,
        BOTTOM = 2,
        LEFT = 4,
        RIGHT = 8,
    }
    export enum Exclusivity {
        IGNORE = -1,
        AUTO = 0,
        EXCLUSIVE = 1,
    }
    export enum Layer {
        BACKGROUND = 0,
        BOTTOM = 1,
        TOP = 2,
        OVERLAY = 3,
    }
    export enum Keymode {
        NONE = 0,
        ON_DEMAND = 1,
        EXCLUSIVE = 2,
    }

    export class Window extends Gtk.Window {
        namespace: string;
        anchor: WindowAnchor;
        exclusivity: Exclusivity;
        layer: Layer;
        keymode: Keymode;
        gdkmonitor: Gdk.Monitor;
        marginTop: number;
        marginBottom: number;
        marginLeft: number;
        marginRight: number;
        margin: number;
        monitor: number;
    }
    export namespace Window {
        export type ConstructorProps = Gtk.Window.ConstructorProps & {
            namespace?: string;
            anchor?: WindowAnchor;
            exclusivity?: Exclusivity;
            layer?: Layer;
            keymode?: Keymode;
            gdkmonitor?: Gdk.Monitor;
            marginTop?: number;
            marginBottom?: number;
            marginLeft?: number;
            marginRight?: number;
            margin?: number;
            monitor?: number;
        };
    }

    export class Box extends Gtk.Box {}
    export namespace Box {
        export type ConstructorProps = Gtk.Box.ConstructorProps;
    }

    export class Slider extends Gtk.Scale {
        value: number;
        min: number;
        max: number;
        step: number;
        page: number;
    }
    export namespace Slider {
        export type ConstructorProps = Gtk.Scale.ConstructorProps & {
            value?: number;
            min?: number;
            max?: number;
            step?: number;
            page?: number;
        };
    }

    export class Application extends Gtk.Application {
        instanceName: string;
        windows: Gtk.Window[];
        get_window(name: string): Gtk.Window | null;
        toggle_window(name: string): boolean;
        apply_css(css: string, reset?: boolean): void;
        add_icons(path: string): void;
        acquire_socket(): boolean;
        hold(): void;
        runAsync(argv: string[]): void;
        quit(): void;
        connect(sig: string, cb: (...args: any[]) => void): number;
    }

    const Astal: {
        Application: typeof Application;
        Window: typeof Window;
        Box: typeof Box;
        Slider: typeof Slider;
        WindowAnchor: typeof WindowAnchor;
        Exclusivity: typeof Exclusivity;
        Layer: typeof Layer;
        Keymode: typeof Keymode;
    };
    export default Astal;
}

declare module "gi://Astal" {
    import Astal4 from "gi://Astal?version=4.0";
    export default Astal4;
}

/* ================= AstalHyprland (namespace-level get_default) ================= */
declare module "gi://AstalHyprland" {
    import GObject from "gi://GObject";

    export class Monitor extends GObject.Object {
        id: number;
        name: string;
    }
    export class Workspace extends GObject.Object {
        id: number;
        name: string | null;
        monitor: Monitor | null;
        get_clients(): Client[];
    }
    export class Client extends GObject.Object {
        address: string;
        title: string;
        class: string;
        initialClass: string;
        pid: number;
        workspace: Workspace | null;
        fullscreen: boolean;
        fullscreenClient: boolean;
        focus(): void;
        kill(): void;
    }
    export class Hyprland extends GObject.Object {
        static get_default(): Hyprland;
        workspaces: Workspace[];
        clients: Client[];
        focusedWorkspace: Workspace | null;
        focusedClient: Client | null;
        get_workspace(id: number): Workspace | null;
        get_client(address: string): Client | null;
        get_monitor(id: number): Monitor | null;
        dispatch(keyword: string, arg: string): void;
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    const AstalHyprland: {
        Hyprland: typeof Hyprland;
        Workspace: typeof Workspace;
        Client: typeof Client;
        Monitor: typeof Monitor;
        get_default(): Hyprland;
    };
    export default AstalHyprland;
}

/* ================= AstalApps ================= */
declare module "gi://AstalApps" {
    import GObject from "gi://GObject";

    export class Application extends GObject.Object {
        name: string;
        description: string | null;
        executable: string;
        entry: string | null;
        iconName: string | null;
        keywords: string[];
        categories: string[];
        frequency: number;
        launch(uri?: string): boolean;
        launchAsync(uri?: string): Promise<boolean>;
    }
    export class Apps extends GObject.Object {
        fuzzy_query(pattern: string): Application[];
        get_list(): Application[];
        launch(name: string): boolean;
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    const AstalApps: {
        Apps: typeof Apps;
        Application: typeof Application;
    };
    export default AstalApps;
}

/* ================= AstalTray (namespace-level get_default) ================= */
declare module "gi://AstalTray" {
    import GObject from "gi://GObject";
    import type Gio from "gi://Gio";

    export class TrayItem extends GObject.Object {
        id: string;
        title: string | null;
        icon: string | null;
        gicon: Gio.Icon | null;
        tooltipMarkup: string | null;
        menuModel: Gio.MenuModel | null;
        actionGroup: Gio.ActionGroup | null;
        isMenu: boolean;
        activate(x: number, y: number): void;
    }
    export class Tray extends GObject.Object {
        static get_default(): Tray;
        items: TrayItem[];
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    const AstalTray: {
        Tray: typeof Tray;
        TrayItem: typeof TrayItem;
        get_default(): Tray;
    };
    export default AstalTray;
}

/* ================= AstalWp (namespace-level get_default) ================= */
declare module "gi://AstalWp" {
    import GObject from "gi://GObject";

    export class Endpoint extends GObject.Object {
        id: number;
        name: string;
        description: string | null;
        volume: number;
        mute: boolean;
    }
    export class Audio extends GObject.Object {
        speakers: Endpoint[];
        microphones: Endpoint[];
        defaultSpeaker: Endpoint | null;
        defaultMicrophone: Endpoint | null;
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    export class Wp extends GObject.Object {
        static get_default(): Wp;
        audio: Audio;
    }
    const AstalWp: {
        Wp: typeof Wp;
        Audio: typeof Audio;
        Endpoint: typeof Endpoint;
        get_default(): Wp;
    };
    export default AstalWp;
}

/* ================= AstalBattery (namespace-level get_default) ================= */
declare module "gi://AstalBattery" {
    import GObject from "gi://GObject";

    export class Battery extends GObject.Object {
        static get_default(): Battery;
        isPresent: boolean;
        percentage: number;
        charging: boolean;
        timeFull: number;
        timeEmpty: number;
        energyRate: number;
    }
    const AstalBattery: {
        Battery: typeof Battery;
        get_default(): Battery;
    };
    export default AstalBattery;
}

/* ================= AstalNetwork (class-level get_default only!) ================= */
declare module "gi://AstalNetwork" {
    import GObject from "gi://GObject";

    export class AccessPoint extends GObject.Object {
        bssid: string;
        ssid: string | null;
        strength: number;
        frequency: number;
    }
    export class Wifi extends GObject.Object {
        enabled: boolean;
        scanning: boolean;
        strength: number;
        ssid: string | null;
        internet: Network.Internet;
        accessPoints: AccessPoint[];
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    export class Wired extends GObject.Object {
        internet: Network.Internet;
        device: string;
        speed: number;
    }
    export class Network extends GObject.Object {
        static get_default(): Network;
        primary: Network.Primary;
        wifi: Wifi | null;
        wired: Wired | null;
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    export namespace Network {
        export enum Primary {
            UNKNOWN = 0,
            WIRED,
            WIFI,
            LOOPBACK,
            VPN,
        }
        export enum Internet {
            OFFLINE = 0,
            PORTAL,
            LOCKED,
            CONNECTING,
            CONNECTED,
        }
    }
    const AstalNetwork: {
        Network: typeof Network;
        Wifi: typeof Wifi;
        Wired: typeof Wired;
        AccessPoint: typeof AccessPoint;
        Primary: typeof Network.Primary;
        Internet: typeof Network.Internet;
    };
    export default AstalNetwork;
}

/* ================= AstalBluetooth (class-level get_default only!) ================= */
declare module "gi://AstalBluetooth" {
    import GObject from "gi://GObject";

    export class Device extends GObject.Object {
        address: string;
        name: string;
        alias: string;
        connected: boolean;
        paired: boolean;
        trusted: boolean;
        blocked: boolean;
        connecting: boolean;
    }
    export class Adapter extends GObject.Object {
        powered: boolean;
    }
    export class Bluetooth extends GObject.Object {
        static get_default(): Bluetooth;
        isPowered: boolean;
        isConnected: boolean;
        adapter: Adapter;
        devices: Device[];
        connectedDevices: Device[];
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    const AstalBluetooth: {
        Bluetooth: typeof Bluetooth;
        Device: typeof Device;
        Adapter: typeof Adapter;
    };
    export default AstalBluetooth;
}

/* ================= AstalMpris (class-level get_default only!) ================= */
declare module "gi://AstalMpris" {
    import GObject from "gi://GObject";

    export class Player extends GObject.Object {
        busName: string;
        identity: string;
        position: number;
        length: number;
        title: string;
        artist: string;
        album: string;
        coverArt: string | null;
        playbackStatus: Mpris.PlaybackStatus;
        canPlay: boolean;
        canPause: boolean;
        canGoNext: boolean;
        canGoPrevious: boolean;
        shuffle: boolean | null;
        loopStatus: string | null;
        play(): void;
        pause(): void;
        play_pause(): void;
        stop(): void;
        next(): void;
        previous(): void;
        set_position(trackId: string, position: number): void;
    }
    export class Mpris extends GObject.Object {
        static get_default(): Mpris;
        players: Player[];
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    export namespace Mpris {
        export enum PlaybackStatus {
            PLAYING = 0,
            PAUSED,
            STOPPED,
        }
    }
    const AstalMpris: {
        Mpris: typeof Mpris;
        Player: typeof Player;
        PlaybackStatus: typeof Mpris.PlaybackStatus;
    };
    export default AstalMpris;
}

/* ================= AstalNotifd (class-level get_default only!) ================= */
declare module "gi://AstalNotifd" {
    import GObject from "gi://GObject";

    export class Notification extends GObject.Object {
        static new(summary: string, body: string, iconName: string): Notification;
        id: number;
        appName: string | null;
        summary: string;
        body: string | null;
        appIcon: string;
        desktopEntry: string | null;
        urgency: Notifd.Urgency;
        category: string | null;
        actions: { id: string; label: string }[];
        timeout: number;
        image: string | null;
        useActionIcons: boolean;
        dismiss(): void;
        invoke(id: string): void;
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    export class Notifd extends GObject.Object {
        static get_default(): Notifd;
        dontDisturb: boolean;
        cache_notifications: boolean;
        notifications: Notification[];
        get_notification(id: number): Notification | null;
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    export namespace Notifd {
        export enum Urgency {
            LOW = 0,
            NORMAL,
            CRITICAL,
        }
    }
    const AstalNotifd: {
        Notifd: typeof Notifd;
        Notification: typeof Notification;
        Urgency: typeof Notifd.Urgency;
    };
    export default AstalNotifd;
}

/* ================= AstalPowerProfiles (namespace-level get_default) ================= */
declare module "gi://AstalPowerProfiles" {
    import GObject from "gi://GObject";

    export class PowerProfiles extends GObject.Object {
        static get_default(): PowerProfiles;
        activeProfile: string;
        iconName: string;
        profiles: { profile: string; driver: string; availability: string }[];
        actions: string[];
        version: string;
        connect(sig: string, cb: (...args: any[]) => void): number;
    }
    const AstalPowerProfiles: {
        PowerProfiles: typeof PowerProfiles;
        get_default(): PowerProfiles;
    };
    export default AstalPowerProfiles;
}
