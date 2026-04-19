"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, X, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  role: string;
  code: string | null;
  created_at: string;
};

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

  useEffect(() => {
    void fetchProfiles(currentPage);
  }, [currentPage]);

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
      setProfiles(Array.isArray(data) ? data : []);
      setTotalProfiles(data.length);
      setTotalPages(Math.ceil(data.length / pageSize));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
    setShowPasswordModal(true);
    setAdminEmail("");
    setAdminPassword("");
    setPasswordError(null);
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
      const updateRes = await fetch(`/api/profiles/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, code: editCode || null }),
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEdit(profile)}
                                className="dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Pencil className="w-4 h-4 mr-1" /> Update
                              </Button>
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
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value)}
                                    placeholder="e.g. ASB-DL-001"
                                    className="h-10 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                                  />
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
              
                {/* PAGINATION CONTROLS */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-slate-600 dark:text-slate-400">
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => goToPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={currentPage === pageNum ? "default" : "outline"}
                          onClick={() => goToPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() => goToPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
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
                      if (e.key === "Enter") handleConfirmUpdate();
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
                    onClick={handleConfirmUpdate}
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
                        Confirm & Save
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