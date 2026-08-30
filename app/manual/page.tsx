"use client";

import { useEffect, useMemo, useState } from "react";
import "./manual.css";

type ManualFile = {
  id: string;
  title: string;
  filename: string;
  status: "LOCKED" | "WORKING" | "READY TO IMPORT";
  revision?: string;
  source?: string;
};

type Manifest = {
  project: string;
  files: ManualFile[];
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

function MarkdownPreview({ source }: { source: string }) {
  const lines = source.split("\n");
  return (
    <article className="manual-preview">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) return <h3 key={index}>{renderInline(line.slice(4))}</h3>;
        if (line.startsWith("## ")) return <h2 key={index}>{renderInline(line.slice(3))}</h2>;
        if (line.startsWith("# ")) return <h1 key={index}>{renderInline(line.slice(2))}</h1>;
        if (/^[-*]\s+/.test(line)) return <div className="manual-bullet" key={index}>• {renderInline(line.replace(/^[-*]\s+/, ""))}</div>;
        if (/^>\s?/.test(line)) return <blockquote key={index}>{renderInline(line.replace(/^>\s?/, ""))}</blockquote>;
        if (/^-{3,}$/.test(line.trim())) return <hr key={index} />;
        if (!line.trim()) return <div className="manual-space" key={index} />;
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </article>
  );
}

export default function ManualWorkspace() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [activeId, setActiveId] = useState("toc");
  const [source, setSource] = useState("");
  const [savedSource, setSavedSource] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/manual/manifest.json").then(r => r.json()).then((data: Manifest) => setManifest(data));
  }, []);

  const activeFile = manifest?.files.find(file => file.id === activeId);

  useEffect(() => {
    if (!activeFile || activeFile.status === "READY TO IMPORT") {
      setSource("");
      setSavedSource("");
      return;
    }
    fetch(`/manual/${activeFile.filename}`)
      .then(r => r.text())
      .then(text => {
        setSource(text);
        setSavedSource(text);
      });
  }, [activeFile?.filename, activeFile?.status]);

  const visibleFiles = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!manifest) return [];
    if (!q) return manifest.files;
    return manifest.files.filter(file => `${file.title} ${file.filename} ${file.status}`.toLowerCase().includes(q));
  }, [manifest, query]);

  const dirty = source !== savedSource;

  function downloadMarkdown() {
    if (!activeFile) return;
    const blob = new Blob([source], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="manual-shell">
      <aside className="manual-sidebar">
        <div className="manual-brand">
          <div className="manual-kicker">USONIAN GUITAR CO.</div>
          <h1>Build Manual</h1>
          <p>Markdown workspace</p>
        </div>
        <input className="manual-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chapters…" />
        <nav className="manual-files">
          {visibleFiles.map(file => (
            <button key={file.id} className={file.id === activeId ? "active" : ""} onClick={() => setActiveId(file.id)}>
              <span>{file.title}</span>
              <small className={`status status-${file.status.toLowerCase().replaceAll(" ", "-")}`}>{file.status}</small>
            </button>
          ))}
        </nav>
      </aside>

      <section className="manual-workspace">
        <header className="manual-toolbar">
          <div>
            <div className="manual-path">manual / {activeFile?.filename ?? "loading…"}</div>
            <h2>{activeFile?.title ?? "Usonian OM-14 Manual"}</h2>
          </div>
          <div className="manual-actions">
            <button className={mode === "edit" ? "selected" : ""} onClick={() => setMode("edit")}>Edit</button>
            <button className={mode === "preview" ? "selected" : ""} onClick={() => setMode("preview")}>Preview</button>
            <button disabled={!source} onClick={downloadMarkdown}>Download .md</button>
          </div>
        </header>

        {activeFile?.status === "READY TO IMPORT" ? (
          <div className="manual-empty">
            <h3>Source located — migration pending</h3>
            <p>This chapter is already in the Usonian OM-14 Google Drive working folder and is queued to become a repository Markdown file.</p>
            {activeFile.source && <a href={activeFile.source} target="_blank" rel="noreferrer">Open source document</a>}
          </div>
        ) : mode === "edit" ? (
          <div className="manual-editor-wrap">
            <textarea className="manual-editor" value={source} onChange={e => setSource(e.target.value)} spellCheck={false} />
            <div className="manual-edit-footer">
              <span>{dirty ? "Unsaved browser edits" : "Matches repository copy"}</span>
              <span>{source.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
            </div>
          </div>
        ) : (
          <div className="manual-preview-wrap"><MarkdownPreview source={source} /></div>
        )}
      </section>
    </main>
  );
}
