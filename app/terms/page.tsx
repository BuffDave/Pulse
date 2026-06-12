import LegalPage from "@/app/components/LegalPage";
import { APP_NAME, TERMS_DESCRIPTION } from "@/lib/site";
import { buildPageMetadata } from "@/lib/seo";
import termsContent from "../../content/terms-of-service.md";

export const metadata = buildPageMetadata({
  title: `Terms of Service | ${APP_NAME}`,
  description: TERMS_DESCRIPTION,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      content={termsContent}
      relatedLink={{ href: "/privacy", label: "Privacy Policy" }}
    />
  );
}
