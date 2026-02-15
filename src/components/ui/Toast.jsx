import useStore from '../../store/useStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Toast() {
  const { toast, hideToast } = useStore();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  const styles = {
    success: 'toast--success',
    error: 'toast--error',
    info: 'toast--info', // We'll add this style if needed, or default
  };

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`toast ${styles[toast.type] || ''}`}
          onClick={hideToast}
        >
          {icons[toast.type]}
          <span>{toast.message}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              hideToast();
            }}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
