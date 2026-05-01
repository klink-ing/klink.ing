export function initHamburgerMenu(navElement: HTMLElement): () => void {
  const toggle = navElement.querySelector<HTMLButtonElement>("[data-hamburger-toggle]");
  const menu = navElement.querySelector<HTMLElement>("[data-hamburger-menu]");
  if (!toggle || !menu) {
    return () => {};
  }

  function isOpen(): boolean {
    return toggle!.getAttribute("aria-expanded") === "true";
  }

  function setOpen(open: boolean): void {
    toggle!.setAttribute("aria-expanded", String(open));
    menu!.setAttribute("data-open", String(open));
  }

  function close(): void {
    setOpen(false);
    toggle!.focus();
  }

  function handleToggleClick(): void {
    setOpen(!isOpen());
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape" && isOpen()) {
      event.preventDefault();
      close();
    }
  }

  function handleDocumentClick(event: Event): void {
    const { target } = event;
    if (isOpen() && target instanceof Node && !navElement.contains(target)) {
      setOpen(false);
    }
  }

  toggle.addEventListener("click", handleToggleClick);
  navElement.addEventListener("keydown", handleKeyDown);
  document.addEventListener("click", handleDocumentClick);

  return () => {
    toggle.removeEventListener("click", handleToggleClick);
    navElement.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("click", handleDocumentClick);
  };
}
