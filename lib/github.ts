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

export type GitHubUserSummary = {
  login: string;
  avatarUrl: string;
  createdAt: string;
  contributionCalendar: GitHubContributionCalendar;
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

const USER_SUMMARY_QUERY = `
  query UserSummary($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      login
      avatarUrl
      createdAt
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

export async function fetchUserSummary(options: {
  accessToken: string;
  login: string;
  from?: string;
  to?: string;
}): Promise<GitHubUserSummary> {
  const { from, to } = options.from && options.to ? { from: options.from, to: options.to } : oneYearRange();

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      query: USER_SUMMARY_QUERY,
      variables: { login: options.login, from, to },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GitHub GraphQL error: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`);
  }

  const json = (await response.json()) as {
    data?: {
      user?: {
        login?: string;
        avatarUrl?: string;
        createdAt?: string;
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

  const user = json.data?.user;
  const calendar = user?.contributionsCollection?.contributionCalendar;
  if (!user?.login || !user.avatarUrl || !user.createdAt || !calendar) {
    throw new Error("GitHub response missing user summary data");
  }

  return {
    login: user.login,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    contributionCalendar: calendar,
  };
}
