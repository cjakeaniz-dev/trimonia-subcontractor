import { redirect } from "next/navigation";
import { ActionForm } from "@/components/forms";
import { Theme } from "@/components/shell";
import { currentActor } from "@/lib/session";

export default async function Login() {
  if (await currentActor()) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center p-5">
    <div className="panel grid w-full max-w-md gap-6">
      <div className="flex justify-between gap-3"><span className="chip">Trimonia</span><Theme/></div>
      <div><h1>Sign in</h1><p className="muted mt-2">Construction budget monitoring</p></div>
      <ActionForm operation="login" label="Sign in">
        <label className="field">Email<input name="email" type="email" required autoComplete="username" maxLength={254}/></label>
        <label className="field">Password<input name="password" type="password" required autoComplete="current-password" maxLength={72}/></label>
      </ActionForm>
    </div>
  </main>;
}
