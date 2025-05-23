import "dotenv/config";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { drizzle as drizzlePG } from "drizzle-orm/node-postgres";
import * as SQLite from "expo-sqlite";

const expo = SQLite.openDatabaseSync("db.db");

export const dbSqlite = drizzle(expo);
export const dbPostgres = drizzlePG(process.env.DATABASE_URL!);
