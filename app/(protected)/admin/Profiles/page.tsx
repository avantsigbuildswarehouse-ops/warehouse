"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X, ShieldCheck, Loader2, CheckCircle2, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PaginationControls from "@/components/ui/pagination-controls";
import type { PartnerCodeOption, ProfileRecord } from "@/types/admin";

type Profile = ProfileRecord;

const ROLES = [
  "admin",
  "dealer-admin",
  "dealer-finance",
  "showroom-admin",
  "showroom-finance",
];

const roleBadgeColor: Record<string, string> = {
  admin: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "dealer-admin": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "dealer-finance": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  "showroom-admin": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "showroom-finance": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const pageSize = 10;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editCode, setEditCode] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [codeOptions, setCodeOptions] = useState<PartnerCodeOption[]>([]);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("dealer-admin");
  const [createCode, setCreateCode] = useState("");
  const [pendingAction, setPendingAction] = useState<"update" | "create" | "delete" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchProfiles(currentPage);
  }, [currentPage]);

  useEffect(() => {
    async function loadCodeOptions() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? null;
        const res = await fetch("/api/profiles/options", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json();
        setCodeOptions([...(data.dealers ?? []), ...(data.showrooms ?? [])]);
      } catch (error) {
        console.error(error);
      }
    }

    void loadCodeOptions();
  }, []);

  async function fetchProfiles(page: number = 1) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No session found');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/profiles?page=${page}&limit=${pageSize}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const total = Number(data?.pagination?.total ?? items.length);
      const pages = Number(data?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / pageSize)));
      setProfiles(items);
      setTotalProfiles(total);
      setTotalPages(Math.max(1, pages));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function getAccessToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      void fetchProfiles(page);
    }
  }

  function openEdit(profile: Profile) {
    setEditingId(profile.id);
    setEditRole(profile.role ?? "admin");
    setEditCode(profile.code ?? "");
    setSuccessId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRole("");
    setEditCode("");
  }

  function handleSubmitEdit() {
    setPendingAction("update");
    setShowPasswordModal(true);
    setAdminEmail("");
    setAdminPassword("");
    setPasswordError(null);
  }

  function handleSubmitCreate() {
    setPendingAction("create");
    setShowPasswordModal(true);
    setAdminEmail("");
    setAdminPassword("");
    setPasswordError(null);
  }

  function handleSubmitDelete(profile: Profile) {
    setPendingAction("delete");
    setDeletingId(profile.id);
    setShowPasswordModal(true);
    setAdminEmail("");
    setAdminPassword("");
    setPasswordError(null);
  }

  async function handleConfirmCreate() {
    setSaving(true);
    setPasswordError(null);

    try {
      const token = await getAccessToken();
      const createRes = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          role: createRole,
          code: createCode || null,
          adminEmail,
          adminPassword,
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        setPasswordError(createData.error ?? "Profile creation failed.");
        return;
      }

      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("dealer-admin");
      setCreateCode("");
      setShowPasswordModal(false);
      setPendingAction(null);
      await fetchProfiles(currentPage);
    } catch (err) {
      console.error("Create profile error:", err);
      setPasswordError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;

    setSaving(true);
    setPasswordError(null);

    try {
      const token = await getAccessToken();
      const deleteRes = await fetch(`/api/profiles/${deletingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ adminEmail, adminPassword }),
      });
      const deleteData = await deleteRes.json();

      if (!deleteRes.ok) {
        setPasswordError(deleteData.error ?? "Delete failed.");
        return;
      }

      setProfiles((prev) => prev.filter((profile) => profile.id !== deletingId));
      setDeletingId(null);
      setShowPasswordModal(false);
      setPendingAction(null);
      await fetchProfiles(currentPage);
    } catch (err) {
      console.error("Delete profile error:", err);
      setPasswordError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmUpdate() {
    setVerifying(true);
    setPasswordError(null);

    try {
      const verifyRes = await fetch("/api/profiles/verify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setPasswordError(verifyData.error ?? "Invalid credentials");
        setVerifying(false);
        return;
      }

      setSaving(true);
      const token = await getAccessToken();
      const updateRes = await fetch(`/api/profiles/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: editRole,
          code: editCode || null,
          adminEmail,
          adminPassword,
        }),
      });

      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        setPasswordError(updateData.error ?? "Update failed. Please try again.");
        setVerifying(false);
        setSaving(false);
        return;
      }

      const updatedId = editingId!;
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === updatedId
            ? { ...p, role: editRole, code: editCode || null }
            : p
        )
      );

      setShowPasswordModal(false);
      setPendingAction(null);
      setSuccessId(updatedId);
      setEditingId(null);
      setEditRole("");
      setEditCode("");

      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error("Update error:", err);
      setPasswordError("Something went wrong.");
    } finally {
      setVerifying(false);
      setSaving(false);
    }
  }

  function confirmPendingAction() {
    if (pendingAction === "create") {
      void handleConfirmCreate();
      return;
    }

    if (pendingAction === "delete") {
      void handleConfirmDelete();
      return;
    }

    void handleConfirmUpdate();
  }

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">

        {/* HEADER */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">
                User Profiles
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage user roles and codes
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {totalProfiles || profiles.length} users
            </Badge>
          </div>
        </div>

        <Card className="dark:bg-slate-900/60 dark:border-white/10">
          <CardHeader>
            <CardTitle className="dark:text-white">Create Profile</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Add a Supabase Auth user without sending verification email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={createEmail}
                  onChange={(event) => setCreateEmail(event.target.value)}
                  placeholder="user@gmail.com"
                  className="dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                  className="dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  value={createRole}
                  onChange={(event) => setCreateRole(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Dealer / Showroom Code</Label>
                <select
                  value={createCode}
                  onChange={(event) => setCreateCode(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                >
                  <option value="">No code</option>
                  {codeOptions.map((option) => (
                    <option key={`${option.type}-${option.code}`} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              className="mt-4"
              onClick={handleSubmitCreate}
              disabled={!createEmail || !createPassword || !createRole}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Profile
            </Button>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card className="dark:bg-slate-900/60 dark:border-white/10">
          <CardHeader>
            <CardTitle className="dark:text-white">All Profiles</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Click Update to change a user&apos;s role or code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading profiles...
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="text-left p-3 font-medium dark:text-slate-300">Email</th>
                      <th className="text-left p-3 font-medium dark:text-slate-300">Role</th>
                      <th className="text-left p-3 font-medium dark:text-slate-300">Code</th>
                      <th className="text-left p-3 font-medium dark:text-slate-300">Created</th>
                      <th className="text-left p-3 font-medium dark:text-slate-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile) => (
                      <React.Fragment key={profile.id}>

                        {/* Main row */}
                        <tr className={`border-t dark:border-white/10 transition-colors duration-500 ${
                          successId === profile.id
                            ? "bg-emerald-50 dark:bg-emerald-950/40"
                            : "bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        }`}>
                          <td className="p-3 text-slate-800 dark:text-slate-200">
                            {profile.email}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              roleBadgeColor[profile.role] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {profile.role}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                            {profile.code ?? "—"}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">
                            {new Date(profile.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {successId === profile.id ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                Updated
                              </span>
                            ) : editingId === profile.id ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                              >
                                <X className="w-4 h-4 mr-1" /> Cancel
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEdit(profile)}
                                  className="dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  <Pencil className="w-4 h-4 mr-1" /> Update
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleSubmitDelete(profile)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Inline edit row */}
                        {editingId === profile.id && (
                          <tr className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40">
                            <td colSpan={5} className="p-4">
                              <div className="flex flex-wrap gap-4 items-end">
                                <div className="space-y-1.5 w-52">
                                  <Label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Role
                                  </Label>
                                  <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                                  >
                                    {ROLES.map((r) => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1.5 w-52">
                                  <Label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Code
                                  </Label>
                                  <Input
                                    list="profile-code-options"
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value)}
                                    placeholder="e.g. ASB-DL-001"
                                    className="h-10 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                                  />
                                  <datalist id="profile-code-options">
                                    {codeOptions.map((option) => (
                                      <option
                                        key={`${option.type}-${option.code}`}
                                        value={option.code}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </datalist>
                                </div>

                                <Button onClick={handleSubmitEdit} className="h-10">
                                  <ShieldCheck className="w-4 h-4 mr-2" />
                                  Save Changes
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )}

                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  totalItemsLabel={`${totalProfiles} total users`}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ADMIN PASSWORD MODAL */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold dark:text-white">
                    Confirm Admin Identity
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Enter your admin credentials to apply this change.
                  </p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Admin Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Admin Password
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmPendingAction();
                    }}
                  />
                </div>

                {passwordError && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {passwordError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 dark:border-white/10 dark:text-white dark:hover:bg-slate-800"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={confirmPendingAction}
                    disabled={verifying || saving || !adminEmail || !adminPassword}
                  >
                    {verifying || saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {saving ? "Saving..." : "Verifying..."}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {pendingAction === "create"
                          ? "Confirm & Create"
                          : pendingAction === "delete"
                            ? "Confirm & Delete"
                            : "Confirm & Save"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
