import "dashjs";
import { mustExist } from "./mustExist";

// 🤨
const { dashjs } = globalThis;

const url =
  "https://garron.net/dance/choreo/dawn-mazurka/video/dash/dawn-mazurka/dawn-mazurka.mpd";
if (new URL(location.href).hostname === "localhost") {
  // biome-ignore lint/style/noNonNullAssertion: We depend on this element to exist.
  document.querySelector<HTMLVideoElement>("#videoPlayer")!.src = new URL(
    "./video/dawn-mazurka-1080p-qv25.mp4",
    import.meta.url,
  ).toString();
} else {
  const player = dashjs.MediaPlayer().create();
  player.initialize(
    // biome-ignore lint/style/noNonNullAssertion: We depend on this element to exist.
    document.querySelector<HTMLMediaElement>("#videoPlayer")!,
    url,
    true,
  );
}

const buttons = document.querySelectorAll(
  "a.timestamp-link",
) as NodeListOf<HTMLElement>;
// biome-ignore lint/style/noNonNullAssertion: Rely on the element to exist.
const video = document.querySelector("video")!;

interface ButtonInfo {
  button: HTMLElement;
  startTimestamp: number;
  endTimestamp: number;
  animation?: Animation;
}
const buttonInfos: ButtonInfo[] = [];

let lastButtonInfo: ButtonInfo | undefined;
for (const button of buttons) {
  const startTimestamp = Number.parseFloat(
    // biome-ignore lint/style/noNonNullAssertion: Rely on the element to exist.
    button.getAttribute("data-timestamp")!,
  );
  const newButtonInfo = {
    button,
    startTimestamp,
  } as ButtonInfo;
  if (lastButtonInfo) {
    lastButtonInfo.endTimestamp = startTimestamp;
  }
  buttonInfos.push(newButtonInfo);
  lastButtonInfo = newButtonInfo;
}
// biome-ignore lint/style/noNonNullAssertion: Must be assigned by now.
lastButtonInfo!.endTimestamp = video.duration;

function setPercent(
  buttonInfo: ButtonInfo,
  timestamp: number,
  type: string,
): void {
  const percent =
    (100 * (timestamp - buttonInfo.startTimestamp)) /
    (buttonInfo.endTimestamp - buttonInfo.startTimestamp);
  buttonInfo.animation?.cancel();
  if (
    ["seeking", "pause"].includes(type) ||
    (type === "seeked" && video.paused === true)
  ) {
    buttonInfo.button.style.backgroundPositionX = `${100 - percent}%`;
    return;
  }
  buttonInfo.animation = buttonInfo.button.animate(
    [
      {
        backgroundPositionX: `${100 - percent}%`,
      },
      {
        backgroundPositionX: "0%",
      },
    ],
    {
      duration: 1000 * (buttonInfo.endTimestamp - timestamp),
      easing: "linear",
    },
  );
}

const timestampControls = mustExist(
  document.querySelector("timestamp-controls"),
);

let preventAutoScrollDueToManualScroll = false;
// This has false negatives due to limitations of the DOM API.
let autoScrollInProgress = false;
timestampControls.addEventListener("scroll", () => {
  if (!autoScrollInProgress) {
    preventAutoScrollDueToManualScroll = true;
  }
});

// TODO: Cap this, for when the parent bounding box is too small?
const SCROLL_MARGIN_EM = 3;

let currentButtonInfo: ButtonInfo | null;
function highlightCurrentTime(e: Event) {
  const { currentTime } = video;
  if (
    currentButtonInfo &&
    currentButtonInfo.startTimestamp <= currentTime &&
    currentTime < currentButtonInfo.endTimestamp
  ) {
    // TODO: Listen for the `seeking` and `seeked` events instead.
    if (e.type !== "timeupdate") {
      setPercent(currentButtonInfo, currentTime, e.type);
    }
    return;
  }

  let latestButtonInfo: ButtonInfo | undefined;
  for (const buttonInfo of buttonInfos) {
    if (currentTime <= buttonInfo.startTimestamp) {
      break;
    }
    latestButtonInfo = buttonInfo;
  }
  if (latestButtonInfo) {
    const { button } = latestButtonInfo;
    if (currentButtonInfo?.button !== button) {
      if (currentButtonInfo) {
        currentButtonInfo.button.classList.remove("current");
        currentButtonInfo.button.style.backgroundPositionX = "00%";
        currentButtonInfo.animation?.cancel();
      }
      setPercent(latestButtonInfo, currentTime, e.type);
      button.classList.add("current");

      if (!preventAutoScrollDueToManualScroll) {
        const scrollMarginPx =
          parseFloat(globalThis.getComputedStyle(button).fontSize) *
          SCROLL_MARGIN_EM;
        const buttonRect = button.getBoundingClientRect();
        // biome-ignore lint/style/noNonNullAssertion: We know the parent element exists.
        const parentRect = button.parentElement!.getBoundingClientRect();
        const needsScroll =
          buttonRect.top < parentRect.top + scrollMarginPx ||
          buttonRect.bottom > parentRect.bottom - scrollMarginPx;
        if (needsScroll) {
          autoScrollInProgress = true;
          button.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          timestampControls.addEventListener(
            "scrollend",
            () => {
              autoScrollInProgress = false;
            },
            { once: true },
          );
        }
      }
      currentButtonInfo = latestButtonInfo;
    }
  } else {
    currentButtonInfo?.button.classList.remove("current");
  }
}

function enableAutoScrollAndHighlightCurrentTime(e: Event) {
  preventAutoScrollDueToManualScroll = false;
  highlightCurrentTime(e);
}

video.addEventListener("timeupdate", highlightCurrentTime);
video.addEventListener("seeking", enableAutoScrollAndHighlightCurrentTime);
video.addEventListener("seeked", enableAutoScrollAndHighlightCurrentTime);
video.addEventListener("play", enableAutoScrollAndHighlightCurrentTime);
video.addEventListener("pause", highlightCurrentTime);

// biome-ignore lint/style/noNonNullAssertion: Rely on the element to exist.
const leadIn = document.querySelector("#lead-in")! as HTMLInputElement;
// biome-ignore lint/complexity/useLiteralKeys: https://github.com/biomejs/biome/issues/463
leadIn.checked = localStorage["dawnMazurkaAppLeadIn"] === "true";
leadIn.addEventListener("change", () => {
  // biome-ignore lint/complexity/useLiteralKeys: https://github.com/biomejs/biome/issues/463
  localStorage["dawnMazurkaAppLeadIn"] = leadIn.checked ? "true" : "false";
});

// biome-ignore lint/style/noNonNullAssertion: Rely on the element to exist.
const leadInFlash = document.querySelector(
  "#lead-in-flash",
)! as HTMLInputElement;
for (let i = 0; i < buttons.length; i++) {
  const button = buttons[i];
  button.addEventListener("click", (e: Event) => {
    preventAutoScrollDueToManualScroll = false;
    video.currentTime = Math.max(
      // biome-ignore lint/style/noNonNullAssertion: Rely on the element to exist.
      Number.parseFloat(button.getAttribute("data-timestamp")!) -
        (leadIn.checked ? 4.35 : 0),
      0,
    );
    if (leadIn.checked) {
      leadInFlash.animate(
        [{ background: "rgba(128, 128, 128, 0.5)" }, { background: "inherit" }],
        {
          duration: 500,
          easing: "ease-in",
        },
      );
    }
    video.play();
    video.focus();
    e.preventDefault();
  });
}
