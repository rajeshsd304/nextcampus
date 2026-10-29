import type { Metadata } from "next";
import { LegalPage } from "@/features/marketing/components/legal-page";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/legal/terms" } };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="2026-10-29"
      intro="These terms govern your use of NextCampus. By creating an account you agree to them."
      sections={[
        {
          heading: "Accounts",
          body: (
            <p>
              You must provide accurate information and keep your credentials secure. You are responsible for
              activity under your account. Notify us immediately if you suspect unauthorized access.
            </p>
          ),
        },
        {
          heading: "Organizations",
          body: (
            <p>
              An organization administrator who creates a workspace accepts these terms on behalf of that
              organization and is responsible for the members they invite and the roles they assign.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: <p>You must follow our Acceptable Use Policy, including its rules on academic integrity.</p>,
        },
        {
          heading: "Content",
          body: (
            <p>
              Organizations retain ownership of the assessments and data they upload. You grant NextCampus the
              limited rights needed to host and process that content to provide the service.
            </p>
          ),
        },
        {
          heading: "Fees",
          body: (
            <p>
              Paid plans are billed as agreed in your order. Free plans may be subject to usage limits and may
              change with reasonable notice.
            </p>
          ),
        },
        {
          heading: "Suspension and termination",
          body: (
            <p>
              We may suspend an account or organization that violates these terms or puts the platform or
              other users at risk. You may stop using the service at any time.
            </p>
          ),
        },
        {
          heading: "Disclaimers and liability",
          body: (
            <p>
              The service is provided &quot;as is&quot; to the extent permitted by law. Our aggregate
              liability is limited to the amounts paid for the service in the twelve months before the claim.
            </p>
          ),
        },
        {
          heading: "Changes",
          body: (
            <p>We will notify administrators of material changes to these terms before they take effect.</p>
          ),
        },
      ]}
    />
  );
}
