import { ModalButton, ModalButtonSpec } from "../types/index";

interface DefaultButtons {
  [key: string]: ModalButton;
  ok: ModalButton;
  cancel: ModalButton;
  nevermind: ModalButton;
}

const DEFAULT_BUTTONS = {
  cancel: {
    id: "modal-cancel",
    label: ["prompt.action.cancel"],
    className: "secondary",
  },
  nevermind: {
    id: "modal-cancel",
    label: ["prompt.action.nevermind"],
    className: "secondary",
  },
  ok: {
    id: "modal-ok",
    label: ["prompt.action.ok"],
    className: "secondary",
  },
} as DefaultButtons;

export function specToButton(buttonSpec: ModalButtonSpec): ModalButton {
  let button: ModalButton;
  if (typeof buttonSpec === "string") {
    button = DEFAULT_BUTTONS[buttonSpec];
    if (!button) {
      button = {
        label: "?",
      };
    }
  } else {
    button = buttonSpec as ModalButton;
  }
  return button;
}