# 🎯 PneumaVoice - AI-Powered Presentation System

PneumaVoice is a high-performance, real-time presentation platform designed for speakers and preachers. It leverages advanced AI to provide instant transcription, semantic scripture suggestions, and a seamless multi-screen projection experience.

## ✨ Key Features

### 🎙️ Real-Time Intelligence
*   **Live Transcription**: High-accuracy, low-latency speech-to-text processing.
*   **Scripture Detection**: Automatically identifies biblical references from natural speech in real-time.
*   **Semantic Search**: Finds relevant scriptures based on the themes and context of the spoken word, even without direct citations.

### 📋 Integrated Dashboard
*   **Unified Preview**: A centralized monitor that allows you to preview scriptures, songs, and announcements before they go live.
*   **Dual-State Workflow**: Manage your "Preview" and "Live" states independently for a smooth audience experience.
*   **Multi-Tab Management**:
    *   **Scripture**: Interactive grid for managing detected and suggested verses.
    *   **Projection**: Full control over backgrounds, layout, and live display settings.
    *   **Songs**: Fast search and navigational support for song lyrics and hymns.

### 📚 Study & Research Center
*   **Lexicon Integration**: In-depth interlinear support for original language study.
*   **Active History**: Keep track of every scripture projected during a session for quick recall.
*   **Local Performance**: Optimized for offline-first reliability using high-speed local databases.

## 🚀 Getting Started

### Prerequisites

*   **Node.js**: v18 or higher.
*   **Python**: v3.10+ (for AI transcription services).
*   **System Dependencies**: Ensure you have the necessary build tools installed for native module support.

### Installation

1.  **Clone the Repository**:
    ```bash
    git clone [repository-url]
    cd bibleApp
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root directory and configure your local settings.

4.  **Database Strategy**:
    The system uses a local-first architecture. Ensure your local database is initialized by running the migration and synchronization scripts.

### Running the App

*   **Development Mode**:
    ```bash
    npm run start:dev
    ```
*   **Production Build**:
    ```bash
    npm run build
    npm run electron:build
    ```

## 🏗️ Technical Architecture

PneumaVoice is built on a modern, local-first stack designed for maximum stability in live environments:

*   **Frontend**: React with Tailwind CSS for a premium, responsive UI.
*   **Backend**: Node.js and Socket.io for real-time bidirectional data flow.
*   **AI Engine**: Local transformer models for edge-based transcription and vector similarity search.
*   **Storage**: High-speed local database engine optimized for complex relational and semantic queries.
*   **Desktop**: Electron framework for professional multi-window projection management.

## 🔐 Security & Privacy

*   **Local Processing**: All audio transcription and search operations are performed locally where possible to ensure maximum privacy and offline reliability.
*   **Data Integrity**: Secure handling of session data and local databases.

---

**Built for the modern pulpit and stage.**
*"The Word of God is alive and active..."*