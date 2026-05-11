import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { environment } from "./environment.ts";

type Sql = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle>;

let pgClientInstance: Sql | undefined;
let dbInstance: Db | undefined;

function getPgClient(): Sql {
  if (!pgClientInstance) pgClientInstance = postgres(environment.DATABASE_URL);
  return pgClientInstance;
}

function getDb(): Db {
  if (!dbInstance) dbInstance = drizzle(getPgClient());
  return dbInstance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});
