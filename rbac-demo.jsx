import { useState, useCallback } from "react";

// ─── Permission Matrix ───────────────────────────────────────────────────────
const ROLES = ["super_admin", "moderator", "regular_user", "guest"];

const ROLE_LABELS = {
  super_admin: "Super Admin",
  moderator: "Moderator",
  regular_user: "Regular User",
  guest: "Guest",
};

const ROLE_COLORS = {
  super_admin: { bg: "#7C3AED", light: "#EDE9FE", text: "#4C1D95" },
  moderator: { bg: "#0369A1", light: "#E0F2FE", text: "#0C4A6E" },
  regular_user: { bg: "#065F46", light: "#D1FAE5", text: "#064E3B" },
  guest: { bg: "#78716C", light: "#F5F5F4", text: "#44403C" },
};

const ROLE_BADGES = {
  super_admin: "◈ SA",
  moderator: "⬡ MOD",
  regular_user: "◎ USER",
  guest: "◌ GUEST",
};

function can(action, actor, target = null) {
  const role = actor.role;
  switch (action) {
    case "create_post":
      return role === "regular_user" || role === "moderator" || role === "super_admin";
    case "edit_post":
      if (role === "super_admin") return true;
      return target?.authorId === actor.id;
    case "delete_post":
      if (role === "super_admin" || role === "moderator") return true;
      return target?.authorId === actor.id;
    case "create_comment":
      return role !== "guest";
    case "delete_comment":
      if (role === "super_admin" || role === "moderator") return true;
      if (target?.authorId === actor.id) return true; // own comment
      if (target?.postAuthorId === actor.id) return true; // post owner
      return false;
    case "manage_users":
      return role === "super_admin";
    default:
      return false;
  }
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_USERS = [
  { id: "u1", name: "Alice", role: "super_admin", avatar: "A" },
  { id: "u2", name: "Bob", role: "moderator", avatar: "B" },
  { id: "u3", name: "Carol", role: "regular_user", avatar: "C" },
  { id: "u4", name: "Dan", role: "regular_user", avatar: "D" },
  { id: "u5", name: "Eve", role: "guest", avatar: "E" },
];

let _postId = 10;
let _commentId = 100;

const SEED_POSTS = [
  {
    id: "p1",
    authorId: "u3",
    title: "Getting started with React",
    body: "React is a JavaScript library for building user interfaces...",
    comments: [
      { id: "c1", postId: "p1", postAuthorId: "u3", authorId: "u4", text: "Great intro, Carol!" },
      { id: "c2", postId: "p1", postAuthorId: "u3", authorId: "u2", text: "Well written post." },
    ],
  },
  {
    id: "p2",
    authorId: "u4",
    title: "Why I love TypeScript",
    body: "TypeScript adds static typing to JavaScript, catching errors early...",
    comments: [
      { id: "c3", postId: "p2", postAuthorId: "u4", authorId: "u3", text: "Totally agree!" },
    ],
  },
];

// ─── Components ───────────────────────────────────────────────────────────────
function Badge({ role }) {
  const c = ROLE_COLORS[role];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: c.light, color: c.text, border: `1.5px solid ${c.bg}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.04em", fontFamily: "monospace",
    }}>
      {ROLE_BADGES[role]}
    </span>
  );
}

function Avatar({ user, size = 32 }) {
  const c = ROLE_COLORS[user.role];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.bg, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.4, flexShrink: 0,
      border: `2px solid ${c.light}`,
    }}>
      {user.avatar}
    </div>
  );
}

function ActionBtn({ label, icon, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
        border: disabled ? "1.5px solid #E2E8F0" : `1.5px solid ${danger ? "#FCA5A5" : "#CBD5E1"}`,
        background: disabled ? "#F8FAFC" : danger ? "#FFF5F5" : "#F8FAFC",
        color: disabled ? "#CBD5E1" : danger ? "#DC2626" : "#475569",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
      }}
      title={disabled ? "You don't have permission for this action" : undefined}
    >
      <span style={{ fontSize: 13 }}>{icon}</span> {label}
    </button>
  );
}

function Toast({ msg, onClose }) {
  if (!msg) return null;
  const isErr = msg.startsWith("✗");
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 1000,
      background: isErr ? "#FEF2F2" : "#F0FDF4",
      border: `1.5px solid ${isErr ? "#FCA5A5" : "#86EFAC"}`,
      color: isErr ? "#991B1B" : "#166534",
      borderRadius: 10, padding: "12px 18px", fontWeight: 600, fontSize: 13,
      boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
      display: "flex", alignItems: "center", gap: 10,
      maxWidth: 320,
    }}>
      {msg}
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit", lineHeight: 1 }}>✕</button>
    </div>
  );
}

function PermMatrix() {
  const rows = [
    ["Create post", (r) => can("create_post", { role: r })],
    ["Edit own post", (r) => can("edit_post", { role: r, id: "x" }, { authorId: "x" })],
    ["Delete own post", (r) => can("delete_post", { role: r, id: "x" }, { authorId: "x" })],
    ["Delete any post", (r) => can("delete_post", { role: r, id: "y" }, { authorId: "z" })],
    ["Create comment", (r) => can("create_comment", { role: r })],
    ["Delete own comment", (r) => can("delete_comment", { role: r, id: "x" }, { authorId: "x", postAuthorId: "z" })],
    ["Delete comment on own post", (r) => can("delete_comment", { role: r, id: "x" }, { authorId: "z", postAuthorId: "x" })],
    ["Delete any comment", (r) => can("delete_comment", { role: r, id: "y" }, { authorId: "a", postAuthorId: "b" })],
    ["Manage users", (r) => can("manage_users", { role: r })],
  ];

  return (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#64748B", borderBottom: "2px solid #E2E8F0" }}>Permission</th>
            {ROLES.map(r => (
              <th key={r} style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>
                <Badge role={r} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, check], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
              <td style={{ padding: "7px 12px", color: "#374151", fontWeight: 500, borderBottom: "1px solid #F1F5F9" }}>{label}</td>
              {ROLES.map(r => {
                const ok = check(r);
                return (
                  <td key={r} style={{ textAlign: "center", borderBottom: "1px solid #F1F5F9", padding: "7px 10px" }}>
                    {ok
                      ? <span style={{ color: "#16A34A", fontSize: 16 }}>✓</span>
                      : <span style={{ color: "#D1D5DB", fontSize: 14 }}>—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [users] = useState(SEED_USERS);
  const [posts, setPosts] = useState(SEED_POSTS);
  const [activeUserId, setActiveUserId] = useState("u3");
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("feed"); // feed | matrix
  const [newPost, setNewPost] = useState({ title: "", body: "" });
  const [newComments, setNewComments] = useState({}); // postId → text
  const [expandedPosts, setExpandedPosts] = useState({ p1: true, p2: true });

  const actor = users.find(u => u.id === activeUserId);
  const getUserById = (id) => users.find(u => u.id === id);

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleCreatePost = () => {
    if (!can("create_post", actor)) return notify("✗ You don't have permission to create posts.");
    if (!newPost.title.trim()) return notify("✗ Title cannot be empty.");
    const post = {
      id: `p${_postId++}`,
      authorId: actor.id,
      title: newPost.title.trim(),
      body: newPost.body.trim() || "(No body)",
      comments: [],
    };
    setPosts(p => [post, ...p]);
    setNewPost({ title: "", body: "" });
    notify("✓ Post created successfully.");
  };

  const handleDeletePost = (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!can("delete_post", actor, post)) return notify("✗ You don't have permission to delete this post.");
    setPosts(p => p.filter(x => x.id !== postId));
    notify("✓ Post deleted.");
  };

  const handleAddComment = (postId) => {
    const text = (newComments[postId] || "").trim();
    if (!can("create_comment", actor)) return notify("✗ You don't have permission to comment.");
    if (!text) return notify("✗ Comment cannot be empty.");
    const post = posts.find(p => p.id === postId);
    const comment = {
      id: `c${_commentId++}`,
      postId,
      postAuthorId: post.authorId,
      authorId: actor.id,
      text,
    };
    setPosts(p => p.map(x => x.id === postId ? { ...x, comments: [...x.comments, comment] } : x));
    setNewComments(c => ({ ...c, [postId]: "" }));
    notify("✓ Comment added.");
  };

  const handleDeleteComment = (postId, comment) => {
    if (!can("delete_comment", actor, comment)) return notify("✗ You don't have permission to delete this comment.");
    setPosts(p => p.map(x => x.id === postId ? { ...x, comments: x.comments.filter(c => c.id !== comment.id) } : x));
    notify("✓ Comment deleted.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#1E293B", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.2)" }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
          <span style={{ color: "#818CF8" }}>◈</span> RBAC Demo
        </span>
        <span style={{ color: "#475569", fontSize: 13 }}>Role-Based Access Control</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* User Switcher */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", marginBottom: 12, textTransform: "uppercase" }}>
            Active User — acting as…
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {users.map(u => {
              const active = u.id === activeUserId;
              const c = ROLE_COLORS[u.role];
              return (
                <button
                  key={u.id}
                  onClick={() => setActiveUserId(u.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                    border: active ? `2px solid ${c.bg}` : "2px solid #E2E8F0",
                    background: active ? c.light : "#FAFAFA",
                    transition: "all 0.15s", outline: "none",
                  }}
                >
                  <Avatar user={u} size={28} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{u.name}</div>
                    <Badge role={u.role} />
                  </div>
                </button>
              );
            })}
          </div>
          {actor && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, color: "#475569" }}>
              <strong style={{ color: "#1E293B" }}>{actor.name}</strong> can:
              {" "}{can("create_post", actor) && <span style={{ color: "#059669" }}>create posts · </span>}
              {can("create_comment", actor) && <span style={{ color: "#059669" }}>comment · </span>}
              {can("delete_post", actor, { authorId: "other" }) && <span style={{ color: "#7C3AED" }}>delete any post · </span>}
              {can("delete_comment", actor, { authorId: "other", postAuthorId: "other2" }) && <span style={{ color: "#7C3AED" }}>delete any comment · </span>}
              {can("manage_users", actor) && <span style={{ color: "#DC2626" }}>manage users · </span>}
              {!can("create_post", actor) && !can("create_comment", actor) && <span style={{ color: "#94A3B8" }}>read-only access</span>}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {[["feed", "📋 Feed"], ["matrix", "🔐 Permission Matrix"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1.5px solid " + (tab === key ? "#6366F1" : "#E2E8F0"),
              background: tab === key ? "#EEF2FF" : "#fff",
              color: tab === key ? "#4338CA" : "#64748B",
            }}>{label}</button>
          ))}
        </div>

        {tab === "matrix" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>Permission Matrix</div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>What each role is allowed to do in the system.</div>
            <PermMatrix />
          </div>
        )}

        {tab === "feed" && (
          <>
            {/* Create Post */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>New Post</div>
              <input
                placeholder="Post title…"
                value={newPost.title}
                onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                disabled={!can("create_post", actor)}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                  border: "1.5px solid #E2E8F0", marginBottom: 8, boxSizing: "border-box",
                  background: can("create_post", actor) ? "#fff" : "#F8FAFC",
                  color: can("create_post", actor) ? "#1E293B" : "#CBD5E1",
                  outline: "none",
                }}
              />
              <textarea
                placeholder="Write something…"
                value={newPost.body}
                onChange={e => setNewPost(p => ({ ...p, body: e.target.value }))}
                disabled={!can("create_post", actor)}
                rows={2}
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                  border: "1.5px solid #E2E8F0", marginBottom: 10, boxSizing: "border-box",
                  resize: "vertical", background: can("create_post", actor) ? "#fff" : "#F8FAFC",
                  color: can("create_post", actor) ? "#1E293B" : "#CBD5E1",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ActionBtn
                  label="Publish Post"
                  icon="✦"
                  onClick={handleCreatePost}
                  disabled={!can("create_post", actor)}
                />
                {!can("create_post", actor) && (
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>
                    {actor.role === "guest" ? "Guests cannot post." : "You don't have posting permission."}
                  </span>
                )}
              </div>
            </div>

            {/* Posts */}
            {posts.map(post => {
              const postAuthor = getUserById(post.authorId);
              const isExpanded = expandedPosts[post.id];
              return (
                <div key={post.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                  {/* Post header */}
                  <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {postAuthor && <Avatar user={postAuthor} size={36} />}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: "#1E293B" }}>{post.title}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 12, color: "#64748B" }}>by {postAuthor?.name}</span>
                            {postAuthor && <Badge role={postAuthor.role} />}
                            {postAuthor?.id === actor.id && <span style={{ fontSize: 11, color: "#A78BFA", fontWeight: 600 }}>· your post</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <ActionBtn
                          label="Delete"
                          icon="🗑"
                          onClick={() => handleDeletePost(post.id)}
                          disabled={!can("delete_post", actor, post)}
                          danger
                        />
                      </div>
                    </div>
                    <p style={{ margin: "10px 0 0 46px", fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{post.body}</p>
                  </div>

                  {/* Comments section */}
                  <div style={{ padding: "12px 20px" }}>
                    <button
                      onClick={() => setExpandedPosts(e => ({ ...e, [post.id]: !isExpanded }))}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#6366F1", fontWeight: 600, padding: 0, marginBottom: isExpanded ? 10 : 0 }}
                    >
                      {isExpanded ? "▾ Hide" : "▸ Show"} {post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}
                    </button>

                    {isExpanded && (
                      <>
                        {post.comments.length === 0 && (
                          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 10 }}>No comments yet.</div>
                        )}
                        {post.comments.map(comment => {
                          const commentAuthor = getUserById(comment.authorId);
                          const delAllowed = can("delete_comment", actor, comment);
                          let whyCanDelete = "";
                          if (delAllowed) {
                            if (actor.role === "super_admin") whyCanDelete = "super admin";
                            else if (actor.role === "moderator") whyCanDelete = "moderator";
                            else if (comment.authorId === actor.id) whyCanDelete = "own comment";
                            else if (comment.postAuthorId === actor.id) whyCanDelete = "post owner";
                          }
                          return (
                            <div key={comment.id} style={{
                              display: "flex", alignItems: "flex-start", gap: 8,
                              padding: "8px 12px", borderRadius: 8,
                              background: "#F8FAFC", marginBottom: 6, border: "1px solid #F1F5F9",
                            }}>
                              {commentAuthor && <Avatar user={commentAuthor} size={26} />}
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{commentAuthor?.name}</span>
                                  {commentAuthor && <Badge role={commentAuthor.role} />}
                                  {commentAuthor?.id === actor.id && <span style={{ fontSize: 11, color: "#A78BFA", fontWeight: 600 }}>· yours</span>}
                                </div>
                                <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{comment.text}</div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                <ActionBtn
                                  label="Delete"
                                  icon="🗑"
                                  onClick={() => handleDeleteComment(post.id, comment)}
                                  disabled={!delAllowed}
                                  danger
                                />
                                {delAllowed && (
                                  <span style={{ fontSize: 10, color: "#94A3B8" }}>via {whyCanDelete}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add comment */}
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <input
                            placeholder={can("create_comment", actor) ? "Add a comment…" : "Sign in to comment"}
                            value={newComments[post.id] || ""}
                            onChange={e => setNewComments(c => ({ ...c, [post.id]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && handleAddComment(post.id)}
                            disabled={!can("create_comment", actor)}
                            style={{
                              flex: 1, padding: "7px 12px", borderRadius: 8, fontSize: 13,
                              border: "1.5px solid #E2E8F0",
                              background: can("create_comment", actor) ? "#fff" : "#F8FAFC",
                              color: can("create_comment", actor) ? "#1E293B" : "#CBD5E1",
                              outline: "none",
                            }}
                          />
                          <ActionBtn
                            label="Post"
                            icon="↵"
                            onClick={() => handleAddComment(post.id)}
                            disabled={!can("create_comment", actor)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Legend */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>Delete Comment Rules</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {[
              ["◈ Super Admin", "Can delete any comment", "#7C3AED"],
              ["⬡ Moderator", "Can delete any comment", "#0369A1"],
              ["◎ Post Owner", "Can delete comments on their own posts", "#065F46"],
              ["◎ Comment Author", "Can delete their own comments", "#065F46"],
              ["◌ Other Users", "Cannot delete others' comments", "#78716C"],
            ].map(([who, rule, color]) => (
              <div key={who} style={{ padding: "8px 10px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #F1F5F9", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color, marginBottom: 2 }}>{who}</div>
                <div style={{ color: "#64748B" }}>{rule}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Toast msg={toast} onClose={() => setToast(null)} />
    </div>
  );
}
