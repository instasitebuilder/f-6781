import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import { TranscriptItem } from "./types";

interface TranscriptDisplayProps {
  transcript: TranscriptItem[];
  currentTime: number;
  isLoadingTranscript: boolean;
}

export const TranscriptDisplay = ({
  transcript,
  currentTime,
  isLoadingTranscript,
}: TranscriptDisplayProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current transcript
  useEffect(() => {
    const currentTranscript = transcript.find(
      item => currentTime >= item.start && currentTime <= item.start + item.duration
    );
    
    if (currentTranscript && scrollRef.current) {
      const element = document.getElementById(`transcript-${currentTranscript.start}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, transcript]);

  if (isLoadingTranscript) {
    return <p className="text-sm text-muted-foreground">Loading transcript...</p>;
  }

  if (transcript.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No transcript available for this video. This could be because:
        <ul className="list-disc pl-5 mt-2">
          <li>Captions are disabled for this video</li>
          <li>The video owner hasn't added captions</li>
          <li>The video is in a language we don't support yet</li>
          <li>The video might be unavailable or private</li>
        </ul>
      </p>
    );
  }

  return (
    <ScrollArea className="h-[300px]" ref={scrollRef}>
      <div className="space-y-2">
        {transcript.map((item, index) => (
          <p
            key={index}
            id={`transcript-${item.start}`}
            className={`text-sm p-2 rounded transition-colors duration-200 ${
              currentTime >= item.start &&
              currentTime <= item.start + item.duration
                ? "bg-accent"
                : ""
            }`}
          >
            {item.text}
          </p>
        ))}
      </div>
    </ScrollArea>
  );
};