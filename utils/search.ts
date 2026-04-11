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

/**
 * Performs Bi-Directional Breadth-First Search (BFS) on the user's follower tree
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
    callback?: (data: SearchStream) => void,
    cache: Map<string, string[]> = new Map<string, string[]>(),
): Promise<MutualConnection[]> {
    let stream: SearchStream = {
        phase: "Setup",
        count: 0,
        calls: 0,
        ok: true,
    };
    callback?.(stream);
    from = from.toLowerCase().trim();
    to = to.toLowerCase().trim();

    const streamError = async (error: string) => {
        stream.ok = false;
        stream.error = error;
        await callback?.(stream);
    };

    if (from.length <= 0) {
        await streamError("user is empty.");
        return [] as MutualConnection[];
    }
    if (to.length <= 0) {
        await streamError("target is empty.");
        return [] as MutualConnection[];
    }

    stream.phase = "Credentials";
    await callback?.(stream);

    const credentialsValidation = await validateCredentials(token);

    stream.credentialStatus = credentialsValidation;
    await callback?.(stream);

    if (credentialsValidation !== "Ok") {
        await streamError(`Credential check failed: ${credentialsValidation}`);
        return [] as MutualConnection[];
    }

    stream.phase = "Validating";
    await callback?.(stream);

    const cacheLookup = (user: string, type: "start" | "end") => {
        return cache.get(type + "/" + user);
    };

    const cacheSet = (user: string, type: "start" | "end", neighbors: string[]) => {
        return cache.set(type + "/" + user, neighbors);
    };

    if (!cacheLookup(from, "start") && !(await validateUsername(token, from))) {
        await streamError("User doesn't exist.");
        return [] as MutualConnection[];
    }

    if (!cacheLookup(to, "end") && !(await validateUsername(token, to))) {
        await streamError("Target doesn't exist.");
        return [] as MutualConnection[];
    }

    if (from === to) {
        return [{ login: to, type: "from" } as MutualConnection];
    }

    stream.phase = "Searching";
    await callback?.(stream);

    const startQueue: MutualConnection[][] = [[{ login: from, type: "from" }]];
    const startVisited = new Map<string, MutualConnection[]>();
    startVisited.set(from, [{ login: from, type: "from" } as MutualConnection]);

    const endQueue: MutualConnection[][] = [[{ login: to, type: "to" }]];
    const endVisited = new Map<string, MutualConnection[]>();

    const reconstruct = (startPath: MutualConnection[], endPath: MutualConnection[], log: boolean = false): MutualConnection[] => {
        if (log) console.log(`Start Path: ${startPath.map((con) => con.login).join(" -> ")}\nEnd Path: ${endPath.map((con) => con.login).join(" -> ")}`);
        return [...startPath, ...[...endPath].reverse().slice(1)];
    };

    const readQueue = async (
        queue: MutualConnection[][],
        currentVisited: Map<string, MutualConnection[]>,
        counterVisited: Map<string, MutualConnection[]>,
        inverted: boolean,
    ): Promise<MutualConnection[] | undefined> => {
        const path = queue.shift()!;
        if (path.length <= 0) return;
        const node = path[path.length - 1];

        const order = path.length;
        if (order > MAX_DEPTH) return;

        const matches: MutualConnection[][] = [];

        const key = inverted ? "end" : "start";
        let neighbors = cacheLookup(node.login, key);
        if (!neighbors) {
            stream.calls++;
            await callback?.(stream);
            neighbors = inverted ? await getFollowing(token, node.login) : await getFollowers(token, node.login);
        }
        cacheSet(node.login, key, neighbors);

        for (const neighbor of neighbors) {
            if (currentVisited.has(neighbor)) continue;

            stream.count = stream.count + 1;
            await callback?.(stream);

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

/**
 * Removes invalid characters in a GitHub username.
 * @param login Initial username
 * @returns Filtered username
 */
export function filterUsername(login: string) {
    return login
        .replace(/[^a-zA-Z0-9-]/g, "")
        .replace(/-{2,}/g, "-")
        .toLowerCase();
}
