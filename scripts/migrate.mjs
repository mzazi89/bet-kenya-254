import { readFileSync } from "node:fs";
import pg from "pg";
const { Client } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = readFileSync(new URL("../lib/server/schema.sql", import.meta.url), "utf8");
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

await client.connect();
await client.query(sql);
const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name",
);
console.log("tables:", rows.map((r) => r.table_name).join(", "));
await client.end();
