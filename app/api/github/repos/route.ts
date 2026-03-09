import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const REPOS_LANGUAGES_QUERY = `
  query ReposLanguages {
    viewer {
      repositories(
        first: 50
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          name
          primaryLanguage {
            name
          }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
              }
            }
          }
        }
      }
    }
  }
`;

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session || !accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: REPOS_LANGUAGES_QUERY }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `GitHub GraphQL error: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`
      );
    }

    const json = (await response.json()) as {
      data?: {
        viewer?: {
          repositories?: {
            nodes?: Array<{
              name?: string;
              primaryLanguage?: { name?: string } | null;
              languages?: {
                edges?: Array<{ size?: number; node?: { name?: string } | null }>;
              } | null;
            }>;
          };
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }

    const nodes = json.data?.viewer?.repositories?.nodes ?? [];

    const repos = nodes
      .map((r) => (r?.name ?? "").trim())
      .filter(Boolean)
      .slice(0, 5);

    const totals = new Map<string, number>();

    for (const repo of nodes) {
      const edges = repo?.languages?.edges ?? [];
      for (const edge of edges) {
        const lang = (edge?.node?.name ?? "").trim();
        if (!lang) continue;
        const size = typeof edge?.size === "number" && Number.isFinite(edge.size) ? edge.size : 0;
        totals.set(lang, (totals.get(lang) ?? 0) + size);
      }

      const primary = (repo?.primaryLanguage?.name ?? "").trim();
      if (primary && (totals.get(primary) ?? 0) === 0) {
        totals.set(primary, 1);
      }
    }

    const languages = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 3);

    return Response.json({ languages, repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
