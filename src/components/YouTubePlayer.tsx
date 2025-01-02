import { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

const YouTubePlayer = ({ videoUrl }: { videoUrl: string }) => {
  const [videoId, setVideoId] = useState<string>("");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const { toast } = useToast();
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (videoUrl) {
      const id = extractVideoId(videoUrl);
      if (id) {
        setVideoId(id);
        fetchTranscript(id);
      } else {
        toast({
          title: "Invalid URL",
          description: "Please provide a valid YouTube URL",
          variant: "destructive",
        });
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [videoUrl]);

  const extractVideoId = (url: string) => {
    const regExp = /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[\&\?]|$)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const fetchTranscript = async (id: string) => {
    setIsLoadingTranscript(true);
    setTranscript([]); // Clear previous transcript
    
    try {
      console.log('Fetching transcript for video ID:', id);
      const { data, error } = await supabase.functions.invoke('get-transcript', {
        body: { videoId: id }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('No transcript data received');
      }

      // Transform the transcript data to match our interface
      const formattedTranscript: TranscriptItem[] = data.map((item: any) => ({
        text: item.text,
        start: item.offset / 1000, // Convert milliseconds to seconds
        duration: item.duration / 1000 // Convert milliseconds to seconds
      }));
      
      console.log('Transcript data received:', formattedTranscript);
      setTranscript(formattedTranscript);
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      
      // Clear the transcript when there's an error
      setTranscript([]);
      
      let errorMessage = "No transcript is available for this video";
      
      if (error.message?.includes('Video is unavailable')) {
        errorMessage = "The video is unavailable or does not exist";
      } else if (error.message?.includes('Invalid YouTube URL')) {
        errorMessage = "Please provide a valid YouTube URL";
      }
      
      // Show appropriate error message
      toast({
        title: "Transcript Unavailable",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const onPlayerReady = (event: any) => {
    console.log("Player ready");
  };

  const onPlayerStateChange = (event: any) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (event.data === 1) { // Playing
      intervalRef.current = window.setInterval(() => {
        setCurrentTime(event.target.getCurrentTime());
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <YouTube
          videoId={videoId}
          opts={{
            height: "390",
            width: "100%",
            playerVars: {
              autoplay: 1,
            },
          }}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
        />
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-2">Live Transcript</h3>
        {isLoadingTranscript ? (
          <p className="text-sm text-muted-foreground">Loading transcript...</p>
        ) : transcript.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {transcript.map((item, index) => (
                <p
                  key={index}
                  className={`text-sm p-2 rounded ${
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
        ) : (
          <p className="text-sm text-muted-foreground">
            No transcript available for this video. This could be because:
            <ul className="list-disc pl-5 mt-2">
              <li>Captions are disabled for this video</li>
              <li>The video owner hasn't added captions</li>
              <li>The video is in a language we don't support yet</li>
              <li>The video might be unavailable or private</li>
            </ul>
          </p>
        )}
      </Card>
    </div>
  );
};

export default YouTubePlayer;