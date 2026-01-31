"use client";

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, FileText, Image, File, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_type: "pdf" | "image" | "other";
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  description: string | null;
  created_at: string;
  uploader?: {
    prenom: string;
    nom: string;
  } | null;
}

interface DocumentUploadProps {
  entityType: "vehicle" | "intervention";
  entityId: string;
  documents: Document[];
  onChange: () => void;
  canDelete?: boolean;
}

export function DocumentUpload({
  entityType,
  entityId,
  documents,
  onChange,
  canDelete = true,
}: DocumentUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "image":
        return <Image className="w-5 h-5 text-blue-500" />;
      default:
        return <File className="w-5 h-5 text-slate-500" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    const uploadedDocs: Document[] = [];

    for (const file of Array.from(files)) {
      // Validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Type non autorisé (PDF, JPG, PNG uniquement)`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
        continue;
      }

      try {
        // Upload to Storage
        const fileExt = file.name.split(".").pop() || "";
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${entityType}/${entityId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Insert in DB
        const fileType = file.type === "application/pdf" ? "pdf" : "image";
        const { data: doc, error: dbError } = await supabase
          .from("documents")
          .insert({
            [`${entityType}_id`]: entityId,
            uploader_id: user.id,
            filename: fileName,
            original_name: file.name,
            file_type: fileType,
            mime_type: file.type,
            size_bytes: file.size,
            storage_path: storagePath,
            description: description.trim() || null,
          })
          .select("*")
          .single();

        if (dbError) {
          // Rollback: delete from storage
          await supabase.storage.from("documents").remove([storagePath]);
          throw dbError;
        }

        uploadedDocs.push(doc);
        toast.success(`${file.name} uploadé`);
      } catch (err) {
        console.error("[Upload] Error:", err);
        toast.error(`Erreur upload ${file.name}`);
      }
    }

    setUploading(false);
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (uploadedDocs.length > 0) onChange();
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Supprimer "${doc.original_name}" ?`)) return;

    setDeleting(doc.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([doc.storage_path]);

      if (storageError) {
        console.warn("[Delete] Storage error (non-blocking):", storageError);
      }

      // Delete from DB
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast.success("Document supprimé");
      onChange();
    } catch (err) {
      console.error("[Delete] Error:", err);
      toast.error("Erreur suppression");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 60);

      if (error || !data?.signedUrl) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error("[Download] Error:", err);
      toast.error("Erreur téléchargement");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Documents ({documents.length})
        </h3>
      </div>

      {/* Upload form */}
      {user && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="text-sm"
          />
          <Input
            type="text"
            placeholder="Description (optionnelle)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
            className="text-sm"
          />
          <p className="text-xs text-slate-500">
            PDF, JPG, PNG • Max 10MB par fichier
          </p>
        </div>
      )}

      {/* Documents list */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Aucun document
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border"
            >
              {getFileIcon(doc.file_type)}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate cursor-pointer hover:text-blue-600"
                  onClick={() => handleDownload(doc)}
                >
                  {doc.original_name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatSize(doc.size_bytes)}
                  {doc.description && ` • ${doc.description}`}
                </p>
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={deleting === doc.id}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  {deleting === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export type { Document };
