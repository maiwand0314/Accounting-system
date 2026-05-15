import { AuthForm } from "@/components/auth/auth-form";
import { registerAction } from "@/server/actions/auth.actions";

export default function RegisterPage() {
  return <AuthForm mode="register" action={registerAction} />;
}
