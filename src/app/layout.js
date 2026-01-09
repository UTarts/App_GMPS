"use client";

import "./globals.css";
// CORRECT PATH: Go up 1 level -> src -> components -> AppBottomNav
import AppBottomNav from "../components/AppBottomNav"; 

// GLOBAL FEATURES
import NetworkStatus from "../components/NetworkStatus";
import PullToRefresh from "../components/PullToRefresh";
import RouteGuard from "../components/RouteGuard";

// CORRECT PATH: Go up 1 level -> src -> context -> AuthContext
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ModalProvider } from "../context/ModalContext";

import { Suspense } from "react";

export default function RootLayout({ children }) {
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
            <ThemeProvider>
              <ModalProvider>
                <NetworkStatus />
                <RouteGuard>
                  <PullToRefresh>
                    <div className="min-h-screen pb-24 relative overflow-x-hidden">
                      {children}
                    </div>
                  </PullToRefresh>
                  <AppBottomNav />
                </RouteGuard>
              </ModalProvider>
            </ThemeProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}