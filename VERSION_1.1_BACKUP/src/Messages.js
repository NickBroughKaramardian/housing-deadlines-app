import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, query, where, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './Auth';
import { StarIcon as StarSolid, StarIcon as StarOutline } from '@heroicons/react/24/solid';
import { PaperAirplaneIcon, InboxIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import Select from 'react-select';

export default function Messages() {
  const { userProfile, hasPermission, ROLES } = useAuth();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient] = useState('all');
  const [messageType, setMessageType] = useState('direct'); // 'direct' or 'announcement'
  const [selectedDeadline, setSelectedDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy] = useState('date');
  const [sortDir] = useState('desc');
  const [flaggedOnly] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('mailbox'); // 'mailbox' or 'announcements'
  const [mailboxTab, setMailboxTab] = useState('inbox'); // 'inbox' or 'sent' or 'flagged'
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipients, setComposeRecipients] = useState([]);
  const [composeMessage, setComposeMessage] = useState('');
  const [composeError, setComposeError] = useState('');
  const [composeSubject, setComposeSubject] = useState('');

  // Fetch messages for the current user (both sent and received)
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    setLoading(true);
    
    // Query for messages where user is a recipient
    const receivedMessagesQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', userProfile.organizationId),
      where('recipients', 'array-contains', userProfile.uid),
      orderBy('createdAt', 'desc')
    );
    
    // Query for messages where user is the sender
    const sentMessagesQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', userProfile.organizationId),
      where('senderId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );
    
    // Listen to both queries and merge results
    const unsubReceived = onSnapshot(receivedMessagesQuery, (receivedSnapshot) => {
      const receivedMessages = receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Get sent messages from the other query
      const unsubSent = onSnapshot(sentMessagesQuery, (sentSnapshot) => {
        const sentMessages = sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Merge and deduplicate messages
        const allMessages = [...receivedMessages, ...sentMessages];
        const uniqueMessages = allMessages.filter((message, index, self) => 
          index === self.findIndex(m => m.id === message.id)
        );
        
        console.log('Fetched messages:', {
          received: receivedMessages.length,
          sent: sentMessages.length,
          total: uniqueMessages.length,
          messages: uniqueMessages
        });
        
        setMessages(uniqueMessages);
        setLoading(false);
      }, () => setLoading(false));
      
      return unsubSent;
    }, () => setLoading(false));
    
    return unsubReceived;
  }, [userProfile?.organizationId, userProfile?.uid]);

  // Fetch users for recipient selection
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    setLoading(true);
    const usersQuery = query(
      collection(db, 'users'),
      where('organizationId', '==', userProfile.organizationId)
    );
    const unsub = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [userProfile?.organizationId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        content: newMessage,
        senderId: userProfile.uid,
        senderName: userProfile.displayName || userProfile.email,
        senderEmail: userProfile.email,
        organizationId: userProfile.organizationId,
        createdAt: serverTimestamp(),
        readBy: [userProfile.uid],
        messageType,
        linkedDeadline: selectedDeadline || null
      };

      if (messageType === 'direct') {
        if (selectedRecipient === 'all') {
          // Send to all users in organization
          messageData.recipients = users.map(user => user.uid);
          messageData.isAnnouncement = true;
        } else {
          // Send to specific user
          messageData.recipients = [selectedRecipient];
          messageData.isAnnouncement = false;
        }
      } else {
        // Announcement - send to all users
        messageData.recipients = users.map(user => user.uid);
        messageData.isAnnouncement = true;
      }

      await addDoc(collection(db, 'messages'), messageData);
      setNewMessage('');
      setSelectedDeadline('');
      setError('');
    } catch (err) {
      setError('Failed to send message: ' + err.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const handleDeleteMessage = async (id) => {
    try {
      const messageRef = doc(db, 'messages', id);
      const message = messages.find(m => m.id === id);
      
      if (!message) return;
      
      // Initialize deletedBy array if it doesn't exist
      const currentDeletedBy = message.deletedBy || [];
      
      // Add current user to deletedBy array if not already there
      if (!currentDeletedBy.includes(userProfile.uid)) {
        await updateDoc(messageRef, { 
          deletedBy: [...currentDeletedBy, userProfile.uid]
        });
        
        // Update local state
        setMessages(msgs => msgs.map(m => 
          m.id === id 
            ? { ...m, deletedBy: [...currentDeletedBy, userProfile.uid] }
            : m
        ));
      }
    } catch (err) {
      setError('Failed to delete message: ' + err.message);
    }
  };

  // 180-day retention with soft delete
  const now = new Date();
  const inboxMessages = messages.filter(m => {
    if (m.deletedBy && m.deletedBy.includes(userProfile?.uid)) return false;
    if (m.isAnnouncement) return false;
    if (!Array.isArray(m.recipients) || !m.recipients.includes(userProfile?.uid)) return false;
    if (m.senderId === userProfile?.uid) return false;
    if (!m.createdAt) return false;
    const created = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
    return (now - created) / (1000 * 60 * 60 * 24) <= 180;
  });
  
  const sentMessages = messages.filter(m => {
    if (m.deletedBy && m.deletedBy.includes(userProfile?.uid)) return false;
    if (m.isAnnouncement) return false;
    if (m.senderId !== userProfile?.uid) return false;
    if (!m.createdAt) return false;
    const created = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
    return (now - created) / (1000 * 60 * 60 * 24) <= 180;
  });
  const managerNotes = messages.filter(m => {
    // Check if current user has deleted this announcement
    if (m.deletedBy && m.deletedBy.includes(userProfile?.uid)) return false;
    if (!m.isAnnouncement) return false;
    if (!m.createdAt) return false;
    const created = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
    return (now - created) / (1000 * 60 * 60 * 24) <= 180;
  });

  // Flagged messages for this user (received or sent)
  const flaggedMessages = messages.filter(m => {
    // Check if current user has deleted this message
    if (m.deletedBy && m.deletedBy.includes(userProfile?.uid)) return false;
    if (!m.flagged) return false;
    if (!m.createdAt) return false;
    const created = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
    if ((now - created) / (1000 * 60 * 60 * 24) > 180) return false;
    // Show if user is sender or recipient
    return m.senderId === userProfile?.uid || (Array.isArray(m.recipients) && m.recipients.includes(userProfile?.uid));
  });

  // Debug logging
  console.log('Message filtering results:', {
    totalMessages: messages.length,
    inboxCount: inboxMessages.length,
    sentCount: sentMessages.length,
    flaggedCount: flaggedMessages.length,
    managerNotesCount: managerNotes.length,
    userProfile: userProfile?.uid
  });

  // Flag/star logic
  const toggleFlag = async (id, flagged) => {
    try {
      await updateDoc(doc(db, 'messages', id), { flagged: !flagged });
      setMessages(msgs => msgs.map(m => m.id === id ? { ...m, flagged: !flagged } : m));
    } catch (err) {
      setError('Failed to flag message: ' + err.message);
    }
  };

  // Sort logic
  const getSortedMessages = (msgs) => {
    let sorted = [...msgs];
    if (flaggedOnly) sorted = sorted.filter(m => m.flagged);
    sorted.sort((a, b) => {
      if (sortBy === 'date') {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return sortDir === 'desc' ? db - da : da - db;
      } else if (sortBy === 'sender') {
        return sortDir === 'desc'
          ? (b.senderName || b.senderEmail || '').localeCompare(a.senderName || a.senderEmail || '')
          : (a.senderName || a.senderEmail || '').localeCompare(b.senderName || b.senderEmail || '');
      } else if (sortBy === 'flagged') {
        return (b.flagged ? 1 : 0) - (a.flagged ? 1 : 0);
      }
      return 0;
    });
    return sorted;
  };

  // Prepare options for react-select
  const recipientOptions = users.filter(u => u.uid !== userProfile.uid).map(user => ({
    value: user.uid,
    label: user.displayName || user.email
  }));

  // Compose direct message handler
  const handleComposeSend = async (e) => {
    e.preventDefault();
    if (!composeMessage.trim() || composeRecipients.length === 0) {
      setComposeError('Please enter a message and select at least one recipient.');
      return;
    }
    try {
      const messageData = {
        content: composeMessage,
        subject: composeSubject.trim() || '',
        senderId: userProfile.uid,
        senderName: userProfile.displayName || userProfile.email,
        senderEmail: userProfile.email,
        organizationId: userProfile.organizationId,
        createdAt: serverTimestamp(),
        readBy: [userProfile.uid],
        messageType: 'direct',
        recipients: composeRecipients,
        isAnnouncement: false,
        linkedDeadline: null
      };
      await addDoc(collection(db, 'messages'), messageData);
      setComposeMessage('');
      setComposeRecipients([]);
      setComposeSubject('');
      setComposeOpen(false);
      setComposeError('');
    } catch (err) {
      setComposeError('Failed to send message: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto min-h-[600px]">
      {/* Horizontal Tabs */}
      <div className="flex w-full gap-2 mb-6 border-b border-gray-200 dark:border-gray-600">
        <button
          className={`flex-1 min-w-[120px] px-6 py-3 font-semibold transition-colors duration-200 text-center ${sidebarTab === 'mailbox' ? 'text-theme-primary bg-theme-primary-light dark:bg-theme-primary/20' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          onClick={() => { setSidebarTab('mailbox'); setComposeOpen(false); }}
        >
          Mailbox
        </button>
        <button
          className={`flex-1 min-w-[120px] px-6 py-3 font-semibold transition-colors duration-200 text-center ${sidebarTab === 'announcements' ? 'text-theme-primary bg-theme-primary-light dark:bg-theme-primary/20' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          onClick={() => { setSidebarTab('announcements'); setComposeOpen(false); }}
        >
          Manager Announcements
        </button>
      </div>
      <div className="flex min-h-[500px]">
        {/* Vertical Submenu for Mailbox */}
        {sidebarTab === 'mailbox' && (
          <div className="w-48 flex flex-col gap-2 pr-6 border-r border-gray-200 dark:border-gray-600">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${mailboxTab === 'inbox' ? 'bg-theme-primary-light dark:bg-theme-primary/20 text-theme-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              onClick={() => { setMailboxTab('inbox'); setComposeOpen(false); }}
            >
              <InboxIcon className="w-5 h-5" /> Inbox
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${mailboxTab === 'sent' ? 'bg-theme-primary-light dark:bg-theme-primary/20 text-theme-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              onClick={() => { setMailboxTab('sent'); setComposeOpen(false); }}
            >
              <ArrowUpTrayIcon className="w-5 h-5" /> Sent
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${mailboxTab === 'flagged' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              onClick={() => { setMailboxTab('flagged'); setComposeOpen(false); }}
            >
              <StarSolid className="w-5 h-5" /> Flagged
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${composeOpen ? 'bg-theme-primary-light dark:bg-theme-primary/20 text-theme-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              onClick={() => { setComposeOpen(true); setMailboxTab(''); }}
            >
              <PaperAirplaneIcon className="w-5 h-5" /> New Message
            </button>
          </div>
        )}
        {/* Main Content Area */}
        <div className="flex-1 pl-8">
          {sidebarTab === 'mailbox' && (
            <>
              {/* Compose Direct Message */}
              {composeOpen && (
                <form onSubmit={handleComposeSend} className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col gap-4 max-w-xl">
                  <label className="font-medium text-gray-700 dark:text-gray-300">To:</label>
                  <Select
                    isMulti
                    options={recipientOptions}
                    value={recipientOptions.filter(opt => composeRecipients.includes(opt.value))}
                    onChange={opts => setComposeRecipients(opts.map(o => o.value))}
                    placeholder="Select recipients..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : 'white',
                        borderColor: state.isFocused ? 'var(--theme-primary, #10b981)' : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#d1d5db'),
                        boxShadow: state.isFocused ? '0 0 0 1px var(--theme-primary, #10b981)' : 'none',
                        '&:hover': {
                          borderColor: document.documentElement.classList.contains('dark') ? '#6b7280' : '#9ca3af'
                        }
                      }),
                      menu: (provided) => ({
                        ...provided,
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#374151' : 'white',
                        border: `1px solid ${document.documentElement.classList.contains('dark') ? '#4b5563' : '#d1d5db'}`
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isFocused 
                          ? (document.documentElement.classList.contains('dark') ? '#4b5563' : '#f3f4f6')
                          : 'transparent',
                        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
                        '&:hover': {
                          backgroundColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#f3f4f6'
                        }
                      }),
                      multiValue: (provided) => ({
                        ...provided,
                        backgroundColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'
                      }),
                      multiValueLabel: (provided) => ({
                        ...provided,
                        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
                      }),
                      multiValueRemove: (provided) => ({
                        ...provided,
                        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
                        '&:hover': {
                          backgroundColor: document.documentElement.classList.contains('dark') ? '#6b7280' : '#d1d5db',
                          color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#1f2937'
                        }
                      }),
                      input: (provided) => ({
                        ...provided,
                        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
                      }),
                      placeholder: (provided) => ({
                        ...provided,
                        color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                      }),
                      singleValue: (provided) => ({
                        ...provided,
                        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
                      })
                    }}
                  />
                  <label className="font-medium text-gray-700 dark:text-gray-300">Subject:</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
                    maxLength={100}
                    placeholder="Enter subject (optional)"
                  />
                  <label className="font-medium text-gray-700 dark:text-gray-300">Message:</label>
                  <textarea
                    value={composeMessage}
                    onChange={e => setComposeMessage(e.target.value)}
                    rows={4}
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
                    required
                    placeholder="Type your message..."
                  />
                  {composeError && <div className="text-red-600 dark:text-red-400 text-sm">{composeError}</div>}
                  <button type="submit" className="bg-theme-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-theme-primary-hover">Send</button>
                </form>
              )}
              {/* Inbox/Sent Views */}
              {mailboxTab === 'inbox' && !composeOpen && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-100 dark:divide-gray-700">
                  {getSortedMessages(inboxMessages).length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No messages in your inbox.</div>
                  ) : (
                    getSortedMessages(inboxMessages).map(message => {
                      const sender = users.find(u => u.uid === message.senderId);
                      return (
                        <div key={message.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <button onClick={() => toggleFlag(message.id, message.flagged)} className="mr-2">
                                {message.flagged ? <StarSolid className="w-5 h-5 text-yellow-400" /> : <StarOutline className="w-5 h-5 text-gray-300" />}
                              </button>
                              <span className="font-semibold text-gray-900 dark:text-white">{sender ? sender.displayName || sender.email : message.senderEmail}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(message.createdAt)}</span>
                            </div>
                            {message.subject && <div className="text-theme-primary font-semibold text-sm mb-1">Subject: {message.subject}</div>}
                            <div className="text-gray-800 dark:text-gray-200 text-sm mb-1">{message.content}</div>
                          </div>
                          <button onClick={() => handleDeleteMessage(message.id)} className="ml-4 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition">Delete</button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {mailboxTab === 'sent' && !composeOpen && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-100 dark:divide-gray-700">
                  {getSortedMessages(sentMessages).length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No sent messages.</div>
                  ) : (
                    getSortedMessages(sentMessages).map(message => {
                      const recipientNames = Array.isArray(message.recipients)
                        ? message.recipients.map(uid => {
                            const user = users.find(u => u.uid === uid);
                            return user ? user.displayName || user.email : uid;
                          }).join(', ')
                        : '';
                      return (
                        <div key={message.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <button onClick={() => toggleFlag(message.id, message.flagged)} className="mr-2">
                                {message.flagged ? <StarSolid className="w-5 h-5 text-yellow-400" /> : <StarOutline className="w-5 h-5 text-gray-300" />}
                              </button>
                              <span className="font-semibold text-gray-900 dark:text-white">To: {recipientNames}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(message.createdAt)}</span>
                            </div>
                            {message.subject && <div className="text-theme-primary font-semibold text-sm mb-1">Subject: {message.subject}</div>}
                            <div className="text-gray-800 dark:text-gray-200 text-sm mb-1">{message.content}</div>
                          </div>
                          <button onClick={() => handleDeleteMessage(message.id)} className="ml-4 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition">Delete</button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {mailboxTab === 'flagged' && !composeOpen && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-100 dark:divide-gray-700">
                  {getSortedMessages(flaggedMessages).length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No flagged messages.</div>
                  ) : (
                    getSortedMessages(flaggedMessages).map(message => (
                      <div key={message.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <button onClick={() => toggleFlag(message.id, message.flagged)} className="mr-2">
                              {message.flagged ? <StarSolid className="w-5 h-5 text-yellow-400" /> : <StarOutline className="w-5 h-5 text-gray-300" />}
                            </button>
                            <span className="font-semibold text-gray-900 dark:text-white">{message.senderName === userProfile.uid ? 'To: ' + (Array.isArray(message.recipients) ? message.recipients.length : 1) + ' user(s)' : (message.senderName || message.senderEmail)}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(message.createdAt)}</span>
                          </div>
                          <div className="text-gray-800 dark:text-gray-200 text-sm mb-1">{message.content}</div>
                        </div>
                        <button onClick={() => handleDeleteMessage(message.id)} className="ml-4 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition">Delete</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
          {sidebarTab === 'announcements' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-100 dark:divide-gray-700">
              {(hasPermission(ROLES.ADMIN) || hasPermission(ROLES.OWNER)) && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Send Team Announcement</h3>
                  <form onSubmit={e => {
                    e.preventDefault();
                    setMessageType('announcement');
                    handleSendMessage(e);
                  }} className="flex gap-2 items-end">
                    <textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type your announcement..."
                      rows={2}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent resize-none"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-theme-primary text-white px-6 py-2 rounded-lg hover:bg-theme-primary-hover font-semibold transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
              {getSortedMessages(managerNotes).length === 0 ? (
                <div className="p-6 text-center text-gray-500">No team announcements.</div>
              ) : (
                getSortedMessages(managerNotes).map(note => (
                  <div key={note.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">{note.senderName || note.senderEmail}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(note.createdAt)}</span>
                      </div>
                      <div className="text-gray-800 dark:text-gray-200 text-sm mb-1">{note.content}</div>
                    </div>
                    {(hasPermission(ROLES.ADMIN) || hasPermission(ROLES.OWNER)) && (
                      <button onClick={() => handleDeleteMessage(note.id)} className="ml-4 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition">Delete</button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 