/** Chrome-style first-click selection without taking away subsequent caret edits. */
export function addressSelection(input: HTMLInputElement) {
  let fresh = true;
  let down: { x: number; y: number } | undefined;
  input.addEventListener('blur', () => (fresh = true));
  window.addEventListener('blur', () => (fresh = true));
  input.addEventListener('focus', () => input.select());
  input.addEventListener('mousedown', (event) => (down = { x: event.clientX, y: event.clientY }));
  input.addEventListener('mouseup', (event) => {
    const dragged = down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4;
    down = undefined;
    if (fresh && !dragged && event.button === 0) {
      event.preventDefault();
      input.select();
    }
    fresh = false;
  });
  return () => {
    input.focus();
    input.select();
    fresh = false;
  };
}
