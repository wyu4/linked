export type MutualConnection = {
    login: string;
    type: "follower" | "from" | "to";
};

const MAX_DEPTH = +(process.env.NEXT_PUBLIC_MAX_DEPTH || 6);

/**
 * Send a GET-request to GitHub's REST API
 * @param token Token
 * @param api API endpoint
 * @returns Promise for the fetch request
 */
export async function fetchFromGitHub(token: string, api: string) {
    return fetch(api, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Get the followers of a user
 * @param token Token
 * @param login Username
 * @returns A list of users following the user
 */
async function getFollowers(token: string, login: string) {
    const result = await fetchFromGitHub(token, `https://api.github.com/users/${login}/followers?per_page=100`);
    if (!result.ok) {
        console.error(`Failed to get followers for '${login}' (${result.status}):`, result.statusText);
        return [];
    }
    const data = (await result.json()) as {
        login: string | undefined;
    }[];
    return data.map((data) => data.login?.toLowerCase()).filter((data) => data !== undefined);
}

/**
 * Status of an API call in text form.
 */
type CredentialStatus = "RateLimited" | "Invalid" | "Ok";

/**
 * Check if a given token is valid by test-calling a authenticated-only API
 * @param token Token to check
 * @returns Returns a string based on the status code of the test call
 */
export async function validateCredentials(token: string): Promise<CredentialStatus | undefined> {
    const code = (await fetchFromGitHub(token, `https://api.github.com/user`)).status;
    switch (code) {
        case 200:
            return "Ok";
        case 401:
            return "Invalid";
        case 429:
            return "RateLimited";
        default:
            return undefined;
    }
}

/**
 * Check if a user exists
 * @param token Token
 * @param login Username
 * @returns `true` if user exists, `false` otherwise
 */
export async function validateUsername(token: string, login: string) {
    return (await fetchFromGitHub(token, `https://api.github.com/users/${login}`)).status !== 404;
}

export type SearchPhase = "Validating" | "Searching";

/**
 * Performs Breadth-First Search (BFS) on the user's follower tree
 * @param token GitHub API Token
 * @param from First user
 * @param to Target user
 * @param callback Function to run providing metadata as the search goes on
 * @param cache Optional pre-existing follower cache
 * @returns A promise containing a path from the user to the target. If no path was found, returns an empty path.
 */
export async function breadthFirstSearchConnections(
    token: string,
    from: string,
    to: string,
    callback?: (phase: SearchPhase, count?: number, error?: CredentialStatus | string) => void,
    cache: Map<string, string[]> = new Map<string, string[]>(),
) {
    callback?.("Validating");
    from = from.toLowerCase();
    to = to.toLowerCase();

    const credentialsValidation = await validateCredentials(token);
    if (credentialsValidation !== "Ok") {
        callback?.("Validating", undefined, credentialsValidation);
        return [];
    }

    if (!(await validateUsername(token, from))) {
        callback?.("Validating", undefined, "User doesn't exist.");
        return [];
    }

    if (!(await validateUsername(token, to))) {
        callback?.("Validating", undefined, "Target doesn't exist.");
        return [];
    }

    if (from === to) {
        return [{ login: to, type: "from" } as MutualConnection];
    }

    callback?.("Searching");
    const visited: string[] = [from];
    const queue: MutualConnection[][] = [[{ login: from, type: "from" }]];
    let count = 0;

    while (queue.length > 0) {
        const path = queue.shift()!;
        if (path.length <= 0) continue;
        const node = path[path.length - 1];

        const order = path.length;
        if (order >= MAX_DEPTH) continue;

        const neighbors = cache.get(node.login) || (await getFollowers(token, node.login));
        cache.set(node.login, neighbors);

        for (const neighbor of neighbors) {
            if (visited.includes(neighbor)) {
                continue;
            }
            count += 1;
            callback?.("Searching", count);
            visited.push(neighbor);

            const found = neighbor === to;
            const newPath: MutualConnection[] = [...path, { login: neighbor, type: found ? "to" : "follower" }];
            if (found) return newPath;

            queue.push(newPath);
        }
    }

    return [];
}
