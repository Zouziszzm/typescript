"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListItem } from "@/components/ui/ListItem";
import { Panel } from "@/components/ui/Panel";
import { useLibrary } from "@/lib/hooks/useLibrary";
import { PILE_ID, PILE_NAME } from "@/lib/library/collections";
import { SORT_OPTIONS } from "@/lib/theme";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const FILE_ACCEPT =
  ".epub,.pdf,.txt,.mobi,.azw,.azw3,application/epub+zip,application/pdf,text/plain,application/x-mobipocket-ebook";

export function LibraryView() {
  const pathname = usePathname();
  const {
    books,
    allBooks,
    collections,
    progressMap,
    todayMinutes,
    streak,
    loading,
    loadError,
    importing,
    importError,
    importNotice,
    inProgress,
    search,
    setSearch,
    sort,
    setSort,
    activeCollection,
    setActiveCollection,
    importFiles,
    removeBook,
    createCollection,
  } = useLibrary();

  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);

  const openFilePicker = useCallback(() => {
    if (importing) return;
    setMenuOpen(false);
    fileInputRef.current?.click();
  }, [importing]);

  const onFilesSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const fileList = input.files ? Array.from(input.files) : [];
      if (!fileList.length) return;
      setMenuOpen(false);
      try {
        await importFiles(fileList);
      } finally {
        input.value = "";
      }
    },
    [importFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files);
    },
    [importFiles],
  );

  const handleDelete = useCallback(
    async (id: string, title: string) => {
      if (!confirm(`Delete "${title}"?`)) return;
      await removeBook(id);
    },
    [removeBook],
  );

  const handleNewShelf = useCallback(() => {
    const name = window.prompt("Shelf name:");
    if (name) void createCollection(name);
    setMenuOpen(false);
  }, [createCollection]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (target instanceof Element && target.closest("[data-library-menu]")) {
        return;
      }
      setMenuOpen(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointer);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const activeShelfName =
    activeCollection === PILE_ID
      ? (collections.find((c) => c.id === PILE_ID)?.name ?? PILE_NAME)
      : (collections.find((c) => c.id === activeCollection)?.name ?? "SHELF");

  return (
    <div
      className="flex flex-1 flex-col gap-4 pb-8"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <section>
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          multiple
          disabled={importing}
          onChange={onFilesSelected}
          className="native-file-input"
        />
        <p className="label-caps mb-1">LIBRARY</p>
        <p className="text-fg-muted text-sm">
          EPUB · PDF · TXT · MOBI
        </p>
        {loadError && (
          <p className="mt-2 border border-border bg-bg-overlay px-3 py-2 text-fg-muted text-sm">
            {loadError}
          </p>
        )}
        {importError && (
          <p className="mt-2 border border-border bg-bg-overlay px-3 py-2 text-fg-muted text-sm whitespace-pre-wrap">
            {importError}
          </p>
        )}
        {importNotice && !importError && (
          <p className="mt-2 border border-border bg-bg-overlay px-3 py-2 text-sm">
            {importNotice}
          </p>
        )}
      </section>

      {/* Search + import + options */}
      <div className="relative z-10 flex items-stretch gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or author..."
          className="min-w-0 flex-1 border border-border bg-bg-panel px-3 py-2 text-fg outline-none placeholder:text-fg-dim"
        />

        <button
          type="button"
          title="Import books"
          disabled={importing}
          onClick={openFilePicker}
          className={`label-caps relative flex shrink-0 touch-target cursor-pointer items-center justify-center overflow-hidden border border-border bg-bg-panel px-3 py-2 transition-colors hover:bg-bg-panel-hover ${
            importing ? "pointer-events-none opacity-40" : ""
          }`}
        >
          {importing ? "…" : "+"}
        </button>

        <div data-library-menu className="relative z-20 shrink-0">
          <button
            type="button"
            title="Options"
            data-library-menu
            onClick={toggleMenu}
            className="label-caps touch-target flex h-full min-h-11 cursor-pointer items-center border border-border bg-bg-panel px-3 py-2 hover:bg-bg-panel-hover"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close options"
                className="lib-menu-backdrop"
                onClick={() => setMenuOpen(false)}
              />
              <div
                data-library-menu
                className="lib-menu-dropdown"
                role="menu"
                aria-label="Library options"
              >
                <p className="lib-menu-dropdown-title">Options</p>
                <button
                  type="button"
                  role="menuitem"
                  disabled={importing}
                  onClick={openFilePicker}
                  className="lib-menu-dropdown-item"
                >
                  Import books
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleNewShelf}
                  className="lib-menu-dropdown-item"
                >
                  New shelf
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="lib-menu-dropdown-item lib-menu-dropdown-item-muted"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Panel title="COLLECTIONS" tag={`[${collections.length}]`}>
        {collections.map((col) => (
          <ListItem
            key={col.id}
            label={col.name}
            tag={String(col.bookIds.length)}
            symbol={col.id === PILE_ID ? "·" : "+"}
            active={activeCollection === col.id}
            onClick={() => setActiveCollection(col.id)}
          />
        ))}
      </Panel>

      <Panel
        title={activeShelfName}
        tag={
          loading && !importing
            ? "[LOADING]"
            : importing
              ? "[IMPORTING]"
              : books.length > 0
                ? `[${books.length}]`
                : "[EMPTY]"
        }
      >
        <div className="flex items-center justify-end border-b border-border-light px-4 py-1.5">
          <label className="tag flex items-center gap-1.5">
            SORT
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="border border-border-light bg-bg px-1.5 py-0.5 text-fg-dim outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && books.length === 0 && (
          <p className="border-b border-border-light px-4 py-3 text-sm text-fg-muted">
            {importing ? "Importing…" : "Loading library…"}
          </p>
        )}
        {importing && books.length > 0 && (
          <p className="border-b border-border-light px-4 py-3 text-sm text-fg-muted">
            Importing…
          </p>
        )}
        {!loading && !importing && books.length === 0 && (
          <button
            type="button"
            disabled={importing}
            onClick={openFilePicker}
            className={`block w-full text-left ${
              importing ? "pointer-events-none opacity-50" : "cursor-pointer"
            }`}
          >
            <ListItem
              label={
                activeCollection === PILE_ID
                  ? "The pile is empty — tap + to import"
                  : "No books in this shelf — tap + to import"
              }
              symbol="·"
            />
          </button>
        )}
        {books.map((book) => {
          const progress = progressMap[book.id];
          const percent = progress ? `${Math.round(progress.percent)}%` : "NEW";

          return (
            <div key={book.id} className="flex items-stretch">
              <Link
                href={`/read/${book.id}`}
                prefetch={false}
                className="flex min-h-11 flex-1 touch-manipulation items-stretch"
              >
                <ListItem
                  label={book.title}
                  tag={`[${book.format.toUpperCase()}] ${percent}`}
                  action="→"
                  symbol="+"
                />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(book.id, book.title)}
                className="label-caps border-l border-border-light px-3 text-fg-muted hover:bg-bg-panel-hover hover:text-fg"
              >
                DEL
              </button>
            </div>
          );
        })}
      </Panel>

      <Panel title="STATS" tag="[SESSION]">
        <ListItem
          label="Books in library"
          tag={String(allBooks.length)}
          symbol="+"
        />
        <ListItem
          label="Reading time today"
          tag={formatMinutes(todayMinutes)}
          symbol="+"
        />
        <ListItem
          label="Reading streak"
          tag={streak > 0 ? `${streak}d` : "—"}
          symbol="+"
        />
        <ListItem
          label="In progress"
          tag={inProgress.length > 0 ? String(inProgress.length) : "—"}
          symbol="+"
        />
      </Panel>
    </div>
  );
}
