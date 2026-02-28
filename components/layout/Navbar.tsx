import { getSession } from "@/lib/auth/cognito";
import { NavbarClient } from "./NavbarClient";

export async function Navbar() {
  const user = await getSession();

  return (
    <NavbarClient
      user={user ? { name: user.name, email: user.email } : null}
    />
  );
}
