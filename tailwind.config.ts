import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pretendard: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          'Roboto',
          "'Helvetica Neue'",
          'Arial',
          "'Apple SD Gothic Neo'",
          "'Noto Sans KR'",
          "'Malgun Gothic'",
          'sans-serif',
        ],
      },
      colors: {
        positive: "var(--color-positive)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        orange: {
          1: "var(--color-orange-1)",
          2: "var(--color-orange-2)",
          3: "var(--color-orange-3)",
          4: "var(--color-orange-4)",
          5: "var(--color-orange-5)",
          6: "var(--color-orange-6)",
          7: "var(--color-orange-7)",
          8: "var(--color-orange-8)",
          9: "var(--color-orange-9)",
          10: "var(--color-orange-10)",
        },
        neutral: {
          1: "var(--color-neutral-1)",
          2: "var(--color-neutral-2)",
          3: "var(--color-neutral-3)",
          4: "var(--color-neutral-4)",
          5: "var(--color-neutral-5)",
          6: "var(--color-neutral-6)",
          7: "var(--color-neutral-7)",
          8: "var(--color-neutral-8)",
          9: "var(--color-neutral-9)",
          10: "var(--color-neutral-10)",
          11: "var(--color-neutral-11)",
          12: "var(--color-neutral-12)",
          13: "var(--color-neutral-13)",
        },
      },
    },
  },
  plugins: [],
};
export default config;

