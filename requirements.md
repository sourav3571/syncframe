# SyncFrame Project Requirements

To successfully build and run SyncFrame, you need the following dependencies installed on your system.

## 1. System Requirements
- **Operating System**: Windows 10/11, macOS, or Linux.
- **Node.js**: v18.0.0 or higher (Recommended: v20 LTS).
- **Rust**: Latest stable version (v1.75+ recommended).

## 2. Core Dependencies
- **Tauri CLI**: Install via npm: `npm install -g @tauri-apps/cli` or use `npx tauri`.
- **FFmpeg**: Required for media processing and rendering. 
    - Ensure `ffmpeg` and `ffprobe` are in your system PATH.
    - On Windows, you can use the `install_ffmpeg.ps1` script provided in the root directory.

## 3. External Toolchains
- **Windows**: [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ build tools).
- **macOS**: Xcode Command Line Tools (`xcode-select --install`).
- **Linux**: Various libraries (e.g., `libwebkit2gtk-4.1`, `libssl-dev`, `libgtk-3-dev`). Refer to the [Tauri Linux guide](https://v2.tauri.app/start/prerequisites/#linux).

## 4. Development Setup
1.  **Clone the repository**.
2.  **Install Node dependencies**:
    ```bash
    npm install
    ```
3.  **Run in development mode**:
    ```bash
    npm run tauri dev
    ```
4.  **Build for production**:
    ```bash
    npm run tauri build
    ```

## 5. Media Codecs
The application relies on your system's WebView (Edge WebView2 on Windows, WebKit on macOS/Linux) for media playback. Ensure you have the necessary codecs installed if you experience playback issues with specific formats.
