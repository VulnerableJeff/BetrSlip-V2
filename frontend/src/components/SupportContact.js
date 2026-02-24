import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Headphones, Send, X, ChevronDown, MessageCircle, CheckCircle, Clock } from 'lucide-react';
import { BACKEND_URL } from '@/config/api';

const SupportContact = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('form'); // 'form' | 'history'
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchMyMessages = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/support/messages`);
      setMyMessages(res.data.messages || []);
    } catch {
      // silent fail
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && view === 'history') {
      fetchMyMessages();
    }
  }, [isOpen, view]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }
    setSending(true);
    try {
      await axios.post(`${BACKEND_URL}/api/support/message`, {
        subject: subject.trim(),
        message: message.trim(),
      });
      toast.success('Message sent! We\'ll get back to you soon.');
      setSubject('');
      setMessage('');
      setView('history');
      fetchMyMessages();
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-testid="support-contact-btn"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-110 transition-all duration-200 group"
      >
        <Headphones className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-16 right-3 left-3 sm:left-auto sm:bottom-6 sm:right-6 z-50 sm:w-[400px] flex flex-col transition-all duration-200">
      <Card className="flex flex-col bg-slate-900 border-slate-700 shadow-2xl shadow-violet-500/10 overflow-hidden max-h-[70vh] sm:max-h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600/20 to-purple-600/20 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Headphones className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Support</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                We typically reply within 24h
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            data-testid="support-close-btn"
            className="p-1.5 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setView('form')}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              view === 'form' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            New Message
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              view === 'history' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            My Messages
          </button>
        </div>

        {/* Form View */}
        {view === 'form' && (
          <form onSubmit={handleSubmit} className="p-4 space-y-3 flex-1 overflow-y-auto">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Subject</label>
              <Input
                data-testid="support-subject-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Need help with subscription"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-9"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Message</label>
              <textarea
                data-testid="support-message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question..."
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder:text-slate-500 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <p className="text-slate-600 text-[10px] mt-1 text-right">{message.length}/2000</p>
            </div>
            <Button
              type="submit"
              disabled={sending || !subject.trim() || !message.trim()}
              data-testid="support-send-btn"
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold"
            >
              {sending ? 'Sending...' : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: '380px' }}>
            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-500 text-xs">Loading messages...</p>
              </div>
            ) : myMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">No messages yet</p>
              </div>
            ) : (
              myMessages.map((msg) => (
                <div key={msg.id} className={`rounded-lg p-3 border ${
                  msg.status === 'replied' ? 'bg-emerald-950/20 border-emerald-500/30' :
                  msg.status === 'read' ? 'bg-slate-800/50 border-slate-700' :
                  'bg-violet-950/20 border-violet-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-xs font-semibold truncate flex-1">{msg.subject}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                      msg.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' :
                      msg.status === 'read' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {msg.status === 'replied' ? <><CheckCircle className="w-2.5 h-2.5" /> Replied</> :
                       msg.status === 'read' ? 'Seen' :
                       <><Clock className="w-2.5 h-2.5" /> Pending</>}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-2">{msg.message}</p>
                  {msg.admin_reply && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <p className="text-emerald-400 text-[10px] font-semibold mb-0.5">Admin Reply:</p>
                      <p className="text-slate-300 text-[11px]">{msg.admin_reply}</p>
                    </div>
                  )}
                  <p className="text-slate-600 text-[10px] mt-1">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SupportContact;
