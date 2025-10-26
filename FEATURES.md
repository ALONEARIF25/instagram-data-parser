# Instagram Data Parser - New Features

## Date Picker Section 📅

A new section has been added that allows you to view messages from any specific date in your conversation history.

### Features:

- **Date Selection**: Pick any date within your conversation's date range
- **Message Display**: View all messages from the selected date
- **Same UI Style**: Uses the same chat bubble interface as the "Lowest Activity Day" section
- **Automatic Date Range**: The date picker automatically sets min/max values based on your data

### How to Use:

1. Process your JSON files first
2. Scroll to the "📅 View Messages by Date" section
3. Select a date from the date picker
4. Click "View Messages" to see all messages from that day

---

## Media Support 📷🎥🎙️

The parser now supports displaying photos, videos, and audio files from your Instagram messages.

### Supported Media Types:

#### Photos

- JSON format: `message.photos[].uri`
- Extracts filename: `photos/541014218_24975885822064344_4254740121701931398_n_24975885818731011.jpg`
- Displays as clickable image previews

#### Videos

- JSON format: `message.videos[].uri`
- Extracts filename: `videos/541995394_24403540885975736_1780615188516915780_n_1299041071913939.mp4`
- Displays with HTML5 video player controls

#### Audio Files

- JSON format: `message.audio_files[].uri`
- Extracts filename: `audio/audioclip17566296770003808_779861381098123.mp4`
- Displays with HTML5 audio player controls

### How to Use Media Features:

1. **Upload JSON Files**: Select your message\_\*.json files as usual
2. **Upload Media Folder**: Click the new "Select Media Folder" button
3. **Select Folder**: Choose the folder containing photos, videos, and audio subdirectories
   - The folder structure should match Instagram's export format
   - Example: `your_instagram_activity/messages/inbox/[chat_name]/`
4. **Process Files**: Click "Process Files" button
5. **View Media**: Media will now appear in:
   - Lowest Activity Day messages
   - Date picker messages
   - Embedded directly in the chat bubbles

### Media Display Features:

- **Photos**: Show as clickable previews, click to open full size in new tab
- **Videos**: Embedded video player with controls (play, pause, volume, fullscreen)
- **Audio**: Embedded audio player with controls and waveform
- **Fallback**: If media file not found, shows media indicator with filename
- **Responsive**: Media scales appropriately on mobile devices

### File Parsing:

The parser extracts only the filename from the URI path:

```
From: "your_instagram_activity/messages/inbox/user_123/photos/photo.jpg"
To: "photo.jpg"
```

This allows the parser to match files regardless of the folder structure you upload.

---

## Technical Details

### Files Modified:

1. **message_counter.html**

   - Added media folder input with `webkitdirectory` attribute
   - Added date picker section with input and button

2. **script.js**

   - Added `mediaFiles` object to store uploaded media
   - Added `extractFilename()` function to parse URIs
   - Added `renderMedia()` function to display photos/videos/audio
   - Added `viewMessagesByDate()` function for date picker
   - Added `formatDateForInput()` and `formatDateForDisplay()` helpers
   - Updated `displayLowestDateMessages()` to use new media rendering

3. **styles.css**
   - Added `.date-picker-section` styles
   - Added `.date-input` and `.view-date-btn` styles
   - Added `.media-item`, `.media-preview`, and `.audio-player` styles
   - Added hover effects for media
   - Added responsive styles for mobile

### Browser Compatibility:

- Folder upload uses `webkitdirectory` attribute (supported in Chrome, Edge, Safari, Opera)
- Media preview uses HTML5 `<video>` and `<audio>` elements
- Object URLs created via `URL.createObjectURL()`

---

## Usage Tips

1. **Large Media Folders**: Be patient when uploading large folders with many media files
2. **File Matching**: Ensure filenames in JSON match the actual file names in your upload
3. **Missing Media**: If media doesn't load, check browser console for errors
4. **Date Format**: Dates use GMT+6 timezone as configured in your parser
5. **Privacy**: All processing happens locally in your browser - no data is uploaded

---

## Future Enhancements

Possible improvements for future versions:

- Bulk date range viewing
- Media gallery view
- Download all media from a date
- Media search functionality
- Thumbnail generation for videos
