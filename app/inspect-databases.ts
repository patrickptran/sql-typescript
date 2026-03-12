#!/usr/bin/env bun
/**
 * Helper script to inspect actual database values
 * Run with: bun run app/inspect-databases.ts
 */

import { open } from "fs/promises";
import { constants } from "fs";

const databases = ["sample.db", "superheroes.db", "companies.db"];

console.log("SQLite Database Information Inspector\n");
console.log("=====================================\n");

for (const dbPath of databases) {
  try {
    const fileHandler = await open(dbPath, constants.O_RDONLY);

    // Read the header (first 256 bytes - SQLite standard header)
    const buffer = new Uint8Array(256);
    await fileHandler.read(buffer, 0, buffer.length, 0);

    const dataView = new DataView(buffer.buffer, 0, buffer.byteLength);

    // SQLite header information
    const pageSize = dataView.getUint16(16);
    const numTables = dataView.getUint32(103); // Offset 103 in the file format

    console.log(`Database: ${dbPath}`);
    console.log(`  Page Size: ${pageSize}`);
    console.log(`  Number of Tables: ${numTables}`);
    console.log();

    await fileHandler.close();
  } catch (error) {
    console.error(`Error reading ${dbPath}:`, error);
  }
}
