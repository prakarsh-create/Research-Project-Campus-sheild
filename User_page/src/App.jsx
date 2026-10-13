import { useState, useRef, useEffect } from "react";
import './index.css'
import {
  Search,
  ArrowRight,
  Package,
  GitMerge,
  CheckCircle2,
  MapPin,
  Upload,
  ImageIcon,
  X,
  Trash2,
  LogOut,
  Pencil,
} from "lucide-react";

// ---- Design tokens pulled from the original Tailwind config ----
const colors = {
  primary: "#094cb2",
  primaryContainer: "#3366cc",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#e7ebff",
  surface: "#faf9fa",
  surfaceContainerLow: "#f5f3f4",
  surfaceContainer: "#efedee",
  surfaceContainerHigh: "#e9e8e9",
  surfaceContainerHighest: "#e3e2e3",
  surfaceContainerLowest: "#ffffff",
  onSurface: "#1b1c1d",
  onSurfaceVariant: "#434653",
  outline: "#737784",
  outlineVariant: "#c3c6d5",
};

const border = { border: `1px solid ${colors.outlineVariant}` };
const borderB = { borderBottom: `1px solid ${colors.outlineVariant}` };
const borderT = { borderTop: `1px solid ${colors.outlineVariant}` };

const discoveries = [
  { id: 1, title: "Keys w/ Red Lanyard", time: "Discovered 2H Ago" },
  { id: 2, title: "Black Smartwatch", time: "Discovered Yesterday" },
];

function StatusBadge({ status }) {
  const styles =
    status === "Match Found"
      ? { backgroundColor: colors.primaryContainer, color: colors.onPrimary }
      : { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurface };
  return (
    <span
      className="px-3 py-1 font-medium text-[0.7rem] uppercase tracking-widest rounded-full"
      style={styles}
    >
      {status}
    </span>
  );
}

function ReportTypeBadge({ type }) {
  return (
    <span
      className="px-2 py-1 font-medium text-[0.7rem] uppercase tracking-widest"
      style={{
        backgroundColor: type === "found" ? "#e4f2ed" : "#f8e9e4",
        color: type === "found" ? "#236b59" : "#9d4d3a",
      }}
    >
      {type === "found" ? "Found" : "Lost"}
    </span>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("foundit_user") || "null");
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("foundit_token"));
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [matches, setMatches] = useState({});
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    location: "",
    description: "",
    status: "Searching",
    type: "lost",
  });
  const fileInputRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadItems = async () => {
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: "5",
          sort: sortOrder,
        });
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (statusFilter) params.set("status", statusFilter);
        const response = await fetch(`${apiUrl}/api/items?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          handleLogout();
          throw new Error("Your session has expired. Please sign in again.");
        }
        if (!response.ok) throw new Error("Unable to load the collection.");
        const result = await response.json();
        setItems(result.items);
        setTotalItems(result.total);
        setTotalPages(result.totalPages);
        if (result.page !== currentPage) setCurrentPage(result.page);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, [apiUrl, token, currentPage, searchQuery, sortOrder, statusFilter]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setIsAuthenticating(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to authenticate.");
      localStorage.setItem("foundit_token", result.token);
      localStorage.setItem("foundit_user", JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  function handleLogout() {
    localStorage.removeItem("foundit_token");
    localStorage.removeItem("foundit_user");
    setToken(null);
    setUser(null);
    setItems([]);
    setTotalItems(0);
    setCurrentPage(1);
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setSelectedFile(file);
    }
  };

  const resetForm = () => {
    setForm({ title: "", location: "", description: "", status: "Searching", type: "lost" });
    setEditingItemId(null);
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setIsSubmitting(true);
    setError("");

    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("location", form.location);
      data.append("description", form.description);
      data.append("status", form.status);
      data.append("type", form.type);
      if (selectedFile) data.append("image", selectedFile);

      const response = await fetch(
        editingItemId ? `${apiUrl}/api/items/${encodeURIComponent(editingItemId)}` : `${apiUrl}/api/items`,
        {
        method: editingItemId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit the report.");

      if (editingItemId) {
        setItems((prev) => prev.map((item) => (item.id === result.id ? result : item)));
      } else {
        setItems((prev) => [result, ...prev]);
      }
      resetForm();
      setShowForm(false);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItemId(item.id);
    setForm({
      title: item.title,
      location: item.location,
      description: item.description,
      status: item.status,
      type: item.type || "lost",
    });
    setPreview(item.image || null);
    setSelectedFile(null);
    setShowForm(true);
  };

  const loadMatches = async (item) => {
    try {
      const response = await fetch(`${apiUrl}/api/items/${encodeURIComponent(item.id)}/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const result = await response.json();
      setMatches((previous) => ({ ...previous, [item.id]: result }));
    } catch (matchError) {
      setError(matchError.message);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from your collection?`)) return;

    setDeletingItemId(item.id);
    setError("");

    try {
      const response = await fetch(`${apiUrl}/api/items/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to remove the item.");

      setItems((prev) => prev.filter((currentItem) => currentItem.id !== item.id));
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingItemId(null);
    }
  };

  if (!user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: colors.surface, color: colors.onSurface }}>
        <form onSubmit={handleAuthSubmit} className="w-full max-w-md p-8 flex flex-col gap-5" style={border}>
          <div>
            <p className="font-label text-xs uppercase tracking-widest mb-3" style={{ color: colors.primaryContainer }}>
              FoundIt.
            </p>
            <h1 className="font-display text-4xl font-normal">
              {authMode === "login" ? "Welcome back." : "Create your account."}
            </h1>
            <p className="mt-3 text-sm" style={{ color: colors.onSurfaceVariant }}>
              {authMode === "login" ? "Sign in to manage your reports." : "Your reports will be private to your account."}
            </p>
          </div>
          {authMode === "register" && (
            <input
              required
              value={authForm.name}
              onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
              placeholder="Full name"
              className="px-4 py-3 bg-transparent focus:outline-none"
              style={border}
            />
          )}
          <input
            required
            type="email"
            value={authForm.email}
            onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
            placeholder="Email address"
            className="px-4 py-3 bg-transparent focus:outline-none"
            style={border}
          />
          <input
            required
            minLength={8}
            type="password"
            value={authForm.password}
            onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
            placeholder="Password (at least 8 characters)"
            className="px-4 py-3 bg-transparent focus:outline-none"
            style={border}
          />
          {error && <p className="text-sm" style={{ color: "#a33a3a" }}>{error}</p>}
          <button
            type="submit"
            disabled={isAuthenticating}
            className="px-6 py-3 font-label text-sm uppercase tracking-widest disabled:opacity-40"
            style={{ backgroundColor: colors.onSurface, color: colors.surface }}
          >
            {isAuthenticating ? "Please wait..." : authMode === "login" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-sm underline text-left"
            style={{ color: colors.onSurfaceVariant }}
          >
            {authMode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col antialiased"
      style={{
        backgroundColor: colors.surface,
        color: colors.onSurface,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Public+Sans:wght@500;600;700&display=swap');
        .font-display { font-family: 'Noto Serif', serif; }
        .font-label { font-family: 'Public Sans', sans-serif; }
        .hover-lift { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
        .hover-lift:hover { transform: translateY(-4px); }
      `}</style>

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex flex-col w-full backdrop-blur-md"
        style={{ backgroundColor: `${colors.surface}f2`, ...borderB }}
      >
        <div className="flex justify-between items-center px-6 md:px-16 h-20 max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-12">
            <a className="font-display text-2xl font-bold tracking-tight" href="#">
              FoundIt.
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a
                className="font-label text-sm uppercase tracking-widest pb-1"
                style={{ borderBottom: `1px solid ${colors.onSurface}` }}
                href="#"
              >
                Journal
              </a>
              {["Curated Items", "Archive", "Dispatch"].map((label) => (
                <a
                  key={label}
                  className="font-label text-sm uppercase tracking-widest pb-1 transition-colors"
                  style={{ color: colors.onSurfaceVariant }}
                  href="#"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block" style={border}>
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2"
                size={16}
                style={{ color: colors.outline }}
              />
              <input
                className="pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 w-64 text-base"
                placeholder="Search the archive..."
                type="text"
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 font-label text-sm uppercase tracking-widest transition-colors hidden sm:block"
              style={{ backgroundColor: colors.primaryContainer, color: "#fff" }}
            >
              Report
            </button>
            <span className="hidden md:block text-sm" style={{ color: colors.onSurfaceVariant }}>
              {user.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 font-label text-xs uppercase tracking-widest"
              style={{ color: colors.onSurfaceVariant }}
              aria-label="Sign out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <div
              className="w-10 h-10 overflow-hidden cursor-pointer"
              style={{ backgroundColor: colors.surfaceContainerHighest }}
            >
              <img
                alt="User avatar"
                className="w-full h-full object-cover grayscale"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-wnAsFXaVEzqlFuu7BY5qf3VIrfiuM6sKAN-gA4PHNA3Kq-nbTsIup5F02A0mEFDdlNA2GQQORF1nnZxikVpf85_lcougRna9my6A63p4s3mebxHoLqfUrYME46sEdy1a-AoFSsM9vM50iTBYRdHBXU6K81KMc6q8J5mHRO-yJnUkv_fHd-sAHydWRknknXW0h-P7li_ouZ7JNXtV1GfHNZN7ej0uRv8kv2l4IzH9rCJo2iEw6_4U"
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-[1440px] mx-auto px-6 md:px-16 py-20 flex flex-col gap-20">
        {error && (
          <div className="p-4 text-sm" style={{ ...border, color: colors.onSurfaceVariant }}>
            {error} Make sure the backend is running and your database is configured.
          </div>
        )}

        {/* Hero */}
        <section
          className="flex flex-col md:flex-row gap-10 items-start md:items-end justify-between w-full pb-10"
          style={borderB}
        >
          <div className="max-w-4xl flex flex-col gap-6">
            <h1 className="font-display text-4xl md:text-6xl leading-tight font-normal">
              Curating recovery.
              <br />
              <span className="italic" style={{ color: colors.primaryContainer }}>
                Welcome back, Prakarsh.
              </span>
            </h1>
            <p className="text-lg max-w-2xl font-light" style={{ color: colors.onSurfaceVariant }}>
              An editorial approach to lost and found. We meticulously scan the community to
              reunite you with your pieces, and assist in returning others'.
            </p>
          </div>
          <div className="flex flex-col gap-4 min-w-[240px]">
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-4 font-label text-sm uppercase tracking-widest flex items-center justify-between group transition-colors"
              style={{ backgroundColor: colors.primaryContainer, color: "#fff" }}
            >
              Submit Report
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() =>
                document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-6 py-4 font-label text-sm uppercase tracking-widest flex items-center justify-between transition-colors"
              style={{ backgroundColor: colors.surfaceContainerLow, ...border }}
            >
              Explore Archive
            </button>
          </div>
        </section>

        {/* Upload / report form */}
        {showForm && (
          <section className="p-8 flex flex-col gap-6" style={border}>
            <div className="flex justify-between items-center">
              <h2 className="font-display text-2xl font-normal">
                {editingItemId ? "Edit Item Report" : "Report a New Item"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                aria-label="Close form"
                style={{ color: colors.onSurfaceVariant }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Image dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="aspect-[4/3] flex flex-col items-center justify-center gap-3 cursor-pointer relative overflow-hidden"
                style={{ ...border, backgroundColor: colors.surfaceContainerLow }}
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreview(null);
                      }}
                      className="absolute top-3 right-3 p-2"
                      style={{ backgroundColor: colors.surface }}
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={28} style={{ color: colors.outline }} />
                    <p className="font-label text-sm uppercase tracking-widest text-center px-6" style={{ color: colors.onSurfaceVariant }}>
                      Click or drag an image here to upload
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Item details */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-label text-xs uppercase tracking-widest" style={{ color: colors.onSurfaceVariant }}>
                    Report type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="px-4 py-3 bg-transparent text-base focus:outline-none"
                    style={border}
                  >
                    <option value="lost">I lost this item</option>
                    <option value="found">I found this item</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label text-xs uppercase tracking-widest" style={{ color: colors.onSurfaceVariant }}>
                    Item title
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Navy Leather Wallet"
                    className="px-4 py-3 bg-transparent text-base focus:outline-none"
                    style={border}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label text-xs uppercase tracking-widest" style={{ color: colors.onSurfaceVariant }}>
                    Location
                  </label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Downtown Cafe"
                    className="px-4 py-3 bg-transparent text-base focus:outline-none"
                    style={border}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label text-xs uppercase tracking-widest" style={{ color: colors.onSurfaceVariant }}>
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Any distinguishing details..."
                    rows={4}
                    className="px-4 py-3 bg-transparent text-base focus:outline-none resize-none"
                    style={border}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label text-xs uppercase tracking-widest" style={{ color: colors.onSurfaceVariant }}>
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="px-4 py-3 bg-transparent text-base focus:outline-none"
                    style={border}
                  >
                    <option value="Searching">Searching</option>
                    <option value="Match Found">Match Found</option>
                    <option value="Reunited">Reunited</option>
                  </select>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!form.title.trim() || isSubmitting}
                  className="mt-2 px-6 py-3 font-label text-sm uppercase tracking-widest disabled:opacity-40"
                  style={{ backgroundColor: colors.onSurface, color: colors.surface }}
                >
                  {isSubmitting ? "Saving..." : editingItemId ? "Save Changes" : "Add to Collection"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-20" style={borderB}>
          <div className="md:col-span-1 flex flex-col justify-end">
            <h2 className="font-label text-sm uppercase tracking-widest mb-4" style={{ color: colors.onSurfaceVariant }}>
              Current Status
            </h2>
            <p className="text-sm" style={{ color: colors.onSurfaceVariant }}>
              An overview of ongoing efforts and successful reunions within your curated collection.
            </p>
          </div>
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3" style={border}>
            {[
              { icon: Package, value: String(totalItems).padStart(2, "0"), label: "Active Inquiries", accent: false },
              {
                icon: GitMerge,
                value: String(items.filter((i) => i.status === "Match Found").length).padStart(2, "0"),
                label: "Potential Matches",
                accent: true,
              },
              { icon: CheckCircle2, value: "01", label: "Archived Reunions", accent: false },
            ].map((stat, idx) => (
              <div
                key={stat.label}
                className="p-8 flex flex-col gap-4"
                style={idx < 2 ? { borderRight: `1px solid ${colors.outlineVariant}`, borderBottom: `1px solid ${colors.outlineVariant}` } : {}}
              >
                <stat.icon size={26} style={{ color: stat.accent ? colors.primaryContainer : colors.onSurfaceVariant }} strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="font-display text-3xl" style={{ color: stat.accent ? colors.primaryContainer : colors.onSurface }}>
                    {stat.value}
                  </span>
                  <span className="font-label text-xs uppercase tracking-widest mt-1" style={{ color: colors.onSurfaceVariant }}>
                    {stat.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          {/* Collection */}
          <section id="collection" className="lg:col-span-8 flex flex-col gap-10">
            <div className="flex justify-between items-baseline mb-2">
              <h2 className="font-display text-3xl font-normal">The Collection</h2>
              <a
                className="font-label text-xs uppercase tracking-widest flex items-center gap-1"
                style={{ color: colors.onSurfaceVariant }}
                href="#"
              >
                View Index <ArrowRight size={14} />
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={border}>
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search title, location, description..."
                className="px-4 py-3 bg-transparent text-sm focus:outline-none md:col-span-1"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 bg-transparent text-sm focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="Searching">Searching</option>
                <option value="Match Found">Match Found</option>
                <option value="Reunited">Reunited</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 bg-transparent text-sm focus:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
              </select>
            </div>
            <div className="flex flex-col gap-12">
              {isLoading ? (
                <p className="text-base font-light" style={{ color: colors.onSurfaceVariant }}>
                  Loading the collection...
                </p>
              ) : items.length === 0 ? (
                <p className="text-base font-light" style={{ color: colors.onSurfaceVariant }}>
                  No reports have been submitted yet.
                </p>
              ) : items.map((item, idx) => (
                <article key={item.id} className="group flex flex-col sm:flex-row gap-8 items-start">
                  <div
                    className="w-full sm:w-1/2 aspect-[4/3] relative overflow-hidden hover-lift"
                    style={{ backgroundColor: colors.surfaceContainerLow }}
                  >
                    {item.image ? (
                      <img alt={item.title} className="w-full h-full object-cover" src={item.image} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={32} style={{ color: colors.outline }} />
                      </div>
                    )}
                  </div>
                  <div className="w-full sm:w-1/2 flex flex-col pt-2">
                    <div className="flex items-center gap-3 mb-4">
                      <ReportTypeBadge type={item.type || "lost"} />
                      <StatusBadge status={item.status} />
                      <span className="font-label text-xs uppercase tracking-widest" style={{ color: colors.onSurfaceVariant }}>
                        No. {String(idx + 1).padStart(3, "0")}
                      </span>
                    </div>
                    {matches[item.id]?.length > 0 && (
                      <div className="p-4 mb-5" style={{ ...border, backgroundColor: colors.surfaceContainerLow }}>
                        <p className="font-label text-xs uppercase tracking-widest mb-2" style={{ color: colors.primaryContainer }}>
                          Potential match found
                        </p>
                        <p className="text-sm" style={{ color: colors.onSurfaceVariant }}>
                          {matches[item.id][0].title} · {matches[item.id][0].location}
                        </p>
                      </div>
                    )}
                    <h3 className="font-display text-xl mb-2 font-normal">{item.title}</h3>
                    <p
                      className="font-label text-xs uppercase tracking-widest flex items-center gap-1 mb-4"
                      style={{ color: colors.onSurfaceVariant }}
                    >
                      <MapPin size={14} /> {item.location}
                    </p>
                    {item.status === "Match Found" ? (
                      <div className="p-4 mb-6" style={{ ...border, backgroundColor: `${colors.surfaceContainerLow}80` }}>
                        <p className="text-sm italic font-light">{item.description}</p>
                      </div>
                    ) : (
                      <p className="text-base leading-relaxed mb-6 font-light" style={{ color: colors.onSurfaceVariant }}>
                        {item.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-5">
                      <button
                        type="button"
                        onClick={() => loadMatches(item)}
                        className="font-label text-xs uppercase tracking-widest pb-1"
                        style={{ color: colors.primaryContainer, borderBottom: `1px solid ${colors.primaryContainer}` }}
                      >
                        Find Matches
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="font-label text-xs uppercase tracking-widest pb-1 flex items-center gap-1"
                        style={{ color: colors.onSurface, borderBottom: `1px solid ${colors.onSurface}` }}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <a
                        className="font-label text-xs uppercase tracking-widest pb-1 self-start transition-colors"
                        style={{
                          color: item.status === "Match Found" ? colors.primaryContainer : colors.onSurface,
                          borderBottom: `1px solid ${item.status === "Match Found" ? colors.primaryContainer : colors.onSurface}`,
                        }}
                        href="#"
                      >
                        {item.status === "Match Found" ? "Examine Correlation" : "Review Details"}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingItemId === item.id}
                        className="font-label text-xs uppercase tracking-widest pb-1 flex items-center gap-1 disabled:opacity-40"
                        style={{ color: "#a33a3a", borderBottom: "1px solid #a33a3a" }}
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 size={14} />
                        {deletingItemId === item.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between pt-2" style={borderT}>
                <span className="text-sm" style={{ color: colors.onSurfaceVariant }}>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                    className="px-4 py-2 font-label text-xs uppercase tracking-widest disabled:opacity-40"
                    style={border}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    className="px-4 py-2 font-label text-xs uppercase tracking-widest disabled:opacity-40"
                    style={{ backgroundColor: colors.onSurface, color: colors.surface }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-8">
            <div className="p-6 flex flex-col gap-6" style={border}>
              <h2 className="font-display text-xl font-normal pb-4" style={borderB}>
                Curated Discoveries
              </h2>
              <div className="flex flex-col gap-6">
                {discoveries.map((d) => (
                  <div key={d.id} className="flex gap-4 items-start group cursor-pointer">
                    <div
                      className="w-20 h-20 overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: colors.surfaceContainerLow }}
                    >
                      <ImageIcon size={22} style={{ color: colors.outline }} />
                    </div>
                    <div className="flex-grow pt-1">
                      <h4 className="font-display text-base font-normal">{d.title}</h4>
                      <p className="font-label text-xs uppercase tracking-widest mt-2" style={{ color: colors.onSurfaceVariant }}>
                        {d.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 flex flex-col items-start gap-4" style={{ backgroundColor: colors.surfaceContainerLow }}>
              <h4 className="font-display text-xl font-normal">Contribute to the Archive</h4>
              <p className="text-sm font-light" style={{ color: colors.onSurfaceVariant }}>
                Have you encountered a misplaced item? Submit a record to facilitate a reunion.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 font-label text-sm uppercase tracking-widest pb-1 transition-colors"
                style={{ borderBottom: `1px solid ${colors.onSurface}` }}
              >
                Catalog Discovery
              </button>
            </div>
          </aside>
        </div>
      </main>

      <footer className="w-full py-10 px-6 md:px-16 mt-20" style={{ ...borderT, backgroundColor: colors.surface }}>
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="font-display text-2xl font-bold tracking-tight">FoundIt.</div>
          <div className="flex flex-wrap gap-8 font-label text-xs uppercase tracking-widest">
            {["Privacy", "Terms", "Support", "Guidelines"].map((l) => (
              <a key={l} style={{ color: colors.onSurfaceVariant }} href="#">
                {l}
              </a>
            ))}
          </div>
          <div className="font-label text-xs uppercase tracking-widest" style={{ color: colors.onSurfaceVariant }}>
            © 2024 Editorial Recovery.
          </div>
        </div>
      </footer>
    </div>
  );
}