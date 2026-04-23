declare type SearchPhase = "Setup" | "Credentials" | "Validating" | "Searching";

/**
 * Status of an API call in text form.
 */
declare type CredentialStatus = "RateLimited" | "Invalid" | "Ok";

declare type MutualConnection = {
    login: string;
    type: "follower" | "from" | "to";
};

declare type SearchStream = {
    phase: SearchPhase;
    count: number;
    calls: number;
    ok: boolean;
    error?: string;
    credentialStatus?: CredentialStatus;
};

declare type SearchMode = "Shortest" | "Conservative";
