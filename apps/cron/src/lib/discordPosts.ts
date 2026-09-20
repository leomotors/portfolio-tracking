import { type DiscordAttachment } from "@/core/discord";

export type DiscordPost = {
  content: string;
  attachments: DiscordAttachment[];
};

function png(filename: string, data: Buffer): DiscordAttachment {
  return { filename, contentType: "image/png", data };
}

/**
 * One image per Discord message so the client shows them full-width instead
 * of a cropped 2×2 grid. Caption rides the first post; run.log the last.
 */
export function buildDailyDiscordPosts(input: {
  caption: string;
  networth: Buffer | null;
  movers: Buffer | null;
  heatmap: Buffer | null;
  log: string;
}): DiscordPost[] {
  const images: DiscordAttachment[] = [];
  if (input.networth) images.push(png("networth.png", input.networth));
  if (input.movers) images.push(png("movers.png", input.movers));
  if (input.heatmap) images.push(png("heatmap.png", input.heatmap));

  const log: DiscordAttachment = {
    filename: "run.log",
    contentType: "text/plain",
    data: input.log,
  };

  if (images.length === 0) {
    return [{ content: input.caption, attachments: [log] }];
  }

  return images.map((image, index) => ({
    content: index === 0 ? input.caption : "",
    attachments: index === images.length - 1 ? [image, log] : [image],
  }));
}
