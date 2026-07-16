import { useState, useEffect } from "react";
import { X, Plus, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { palette, body, display } from "../theme.js";
import { fetchUserLists, createUserList, addBookToList, removeBookFromList } from "../services/listsService.js";

// Sheet para agregar/quitar el libro actual de las listas del usuario.
function AddToListSheet({ userId, bookId, onClose }) {
  const [lists, setLists] = useState(null); // null = cargando
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchUserLists(userId).then(setLists).catch(() => setLists([]));
  }, [userId]);

  async function toggle(list) {
    if (busyId) return;
    setBusyId(list.id);
    const inList = list.bookIds.includes(bookId);
    try {
      if (inList) await removeBookFromList(list.id, bookId);
      else await addBookToList(list.id, bookId);
      setLists((prev) => prev.map((l) => l.id === list.id
        ? { ...l, bookIds: inList ? l.bookIds.filter((id) => id !== bookId) : [...l.bookIds, bookId] }
        : l));
    } catch (e) { console.error("[LISTAS] toggle error:", e.message); }
    setBusyId(null);
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (!name || busyId) return;
    setBusyId("new");
    try {
      const list = await createUserList(userId, { name });
      await addBookToList(list.id, bookId);
      setLists((prev) => [{ ...list, bookIds: [bookId] }, ...(prev || [])]);
      setNewName("");
      setCreating(false);
    } catch (e) { console.error("[LISTAS] create error:", e.message); }
    setBusyId(null);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(42,31,26,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: palette.bg, borderRadius: "20px 20px 0 0", padding: "1.25rem 1.25rem 2rem", width: "100%", maxWidth: 480, maxHeight: "70vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <p style={{ ...display, fontSize: "1.1rem", fontWeight: 700, color: palette.ink }}>Agregar a lista</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            <X size={20} color={palette.inkSoft} />
          </button>
        </div>

        {lists === null ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem" }}>
            <Loader2 size={20} className="animate-spin" color={palette.inkFaint} />
          </div>
        ) : (
          <>
            {lists.length === 0 && !creating && (
              <p style={{ ...body, fontSize: "0.9rem", color: palette.inkFaint, fontStyle: "italic", marginBottom: "0.75rem" }}>
                Aún no tienes listas. Crea la primera.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "0.85rem" }}>
              {lists.map((l) => {
                const inList = l.bookIds.includes(bookId);
                return (
                  <button
                    key={l.id}
                    onClick={() => toggle(l)}
                    disabled={busyId === l.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.7rem", width: "100%",
                      padding: "0.7rem 0.9rem", borderRadius: 12, cursor: "pointer", textAlign: "left",
                      border: `1.5px solid ${inList ? palette.accent : palette.border}`,
                      backgroundColor: inList ? `${palette.accent}12` : palette.bgCard,
                    }}
                  >
                    {!l.is_public && <Lock size={13} color={palette.inkFaint} style={{ flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: palette.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</p>
                      <p style={{ ...body, fontSize: "0.75rem", color: palette.inkFaint, margin: 0 }}>{l.bookIds.length} {l.bookIds.length === 1 ? "libro" : "libros"}</p>
                    </div>
                    {busyId === l.id
                      ? <Loader2 size={16} className="animate-spin" color={palette.inkFaint} />
                      : inList && <CheckCircle2 size={17} color={palette.accent} />}
                  </button>
                );
              })}
            </div>
            {creating ? (
              <div style={{ display: "flex", gap: "0.45rem" }}>
                <input
                  value={newName}
                  autoFocus
                  maxLength={100}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createAndAdd(); }}
                  placeholder="Nombre de la lista..."
                  style={{ flex: 1, padding: "0.65rem 0.85rem", borderRadius: 10, border: `1.5px solid ${palette.border}`, backgroundColor: palette.bgCard, color: palette.ink, ...body, fontSize: "0.92rem", outline: "none", minWidth: 0 }}
                />
                <button
                  onClick={createAndAdd}
                  disabled={!newName.trim() || busyId === "new"}
                  style={{ flexShrink: 0, padding: "0.65rem 0.95rem", borderRadius: 10, border: "none", backgroundColor: newName.trim() ? palette.accent : palette.border, color: "#fff", cursor: newName.trim() ? "pointer" : "default", ...display, fontWeight: 600, fontSize: "0.9rem" }}
                >
                  {busyId === "new" ? "…" : "Crear"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: palette.accent, ...body, fontSize: "0.9rem", fontWeight: 600, padding: "0.25rem 0" }}
              >
                <Plus size={15} /> Nueva lista
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { AddToListSheet };
