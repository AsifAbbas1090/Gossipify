# Gossipify UI Design Specifications

## Overview
This document describes the UI/UX specifications for Gossipify, an educational end-to-end encrypted chat application. The design emphasizes clarity, consent, privacy affordances, and a warm, trustworthy aesthetic.

## Design System

### Color Palette
- **Background (Light)**: `#F7F7F8` - Soft neutral background
- **Background (Dark)**: `#0F0F12` - Deep dark background
- **Primary Accent**: `#0FA3A3` - Warm Teal (trustworthy, professional)
- **Destructive/Warning**: `#FF6B61` - Sunset Coral (clear, attention-grabbing)
- **Card Background (Light)**: `#FFFFFF`
- **Card Background (Dark)**: `#1A1A1F`

### Typography
- **Font Family**: Inter (regular, medium, semiBold, bold)
- **Display**: 40px, bold
- **H1**: 36px, bold
- **H2**: 30px, bold
- **H3**: 24px, semiBold
- **Body**: 16px, regular
- **Caption**: 14px, regular

### Spacing & Layout
- **Border Radius**: 12px-20px (rounded, friendly)
- **Avatar Size**: 40px circular
- **Touch Targets**: Minimum 44px (accessibility)
- **Container Padding**: 16px horizontal, 16px vertical
- **Card Padding**: 20px

## Screen Specifications

### 1. Splash/Onboarding Screen
**Purpose**: First-time user registration and security education

**Components**:
- Large app title (48px, bold)
- Subtitle explaining purpose
- Security information card with:
  - Lock icon (🔒)
  - "End-to-end encryption" heading
  - Explanation: "Your encryption keys are generated locally on your device. Private keys never leave your device and are stored securely. The server cannot read your messages."
- Username input field with label
- Continue button (primary color, disabled until username entered)
- Security banner (compact variant)
- Educational notice about file permissions

**Animations**:
- Staggered entrance animations (title → subtitle → card → input → button)
- Spring animations with damping: 15
- Fade + translateY effects

**Accessibility**:
- All inputs have proper labels
- Buttons have accessibility roles
- Touch targets ≥44px

---

### 2. Conversations List (Home Screen)
**Purpose**: Display all conversations and start new chats

**Components**:
- Security banner (compact) at top
- Search/Start Chat input with inline "Start" button
- Settings button (gear icon)
- Conversation list items:
  - 40px circular avatar (initials, colored by username)
  - Username (16px, semiBold)
  - Last message preview (14px, regular, truncated)
  - Timestamp (12px, right-aligned)
  - Encryption lock icon (🔒) if encrypted
  - Unread badge (circular, primary color) if unread > 0
- Empty state message when no conversations

**Interactions**:
- Pull-to-refresh on list
- Tap conversation item → navigate to Chat
- Tap "Start" → navigate to Chat with entered username
- Long-press conversation → (future: delete conversation)

**Animations**:
- List items slide in from left with fade
- Pull-to-refresh uses primary color

---

### 3. Chat Screen
**Purpose**: Message composition and display

**Components**:
- Security banner (compact)
- "Verify Security" button (shows fingerprint modal)
- Message list (FlatList):
  - ChatBubble components (incoming/outgoing)
  - Timestamp on each message
  - Status indicators (sending, sent, delivered, read)
- Composer at bottom:
  - Emoji picker button
  - Attachment button
  - Text input (multiline, max 2000 chars)
  - Send button (disabled when empty)
  - Long-press send → expiry options modal

**Message Bubbles**:
- **Outgoing**: Primary color background, white text, right-aligned
- **Incoming**: Card background, primary text, left-aligned
- Border radius: 20px (4px on tail side)
- Max width: 80%
- Padding: 16px horizontal, 12px vertical

**Interactions**:
- Long-press message → Action sheet:
  - Delete (local)
  - Delete for everyone (destructive)
  - Cancel
- Tap attachment → Download and decrypt, then preview
- Long-press send → Expiry options:
  - 10 seconds
  - 1 minute
  - 5 minutes
  - 1 hour
  - Cancel

**Animations**:
- Messages slide in with fade (from bottom)
- Encryption shimmer on outgoing messages while sending
- Decrypting progress bar for attachments

---

### 4. Attachment Viewer Screen
**Purpose**: View decrypted attachments (images)

**Components**:
- Header with "Back" button and "Share" button
- Decrypting state:
  - Loading spinner
  - Progress bar
  - "Decrypting attachment..." text
- Image viewer (full-screen, zoomable)
- Error state (if decryption fails)

**Interactions**:
- Tap "Back" → Return to chat
- Tap "Share" → Native share sheet
- Pinch to zoom (if image)

**Animations**:
- Progress bar animates from 0-100% during decryption
- Fade in image when ready

---

### 5. Settings/Profile Screen
**Purpose**: User profile management and security settings

**Components**:
- Security banner
- **Profile Section**:
  - Username input with "Save" button
  - Input validation
- **Security Section**:
  - Public key fingerprint display (monospace, selectable)
  - Formatted as groups of 4 characters
- **Backup & Restore Section**:
  - "Export Key Backup" button (primary)
  - "Import Key Backup" button (secondary)
  - Warning note about demo passphrase

**Interactions**:
- Save username → Update and show success alert
- Export → Create encrypted backup file
- Import → Pick file, decrypt, restore keys

**Animations**:
- Sections fade in with translateY
- Button press feedback

---

## Component Specifications

### SecurityBanner
**Variants**: `default`, `compact`

**Props**:
- `variant?: 'default' | 'compact'`

**Visual**:
- Lock icon (🔒)
- "End-to-end encrypted" title
- "Keys stored on device only" subtitle (hidden in compact)
- Primary subtle background with primary border
- Rounded corners (12px)

**Usage**:
- Top of screens to remind users of encryption
- Compact variant for space-constrained areas

---

### ChatBubble
**Props**:
- `text: string`
- `isFromMe: boolean`
- `timestamp: number`
- `status?: 'sending' | 'sent' | 'delivered' | 'read'`
- `attachment?: { name, mime, isDecrypting }`
- `onLongPress?: () => void`
- `onPress?: () => void`
- `showEncryptionShimmer?: boolean`

**Visual States**:
- **Sending**: Shimmer animation, "⏳" status
- **Sent**: "✓" status
- **Delivered**: "✓✓" status
- **Decrypting attachment**: Progress indicator, "Decrypting..." text

**Animations**:
- Entrance: fade + translateY (spring)
- Encryption shimmer: opacity animation (0 → 0.4 → 0)

---

### Composer
**Props**:
- `value: string`
- `onChangeText: (text: string) => void`
- `onSend: () => void`
- `onAttach: () => void`
- `onLongPressSend?: () => void`
- `placeholder?: string`
- `disabled?: boolean`

**Visual**:
- Rounded input container (20px radius)
- Emoji button (😊)
- Attachment button (📎)
- Text input (multiline, max 2000 chars)
- Send button (primary color, disabled when empty)

**Interactions**:
- Long-press send → Expiry modal
- Tap emoji → Emoji picker (future enhancement)
- Tap attach → Document picker

---

### ConversationListItem
**Props**:
- `peerUsername: string`
- `lastMessage?: string`
- `timestamp?: number`
- `unreadCount?: number`
- `isEncrypted?: boolean`
- `onPress: () => void`

**Visual**:
- 40px circular avatar (initials, colored)
- Username (16px, semiBold)
- Last message preview (14px, truncated)
- Timestamp (12px, right)
- Lock icon if encrypted
- Unread badge (circular, primary color)

**Animations**:
- Slide in from left with fade

---

### AttachmentCard
**Props**:
- `name: string`
- `mime?: string | null`
- `size?: number | null`
- `thumbnailUri?: string | null`
- `isDecrypting?: boolean`
- `decryptProgress?: number`
- `onPress: () => void`
- `onLongPress?: () => void`

**Visual States**:
- **Image**: Thumbnail preview (64x64)
- **Other**: File icon + extension
- **Decrypting**: Progress bar, loading spinner

**Animations**:
- Entrance: fade + scale
- Progress bar: width animation (0-100%)

---

### KeyFingerprintModal
**Purpose**: Display and verify peer's public key fingerprint

**Props**:
- `visible: boolean`
- `fingerprint: string`
- `peerUsername: string`
- `onClose: () => void`
- `onVerify?: () => void`

**Visual**:
- Modal overlay (semi-transparent black)
- Card container (rounded 20px)
- Title: "Verify Security"
- Subtitle: Instructions for verification
- Fingerprint display:
  - Label: "Public Key Fingerprint"
  - Value: Formatted in groups of 4 (monospace, selectable)
- Info box: Instructions for secure verification
- Actions:
  - "Mark as Verified" (primary, if onVerify provided)
  - "Close" (secondary)

**Usage**:
- Accessible from Chat screen
- Compare fingerprints in person or verified channel

---

## Security Affordances

### 1. Security Badges
- **Location**: Top of all screens (compact variant)
- **Content**: "🔒 End-to-end encrypted — Keys stored on device only"
- **Purpose**: Constant reminder of encryption status
- **Visual**: Primary subtle background, primary border

### 2. Key Fingerprint Modal
- **Trigger**: "Verify Security" button in Chat screen
- **Content**: Peer's public key fingerprint
- **Instructions**: Compare with peer through secure channel
- **Verification**: Optional "Mark as Verified" action

### 3. File Permission Flows
- **Onboarding**: Explicit explanation that app never accesses files without permission
- **Attachment Picker**: Native document picker (user-initiated)
- **Consent**: User must explicitly choose file to attach
- **Feedback**: Clear progress indicators during encryption/decryption

---

## Onboarding Microcopy

### Key Storage Explanation
"Your encryption keys are generated locally on your device. Private keys never leave your device and are stored securely. The server cannot read your messages."

### File Access Consent
"Gossipify is an educational demo implementing client-side encryption. It never attempts to access a user's files without explicit permission."

---

## Accessibility Requirements

### Touch Targets
- Minimum 44px height/width for all interactive elements
- Comfortable spacing between targets (8px minimum)

### Labels
- All inputs have `accessibilityLabel`
- All buttons have `accessibilityRole="button"`
- Screen readers can identify all interactive elements

### Color Contrast
- Text meets WCAG AA standards
- Primary text on backgrounds: 4.5:1 minimum
- Secondary text: 3:1 minimum

### Typography
- Minimum font size: 12px
- Line height: 1.5x font size minimum
- Sufficient spacing between lines

---

## Animation Guidelines

### Entrance Animations
- **Duration**: 300-400ms
- **Easing**: Spring (damping: 15)
- **Effects**: Fade + translateY/translateX
- **Stagger**: 100ms between elements

### Interaction Feedback
- **Press**: Opacity 0.7
- **Loading**: Spinner (primary color)
- **Success**: Brief highlight (future: toast notification)

### Transitions
- **Screen transitions**: Native stack (default)
- **Modal**: Fade in/out
- **List items**: Slide + fade

---

## Implementation Notes

### React Native Components
- Use `react-native-reanimated` for animations
- Use `react-navigation` native-stack for navigation
- Use Expo SecureStore for key storage
- Use `expo-document-picker` for file selection

### CSS/Tailwind Equivalents
For web/design reference:

```css
/* Colors */
--bg-light: #F7F7F8;
--bg-dark: #0F0F12;
--primary: #0FA3A3;
--destructive: #FF6B61;

/* Typography */
font-family: 'Inter', sans-serif;
font-size: 16px;
line-height: 1.5;

/* Spacing */
padding: 16px;
border-radius: 12px;
gap: 8px;

/* Touch targets */
min-height: 44px;
min-width: 44px;
```

### Sample React Native Props

**ChatBubble**:
```tsx
<ChatBubble
  text="Hello, this is a message"
  isFromMe={true}
  timestamp={Date.now()}
  status="sent"
  showEncryptionShimmer={false}
  onLongPress={() => handleLongPress()}
/>
```

**Composer**:
```tsx
<Composer
  value={input}
  onChangeText={setInput}
  onSend={handleSend}
  onAttach={handleAttach}
  onLongPressSend={handleExpiry}
  placeholder="Type a message..."
/>
```

---

## Dark Mode Support

All components and screens support both light and dark modes:
- Colors adapt based on system preference
- Maintains contrast ratios in both modes
- Smooth transitions between modes
- User preference respected throughout app

---

## Future Enhancements

1. **Emoji Picker**: Full emoji keyboard integration
2. **Message Reactions**: Tap to react (future)
3. **Voice Messages**: Record and send encrypted audio
4. **Group Chats**: Multi-participant conversations
5. **Key Verification**: QR code scanning for fingerprint verification
6. **Push Notifications**: Encrypted notification envelopes
7. **Message Search**: Encrypted search functionality
8. **Themes**: Custom color themes beyond light/dark

---

## Testing Checklist

- [ ] All screens render correctly in light mode
- [ ] All screens render correctly in dark mode
- [ ] All touch targets are ≥44px
- [ ] All animations are smooth (60fps)
- [ ] Security banner appears on all screens
- [ ] Fingerprint modal displays correctly
- [ ] File picker requests permission appropriately
- [ ] Decryption progress indicators work
- [ ] Long-press interactions work on all platforms
- [ ] Pull-to-refresh works on conversation list
- [ ] Keyboard doesn't cover inputs
- [ ] Screen readers can navigate all screens

---

*Last updated: 2024*
*Design System Version: 1.0*

