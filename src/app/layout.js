"use client";

import "./globals.css";
import AppBottomNav from "../components/AppBottomNav"; 

// GLOBAL FEATURES
import NetworkStatus from "../components/NetworkStatus";
import PullToRefresh from "../components/PullToRefresh";
import RouteGuard from "../components/RouteGuard";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ModalProvider } from "../context/ModalContext";
import useFcmToken from "../hooks/useFcmToken";
import NotificationManager from "../components/NotificationManager";
import { SessionProvider } from "../context/SessionContext";

import { Suspense } from "react";
function FcmHandler() {
  useFcmToken();
  return null; 
}
export default function RootLayout({ children }) {
  useEffect(() => {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch((error) => {
        console.error('Failed to clear app badge:', error);
      });
    }
  }, []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        {/* CRITICAL: HIDE FROM SEARCH ENGINES */}
        <meta name="robots" content="noindex, nofollow" />
        {/* APPLE PWA TAGS (Required for better installability check) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <Suspense fallback={<div className="h-screen w-screen bg-white dark:bg-black" />}>
          <AuthProvider>
          <SessionProvider>
            <ThemeProvider>
              <ModalProvider>
                <NetworkStatus />
                <NotificationManager />
                <FcmHandler />
                <RouteGuard>
                  <PullToRefresh>
                    <div className="min-h-screen pb-0 relative overflow-x-hidden">
                      {children}
                    </div>
                  </PullToRefresh>
                  <AppBottomNav />
                </RouteGuard>
              </ModalProvider>
            </ThemeProvider>
            </SessionProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}