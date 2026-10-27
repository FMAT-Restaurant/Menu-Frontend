import { StrictMode, useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useTaskDialog } from "./useTaskDialog";
import { acquireModalScrollLock } from "./useModalScrollLock";

function Dialog({ open, disabled = false }: Readonly<{ open: boolean; disabled?: boolean }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useTaskDialog(dialog, open, cancel);
  return open ? <dialog ref={dialog} aria-label="Task"><h2>Task title</h2><button ref={cancel} disabled={disabled}>Cancel</button><button disabled={disabled}>Confirm</button><div style={{ display: "none" }}><button>Hidden action</button></div></dialog> : null;
}

test("StrictMode reopening restores the trigger and original document styles after each modal session", () => {
  const trigger = document.createElement("button");
  trigger.textContent = "Open task";
  document.body.append(trigger);
  document.body.style.position = "relative";
  document.body.style.top = "3px";
  document.documentElement.style.overflow = "clip";
  trigger.focus();
  const { rerender, unmount } = render(<StrictMode><Dialog open /></StrictMode>);
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  expect(document.body.style.position).toBe("fixed");
  rerender(<StrictMode><Dialog open={false} /></StrictMode>);
  expect(trigger).toHaveFocus();
  expect(document.body.style.position).toBe("relative");
  expect(document.body.style.top).toBe("3px");
  expect(document.documentElement.style.overflow).toBe("clip");
  fireEvent.focus(trigger);
  rerender(<StrictMode><Dialog open /></StrictMode>);
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  unmount();
  expect(document.body.style.position).toBe("relative");
  trigger.remove();
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("top");
  document.documentElement.style.removeProperty("overflow");
});

test("closing one nested modal cannot release another modal's document lock", () => {
  document.body.style.setProperty("overflow", "scroll", "important");
  const releaseParent = acquireModalScrollLock(document);
  const releaseChild = acquireModalScrollLock(document);
  releaseChild();
  releaseChild();
  expect(document.body.style.position).toBe("fixed");
  releaseParent();
  expect(document.body.style.position).toBe("");
  expect(document.body.style.getPropertyValue("overflow")).toBe("scroll");
  expect(document.body.style.getPropertyPriority("overflow")).toBe("important");
  document.body.style.removeProperty("overflow");
});

test("Tab and Shift+Tab wrap at the dialog boundaries instead of reaching the document", () => {
  const { unmount } = render(<Dialog open />);
  const first = screen.getByRole("button", { name: "Cancel" });
  const last = screen.getByRole("button", { name: "Confirm" });
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(last).toHaveFocus();
  unmount();
});

test("a pending dialog with no enabled controls contains Tab on its title without enabling an action", () => {
  const { rerender, unmount } = render(<Dialog open />);
  rerender(<Dialog open disabled />);
  const dialog = screen.getByRole("dialog", { name: "Task" });
  const title = screen.getByRole("heading", { name: "Task title" });
  fireEvent.keyDown(dialog, { key: "Tab" });
  expect(title).toHaveFocus();
  fireEvent.keyDown(title, { key: "Tab", shiftKey: true });
  expect(title).toHaveFocus();
  expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  rerender(<Dialog open={false} />);
  expect(title).not.toHaveAttribute("tabindex");
  unmount();
});

test("a pending topmost dialog recovers Tab from the document after its active control becomes disabled", () => {
  const outside = document.createElement("button");
  document.body.append(outside);
  const { unmount } = render(<><Dialog open disabled /><Dialog open disabled /></>);
  const titles = screen.getAllByRole("heading", { name: "Task title" });
  outside.focus();
  fireEvent.keyDown(outside, { key: "Tab" });
  expect(titles[1]).toHaveFocus();
  expect(titles[0]).not.toHaveFocus();
  outside.focus();
  fireEvent.keyDown(outside, { key: "Tab", shiftKey: true });
  expect(titles[1]).toHaveFocus();
  unmount();
  outside.focus();
  fireEvent.keyDown(outside, { key: "Tab" });
  expect(outside).toHaveFocus();
  outside.remove();
});
