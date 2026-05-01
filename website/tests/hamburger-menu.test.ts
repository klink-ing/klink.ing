// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { initHamburgerMenu } from "../src/lib/hamburger-menu";

function createMenuDOM(): HTMLElement {
  const nav = document.createElement("nav");
  nav.innerHTML = `
    <button
      data-hamburger-toggle
      aria-expanded="false"
      aria-controls="nav-menu"
      aria-label="Toggle menu"
    >☰</button>
    <ul id="nav-menu" data-hamburger-menu data-open="false">
      <li><a href="/resume">Resumé</a></li>
      <li><a href="/projects">Projects</a></li>
    </ul>
  `;
  document.body.appendChild(nav);
  return nav;
}

describe("hamburger menu", () => {
  let nav: HTMLElement = undefined!;
  let cleanup: (() => void) | undefined = undefined;
  let toggle: HTMLButtonElement = undefined!;
  let menu: HTMLElement = undefined!;

  beforeEach(() => {
    nav = createMenuDOM();
    cleanup = initHamburgerMenu(nav);
    toggle = nav.querySelector("[data-hamburger-toggle]")!;
    menu = nav.querySelector("[data-hamburger-menu]")!;
  });

  afterEach(() => {
    cleanup?.();
    document.body.innerHTML = "";
  });

  it("starts closed", () => {
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(menu.getAttribute("data-open")).toBe("false");
  });

  it("opens on toggle click", () => {
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(menu.getAttribute("data-open")).toBe("true");
  });

  it("closes on second toggle click", () => {
    toggle.click();
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(menu.getAttribute("data-open")).toBe("false");
  });

  it("closes on Escape key", () => {
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    nav.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(menu.getAttribute("data-open")).toBe("false");
  });

  it("returns focus to toggle on Escape", () => {
    toggle.click();
    const link = menu.querySelector("a")!;
    link.focus();

    nav.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.activeElement).toBe(toggle);
  });

  it("closes when clicking outside", () => {
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not close when clicking inside the nav", () => {
    toggle.click();
    const link = menu.querySelector("a")!;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("does nothing on Escape when already closed", () => {
    nav.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("is a no-op when elements are missing", () => {
    const emptyNav = document.createElement("nav");
    const emptyCleanup = initHamburgerMenu(emptyNav);
    expect(emptyCleanup).toBeTypeOf("function");
    emptyCleanup();
  });
});
