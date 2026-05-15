import { AuthForm } from "@/components/auth/auth-form";
import { loginAction } from "@/server/actions/auth.actions";

export default function LoginPage() {
  return <AuthForm mode="login" action={loginAction} />;
}
