"use client";

import { VideoLibrary } from "@/components/videos/VideoLibrary";
import { Video } from "lucide-react";

export default function VideosPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            <Video size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>Class Videos</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Catch up on recorded classes anytime.
            </p>
          </div>
        </div>
      </div>

      <VideoLibrary />
    </div>
  );
}
