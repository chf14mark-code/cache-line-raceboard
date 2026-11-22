import { createFileRoute } from "@tanstack/react-router";
import { StoryPage } from "@/pages/StoryPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Cache Line — Why memory order makes code faster" },
      {
        name: "description",
        content:
          "Your CPU never reads one byte. It grabs a whole row. An interactive race that shows why reading memory in order is several times faster.",
      },
      { property: "og:title", content: "The Cache Line — Why memory order makes code faster" },
      {
        property: "og:description",
        content:
          "Your CPU never reads one byte. It grabs a whole row. See why that makes some programs several times faster.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoryPage,
});
