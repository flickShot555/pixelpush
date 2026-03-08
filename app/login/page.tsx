import { LoginClient } from "./LoginClient";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = await searchParams;
  const raw = sp?.identifier;
  const initialIdentifier = typeof raw === "string" ? raw : "";

  return <LoginClient initialIdentifier={initialIdentifier} />;
}
