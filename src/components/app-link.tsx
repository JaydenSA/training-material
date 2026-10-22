"use client";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const path = usePathname();
  const demo = path === "/demo" || path.startsWith("/demo/");
  const target = demo && typeof href === "string" && href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/demo")
    ? `/demo${href}` : href;
  return <NextLink {...props} href={target} />;
}
