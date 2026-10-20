import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { DatabaseSchema } from "./schema.js";
import { BusinessEngine } from "./engine.js";
function fail(message: string): never { throw new Error(message); }
export class DatabaseManager extends BusinessEngine {
  readonly directory: string;
  private file: string;
  constructor(defaults: DatabaseSchema, directory?: string) {
    super(defaults);
    const here = path.dirname(fileURLToPath(import.meta.url));
    const root =
      path.basename(path.dirname(here)) === "dist"
        ? path.resolve(here, "../..")
        : path.resolve(here, "..");
    this.directory =
      directory ||
      process.env.VYAPAR_DATA_DIR ||
      (process.env.NODE_ENV === "test"
        ? fs.mkdtempSync(path.join(os.tmpdir(), "vyapar-test-"))
        : path.join(root, "data"));
    this.file = path.join(this.directory, "vyapar_db.json");
    fs.mkdirSync(this.directory, { recursive: true });
    if (fs.existsSync(this.file)) {
      // Never overwrite an unreadable existing database with demo data.
      this.db = this.validateBackup(
        JSON.parse(fs.readFileSync(this.file, "utf8")),
      );
    } else {
      this.db = structuredClone(defaults);
      this.save();
    }
  }
  private save() {
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try {
      const fd = fs.openSync(temp, "wx");
      try {
        fs.writeFileSync(fd, JSON.stringify(this.db, null, 2));
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(temp, this.file);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }
  protected override commit<T>(change: () => T, preservePrevious = false): T {
    // A single store may be opened by dev and production processes. Serialize
    // writers and reload the last committed snapshot before applying a change.
    const lock = `${this.file}.lock`;
    let handle: number;
    try {
      handle = fs.openSync(lock, "wx");
    } catch {
      try {
        const owner = Number(fs.readFileSync(lock, "utf8"));
        if (!Number.isInteger(owner) || owner <= 0)
          fail("Database lock is invalid; check the server process.");
        try {
          process.kill(owner, 0);
          fail("Database is busy. Retry after the other operation finishes.");
        } catch (error: any) {
          if (error.code !== "ESRCH") throw error;
        }
        fs.unlinkSync(lock);
        handle = fs.openSync(lock, "wx");
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Database is busy",
        );
      }
    }
    let before = structuredClone(this.db);
    try {
      fs.writeFileSync(handle, String(process.pid));
      this.db = this.validateBackup(
        JSON.parse(fs.readFileSync(this.file, "utf8")),
      );
      before = structuredClone(this.db);
      if (preservePrevious) fs.copyFileSync(this.file, `${this.file}.before-restore-${Date.now()}.bak`);
      const result = change();
      this.save();
      return structuredClone(result);
    } catch (error) {
      this.db = before;
      throw error;
    } finally {
      fs.closeSync(handle);
      fs.unlinkSync(lock);
    }
  }
}
