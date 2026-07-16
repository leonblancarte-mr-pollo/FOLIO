import { useState } from "react";
import { X, Pencil, Trash2, Lock, BookOpen, Loader2 } from "lucide-react";
import { palette, body, display } from "../theme.js";
import { updateUserList, deleteUserList, removeBookFromList } from "../services/listsService.js";
import { ListFormModal } from "./ListFormModal.jsx";

// Detalle de una lista: sus libros, quitar libros, editar, y borrar la lista.
function ListDetailModal({ list, books, userId, onSelectBook, onChanged, onDeleted, onClose }) {
  const [editOpen, setEditOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const listBooks = list.bookIds.map((id) => books.find((b) => b.id === id)).filter(Boolean);

  async function handleRemove(bookId) {
    if (removingId) return;
    setRemovingId(bookId);
    try {
      await removeBookFromList(list.id, bookId);
      onChanged({ ...list, bookIds: list.bookIds.filter((id) => id !== bookId) });
    } catch (e) { console.error("[LISTAS] remove error:", e.message); }
    setRemovingId(null);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la lista "${list.name}"? Los libros no se borran de tu biblioteca.`)) return;
    try {
      await deleteUserList(list.id, userId);
      onDeleted(list.id);
    } catch (e) { console.error("[LISTAS] delete error:", e.message); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ backgroundColor: "rgba(42,31,26,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-md"
        style={{ backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex justify-between items-center px-4 py-3 border-b" style={{ backgroundColor: palette.bg, borderColor: palette.borderSoft }}>
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:opacity-70">
            <X size={20} color={palette.inkSoft} />
          </button>
          <div className="flex gap-1.5">
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ ...display, fontSize: "0.85rem", color: palette.inkSoft, border: `1px solid ${palette.border}` }}>
              <Pencil size={13} /> Editar
            </button>
            <button onClick={handleDelete} className="p-2 rounded-full hover:opacity-70" style={{ color: palette.accent }}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h2 style={{ ...display, fontWeight: 700, fontSize: "1.35rem", color: palette.ink, margin: 0 }}>{list.name}</h2>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", ...body, fontSize: "0.72rem", color: palette.inkFaint, backgroundColor: palette.bgSoft, padding: "0.15rem 0.55rem", borderRadius: 999 }}>
              {list.is_public ? "Pública" : <><Lock size={10} /> Privada</>}
            </span>
          </div>
          {list.description && (
            <p style={{ ...body, fontSize: "0.9rem", fontStyle: "italic", color: palette.inkSoft, marginTop: "0.4rem" }}>{list.description}</p>
          )}
          <p style={{ ...body, fontSize: "0.8rem", color: palette.inkFaint, marginTop: "0.3rem" }}>
            {listBooks.length} {listBooks.length === 1 ? "libro" : "libros"}
          </p>

          {listBooks.length === 0 ? (
            <p style={{ ...body, fontSize: "0.9rem", color: palette.inkFaint, fontStyle: "italic", marginTop: "1.25rem" }}>
              Lista vacía. Agrega libros desde el detalle de cualquier libro de tu biblioteca.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "1.1rem" }}>
              {listBooks.map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: palette.bgCard, border: `1px solid ${palette.borderSoft}`, borderRadius: 12, padding: "0.55rem 0.7rem" }}>
                  <div onClick={() => onSelectBook?.(b)} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0, cursor: onSelectBook ? "pointer" : "default" }}>
                    {b.coverUrl ? (
                      <img src={b.coverUrl} alt={b.title} style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 52, borderRadius: 5, flexShrink: 0, backgroundColor: palette.bgSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <BookOpen size={14} color={palette.inkFaint} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...display, fontSize: "0.92rem", fontWeight: 600, color: palette.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</p>
                      <p style={{ ...body, fontSize: "0.8rem", color: palette.inkFaint, margin: 0 }}>{b.author}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(b.id)} disabled={removingId === b.id} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.35rem", color: palette.inkFaint, flexShrink: 0 }}>
                    {removingId === b.id ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editOpen && (
        <ListFormModal
          initial={list}
          onClose={() => setEditOpen(false)}
          onSave={async ({ name, description, isPublic }) => {
            await updateUserList(list.id, userId, { name, description: description || null, is_public: isPublic });
            onChanged({ ...list, name, description, is_public: isPublic });
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ============ FECHA DE LECTURA FLEXIBLE ============

export { ListDetailModal };
