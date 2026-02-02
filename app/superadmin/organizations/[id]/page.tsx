"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Users, 
  Car, 
  Calendar,
  Edit,
  Ban,
  Trash2,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  max_vehicles: number;
  max_users: number;
  created_at: string;
  created_by: string;
  owner_email?: string;
  owner_name?: string;
  vehicle_count?: number;
  user_count?: number;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  profile?: {
    email: string;
    prenom: string;
    nom: string;
  };
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (orgId) {
      fetchOrganizationData();
    }
  }, [orgId]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      
      // Récupérer l'organisation avec son propriétaire
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select(`
          *,
          owner:profiles!organizations_created_by_fkey(email, prenom, nom)
        `)
        .eq("id", orgId)
        .single();

      if (orgError) throw orgError;

      // Compter les véhicules
      const { count: vehicleCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      // Compter les utilisateurs
      const { count: userCount } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      setOrganization({
        ...orgData,
        owner_email: orgData.owner?.email,
        owner_name: orgData.owner ? `${orgData.owner.prenom} ${orgData.owner.nom}` : "N/A",
        vehicle_count: vehicleCount || 0,
        user_count: userCount || 0,
      });

      // Récupérer les membres
      const { data: membersData } = await supabase
        .from("organization_members")
        .select(`
          *,
          profile:profiles(email, prenom, nom)
        `)
        .eq("organization_id", orgId)
        .order("joined_at", { ascending: false });

      setMembers(membersData || []);
    } catch (error) {
      console.error("Error fetching organization:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ status: organization?.status === "active" ? "suspended" : "active" })
        .eq("id", orgId);

      if (error) throw error;
      
      await fetchOrganizationData();
    } catch (error) {
      console.error("Error updating organization:", error);
    }
  };

  const handleDelete = async () => {
    try {
      // Supprimer l'organisation (les données liées doivent avoir ON DELETE CASCADE)
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);

      if (error) throw error;
      
      router.push("/superadmin/organizations");
    } catch (error) {
      console.error("Error deleting organization:", error);
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      pro: "bg-violet-500/20 text-violet-400 border-violet-500/30",
      enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    return colors[plan] || "bg-slate-500/20 text-slate-400";
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      suspended: "bg-red-500/20 text-red-400 border-red-500/30",
      pending: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
    return colors[status] || "bg-slate-500/20 text-slate-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-slate-400">Organisation non trouvée</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/superadmin/organizations")}
          className="text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{organization.name}</h1>
            <Badge className={`${getStatusBadge(organization.status)} capitalize border`}>
              {organization.status}
            </Badge>
          </div>
          <p className="text-slate-400">{organization.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSuspend}
            className={organization.status === "active" ? "text-orange-400" : "text-emerald-400"}
          >
            <Ban className="w-4 h-4 mr-2" />
            {organization.status === "active" ? "Suspendre" : "Réactiver"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-500/20 rounded-lg">
                <Building2 className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Plan</p>
                <Badge className={`${getPlanBadge(organization.plan)} capitalize mt-1 border`}>
                  {organization.plan}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Car className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Véhicules</p>
                <p className="text-2xl font-bold text-white">
                  {organization.vehicle_count} / {organization.max_vehicles}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Utilisateurs</p>
                <p className="text-2xl font-bold text-white">
                  {organization.user_count} / {organization.max_users}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Inscrit le</p>
                <p className="text-lg font-bold text-white">
                  {new Date(organization.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="members">Membres ({members.length})</TabsTrigger>
          <TabsTrigger value="info">Informations</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Membres de l'organisation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-slate-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Nom</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Rôle</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Statut</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Inscrit le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b border-slate-800/50">
                        <td className="py-3 px-4 text-white">
                          {member.profile ? `${member.profile.prenom} ${member.profile.nom}` : "N/A"}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {member.profile?.email}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-white capitalize">{member.role}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${getStatusBadge(member.status)} capitalize border`}>
                            {member.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(member.joined_at).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          Aucun membre trouvé
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 text-sm">ID Organisation</p>
                  <p className="text-white font-mono">{organization.id}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Slug</p>
                  <p className="text-white">{organization.slug}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Propriétaire</p>
                  <p className="text-white">{organization.owner_name}</p>
                  <p className="text-slate-400 text-sm">{organization.owner_email}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">Date de création</p>
                  <p className="text-white">
                    {new Date(organization.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-red-500">Supprimer l'organisation</DialogTitle>
            <DialogDescription className="text-slate-400">
              Êtes-vous sûr de vouloir supprimer définitivement <strong>{organization.name}</strong> ?
              <br /><br />
              Cette action est <strong className="text-red-400">irréversible</strong>. Toutes les données (véhicules, interventions, utilisateurs) seront supprimées.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
