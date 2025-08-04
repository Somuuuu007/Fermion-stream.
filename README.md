# Fermion-Stream

Fermion-Stream is a real-time video streaming application that uses WebRTC and HLS technology. This application provides live video streaming and watching capabilities.

## Features

- **Real-time Video Streaming**: Live video streaming with WebRTC and MediaSoup
- **HLS Video Playback**: Low-latency video watching with HLS (HTTP Live Streaming)
- **Multi-user Support**: Simultaneous streaming and watching for multiple users
- **Audio/Video Controls**: Toggle microphone and camera on/off
- **Responsive Design**: Modern UI with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Node.js, Express, Socket.IO
- **Video Processing**: MediaSoup, FFmpeg, HLS.js
- **Styling**: Tailwind CSS
- **Real-time Communication**: WebSocket, WebRTC

## Prerequisites

To run this application, you need to have the following installed on your system:

- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **FFmpeg** (for video processing)

### FFmpeg Installation

**Windows:**
```bash
# Install via Chocolatey
choco install ffmpeg

# Or download manually from: https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <https://github.com/Somuuuu007/Fermion-stream.>
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Application
```bash
npm run build
```

## Running the Application

To run the application, you need to run these commands in **3 separate terminals**:

### Terminal 1: Next.js Frontend Server
```bash
npm run dev
```
This server will run on `http://localhost:3000`.

### Terminal 2: MediaSoup Backend Server
```bash
npm run start-server
```
This server will run on `http://localhost:4000`.

### Terminal 3: WebSocket FFmpeg Server
```bash
npm run ws
```
This server will run on `ws://localhost:5000`.

## Usage

1. **Open Browser**: Navigate to `http://localhost:3000`

2. **Start Stream**: To begin live streaming
   - Click the "Start Stream" button
   - Allow camera and microphone permissions
   - You can view your live stream and use the controls

3. **Watch Stream**: To watch the live stream
   - Click the "Watch Stream" button
   - The HLS player will automatically load the stream

## Project Structure

```
├── src/app/              # Next.js App Directory
│   ├── page.tsx         # Homepage
│   ├── layout.tsx       # Root Layout
│   └── globals.css      # Global Styles
├── pages/               # Next.js Pages
│   ├── stream.tsx       # Streaming Page
│   └── watch.tsx        # Watching Page
├── server/              # Backend Servers
│   ├── index.ts         # Main MediaSoup Server
│   ├── ws-server.ts     # WebSocket FFmpeg Server
│   ├── mediasoup.ts     # MediaSoup Configuration
│   └── room.ts          # Room Management
├── public/              # Static Files
└── package.json         # Dependencies & Scripts
```

## Available Scripts

- `npm run dev` - Starts the development server
- `npm run start-server` - Starts the MediaSoup backend server
- `npm run ws` - Starts the WebSocket FFmpeg server

---

**Note**: You would have to be in the tab where you opened the stream page do not minimise it as due to Background throttling the segment generation would stop causing an issue in the watch page . It would be better to open a new window in the same or different browser and then run the watch and the stream page side by side to test . (The stream page browser/ tab should be active for segment creation.)