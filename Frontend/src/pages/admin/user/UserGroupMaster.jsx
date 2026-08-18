import React, { useEffect, useState, useMemo } from "react";
import { getUserTypes, updateUserType, deleteUserType } from "../../../api/userTypeMasterApi";
import DataTable from "../../../components/DataTable";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { usePermission } from "../../../context/PermissionContext";

// ─── Constants ───────────────────────────────────────────────────────────────
const PERMISSION_SECTIONS = [
  {
    title: "User Management",
    masters: [
      { key: "user_type", label: "User Type Master" },
      { key: "user_master", label: "User Master" },
      { key: "device_approval", label: "Device Approval" },
      { key: "activity_report", label: "Activity Report" },
    ]
  }
];

const MASTERS = PERMISSION_SECTIONS.flatMap(s => s.masters);
const PERMS = ["canRead", "canWrite", "canUpdate", "canDelete"];
const PERM_LABELS = { canRead: "Read", canWrite: "Write / Approval", canUpdate: "Update", canDelete: "Delete" };
const PERM_COLORS = {
  canRead: { bg: "#ebf2fa", border: "#bcccdc", text: "#1e3a8a", check: "#1e3a8a" },
  canWrite: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", check: "#16a34a" },
  canUpdate: { bg: "#fffbeb", border: "#fde68a", text: "#b45309", check: "#d97706" },
  canDelete: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c", check: "#e11d48" },
};

const defaultPerms = () =>
  MASTERS.map((m) => ({ masterName: m.key, canRead: false, canWrite: false, canUpdate: false, canDelete: false }));

const buildPermsFromApi = (apiPerms) => {
  if (!apiPerms || apiPerms.length === 0) return defaultPerms();
  return MASTERS.map((m) => {
    const found = apiPerms.find((p) => p.masterName === m.key);
    const isApprovalRow = m.key.endsWith("_approval");
    if (found) {
      return {
        masterName: m.key,
        canRead: !!found.canRead,
        canWrite: !!found.canWrite,
        canUpdate: isApprovalRow ? false : !!found.canUpdate,
        canDelete: isApprovalRow ? false : !!found.canDelete
      };
    }
    return { masterName: m.key, canRead: false, canWrite: false, canUpdate: false, canDelete: false };
  });
};

// ─── Checkbox Cell ───────────────────────────────────────────────────────────
function CheckCell({ checked, color, onChange }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 22, height: 22, borderRadius: 6,
        border: `2px solid ${checked ? color.check : "#cbd5e1"}`,
        background: checked ? color.check : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s",
        margin: "0 auto",
        boxShadow: checked ? `0 0 0 3px ${color.bg}` : "none",
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 10" style={{ width: 11, height: 11 }}>
          <polyline points="1,5 4.5,8.5 11,1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ─── Permissions Badge (inline in list) ──────────────────────────────────────
function PermBadges({ permissions }) {
  if (!permissions || permissions.length === 0)
    return <span style={{ color: "#94a3b8", fontSize: 12 }}>No permissions set</span>;

  // Only show masters that have at least one permission granted
  const rows = MASTERS.map((m) => {
    const p = permissions.find((x) => x.masterName === m.key);
    if (!p) return null;
    const isApprovalRow = m.key.endsWith("_approval");
    const applicablePerms = isApprovalRow ? ["canRead", "canWrite"] : PERMS;
    const granted = applicablePerms.filter((perm) => p[perm]);
    if (granted.length === 0) return null;
    return { label: m.label, granted, isApprovalRow };
  }).filter(Boolean);

  if (rows.length === 0)
    return <span style={{ color: "#94a3b8", fontSize: 12 }}>No access</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {rows.map(({ label, granted, isApprovalRow }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {/* Master label */}
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#475569",
            background: "#f1f5f9", border: "1px solid #e2e8f0",
            borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap"
          }}>
            {label}
          </span>
          <span style={{ color: "#cbd5e1", fontSize: 11 }}>→</span>
          {/* Permission badges for this master */}
          {granted.map((perm) => {
            const c = PERM_COLORS[perm];
            const labelText = isApprovalRow && perm === "canWrite" ? "Approval" : PERM_LABELS[perm];
            return (
              <span key={perm} style={{
                fontSize: 10, fontWeight: 700, padding: "2px 7px",
                borderRadius: 5, background: c.bg, color: c.text, border: `1px solid ${c.border}`
              }}>
                {labelText}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────
function EditForm({ row, onClose, onSave, saving }) {
  const [typeName, setTypeName] = useState(row.type_name || "");
  const [permissions, setPermissions] = useState(buildPermsFromApi(row.permissions));

  const togglePerm = (masterKey, perm) =>
    setPermissions((prev) => prev.map((p) => p.masterName === masterKey ? { ...p, [perm]: !p[perm] } : p));

  const toggleRow = (masterKey) => {
    const isApprovalRow = masterKey.endsWith("_approval");
    const r = permissions.find((p) => p.masterName === masterKey);
    const applicablePerms = isApprovalRow ? ["canRead", "canWrite"] : PERMS;
    const all = applicablePerms.every((perm) => r[perm]);
    setPermissions((prev) => prev.map((p) => p.masterName === masterKey
      ? {
          ...p,
          canRead: !all,
          canWrite: !all,
          canUpdate: isApprovalRow ? false : !all,
          canDelete: isApprovalRow ? false : !all
        } : p));
  };

  const toggleColumn = (perm) => {
    const all = permissions.every((p) => p[perm]);
    setPermissions((prev) => prev.map((p) => {
      const isApprovalRow = p.masterName.endsWith("_approval");
      if (isApprovalRow && (perm === "canUpdate" || perm === "canDelete")) {
        return { ...p, [perm]: false };
      }
      return { ...p, [perm]: !all };
    }));
  };

  const toggleAll = () => {
    const all = permissions.every((p) => {
      const isApprovalRow = p.masterName.endsWith("_approval");
      const applicablePerms = isApprovalRow ? ["canRead", "canWrite"] : PERMS;
      return applicablePerms.every((perm) => p[perm]);
    });
    setPermissions((prev) => prev.map((p) => {
      const isApprovalRow = p.masterName.endsWith("_approval");
      return {
        ...p,
        canRead: !all,
        canWrite: !all,
        canUpdate: isApprovalRow ? false : !all,
        canDelete: isApprovalRow ? false : !all
      };
    }));
  };

  const isRowAll = (masterKey) => {
    const isApprovalRow = masterKey.endsWith("_approval");
    const r = permissions.find((p) => p.masterName === masterKey);
    const applicablePerms = isApprovalRow ? ["canRead", "canWrite"] : PERMS;
    return applicablePerms.every((perm) => r[perm]);
  };

  const isColAll = (perm) => permissions.every((p) => {
    const isApprovalRow = p.masterName.endsWith("_approval");
    if (isApprovalRow && (perm === "canUpdate" || perm === "canDelete")) {
      return true;
    }
    return p[perm];
  });

  const isAllAll = () => permissions.every((p) => {
    const isApprovalRow = p.masterName.endsWith("_approval");
    const applicablePerms = isApprovalRow ? ["canRead", "canWrite"] : PERMS;
    return applicablePerms.every((perm) => p[perm]);
  });

  return (
    <div className="flex flex-col flex-1 font-sans" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%)" }}>

      <main className="flex-1 flex flex-col w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 m-0">Edit User Type</h1>
            <p className="text-slate-500 mt-1 text-sm">Update the user group name and its module permissions.</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-slate-500 bg-transparent border-none cursor-pointer text-sm font-medium hover:text-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to User Types
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(row.id, typeName, permissions); }}>

          {/* Type Name Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 shadow-sm">
            <label className="block text-[13px] font-semibold text-slate-600 mb-2 uppercase tracking-[0.05em]">
              User Type Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Supervisor, Technician, Manager"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              required
              className="w-full box-border border-[1.5px] border-slate-300 rounded-[9px] py-[11px] px-[14px] text-[15px] outline-none text-slate-800 transition-[border-color] duration-200 focus:border-blue-600"
            />
          </div>

          {/* Permissions Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-[18px]">
              <div>
                <h2 className="text-[15px] font-bold text-slate-800 m-0">Module Permissions</h2>
                <p className="text-[13px] text-slate-400 mt-1 mb-0">Set read, write, update and delete access per master module.</p>
              </div>
              <button
                type="button"
                onClick={toggleAll}
                 className={`text-xs font-semibold py-1.5 px-3.5 rounded-lg cursor-pointer border-[1.5px] border-[#1e3a8a] transition-all duration-200 ${isAllAll() ? "bg-[#1e3a8a] text-white" : "bg-[#e6ebf0] text-[#1e3a8a]"}`}
              >
                {isAllAll() ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 500 }}>
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-2.5 px-3.5 text-xs font-bold text-slate-500 uppercase tracking-[0.05em] border-b-2 border-slate-200 min-w-[160px]">
                      Master Module
                    </th>
                    {PERMS.map((perm) => {
                      const c = PERM_COLORS[perm];
                      return (
                        <th key={perm} className="text-center py-2.5 px-2 border-b-2 border-slate-200 min-w-[90px]">
                          <button
                            type="button"
                            onClick={() => toggleColumn(perm)}
                            title={`Toggle all ${PERM_LABELS[perm]}`}
                            className="inline-flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-1"
                          >
                            <span className="text-[11px] font-bold uppercase tracking-[0.06em] rounded-md px-2 py-0.5 border"
                              style={{ color: c.text, background: c.bg, borderColor: c.border }}>
                              {PERM_LABELS[perm]}
                            </span>
                            <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all duration-150 border-2"
                              style={{
                                borderColor: isColAll(perm) ? c.check : "#cbd5e1",
                                background: isColAll(perm) ? c.check : "#fff"
                              }}>
                              {isColAll(perm) && (
                                <svg viewBox="0 0 12 10" className="w-2.5 h-2.5">
                                  <polyline points="1,5 4.5,8.5 11,1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </button>
                        </th>
                      );
                    })}
                    <th className="text-center py-2.5 px-2 border-b-2 border-slate-200 min-w-[80px] text-[11px] font-bold text-slate-400 uppercase tracking-[0.05em]">
                      All
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_SECTIONS.map((section, secIdx) => (
                    <React.Fragment key={`sec-${secIdx}`}>
                       <tr style={{ background: "linear-gradient(90deg, #f8fafc 0%, #eef2ff 100%)" }}>
                        <td colSpan={6} className="py-2.5 px-3.5 text-[11px] font-extrabold text-[#1e3a8a] uppercase tracking-[0.05em] border-b border-slate-200">
                          {section.title}
                        </td>
                      </tr>
                      {section.masters.map((master, idx) => {
                        const rowData = permissions.find((p) => p.masterName === master.key);
                        const rowAll = isRowAll(master.key);
                        const isApprovalRow = master.key.endsWith("_approval");
                        const isReportRow = master.key === "activity_report" || master.key === "closed_inquiry_report";
                        return (
                          <tr
                            key={master.key}
                            className="transition-colors duration-150 hover:bg-slate-100"
                            style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa"}
                          >
                            <td className="py-3 px-3.5 text-sm font-semibold text-slate-700 border-b border-slate-50">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#1e3a8a] shrink-0" />
                                {master.label}
                              </div>
                            </td>
                            {PERMS.map((perm) => {
                              const c = PERM_COLORS[perm];
                              const checked = rowData[perm];
                              if (
                                (isApprovalRow && (perm === "canUpdate" || perm === "canDelete")) ||
                                (isReportRow && (perm === "canWrite" || perm === "canUpdate" || perm === "canDelete"))
                              ) {
                                return (
                                  <td key={perm} className="text-center py-3 px-2 border-b border-slate-50 text-slate-400">
                                    —
                                  </td>
                                );
                              }
                              return (
                                <td key={perm} className="text-center py-3 px-2 border-b border-slate-50">
                                  <div
                                    onClick={() => togglePerm(master.key, perm)}
                                    className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center cursor-pointer transition-all duration-150 mx-auto border-2"
                                    style={{
                                      borderColor: checked ? c.check : "#cbd5e1",
                                      background: checked ? c.check : "#fff",
                                      boxShadow: checked ? `0 0 0 3px ${c.bg}` : "none"
                                    }}
                                  >
                                    {checked && (
                                      <svg viewBox="0 0 12 10" className="w-[11px] h-[11px]">
                                        <polyline points="1,5 4.5,8.5 11,1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="text-center py-3 px-2 border-b border-slate-50">
                              <button
                                type="button"
                                onClick={() => toggleRow(master.key)}
                                 className={`text-[11px] font-semibold py-1 px-2.5 rounded-md cursor-pointer border-[1.5px] transition-all duration-150 ${rowAll ? "border-[#1e3a8a] bg-[#1e3a8a] text-white" : "border-slate-300 bg-slate-50 text-slate-500"}`}
                              >
                                {rowAll ? "✓ All" : "All"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2.5 mt-4 pt-3.5 border-t border-slate-50">
              {PERMS.map((perm) => {
                const c = PERM_COLORS[perm];
                return (
                  <div key={perm} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: c.check }} />
                    <span className="text-xs text-slate-500 font-medium">{PERM_LABELS[perm]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="py-2.5 px-[22px] rounded-[9px] border-[1.5px] border-slate-300 text-slate-600 bg-white font-semibold text-sm cursor-pointer transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !typeName.trim()}
              className={`py-2.5 px-7 rounded-[9px] border-none text-white font-bold text-sm transition-all duration-200 ${saving ? "bg-slate-400 cursor-not-allowed" : "cursor-pointer"}`}
              style={{
                background: saving ? undefined : "linear-gradient(135deg,#1e3a8a,#172554)",
                boxShadow: saving ? "none" : "0 2px 8px rgba(30, 58, 138, 0.35)"
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserGroupMaster() {
  const navigate = useNavigate();
  const [userTypes, setUserTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingRow, setEditingRow] = useState(null);

  const loadUserTypes = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getUserTypes();
      setUserTypes(response.data.data || []);
    } catch (err) {
      console.error("Failed to load user types", err);
      setError("Unable to load user types. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUserTypes(); }, []);

  const handleSave = async (id, typeName, permissions) => {
    if (!typeName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await updateUserType(id, { typeName: typeName.trim(), permissions });
      toast.success("User type updated successfully");
      setEditingRow(null);
      await loadUserTypes();
    } catch (err) {
      console.error("Failed to update user type", err);
      toast.error(err?.response?.data?.message || "Unable to update user type.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user type?")) return;
    setSaving(true);
    try {
      await deleteUserType(id);
      toast.success("User type deleted successfully");
      await loadUserTypes();
    } catch (err) {
      console.error("Failed to delete user type", err);
      toast.error(err?.response?.data?.message || "Unable to delete user type.");
    } finally {
      setSaving(false);
    }
  };

  const { hasPermission } = usePermission();

  const columns = useMemo(() => {
    const cols = [
      { key: "id", label: "ID", minWidth: "60px" },
      {
        key: "type_name", label: "User Type",
        render: (row) => <span style={{ fontWeight: 700 }}>{row.type_name}</span>
      },
      {
        key: "permissions", label: "Permissions",
        sortable: false,
        render: (row) => <PermBadges permissions={row.permissions} />
      }
      // {
      //   key: "created_at", label: "Added Date",
      //   render: (row) => new Date(row.created_at).toLocaleDateString()
      // },
      // {
      //   key: "added_by_name", label: "Added By",
      //   render: (row) => row.added_by_name || "Unknown"
      // },
      // {
      //   key: "device_id", label: "Device ID",
      //   render: (row) => <span style={{ fontFamily: "monospace", color: "#64748b", fontSize: "12px" }}>{row.device_id || "—"}</span>
      // }
    ];

    const canUpdate = hasPermission("user_type", "update");
    const canDelete = hasPermission("user_type", "delete");

    if (canUpdate || canDelete) {
      cols.push({
        key: "actions", label: "Actions", sortable: false, minWidth: "120px",
        render: (row) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {canUpdate && (
              <button
                onClick={() => setEditingRow(row)}
                 style={{ display: "flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #bcccdc", background: "#ebf2fa", color: "#1e3a8a", cursor: "pointer" }}
                title="Edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 15, height: 15 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931Z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(row.id)}
                style={{ display: "flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #fecdd3", background: "#fff1f2", color: "#be123c", cursor: "pointer" }}
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 15, height: 15 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0-.563 12.375A2.25 2.25 0 0113.693 21H10.307a2.25 2.25 0 01-2.244-2.125L7.5 7.5m3-3h3A1.5 1.5 0 0115 6v1.5H9V6a1.5 1.5 0 011.5-1.5Z" />
                </svg>
              </button>
            )}
          </div>
        )
      });
    }

    return cols;
  }, [saving, hasPermission]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#f8fafc", fontFamily: "'Inter',sans-serif" }}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", margin: "0 auto", padding: "32px 30px" }}>
        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
            {error}
          </div>
        )}
        {editingRow ? (
          <EditForm
            row={editingRow}
            onClose={() => setEditingRow(null)}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <DataTable
            tableId="user_group_master"
            title="User Type Master"
            data={userTypes}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search user types..."
            actionButton={
              hasPermission("user_type", "write") ? (
                <button
                  onClick={() => navigate("/admin/user-types/create")}
                   style={{ display: "flex", width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 9, background: "linear-gradient(135deg,#1e3a8a,#172554)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(30, 58, 138, 0.35)" }}
                  title="Create User Type"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              ) : null
            }
          />
        )}
      </main>
    </div>
  );
}

