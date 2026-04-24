const MAX_DEPTH = +(process.env.NEXT_PUBLIC_MAX_DEPTH || 5);
const CHUNK_JUMP = 20;

/**
 * Function that auto-extracts the rate-limit data of a response from GitHub.
 * @param response GitHub API response
 * @returns Array with data in the following order: remaining available requests, total available requests, and reset window (UTC seconds)
 */
function processRateLimitData(response: Response, stream?: SearchStream) {
    if (!stream) return;
    const headers = response.headers;
    stream.requestsLeft = headers.get("x-ratelimit-remaining") ?? "?";
    stream.totalRequests = headers.get("x-ratelimit-limit") ?? "?";
    stream.rateLimitWindow = +(headers.get("x-ratelimit-reset") ?? 0);
}

/**
 * Send a GET-request to GitHub's REST API
 * @param token Token
 * @param api API endpoint
 * @returns Promise for the fetch request
 */
async function fetchFromGitHub(token: string, api: string, stream?: SearchStream) {
    const response = await fetch(api, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    processRateLimitData(response, stream);

    return response;
}

/**
 * Get the followers of a user
 * @param token Token
 * @param login Username
 * @returns A list of users following the user
 */
async function getFollowers(token: string, login: string, stream?: SearchStream): Promise<string[]> {
    const result = await fetchFromGitHub(token, `https://api.github.com/users/${login}/followers?per_page=100`, stream);

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
async function getFollowing(token: string, login: string, stream?: SearchStream): Promise<string[]> {
    const result = await fetchFromGitHub(token, `https://api.github.com/users/${login}/following?per_page=100`, stream);
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
export async function validateCredentials(token: string, stream?: SearchStream): Promise<CredentialStatus | undefined> {
    const code = (await fetchFromGitHub(token, `https://api.github.com/user`, stream)).status;
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
export async function validateUsername(token: string, login: string, stream?: SearchStream) {
    return (await fetchFromGitHub(token, `https://api.github.com/users/${login}`, stream)).status !== 404;
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
    mode: SearchMode = "Shortest",
): Promise<MutualConnection[]> {
    let stream: SearchStream = {
        phase: "Setup",
        count: 0,
        calls: 0,
        ok: true,
    };
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

    const credentialsValidation = await validateCredentials(token, stream);

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

    if (!cacheLookup(from, "start") && !(await validateUsername(token, from, stream))) {
        await streamError("User doesn't exist.");
        return [] as MutualConnection[];
    }

    if (!cacheLookup(to, "end") && !(await validateUsername(token, to, stream))) {
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
        const key = inverted ? "end" : "start";
        const levelSize = Math.min(queue.length, mode === "Shortest" ? queue.length : 1);
        let shortestMatch: MutualConnection[] | undefined = undefined;

        const updateShortest = (path: MutualConnection[]) => {
            if (shortestMatch === undefined || shortestMatch.length > path.length) {
                shortestMatch = path;
                console.log(`New shortest [${shortestMatch.length}]:\n${shortestMatch.map((data) => data.login).join(" => ")}`);
            }
        };

        const getNeighbors = async (login: string) => {
            let neighbors = cacheLookup(login, key);
            if (!neighbors) {
                stream.calls++;
                neighbors = inverted ? await getFollowing(token, login, stream) : await getFollowers(token, login, stream);
                if (neighbors) {
                    cacheSet(login, key, neighbors);
                }
                await callback?.(stream);
            }
            return neighbors;
        };

        const levelPaths: MutualConnection[][] = [];
        for (let i = 0; i < levelSize; i++) {
            const path = queue.shift()!;
            if (path.length <= 0 || path.length > MAX_DEPTH) continue;
            levelPaths.push(path);
        }

        let lastI = 0;
        let chunkStart = 0;
        let levelNeighbors: string[][] = [];
        do {
            chunkStart += CHUNK_JUMP;
            const chunk = levelPaths.slice(lastI, chunkStart);
            const fetchedChunk = await Promise.all(chunk.map((path) => getNeighbors(path[path.length - 1].login)));
            levelNeighbors = levelNeighbors.concat(fetchedChunk);
            lastI = chunkStart + 1;
            await callback?.(stream);
        } while (chunkStart < levelPaths.length);

        for (let i = 0; i < levelPaths.length; i++) {
            const path = levelPaths[i];
            const neighbors = levelNeighbors[i];

            for (const neighbor of neighbors ?? []) {
                if (currentVisited.has(neighbor)) continue;
                stream.count++;
                const newPath: MutualConnection[] = [...path, { login: neighbor, type: "follower" }];
                currentVisited.set(neighbor, newPath);

                if (counterVisited.has(neighbor)) {
                    updateShortest(inverted ? reconstruct(counterVisited.get(neighbor)!, newPath) : reconstruct(newPath, counterVisited.get(neighbor)!));
                } else if (newPath.length <= MAX_DEPTH) {
                    queue.push(newPath);
                }
            }
            await callback?.(stream);
        }

        return shortestMatch;
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
