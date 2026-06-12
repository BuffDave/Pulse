import type { MetadataRoute } from "next";
import { APP_URL, LEGAL_LAST_UPDATED } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const legalLastModified = new Date(LEGAL_LAST_UPDATED);

  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${APP_URL}/privacy`,
      lastModified: legalLastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${APP_URL}/terms`,
      lastModified: legalLastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
