import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vite-plus/test";

declare global {
  var __UI_SDK_STRICT__: boolean | undefined;
}
globalThis.__UI_SDK_STRICT__ = true;
HTMLElement.prototype.showPopover = function () {};
HTMLElement.prototype.hidePopover = function () {};
Element.prototype.getAnimations = () => [];
Element.prototype.scrollIntoView = function () {};
Element.prototype.checkVisibility = () => true;
Element.prototype.getClientRects = () => [] as unknown as DOMRectList;
document.elementFromPoint = () => null;
document.elementsFromPoint = () => [];
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
document.head.append(
  Object.assign(document.createElement("style"), {
    textContent: "[popover] { display: block !important }",
  }),
);
export const utterances: SpeechSynthesisUtterance[] = [];
export const voices = [
  { name: "普通话测试", lang: "zh-CN" },
  { name: "English", lang: "en-US" },
];
export const engine = {
  getVoices: () => voices,
  cancel: vi.fn(),
  speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
    utterances.push(utterance);
    utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
  }),
  addEventListener: vi.fn(),
};
Object.defineProperty(window, "speechSynthesis", { value: engine, configurable: true });
Object.defineProperty(window, "SpeechSynthesisUtterance", {
  value: class {
    text: string;
    constructor(text: string) {
      this.text = text;
    }
  },
  configurable: true,
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  utterances.length = 0;
  vi.clearAllMocks();
});
