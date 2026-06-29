import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopEntryPath = path.join(rootDir, "packages", "sdkwork-terminal-pc-desktop", "src-tauri", "src", "main.rs");
const desktopHtmlPath = path.join(rootDir, "index.desktop.html");

test("desktop host entrypoint uses the Windows GUI subsystem for release builds", () => {
  const source = fs.readFileSync(desktopEntryPath, "utf8");

  assert.match(
    source,
    /#!\[cfg_attr\(\s*all\(not\(debug_assertions\),\s*target_os = "windows"\),\s*windows_subsystem = "windows"\s*\)\s*\]/s,
  );
  assert.match(source, /sdkwork_terminal_desktop_host_lib::run\(\);/);
});

test("desktop html defines an explicit dark shell bootstrap contract", () => {
  const source = fs.readFileSync(desktopHtmlPath, "utf8");

  assert.match(source, /<meta name="color-scheme" content="dark"\s*\/?>/i);
  assert.match(source, /box-sizing:\s*border-box/i);
  assert.match(source, /overscroll-behavior:\s*none/i);
  assert.match(source, /html,\s*body,\s*#root\s*\{/i);
  assert.match(source, /min-height:\s*100%/i);
});

test("desktop tauri host exposes secure session keyring commands", () => {
  const libSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-pc-desktop", "src-tauri", "src", "lib.rs"),
    "utf8",
  );
  const secureSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-pc-desktop", "src-tauri", "src", "secure_session.rs"),
    "utf8",
  );

  // Backward-compatible default-slot commands.
  assert.match(libSource, /desktop_secure_session_read/);
  assert.match(libSource, /desktop_secure_session_write/);
  assert.match(libSource, /desktop_secure_session_clear/);
  // Multi-slot commands (encryption + versioning + TTL + named slots).
  assert.match(libSource, /desktop_secure_session_read_slot/);
  assert.match(libSource, /desktop_secure_session_write_slot/);
  assert.match(libSource, /desktop_secure_session_clear_slot/);

  // secure_session.rs MUST be backed by the OS keyring.
  assert.match(secureSource, /keyring::Entry/);
  // MUST encrypt payloads with AES-256-GCM via sdkwork-utils-rust.
  assert.match(secureSource, /aes_gcm_encrypt/);
  assert.match(secureSource, /aes_gcm_decrypt/);
  assert.match(secureSource, /derive_aes_256_key/);
  // MUST version envelopes so future format migrations are detectable.
  assert.match(secureSource, /ENVELOPE_VERSION/);
  assert.match(secureSource, /ENVELOPE_VERSION_PREFIX/);
  // MUST enforce TTL expiry with lazy cleanup.
  assert.match(secureSource, /expires_at/);
  assert.match(secureSource, /DEFAULT_TTL_SECONDS/);
  // MUST support named slots with per-slot key isolation.
  assert.match(secureSource, /derive_slot_key/);
  assert.match(secureSource, /validate_slot/);
});

test("desktop tauri capability enforces scoped IPC permission set without wildcard core access", () => {
  const capability = JSON.parse(
    fs.readFileSync(
      path.join(
        rootDir,
        "packages",
        "sdkwork-terminal-pc-desktop",
        "src-tauri",
        "capabilities",
        "default.json",
      ),
      "utf8",
    ),
  );

  // Capability MUST be scoped to the main window only, not wildcards.
  assert.deepEqual(capability.windows, ["main"]);
  // Capability MUST mount the app-owned permission set, not raw core:* wildcards.
  assert.ok(
    capability.permissions.includes("desktop-host-commands"),
    "default capability must include the desktop-host-commands permission set",
  );

  // Core permissions MUST follow least-privilege: only `core:default` as a
  // blanket set, plus explicit `core:window:allow-*` / `core:webview:allow-*`
  // grants for specific commands the UI needs. No `core:shell:*`, `core:process:*`,
  // `core:fs:*`, or other high-risk core permissions.
  const corePermissions = capability.permissions.filter((p) =>
    typeof p === "string" && p.startsWith("core:"),
  );
  assert.ok(
    corePermissions.includes("core:default"),
    "core:default must be present as the standard baseline",
  );
  const dangerousCore = corePermissions.filter((p) =>
    p.startsWith("core:shell:") ||
    p.startsWith("core:process:") ||
    p.startsWith("core:fs:") ||
    p.startsWith("core:http:")
  );
  assert.deepEqual(
    dangerousCore,
    [],
    "capability must not grant dangerous core permissions (shell/process/fs/http)",
  );
  // Additional core permissions MUST be explicit allows, not blanket defaults.
  const blanketCoreDefaults = corePermissions.filter((p) =>
    p !== "core:default" && p.endsWith(":default")
  );
  // core:webview:default is acceptable for zoom/focus controls.
  const acceptableDefaults = blanketCoreDefaults.filter(
    (p) => p === "core:webview:default",
  );
  assert.deepEqual(
    blanketCoreDefaults,
    acceptableDefaults,
    "blanket core:*:default permissions beyond core:default and core:webview:default are not allowed",
  );
});

test("desktop tauri CSP restricts script execution to same-origin and blocks injection vectors", () => {
  const config = JSON.parse(
    fs.readFileSync(
      path.join(
        rootDir,
        "packages",
        "sdkwork-terminal-pc-desktop",
        "src-tauri",
        "tauri.conf.json",
      ),
      "utf8",
    ),
  );
  const csp = config.app.security.csp;

  // script-src MUST NOT allow wildcards or arbitrary local ports.
  const scriptSrcMatch = csp.match(/script-src\s+([^;]+)/);
  assert.ok(scriptSrcMatch, "CSP must define script-src");
  const scriptSrc = scriptSrcMatch[1];
  assert.ok(
    !scriptSrc.includes("http://127.0.0.1:*"),
    "script-src must not allow arbitrary local ports (code injection risk)",
  );
  assert.ok(
    !scriptSrc.includes("*") || scriptSrc.trim() === "'self'",
    "script-src must not contain wildcards",
  );

  // MUST include clickjacking, base-uri, form-action, and object-src guards.
  assert.match(csp, /frame-ancestors\s+'none'/, "CSP must set frame-ancestors 'none'");
  assert.match(csp, /base-uri\s+'self'/, "CSP must restrict base-uri to 'self'");
  assert.match(csp, /form-action\s+'self'/, "CSP must restrict form-action to 'self'");
  assert.match(csp, /object-src\s+'none'/, "CSP must set object-src 'none'");

  // connect-src MUST allow IPC and local runtime connections.
  assert.match(csp, /connect-src[^;]*ipc:/, "CSP must allow ipc: protocol for Tauri IPC");
  assert.match(
    csp,
    /connect-src[^;]*http:\/\/ipc\.localhost/,
    "CSP must allow http://ipc.localhost for Tauri IPC",
  );
});
