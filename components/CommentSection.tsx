"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Comment {
  id: string;
  intervention_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    prenom: string;
    nom: string;
    email: string;
  } | null;
}

interface CommentSectionProps {
  interventionId: string;
}

export function CommentSection({ interventionId }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          author:profiles(prenom, nom, email)
        `)
        .eq("intervention_id", interventionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("[Comments] Error fetching:", err);
      toast.error("Erreur lors du chargement des commentaires");
    } finally {
      setLoading(false);
    }
  }, [interventionId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          intervention_id: interventionId,
          author_id: user.id,
          content: newComment.trim(),
        })
        .select(`
          *,
          author:profiles(prenom, nom, email)
        `)
        .single();

      if (error) throw error;

      setComments((prev) => [data, ...prev]);
      setNewComment("");
      toast.success("Commentaire ajouté");
    } catch (err) {
      console.error("[Comments] Error submitting:", err);
      toast.error("Erreur lors de l'ajout du commentaire");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;

    setDeleting(commentId);
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Commentaire supprimé");
    } catch (err) {
      console.error("[Comments] Error deleting:", err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(null);
    }
  };

  const getInitials = (comment: Comment) => {
    if (comment.author) {
      return `${comment.author.prenom?.[0] || ""}${comment.author.nom?.[0] || ""}`.toUpperCase();
    }
    return "?";
  };

  const getAuthorName = (comment: Comment) => {
    if (comment.author) {
      return `${comment.author.prenom} ${comment.author.nom}`;
    }
    return "Utilisateur inconnu";
  };

  const isAuthor = (comment: Comment) => {
    return comment.author_id === user?.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Commentaires ({comments.length})
        </h3>
      </div>

      {/* New comment form */}
      {user && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer
            </Button>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Aucun commentaire
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
                  {getInitials(comment)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {getAuthorName(comment)}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 shrink-0">
                      {format(new Date(comment.created_at), "dd/MM HH:mm", {
                        locale: fr,
                      })}
                    </span>
                    {(isAuthor(comment) || profile?.role === "admin" || profile?.role === "direction") && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleting === comment.id}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        {deleting === comment.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
