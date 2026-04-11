declare type FormError = "User" | "Target" | "Both" | "TooFast";

declare type FormType = {
    displayUser?: string;
    searching: boolean;
    user: string;
    setUser?: (user: string) => void;
    target: string;
    setTarget?: (target: string) => void;
    onSubmit?: () => void | FormError;
};
