"use client";

import { VideoLibrary } from "@/components/videos/VideoLibrary";
import { useInstructorName } from "@/components/cohort/useInstructorName";

export default function VideosPage() {
  const instructor = useInstructorName();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="eyebrow mb-3">The AV cart</p>
        <h1 className="font-serif text-4xl font-bold tracking-tight mb-2" style={{ color: "var(--text)" }}>
          Class recordings
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Missed a live session? {instructor} posts the recording here so you can watch it on your own time.
        </p>
      </div>

      <VideoLibrary />
    </div>
  );
}
