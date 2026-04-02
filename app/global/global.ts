import { Session } from "next-auth";
import { SignInOptions, SignOutParams } from "next-auth/react";
import { ComponentPropsWithoutRef } from "react";

export type DivProps = ComponentPropsWithoutRef<"div">;
export type DivPropsNoChildren = Omit<DivProps, "children">;

export type AuthHandlerType = {
    GET: (req: Request) => Promise<Response>;
    POST: (req: Request) => Promise<Response>;
};
export type AuthType = (req?: Request) => Promise<Session | null>;
export type AuthSignInType = (provider?: string, options?: SignInOptions) => Promise<void>;
export type AuthSignOutType = (options?: SignOutParams) => Promise<void>;
