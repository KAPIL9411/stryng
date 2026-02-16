import useStore from '../../store/useStore';
import { X, CheckCircle, AlertCircle, Info, ShoppingCart } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Toast() {
  const { toast, hideToast } = useStore();

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} strokeWidth={2.5} />;
      case 'error':
        return <AlertCircle size={20} strokeWidth={2.5} />;
      case 'info':
        return <Info size={20} strokeWidth={2.5} />;
      case 'cart':
        return <ShoppingCart size={20} strokeWidth={2.5} />;
      default:
        return <CheckCircle size={20} strokeWidth={2.5} />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'toast--success';
      case 'error':
        return 'toast--error';
      case 'info':
        return 'toast--info';
      case 'cart':
        return 'toast--cart';
      default:
        return 'toast--success';
    }
  };

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`toast ${getStyles()}`}
        >
          <div className="toast__icon">
            {getIcon()}
          </div>
          <p className="toast__message">{toast.message}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              hideToast();
            }}
            className="toast__close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
