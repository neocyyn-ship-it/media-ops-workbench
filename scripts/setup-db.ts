import { ensureDatabase, resetDatabase } from "../src/lib/database";

const shouldReset = process.argv.includes("--reset");
const dbPath = shouldReset ? resetDatabase() : ensureDatabase();

console.log(`Database ready at ${dbPath}`);
