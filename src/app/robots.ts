import type { MetadataRoute } from "next";
import { sekolah } from "@/content/sekolah";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${sekolah.urlSitus.replace(/\/$/, "")}/sitemap.xml`,
  };
}
