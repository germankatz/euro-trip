"use client";

import dynamic from "next/dynamic";

// MDEditor depende de window y trae CSS — dynamic import con ssr:false
// es la forma canónica para Next App Router.
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full rounded-md border border-zinc-200 bg-zinc-50" />
    ),
  }
);

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  height?: number;
};

export function MarkdownInput({ value, onChange, placeholder, height = 200 }: Props) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={height}
        textareaProps={{ placeholder }}
        preview="edit"
      />
    </div>
  );
}
