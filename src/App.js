import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword
} from 'firebase/auth';
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
  ChevronDown, 
  ChevronRight, 
  PlusCircle, 
  FileText, 
  Users, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Bell, 
  UploadCloud, 
  Radio, 
  Scan, 
  CheckCircle2, 
  X, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  Key, 
  Search, 
  ShieldAlert, 
  Download, 
  Printer, 
  Phone, 
  Mail, 
  AlertCircle, 
  ImageIcon, 
  Menu,
  Copy,
  Check,
  User,
  ShieldCheck,
  Save,
  Lock,
  History,
  Tag,
  MapPin
} from 'lucide-react';

const getEnv = (key, fallback) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore runtime permission restrictions
  }
  return fallback;
};

const RTDB_URL = "https://rfid-3667e-default-rtdb.asia-southeast1.firebasedatabase.app";


const firebaseConfig = {
  apiKey: getEnv('REACT_APP_FIREBASE_API_KEY', "AIzaSyA6WS5A-IdTN0aWoz2wDxg8XfD_RZ3cUWk"),
  authDomain: getEnv('REACT_APP_FIREBASE_AUTH_DOMAIN', "air-cooler-b6f0d.firebaseapp.com"),
  databaseURL: getEnv('REACT_APP_FIREBASE_DATABASE_URL', "https://air-cooler-b6f0d-default-rtdb.asia-southeast1.firebasedatabase.app"),
  projectId: getEnv('REACT_APP_FIREBASE_PROJECT_ID', "air-cooler-b6f0d"),
  storageBucket: getEnv('REACT_APP_FIREBASE_STORAGE_BUCKET', "air-cooler-b6f0d.firebasestorage.app"),
  messagingSenderId: getEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID', "653820155355"),
  appId: getEnv('REACT_APP_FIREBASE_APP_ID', "1:653820155355:web:13075c0efe1a5595bcc3fe"),
  measurementId: getEnv('REACT_APP_FIREBASE_MEASUREMENT_ID', "G-T0MC9WJX41")
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app, RTDB_URL);

export default function App() {
  // Authentication & Profile States
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    name: 'Staff User',
    role: 'Staff',
    email: '',
    department: 'Front Office',
    phone: ''
  });

  // Settings / Profile Edit States
  const [profileForm, setProfileForm] = useState({
    name: '',
    department: '',
    phone: ''
  });
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [itemsMenuOpen, setItemsMenuOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real-Time Data from Firebase
  const [items, setItems] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [currentScan, setCurrentScan] = useState({ uid: '', status: 'IDLE', timestamp: '' });
  const [scanHistory, setScanHistory] = useState([]);

  // Scan History Filter States
  const [scanSearchTerm, setScanSearchTerm] = useState('');
  const [scanFilterType, setScanFilterType] = useState('ALL');

  // Dedicated Live Scan Trigger States (Add Item Form)
  const [isAwaitingScan, setIsAwaitingScan] = useState(false);
  const [scanSuccessCue, setScanSuccessCue] = useState(false);

  // Dedicated Live Scanner Tab States (matches your UI layout)
  const [scannerInputTag, setScannerInputTag] = useState('');
  const [isScannerAwaiting, setIsScannerAwaiting] = useState(false);
  const [scannerSuccessCue, setScannerSuccessCue] = useState(false);

  // Filtering & Search for Items Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [itemFilter, setItemFilter] = useState('ALL');

  // Notifications Popover State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const getCurrentTimeString = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    category: 'Wallet',
    description: '',
    photo: '',
    foundLocation: '',
    dateFound: getTodayDateString(),
    timeFound: getCurrentTimeString(),
    foundBy: '',
    rfidTag: '',
    guestName: '',
    roomNumber: '',
    contactNumber: '',
    email: '',
    notes: '',
    status: 'STORED'
  });

  // Modals States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewPhotoModalUrl, setViewPhotoModalUrl] = useState(null);

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Receptionist',
    department: 'Front Office',
    phone: ''
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState({ type: '', text: '' });

  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(null);

  // Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    actionType: null,
    targetId: null
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn-loader')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn-loader';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }

    if (!document.getElementById('inter-font-loader')) {
      const link = document.createElement('link');
      link.id = 'inter-font-loader';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const realName = data.name || user.displayName || user.email?.split('@')[0] || 'Staff User';
            const dept = data.department || 'Management & IT';
            const phone = data.phone || '';
            const role = data.role || (user.email?.toLowerCase().includes('admin') ? 'Administrator' : 'Staff');
            setUserProfile({
              name: realName,
              role: role,
              email: user.email,
              department: dept,
              phone: phone
            });
            setProfileForm({
              name: realName,
              department: dept,
              phone: phone
            });
            setFormData((prev) => ({
              ...prev,
              foundBy: `${realName} (${role})`
            }));
          } else {
            const isRootAdmin = user.email?.toLowerCase().includes('admin');
            const defaultRole = isRootAdmin ? 'Administrator' : 'Receptionist';
            const realName = user.displayName || user.email?.split('@')[0] || (isRootAdmin ? 'Admin' : 'Staff User');
            setUserProfile({
              name: realName,
              role: defaultRole,
              email: user.email,
              department: 'Management & IT',
              phone: ''
            });
            setProfileForm({
              name: realName,
              department: 'Management & IT',
              phone: ''
            });
            setFormData((prev) => ({
              ...prev,
              foundBy: `${realName} (${defaultRole})`
            }));
          }
        });
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const itemsRef = ref(database, 'items');
    const unsubscribeItems = onValue(itemsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loaded = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        setItems(loaded.reverse());
      } else {
        setItems([]);
      }
    });

    const staffRef = ref(database, 'users');
    const unsubscribeUsers = onValue(staffRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loaded = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        setStaffUsers(loaded);
      } else {
        setStaffUsers([]);
      }
    });

    const scanRef = ref(database, 'current_scan');
    const unsubscribeScan = onValue(scanRef, (snapshot) => {
      if (snapshot.exists()) {
        const scanData = snapshot.val();
        if (scanData) {
          setCurrentScan(scanData);
        }
      }
    });

    const historyRef = ref(database, 'scan_history');
    const unsubscribeHistory = onValue(historyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loaded = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        setScanHistory(loaded.reverse());
      } else {
        setScanHistory([]);
      }
    });

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${RTDB_URL}/current_scan.json`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.uid) {
            setCurrentScan((prev) => {
              if (prev.uid !== data.uid || prev.status !== data.status) {
                return data;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        // Polling error
      }
    }, 2000);

    return () => {
      unsubscribeItems();
      unsubscribeUsers();
      unsubscribeScan();
      unsubscribeHistory();
      clearInterval(pollInterval);
    };
  }, [currentUser]);

  const playScanChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio suppression
    }
  }, []);

  // Sync scan on Add Item Form
  useEffect(() => {
    if (isAwaitingScan && currentScan?.uid && typeof currentScan.uid === 'string' && currentScan.uid.trim() !== '') {
      const capturedUid = currentScan.uid.trim();
      setFormData((prev) => ({ ...prev, rfidTag: capturedUid }));
      setIsAwaitingScan(false);
      setScanSuccessCue(true);
      playScanChime();
      setTimeout(() => setScanSuccessCue(false), 4000);
    }
  }, [currentScan, isAwaitingScan, playScanChime]);

  // Sync scan on Dedicated Live Scanner Tab
  useEffect(() => {
    if (currentScan?.uid && typeof currentScan.uid === 'string' && currentScan.uid.trim() !== '') {
      const capturedUid = currentScan.uid.trim();
      setScannerInputTag(capturedUid);
      if (isScannerAwaiting) {
        setIsScannerAwaiting(false);
        setScannerSuccessCue(true);
        playScanChime();
        setTimeout(() => setScannerSuccessCue(false), 4000);
      }
    }
  }, [currentScan, isScannerAwaiting, playScanChime]);

  const handleStartRfidScan = async () => {
    setIsAwaitingScan(true);
    setScanSuccessCue(false);
    try {
      await set(ref(database, 'current_scan/uid'), '');
    } catch (err) {
      // Pass
    }
  };

  const handleCancelRfidScan = () => {
    setIsAwaitingScan(false);
  };

  const handleStartScannerTabScan = async () => {
    setIsScannerAwaiting(true);
    setScannerSuccessCue(false);
    try {
      await set(ref(database, 'current_scan/uid'), '');
    } catch (err) {
      // Pass
    }
  };

  const handleCancelScannerTabScan = () => {
    setIsScannerAwaiting(false);
  };

  const isAdmin = useMemo(() => {
    const roleLower = (userProfile.role || '').toLowerCase();
    const emailLower = (currentUser?.email || '').toLowerCase();
    return roleLower.includes('admin') || emailLower.includes('admin');
  }, [userProfile.role, currentUser?.email]);

  const totalItemsCount = items.length;
  const storedCount = useMemo(() => items.filter((i) => (i.status || 'STORED') === 'STORED').length, [items]);
  const returnedCount = useMemo(() => items.filter((i) => i.status === 'RETURNED').length, [items]);
  const unclaimedCount = useMemo(() => items.filter((i) => i.status === 'UNCLAIMED').length, [items]);

  const monthlyCounts = useMemo(() => {
    const counts = new Array(12).fill(0);
    items.forEach((item) => {
      const dateStr = item.dateFound || item.registeredAt || item.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          counts[d.getMonth()]++;
        }
      }
    });
    return counts;
  }, [items]);

  const chartWidth = 500;
  const chartHeight = 160;
  const padBottom = 24;
  const maxMonthVal = Math.max(...monthlyCounts, 1);

  const monthlyPoints = useMemo(() => {
    return monthlyCounts.map((count, idx) => {
      const x = 30 + idx * ((chartWidth - 60) / 11);
      const ratio = count / maxMonthVal;
      const y = (chartHeight - padBottom) - (ratio * (chartHeight - padBottom - 30));
      return { x, y, count };
    });
  }, [monthlyCounts, maxMonthVal]);

  const polylinePointsString = useMemo(() => {
    return monthlyPoints.map((p) => `${p.x},${p.y}`).join(' ');
  }, [monthlyPoints]);

  const categoriesList = useMemo(() => ['Wallet', 'Phone', 'Bag', 'Watch', 'Others'], []);
  const categoryCounts = useMemo(() => {
    const counts = { Wallet: 0, Phone: 0, Bag: 0, Watch: 0, Others: 0 };
    items.forEach((it) => {
      const cat = it.category || 'Others';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.Others++;
      }
    });
    return counts;
  }, [items]);

  const systemNotifications = useMemo(() => {
    const list = [];
    if (currentScan?.uid) {
      list.push({
        id: `scan-${currentScan.uid}`,
        title: 'Hardware Scan Detected',
        message: `Tag ${currentScan.uid} tapped on reader`,
        time: currentScan.timestamp ? new Date(currentScan.timestamp).toLocaleTimeString() : 'Just now',
        type: 'scan'
      });
    }
    items.slice(0, 5).forEach((item) => {
      list.push({
        id: `item-${item.id}`,
        title: item.status === 'RETURNED' ? 'Item Returned' : 'Item Registered',
        message: `${item.name} (${item.category || 'Item'}) - ${item.foundLocation || 'Hotel'}`,
        time: item.dateFound || 'Recent',
        type: item.status || 'STORED'
      });
    });
    return list;
  }, [currentScan, items]);

  const unreadCount = notificationsRead ? 0 : Math.min(systemNotifications.length, 5);

  const unifiedScanRecords = useMemo(() => {
    const recordsMap = new Map();

    scanHistory.forEach((log) => {
      const rawTag = (log.uid || log.rfidTag || '').trim();
      if (!rawTag) return;
      const cleanTag = rawTag.replace(/\s+/g, '').toUpperCase();
      const timeBucket = log.timestamp ? Math.floor(new Date(log.timestamp).getTime() / (1000 * 60 * 5)) : log.id;
      const key = `${cleanTag}-${log.eventType || 'SCAN'}-${timeBucket}`;

      if (!recordsMap.has(key)) {
        recordsMap.set(key, {
          id: log.id || key,
          rfidTag: rawTag,
          timestamp: log.timestamp || log.time || log.createdAt || new Date().toISOString(),
          eventType: log.eventType || 'HARDWARE_SCAN',
          deviceName: log.device || 'ESP32 Reader Terminal',
          status: log.status || 'SCANNED'
        });
      }
    });

    if (currentScan?.uid && typeof currentScan.uid === 'string' && currentScan.uid.trim() !== '') {
      const rawUid = currentScan.uid.trim();
      const cleanUid = rawUid.replace(/\s+/g, '').toUpperCase();
      const liveKey = `live-${cleanUid}`;

      if (!recordsMap.has(liveKey)) {
        recordsMap.set(liveKey, {
          id: liveKey,
          rfidTag: rawUid,
          timestamp: currentScan.timestamp || new Date().toISOString(),
          eventType: 'LIVE_HARDWARE_TAP',
          deviceName: 'ESP32 RC522 Reader',
          status: currentScan.status || 'DETECTED'
        });
      }
    }

    const recordsList = Array.from(recordsMap.values()).map((rec) => {
      const recTagClean = (rec.rfidTag || '').replace(/\s+/g, '').toUpperCase();
      const matchedItem = items.find((it) => {
        const itTagClean = (it.rfidTag || it.id || '').replace(/\s+/g, '').toUpperCase();
        return itTagClean === recTagClean;
      });

      if (matchedItem) {
        return {
          ...rec,
          itemName: matchedItem.name,
          category: matchedItem.category,
          location: matchedItem.foundLocation,
          guestName: matchedItem.guestName,
          status: rec.status === 'DETECTED' ? (matchedItem.status || 'STORED') : rec.status
        };
      }
      return rec;
    });

    recordsList.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    return recordsList;
  }, [scanHistory, currentScan, items]);

  const filteredScanRecords = useMemo(() => {
    return unifiedScanRecords.filter((rec) => {
      const matchesSearch =
        (rec.rfidTag || '').toLowerCase().includes(scanSearchTerm.toLowerCase()) ||
        (rec.itemName || '').toLowerCase().includes(scanSearchTerm.toLowerCase()) ||
        (rec.location || '').toLowerCase().includes(scanSearchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (scanFilterType === 'REGISTERED') return !!rec.itemName;
      if (scanFilterType === 'RETURNED') return rec.eventType === 'ITEM_RETURNED' || rec.status === 'RETURNED';
      if (scanFilterType === 'UNASSIGNED') return !rec.itemName;

      return true;
    });
  }, [unifiedScanRecords, scanSearchTerm, scanFilterType]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.rfidTag || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.foundLocation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.guestName || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (itemFilter === 'ALL') return true;
      return (item.status || 'STORED') === itemFilter;
    });
  }, [items, searchTerm, itemFilter]);

  // Detected Item for the Live Scanner UI
  const scannerMatchedItem = useMemo(() => {
    const rawTag = scannerInputTag.trim();
    if (!rawTag) return null;
    const cleanTag = rawTag.replace(/\s+/g, '').toUpperCase();
    return items.find((it) => {
      const itTagClean = (it.rfidTag || it.id || '').replace(/\s+/g, '').toUpperCase();
      return itTagClean === cleanTag;
    }) || null;
  }, [scannerInputTag, items]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) {
      setLoginError(err.message || 'Failed to sign in. Please verify credentials.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      // Sign out error
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 700;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX_SIZE) {
            h *= MAX_SIZE / w;
            w = MAX_SIZE;
          }
        } else {
          if (h > MAX_SIZE) {
            w *= MAX_SIZE / h;
            h = MAX_SIZE;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setFormData((prev) => ({ ...prev, photo: dataUrl }));
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const tagToSave = (formData.rfidTag || `LF-${Date.now().toString().slice(-6)}`).trim();
    const nowIso = new Date().toISOString();

    const newItemPayload = {
      name: formData.name.trim(),
      category: formData.category || 'Others',
      description: formData.description || '',
      photo: formData.photo || '',
      foundLocation: formData.foundLocation || '',
      dateFound: formData.dateFound || getTodayDateString(),
      timeFound: formData.timeFound || getCurrentTimeString(),
      foundBy: formData.foundBy || `${userProfile.name} (${userProfile.role})`,
      rfidTag: tagToSave,
      guestName: formData.guestName || '',
      roomNumber: formData.roomNumber || '',
      contactNumber: formData.contactNumber || '',
      email: formData.email || '',
      notes: formData.notes || '',
      status: formData.status || 'STORED',
      registeredAt: nowIso,
      createdAt: nowIso
    };

    try {
      const newItemRef = ref(database, `items/${tagToSave}`);
      await set(newItemRef, newItemPayload);

      const logRef = ref(database, `scan_history/reg-${Date.now()}`);
      await set(logRef, {
        uid: tagToSave,
        eventType: 'ITEM_REGISTERED',
        timestamp: nowIso,
        status: 'STORED',
        device: 'Web Portal'
      });

      setFormData({
        name: '',
        category: 'Wallet',
        description: '',
        photo: '',
        foundLocation: '',
        dateFound: getTodayDateString(),
        timeFound: getCurrentTimeString(),
        foundBy: `${userProfile.name} (${userProfile.role})`,
        rfidTag: '',
        guestName: '',
        roomNumber: '',
        contactNumber: '',
        email: '',
        notes: '',
        status: 'STORED'
      });

      setActiveTab('all-items');
    } catch (err) {
      // Error handling
    }
  };

  const handleUpdateItemStatus = async (item, newStatus) => {
    try {
      const updates = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      if (newStatus === 'RETURNED') {
        updates.returnedAt = new Date().toISOString();
      }
      await update(ref(database, `items/${item.id}`), updates);

      if (newStatus === 'RETURNED') {
        const logRef = ref(database, `scan_history/ret-${Date.now()}`);
        await set(logRef, {
          uid: item.rfidTag || item.id,
          eventType: 'ITEM_RETURNED',
          timestamp: new Date().toISOString(),
          status: 'RETURNED',
          device: 'Web Portal'
        });
      }
    } catch (err) {
      // Error handling
    }
  };

  const openConfirmModal = (actionType, targetId = null) => {
    let title = '';
    let description = '';

    if (actionType === 'EMPTY_ITEMS') {
      title = 'Empty All Items?';
      description = `Are you sure you want to permanently delete all ${items.length} registered items? This action cannot be undone.`;
    } else if (actionType === 'CLEAR_HISTORY') {
      title = 'Clear Activity Log?';
      description = 'Are you sure you want to permanently wipe all recorded RFID scan logs?';
    } else if (actionType === 'DELETE_SINGLE_ITEM') {
      title = 'Delete Item?';
      description = 'Are you sure you want to permanently delete this item from the inventory?';
    } else if (actionType === 'DELETE_STAFF') {
      title = 'Delete Staff Account?';
      description = 'Are you sure you want to permanently delete this staff user from both Firebase Authentication and the database?';
    }

    setConfirmModal({
      isOpen: true,
      title,
      description,
      actionType,
      targetId
    });
  };

  const handleExecuteConfirmedAction = async () => {
    try {
      if (confirmModal.actionType === 'EMPTY_ITEMS') {
        await remove(ref(database, 'items'));
      } else if (confirmModal.actionType === 'CLEAR_HISTORY') {
        await remove(ref(database, 'scan_history'));
        await set(ref(database, 'current_scan'), { uid: '', status: 'IDLE', timestamp: '' });
        setScanHistory([]);
        setCurrentScan({ uid: '', status: 'IDLE', timestamp: '' });
        setScannerInputTag('');
      } else if (confirmModal.actionType === 'DELETE_SINGLE_ITEM' && confirmModal.targetId) {
        await remove(ref(database, `items/${confirmModal.targetId}`));
      } else if (confirmModal.actionType === 'DELETE_STAFF' && confirmModal.targetId) {
        const targetUserId = confirmModal.targetId;
        const targetUser = staffUsers.find((u) => u.id === targetUserId);
        const userPassword = targetUser?.assignedPassword || targetUser?.password;

        if (targetUser?.email && userPassword) {
          let secondaryApp = null;
          try {
            const secondaryAppName = `deleteStaffApp_${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);

            const staffCred = await signInWithEmailAndPassword(
              secondaryAuth,
              targetUser.email,
              userPassword
            );

            await staffCred.user.delete();
          } catch (authErr) {
            // Auth delete fallback
          } finally {
            if (secondaryApp) {
              try {
                await deleteApp(secondaryApp);
              } catch (delErr) {
                // Ignore cleanup error
              }
            }
          }
        }

        await remove(ref(database, `users/${targetUserId}`));
      }
    } catch (err) {
      // Execution error
    } finally {
      setConfirmModal({
        isOpen: false,
        title: '',
        description: '',
        actionType: null,
        targetId: null
      });
    }
  };

  const handleSaveEditedItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const updates = {
        name: editingItem.name,
        category: editingItem.category,
        foundLocation: editingItem.foundLocation,
        guestName: editingItem.guestName || '',
        status: editingItem.status || 'STORED',
        photo: editingItem.photo || '',
        updatedAt: new Date().toISOString()
      };
      if (editingItem.status === 'RETURNED' && !editingItem.returnedAt) {
        updates.returnedAt = new Date().toISOString();
      }
      await update(ref(database, `items/${editingItem.id}`), updates);
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      // Error handling
    }
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCopyPassword = (userId, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUserId(userId);
    setTimeout(() => setCopiedUserId(null), 2000);
  };

  const handleCreateStaffAccount = async (e) => {
    e.preventDefault();
    setAddUserError('');
    setAddUserLoading(true);

    let secondaryApp = null;
    try {
      const secondaryAppName = `secondaryApp_${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        newUserForm.email,
        newUserForm.password
      );
      const newUid = userCred.user.uid;

      await set(ref(database, `users/${newUid}`), {
        id: newUid,
        name: newUserForm.name,
        email: newUserForm.email,
        role: newUserForm.role,
        department: newUserForm.department,
        phone: newUserForm.phone || '',
        assignedPassword: newUserForm.password,
        createdAt: new Date().toISOString()
      });

      await signOut(secondaryAuth);
      setIsAddUserModalOpen(false);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'Receptionist',
        department: 'Front Office',
        phone: ''
      });
    } catch (err) {
      setAddUserError(err.message || 'Failed to create staff account');
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (delErr) {
          // Cleanup suppression
        }
      }
      setAddUserLoading(false);
    }
  };

  const handleChangeStaffPassword = async (e) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPasswordValue) return;
    setPasswordChangeLoading(true);
    setPasswordChangeMsg({ type: '', text: '' });
    try {
      await update(ref(database, `users/${selectedUserForPassword.id}`), {
        assignedPassword: newPasswordValue,
        password: newPasswordValue,
        updatedAt: new Date().toISOString()
      });
      setPasswordChangeMsg({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => {
        setIsChangePasswordModalOpen(false);
        setSelectedUserForPassword(null);
        setNewPasswordValue('');
        setPasswordChangeMsg({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      setPasswordChangeMsg({ type: 'error', text: err.message || 'Error updating password' });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleUpdateSelfProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileSaveLoading(true);
    setProfileSaveSuccess(false);
    try {
      await update(ref(database, `users/${currentUser.uid}`), {
        name: profileForm.name,
        department: profileForm.department,
        phone: profileForm.phone,
        updatedAt: new Date().toISOString()
      });
      setUserProfile((prev) => ({
        ...prev,
        name: profileForm.name,
        department: profileForm.department,
        phone: profileForm.phone
      }));
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      // Error handling
    } finally {
      setProfileSaveLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ['RFID Tag', 'Item Name', 'Category', 'Location', 'Guest Name', 'Date Found', 'Time Found', 'Registered At', 'Returned At', 'Status'];
    const rows = items.map((i) => [
      `"${i.rfidTag || i.id}"`,
      `"${i.name || ''}"`,
      `"${i.category || ''}"`,
      `"${i.foundLocation || ''}"`,
      `"${i.guestName || ''}"`,
      `"${i.dateFound || ''}"`,
      `"${i.timeFound || ''}"`,
      `"${i.registeredAt || i.createdAt || ''}"`,
      `"${i.returnedAt || ''}"`,
      `"${i.status || 'STORED'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LOSTIQ_Inventory_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportScanCSV = () => {
    if (filteredScanRecords.length === 0) return;
    const headers = ['RFID Tag', 'Event Type', 'Associated Item', 'Category', 'Location', 'Guest Name', 'Date & Time', 'Status'];
    const rows = filteredScanRecords.map((r) => [
      `"${r.rfidTag}"`,
      `"${r.eventType}"`,
      `"${r.itemName || 'Unassigned'}"`,
      `"${r.category || '—'}"`,
      `"${r.location || '—'}"`,
      `"${r.guestName || '—'}"`,
      `"${new Date(r.timestamp).toLocaleString('en-GB')}"`,
      `"${r.status || 'STORED'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LOSTIQ_Scan_History_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-950/60 animate-bounce">
          <Package size={26} className="text-white" />
        </div>
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Connecting to LOSTIQ Secure Cloud...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 font-sans selection:bg-emerald-600 selection:text-white">
        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/20 text-slate-200">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-800/90 border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-950/50 mb-3">
              <Package size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
              <span>LOST</span><span className="text-emerald-400 font-extrabold">IQ</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Smart Lost &amp; Found Management System</p>
          </div>

          {loginError && (
            <div className="p-3.5 mb-5 bg-rose-950/50 border border-rose-800/60 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Staff Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="admin@hotel.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Access Management System</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Authorized Hotel Personnel &amp; Management Only
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 selection:bg-emerald-600 selection:text-white relative overflow-x-hidden">
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Navigation Sidebar */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 md:p-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800/90 border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Package size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
                <span>LOST</span><span className="text-emerald-400 font-extrabold">IQ</span>
              </h1>
              <p className="text-[10px] text-slate-400 leading-tight">Smart Lost &amp; Found System</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-emerald-700/80 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </button>

          {/* Dedicated Live Tag Scanner Menu Tab */}
          <button
            onClick={() => {
              setActiveTab('live-scanner');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'live-scanner'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Scan size={17} className={activeTab === 'live-scanner' ? 'text-white' : 'text-emerald-400'} />
              <span>Live Tag Scanner</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <div>
            <button
              onClick={() => setItemsMenuOpen(!itemsMenuOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                ['all-items', 'add-item', 'scan-history'].includes(activeTab)
                  ? 'text-emerald-400 bg-slate-800/80'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package size={17} />
                <span>Items</span>
              </div>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${itemsMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {itemsMenuOpen && (
              <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('all-items');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition ${
                    activeTab === 'all-items' ? 'text-emerald-400 font-bold bg-slate-800/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  • All Items
                </button>
                <button
                  onClick={() => {
                    setActiveTab('add-item');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition ${
                    activeTab === 'add-item' ? 'text-emerald-400 font-bold bg-slate-800/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  • Add New Item
                </button>
                <button
                  onClick={() => {
                    setActiveTab('scan-history');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition ${
                    activeTab === 'scan-history' ? 'text-emerald-400 font-bold bg-slate-800/50' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  • Scan History
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setActiveTab('reports');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'reports'
                    ? 'bg-emerald-700/80 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileText size={17} />
                <span>Reports</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('users');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'users'
                    ? 'bg-emerald-700/80 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users size={17} />
                <span>Users</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'settings'
                    ? 'bg-emerald-700/80 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Settings size={17} />
                <span>Settings</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              setActiveTab('help');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'help'
                ? 'bg-emerald-700/80 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle size={17} />
            <span>Help &amp; Support</span>
          </button>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition"
            >
              <LogOut size={17} />
              <span>Log Out</span>
            </button>
          </div>
        </nav>

        <div className="p-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {userProfile.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userProfile.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{userProfile.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm relative z-30">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
              <span className="hidden sm:inline">Portal</span>
              <ChevronRight size={13} className="hidden sm:inline text-slate-400" />
              <span className="text-slate-900 font-bold capitalize truncate">{activeTab.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setNotificationsRead(true);
                }}
                className="relative p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
                title="System Notifications"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">System Activity</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {systemNotifications.length} Events
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {systemNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No recorded events yet. Card scans will appear here automatically.
                      </div>
                    ) : (
                      systemNotifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-slate-50 transition flex items-start gap-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              n.type === 'scan'
                                ? 'bg-emerald-500 ring-4 ring-emerald-100'
                                : n.type === 'RETURNED'
                                ? 'bg-blue-500 ring-4 ring-blue-100'
                                : n.type === 'UNCLAIMED'
                                ? 'bg-rose-500 ring-4 ring-rose-100'
                                : 'bg-amber-500 ring-4 ring-amber-100'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 leading-tight">{n.title}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5 truncate">{n.message}</p>
                            <span className="text-[9px] font-mono text-slate-400 mt-1 inline-block">{n.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold py-1 px-3 rounded-lg hover:bg-slate-200 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
              <span>Politeknik Hulu Terengganu</span>
              <ChevronDown size={13} className="text-slate-400" />
            </div>

            <div className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l sm:border-slate-200">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {userProfile.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">{userProfile.name}</p>
                <p className="text-[10px] text-slate-500">{userProfile.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
              title="Logout"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/70">
          {/* TAB: LIVE TAG SCANNER (Exact UI from your provided image) */}
          {activeTab === 'live-scanner' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    RFID Tag ID *
                  </label>
                  
                  {/* Identical Rounded Pill Input and Button Layout */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Scan or enter RFID tag ID"
                        value={scannerInputTag}
                        onChange={(e) => setScannerInputTag(e.target.value)}
                        className={`w-full px-5 py-3.5 bg-white border-2 rounded-2xl text-sm font-mono font-bold transition focus:outline-none ${
                          scannerSuccessCue
                            ? 'border-emerald-500 ring-4 ring-emerald-100 bg-emerald-50/30 text-emerald-900'
                            : isScannerAwaiting
                            ? 'border-emerald-400 bg-emerald-50/20 text-slate-800'
                            : 'border-emerald-600 text-slate-900 focus:border-emerald-700'
                        }`}
                      />
                      {scannerInputTag && (
                        <button
                          type="button"
                          onClick={() => setScannerInputTag('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {isScannerAwaiting ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled
                          className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 animate-pulse shadow-md shadow-emerald-700/30 shrink-0"
                        >
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Tap Card on Reader Now...</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelScannerTabScan}
                          className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-semibold transition shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartScannerTabScan}
                        className="px-6 py-3.5 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-sm"
                      >
                        <Scan size={18} />
                        <span>Scan RFID Tag</span>
                      </button>
                    )}
                  </div>

                  {isScannerAwaiting && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                      <Radio size={16} className="text-emerald-600 animate-pulse shrink-0" />
                      <p>
                        <strong>Listening to ESP32:</strong> Please hold the physical RFID card or keychain against the RC522 terminal now.
                      </p>
                    </div>
                  )}

                  {scannerSuccessCue && (
                    <div className="mt-3 p-3 bg-emerald-500 text-white rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>RFID Card captured: {scannerInputTag}</span>
                    </div>
                  )}
                </div>

                {/* Display Match Results or Unassigned Status */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  {scannerInputTag ? (
                    scannerMatchedItem ? (
                      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 sm:p-7">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                          <div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1.5">
                              <CheckCircle2 size={14} />
                              Item Identified in Inventory
                            </span>
                            <h3 className="text-2xl font-black text-slate-900 mt-2">{scannerMatchedItem.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Tag UID: <span className="font-mono font-bold text-emerald-700">{scannerMatchedItem.rfidTag}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {scannerMatchedItem.status !== 'RETURNED' && (
                              <button
                                onClick={() => handleUpdateItemStatus(scannerMatchedItem, 'RETURNED')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                Mark as Returned
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingItem(scannerMatchedItem);
                                setIsEditModalOpen(true);
                              }}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                            >
                              <Edit2 size={13} />
                              <span>Edit Item</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                          <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl">
                            {scannerMatchedItem.photo ? (
                              <img
                                src={scannerMatchedItem.photo}
                                alt={scannerMatchedItem.name}
                                onClick={() => setViewPhotoModalUrl({ url: scannerMatchedItem.photo, title: scannerMatchedItem.name })}
                                className="w-44 h-44 object-cover rounded-2xl border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition"
                              />
                            ) : (
                              <div className="w-32 h-32 rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                                <ImageIcon size={36} />
                                <span className="text-[10px] mt-1 font-semibold">No Photo</span>
                              </div>
                            )}
                            <span className="text-[11px] text-slate-400 mt-2.5">Click photo to view larger</span>
                          </div>

                          <div className="space-y-3 text-xs md:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Category</p>
                                <p className="text-sm font-bold text-slate-800 mt-0.5">{scannerMatchedItem.category}</p>
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
                                <span
                                  className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    scannerMatchedItem.status === 'RETURNED'
                                      ? 'bg-blue-100 text-blue-700'
                                      : scannerMatchedItem.status === 'UNCLAIMED'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {scannerMatchedItem.status || 'STORED'}
                                </span>
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Found Location</p>
                                <p className="text-xs font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                                  <MapPin size={13} className="text-emerald-600" />
                                  {scannerMatchedItem.foundLocation || 'Hotel Premises'}
                                </p>
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Found Date &amp; Time</p>
                                <p className="text-xs font-semibold text-slate-700 mt-0.5 font-mono">
                                  {scannerMatchedItem.dateFound || '—'} {scannerMatchedItem.timeFound || ''}
                                </p>
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Guest Name / Room</p>
                                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                  {scannerMatchedItem.guestName ? `${scannerMatchedItem.guestName} (Room ${scannerMatchedItem.roomNumber || '—'})` : 'No Guest Stated'}
                                </p>
                              </div>

                              <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Logged By</p>
                                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                  {scannerMatchedItem.foundBy || 'Front Desk Staff'}
                                </p>
                              </div>
                            </div>

                            {scannerMatchedItem.description && (
                              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Description</p>
                                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{scannerMatchedItem.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2.5">
                          <Tag size={24} />
                        </div>
                        <h4 className="text-base font-bold text-slate-900">Unregistered RFID Tag Detected</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          Tag UID <strong className="font-mono text-slate-800">{scannerInputTag}</strong> is not associated with any recorded lost item in the system.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, rfidTag: scannerInputTag }));
                            setActiveTab('add-item');
                          }}
                          className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <PlusCircle size={14} />
                          <span>Register New Item with this Tag</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-10 text-slate-400">
                      <Scan size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-medium">Ready for RFID scan. Tap card on reader or type UID above.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL ITEMS</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalItemsCount}</p>
                    <p className="text-[11px] text-slate-400 mt-1">All items in the system</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Package size={22} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">STORED</p>
                    <p className="text-3xl font-extrabold text-blue-600 mt-1">{storedCount}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Items currently stored</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Package size={22} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RETURNED</p>
                    <p className="text-3xl font-extrabold text-amber-600 mt-1">{returnedCount}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Items returned to guests</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <CheckCircle2 size={22} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">UNCLAIMED</p>
                    <p className="text-3xl font-extrabold text-rose-600 mt-1">{unclaimedCount}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Unclaimed items</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                    <HelpCircle size={22} />
                  </div>
                </div>
              </div>

              {/* Charts & Analytics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">ITEMS OVERVIEW</h3>
                      <p className="text-xs text-slate-400">Actual lost item registrations per month</p>
                    </div>
                    <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-semibold border border-slate-200">
                      {new Date().getFullYear()}
                    </span>
                  </div>

                  <div className="h-56 w-full pt-4">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                      <line x1="10" y1="30" x2="490" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" />
                      <line x1="10" y1="80" x2="490" y2="80" stroke="#f1f5f9" strokeDasharray="4 4" />
                      <line x1="10" y1={chartHeight - padBottom} x2="490" y2={chartHeight - padBottom} stroke="#e2e8f0" />

                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={polylinePointsString}
                      />
                      {monthlyPoints.map((pt, idx) => (
                        <g key={idx}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4.5"
                            fill="#10b981"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="transition-all duration-300 hover:scale-125 cursor-pointer"
                          />
                          {pt.count > 0 && (
                            <text
                              x={pt.x}
                              y={pt.y - 10}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="bold"
                              fill="#059669"
                            >
                              {pt.count}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-2 px-1">
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                      <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                    </div>
                  </div>
                </div>

                {/* Donut Chart */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">TOP CATEGORIES</h3>
                    <p className="text-xs text-slate-400 mb-4">Inventory category distribution</p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2 my-2">
                      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle
                            cx="50"
                            cy="50"
                            r="36"
                            fill="transparent"
                            stroke="#f1f5f9"
                            strokeWidth="16"
                          />
                          {(() => {
                            const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#94a3b8'];
                            const circumference = 2 * Math.PI * 36;
                            let cumulativeOffset = 0;

                            if (totalItemsCount === 0) {
                              return (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="36"
                                  fill="transparent"
                                  stroke="#e2e8f0"
                                  strokeWidth="16"
                                />
                              );
                            }

                            return categoriesList.map((cat, idx) => {
                              const count = categoryCounts[cat] || 0;
                              if (count === 0) return null;
                              const fraction = count / totalItemsCount;
                              const strokeDasharray = `${fraction * circumference} ${circumference}`;
                              const strokeDashoffset = -cumulativeOffset;
                              cumulativeOffset += fraction * circumference;

                              return (
                                <circle
                                  key={cat}
                                  cx="50"
                                  cy="50"
                                  r="36"
                                  fill="transparent"
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth="16"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="butt"
                                  className="transition-all duration-500 ease-out"
                                />
                              );
                            });
                          })()}
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                          <span className="text-xl font-extrabold text-slate-800 leading-tight">
                            {totalItemsCount}
                          </span>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                            Items
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        {categoriesList.map((cat, idx) => {
                          const count = categoryCounts[cat] || 0;
                          const pct = totalItemsCount > 0 ? Math.round((count / totalItemsCount) * 100) : 0;
                          const dotColors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-slate-400'];

                          return (
                            <div key={cat} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2 font-medium text-slate-700">
                                <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                                {cat}
                              </span>
                              <span className="font-semibold text-slate-500">
                                {count} <span className="text-[10px] text-slate-400">({pct}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('add-item')}
                    className="w-full mt-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={14} />
                    <span>Register New Tag</span>
                  </button>
                </div>
              </div>

              {/* Recent Items Preview Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">RECENT ITEMS</h3>
                  <button
                    onClick={() => setActiveTab('all-items')}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
                  >
                    View All Items →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3">RFID Tag</th>
                        <th className="pb-3">Item Name</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Location</th>
                        <th className="pb-3">Date Found</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            No items recorded yet. Use "Add New Item" to register your first item.
                          </td>
                        </tr>
                      ) : (
                        items.slice(0, 5).map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 font-mono font-bold text-emerald-700">{item.rfidTag || item.id}</td>
                            <td className="py-3 font-bold text-slate-900">{item.name}</td>
                            <td className="py-3 text-slate-600">{item.category}</td>
                            <td className="py-3 text-slate-600">{item.foundLocation}</td>
                            <td className="py-3 text-slate-400 font-mono">{item.dateFound}</td>
                            <td className="py-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  item.status === 'RETURNED'
                                    ? 'bg-blue-100 text-blue-700'
                                    : item.status === 'UNCLAIMED'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {item.status || 'STORED'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADD NEW ITEM */}
          {activeTab === 'add-item' && (
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Add New Item</h2>
                <p className="text-xs text-slate-500">Fill in the details of the lost item</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <form onSubmit={handleSaveItem} className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">1. Item Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Black Wallet"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        >
                          <option value="Wallet">Wallet</option>
                          <option value="Phone">Phone</option>
                          <option value="Bag">Bag</option>
                          <option value="Watch">Watch</option>
                          <option value="Keys">Keys</option>
                          <option value="Clothing">Clothing</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Jewelry">Jewelry</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                        <textarea
                          rows={2}
                          placeholder="Describe the item (color, brand, model, etc.)"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Photo (Optional)</label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoSelect}
                          accept="image/*"
                          className="hidden"
                        />

                        {formData.photo ? (
                          <div className="flex items-center gap-4 p-3 border border-emerald-300 bg-emerald-50/50 rounded-2xl">
                            <img
                              src={formData.photo}
                              alt="Uploaded item"
                              className="w-16 h-16 object-cover rounded-xl border border-slate-200"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-emerald-800">Photo Attached</p>
                              <p className="text-[11px] text-slate-500">Image ready for synchronization</p>
                              <div className="flex gap-2 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-[11px] font-semibold text-emerald-700 hover:underline"
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, photo: '' })}
                                  className="text-[11px] font-semibold text-rose-600 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition flex flex-col items-center justify-center"
                          >
                            <UploadCloud size={24} className="text-slate-400 mb-1" />
                            <p className="text-xs font-semibold text-slate-700">Click to upload or drag & drop</p>
                            <p className="text-[10px] text-slate-400">JPG, PNG (Max 5MB)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">2. Found Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Found Location *</label>
                        <input
                          type="text"
                          placeholder="e.g. Room 305 / Lobby"
                          value={formData.foundLocation}
                          onChange={(e) => setFormData({ ...formData, foundLocation: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Date Found *</label>
                        <input
                          type="date"
                          value={formData.dateFound}
                          onChange={(e) => setFormData({ ...formData, dateFound: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Time Found *</label>
                        <input
                          type="time"
                          value={formData.timeFound}
                          onChange={(e) => setFormData({ ...formData, timeFound: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition font-mono"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Found By *</label>
                        {staffUsers.length > 0 ? (
                          <div className="flex gap-2">
                            <select
                              value={formData.foundBy}
                              onChange={(e) => setFormData({ ...formData, foundBy: e.target.value })}
                              required
                              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                            >
                              {userProfile.name && (
                                <option value={`${userProfile.name} (${userProfile.role})`}>
                                  {userProfile.name} ({userProfile.role}) - Current User
                                </option>
                              )}
                              {staffUsers.map((u) => {
                                const staffLabel = `${u.name || u.email?.split('@')[0]} (${u.role || 'Staff'})`;
                                if (staffLabel === `${userProfile.name} (${userProfile.role})`) return null;
                                return (
                                  <option key={u.id} value={staffLabel}>
                                    {staffLabel}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter Staff Name (e.g. Front Desk Staff)"
                            value={formData.foundBy}
                            onChange={(e) => setFormData({ ...formData, foundBy: e.target.value })}
                            required
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">3. RFID Information</h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">RFID Tag ID *</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Scan or enter RFID tag ID"
                          value={formData.rfidTag}
                          onChange={(e) => setFormData({ ...formData, rfidTag: e.target.value })}
                          className={`flex-1 px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono font-bold transition ${
                            scanSuccessCue 
                              ? 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50/40 text-emerald-800' 
                              : isAwaitingScan
                              ? 'border-emerald-400 bg-emerald-50/20 text-slate-800'
                              : 'border-slate-300 text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                          }`}
                        />

                        {isAwaitingScan ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled
                              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 animate-pulse shadow-md shadow-emerald-700/30"
                            >
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Tap Card on Reader Now...</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelRfidScan}
                              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStartRfidScan}
                            className="px-4 py-2.5 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-sm"
                          >
                            <Scan size={16} />
                            <span>Scan RFID Tag</span>
                          </button>
                        )}
                      </div>

                      {isAwaitingScan && (
                        <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                          <Radio size={16} className="text-emerald-600 animate-pulse shrink-0" />
                          <p>
                            <strong>Scanner is listening:</strong> Please tap the physical RFID card/fob on the ESP32 reader now.
                          </p>
                        </div>
                      )}

                      {scanSuccessCue && (
                        <div className="mt-2.5 p-2.5 bg-emerald-500 text-white rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
                          <CheckCircle2 size={16} className="shrink-0" />
                          <span>Card captured successfully: {formData.rfidTag}</span>
                        </div>
                      )}

                      {!isAwaitingScan && !scanSuccessCue && currentScan?.uid && (
                        <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
                          Last hardware reading: {currentScan.uid} ({currentScan.status})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">4. Guest Information (If Available)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Mr. Hakimi"
                          value={formData.guestName}
                          onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 305"
                          value={formData.roomNumber}
                          onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 012-3456789"
                          value={formData.contactNumber}
                          onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                        <input
                          type="email"
                          placeholder="e.g. hakimi@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">5. Notes (Optional)</h3>
                    <div>
                      <textarea
                        rows={2}
                        placeholder="Any additional information about the item"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('all-items')}
                      className="px-5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/20 transition flex items-center gap-2"
                    >
                      <Package size={15} />
                      <span>Save Item</span>
                    </button>
                  </div>
                </form>

                {/* Live Preview Column */}
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900">Item Preview</h3>
                    <p className="text-[11px] text-slate-400 mb-6">This is how the item information will appear in the system.</p>

                    <div className="flex flex-col items-center justify-center mb-6">
                      {formData.photo ? (
                        <img
                          src={formData.photo}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-2xl border-2 border-emerald-500 shadow-md mb-2"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 shadow-inner">
                          <Package size={28} />
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-slate-800">Item Preview</h4>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Item Name</span>
                        <span className="font-bold text-slate-800 text-right">{formData.name || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Category</span>
                        <span className="font-semibold text-slate-700 text-right">{formData.category || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Description</span>
                        <span className="font-medium text-slate-600 text-right truncate max-w-[150px]">{formData.description || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">RFID Tag ID</span>
                        <span className="font-mono font-bold text-emerald-700 text-right">{formData.rfidTag || 'LF000123'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Found Location</span>
                        <span className="font-semibold text-slate-700 text-right">{formData.foundLocation || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Date Found</span>
                        <span className="font-medium text-slate-600 text-right">{formData.dateFound || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Time Found</span>
                        <span className="font-medium text-slate-600 text-right">{formData.timeFound || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Found By</span>
                        <span className="font-medium text-slate-600 text-right truncate max-w-[150px]">{formData.foundBy || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Guest Name</span>
                        <span className="font-semibold text-slate-700 text-right">{formData.guestName || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Room Number</span>
                        <span className="font-medium text-slate-600 text-right">{formData.roomNumber || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-400">Contact Number</span>
                        <span className="font-medium text-slate-600 text-right">{formData.contactNumber || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400">Status</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {formData.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
                    <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      After saving, the item can be scanned using the LOSTIQ device and will be stored in the system.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ALL ITEMS */}
          {activeTab === 'all-items' && (
            <div className="w-full max-w-7xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">All Items Inventory</h2>
                  <p className="text-xs text-slate-500">Manage, edit, or return registered lost items</p>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && items.length > 0 && (
                    <button
                      onClick={() => openConfirmModal('EMPTY_ITEMS')}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 size={14} />
                      <span>Empty All Items</span>
                    </button>
                  )}

                  <button
                    onClick={handleExportCSV}
                    disabled={items.length === 0}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('add-item')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    <span>Add New Item</span>
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by RFID Tag, Name, Location, or Guest..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['ALL', 'STORED', 'RETURNED', 'UNCLAIMED'].map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setItemFilter(filterKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        itemFilter === filterKey
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {filterKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Inventory Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs table-auto">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">PHOTO</th>
                        <th className="py-3 px-3">RFID TAG</th>
                        <th className="py-3 px-3">ITEM NAME</th>
                        <th className="py-3 px-2.5">CATEGORY</th>
                        <th className="py-3 px-2.5">LOCATION</th>
                        <th className="py-3 px-2.5">GUEST</th>
                        <th className="py-3 px-3">REGISTERED AT</th>
                        <th className="py-3 px-3">RETURNED AT</th>
                        <th className="py-3 px-2.5 text-center">STATUS</th>
                        <th className="py-3 px-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="py-12 text-center text-slate-400">
                            <Package size={28} className="mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-slate-600">No items found in inventory</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Use the "Add New Item" button to register new tagged items into the system.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => {
                          const regDateStr = (() => {
                            const raw = item.registeredAt || item.createdAt || (item.dateFound ? `${item.dateFound}T${item.timeFound || '00:00'}` : '');
                            if (!raw) return { date: '—', time: '' };
                            const d = new Date(raw);
                            if (isNaN(d.getTime())) return { date: String(raw), time: '' };
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            const hours = String(d.getHours()).padStart(2, '0');
                            const minutes = String(d.getMinutes()).padStart(2, '0');
                            return { date: `${day}/${month}/${year}`, time: `${hours}:${minutes}` };
                          })();

                          const retDateStr = (() => {
                            if (!item.returnedAt) return null;
                            const d = new Date(item.returnedAt);
                            if (isNaN(d.getTime())) return { date: String(item.returnedAt), time: '' };
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            const hours = String(d.getHours()).padStart(2, '0');
                            const minutes = String(d.getMinutes()).padStart(2, '0');
                            return { date: `${day}/${month}/${year}`, time: `${hours}:${minutes}` };
                          })();

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {item.photo ? (
                                  <img
                                    src={item.photo}
                                    alt={item.name}
                                    onClick={() => setViewPhotoModalUrl({ url: item.photo, title: item.name })}
                                    className="w-10 h-10 object-cover rounded-xl border border-slate-200 cursor-pointer hover:scale-105 transition shadow-sm"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    <ImageIcon size={18} />
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 whitespace-nowrap text-[11px]">
                                {item.rfidTag || item.id}
                              </td>

                              <td className="py-2.5 px-3 font-bold text-slate-900 max-w-[140px] truncate">
                                {item.name}
                              </td>

                              <td className="py-2.5 px-2.5 text-slate-600">{item.category}</td>
                              <td className="py-2.5 px-2.5 text-slate-600">{item.foundLocation}</td>
                              <td className="py-2.5 px-2.5 text-slate-600">{item.guestName || '—'}</td>

                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex flex-col leading-tight font-mono text-[11px]">
                                  <span className="text-slate-700 font-medium">{regDateStr.date}</span>
                                  {regDateStr.time && <span className="text-slate-400 text-[10px]">{regDateStr.time}</span>}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {retDateStr ? (
                                  <div className="flex flex-col leading-tight font-mono text-[11px]">
                                    <span className="text-blue-700 font-bold">{retDateStr.date}</span>
                                    <span className="text-blue-500 text-[10px]">{retDateStr.time}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>

                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                    item.status === 'RETURNED'
                                      ? 'bg-blue-100 text-blue-700'
                                      : item.status === 'UNCLAIMED'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {item.status || 'STORED'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingItem(item);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 shadow-sm"
                                  >
                                    <Edit2 size={11} />
                                    <span>Edit</span>
                                  </button>

                                  {item.status !== 'RETURNED' && (
                                    <button
                                      onClick={() => handleUpdateItemStatus(item, 'RETURNED')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 shadow-sm"
                                    >
                                      <span>Return</span>
                                    </button>
                                  )}

                                  {item.status !== 'UNCLAIMED' && (
                                    <button
                                      onClick={() => handleUpdateItemStatus(item, 'UNCLAIMED')}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 shadow-sm"
                                    >
                                      <span>Unclaimed</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => openConfirmModal('DELETE_SINGLE_ITEM', item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                    title="Delete item"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SCAN HISTORY */}
          {activeTab === 'scan-history' && (
            <div className="w-full max-w-7xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <History size={22} className="text-emerald-600" />
                    <span>RFID Scan History &amp; Activity Log</span>
                  </h2>
                  <p className="text-xs text-slate-500">Live operational log of RFID card taps, registrations, and returns</p>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && scanHistory.length > 0 && (
                    <button
                      onClick={() => openConfirmModal('CLEAR_HISTORY')}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 size={14} />
                      <span>Clear Log</span>
                    </button>
                  )}

                  <button
                    onClick={handleExportScanCSV}
                    disabled={filteredScanRecords.length === 0}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('add-item')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <PlusCircle size={14} />
                    <span>Register New Item</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL SCANS LOGGED</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">{unifiedScanRecords.length}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Recorded unique activity events</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Scan size={20} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REGISTERED INVENTORY</p>
                    <p className="text-2xl font-extrabold text-blue-600 mt-1">
                      {unifiedScanRecords.filter((r) => r.itemName).length}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Scans matched with hotel items</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Package size={20} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">READER TERMINAL</p>
                    <p className="text-sm font-extrabold text-emerald-600 mt-1 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{currentScan?.uid ? `Last Tag: ${currentScan.uid}` : 'ESP32 Active & Listening'}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">RC522 13.56MHz SPI Interface</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <Radio size={20} />
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by RFID Tag, Item Name, or Location..."
                    value={scanSearchTerm}
                    onChange={(e) => setScanSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 transition"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { key: 'ALL', label: 'All Scans' },
                    { key: 'REGISTERED', label: 'Registered' },
                    { key: 'RETURNED', label: 'Returned' },
                    { key: 'UNASSIGNED', label: 'Unassigned' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setScanFilterType(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        scanFilterType === key
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan History Records Table */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs table-auto">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">RFID TAG</th>
                        <th className="py-3 px-3">EVENT / ACTION</th>
                        <th className="py-3 px-3">ASSOCIATED ITEM</th>
                        <th className="py-3 px-2.5">CATEGORY</th>
                        <th className="py-3 px-2.5">LOCATION</th>
                        <th className="py-3 px-3">SCAN DATE &amp; TIME</th>
                        <th className="py-3 px-2.5 text-center">STATUS</th>
                        <th className="py-3 px-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredScanRecords.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-12 text-center text-slate-400">
                            <History size={28} className="mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-slate-600">No scan events recorded yet</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Tap an RFID card or fob on your ESP32 reader to see real-time card activity.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredScanRecords.map((rec) => {
                          const dateObj = (() => {
                            if (!rec.timestamp) return { date: '—', time: '—' };
                            const d = new Date(rec.timestamp);
                            if (isNaN(d.getTime())) return { date: String(rec.timestamp), time: '' };
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            const hours = String(d.getHours()).padStart(2, '0');
                            const minutes = String(d.getMinutes()).padStart(2, '0');
                            return { date: `${day}/${month}/${year}`, time: `${hours}:${minutes}` };
                          })();

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 whitespace-nowrap text-[11px]">
                                {String(rec.rfidTag || '')}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                                    rec.eventType === 'LIVE_HARDWARE_TAP'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : rec.eventType === 'ITEM_RETURNED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : rec.eventType === 'ITEM_REGISTERED'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {rec.eventType === 'LIVE_HARDWARE_TAP' && <Radio size={10} className="animate-pulse" />}
                                  <span>
                                    {rec.eventType === 'ITEM_RETURNED'
                                      ? 'Claimed & Returned'
                                      : rec.eventType === 'ITEM_REGISTERED'
                                      ? 'Registered to Vault'
                                      : rec.eventType === 'LIVE_HARDWARE_TAP'
                                      ? 'Hardware Reader Tap'
                                      : 'Tag Detection'}
                                  </span>
                                </span>
                              </td>

                              <td className="py-2.5 px-3 font-bold text-slate-900 max-w-[140px] truncate">
                                {rec.itemName ? (
                                  <span>{String(rec.itemName)}</span>
                                ) : (
                                  <span className="text-slate-400 font-normal italic">Unassigned Card</span>
                                )}
                              </td>

                              <td className="py-2.5 px-2.5 text-slate-600">{String(rec.category || '—')}</td>
                              <td className="py-2.5 px-2.5 text-slate-600">{String(rec.location || '—')}</td>

                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex flex-col leading-tight font-mono text-[11px]">
                                  <span className="text-slate-700 font-medium">{dateObj.date}</span>
                                  <span className="text-slate-400 text-[10px]">{dateObj.time}</span>
                                </div>
                              </td>

                              <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                    rec.status === 'RETURNED'
                                      ? 'bg-blue-100 text-blue-700'
                                      : rec.status === 'UNCLAIMED'
                                      ? 'bg-rose-100 text-rose-700'
                                      : rec.status === 'STORED'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {String(rec.status || 'SCANNED')}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {!rec.itemName ? (
                                  <button
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, rfidTag: rec.rfidTag }));
                                      setActiveTab('add-item');
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 shadow-sm"
                                    title="Register this scanned RFID tag"
                                  >
                                    <PlusCircle size={11} />
                                    <span>Register Item</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setActiveTab('all-items')}
                                    className="px-2 py-1 text-emerald-700 hover:bg-emerald-50 rounded-lg text-[10px] font-bold transition"
                                  >
                                    View in Inventory →
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REPORTS */}
          {activeTab === 'reports' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {!isAdmin ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
                  <ShieldAlert size={40} className="text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">Administrator Access Required</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Only administrators can access compliance reports and analytics.
                  </p>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Audit &amp; Compliance Reports</h2>
                      <p className="text-xs text-slate-500">Live operational metrics, guest claim statistics, and regulatory logs</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handleExportCSV}
                        disabled={items.length === 0}
                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                        title="Download CSV spreadsheet"
                      >
                        <Download size={14} />
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/20"
                        title="Print official audit report"
                      >
                        <Printer size={14} />
                        <span>Print Report</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Logged</span>
                        <Package size={18} className="text-emerald-600" />
                      </div>
                      <p className="text-2xl font-extrabold text-slate-900 mt-2">{totalItemsCount}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Recorded items in database</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Return Rate</span>
                        <CheckCircle2 size={18} className="text-blue-600" />
                      </div>
                      <p className="text-2xl font-extrabold text-blue-600 mt-2">
                        {totalItemsCount > 0 ? Math.round((returnedCount / totalItemsCount) * 100) : 0}%
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{returnedCount} reclaimed by guests</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Safe Custody</span>
                        <ShieldCheck size={18} className="text-amber-600" />
                      </div>
                      <p className="text-2xl font-extrabold text-amber-600 mt-2">{storedCount}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Currently stored in vault</p>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unclaimed (&gt;90d)</span>
                        <AlertCircle size={18} className="text-rose-600" />
                      </div>
                      <p className="text-2xl font-extrabold text-rose-600 mt-2">{unclaimedCount}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Pending disposal or donation</p>
                    </div>
                  </div>

                  {/* Category Audit Breakdown & Retention Overview */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 mb-1">Category Recovery Analysis</h3>
                      <p className="text-xs text-slate-400 mb-5">Breakdown of recorded property by classification</p>

                      <div className="space-y-4">
                        {categoriesList.map((cat) => {
                          const count = categoryCounts[cat] || 0;
                          const pct = totalItemsCount > 0 ? Math.round((count / totalItemsCount) * 100) : 0;
                          return (
                            <div key={cat} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span>{cat}</span>
                                <span className="text-slate-500">{count} items ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-1">Compliance &amp; Retention Status</h3>
                        <p className="text-xs text-slate-400 mb-4">Standard Operating Procedure audit checks</p>

                        <div className="space-y-3 text-xs">
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">Hotel Establishment</p>
                              <p className="text-[11px] text-slate-500">Politeknik Hulu Terengganu (Main Branch)</p>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                              Active
                            </span>
                          </div>

                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">RFID Hardware Sync</p>
                              <p className="text-[11px] text-slate-500">ESP32 RC522 Reader Integration</p>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                              Online
                            </span>
                          </div>

                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">Retention Threshold</p>
                              <p className="text-[11px] text-slate-500">Items held up to 90 days before clearance</p>
                            </div>
                            <span className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-full text-[10px]">
                              90 Days
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>Report generated on: {getTodayDateString()}</span>
                        <span className="font-mono text-[11px]">LOSTIQ v2.4</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Records Table */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Item Log Audit Trail</h3>
                        <p className="text-[11px] text-slate-400">Official log entries for property management</p>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                        {totalItemsCount} Total Entries
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-3 px-4">RFID Tag</th>
                            <th className="py-3 px-4">Item</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Location</th>
                            <th className="py-3 px-4">Date Found</th>
                            <th className="py-3 px-4">Logged By</th>
                            <th className="py-3 px-4">Guest</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="py-12 text-center text-slate-400">
                                <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                                <p className="font-bold text-slate-600">No items registered in the database yet</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  Items registered via "Add New Item" will populate this compliance audit report automatically.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition">
                                <td className="py-3 px-4 font-mono font-bold text-emerald-700">{item.rfidTag || item.id}</td>
                                <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                                <td className="py-3 px-4 text-slate-600">{item.category}</td>
                                <td className="py-3 px-4 text-slate-600">{item.foundLocation}</td>
                                <td className="py-3 px-4 font-mono text-slate-400">{item.dateFound}</td>
                                <td className="py-3 px-4 text-slate-600">{item.foundBy || 'Staff'}</td>
                                <td className="py-3 px-4 text-slate-600">{item.guestName || '—'}</td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      item.status === 'RETURNED'
                                        ? 'bg-blue-100 text-blue-700'
                                        : item.status === 'UNCLAIMED'
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {item.status || 'STORED'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: USERS MANAGEMENT (Admin Only) */}
          {activeTab === 'users' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {!isAdmin ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
                  <ShieldAlert size={40} className="text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">Administrator Access Required</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    You need administrator privileges to view and manage hotel staff accounts.
                  </p>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Staff User Management</h2>
                      <p className="text-xs text-slate-500">Configure credentials, roles, and assigned passwords</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        <PlusCircle size={14} />
                        <span>Add Staff User</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-3.5 px-4">STAFF NAME</th>
                          <th className="py-3.5 px-4">EMAIL</th>
                          <th className="py-3.5 px-4">ROLE</th>
                          <th className="py-3.5 px-4">DEPARTMENT</th>
                          <th className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span>ASSIGNED PASSWORD</span>
                              <button
                                type="button"
                                onClick={() => setShowAllPasswords(!showAllPasswords)}
                                className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-semibold transition flex items-center gap-1"
                                title={showAllPasswords ? "Hide all passwords" : "Show all passwords"}
                              >
                                {showAllPasswords ? <EyeOff size={11} /> : <Eye size={11} />}
                                <span>{showAllPasswords ? 'Hide All' : 'Show All'}</span>
                              </button>
                            </div>
                          </th>
                          <th className="py-3.5 px-4 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffUsers.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-400">
                              No staff users found in database. Click "Add Staff User" to register your staff.
                            </td>
                          </tr>
                        ) : (
                          staffUsers.map((user) => {
                            const pwd = user.assignedPassword || user.password;
                            const isRevealed = showAllPasswords || visiblePasswords[user.id];

                            return (
                              <tr key={user.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  {user.name || user.email?.split('@')[0] || 'Staff'}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600">{user.email}</td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                                    {user.role || 'Staff'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600">{user.department || 'Front Office'}</td>
                                <td className="py-3.5 px-4 font-mono">
                                  {pwd ? (
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded ${isRevealed ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'text-slate-600'}`}>
                                        {isRevealed ? pwd : '••••••••'}
                                      </span>
                                      
                                      <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility(user.id)}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                                        title={isRevealed ? "Hide Password" : "View Password"}
                                      >
                                        {isRevealed ? <EyeOff size={13} className="text-emerald-600" /> : <Eye size={13} />}
                                      </button>

                                      {isRevealed && (
                                        <button
                                          type="button"
                                          onClick={() => handleCopyPassword(user.id, pwd)}
                                          className="p-1 text-slate-400 hover:text-emerald-600 rounded transition"
                                          title="Copy Password to Clipboard"
                                        >
                                          {copiedUserId === user.id ? (
                                            <Check size={13} className="text-emerald-600" />
                                          ) : (
                                            <Copy size={13} />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedUserForPassword(user);
                                        setIsChangePasswordModalOpen(true);
                                      }}
                                      className="text-[11px] font-bold text-amber-600 hover:underline"
                                    >
                                      Set Password
                                    </button>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedUserForPassword(user);
                                        setIsChangePasswordModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                      title="Change Staff Password"
                                    >
                                      <Key size={14} />
                                    </button>

                                    {user.email !== currentUser?.email && (
                                      <button
                                        type="button"
                                        onClick={() => openConfirmModal('DELETE_STAFF', user.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                        title="Delete Staff"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {!isAdmin ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
                  <ShieldAlert size={40} className="text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">Administrator Access Required</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Only administrators can modify profile and security settings.
                  </p>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Profile &amp; Account Settings</h2>
                    <p className="text-xs text-slate-500">Manage your profile details, contact info, and security credentials</p>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-emerald-900/20">
                          {userProfile.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{userProfile.name}</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <ShieldCheck size={11} />
                              {userProfile.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{userProfile.email}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{userProfile.department}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Account Status</p>
                        <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active Staff Session
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleUpdateSelfProfile} className="mt-6 space-y-4 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <User size={14} />
                          Personal Information
                        </h4>

                        {profileSaveSuccess && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                            <CheckCircle2 size={13} />
                            Profile updated successfully!
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Display Name *</label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Assigned Department</label>
                          <select
                            value={profileForm.department}
                            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                          >
                            <option value="Management & IT">Management & IT</option>
                            <option value="Front Office">Front Office</option>
                            <option value="Security & Loss Prevention">Security & Loss Prevention</option>
                            <option value="Housekeeping">Housekeeping</option>
                            <option value="Food & Beverage (F&B)">Food & Beverage (F&B)</option>
                            <option value="Concierge & Guest Services">Concierge & Guest Services</option>
                            <option value="Engineering & Maintenance">Engineering & Maintenance</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Contact Phone Number</label>
                          <input
                            type="text"
                            placeholder="e.g. +60 12-345 6789"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Email Address (Read-only)</label>
                          <input
                            type="email"
                            readOnly
                            disabled
                            value={userProfile.email}
                            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={profileSaveLoading}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {profileSaveLoading ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Saving Changes...</span>
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Save Profile</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: HELP & SUPPORT */}
          {activeTab === 'help' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Help &amp; Support Hotline</h2>
                <p className="text-xs text-slate-500">Direct technical contacts and support assistance</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Support Hotline</h3>
                    <p className="text-sm font-extrabold text-emerald-700 mt-1">+60 11-6103 7798</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Direct phone assistance</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Official System Support</h3>
                    <p className="text-sm font-extrabold text-blue-700 mt-1">LostIQ09@gmail.com</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Customer &amp; technical inquiries</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Edit Registered Item</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Photo</label>
                {editingItem.photo ? (
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <img
                      src={editingItem.photo}
                      alt={editingItem.name}
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-500 font-medium">Photo currently attached</span>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer">
                          Replace Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const r = new FileReader();
                              r.onload = (evt) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX = 600;
                                  let w = img.width, h = img.height;
                                  if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                                  else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                                  canvas.width = w; canvas.height = h;
                                  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                                  setEditingItem((prev) => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.8) }));
                                };
                                img.src = evt.target?.result;
                              };
                              r.readAsDataURL(f);
                            }}
                          />
                        </label>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setEditingItem((prev) => ({ ...prev, photo: '' }))}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 bg-slate-50 hover:bg-emerald-50/40 text-center cursor-pointer flex items-center justify-center gap-2 transition text-slate-600">
                    <UploadCloud size={16} className="text-emerald-600" />
                    <span className="font-semibold text-[11px]">Upload a photo for this item</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const r = new FileReader();
                        r.onload = (evt) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX = 600;
                            let w = img.width, h = img.height;
                            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                            canvas.width = w; canvas.height = h;
                            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                            setEditingItem((prev) => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.8) }));
                          };
                          img.src = evt.target?.result;
                        };
                        r.readAsDataURL(f);
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="Wallet">Wallet</option>
                  <option value="Phone">Phone</option>
                  <option value="Bag">Bag</option>
                  <option value="Watch">Watch</option>
                  <option value="Keys">Keys</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Found Location</label>
                <input
                  type="text"
                  value={editingItem.foundLocation}
                  onChange={(e) => setEditingItem({ ...editingItem, foundLocation: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={editingItem.guestName || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, guestName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingItem.status || 'STORED'}
                  onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="STORED">STORED</option>
                  <option value="RETURNED">RETURNED</option>
                  <option value="UNCLAIMED">UNCLAIMED</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {viewPhotoModalUrl && (
        <div 
          onClick={() => setViewPhotoModalUrl(null)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative"
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">{viewPhotoModalUrl.title || 'Item Photo'}</span>
              <button
                type="button"
                onClick={() => setViewPhotoModalUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-2xl bg-slate-950 flex items-center justify-center">
              <img
                src={viewPhotoModalUrl.url}
                alt={viewPhotoModalUrl.title || 'Full photo'}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Add Staff Account</h3>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {addUserError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs mb-4">
                {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateStaffAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Siti Sarah"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Email *</label>
                <input
                  type="email"
                  placeholder="e.g. sarah@hotel.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Password (min 6 chars) *</label>
                <input
                  type="text"
                  placeholder="e.g. Hotel@2026"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => {
                      const selectedRole = e.target.value;
                      let suggestedDept = newUserForm.department;
                      if (selectedRole === 'Receptionist') suggestedDept = 'Front Office';
                      else if (selectedRole === 'Security') suggestedDept = 'Security & Loss Prevention';
                      else if (selectedRole === 'Housekeeping') suggestedDept = 'Housekeeping';
                      else if (selectedRole === 'Administrator') suggestedDept = 'Management & IT';

                      setNewUserForm({ 
                        ...newUserForm, 
                        role: selectedRole, 
                        department: suggestedDept
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Receptionist">Receptionist</option>
                    <option value="Security">Security</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Front Office">Front Office</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Security & Loss Prevention">Security & Loss Prevention</option>
                    <option value="Food & Beverage (F&B)">Food & Beverage (F&B)</option>
                    <option value="Concierge & Guest Services">Concierge & Guest Services</option>
                    <option value="Engineering & Maintenance">Engineering & Maintenance</option>
                    <option value="Management & IT">Management & IT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 013-9876543"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {addUserLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordModalOpen && selectedUserForPassword && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
              </div>
              <button
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Update assigned password for <strong className="text-slate-800">{selectedUserForPassword.name}</strong>.
            </p>

            {passwordChangeMsg.text && (
              <div
                className={`p-3 rounded-xl text-xs mb-3 ${
                  passwordChangeMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}
              >
                <span>{passwordChangeMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangeStaffPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="text"
                  placeholder="Min 6 characters"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {passwordChangeLoading ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, title: '', description: '', actionType: null, targetId: null })}
                className="flex-1 py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-900/20 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}