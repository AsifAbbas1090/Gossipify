# Quick Start Guide

## To Run the Application

### 1. Start the Server (Terminal 1)
```bash
cd server
npm run dev
```

**Expected output:**
```
Gossipify relay running on http://localhost:4000
[SERVER] Using persistent file-based storage
[SERVER] Loaded X registered users: asif, asif1, asif2, ...
```

### 2. Start the Client (Terminal 2)
```bash
cd client
npm start
```

Then press `w` to open in web browser.

## Important Notes

1. **Users are stored in `server/storage/users.json`** - they persist across server restarts
2. **If a user is not found**, check:
   - Server console shows loaded users on startup
   - Visit `http://localhost:4000/stats` to see all registered users
   - Make sure the server was restarted after registering new users
3. **Message routing is fixed** - messages only appear in the correct chat
4. **Audio and images work** - click audio messages to play, images show automatically

## Troubleshooting

- **404 User Not Found**: Restart the server to reload users from file
- **Messages in wrong chats**: This is fixed - each chat is isolated
- **Audio not playing**: Audio playback works on web only (click the audio message)
- **Images not showing**: Images decrypt automatically when received

