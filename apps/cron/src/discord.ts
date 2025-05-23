import { environment } from "./environment";
import { logger } from "./logger";

export async function sendMessage(
  content: string,
  longText: string,
  fileName = "run.log",
) {
  const formData = new FormData();
  formData.append("content", content);
  formData.append(
    "files",
    new Blob([longText], { type: "text/plain" }),
    fileName,
  );

  const res = await fetch(environment.DISCORD_WEBHOOK_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    logger.error(`Discord API Failed ${res.status} ${res.statusText}`);
    logger.error(await res.text().catch());
  }
}
