import { ComponentPropsWithoutRef } from "react";

declare type DivProps = ComponentPropsWithoutRef<"div">;
declare type DivPropsNoChildren = Omit<DivProps, "children">;
declare type InputProps = ComponentPropsWithoutRef<"input">;
declare type SVGProps = ComponentPropsWithoutRef<"svg">;
declare type SVGPropsNoChildren = Omit<SVGProps, "children">;
