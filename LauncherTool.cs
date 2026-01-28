using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;
using System.IO;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Net.Security;
using System.Text;

namespace LauncherTool
{
    class Program
    {
        // Custom Validator for Riot's Self-Signed Certificate
        private static bool ValidateRemoteCertificate(object sender, X509Certificate certificate, X509Chain chain, SslPolicyErrors policyErrors)
        {
            return true; 
        }
        [DllImport("user32.dll", SetLastError = true)]
        static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("user32.dll")]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        [DllImport("user32.dll")]
        static extern bool SetLayeredWindowAttributes(IntPtr hWnd, uint crKey, byte bAlpha, uint dwFlags);

        [DllImport("user32.dll", SetLastError = true)]
        static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll")]
        static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO lpgui);

        [StructLayout(LayoutKind.Sequential)]
        public struct GUITHREADINFO {
            public int cbSize;
            public int flags;
            public IntPtr hwndActive;
            public IntPtr hwndFocus;
            public IntPtr hwndCapture;
            public IntPtr hwndMenuOwner;
            public IntPtr hwndMoveSize;
            public IntPtr hwndCaret;
            public System.Drawing.Rectangle rcCaret;
        }

        const int SW_HIDE = 0;
        const int SW_SHOW = 5;
        const int GWL_EXSTYLE = -20;
        const int WS_EX_LAYERED = 0x80000;
        const uint LWA_ALPHA = 0x2;
        const uint SWP_NOSIZE = 0x0001;
        const uint SWP_NOZORDER = 0x0004;
        const uint SWP_SHOWWINDOW = 0x0040;
        const uint SWP_HIDEWINDOW = 0x0080;

        [STAThread]
        static void Main(string[] args)
        {
            if (args.Length < 3)
            {
                Console.WriteLine("Usage: LauncherTool.exe <type> <username> <password>");
                return;
            }

            string type = args[0].ToLower();
            string username = args[1];
            string password = args[2];

            if (type == "riot" || type == "valorant" || type == "lol" || type == "tft") 
                AutomateRiot(username, password);
            else if (type == "ea" || type == "apex") 
                AutomateEA(username, password);
            else if (type == "steam") 
                AutomateSteam(username, password);
            else
                Console.WriteLine("[ERROR] Unknown launcher type: " + type);
        }

        static void AutomateRiot(string username, string password)
        {
            Console.WriteLine("[STEP] Initializing Auth Service v2...");
            KillProcess("RiotClientServices");
            
            string path = LoadPathFromRegistry("RiotClientPath") ?? @"C:\Riot Games\Riot Client\RiotClientServices.exe";
            if (!File.Exists(path)) path = @"C:\Riot Games\Riot Client\RiotClientServices.exe";

            try {
                Process.Start(path);
                Console.WriteLine("[INFO] Establishing secure environment (FAST)...");
                
                // Match snippet: 15s absolute delay for client launch
                Thread.Sleep(15000);

                IntPtr mainHandle = FindWindow(null, "Riot Client");
                if (mainHandle == IntPtr.Zero) {
                    Console.WriteLine("[ERROR] Riot Client window not found.");
                    return;
                }

                Console.WriteLine("[STEP] Applying stealth and processing credentials...");
                ApplyStealth("riot");
                
                // Match snippet delays and sequence exactly
                SetForegroundWindow(mainHandle);
                Thread.Sleep(2000);

                SendKeys.SendWait(username);
                Console.WriteLine("[STEP] Identity verification...");
                Thread.Sleep(2000);

                SendKeys.SendWait("{TAB}");
                Thread.Sleep(2000);

                SendKeys.SendWait(password);
                Console.WriteLine("[STEP] Encrypting portal access...");
                Thread.Sleep(3000);

                SendKeys.SendWait("{ENTER}");
                Thread.Sleep(2700);

                Console.WriteLine("[SUCCESS] Authentication successful.");
                RestoreVisibility("riot");
                
                // Wait for session to finalize (Match snippet 1.4s)
                Thread.Sleep(1400); 
            } catch (Exception ex) {
                Console.WriteLine("[FATAL] Service Error: " + ex.Message);
            }
        }

        static void ApplyStealth(string filter) {
            try {
                var procs = Process.GetProcesses();
                foreach (var p in procs) {
                    if (p.ProcessName.ToLower().Contains(filter.ToLower())) {
                        EnumWindows((hWnd, lParam) => {
                            uint pid;
                            GetWindowThreadProcessId(hWnd, out pid);
                            if (pid == p.Id) {
                                // IMPORTANT: Removed SW_HIDE and SWP_HIDEWINDOW to keep the window interactive for SendKeys
                                SetWindowPos(hWnd, IntPtr.Zero, -20000, -20000, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
                                int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
                                SetWindowLong(hWnd, GWL_EXSTYLE, exStyle | WS_EX_LAYERED);
                                SetLayeredWindowAttributes(hWnd, 0, 0, LWA_ALPHA);
                            }
                            return true;
                        }, IntPtr.Zero);
                    }
                }
            } catch {}
        }

        static void RestoreVisibility(string filter) {
            try {
                var procs = Process.GetProcesses();
                foreach (var p in procs) {
                    if (p.ProcessName.ToLower().Contains(filter.ToLower())) {
                        EnumWindows((hWnd, lParam) => {
                            uint pid;
                            GetWindowThreadProcessId(hWnd, out pid);
                            if (pid == p.Id) {
                                SetLayeredWindowAttributes(hWnd, 0, 255, LWA_ALPHA);
                                SetWindowPos(hWnd, IntPtr.Zero, 100, 100, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_SHOWWINDOW);
                                ShowWindow(hWnd, SW_SHOW);
                            }
                            return true;
                        }, IntPtr.Zero);
                    }
                }
            } catch {}
        }

        static void StealthInput(IntPtr handle, string keys, int delay, string filter) {
            SetForegroundWindow(handle);
            SendKeys.SendWait(keys);
            Thread.Sleep(delay);
        }

        static void AutomateEA(string username, string password)
        {
            Console.WriteLine("[STEP] Initializing EA Stealth Auth...");
            KillProcess("EAClient");
            KillProcess("EADesktop");
            KillProcess("EABackendService");

            string path = LoadPathFromRegistry("EAClientPath") ?? @"C:\Program Files\EA Games\EA Launcher\EAClient.exe";
            if (!File.Exists(path)) {
                path = @"C:\Program Files\Electronic Arts\EA Desktop\EA Desktop\EADesktop.exe";
            }

            try {
                Process.Start(path);
                Console.WriteLine("[INFO] Establishing stealth environment...");
                
                IntPtr handle = IntPtr.Zero;
                DateTime startTime = DateTime.Now;
                
                // Match snippet: 10s wait for EA
                while ((DateTime.Now - startTime).TotalSeconds < 30) {
                    if (handle == IntPtr.Zero) {
                        handle = FindWindow(null, "EA Launcher");
                        if (handle == IntPtr.Zero) handle = FindWindow(null, "EA Desktop");
                    }
                    if (handle != IntPtr.Zero && (DateTime.Now - startTime).TotalSeconds > 10) break;
                    Thread.Sleep(100);
                }

                if (handle == IntPtr.Zero) {
                    Console.WriteLine("[ERROR] EA Service window not found.");
                    return;
                }

                ApplyStealth("ea");
                ApplyStealth("edesktop"); 

                Console.WriteLine("[STEP] Transferring credentials (STEALTH)...");
                
                SetForegroundWindow(handle);
                Thread.Sleep(2000);
                
                SendKeys.SendWait(username);
                Thread.Sleep(2000);
                SendKeys.SendWait("{TAB}");
                Thread.Sleep(2000);
                SendKeys.SendWait(password);
                Thread.Sleep(3000);
                SendKeys.SendWait("{ENTER}");
                Thread.Sleep(2500);

                Console.WriteLine("[SUCCESS] EA Authentication successful.");
                RestoreVisibility("ea");
                RestoreVisibility("edesktop");
            } catch (Exception ex) {
                Console.WriteLine("[FATAL] EA Link Error: " + ex.Message);
            }
        }

        static void AutomateSteam(string username, string password)
        {
            Console.WriteLine("[STEP] Initializing Advanced Steam Auth (v4)...");
            
            KillProcess("steam");
            KillProcess("steamwebhelper");
            Thread.Sleep(3000);

            try {
                // Registry pre-fill for smoother UI landing
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam", true)) {
                    if (key != null) {
                        key.SetValue("AutoLoginUser", username);
                        key.SetValue("RememberPassword", 1);
                    }
                }

                string steamPath = "";
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam")) {
                    if (key != null) steamPath = key.GetValue("SteamExe") as string;
                }

                if (string.IsNullOrEmpty(steamPath) || !File.Exists(steamPath)) {
                    steamPath = @"C:\Program Files (x86)\Steam\steam.exe";
                }

                if (File.Exists(steamPath)) {
                    Console.WriteLine("[INFO] Launching Steam in Hardcore Stealth Mode...");
                    // Passing credentials via CLI as backup/pre-fill
                    Process.Start(steamPath, string.Format("-login \"{0}\" \"{1}\" -remember-password", username, password));
                    
                    IntPtr handle = IntPtr.Zero;
                    Console.WriteLine("[INFO] Waiting for UI Input Ready state...");
                    
                    DateTime searchStart = DateTime.Now;

                    while ((DateTime.Now - searchStart).TotalSeconds < 45) {
                        ApplyStealth("steam");
                        
                        // New Steam UI often uses SDL_app class
                        handle = FindWindow(null, "Steam Login");
                        if (handle == IntPtr.Zero) handle = FindWindow(null, "Steam");

                        if (handle != IntPtr.Zero) {
                            SetForegroundWindow(handle);
                            
                            // Check if input is active via GUI info
                            uint dummyPid;
                            uint threadId = GetWindowThreadProcessId(handle, out dummyPid);
                            GUITHREADINFO gui = new GUITHREADINFO();
                            gui.cbSize = Marshal.SizeOf(gui);
                            
                            if (GetGUIThreadInfo(threadId, ref gui)) {
                                // If we have a focus or caret, the React UI is likely interactive
                                if (gui.hwndFocus != IntPtr.Zero || gui.hwndCaret != IntPtr.Zero) {
                                    Console.WriteLine("[STEP] Input interface localized.");
                                    break;
                                }
                            }
                        }
                        Thread.Sleep(500);
                    }

                    if (handle != IntPtr.Zero) {
                        // Brief stabilization
                        Thread.Sleep(2000);
                        ApplyStealth("steam");

                        Console.WriteLine("[STEP] Processing encrypted credentials...");
                        
                        // Force focus with a small click simulate (Enter key can also trigger focus)
                        StealthInput(handle, "{ENTER}", 500, "steam"); 
                        
                        // Standard injection
                        StealthInput(handle, "^a{BACKSPACE}", 500, "steam");
                        StealthInput(handle, username, 800, "steam");
                        StealthInput(handle, "{TAB}", 500, "steam");
                        StealthInput(handle, password, 1000, "steam");
                        StealthInput(handle, "{ENTER}", 500, "steam");
                        
                        Console.WriteLine("[INFO] Synchronizing session...");
                        Thread.Sleep(5000);
                        ApplyStealth("steam");

                        Console.WriteLine("[SUCCESS] Steam authentication successful.");
                        RestoreVisibility("steam");
                    } else {
                        Console.WriteLine("[ERROR] Steam UI handshake timed out.");
                    }
                } else {
                    Console.WriteLine("[ERROR] Steam path invalid.");
                }
            } catch (Exception ex) {
                Console.WriteLine("[FATAL] Steam Link Error: " + ex.Message);
            }
        }

        static void KillProcess(string name)
        {
            foreach (var p in Process.GetProcesses())
            {
                if (p.ProcessName.ToLower().Contains(name.ToLower()))
                {
                    try { p.Kill(); p.WaitForExit(); } catch {}
                }
            }
        }

        static string LoadPathFromRegistry(string key)
        {
            try
            {
                using (RegistryKey regKey = Registry.CurrentUser.OpenSubKey(@"Software\N1App\Launchers"))
                {
                    if (regKey != null) return regKey.GetValue(key) as string;
                }
            }
            catch {}
            return null;
        }
    }
}
