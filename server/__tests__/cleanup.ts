import { afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { db } from "../db.js";
afterAll(() => {
  // Only remove the automatically allocated test store, never user-configured data.
  const target = path.resolve(db.directory);
  if (
    process.env.NODE_ENV === "test" &&
    !process.env.VYAPAR_DATA_DIR &&
    path.dirname(target) === path.resolve(os.tmpdir()) &&
    path.basename(target).startsWith("vyapar-test-")
  )
    fs.rmSync(target, { recursive: true, force: true });
});
