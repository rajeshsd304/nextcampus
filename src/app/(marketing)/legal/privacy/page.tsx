import type { Metadata } from "next";
import { LegalPage } from "@/features/marketing/components/legal-page";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/legal/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="2026-10-29"
      intro="This policy explains what personal data NextCampus processes, why, and the choices you have."
      sections={[
        {
          heading: "Who we are",
          body: (
            <p>
              NextCampus provides an online assessment platform to educational and training organizations. For
              data an organization manages about its members, that organization is the controller and
              NextCampus acts as its processor. For account data we collect directly, NextCampus is the
              controller.
            </p>
          ),
        },
        {
          heading: "Data we collect",
          body: (
            <ul>
              <li>
                Account data: name, display name, email address, profile photo from your sign-in provider,
                time zone.
              </li>
              <li>
                Membership data: the organizations you belong to, your role, and invitations sent to you.
              </li>
              <li>
                Security data: sign-in events, password changes and administrative actions recorded in audit
                logs.
              </li>
              <li>Messages you send us through the contact form.</li>
            </ul>
          ),
        },
        {
          heading: "How we use data",
          body: (
            <ul>
              <li>To authenticate you and enforce the access your organization grants.</li>
              <li>To send transactional emails such as verification, password reset and invitations.</li>
              <li>To keep the platform secure, investigate abuse and meet legal obligations.</li>
              <li>To send product updates, only if you opt in from your account settings.</li>
            </ul>
          ),
        },
        {
          heading: "Sharing",
          body: (
            <p>
              We do not sell personal data. We share data with infrastructure providers that host the service
              (database, authentication, email delivery) under contracts that require them to protect it, and
              with your organization as needed to provide the service.
            </p>
          ),
        },
        {
          heading: "Retention",
          body: (
            <p>
              Account data is kept while your account is active. Audit logs are retained to protect the
              integrity of assessments and may be kept after membership ends, as required by your
              organization.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              You can access and correct your profile in account settings, and you can request export or
              deletion of your data by contacting{" "}
              <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>. Requests about data
              your organization controls may be forwarded to that organization.
            </p>
          ),
        },
        {
          heading: "Security",
          body: (
            <p>
              Data is encrypted in transit, access is limited by role, and every organization&apos;s data is
              isolated by database-level row security policies.
            </p>
          ),
        },
      ]}
    />
  );
}
