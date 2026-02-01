"use client";

import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Printer, Download, Expand } from "lucide-react";
import type { Vehicle } from "@/lib/supabase";

interface VehicleQRCodeProps {
  vehicle: Vehicle;
  baseUrl?: string;
}

export function VehicleQRCode({ vehicle, baseUrl }: VehicleQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  // URL pour le scan (page inspection avec ID du véhicule)
  const inspectionUrl = baseUrl 
    ? `${baseUrl}/inspection?vehicle=${vehicle.id}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/inspection?vehicle=${vehicle.id}`;

  // Télécharger le QR code en SVG
  const handleDownload = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-code-${vehicle.immat}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Imprimer le QR code
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const qrSize = 300;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${vehicle.immat}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              padding: 30px;
              border: 2px solid #e2e8f0;
              border-radius: 16px;
              background: white;
            }
            .vehicle-info {
              margin-bottom: 20px;
            }
            .immat {
              font-size: 28px;
              font-weight: bold;
              font-family: monospace;
              color: #2563eb;
              margin: 0 0 8px 0;
            }
            .marque {
              font-size: 16px;
              color: #64748b;
              margin: 0;
            }
            .qr-wrapper {
              display: inline-block;
              padding: 16px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #64748b;
            }
            .logo {
              margin-top: 16px;
              font-size: 12px;
              color: #94a3b8;
              font-weight: 600;
            }
            @media print {
              body { min-height: auto; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="vehicle-info">
              <p class="immat">${vehicle.immat}</p>
              <p class="marque">${vehicle.marque}</p>
            </div>
            <div class="qr-wrapper">
              ${qrRef.current?.innerHTML || ""}
            </div>
            <p class="instructions">Scannez ce QR code pour signaler un problème</p>
            <p class="logo">FLEET MASTER</p>
          </div>
          <button class="no-print" onclick="window.print()" style="
            margin-top: 30px;
            padding: 12px 24px;
            font-size: 16px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          ">Imprimer</button>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="w-5 h-5 text-slate-600" />
          QR Code Conducteur
        </CardTitle>
        <CardDescription>
          Scan pour signalement rapide
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Preview */}
        <div className="flex justify-center">
          <div 
            ref={qrRef}
            className="p-4 bg-white rounded-xl shadow-sm border border-slate-200"
          >
            <QRCodeSVG
              value={inspectionUrl}
              size={128}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Expand className="w-4 h-4 mr-2" />
                Aperçu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>QR Code - {vehicle.immat}</DialogTitle>
                <DialogDescription>
                  À imprimer et coller sur le véhicule
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center py-6">
                <div className="p-6 bg-white rounded-xl border-2 border-slate-200 text-center">
                  <p className="text-2xl font-bold font-mono text-blue-600 mb-2">
                    {vehicle.immat}
                  </p>
                  <p className="text-sm text-slate-500 mb-4">{vehicle.marque}</p>
                  <div className="p-4 bg-white rounded-lg shadow-sm inline-block">
                    <QRCodeSVG
                      value={inspectionUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                    />
                  </div>
                  <p className="text-sm text-slate-400 mt-4">
                    Scannez pour signaler un problème
                  </p>
                  <p className="text-xs text-slate-300 mt-2 font-semibold">
                    FLEET MASTER
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePrint} className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
                <Button variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  SVG
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          URL: /inspection?vehicle={vehicle.id.slice(0, 8)}...
        </p>
      </CardContent>
    </Card>
  );
}
