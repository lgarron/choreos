import { ChoreoApp } from "../ChoreoApp";

// biome-ignore lint/suspicious/noExplicitAny: We're setting a global on purpose.
(globalThis as any).app = new ChoreoApp({
  mpdURL: "./video/dash/dawn-mazurka.mpd",
  // localVideoURL: "./video/dawn-mazurka-1080p-qv25.mp4",
  leadInSeconds: 4.35,
  localStorageChoreoKey: "dawn-mazurka",
});
