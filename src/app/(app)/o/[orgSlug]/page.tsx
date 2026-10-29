import { redirect } from "next/navigation";
import { ROLE_HOME_AREA } from "@/features/access/roles";
import { getOrgContext } from "@/features/organizations/server/context";

export default async function OrganizationIndex({ params }: PageProps<"/o/[orgSlug]">) {
  const { orgSlug } = await params;
  const { membership } = await getOrgContext(orgSlug);
  redirect(`/o/${orgSlug}/${ROLE_HOME_AREA[membership.role]}`);
}
