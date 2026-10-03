import React from "react";
import { fireEvent, render, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../components/theme-provider";

describe("theme provider client mounts", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false, addListener: jest.fn(), removeListener: jest.fn(),
      })),
    });
  });
  afterEach(() => { cleanup(); jest.restoreAllMocks(); });

  it("restores saved themes and toggles with D without rendering executable scripts", async () => {
    localStorage.setItem("theme", "dark");
    const errors = jest.spyOn(console, "error");
    const view = render(<ThemeProvider><input aria-label="Feedback" /></ThemeProvider>);
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(view.container.querySelector("script")?.type).toBe("application/x-next-themes");
    fireEvent.keyDown(window, { key: "d" });
    await waitFor(() => expect(document.documentElement.classList.contains("light")).toBe(true));
    expect(localStorage.getItem("theme")).toBe("light");
    fireEvent.keyDown(view.getByLabelText("Feedback"), { key: "d" });
    expect(localStorage.getItem("theme")).toBe("light");
    view.unmount();
    render(<ThemeProvider><span>Remounted</span></ThemeProvider>);
    expect(errors.mock.calls.flat().join(" ")).not.toContain("Encountered a script tag");
  });
});
