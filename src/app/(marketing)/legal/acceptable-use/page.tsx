import type { Metadata } from "next";
import { LegalPage } from "@/features/marketing/components/legal-page";

export const metadata: Metadata = {
  title: "Acceptable use policy",
  alternates: { canonical: "/legal/acceptable-use" },
};

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable use policy"
      updated="2026-10-29"
      intro="NextCampus exists to make assessments trustworthy. This policy describes conduct that is not allowed."
      sections={[
        {
          heading: "Academic integrity",
          body: (
            <ul>
              <li>
                Do not impersonate another candidate or allow someone else to take an assessment for you.
              </li>
              <li>
                Do not share assessment content, answers or access links outside the permitted audience.
              </li>
              <li>Do not use unauthorized aids during assessments.</li>
            </ul>
          ),
        },
        {
          heading: "Security",
          body: (
            <ul>
              <li>Do not attempt to access data belonging to another person or organization.</li>
              <li>
                Do not probe, scan or test the platform&apos;s vulnerabilities without written permission.
              </li>
              <li>Report suspected vulnerabilities through the contact form using the Security topic.</li>
            </ul>
          ),
        },
        {
          heading: "Platform abuse",
          body: (
            <ul>
              <li>Do not send unsolicited invitations or use the platform to distribute spam.</li>
              <li>
                Do not upload malware or content that is unlawful, hateful or infringes others&apos; rights.
              </li>
            </ul>
          ),
        },
        {
          heading: "Enforcement",
          body: (
            <p>
              Violations may lead to removal of content, suspension of accounts or organizations, and
              reporting to the relevant institution or authorities.
            </p>
          ),
        },
      ]}
    />
  );
}
