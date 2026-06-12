import LegalPage from "@/app/components/LegalPage";
import { APP_NAME, PRIVACY_DESCRIPTION } from "@/lib/site";
import { buildPageMetadata } from "@/lib/seo";
import privacyContent from "../../content/privacy-policy.md";

export const metadata = buildPageMetadata({
  title: `Privacy Policy | ${APP_NAME}`,
  description: PRIVACY_DESCRIPTION,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      content={privacyContent}
      relatedLink={{ href: "/terms", label: "Terms of Service" }}
    />
  );
}
