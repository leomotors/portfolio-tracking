import { describe, expect, it } from "vitest";

import { buildDailyDiscordPosts } from "./discordPosts";

const png = Buffer.from("png");

describe("buildDailyDiscordPosts", () => {
  it("sends each image as its own message, caption first, log last", () => {
    const posts = buildDailyDiscordPosts({
      caption: "## done",
      networth: png,
      movers: png,
      heatmap: png,
      log: "ok",
    });

    expect(posts).toHaveLength(3);
    expect(posts[0]).toMatchObject({
      content: "## done",
      attachments: [{ filename: "networth.png" }],
    });
    expect(posts[1]).toMatchObject({
      content: "",
      attachments: [{ filename: "movers.png" }],
    });
    expect(posts[2]?.content).toBe("");
    expect(posts[2]?.attachments.map((file) => file.filename)).toEqual([
      "heatmap.png",
      "run.log",
    ]);
  });

  it("skips a missing movers image without dropping the others", () => {
    const posts = buildDailyDiscordPosts({
      caption: "## done",
      networth: png,
      movers: null,
      heatmap: png,
      log: "ok",
    });

    expect(posts.map((post) => post.attachments[0]?.filename)).toEqual([
      "networth.png",
      "heatmap.png",
    ]);
    expect(posts[1]?.attachments.map((file) => file.filename)).toEqual([
      "heatmap.png",
      "run.log",
    ]);
  });

  it("still posts caption and log when every image fails", () => {
    const posts = buildDailyDiscordPosts({
      caption: "## done",
      networth: null,
      movers: null,
      heatmap: null,
      log: "ok",
    });

    expect(posts).toEqual([
      {
        content: "## done",
        attachments: [
          { filename: "run.log", contentType: "text/plain", data: "ok" },
        ],
      },
    ]);
  });
});
