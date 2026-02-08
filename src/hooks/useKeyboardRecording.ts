import { useEffect, useRef } from "react";

interface UseKeyboardRecordingProps {
  onStart: () => void;
  onStop: () => Promise<void>;
  isRecording: boolean;
  disabled: boolean;
}

export function useKeyboardRecording({
  onStart,
  onStop,
  isRecording,
  disabled,
}: UseKeyboardRecordingProps) {
  const isKeyDownRef = useRef(false);

  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isKeyDownRef.current &&
        !disabled &&
        !isRecording &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        isKeyDownRef.current = true;
        onStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && isKeyDownRef.current && isRecording) {
        e.preventDefault();
        isKeyDownRef.current = false;
        onStop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [disabled, isRecording, onStart, onStop]);
}
