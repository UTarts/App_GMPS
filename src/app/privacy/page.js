"use client";
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-800 dark:text-gray-200">
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3">
        <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Privacy Policy</h1>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-black dark:text-white mb-2">1. Introduction</h2>
          <p>
            Govind Madhav Public School ("we", "our") respects your privacy. This app is designed for students and teachers to manage school activities like attendance, homework, and updates.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black dark:text-white mb-2">2. Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
            <li><strong>Personal Info:</strong> Name, Roll Number, Class, and Profile Picture (provided by the school).</li>
            <li><strong>User Content:</strong> Images or files you upload for homework or gallery submissions.</li>
            <li><strong>Device Info:</strong> We use device identifiers to send you push notifications.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black dark:text-white mb-2">3. How We Use Data</h2>
          <p>
            Your data is used solely for educational purposes: to track attendance, display academic records, and facilitate communication between the school and students. We do not sell your data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black dark:text-white mb-2">4. Permissions</h2>
          <p>
            The app may request access to your <strong>Camera</strong> or <strong>Storage</strong> to allow you to upload profile pictures or homework assignments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black dark:text-white mb-2">5. Contact Us</h2>
          <p>
            If you have questions, please contact the school administration at: <br/>
            <span className="font-semibold text-blue-600">info@govindmadhav.com</span>
          </p>
        </section>
        
        <div className="pt-8 text-center text-xs text-gray-400">
            Last Updated: Jan 2026
        </div>
      </div>
    </div>
  );
}