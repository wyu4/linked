export type MutualConnection = {
    login: string;
    type: "follower" | "from" | "to";
};

const MAX_DEPTH = +(process.env.NEXT_PUBLIC_MAX_DEPTH || 5);

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
    if (result.status === 403) {
        console.warn(`Getting followers for ${login} is forbidden.`);
        return [];
    }
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
 * Get the followings of a user
 * @param token Token
 * @param login Username
 * @returns A list of users followed by the user
 */
async function getFollowing(token: string, login: string) {
    const result = await fetchFromGitHub(token, `https://api.github.com/users/${login}/following?per_page=100`);
    if (result.status === 403) {
        console.warn(`Getting following for ${login} is forbidden.`);
        return [];
    }
    if (!result.ok) {
        console.error(`Failed to get following for '${login}' (${result.status}):`, result.statusText);
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
export type CredentialStatus = "RateLimited" | "Invalid" | "Ok";

/**
 * Check if a given token is valid by test-calling a authenticated-only API
 * @param token Token to check
 * @returns Returns a string based on the status code of the test call
 */
export async function validateCredentials(token: string): Promise<CredentialStatus | undefined> {
    const code = (await fetchFromGitHub(token, `https://api.github.com/user`)).status;
    switch (code) {
        case 200:
        case 304:
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

export type SearchPhase = "Setup" | "Credentials" | "Validating" | "Searching";

/**
 * Performs BI-Directional Breadth-First Search (BFS) on the user's follower tree
 * @param token GitHub API Token
 * @param from First user
 * @param to Target user
 * @param callback Function to run providing metadata as the search goes on
 * @param cache Optional pre-existing follower cache
 * @returns A promise containing a path from the user to the target. If no path was found, returns an empty path.
 */
export async function searchConnections(
    token: string,
    from: string,
    to: string,
    callback?: (phase: SearchPhase, count?: number, error?: CredentialStatus | string) => void,
    cache: Map<string, string[]> = new Map<string, string[]>(),
) {
    callback?.("Setup");
    from = from.toLowerCase().trim();
    to = to.toLowerCase().trim();

    if (from.length <= 0) {
        callback?.("Setup", undefined, "'from' is empty.");
        return [];
    }
    if (to.length <= 0) {
        callback?.("Setup", undefined, "'to' is empty.");
        return [];
    }

    const credentialsValidation = await validateCredentials(token);
    if (credentialsValidation !== "Ok") {
        await callback?.("Credentials", undefined, credentialsValidation);
        return [];
    }

    if (!cache.has(from) && !(await validateUsername(token, from))) {
        callback?.("Validating", undefined, "User doesn't exist.");
        return [];
    }

    if (!cache.has(to) && !(await validateUsername(token, to))) {
        callback?.("Validating", undefined, "Target doesn't exist.");
        return [];
    }

    if (from === to) {
        return [{ login: to, type: "from" } as MutualConnection];
    }

    callback?.("Searching");

    const startQueue: MutualConnection[][] = [[{ login: from, type: "from" }]];
    const startVisited = new Map<string, MutualConnection[]>();
    startVisited.set(from, [{ login: from, type: "from" } as MutualConnection]);

    const endQueue: MutualConnection[][] = [[{ login: to, type: "to" }]];
    const endVisited = new Map<string, MutualConnection[]>();

    let count = 0;

    const reconstruct = (startPath: MutualConnection[], endPath: MutualConnection[], log: boolean = false): MutualConnection[] => {
        if (log) console.log(`Start Path: ${startPath.map((con) => con.login).join(" -> ")}\nEnd Path: ${endPath.map((con) => con.login).join(" -> ")}`);
        return [...startPath, ...[...endPath].reverse().slice(1)];
    };

    const readQueue = async (
        queue: MutualConnection[][],
        currentVisited: Map<string, MutualConnection[]>,
        counterVisited: Map<string, MutualConnection[]>,
        inverted: boolean,
    ) => {
        const path = queue.shift()!;
        if (path.length <= 0) return;
        const node = path[path.length - 1];

        const order = path.length;
        if (order > MAX_DEPTH) return;

        const matches: MutualConnection[][] = [];

        const key = (inverted ? "end/" : "start/") + node.login;
        const neighbors = cache.get(key) ?? (inverted ? await getFollowing(token, node.login) : await getFollowers(token, node.login));
        cache.set(key, neighbors);

        for (const neighbor of neighbors) {
            if (currentVisited.has(neighbor)) continue;

            count++;

            callback?.("Searching", count);

            const newPath: MutualConnection[] = [...path, { login: neighbor, type: "follower" }];
            currentVisited.set(neighbor, newPath);

            if (counterVisited.has(neighbor)) {
                matches.push(inverted ? reconstruct(counterVisited.get(neighbor)!, newPath) : reconstruct(newPath, counterVisited.get(neighbor)!));
            } else {
                queue.push(newPath);
            }
        }

        if (matches.length > 0) {
            return matches.reduce((current, next) => (current.length <= next.length ? current : next));
        }

        return undefined;
    };

    while (startQueue.length > 0 && endQueue.length > 0) {
        let result = await readQueue(startQueue, startVisited, endVisited, false);
        if (result) return result;

        result = await readQueue(endQueue, endVisited, startVisited, true);
        if (result) return result;
    }

    return [];
}
