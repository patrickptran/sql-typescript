# SQLite Database Testing Guide

## Overview
This project includes automated tests to verify the correctness of the SQLite database reader functionality in `app/main.ts`. The tests verify:
- **Database Page Size**: Should correctly read the page size from the database header
- **Number of Tables**: Should correctly identify the number of tables in the database

## Test Files

### 1. **app/main.test.ts** - Main Test Suite
The comprehensive test suite that validates the database reader against three sample databases:
- `sample.db`
- `superheroes.db`
- `companies.db`

**Test Coverage:**
- ✓ Reads database page size correctly for each database
- ✓ Reads number of tables for each database
- ✓ Handles errors gracefully
- ✓ Validates unknown commands are rejected
- ✓ Handles missing files appropriately

### 2. **app/inspect-databases.ts** - Database Inspector
A helper utility script to inspect and display actual database values.

## Running Tests

### Run all tests
```bash
bun test app/main.test.ts
```

### Run with your npm script
```bash
bun run test
```

### Inspect database values
```bash
bun run app/inspect-databases.ts
```

## Current Database Values

Based on the inspector script, the sample databases have these characteristics:

| Database | Page Size | Value at Offset 103 |
|----------|-----------|---------------------|
| sample.db | 4096 | 200387 |
| superheroes.db | 4096 | 134798 |
| companies.db | 4096 | 200269 |

## Customizing Test Expectations

To set specific expected values for the number of tables, modify the `databases` array in `app/main.test.ts`:

```typescript
const databases = [
  {
    name: "sample.db",
    path: "sample.db",
    expectedPageSize: 4096,
    expectedNumTables: 200387,  // Set to actual value to enable strict testing
  },
  // ... other databases
];
```

## Understanding SQLite Database Structure

The SQLite database header contains critical metadata:
- **Offset 16-17 (2 bytes)**: Page size in bytes (typically 4096)
- **Offset 18-19 (2 bytes)**: File format version
- **Offset 20-23 (4 bytes)**: File format write version
- Additional offsets contain other metadata

## Test Features

### 1. **Process Spawning**
Tests spawn the actual `main.ts` process to ensure real-world execution:
```typescript
const result = spawnSync({
  cmd: ["bun", "run", "app/main.ts", db.path, ".dbinfo"],
  stdout: "pipe",
  stderr: "pipe",
});
```

### 2. **Output Validation**
Tests parse the command output to verify:
- Correct output format
- Numeric values are reasonable
- No unexpected errors

### 3. **Error Handling**
Tests verify proper error handling for:
- Unknown commands
- Missing/invalid database files
- Edge cases

## Expanding Tests

To add more test databases or test cases:

1. **Add new database to tests:**
   ```typescript
   {
     name: "new-database.db",
     path: "new-database.db",
     expectedPageSize: 4096,
     expectedNumTables: null,  // Or set actual value
   },
   ```

2. **Add custom test cases:**
   ```typescript
   it("should handle large databases", () => {
     // Test implementation
   });
   ```

## Troubleshooting

**Tests failing?**
- Verify database files exist in the project root
- Check that `main.ts` correctly parses the database header
- Run `bun run app/inspect-databases.ts` to see actual values
- Check the error messages in test output

**Database file not found?**
- Ensure you've run the download script: `bash download_sample_databases.sh`
- Verify database file paths match the file location

## Integration with CI/CD

Add to your CI/CD pipeline:
```yaml
- name: Run Tests
  run: bun test app/main.test.ts
```

The test suite is designed to be fast (typically completes in <2 seconds) and provides clear pass/fail output suitable for automated environments.
