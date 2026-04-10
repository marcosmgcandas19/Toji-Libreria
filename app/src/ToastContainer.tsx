import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastItemProps {
  toast: ToastProps
  onClose: (id: string) => void
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onClose(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast, onClose])

  const bgColor =
    toast.type === 'success'
      ? 'bg-green-100 text-green-800 border-green-300'
      : toast.type === 'error'
        ? 'bg-red-100 text-red-800 border-red-300'
        : 'bg-blue-100 text-blue-800 border-blue-300'

  const iconColor =
    toast.type === 'success'
      ? 'text-green-600'
      : toast.type === 'error'
        ? 'text-red-600'
        : 'text-blue-600'

  const Icon =
    toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : CheckCircle

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg border-2 ${bgColor} shadow-lg animate-fadeIn`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="ml-2 text-gray-500 hover:text-gray-700 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  // Exponer función global para mostrar toasts
  useEffect(() => {
    window.showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
      const id = Date.now().toString()
      const newToast: ToastProps = {
        id,
        message,
        type,
        duration,
      }
      setToasts((prev) => [...prev, newToast])
    }

    return () => {
      delete window.showToast
    }
  }, [])

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={handleClose} />
      ))}
    </div>
  )
}

declare global {
  interface Window {
    showToast?: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void
  }
}
