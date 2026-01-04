"use client";

import "./globals.css";
// CORRECT PATH: Go up 1 level -> src -> components -> AppBottomNav
import AppBottomNav from "../components/AppBottomNav"; 

// CORRECT PATH: Go up 1 level -> src -> context -> AuthContext
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

import { Suspense } from "react";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <Suspense fallback={<div className="h-screen w-screen bg-white dark:bg-black" />}>
          <AuthProvider>
            <ThemeProvider>
              <div className="min-h-screen pb-24 relative overflow-x-hidden">
                {children}
              </div>
              <AppBottomNav />
            </ThemeProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}