"use client";

/**
 * Signature Pad Component - Module Vehicle Inspection
 * Canvas pour signature numérique tactile/stylo
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
  onSave: (signature: string | null) => void;
  isSubmitting?: boolean;
  width?: number;
  height?: number;
}

export function SignaturePad({
  onSave,
  isSubmitting = false,
  width = 400,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Obtenir la position du pointeur
  const getPointerPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      } else {
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      }
    },
    []
  );

  // Démarrer le dessin
  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const { x, y } = getPointerPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    },
    [getPointerPos]
  );

  // Dessiner
  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const { x, y } = getPointerPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, getPointerPos]
  );

  // Arrêter le dessin
  const stopDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.closePath();
    setIsDrawing(false);
  }, []);

  // Effacer
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  // Sauvegarder
  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      onSave(null);
      return;
    }

    const signatureData = canvas.toDataURL("image/png");
    onSave(signatureData);
  }, [hasSignature, onSave]);

  // Initialiser le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Configuration du style
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000000";

    // Gestion du redimensionnement
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = height;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [height]);

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full touch-none cursor-crosshair"
          style={{ height: `${height}px` }}
        />
        
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-slate-400">
              <PenTool className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Signez ici</p>
            </div>
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={clear}
          disabled={!hasSignature || isSubmitting}
          className="flex-1"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Effacer
        </Button>
        <Button
          onClick={save}
          disabled={!hasSignature || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Valider l&apos;inspection
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-slate-500 text-center">
        En signant, vous confirmez l&apos;exactitude des informations saisies.
      </p>
    </div>
  );
}
