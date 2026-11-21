import { createFileRoute } from "@tanstack/react-router";
import { SelfTestPage } from "@/pages/SelfTestPage";

export const Route = createFileRoute("/selftest")({
  head: () => ({
    meta: [
      { title: "Engine self-test — The Cache Line" },
      {
        name: "description",
        content: "Runs the cache simulator in your browser and checks it against the reference results in the spec.",
      },
      { property: "og:title", content: "Engine self-test — The Cache Line" },
      {
        property: "og:description",
        content: "Expected vs actual cycle counts for the cache-line simulator, computed live in the browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SelfTestPage,
});
