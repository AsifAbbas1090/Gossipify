/**
 * Message composer - WhatsApp Web style
 */

import { useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

interface ComposerProps {
  onSendText: (text: string) => void;
  onSendMedia: (file: File) => void;
  disabled?: boolean;
}

export default function Composer({
  onSendText,
  onSendMedia,
  disabled = false,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = () => {
    if (text && text.trim().length > 0 && !disabled) {
      onSendText(text);
      setText('');
      setShowEmojiPicker(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !disabled) {
      try {
        await onSendMedia(file);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Failed to send file:', error);
        alert('Failed to send file. Please try again.');
      }
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
        ? 'audio/mp4' 
        : 'audio/ogg';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const file = new File([blob], `recording.${mimeType.split('/')[1]}`, { type: mimeType });
          await onSendMedia(file);
        } catch (error) {
          console.error('Failed to send recording:', error);
          alert('Failed to send recording. Please try again.');
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      recorder.onerror = () => {
        alert('Recording error occurred');
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      audioRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied or not available');
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="relative bg-[#F0F2F5] border-t border-[#E9EDEF] p-2">
      {showEmojiPicker && (
        <div 
          className="absolute bottom-full right-0 mb-2 z-50 emoji-picker-wrapper"
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiPicker 
            onEmojiClick={handleEmojiClick}
            width={350}
            height={400}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
      <div className="flex items-end gap-2 px-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowEmojiPicker(!showEmojiPicker);
          }}
          className="wa-button"
          disabled={disabled}
          aria-label="Emoji"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656F">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zM12 17.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,audio/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="wa-button"
          disabled={disabled}
          aria-label="Attach"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656F">
            <path d="M20.5 13.1c0-.4-.1-.8-.3-1.1l-5.8-5.8c-.3-.2-.7-.3-1.1-.3s-.8.1-1.1.3l-5.8 5.8c-.2.3-.3.7-.3 1.1s.1.8.3 1.1l5.8 5.8c.3.2.7.3 1.1.3s.8-.1 1.1-.3l5.8-5.8c.2-.3.3-.7.3-1.1zm-1.4 0c0 .2 0 .3-.1.4l-5.8 5.8c-.1.1-.2.1-.4.1s-.3 0-.4-.1l-5.8-5.8c-.1-.1-.1-.2-.1-.4s0-.3.1-.4l5.8-5.8c.1-.1.2-.1.4-.1s.3 0 .4.1l5.8 5.8c.1.1.1.2.1.4z"/>
          </svg>
        </button>
        {!isRecording ? (
          <button
            type="button"
            onClick={handleStartRecording}
            className="wa-button"
            disabled={disabled}
            aria-label="Record"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656F">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopRecording}
            className="wa-button bg-[#F15C6D] hover:bg-[#E53E3E]"
            aria-label="Stop"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        )}
        <div className="flex-1 flex items-end bg-white rounded-lg px-4 py-2 min-h-[42px] max-h-[120px]">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message"
            className="flex-1 resize-none border-none outline-none text-sm text-[#111B21] placeholder-[#667781] bg-transparent"
            rows={1}
            style={{ maxHeight: '100px' }}
            disabled={disabled}
          />
        </div>
        {text.trim().length > 0 ? (
          <button
            onClick={handleSend}
            className="wa-button"
            disabled={disabled}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656F">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="wa-button"
            disabled={disabled}
            aria-label="Emoji"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656F">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zM12 17.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
