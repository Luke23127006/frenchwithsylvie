import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function config(phase) {
  if (phase !== PHASE_DEVELOPMENT_SERVER) {
    throw new Error("UI preview is local-only. Run npm run dev from ui-preview.");
  }

  return {};
}
