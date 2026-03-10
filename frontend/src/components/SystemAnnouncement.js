import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, AlertCircle, Info, CheckCircle, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BACKEND_URL } from '@/config/api';

const SystemAnnouncement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [modalAnnouncement, setModalAnnouncement] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await axios.get(`${BACKEND_URL}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const anns = res.data.announcements || [];
      setAnnouncements(anns.filter(a => !a.show_modal));
      
      // Show first modal announcement
      const modalAnn = anns.find(a => a.show_modal);
      if (modalAnn) {
        setModalAnnouncement(modalAnn);
      }
    } catch (error) {
      console.log('Could not fetch announcements');
    }
  };

  const dismissAnnouncement = async (annId, isModal = false) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BACKEND_URL}/api/announcements/${annId}/dismiss`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (isModal) {
        setModalAnnouncement(null);
      } else {
        setAnnouncements(prev => prev.filter(a => a.id !== annId));
      }
    } catch (error) {
      console.log('Could not dismiss announcement');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getColors = (type) => {
    switch (type) {
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      case 'success': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
      default: return 'bg-violet-500/10 border-violet-500/30 text-violet-300';
    }
  };

  if (announcements.length === 0 && !modalAnnouncement) return null;

  return (
    <>
      {/* Banner Announcements */}
      {announcements.map(ann => (
        <div 
          key={ann.id}
          className={`border-b ${getColors(ann.type)}`}
          data-testid="system-announcement-banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{ann.message}</p>
              </div>
              {ann.dismissible && (
                <button
                  onClick={() => dismissAnnouncement(ann.id)}
                  className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                  data-testid="dismiss-announcement-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Modal Announcement */}
      {modalAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                modalAnnouncement.type === 'warning' ? 'bg-amber-500/20' :
                modalAnnouncement.type === 'success' ? 'bg-emerald-500/20' :
                'bg-violet-500/20'
              }`}>
                <Megaphone className={`w-6 h-6 ${
                  modalAnnouncement.type === 'warning' ? 'text-amber-400' :
                  modalAnnouncement.type === 'success' ? 'text-emerald-400' :
                  'text-violet-400'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">System Update</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{modalAnnouncement.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => dismissAnnouncement(modalAnnouncement.id, true)}
                className="bg-violet-600 hover:bg-violet-700 text-white"
                data-testid="dismiss-modal-announcement-btn"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SystemAnnouncement;
