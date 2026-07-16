import { useState, useEffect } from "react";
import { Plus, Lock, Bookmark, ChevronRight, Loader2 } from "lucide-react";
import { palette, body, display } from "../theme.js";
import { fetchUserLists, createUserList } from "../services/listsService.js";
import { ListFormModal } from "./ListFormModal.jsx";
import { ListDetailModal } from "./ListDetailModal.jsx";

// Sección "Mis listas" del perfil propio.
function ListsSection({ user, books, onSelectBook }) {
  const [lists, setLists] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [openList, setOpenList] = useState(null);

  useEffect(() => {
    fetchUserLists(user.id).then(setLists).catch(() => setLists([]));
  }, [user.id]);

  function handleChanged(updated) {
    setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setOpenList(updated);
  }

  return (
    <div style={{ padding: "0 1.25rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <p style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>Mis listas</p>
        <button onClick={() => setCreateOpen(true)} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: palette.accent, ...body, fontSize: "0.82rem", fontWeight: 600, padding: 0 }}>
          <Plus size={14} /> Nueva
        </button>
      </div>

      {lists === null ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
          <Loader2 size={18} className="animate-spin" color={palette.inkFaint} />
        </div>
      ) : lists.length === 0 ? (
        <button onClick={() => setCreateOpen(true)} style={{ width: "100%", borderRadius: 14, padding: "1rem 1.25rem", backgroundColor: palette.bgCard, border: `1px dashed ${palette.border}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Bookmark size={22} color={palette.inkFaint} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ ...display, fontWeight: 700, fontSize: "0.92rem", color: palette.inkSoft, margin: 0 }}>Crea tu primera lista</p>
            <p style={{ ...body, fontSize: "0.78rem", color: palette.inkFaint, margin: 0 }}>"Favoritos", "No entendí nada", lo que quieras</p>
          </div>
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {lists.map((l) => (
            <button key={l.id} onClick={() => setOpenList(l)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.7rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 12, padding: "0.75rem 0.9rem", cursor: "pointer", textAlign: "left" }}>
              {l.is_public ? <Bookmark size={16} color={palette.accent} style={{ flexShrink: 0 }} /> : <Lock size={15} color={palette.inkFaint} style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...display, fontSize: "0.95rem", fontWeight: 600, color: palette.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</p>
                <p style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint, margin: 0 }}>
                  {l.bookIds.length} {l.bookIds.length === 1 ? "libro" : "libros"} · {l.is_public ? "pública" : "privada"}
                </p>
              </div>
              <ChevronRight size={16} color={palette.inkFaint} />
            </button>
          ))}
        </div>
      )}

      {createOpen && (
        <ListFormModal
          onClose={() => setCreateOpen(false)}
          onSave={async ({ name, description, isPublic }) => {
            const list = await createUserList(user.id, { name, description, isPublic });
            setLists((prev) => [list, ...(prev || [])]);
            setCreateOpen(false);
          }}
        />
      )}
      {openList && (
        <ListDetailModal
          list={openList}
          books={books}
          userId={user.id}
          onSelectBook={onSelectBook}
          onChanged={handleChanged}
          onDeleted={(id) => { setLists((prev) => prev.filter((l) => l.id !== id)); setOpenList(null); }}
          onClose={() => setOpenList(null)}
        />
      )}
    </div>
  );
}

export { ListsSection };
