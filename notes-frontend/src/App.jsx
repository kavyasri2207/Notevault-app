import { useCallback, useEffect, useRef, useState } from "react";
import {
  createNote,
  deleteNote,
  getAllNotes,
  getMe,
  login,
  signup,
  summarizeNote,
  updateNote,
} from "./api/notesApi";
import "./App.css";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const Icon = ({ name, size = 18 }) => {
  const icons = {
    add: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </>
    ),
    spark: (
      <>
        <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
    note: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

const AuthPanel = ({ onAuthed }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload =
        mode === "signup"
          ? { name: form.name.trim(), email: form.email.trim(), password: form.password }
          : { email: form.email.trim(), password: form.password };
      const res = mode === "signup" ? await signup(payload) : await login(payload);

      localStorage.setItem("notes_token", res.data.token);
      onAuthed(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-copy">
        <div className="brand-mark"><Icon name="note" /></div>
        <h1>NoteVault</h1>
        <p>Private notes, clean organization, and AI summaries when your thoughts need a sharper shape.</p>
      </section>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
        </div>

        {mode === "signup" && (
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(e) => updateField("name", e.target.value)} minLength={2} maxLength={80} required />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
        </label>

        <label className="field">
          <span>Password</span>
          <input type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} minLength={6} required />
        </label>

        {error && <p className="error-msg">{error}</p>}

        <button className="btn-primary wide" disabled={submitting}>
          {submitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Login"}
        </button>
      </form>
    </main>
  );
};

const NoteCard = ({ note, onEdit, onDelete, onSummarize }) => {
  const [deleting, setDeleting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(note._id);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const text = await onSummarize(note._id);
      setSummary(text);
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <article className={`note-card ${deleting ? "deleting" : ""}`}>
      <div className="note-card-header">
        <span className="note-date">{formatDate(note.createdAt)}</span>
        <div className="note-actions">
          <button className="action-btn ai" onClick={handleSummarize} title="Summarize with Gemini" disabled={summarizing}>
            <Icon name="spark" size={15} />
            <span>{summarizing ? "Summarizing" : "Summarize"}</span>
          </button>
          <button className="action-btn edit" onClick={() => onEdit(note)} title="Edit note">
            <Icon name="edit" size={15} />
            <span>Edit</span>
          </button>
          <button className="action-btn delete" onClick={handleDelete} title="Delete note">
            <Icon name="trash" size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>
      <h3 className="note-title">{note.title}</h3>
      <p className="note-content">{note.content}</p>
      {summary && <div className="summary-box">{summary}</div>}
      {note.updatedAt !== note.createdAt && <span className="note-updated">edited {formatDate(note.updatedAt)}</span>}
    </article>
  );
};

const Modal = ({ isOpen, onClose, editNote, onSave }) => {
  const [title, setTitle] = useState(editNote?.title || "");
  const [content, setContent] = useState(editNote?.content || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) return setError("Title is required");
    if (!content.trim()) return setError("Content is required");
    setSaving(true);
    setError("");
    try {
      await onSave({ title: title.trim(), content: content.trim() });
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editNote ? "Edit Note" : "New Note"}</h2>
          <button className="btn-icon close" onClick={onClose} title="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span>Title</span>
            <input ref={titleRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
          </label>
          <label className="field">
            <span>Content</span>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} />
          </label>
          {error && <p className="error-msg">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : editNote ? "Update Note" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("notes_token");
    setUser(null);
    setNotes([]);
  };

  const fetchNotes = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const res = await getAllNotes({ search: q, limit: 50 });
      setNotes(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
      showToast("Failed to load notes", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("notes_token");
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const res = await getMe();
        setUser(res.data.data);
      } catch {
        localStorage.removeItem("notes_token");
      } finally {
        setCheckingAuth(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => fetchNotes(), 0);
    return () => clearTimeout(timer);
  }, [fetchNotes, user]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => fetchNotes(searchInput), 350);
    return () => clearTimeout(timer);
  }, [fetchNotes, searchInput, user]);

  const handleSave = async (data) => {
    if (editNote) {
      await updateNote(editNote._id, data);
      showToast("Note updated");
    } else {
      await createNote(data);
      showToast("Note created");
    }
    fetchNotes(searchInput);
  };

  const handleDelete = async (id) => {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      showToast("Note deleted");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const handleSummarize = async (id) => {
    try {
      const res = await summarizeNote(id);
      showToast("Summary ready");
      return res.data.data.summary;
    } catch (err) {
      showToast(err.response?.data?.error || err.response?.data?.message || "Summary failed", "error");
      return "";
    }
  };

  const openNew = () => {
    setEditNote(null);
    setModalOpen(true);
  };

  const handleEdit = (note) => {
    setEditNote(note);
    setModalOpen(true);
  };

  if (checkingAuth) {
    return <div className="state-container full"><div className="spinner" /><p className="state-text">Loading workspace...</p></div>;
  }

  if (!user) {
    return <AuthPanel onAuthed={setUser} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo"><Icon name="note" /></div>
          <div>
            <h1 className="app-title">NoteVault</h1>
            <p className="app-sub">{notes.length} note{notes.length !== 1 ? "s" : ""} for {user.name}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-new" onClick={openNew}><Icon name="add" size={16} />New Note</button>
          <button className="btn-icon logout" onClick={handleLogout} title="Logout"><Icon name="logout" /></button>
        </div>
      </header>

      <div className="search-wrap">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input type="text" placeholder="Search notes" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          {searchInput && <button className="clear-search" onClick={() => setSearchInput("")} title="Clear"><Icon name="close" size={15} /></button>}
        </div>
      </div>

      <main className="main">
        {loading ? (
          <div className="state-container"><div className="spinner" /><p className="state-text">Loading notes...</p></div>
        ) : notes.length === 0 ? (
          <div className="state-container">
            <div className="empty-icon"><Icon name="note" size={52} /></div>
            <p className="empty-title">{searchInput ? "No results found" : "No notes yet"}</p>
            <p className="empty-sub">{searchInput ? `Nothing matched "${searchInput}"` : "Create a note to begin"}</p>
            {!searchInput && <button className="btn-primary" onClick={openNew}>Create your first note</button>}
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => (
              <NoteCard key={note._id} note={note} onEdit={handleEdit} onDelete={handleDelete} onSummarize={handleSummarize} />
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <Modal
          key={editNote?._id || "new-note"}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          editNote={editNote}
          onSave={handleSave}
        />
      )}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
