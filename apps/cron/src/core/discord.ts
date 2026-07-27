import { environment } from "./environment";
import { logger } from "./logger";

export type DiscordAttachment = {
  filename: string;
  contentType: string;
  data: string | Buffer | Uint8Array;
};

/**
 * Posts a Discord webhook message with optional file attachments via multipart
 * form data (`payload_json` + `files[n]`).
 */
export async function sendMessage(
  content: string,
  attachments: DiscordAttachment[] = [],
) {
  const formData = new FormData();
  formData.append(
    "payload_json",
    JSON.stringify({
      content,
      attachments: attachments.map((file, id) => ({
        id,
        filename: file.filename,
      })),
    }),
  );

  for (const [index, file] of attachments.entries()) {
    const bytes =
      typeof file.data === "string" ? file.data : new Uint8Array(file.data);
    formData.append(
      `files[${index}]`,
      new Blob([bytes], { type: file.contentType }),
      file.filename,
    );
  }

  const res = await fetch(environment.DISCORD_WEBHOOK_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    logger.error(`Discord API Failed ${res.status} ${res.statusText}`);
    logger.error(await res.text().catch());
  }
}
