
import { MDXRemote } from "next-mdx-remote/rsc";
import { ProsCons } from "@/components/ProsCons";
import { BuyBox } from "@/components/BuyBox";
import { AuthorBox } from "@/components/AuthorBox";

const components = { ProsCons, BuyBox, AuthorBox } as const;

export function MDX({ source }: { source: string }) {
  return <MDXRemote source={source} components={components as any} />;
}
