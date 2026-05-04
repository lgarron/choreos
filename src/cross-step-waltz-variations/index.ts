import { ChoreoApp } from "../ChoreoApp";

// biome-ignore lint/suspicious/noExplicitAny: We're setting a global on purpose.
(globalThis as any).app = new ChoreoApp({
  mpdURL: "./video/dash/stream.mpd",
  // localVideoURL: "./video/cross-step-waltz-variations.mp4",
  leadInSeconds: 6,
  localStorageChoreoKey: "cross-step-waltz-variations",
});
