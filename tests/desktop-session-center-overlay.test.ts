import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("desktop session center overlay exposes replay deferred and unavailable diagnostics in-card", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "apps", "desktop", "src", "DesktopSessionCenterOverlay.tsx"),
    "utf8",
  );

  assert.match(source, /summarizeSessionReplayStatus/);
  assert.match(source, /useEffect/);
  assert.match(source, /useRef/);
  assert.match(source, /const onCloseRef = useRef\(props\.onClose\);/);
  assert.match(source, /const dialogRef = useRef<HTMLElement \| null>\(null\);/);
  assert.match(source, /const previousFocusedElementRef = useRef<HTMLElement \| null>\(null\);/);
  assert.match(source, /onCloseRef\.current = props\.onClose;/);
  assert.match(
    source,
    /if \(typeof document !== "undefined" && document\.activeElement instanceof HTMLElement\) \{\s*previousFocusedElementRef\.current = document\.activeElement;\s*\} else \{\s*previousFocusedElementRef\.current = null;\s*\}/,
  );
  assert.match(source, /dialogRef\.current\?\.focus\(\);/);
  assert.match(source, /const previousFocusedElement = previousFocusedElementRef\.current;/);
  assert.match(source, /if \(previousFocusedElement\) \{\s*previousFocusedElement\.focus\(\);\s*previousFocusedElementRef\.current = null;\s*\}/);
  assert.match(source, /if \(!props\.open\) \{\s*return;\s*\}/);
  assert.match(source, /if \(typeof window === "undefined"\) \{\s*return;\s*\}/);
  assert.match(source, /if \(event\.key !== "Escape"\) \{\s*return;\s*\}/);
  assert.match(source, /event\.preventDefault\(\);\s*onCloseRef\.current\(\);/);
  assert.match(source, /window\.addEventListener\("keydown", handleKeyDown\);/);
  assert.match(source, /window\.removeEventListener\("keydown", handleKeyDown\);/);
  assert.match(source, /\}, \[props\.open\]\);/);
  assert.match(source, /ref=\{dialogRef\}/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /session\.replayStatus\.state !== "loaded"/);
  assert.match(source, /session\.replayStatus\?\.state === "deferred"/);
  assert.match(source, /session\.replayStatus\?\.state === "unavailable"/);
  assert.match(source, /const loadedReplayCount = props\.snapshot\?\.counts\.loadedReplayCount \?\? 0;/);
  assert.match(source, /const deferredReplayCount = props\.snapshot\?\.counts\.deferredReplayCount \?\? 0;/);
  assert.match(source, /const unavailableReplayCount = props\.snapshot\?\.counts\.unavailableReplayCount \?\? 0;/);
  assert.match(source, /Replay load:\s*\{loadedReplayCount\} loaded \/ \{deferredReplayCount\} deferred \/ \{unavailableReplayCount\} unavailable/);
  assert.match(source, /onLoadMoreReplay: \(\) => void;/);
  assert.match(source, /onClick=\{props\.onLoadMoreReplay\}/);
  assert.match(source, /disabled=\{props\.loading \|\| deferredReplayCount === 0\}/);
  assert.match(source, /onClick=\{props\.onRefresh\}/);
  assert.match(source, /disabled=\{props\.loading\}/);
  assert.match(source, /aria-busy=\{props\.loading \|\| undefined\}/);
  assert.match(source, /style=\{overlayButtonStyle\(props\.loading \? "disabled" : "secondary"\)\}/);
  assert.match(source, /\{props\.loading \? "Refreshing\.\.\." : "Refresh"\}/);
  assert.match(source, /Load more replay/);
  assert.match(source, /Replay deferred for \{deferredReplayCount\} session/);
  assert.match(source, /Use Load more replay to preload additional\s+sessions\./);
  assert.match(source, /disabled=\{!reattachable \|\| reattaching\}/);
  assert.match(source, /aria-busy=\{reattaching \|\| undefined\}/);
  assert.match(
    source,
    /style=\{overlayButtonStyle\(reattachable && !reattaching \? "primary" : "disabled"\)\}/,
  );
  assert.match(source, /overlayReplayDeferredHintStyle/);
  assert.match(source, /overlaySessionReplayStatusStyle/);
});
