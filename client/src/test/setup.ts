import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when the test framework exposes globals.
// Vitest globals are off here, so unmount rendered components explicitly.
afterEach(() => {
  cleanup();
});
