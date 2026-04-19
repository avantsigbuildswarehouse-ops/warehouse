import { redirect } from "next/navigation";
import { getUserRole } from "./get-user-role";

export async function requireRole(roles: string[]) {
  const role = await getUserRole();

  if (!role || !roles.includes(role)) {
    redirect("/dashboard");
  }

  return role;
}
