import { open } from "fs/promises";
import { constants } from "fs";

const args = process.argv;
const databaseFilePath: string = args[2];
const command: string = args[3];

/*
A variable-length integer or "varint" is a static Huffman encoding of 64-bit twos-complement integers that uses less space for small positive values. A varint is between 1 and 9
 bytes in length. The varint consists of either zero or more bytes which have the high-order bit set followed by a single byte with the high-order bit clear, or nine bytes, 
 whichever is shorter. The lower seven bits of each of the first eight bytes and all 8 bits of the ninth byte are used to reconstruct the 64-bit twos-complement integer. Varints
 are big-endian: bits taken from the earlier byte of the varint are more significant than bits taken from the later bytes.

 Explain for readVarint from https://www.sqlite.org/fileformat.html#b_tree_pages
*/
const readVarint = (buffer: Uint8Array, offset: number): [number, number] => {
  let value = 0,
    bytesRead = 0;
  for (let i = 0; i < 9; i++) {
    const byte = buffer[offset + i];
    bytesRead++;
    if (i === 8) {
      value = (value << 8) | byte;
      break;
    } else {
      value = (value << 7) | (byte & 0x7f);

      if ((byte & 0x80) === 0) break;
    }
  }
  return [value, bytesRead];
};
const getSerialTypeSize = (serialType: number): number => {
  if (serialType === 0) return 0;
  if (serialType === 1) return 1;
  if (serialType === 2) return 2;
  if (serialType === 3) return 3;
  if (serialType === 4) return 4;
  if (serialType === 5) return 6;
  if (serialType === 6) return 8;
  if (serialType === 7) return 8;
  if (serialType === 8) return 0;
  if (serialType === 9) return 0;
  if (serialType === 10 || serialType === 11) return 0;
  if (serialType >= 12 && serialType % 2 === 0) {
    // BLOB
    return (serialType - 12) / 2;
  }
  if (serialType >= 13 && serialType % 2 === 1) {
    // TEXT
    return (serialType - 13) / 2;
  }
  return 0;
};

const DATABASE_HEADER_SIZE = 100;
const PAGE_SIZE_OFFSET = 16;
const PAGE_HEADER_SIZE = 8;
const CELLS_COUNT_OFFSET = 3;

if (command === ".dbinfo") {
  const databaseFileHandler = await open(databaseFilePath, constants.O_RDONLY);
  const buffer: Uint8Array = new Uint8Array(DATABASE_HEADER_SIZE);
  await databaseFileHandler.read(buffer, 0, buffer.length, 0);

  // You can use print statements as follows for debugging, they'll be visible when running tests.
  console.error("Logs from your program will appear here!");

  // TODO: Uncomment the code below to pass the first stage
  const pageSize = new DataView(buffer.buffer, 0, buffer.byteLength).getUint16(
    PAGE_SIZE_OFFSET,
  );
  console.log(`database page size: ${pageSize}`);

  const pageHeaderBuffer = new Uint8Array(PAGE_HEADER_SIZE);
  await databaseFileHandler.read(
    pageHeaderBuffer,
    0,
    pageHeaderBuffer.length,
    DATABASE_HEADER_SIZE,
  );
  const numberOfTables = new DataView(
    pageHeaderBuffer.buffer,
    0,
    pageHeaderBuffer.byteLength,
  ).getUint16(CELLS_COUNT_OFFSET);
  console.log(`number of tables: ${numberOfTables}`);

  await databaseFileHandler.close();
} else if (command === ".tables") {
  const databaseFileHandler = await open(databaseFilePath, constants.O_RDONLY);

  // Read page header (8 bytes for leaf page, starting at offset 100)
  const pageHeaderBuffer = new Uint8Array(8);
  await databaseFileHandler.read(
    pageHeaderBuffer,
    0,
    pageHeaderBuffer.byteLength,
    100,
  );
  const pageHeaderView = new DataView(pageHeaderBuffer.buffer);
  const numberOfCells = pageHeaderView.getUint16(3);

  // Read cell pointer array (starts at offset 108, 2 bytes per cell)
  const cellPointerArraySize = numberOfCells * 2;
  const cellPointerArrayBuffer = new Uint8Array(cellPointerArraySize);
  await databaseFileHandler.read(
    cellPointerArrayBuffer,
    0,
    cellPointerArraySize,
    108,
  );
  const cellPointerArrayView = new DataView(cellPointerArrayBuffer.buffer);

  const tables = [];
  for (let i = 0; i < numberOfCells; i++) {
    const cellOffset = cellPointerArrayView.getUint16(i * 2);

    const cellBuffer = new Uint8Array(1000);
    await databaseFileHandler.read(
      cellBuffer,
      0,
      cellBuffer.buffer,
      cellOffset,
    );

    let offset = 0;
    const [recordSize, recordSizeBytes] = readVarint(cellBuffer, offset);
    offset += recordSizeBytes;

    const [recordIdSize, recordIdSizeBytes] = readVarint(cellBuffer, offset);
    offset += recordIdSizeBytes;

    const [headerSize, headerSizeBytes] = readVarint(cellBuffer, offset);
    offset += headerSizeBytes;
    // Read serial types for columns
    const serialTypes: number[] = [];
    let headerStart = offset - headerSizeBytes;
    while (offset - headerStart < headerSize) {
      const [serialType, serialtypeBytes] = readVarint(cellBuffer, offset);

      serialTypes.push(serialType);
      offset += serialtypeBytes;
    }

    const typeSize = getSerialTypeSize(serialTypes[0]);
    offset += typeSize;

    const nameSize = getSerialTypeSize(serialTypes[1]);
    offset += nameSize;

    const tableSize = getSerialTypeSize(serialTypes[2]);
    const tableName = new TextDecoder().decode(
      cellBuffer.slice(offset, offset + tableSize),
    );
    tables.push(tableName);
  }
  console.log(tables.join(" "));
  await databaseFileHandler.close();
} else {
  throw new Error(`Unknown command ${command}`);
}
