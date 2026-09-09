/**
 * Pulls in the ambient `gi://` module declarations shipped by the @girs
 * packages so plain `import Gtk from "gi://Gtk"` style imports typecheck.
 * The Astal* namespaces are stubbed by hand in types/astal-*.d.ts because
 * their GIR types are only generated inside the AGS build.
 */
import "@girs/gtk-4.0/ambient";
import "@girs/gdk-4.0/ambient";
import "@girs/glib-2.0/ambient";
import "@girs/gio-2.0/ambient";
import "@girs/gobject-2.0/ambient";
