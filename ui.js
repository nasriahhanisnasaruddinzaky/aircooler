import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  update,
  remove
} from 'firebase/database';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  FileText,
  Users,
  Settings,
  HelpCircle,
  Bell,
  Menu,
  ChevronDown,
  MapPin,
  Calendar,
  Clock,
  User,
  UploadCloud,
  CheckCircle2,
  Scan,
  AlertCircle,
  HelpCircle as QuestionIcon,
  Check,
  Building2,
  Wallet,
  Smartphone,
  Briefcase,
  Watch,
  Key,
  Layers,
  RotateCw,
  Radio,
  LogOut,
  Shield,
  Phone,
  Mail,
  Lock,
  UserPlus,
  Trash2,
  Download,
  Printer,
  Headphones,
  MessageSquare,
  Globe,
  Sliders,
  BellRing,
  Award,
  Search,
  Filter,
  ArrowUpRight
} from 'lucide-react';

const RTDB_URL = "https://rfid-3667e-default-rtdb.asia-southeast1.firebasedatabase.app";

const firebaseConfig = {
  apiKey: "AIzaSyAsfIGVKMH0GuV0RKHaxXOBTFWYC5hc97g",
  authDomain: "rfid-3667e.firebaseapp.com",
  databaseURL: RTDB_URL,
  projectId: "rfid-3667e",
  storageBucket: "rfid-3667e.firebasestorage.app",
  messagingSenderId: "319502534729",
  appId: "1:319502534729:web:bc397d1e88172d0c931798",
  measurementId: "G-WW6SRPDP8T"
};

// Singleton Firebase initialization
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(firebaseApp, RTDB_URL);

const playCardBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Autoplay restrictions safely handled
  }
};

const CATEGORIES = [
  { id: 'Wallet', label: 'Wallet', icon: Wallet },
  { id: 'Phone', label: 'Phone', icon: Smartphone },
  { id: 'Bag', label: 'Bag', icon: Briefcase },
  { id: 'Watch', label: 'Watch', icon: Watch },
  { id: 'Keys', label: 'Keys', icon: Key },
  { id: 'Electronics', label: 'Electronics', icon: Smartphone },
  { id: 'Others', label: 'Others', icon: Package }
];

const DEFAULT_USERS = [
  {
    id: 'admin_1',
    username: 'admin',
    password: 'password123',
    fullName: 'Mohd Hazim',
    email: 'admin@thezenithhotel.com',
    role: 'Admin',
    department: 'Management & IT',
    contact: '+60 19-345 6789',
    createdAt: Date.now() - 30 * 86400000
  },
  {
    id: 'rec_1',
    username: 'aina',
    password: 'password123',
    fullName: 'Aina Farhana',
    email: 'aina.farhana@thezenithhotel.com',
    role: 'Receptionist',
    department: 'Front Desk',
    contact: '+60 13-987 6543',
    createdAt: Date.now() - 20 * 86400000
  },
  {
    id: 'rec_2',
    username: 'hakimi',
    password: 'password123',
    fullName: 'Hakimi Rosli',
    email: 'hakimi@thezenithhotel.com',
    role: 'Security',
    department: 'Loss Prevention & Security',
    contact: '+60 17-555 4321',
    createdAt: Date.now() - 10 * 86400000
  }
];

const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeStr = () => {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getInitialForm = (foundByName) => ({
  name: '',
  category: 'Wallet',
  description: '',
  location: '',
  dateFound: getTodayDate(),
  timeFound: getCurrentTimeStr(),
  foundBy: foundByName || 'Aina Farhana (Receptionist)',
  rfidUid: '',
  guestName: '',
  roomNumber: '',
  contactNumber: '',
  email: '',
  notes: ''
});

export default function App() {
  // Session & Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('lostiq_logged_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [loginForm, setLoginForm] = useState({ username: 'aina', password: 'password123' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navigation State
  const [currentView, setCurrentView] = useState('dashboard');
  const [itemsMenuOpen, setItemsMenuOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Real Database State
  const [items, setItems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [currentScan, setCurrentScan] = useState({ uid: '', status: 'IDLE', timestamp: '' });
  const [dbConnected, setDbConnected] = useState(false);
  const [newScanAlert, setNewScanAlert] = useState(false);
  const [activities, setActivities] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState('');

  // Item Form State
  const [formData, setFormData] = useState(() => getInitialForm('Aina Farhana (Receptionist)'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState(null);

  // User Management State (Admin)
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'Receptionist',
    department: 'Front Desk',
    contact: ''
  });

  // Settings State
  const [hotelSettings, setHotelSettings] = useState({
    hotelName: 'Zenith Hotel Kuantan',
    branchCode: 'ZHK-MY-01',
    address: 'Jalan Putra Square 6, Putra Square, 25200 Kuantan, Pahang, Malaysia',
    currency: 'MYR (RM)',
    timezone: 'Asia/Kuala_Lumpur (GMT+8)',
    readerLocation: 'Main Reception Terminal 1',
    esp32DeviceIp: '192.168.137.49',
    autoAssignTag: true,
    soundAlerts: true,
    unclaimedDaysThreshold: 90,
    notificationEmail: 'lostfound@thezenithhotel.com'
  });

  // Help & Support Inquiry State
  const [inquiryForm, setInquiryForm] = useState({ subject: '', details: '', priority: 'Normal' });
  const [inquirySent, setInquirySent] = useState(false);

  // Search & Filter States
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const prevUidRef = useRef('');

  useEffect(() => {
    if (!document.getElementById('lostiq-tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'lostiq-tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
    if (!document.getElementById('lostiq-font')) {
      const link = document.createElement('link');
      link.id = 'lostiq-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    // Sync Users from Firebase Realtime Database
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list = Object.keys(val).map((k) => ({ id: k, ...val[k] }));
        setUsersList(list);
      } else {
        // Seed default users if node is empty
        DEFAULT_USERS.forEach((u) => {
          set(ref(db, `users/${u.username}`), u);
        });
        setUsersList(DEFAULT_USERS);
      }
    });

    // Sync Settings from Firebase
    const settingsRef = ref(db, 'settings');
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setHotelSettings(prev => ({ ...prev, ...snapshot.val() }));
      }
    });

    return () => {
      unsubUsers();
      unsubSettings();
    };
  }, []);

  const fetchAllRealData = useCallback(async () => {
    try {
      // 1. Poll current_scan from ESP32
      const scanRes = await fetch(`${RTDB_URL}/current_scan.json`);
      if (scanRes.ok) {
        const scanData = await scanRes.json();
        if (scanData && scanData.uid) {
          setDbConnected(true);
          setCurrentScan(scanData);
          setLastSyncTime(new Date().toLocaleTimeString());

          // Detect new physical card tap
          if (scanData.uid !== prevUidRef.current) {
            prevUidRef.current = scanData.uid;
            setFormData(prev => ({ ...prev, rfidUid: scanData.uid }));
            if (hotelSettings.soundAlerts) {
              playCardBeep();
            }
            setNewScanAlert(true);
            setTimeout(() => setNewScanAlert(false), 3500);

            // Log real activity
            const scanAct = {
              id: Date.now(),
              title: 'Hardware RFID Detected',
              desc: `Tag UID "${scanData.uid}" tapped on ESP32 terminal.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'scanned'
            };
            setActivities(prev => [scanAct, ...prev.slice(0, 15)]);
          }
        }
      }

      // 2. Poll registered items
      const itemsRes = await fetch(`${RTDB_URL}/items.json`);
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        if (itemsData && typeof itemsData === 'object') {
          const list = Object.keys(itemsData).map(k => ({
            id: k,
            ...itemsData[k]
          }));
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setItems(list);
        } else {
          setItems([]);
        }
      }
    } catch (err) {
      console.warn('Hardware sync notice:', err);
    }
  }, [hotelSettings.soundAlerts]);

  useEffect(() => {
    let isMounted = true;

    // Realtime Database WebSocket listeners
    const scanRef = ref(db, 'current_scan');
    const unsubScan = onValue(scanRef, (snapshot) => {
      if (!isMounted) return;
      setDbConnected(true);
      if (snapshot.exists()) {
        const val = snapshot.val();
        setCurrentScan(val);
        if (val.uid) {
          setFormData(prev => ({ ...prev, rfidUid: val.uid }));
          if (prevUidRef.current !== val.uid) {
            prevUidRef.current = val.uid;
            if (hotelSettings.soundAlerts) {
              playCardBeep();
            }
            setNewScanAlert(true);
            setTimeout(() => setNewScanAlert(false), 3500);
          }
        }
      }
    });

    const itemsRef = ref(db, 'items');
    const unsubItems = onValue(itemsRef, (snapshot) => {
      if (!isMounted) return;
      setDbConnected(true);
      if (snapshot.exists()) {
        const raw = snapshot.val();
        const list = Object.keys(raw).map((key) => ({
          id: key,
          ...raw[key]
        }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setItems(list);
      } else {
        setItems([]);
      }
    });

    // Run initial fetch immediately
    fetchAllRealData();

    // High-frequency polling (1.5s) to guarantee real ESP32 scans never hang
    const pollInterval = setInterval(() => {
      if (isMounted) fetchAllRealData();
    }, 1500);

    return () => {
      isMounted = false;
      unsubScan();
      unsubItems();
      clearInterval(pollInterval);
    };
  }, [fetchAllRealData, hotelSettings.soundAlerts]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    setTimeout(() => {
      const usernameTrim = loginForm.username.trim().toLowerCase();
      const passwordTrim = loginForm.password.trim();

      // Look in dynamic users or default fallback
      const pool = usersList.length > 0 ? usersList : DEFAULT_USERS;
      const matched = pool.find(
        (u) =>
          (u.username.toLowerCase() === usernameTrim || u.email.toLowerCase() === usernameTrim) &&
          u.password === passwordTrim
      );

      if (matched) {
        setCurrentUser(matched);
        try {
          localStorage.setItem('lostiq_logged_user', JSON.stringify(matched));
        } catch (err) {}
        setFormData(prev => ({
          ...prev,
          foundBy: `${matched.fullName} (${matched.role})`
        }));
        showToast(`Welcome back, ${matched.fullName}!`, 'success');
      } else {
        setLoginError('Invalid username/email or password. Please try again.');
      }
      setIsLoggingIn(false);
    }, 400);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('lostiq_logged_user');
    } catch (e) {}
    setUserDropdownOpen(false);
    showToast('You have been logged out successfully.', 'success');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userFormData.username.trim() || !userFormData.password.trim() || !userFormData.fullName.trim()) {
      showToast('Please fill all required user fields.', 'error');
      return;
    }

    const cleanKey = userFormData.username.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newUserRecord = {
      id: cleanKey,
      username: userFormData.username.trim().toLowerCase(),
      password: userFormData.password.trim(),
      fullName: userFormData.fullName.trim(),
      email: userFormData.email.trim() || `${cleanKey}@thezenithhotel.com`,
      role: userFormData.role,
      department: userFormData.department,
      contact: userFormData.contact.trim() || '+60 12-000 0000',
      createdAt: Date.now()
    };

    try {
      await set(ref(db, `users/${cleanKey}`), newUserRecord);
      setUsersList(prev => [...prev.filter(u => u.username !== newUserRecord.username), newUserRecord]);
      showToast(`User account for "${newUserRecord.fullName}" created!`, 'success');
      setNewUserModalOpen(false);
      setUserFormData({
        username: '',
        password: '',
        fullName: '',
        email: '',
        role: 'Receptionist',
        department: 'Front Desk',
        contact: ''
      });
    } catch (err) {
      showToast(`Failed to save user: ${err.message}`, 'error');
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete.username === 'admin') {
      showToast('The primary system administrator cannot be removed.', 'error');
      return;
    }
    try {
      await remove(ref(db, `users/${userToDelete.id || userToDelete.username}`));
      setUsersList(prev => prev.filter(u => u.username !== userToDelete.username));
      showToast(`User "${userToDelete.fullName}" removed.`, 'success');
    } catch (err) {
      showToast(`Failed to delete user: ${err.message}`, 'error');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleManualScanTest = async () => {
    try {
      const manualUid = currentScan.uid || "91 2F C4 1D";
      setFormData(prev => ({ ...prev, rfidUid: manualUid }));
      if (hotelSettings.soundAlerts) {
        playCardBeep();
      }
      setNewScanAlert(true);
      setTimeout(() => setNewScanAlert(false), 2500);

      await fetch(`${RTDB_URL}/current_scan.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: manualUid,
          status: 'READY_TO_ASSIGN',
          timestamp: new Date().toLocaleTimeString()
        })
      });
    } catch (e) {
      console.warn('Sync notice:', e);
    }
  };

  const handleSaveItem = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter an Item Name.', 'error');
      return;
    }
    if (!formData.rfidUid.trim()) {
      showToast('No RFID Tag detected! Tap your card on the ESP32 reader.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanKey = formData.rfidUid.replace(/[^a-zA-Z0-9]/g, '_');
      const newItem = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || 'No description provided',
        location: formData.location.trim() || 'Front Desk',
        dateFound: formData.dateFound,
        timeFound: formData.timeFound,
        foundBy: formData.foundBy || `${currentUser?.fullName || 'Staff'} (${currentUser?.role || 'Receptionist'})`,
        uid: formData.rfidUid.trim(),
        guestName: formData.guestName.trim(),
        roomNumber: formData.roomNumber.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim(),
        notes: formData.notes.trim(),
        status: 'STORED',
        createdAt: Date.now()
      };

      // Direct REST write to guarantee instant persistence
      await fetch(`${RTDB_URL}/items/${cleanKey}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      // Mark current_scan as stored on hardware
      await fetch(`${RTDB_URL}/current_scan.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'STORED',
          assignedTo: newItem.name
        })
      });

      setItems(prev => [newItem, ...prev.filter(i => i.uid !== newItem.uid)]);

      const act = {
        id: Date.now(),
        title: 'New Item Registered',
        desc: `${newItem.name} (${newItem.uid}) saved at ${newItem.location}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'registered'
      };
      setActivities(prev => [act, ...prev.slice(0, 15)]);

      showToast(`Item "${newItem.name}" saved with Tag ${newItem.uid}!`, 'success');
      setFormData(getInitialForm(currentUser?.fullName ? `${currentUser.fullName} (${currentUser.role})` : ''));
    } catch (err) {
      showToast(`Save error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItemStatus = async (item, newStatus) => {
    const cleanKey = (item.uid || item.id).replace(/[^a-zA-Z0-9]/g, '_');
    try {
      await fetch(`${RTDB_URL}/items/${cleanKey}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, updatedAt: Date.now() })
      });

      setItems(prev => prev.map(i => i.id === item.id || i.uid === item.uid ? { ...i, status: newStatus } : i));

      const act = {
        id: Date.now(),
        title: `Item ${newStatus === 'RETURNED' ? 'Returned to Guest' : 'Status Updated'}`,
        desc: `${item.name} (${item.uid}) marked as ${newStatus}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: newStatus === 'RETURNED' ? 'returned' : 'updated'
      };
      setActivities(prev => [act, ...prev.slice(0, 15)]);
      showToast(`Item ${item.name} marked as ${newStatus}.`, 'success');
    } catch (e) {
      showToast(`Failed to update status: ${e.message}`, 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await set(ref(db, 'settings'), hotelSettings);
      showToast('Hotel & RFID settings successfully saved!', 'success');
    } catch (err) {
      showToast(`Failed to save settings: ${err.message}`, 'error');
    }
  };

  const handleSendSupportTicket = (e) => {
    e.preventDefault();
    if (!inquiryForm.subject.trim() || !inquiryForm.details.trim()) {
      showToast('Please provide a subject and details for your ticket.', 'error');
      return;
    }
    setInquirySent(true);
    setTimeout(() => {
      setInquirySent(false);
      setInquiryForm({ subject: '', details: '', priority: 'Normal' });
      showToast('Support ticket dispatched to Zenith IT Support Desk!', 'success');
    }, 1200);
  };

  const showToast = (message, type = 'success') => {
    setNotificationMsg({ message, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const metrics = useMemo(() => {
    const total = items.length;
    const stored = items.filter((i) => i.status === 'STORED').length;
    const returned = items.filter((i) => i.status === 'RETURNED').length;
    const unclaimed = items.filter((i) => i.status === 'UNCLAIMED').length;
    return { total, stored, returned, unclaimed };
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts = { Wallet: 0, Phone: 0, Bag: 0, Watch: 0, Keys: 0, Electronics: 0, Others: 0 };
    items.forEach((item) => {
      const cat = item.category || 'Others';
      if (counts[cat] !== undefined) counts[cat] += 1;
      else counts.Others += 1;
    });
    return counts;
  }, [items]);

  const exportReportCSV = () => {
    if (items.length === 0) {
      showToast('No items available to export.', 'error');
      return;
    }
    const headers = ["RFID Tag UID", "Item Name", "Category", "Location", "Guest Name", "Room", "Date Found", "Status"];
    const rows = items.map(item => [
      `"${item.uid || ''}"`,
      `"${item.name || ''}"`,
      `"${item.category || ''}"`,
      `"${item.location || ''}"`,
      `"${item.guestName || ''}"`,
      `"${item.roomNumber || ''}"`,
      `"${item.dateFound || ''}"`,
      `"${item.status || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LOSTIQ_Report_${getTodayDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report CSV exported successfully!', 'success');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#091116] via-[#0d1c24] to-[#07161b] text-slate-100 flex items-center justify-center p-4 antialiased">
        <div className="max-w-md w-full bg-[#111f28]/95 border border-slate-700/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f6f57] to-[#14532d] flex items-center justify-center text-white shadow-xl shadow-emerald-950/60 mb-4 border border-emerald-500/30">
              <Package size={34} className="text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tight text-white">LOST</span>
              <span className="text-2xl font-black text-emerald-400">IQ</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Smart Lost & Found Management System</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-[11px] font-semibold text-emerald-300">
              <Building2 size={12} />
              <span>Zenith Hotel Kuantan Portal</span>
            </div>
          </div>

          {loginError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. aina or admin"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  required
                />
                <User size={16} className="absolute right-3.5 top-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  required
                />
                <Lock size={16} className="absolute right-3.5 top-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0f6f57] to-[#15803d] hover:from-[#117a60] hover:to-[#166534] text-white text-sm font-bold shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 mt-2"
            >
              {isLoggingIn ? (
                <>
                  <RotateCw size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Log In to Terminal</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Badges */}
          <div className="mt-7 pt-5 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider mb-3">
              Quick One-Click Test Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginForm({ username: 'aina', password: 'password123' });
                  setLoginError('');
                }}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-left transition flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-900/50 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  AF
                </div>
                <div className="leading-tight truncate">
                  <div className="text-xs font-bold text-white">Aina (Reception)</div>
                  <div className="text-[10px] text-slate-400">aina / pass123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginForm({ username: 'admin', password: 'password123' });
                  setLoginError('');
                }}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-left transition flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-900/50 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  <Shield size={13} />
                </div>
                <div className="leading-tight truncate">
                  <div className="text-xs font-bold text-white">System Admin</div>
                  <div className="text-[10px] text-slate-400">admin / pass123</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderSidebar = () => (
    <aside className="w-64 bg-[#0d171e] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-800/60">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0f6f57] to-[#14532d] flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
          <Package size={22} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-xl font-black tracking-tight text-white">LOST</span>
            <span className="text-xl font-black text-emerald-400">IQ</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-tight">
            Smart Lost & Found<br />Management System
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <button
          onClick={() => { setCurrentView('dashboard'); setMobileSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentView === 'dashboard'
              ? 'bg-[#155e49] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <div className="pt-1">
          <button
            onClick={() => setItemsMenuOpen(!itemsMenuOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentView === 'addItem' || currentView === 'allItems'
                ? 'bg-[#155e49]/70 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Package size={18} />
              <span>Items</span>
            </div>
            <ChevronDown size={16} className={`transition-transform duration-200 ${itemsMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {itemsMenuOpen && (
            <div className="pl-9 pr-2 py-1.5 space-y-1">
              <button
                onClick={() => { setCurrentView('allItems'); setMobileSidebarOpen(false); }}
                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium transition ${
                  currentView === 'allItems'
                    ? 'text-emerald-400 bg-emerald-950/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                • All Items ({items.length})
              </button>
              <button
                onClick={() => { setCurrentView('addItem'); setMobileSidebarOpen(false); }}
                className={`w-full text-left py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                  currentView === 'addItem'
                    ? 'text-emerald-400 bg-emerald-950/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Add New Item</span>
                </div>
              </button>
              <button
                onClick={() => { setCurrentView('allItems'); setMobileSidebarOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                • Scan History
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => { setCurrentView('reports'); setMobileSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentView === 'reports'
              ? 'bg-[#155e49] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText size={18} />
          <span>Reports</span>
        </button>

        <button
          onClick={() => { setCurrentView('users'); setMobileSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentView === 'users'
              ? 'bg-[#155e49] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users size={18} />
          <span>Users</span>
        </button>

        <button
          onClick={() => { setCurrentView('settings'); setMobileSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentView === 'settings'
              ? 'bg-[#155e49] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <button
          onClick={() => { setCurrentView('help'); setMobileSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentView === 'help'
              ? 'bg-[#155e49] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle size={18} />
          <span>Help & Support</span>
        </button>

        {}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 bg-rose-500/5 group shadow-sm"
          >
            <LogOut size={18} className="text-rose-400 group-hover:text-rose-300 transition-transform group-hover:-translate-x-1" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {}
      {/* Current User Bottom Badge */}
      <div className="p-3 border-t border-slate-800/80 bg-[#091116]/80 relative">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs border border-slate-600 shrink-0">
              {currentUser?.fullName ? currentUser.fullName.substring(0, 2).toUpperCase() : 'AF'}
            </div>
            <div className="leading-tight truncate">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser?.fullName || 'Staff'}
              </div>
              <div className="text-[10px] text-slate-400">
                {currentUser?.role || 'Receptionist'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600/30 transition shrink-0 ml-1"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );

  const renderHeader = () => (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          {currentView === 'dashboard' ? (
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Dashboard</h1>
          ) : currentView === 'reports' ? (
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Executive Reports & Analytics</h1>
          ) : currentView === 'users' ? (
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Staff & User Management</h1>
          ) : currentView === 'settings' ? (
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">System & RFID Settings</h1>
          ) : currentView === 'help' ? (
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Help & Technical Support</h1>
          ) : (
            <>
              <span className="font-medium text-slate-400">Items</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800">
                {currentView === 'addItem' ? 'Add New Item' : 'All Items'}
              </span>
            </>
          )}
        </div>
      </div>

      {}
      <div className="flex items-center gap-4">
        {/* ESP32 Hardware Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
          <span className="hidden sm:inline">{dbConnected ? 'ESP32 Online' : 'Connecting to Hardware...'}</span>
          {currentScan.uid && (
            <span className="font-mono bg-emerald-100/80 px-1.5 py-0.5 rounded text-[11px] text-emerald-900">
              {currentScan.uid}
            </span>
          )}
        </div>

        <button 
          onClick={fetchAllRealData} 
          title="Manual Hardware Ping"
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
        >
          <RotateCw size={16} />
        </button>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-semibold bg-slate-50/50">
          <Building2 size={15} className="text-emerald-700" />
          <span>{hotelSettings.hotelName}</span>
        </div>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
            {currentUser?.fullName ? currentUser.fullName.substring(0, 2).toUpperCase() : 'AF'}
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <div className="text-xs font-bold text-slate-800">{currentUser?.fullName || 'Aina Farhana'}</div>
            <div className="text-[11px] text-slate-400">{currentUser?.role || 'Receptionist'}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out of System"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 rounded-xl transition border border-rose-200 bg-rose-50/50 shadow-sm"
          >
            <LogOut size={14} />
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );

  const renderReportsView = () => {
    const recoveryRate = metrics.total > 0 ? Math.round((metrics.returned / metrics.total) * 100) : 0;
    const sustainabilityRate = metrics.total > 0 ? Math.round((metrics.unclaimed / metrics.total) * 100) : 0;

    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Reports</h2>
            <p className="text-xs text-slate-500 mt-1">
              Audit analytics, recovery milestones, and sustainability reports for Zenith Hotel Kuantan
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition shadow-sm bg-white"
            >
              <Printer size={15} />
              <span>Print Audit</span>
            </button>
            <button
              onClick={exportReportCSV}
              className="px-4 py-2 bg-[#0f6f57] hover:bg-[#0b5442] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-950/20"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Report Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{metrics.total}</h3>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                  <ArrowUpRight size={13} /> 100% cloud synced
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Package size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Guest Return Rate</p>
                <h3 className="text-3xl font-black text-emerald-700 mt-1">{recoveryRate}%</h3>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {metrics.returned} of {metrics.total} items claimed
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Award size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Safe Custody</p>
                <h3 className="text-3xl font-black text-sky-700 mt-1">{metrics.stored}</h3>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Stored at Front Desk Lockers
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Building2 size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sustainability & Donation</p>
                <h3 className="text-3xl font-black text-amber-700 mt-1">{metrics.unclaimed}</h3>
                <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
                  {metrics.unclaimed} items eligible (&gt;90d)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Globe size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown by Category & SDG Compliance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
              Category Distribution Summary
            </h3>
            <div className="space-y-4">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700">{cat}</span>
                      <span className="text-slate-900">{count} items ({pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 to-[#0d2822] text-white border border-emerald-800/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/60 text-emerald-300 text-[11px] font-bold mb-3">
                <Globe size={13} />
                <span>UN SDG 9, 11, 12 Hospitality Compliance</span>
              </div>
              <h3 className="text-lg font-bold text-white">90-Day Sustainability Protocol</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                In line with Zenith Hotel Kuantan's green hospitality initiative, items remaining unclaimed after 90 days are audited for authorized community donation or certified electronics recycling.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Threshold Period:</span>
                <strong className="text-white">90 Days</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Items Pending Donation:</span>
                <strong className="text-amber-400 font-bold">{metrics.unclaimed}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Authorized Charity:</span>
                <strong className="text-white">Pahang Community Chest</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsersView = () => (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Staff & User Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Authorize hotel personnel, assign system roles, and configure terminal login access
          </p>
        </div>
        <button
          onClick={() => setNewUserModalOpen(true)}
          className="px-4 py-2.5 bg-[#0f6f57] hover:bg-[#0b5442] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-950/20"
        >
          <UserPlus size={16} />
          <span>Add New Staff User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Full Name</th>
                <th className="py-3 px-3">Username</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Contact No</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(usersList.length > 0 ? usersList : DEFAULT_USERS).map((usr) => (
                <tr key={usr.id || usr.username} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5 font-bold text-slate-900">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                        {usr.fullName ? usr.fullName.substring(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div>
                        <div>{usr.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{usr.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-700 font-semibold">{usr.username}</td>
                  <td className="py-3.5 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      usr.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                      usr.role === 'Security' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {usr.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">{usr.department || 'Front Desk'}</td>
                  <td className="py-3.5 px-3 text-slate-600">{usr.contact || '-'}</td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {usr.username !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(usr)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Remove User"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New User Modal */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Staff Account</h3>
                <p className="text-xs text-slate-400">Assign role and credentials to allow terminal access</p>
              </div>
              <button
                onClick={() => setNewUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mohd Rashid"
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Login Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rashid"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Assigned <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Receptionist">Receptionist</option>
                    <option value="Admin">Admin</option>
                    <option value="Security">Security Officer</option>
                    <option value="Housekeeping">Housekeeping Lead</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Front Desk / Loss Prevention"
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +60 12-345 6789"
                    value={userFormData.contact}
                    onChange={(e) => setUserFormData({ ...userFormData, contact: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0f6f57] hover:bg-[#0b5442] text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5"
                >
                  <Check size={15} />
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderSettingsView = () => (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System & RFID Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure hotel metadata, RFID hardware terminal parameters, retention thresholds, and preferences
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Hotel Profile */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
            <Building2 size={17} />
            <span>1. Hotel Establishment Profile</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hotel Property Name</label>
              <input
                type="text"
                value={hotelSettings.hotelName}
                onChange={(e) => setHotelSettings({ ...hotelSettings, hotelName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Branch Identifier Code</label>
              <input
                type="text"
                value={hotelSettings.branchCode}
                onChange={(e) => setHotelSettings({ ...hotelSettings, branchCode: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Address</label>
              <input
                type="text"
                value={hotelSettings.address}
                onChange={(e) => setHotelSettings({ ...hotelSettings, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: ESP32 Hardware & RFID Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
            <Sliders size={17} />
            <span>2. Hardware Terminal & RFID Reader Settings</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reader Location / Label</label>
              <input
                type="text"
                value={hotelSettings.readerLocation}
                onChange={(e) => setHotelSettings({ ...hotelSettings, readerLocation: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">ESP32 Static IP (LAN)</label>
              <input
                type="text"
                value={hotelSettings.esp32DeviceIp}
                onChange={(e) => setHotelSettings({ ...hotelSettings, esp32DeviceIp: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hotelSettings.soundAlerts}
                onChange={(e) => setHotelSettings({ ...hotelSettings, soundAlerts: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-700">
                Play audible synthesizer chime when an RFID card is tapped on the ESP32 reader
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hotelSettings.autoAssignTag}
                onChange={(e) => setHotelSettings({ ...hotelSettings, autoAssignTag: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-700">
                Automatically populate newly detected RFID Tag UIDs into the active "Add New Item" form
              </span>
            </label>
          </div>
        </div>

        {/* Section 3: Retention & Sustainability Policy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
            <Globe size={17} />
            <span>3. Retention & Sustainability Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unclaimed Holding Days (Before Donation)
              </label>
              <input
                type="number"
                min="30"
                max="365"
                value={hotelSettings.unclaimedDaysThreshold}
                onChange={(e) => setHotelSettings({ ...hotelSettings, unclaimedDaysThreshold: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Audit Notification Email
              </label>
              <input
                type="email"
                value={hotelSettings.notificationEmail}
                onChange={(e) => setHotelSettings({ ...hotelSettings, notificationEmail: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#0f6f57] hover:bg-[#0b5442] text-white text-xs font-bold shadow-md shadow-emerald-900/20 flex items-center gap-2 transition"
          >
            <Check size={16} />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );

  const renderHelpView = () => (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Help & Technical Support</h2>
        <p className="text-xs text-slate-500 mt-1">
          Direct contact numbers, hotel internal extensions, and RFID terminal troubleshooting assistance
        </p>
      </div>

      {/* Prominent Emergency Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-md shadow-emerald-900/20">
            <Phone size={20} />
          </div>
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Zenith IT Helpline</span>
          <h3 className="text-xl font-black text-slate-900 mt-1">+60 9-565 9999</h3>
          <p className="text-xs text-slate-600 mt-1">
            Direct Line • Available 24/7 for Reception and Loss Prevention staff
          </p>
          <div className="mt-3 pt-3 border-t border-emerald-200/60 text-[11px] font-semibold text-emerald-700">
            Internal Extension: <strong className="font-mono text-emerald-900">Ext. 104 / 802</strong>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-blue-50/70 border border-sky-200 rounded-2xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-3 shadow-md shadow-sky-900/20">
            <MessageSquare size={20} />
          </div>
          <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">Hardware WhatsApp Hotline</span>
          <h3 className="text-xl font-black text-slate-900 mt-1">+60 19-345 6789</h3>
          <p className="text-xs text-slate-600 mt-1">
            Fast response for ESP32 hardware, RC522 antenna issues, and tag replacement.
          </p>
          <div className="mt-3 pt-3 border-t border-sky-200/60 text-[11px] font-semibold text-sky-700">
            Average Response: &lt; 5 minutes
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-3">
            <Mail size={20} />
          </div>
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Official Support Desk</span>
          <h3 className="text-base font-black text-slate-900 mt-1 truncate">support@lostiq.com.my</h3>
          <p className="text-xs text-slate-600 mt-1">
            Submit audit inquiries, compliance documents, or system backup requests.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] font-semibold text-slate-500">
            Property: Zenith Hotel Kuantan
          </div>
        </div>
      </div>

      {/* Troubleshooting FAQs + Support Ticket Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Headphones size={16} className="text-emerald-700" />
            <span>Frequently Asked Questions & RFID Troubleshooting</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <h4 className="font-bold text-slate-900">How do I bind an RFID card to a lost item?</h4>
              <p className="text-slate-600 leading-relaxed">
                Tap the card on the RC522 reader. The ESP32 will upload the UID to Firebase (`current_scan`). In the "Add New Item" page, the RFID field will automatically fill in. Enter the item details and click "Save Item".
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <h4 className="font-bold text-slate-900">What if the ESP32 shows "Upload FAILED" on the LCD?</h4>
              <p className="text-slate-600 leading-relaxed">
                Ensure your local Wi-Fi router or mobile hotspot with SSID `rfid` and password `rfid1234` is active. Also verify your Firebase RTDB Rules allow `.read: true` and `.write: true`.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <h4 className="font-bold text-slate-900">How do we return an item to a hotel guest?</h4>
              <p className="text-slate-600 leading-relaxed">
                Go to "All Items", locate the entry or scan the attached RFID tag, verify the guest's ID and room number, then click the "Return to Guest" action button.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Ticket Dispatch */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <MessageSquare size={16} className="text-emerald-700" />
            <span>Submit Urgent IT Request</span>
          </h3>

          <form onSubmit={handleSendSupportTicket} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Issue Subject</label>
              <input
                type="text"
                placeholder="e.g. Reader in Lobby not beeping"
                value={inquiryForm.subject}
                onChange={(e) => setInquiryForm({ ...inquiryForm, subject: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Urgency Level</label>
              <select
                value={inquiryForm.priority}
                onChange={(e) => setInquiryForm({ ...inquiryForm, priority: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
              >
                <option value="Normal">Normal Inquiry</option>
                <option value="Urgent">Urgent (Front Desk Blocked)</option>
                <option value="Replacement">Hardware Tag Replacement</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
              <textarea
                rows={4}
                placeholder="Describe the problem, error code, or card UID..."
                value={inquiryForm.details}
                onChange={(e) => setInquiryForm({ ...inquiryForm, details: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={inquirySent}
              className="w-full py-2.5 rounded-xl bg-[#0f6f57] hover:bg-[#0b5442] text-white font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              {inquirySent ? (
                <>
                  <RotateCw size={14} className="animate-spin" />
                  <span>Dispatching to IT...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Send Ticket to IT Support</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderAddItemView = () => (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {notificationMsg && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 transition-all ${
          notificationMsg.type === 'error'
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          {notificationMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="font-medium">{notificationMsg.message}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Item</h2>
        <p className="text-xs text-slate-500 mt-1">
          Fill in the details of the lost item or scan a tag using the ESP32 terminal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-sm space-y-7">
          
          {/* Section 1: Item Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-700">1. Item Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Leather Wallet, iPhone, Room Key"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe colors, brand, serial numbers, condition..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Photo (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-slate-50/80 transition cursor-pointer h-24">
                  <UploadCloud size={22} className="text-slate-400 mb-1" />
                  <span className="text-xs font-medium text-slate-600">Click to upload or drag & drop</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG (Max 5MB)</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Found Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-700">2. Found Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Found Location <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Room 305 / Lobby / Swimming Pool"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 pr-9 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                    required
                  />
                  <MapPin size={15} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date Found <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateFound}
                  onChange={(e) => handleInputChange('dateFound', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Time Found <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.timeFound}
                  onChange={(e) => handleInputChange('timeFound', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Found By <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.foundBy}
                onChange={(e) => handleInputChange('foundBy', e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: RFID Information with Live ESP32 integration */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-emerald-700 flex items-center justify-between">
              <span>3. RFID Information</span>
              <span className="text-[11px] font-normal text-slate-500 flex items-center gap-1">
                <Radio size={12} className={dbConnected ? "text-emerald-500 animate-pulse" : "text-slate-400"} />
                {currentScan.uid ? `ESP32 Scanned: ${currentScan.uid}` : 'Waiting for hardware...'}
              </span>
            </h3>

            <label className="block text-xs font-semibold text-slate-700">
              RFID Tag ID <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={currentScan.uid ? `Auto-detected: ${currentScan.uid}` : "Tap card on reader or click Scan"}
                  value={formData.rfidUid}
                  onChange={(e) => handleInputChange('rfidUid', e.target.value)}
                  className={`w-full bg-slate-50/70 border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold transition focus:outline-none ${
                    newScanAlert
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/40 text-emerald-800'
                      : 'border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-600'
                  }`}
                  required
                />
                {newScanAlert && (
                  <span className="absolute right-3 top-2.5 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                    Tag Detected!
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleManualScanTest}
                className="px-4 py-2.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 shadow-sm"
              >
                <Scan size={16} />
                <span>Scan RFID Tag</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 4: Guest Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-700">4. Guest Information (If Available)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Guest Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe / Mr. Hakimi"
                  value={formData.guestName}
                  onChange={(e) => handleInputChange('guestName', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Room Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 305"
                  value={formData.roomNumber}
                  onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +60 12-345 6789"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. guest@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 5: Notes */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-emerald-700">5. Notes (Optional)</h3>
            <textarea
              rows={2}
              placeholder="Any additional information, locker number, or handover remarks..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setFormData(getInitialForm(`${currentUser?.fullName} (${currentUser?.role})`))}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#0f6f57] hover:bg-[#0b5442] disabled:bg-slate-300 text-white text-xs font-bold shadow-md shadow-emerald-900/20 flex items-center gap-2 transition"
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Saving to Database...' : 'Save Item'}</span>
            </button>
          </div>
        </div>

        {/* Right Live Item Preview strictly matching current input */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Item Preview</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                This is how the item information will appear in the system.
              </p>
            </div>

            <div className="mt-5 border border-slate-100 rounded-2xl p-5 bg-slate-50/50 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0f6f57] flex items-center justify-center mx-auto shadow-inner mb-3">
                {formData.category === 'Phone' ? <Smartphone size={28} className="text-emerald-700" /> :
                 formData.category === 'Bag' ? <Briefcase size={28} className="text-emerald-700" /> :
                 formData.category === 'Watch' ? <Watch size={28} className="text-emerald-700" /> :
                 formData.category === 'Keys' ? <Key size={28} className="text-emerald-700" /> :
                 <Wallet size={28} className="text-emerald-700" />}
              </div>

              <h4 className="text-sm font-bold text-slate-900 mb-4">
                {formData.name || 'Enter Item Name'}
              </h4>

              <div className="space-y-2.5 text-left text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Package size={13} /> Item Name
                  </span>
                  <span className="font-bold text-slate-800">
                    {formData.name || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Layers size={13} /> Category
                  </span>
                  <span className="font-semibold text-slate-700">
                    {formData.category}
                  </span>
                </div>

                <div className="flex items-start justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 flex items-center gap-2">
                    <FileText size={13} /> Description
                  </span>
                  <span className="font-medium text-slate-700 text-right max-w-[170px] truncate">
                    {formData.description || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Scan size={13} /> RFID Tag ID
                  </span>
                  <span className={`font-mono font-bold ${formData.rfidUid ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {formData.rfidUid || 'No tag scanned'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 flex items-center gap-2">
                    <MapPin size={13} /> Found Location
                  </span>
                  <span className="font-medium text-slate-800">
                    {formData.location || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Calendar size={13} /> Date Found
                  </span>
                  <span className="font-medium text-slate-800">
                    {formData.dateFound}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400 flex items-center gap-2">
                    <User size={13} /> Guest Name
                  </span>
                  <span className="font-medium text-slate-800">
                    {formData.guestName || '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 flex items-center gap-2">
                    <CheckCircle2 size={13} /> Status
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Ready to Store
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug text-[11px]">
                After saving, the item will be permanently bound to this RFID tag in the cloud database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboardView = () => (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 4 Real KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#f0fdf4] border border-emerald-200/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Total Items</p>
              <h3 className="text-4xl font-black text-slate-900 mt-2">{metrics.total}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Live from database</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-[#f0f9ff] border border-sky-200/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Stored</p>
              <h3 className="text-4xl font-black text-slate-900 mt-2">{metrics.stored}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Currently in custody</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="bg-[#fefce8] border border-amber-200/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Returned</p>
              <h3 className="text-4xl font-black text-slate-900 mt-2">{metrics.returned}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Returned to guests</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="bg-[#fff1f2] border border-rose-200/80 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Unclaimed</p>
              <h3 className="text-4xl font-black text-slate-900 mt-2">{metrics.unclaimed}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Unclaimed items (&gt;90d)</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <QuestionIcon size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Items Overview + Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Items Overview</h3>
            <div className="text-xs text-slate-500 font-medium">
              Total Recorded: <strong className="text-slate-800">{items.length}</strong>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
              <Package size={28} className="mb-2 text-slate-300" />
              <span>No real items in database yet.</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Scan a card on your ESP32 to register your first item.</span>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {['Wallet', 'Phone', 'Bag', 'Watch', 'Keys', 'Others'].map((cat) => {
                const count = categoryCounts[cat] || 0;
                const pct = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-600">{cat}</span>
                      <span className="font-bold text-slate-800">{count} item{count !== 1 ? 's' : ''} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Top Categories (Live)</h3>

          <div className="space-y-3 w-full text-xs font-medium my-auto">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
              return (
                <div key={cat} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span className="text-slate-700">{cat}</span>
                  </div>
                  <span className="font-bold text-slate-800">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Synchronized with Regional RTDB ({lastSyncTime || 'Connected'})
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Real Items + Real Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Recent Real Items</h3>
            <button
              onClick={() => setCurrentView('allItems')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View All ({items.length})
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No registered items in the system yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5">Item Name</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5">Location</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 font-semibold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          {item.category === 'Phone' ? <Smartphone size={15} className="text-slate-600" /> :
                           item.category === 'Bag' ? <Briefcase size={15} className="text-slate-600" /> :
                           item.category === 'Watch' ? <Watch size={15} className="text-slate-600" /> :
                           item.category === 'Keys' ? <Key size={15} className="text-slate-600" /> :
                           <Wallet size={15} className="text-slate-600" />}
                        </div>
                        <span>{item.name}</span>
                      </td>
                      <td className="py-3 text-slate-600">{item.category}</td>
                      <td className="py-3 text-slate-600">{item.location}</td>
                      <td className="py-3 text-slate-500">{item.dateFound}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'STORED' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'RETURNED' ? 'bg-blue-100 text-blue-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Live Hardware Activity</h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {currentScan.uid ? `UID: ${currentScan.uid}` : 'Idle'}
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Waiting for hardware activity. Tap a card on your ESP32.
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="relative flex items-start gap-3 text-xs">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                    act.type === 'registered' ? 'bg-emerald-100 border-emerald-300 text-emerald-700' :
                    act.type === 'scanned' ? 'bg-sky-100 border-sky-300 text-sky-700' :
                    'bg-purple-100 border-purple-300 text-purple-700'
                  }`}>
                    {act.type === 'registered' && <PlusCircle size={14} />}
                    {act.type === 'scanned' && <Scan size={14} />}
                    {act.type === 'returned' && <Check size={14} />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{act.title}</span>
                      <span className="text-[11px] text-slate-400">{act.time}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5 text-[11px]">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAllItemsView = () => {
    const filteredItems = items.filter((item) => {
      const matchSearch =
        (item.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (item.uid || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (item.location || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (item.guestName || '').toLowerCase().includes(searchFilter.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });

    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">All Stored Items</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage hotel lost & found inventory in real-time</p>
          </div>
          <button
            onClick={() => setCurrentView('addItem')}
            className="px-4 py-2 bg-[#0f6f57] hover:bg-[#0b5442] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
          >
            <PlusCircle size={15} />
            <span>Add New Item</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, tag UID, or room..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {['ALL', 'STORED', 'RETURNED', 'UNCLAIMED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  statusFilter === st
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Package size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No items match your query</p>
              <p className="mt-1">Tap a card on the ESP32 and click "Add New Item" to register your first item.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">RFID UID</th>
                    <th className="py-3 px-3">Item Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Guest / Room</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">{item.uid}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 text-slate-600">{item.category}</td>
                      <td className="py-3 px-3 text-slate-600">{item.location}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.guestName ? `${item.guestName} (${item.roomNumber || 'N/A'})` : 'None specified'}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{item.dateFound}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'STORED' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'RETURNED' ? 'bg-blue-100 text-blue-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {item.status === 'STORED' && (
                          <button
                            onClick={() => handleUpdateItemStatus(item, 'RETURNED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                          >
                            Return to Guest
                          </button>
                        )}
                        {item.status !== 'STORED' && (
                          <button
                            onClick={() => handleUpdateItemStatus(item, 'STORED')}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition"
                          >
                            Reopen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-800 antialiased">
      <style>{`
        * {
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        {renderSidebar()}
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10">
            {renderSidebar()}
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {renderHeader()}

        <main className="flex-1">
          {currentView === 'dashboard' && renderDashboardView()}
          {currentView === 'addItem' && renderAddItemView()}
          {currentView === 'allItems' && renderAllItemsView()}
          {currentView === 'reports' && renderReportsView()}
          {currentView === 'users' && renderUsersView()}
          {currentView === 'settings' && renderSettingsView()}
          {currentView === 'help' && renderHelpView()}
        </main>
      </div>
    </div>
  );
}