"use client";
import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const ModalContext = createContext();

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'neutral', // 'neutral', 'success', 'danger'
    onConfirm: null,
    confirmText: 'Okay',
    cancelText: 'Cancel'
  });

  const showModal = useCallback((title, message, type = 'neutral', onConfirm = null, confirmText = 'Okay', cancelText = 'Cancel') => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = () => {
    if (modal.onConfirm) modal.onConfirm();
    closeModal();
  };

  return (
    <ModalContext.Provider value={{ showModal, closeModal }}>
      {children}
      
      {/* GLOBAL APP-LIKE POPUP UI */}
      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#151515] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              {/* Icon Based on Type */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${
                modal.type === 'danger' ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 
                modal.type === 'success' ? 'bg-green-50 text-green-500 dark:bg-green-900/20' : 
                'bg-blue-50 text-blue-500 dark:bg-blue-900/20'
              }`}>
                {modal.type === 'danger' && <AlertCircle size={24} />}
                {modal.type === 'success' && <CheckCircle2 size={24} />}
                {modal.type === 'neutral' && <AlertCircle size={24} />}
              </div>

              <h3 className="text-center text-lg font-black text-gray-900 dark:text-white mb-2">
                {modal.title}
              </h3>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                {modal.message}
              </p>

              <div className="flex gap-3">
                {modal.onConfirm && (
                  <button 
                    onClick={closeModal} 
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-colors active:scale-95"
                  >
                    {modal.cancelText}
                  </button>
                )}
                <button 
                  onClick={handleConfirm} 
                  className={`flex-1 py-3 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all ${
                    modal.type === 'danger' ? 'bg-red-500 shadow-red-500/30' : 
                    modal.type === 'success' ? 'bg-green-600 shadow-green-500/30' : 
                    'bg-blue-600 shadow-blue-500/30'
                  }`}
                >
                  {modal.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

export function useAppModal() {
  return useContext(ModalContext);
}