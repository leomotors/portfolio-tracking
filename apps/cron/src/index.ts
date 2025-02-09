import { db } from "@repo/database/client";
import { bankAccountTable } from "@repo/database/schema";

const result = await db.select().from(bankAccountTable).execute();

console.log(result);

await db.$client.end();
