import { describe, it, expect } from "bun:test";
import { spawnSync } from "bun";
import { join } from "path";

// Database test configurations
const databases = [
  {
    name: "sample.db",
    path: "sample.db",
    expectedPageSize: 4096,
    expectedNumTables: null, // Will be determined by actual data
  },
  {
    name: "superheroes.db",
    path: "superheroes.db",
    expectedPageSize: 4096,
    expectedNumTables: null,
  },
  {
    name: "companies.db",
    path: "companies.db",
    expectedPageSize: 4096,
    expectedNumTables: null,
  },
];

describe("SQLite Database Reader - main.ts", () => {
  databases.forEach((db) => {
    describe(`Testing ${db.name}`, () => {
      it("should read database page size correctly", () => {
        const result = spawnSync({
          cmd: ["bun", "run", "app/main.ts", db.path, ".dbinfo"],
          stdout: "pipe",
          stderr: "pipe",
          cwd: process.cwd(),
        });

        const output = new TextDecoder().decode(result.stdout);

        // Verify page size output exists and matches expected
        expect(output).toContain("database page size:");

        const pageSizeMatch = output.match(/database page size: (\d+)/);
        expect(pageSizeMatch).not.toBeNull();

        if (pageSizeMatch) {
          const pageSize = parseInt(pageSizeMatch[1], 10);
          expect(pageSize).toBe(db.expectedPageSize);
        }
      });

      it("should read number of tables", () => {
        const result = spawnSync({
          cmd: ["bun", "run", "app/main.ts", db.path, ".dbinfo"],
          stdout: "pipe",
          stderr: "pipe",
          cwd: process.cwd(),
        });

        const output = new TextDecoder().decode(result.stdout);

        // Verify number of tables output exists
        expect(output).toContain("number of tables:");

        const numTablesMatch = output.match(/number of tables: (\d+)/);
        expect(numTablesMatch).not.toBeNull();

        if (numTablesMatch) {
          const numTables = parseInt(numTablesMatch[1], 10);
          expect(typeof numTables).toBe("number");
          expect(numTables).toBeGreaterThanOrEqual(0);

          // If expected value is set, verify it
          if (db.expectedNumTables !== null) {
            expect(numTables).toBe(db.expectedNumTables);
          }
        }
      });

      it("should not throw an error when processing the database", () => {
        const result = spawnSync({
          cmd: ["bun", "run", "app/main.ts", db.path, ".dbinfo"],
          stdout: "pipe",
          stderr: "pipe",
          cwd: process.cwd(),
        });

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
      });
    });
  });

  it("should throw an error for unknown command", () => {
    const result = spawnSync({
      cmd: ["bun", "run", "app/main.ts", "sample.db", ".unknown"],
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    expect(result.success).toBe(false);
  });

  it("should handle missing database file gracefully", () => {
    const result = spawnSync({
      cmd: ["bun", "run", "app/main.ts", "nonexistent.db", ".dbinfo"],
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    expect(result.success).toBe(false);
  });
});
