"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Search, 
  Filter, 
  MoreHorizontal,
  Loader2,
  Eye,
  Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";

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

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      // Utiliser l'API superadmin paginée
      const res = await fetch("/api/superadmin/organizations");
      const data = await res.json();
      
      if (res.ok && data.organizations) {
        // Charger les compteurs pour chaque org via endpoint séparé
        const orgsWithCounts = await Promise.all(
          data.organizations.map(async (org: Organization) => {
            try {
              const statsRes = await fetch(`/api/organizations/${org.id}/stats`);
              if (statsRes.ok) {
                const stats = await statsRes.json();
                return {
                  ...org,
                  vehicle_count: stats.counts.vehicles,
                  user_count: stats.counts.users,
                };
              }
            } catch (e) {
              logger.warn("SuperAdmin", "Failed to load stats", { orgId: org.id });
            }
            return org;
          })
        );
        
        setOrganizations(orgsWithCounts);
      } else {
        logger.error("SuperAdmin", "API error", { error: data.error });
      }
    } catch (error) {
      logger.error("SuperAdmin", "Error fetching organizations", { error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les organisations
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = 
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.owner_email?.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase());
    
    const matchesPlan = filterPlan === "all" || org.plan === filterPlan;
    
    return matchesSearch && matchesPlan;
  });

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

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Organisations</h1>
          <p className="text-slate-400">Gérez toutes les entreprises clientes</p>
        </div>
      </div>

      {/* Filtres */}
      <Card className="bg-slate-900 border-slate-800 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                placeholder="Rechercher par nom, email ou slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">Tous les plans</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-800">
                  <tr>
                    <th className="text-left py-4 px-6 text-slate-400 font-medium">Entreprise</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-medium">Plan</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-medium">Véhicules</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-medium">Employés</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-medium">Statut</th>
                    <th className="text-left py-4 px-6 text-slate-400 font-medium">Inscription</th>
                    <th className="text-right py-4 px-6 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganizations.map((org) => (
                    <tr key={org.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-white">{org.name}</p>
                          <p className="text-sm text-slate-500">{org.owner_email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`${getPlanBadge(org.plan)} capitalize border`}>
                          {org.plan}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-white">
                          {org.vehicle_count} / {org.max_vehicles}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-white">
                          {org.user_count} / {org.max_users}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`${getStatusBadge(org.status)} capitalize border`}>
                          {org.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-400">
                          {new Date(org.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrganizations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Aucune organisation trouvée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
