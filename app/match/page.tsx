import LoginWidget from "./elements/login";

export default function MatchPage() {
    return <LoginPage />;
}

function LoginPage() {
    return (
        <div className="absolute flex flex-col justify-center items-center bg-background min-h-full min-w-full">
            <LoginWidget className="" />
        </div>
    );
}
