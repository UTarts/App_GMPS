"use client";

import "./globals.css";
// CORRECT PATH: Go up 1 level -> src -> components -> AppBottomNav
import AppBottomNav from "../components/AppBottomNav"; 

// NEW COMPONENTS
import NetworkStatus from "../components/NetworkStatus";
import PullToRefresh from "../components/PullToRefresh";
import RouteGuard from "../components/RouteGuard";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
// NEW: Import Modal Provider
import { ModalProvider } from "../context/ModalContext";

import { Suspense } from "react";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
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