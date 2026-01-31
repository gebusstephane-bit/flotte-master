"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { type Profile } from "@/lib/supabase";
import { ALL_ROLES, ROLE_LABELS, type UserRole } from "@/lib/role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Shield, AlertTriangle, LogIn, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, profile: myProfile, role, loading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("exploitation");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit role
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("exploitation");
  const [saving, setSaving] = useState(false);

  // Delete user
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // --- Fetch all profiles via server API (bypasses RLS) ---
  const fetchProfiles = useCallback(async () => {
    setFetchError(null);

    try {
      const res = await fetch("/api/admin/list-profiles", {
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json.error || `HTTP ${res.status}`;
        console.error("[ADMIN/USERS] list profiles error:", msg);
        setFetchError(msg);
        setProfiles([]);
        setLoading(false);
        return;
      }

      const list = (json.profiles ?? []) as Profile[];
      setProfiles(list);
    } catch (err: any) {
      console.error("[ADMIN/USERS] list profiles network error:", err);
      setFetchError(err?.message || "Erreur réseau");
      setProfiles([]);
    }

    setLoading(false);
  }, []);

  // --- Init: diagnostics + fetch ---
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    if (role !== "admin" && role !== "direction") {
      setLoading(false);
      return;
    }

    fetchProfiles();
  }, [authLoading, user, myProfile, role, fetchProfiles]);

  // --- Handlers ---
  const handleCreate = async () => {
    if (!email || !prenom || !nom || !password) {
      toast.error("Remplissez tous les champs");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, prenom, nom, role: newRole, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Utilisateur créé");
      setDialogOpen(false);
      setEmail("");
      setPrenom("");
      setNom("");
      setPassword("");
      setNewRole("exploitation");
      fetchProfiles();
    } catch (err: any) {
      console.error("[ADMIN/USERS] create user error:", err);
      toast.error(err.message || "Erreur création");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/update-user-role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: editRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Rôle mis à jour");
      setEditingId(null);
      fetchProfiles();
    } catch (err: any) {
      console.error("[ADMIN/USERS] update role error:", err);
      toast.error(err.message || "Erreur mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeletingUser(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Utilisateur supprimé définitivement");
      setDeleteTarget(null);
      fetchProfiles();
    } catch (err: any) {
      toast.error("Erreur de suppression", { description: err?.message });
    } finally {
      setDeletingUser(false);
    }
  };

  // --- Loading state ---
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="ml-3 text-slate-500">Vérification de la session…</p>
      </div>
    );
  }

  // --- No session ---
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-orange-500" />
        <h2 className="text-xl font-semibold text-slate-900">Session absente</h2>
        <p className="text-slate-500">Vous devez être connecté pour accéder à cette page.</p>
        <Button onClick={() => router.push("/login")}>
          <LogIn className="w-4 h-4 mr-2" />
          Se connecter
        </Button>
      </div>
    );
  }

  // --- Profile missing ---
  if (!myProfile) {
    return (
      <div className="space-y-4 max-w-lg mx-auto mt-20">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Profil introuvable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-orange-700">
            <p>
              Votre compte auth existe (<code className="bg-orange-100 px-1 rounded">{user.email}</code>)
              mais aucun profil n&apos;a été trouvé dans <code className="bg-orange-100 px-1 rounded">public.profiles</code>.
            </p>
            <p>
              Vérifiez qu&apos;une ligne existe avec <code className="bg-orange-100 px-1 rounded">id = {user.id}</code>.
            </p>
            <p className="font-medium">Ouvrez la console (F12) pour les logs détaillés.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Forbidden ---
  if (role !== "admin" && role !== "direction") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-semibold text-slate-900">Accès interdit</h2>
        <p className="text-slate-500">
          Votre rôle (<strong>{ROLE_LABELS[role] ?? role}</strong>) ne permet pas d&apos;accéder à cette page.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Retour à l&apos;accueil
        </Button>
      </div>
    );
  }

  // --- Fetch error ---
  if (fetchError) {
    return (
      <div className="space-y-4 max-w-lg mx-auto mt-20">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Erreur chargement profils
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-red-700">
            <p>{fetchError}</p>
            <p>Ouvrez la console (F12) pour les logs détaillés.</p>
            <Button variant="outline" size="sm" onClick={fetchProfiles} className="mt-2">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Loading profiles ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="ml-3 text-slate-500">Chargement des profils…</p>
      </div>
    );
  }

  // --- Main content ---
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des utilisateurs</h1>
          <p className="text-slate-600 mt-2">{profiles.length} utilisateur(s) enregistré(s)</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Créer un utilisateur</DialogTitle>
              <DialogDescription>
                Un compte Supabase Auth sera créé automatiquement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Dupont"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@entreprise.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe initial</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Aucun profil trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email}</TableCell>
                    <TableCell>{p.prenom}</TableCell>
                    <TableCell>{p.nom}</TableCell>
                    <TableCell>
                      {editingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                            className="px-2 py-1 rounded border border-slate-300 text-sm"
                          >
                            {ALL_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateRole(p.id)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "OK"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Annuler
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="w-3 h-3" />
                          {ROLE_LABELS[p.role] || p.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingId !== p.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(p.id);
                              setEditRole(p.role);
                            }}
                          >
                            Modifier le rôle
                          </Button>
                        )}
                        {role === "admin" && p.id !== user?.id && editingId !== p.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Confirm Delete User */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Supprimer l&apos;utilisateur</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement l&apos;utilisateur{" "}
              <strong className="text-slate-900">{deleteTarget?.prenom} {deleteTarget?.nom}</strong>{" "}
              (<code>{deleteTarget?.email}</code>) ?
              <br /><br />
              Cette action est <strong>irréversible</strong>. Le compte Supabase Auth et le profil seront supprimés.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deletingUser}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deletingUser}>
              {deletingUser && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
