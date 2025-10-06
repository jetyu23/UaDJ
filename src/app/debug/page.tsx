// src/app/debug/page.tsx
import { cookies } from "next/headers";

export default async function Debug() {
  const c = await cookies();
  const access = c.get("sp_access")?.value;
  const refresh = c.get("sp_refresh")?.value;
  return (
    <pre className="p-6">
      {JSON.stringify({ hasAccess: !!access, hasRefresh: !!refresh }, null, 2)}
    </pre>
  );
}
