# SyncFrame – Desktop Video Editing Software

SyncFrame is a desktop video editing application built with a modern hybrid stack. It combines a fast React + TypeScript UI with a Rust/Tauri backend that handles media processing using FFmpeg.

## Tech Stack

- Desktop shell: Tauri v2
- Frontend: React, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide React
- State management: Zustand
- Backend: Rust (Tokio async runtime)
- Media engine: FFmpeg / FFprobe (invoked from Rust)

This repository contains both the frontend (Vite React app) and the Tauri Rust backend that powers timeline rendering, media analysis, and system capability detection.
