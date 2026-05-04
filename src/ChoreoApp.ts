import "dashjs";
import { mustExist } from "./mustExist";

// 🤨
const { dashjs } = globalThis;

// TODO: Cap this, for when the parent bounding box is too small?
const SCROLL_MARGIN_EM = 3;

interface ButtonInfo {
  button: HTMLElement;
  startTimestamp: number;
  endTimestamp: number;
  animation?: Animation;
}

export class ChoreoApp {
  private video = mustExist(document.querySelector("video"));
  private timestampControls = mustExist(
    document.querySelector("timestamp-controls"),
  );

  private buttonInfos: ButtonInfo[] = [];
  private currentButtonInfo: ButtonInfo | undefined;

  private preventAutoScrollDueToManualScroll = false;
  // This has false negatives due to limitations of the DOM API.
  private autoScrollInProgress = false;

  localStorageKey(type: "lead-in"): string {
    return `dance/choreo/${this.options.localStorageChoreoKey}/${type}`;
  }

  constructor(
    private options: {
      mpdURL: string;
      localVideoURL: string;
      leadInSeconds: number;
      localStorageChoreoKey: string;
    },
  ) {
    if (new URL(location.href).hostname === "localhost") {
      console.log(options.localVideoURL);
      mustExist(document.querySelector<HTMLVideoElement>("#videoPlayer")).src =
        new URL(options.localVideoURL, location.href).toString();
    } else {
      const player = dashjs.MediaPlayer().create();
      player.initialize(
        mustExist(document.querySelector<HTMLMediaElement>("#videoPlayer")),
        options.mpdURL,
        true,
      );
    }

    const buttons = document.querySelectorAll(
      "a.timestamp-link",
    ) as NodeListOf<HTMLElement>;

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
      this.buttonInfos.push(newButtonInfo);
      lastButtonInfo = newButtonInfo;
    }
    // biome-ignore lint/style/noNonNullAssertion: Must be assigned by now.
    lastButtonInfo!.endTimestamp = this.video.duration;

    this.timestampControls.addEventListener("scroll", () => {
      if (!this.autoScrollInProgress) {
        this.preventAutoScrollDueToManualScroll = true;
      }
    });

    this.video.addEventListener("timeupdate", (e) =>
      this.highlightCurrentTime(e),
    );
    this.video.addEventListener("seeking", (e) =>
      this.enableAutoScrollAndHighlightCurrentTime(e),
    );
    this.video.addEventListener("seeked", (e) =>
      this.enableAutoScrollAndHighlightCurrentTime(e),
    );
    this.video.addEventListener("play", (e) =>
      this.enableAutoScrollAndHighlightCurrentTime(e),
    );
    this.video.addEventListener("pause", (e) => this.highlightCurrentTime(e));

    // biome-ignore lint/style/noNonNullAssertion: Rely on the element to exist.
    const leadIn = document.querySelector("#lead-in")! as HTMLInputElement;
    leadIn.checked = localStorage[this.localStorageKey("lead-in")] === "true";
    leadIn.addEventListener("change", () => {
      localStorage[this.localStorageKey("lead-in")] = leadIn.checked
        ? "true"
        : "false";
    });

    // biome-ignore lint/style/noNonNullAssertion: Rely on the element to exist.
    const leadInFlash = document.querySelector(
      "#lead-in-flash",
    )! as HTMLInputElement;
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      button.addEventListener("click", (e: Event) => {
        this.preventAutoScrollDueToManualScroll = false;
        this.video.currentTime = Math.max(
          // biome-ignore lint/style/noNonNullAssertion: Rely on the element to exist.
          Number.parseFloat(button.getAttribute("data-timestamp")!) -
            (leadIn.checked ? options.leadInSeconds : 0),
          0,
        );
        if (leadIn.checked) {
          leadInFlash.animate(
            [
              { background: "rgba(128, 128, 128, 0.5)" },
              { background: "inherit" },
            ],
            {
              duration: 500,
              easing: "ease-in",
            },
          );
        }
        this.video.play();
        this.video.focus();
        e.preventDefault();
      });
    }
  }

  highlightCurrentTime(e: Event) {
    const { currentTime } = this.video;
    if (
      this.currentButtonInfo &&
      this.currentButtonInfo.startTimestamp <= currentTime &&
      currentTime < this.currentButtonInfo.endTimestamp
    ) {
      // TODO: Listen for the `seeking` and `seeked` events instead.
      if (e.type !== "timeupdate") {
        this.setPercent(this.currentButtonInfo, currentTime, e.type);
      }
      return;
    }

    let latestButtonInfo: ButtonInfo | undefined;
    for (const buttonInfo of this.buttonInfos) {
      if (currentTime <= buttonInfo.startTimestamp) {
        break;
      }
      latestButtonInfo = buttonInfo;
    }
    if (latestButtonInfo) {
      const { button } = latestButtonInfo;
      if (this.currentButtonInfo?.button !== button) {
        if (this.currentButtonInfo) {
          this.currentButtonInfo.button.classList.remove("current");
          this.currentButtonInfo.button.style.backgroundPositionX = "00%";
          this.currentButtonInfo.animation?.cancel();
        }
        this.setPercent(latestButtonInfo, currentTime, e.type);
        button.classList.add("current");

        if (!this.preventAutoScrollDueToManualScroll) {
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
            this.autoScrollInProgress = true;
            button.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            this.timestampControls.addEventListener(
              "scrollend",
              () => {
                this.autoScrollInProgress = false;
              },
              { once: true },
            );
          }
        }
        this.currentButtonInfo = latestButtonInfo;
      }
    } else {
      this.currentButtonInfo?.button.classList.remove("current");
    }
  }

  enableAutoScrollAndHighlightCurrentTime(e: Event) {
    this.preventAutoScrollDueToManualScroll = false;
    this.highlightCurrentTime(e);
  }

  setPercent(buttonInfo: ButtonInfo, timestamp: number, type: string): void {
    const percent =
      (100 * (timestamp - buttonInfo.startTimestamp)) /
      (buttonInfo.endTimestamp - buttonInfo.startTimestamp);
    buttonInfo.animation?.cancel();
    buttonInfo.animation?.cancel();
    if (
      ["seeking", "pause"].includes(type) ||
      (type === "seeked" && this.video.paused === true)
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
}
