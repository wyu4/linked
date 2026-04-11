import { ComponentPropsWithoutRef } from "react";

declare type DivProps = ComponentPropsWithoutRef<"div">;
declare type DivPropsNoChildren = Omit<DivProps, "children">;
declare type InputProps = ComponentPropsWithoutRef<"input">;
