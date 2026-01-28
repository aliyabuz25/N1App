# N1App - Stealth Game Launcher

N1App is a premium, high-performance game automation and synchronization tool designed for professional boosters and power users. It features an advanced stealth injection system that allows for seamless account switching across various game clients including Riot Games, EA Desktop, and Steam.

## Key Features

-   **Hardcore Stealth Injection:** Automates login processes by moving client windows off-screen and setting zero opacity, ensuring credentials are never exposed on screen.
-   **Multi-Client Support:** Built-in automation for Valorant, League of Legends, TFT, Apex Legends, and Steam games.
-   **Dynamic Update System:** Automatically verifies current version against the GitHub repository and prompts users for updates.
-   **Security Watchdog:** Monitors system processes for analysis tools (Wireshark, Fiddler, etc.) to ensure a secure operating environment.
-   **Premium UI/UX:** Modern, glassmorphism-inspired design with smooth transitions and real-time status logging.

## Technical Architecture

-   **Frontend:** Electron with Vanilla JS/CSS for a lightweight and responsive experience.
-   **Automation Core:** C# (.NET Framework) `LauncherTool.exe` utilizing Win32 APIs (`SetWindowPos`, `GetGUIThreadInfo`, `SendKeys`) for low-level window manipulation.
-   **Communication:** Secure IPC bridge between Electron and the C# automation utility.

## Getting Started

### Prerequisites

-   Windows OS
-   .NET Framework 4.5+ (for LauncherTool)
-   Node.js (for development/running via npm)

### Basic Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/aliyabuz25/N1App.git
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure API Endpoints:
    Update `main.js` with your specific API endpoints and keys:
    ```javascript
    const API_BASE = "https://YOUR_API_ENDPOINT_HERE/v1/n1app";
    const API_KEY = "YOUR_SECURE_API_KEY_HERE";
    ```
4.  Run the application:
    ```bash
    npm start
    ```

## Security Note

This repository has been sanitized. API keys, secrets, and personal credentials have been removed. Ensure you use your own secure backend services for authentication and data synchronization.

---
© 2025 N1Boost Group. All rights reserved.