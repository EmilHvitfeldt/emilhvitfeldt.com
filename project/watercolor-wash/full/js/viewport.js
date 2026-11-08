// Ported from the wtrclred source (ShellViewport.ts), with one change: the
// paper/brush layers can be pointed at an element (the editor's stage)
// instead of the whole window, via setShellViewportElement().
// Classic script (see random.js for why).

let shellViewportElement = null;

/** Sizes the paper and brush layers to this element instead of the window. */
function setShellViewportElement(element) {
  shellViewportElement = element;
}

/** Reads the visible viewport so mobile browser chrome changes resize the paper layer. */
function getShellViewportSize() {
  if (shellViewportElement) {
    return {
      height: Math.max(1, Math.round(shellViewportElement.clientHeight)),
      width: Math.max(1, Math.round(shellViewportElement.clientWidth)),
    };
  }

  const viewport = window.visualViewport;
  const root = document.documentElement;

  return {
    height: Math.max(1, Math.round(viewport?.height ?? 0), Math.round(window.innerHeight), Math.round(root.clientHeight)),
    width: Math.max(1, Math.round(viewport?.width ?? 0), Math.round(window.innerWidth), Math.round(root.clientWidth)),
  };
}

/** Subscribes to both layout and visual viewport changes. */
function addShellViewportListeners(listener) {
  window.addEventListener("resize", listener, { passive: true });
  window.addEventListener("orientationchange", listener);
  window.visualViewport?.addEventListener("resize", listener, { passive: true });
  window.visualViewport?.addEventListener("scroll", listener, { passive: true });

  // Panels resizing the stage don't fire any window event.
  const observer = shellViewportElement ? new ResizeObserver(() => listener()) : undefined;
  if (observer && shellViewportElement) observer.observe(shellViewportElement);

  return () => {
    window.removeEventListener("resize", listener);
    window.removeEventListener("orientationchange", listener);
    window.visualViewport?.removeEventListener("resize", listener);
    window.visualViewport?.removeEventListener("scroll", listener);
    observer?.disconnect();
  };
}
