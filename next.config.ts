import createMDX from "@next/mdx"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
}

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [
      [
        "@shikijs/rehype",
        {
          themes: {
            carbon: "vitesse-black",
            paper: "github-light",
            signal: "synthwave-84",
          },
          defaultColor: false,
        },
      ],
    ],
  },
})

export default withMDX(nextConfig)
