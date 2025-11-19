/**
 * Message bubble component - WhatsApp Web style
 */

import { MessageWithDecrypted } from '../lib/messages';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: MessageWithDecrypted;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isFromMe = message.isFromMe;

  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[65%] sm:max-w-[70%] ${
        isFromMe ? 'message-bubble-sent' : 'message-bubble-received'
      } px-2 py-1`}>
        {message.decryptedMedia && (
          <div className={message.decryptedText ? 'mb-1' : ''}>
            {message.media_mime?.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(message.decryptedMedia)}
                alt="Shared image"
                className="max-w-full max-h-[300px] rounded-lg object-cover"
              />
            ) : message.media_mime?.startsWith('audio/') ? (
              <div className="bg-black/5 rounded-lg p-2">
                <audio
                  controls
                  src={URL.createObjectURL(message.decryptedMedia)}
                  className="w-full"
                />
              </div>
            ) : (
              <a
                href={URL.createObjectURL(message.decryptedMedia)}
                download
                className="inline-flex items-center gap-2 text-sm text-[#53BDEB] underline hover:text-[#25A3D4]"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
                Download file
              </a>
            )}
          </div>
        )}
        {message.decryptedText && (
          <p className="text-sm whitespace-pre-wrap break-words text-[#111B21]">
            {message.decryptedText}
          </p>
        )}
        {!message.decryptedText && !message.decryptedMedia && (
          <p className="text-sm text-[#667781] italic">
            🔒 Encrypted message
          </p>
        )}
        <div className={`flex items-center gap-1 justify-end ${message.decryptedText || message.decryptedMedia ? 'mt-1' : 'mt-0'}`}>
          <span className="text-[10px] text-[#667781]">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isFromMe && (
            <svg viewBox="0 0 16 15" width="16" height="12" fill="#667781">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
