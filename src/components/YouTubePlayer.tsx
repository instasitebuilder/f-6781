import { useState, useEffect } from "react";
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
  const { toast } = useToast();

  useEffect(() => {
    if (videoUrl) {
      const id = extractVideoId(videoUrl);
      if (id) {
        setVideoId(id);
        fetchTranscript(id);
      } else {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid YouTube URL",
          variant: "destructive",
        });
      }
    }
  }, [videoUrl]);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const fetchTranscript = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-transcript', {
        body: { videoId: id }
      });
      
      if (error) throw error;
      setTranscript(data);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transcript",
        variant: "destructive",
      });
    }
  };

  const onPlayerReady = (event: any) => {
    console.log("Player ready");
  };

  const onPlayerStateChange = (event: any) => {
    if (event.data === 1) {
      setInterval(() => {
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
      </Card>
    </div>
  );
};

export default YouTubePlayer;