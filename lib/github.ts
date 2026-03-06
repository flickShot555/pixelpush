type GitHubContributionDay = {
  date: string;
  contributionCount: number;
  color: string;
};

type GitHubWeek = {
  contributionDays: GitHubContributionDay[];
};

export type GitHubContributionCalendar = {
  weeks: GitHubWeek[];
};

const CONTRIBUTION_CALENDAR_QUERY = `
  query ContributionCalendar($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
`;

function oneYearRange(): { from: string; to: string } {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setUTCFullYear(fromDate.getUTCFullYear() - 1);
  return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

export async function fetchContributionCalendar(options: {
  accessToken: string;
  from?: string;
  to?: string;
}): Promise<GitHubContributionCalendar> {
  const { from, to } = options.from && options.to ? { from: options.from, to: options.to } : oneYearRange();

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      query: CONTRIBUTION_CALENDAR_QUERY,
      variables: { from, to },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GitHub GraphQL error: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`);
  }

  const json = (await response.json()) as {
    data?: {
      viewer?: {
        contributionsCollection?: {
          contributionCalendar?: GitHubContributionCalendar;
        };
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  const calendar = json.data?.viewer?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error("GitHub response missing contributionCalendar");
  }

  return calendar;
}
