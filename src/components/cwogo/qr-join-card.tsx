"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

export function QrJoinCard({ joinCode, joinPath }: { joinCode: string; joinPath: string }) {
  const [joinUrl, setJoinUrl] = useState(joinPath);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}${joinPath}`);
  }, [joinPath]);

  return (
    <div className="glass-card rounded-[2rem] p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-muted">Scan to join</p>
      <div className="mt-4 flex flex-col items-center gap-4 rounded-[1.5rem] bg-white p-5 text-center">
        <QRCodeSVG value={joinUrl} size={180} includeMargin bgColor="#fffaf0" fgColor="#1f1931" />
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">Join code</p>
          <p className="text-3xl font-semibold tracking-[0.16em] text-foreground">{joinCode}</p>
        </div>
      </div>
    </div>
  );
}
