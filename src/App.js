import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  onValue 
} from 'firebase/database';

import { 
  LayoutDashboard, 
  Thermometer, 
  Droplets, 
  Wind, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Activity, 
  Radio, 
  Download, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Mail, 
  Lock, 
  FileText,
  Clock,
  PieChart as PieIcon,
  Sparkles
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

const RTDB_URL = "https://air-cooler-b6f0d-default-rtdb.asia-southeast1.firebasedatabase.app";

const firebaseConfig = {
  apiKey: getEnv('REACT_APP_FIREBASE_API_KEY', "AIzaSyA6WS5A-IdTN0aWoz2wDxg8XfD_RZ3cUWk"),
  authDomain: getEnv('REACT_APP_FIREBASE_AUTH_DOMAIN', "air-cooler-b6f0d.firebaseapp.com"),
  databaseURL: RTDB_URL,
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
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live DHT22 Sensor States directly from root database
  const [sensorData, setSensorData] = useState({
    temperature: 30,
    humidity: 99,
    lastUpdated: new Date().toLocaleTimeString()
  });

  // History buffer for charts & log table
  const [historyLogs, setHistoryLogs] = useState([]);

  // Notifications Popover State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  // Load external styling & fonts
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
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Handle Firebase Authentication state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Listen directly to Firebase Realtime Database root keys: /temperature and /humidity
  useEffect(() => {
    if (!currentUser) return;

    const rootRef = ref(database);
    const unsubscribeData = onValue(rootRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const temp = val.temperature !== undefined ? Number(val.temperature) : 0;
        const hum = val.humidity !== undefined ? Number(val.humidity) : 0;
        const timeNow = new Date().toLocaleTimeString();

        setSensorData({
          temperature: temp,
          humidity: hum,
          lastUpdated: timeNow
        });

        // Add to historical rolling window (keep up to 30 readings)
        setHistoryLogs((prev) => {
          const newEntry = {
            id: `read-${Date.now()}`,
            timestamp: new Date().toISOString(),
            timeStr: timeNow,
            temperature: temp,
            humidity: hum
          };
          return [newEntry, ...prev.slice(0, 29)];
        });
      }
    });

    // Fallback polling via REST API directly to the RTDB endpoint
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${RTDB_URL}/.json`);
        if (res.ok) {
          const val = await res.json();
          if (val) {
            const temp = val.temperature !== undefined ? Number(val.temperature) : 0;
            const hum = val.humidity !== undefined ? Number(val.humidity) : 0;
            const timeNow = new Date().toLocaleTimeString();

            setSensorData((prev) => {
              if (prev.temperature !== temp || prev.humidity !== hum) {
                return { temperature: temp, humidity: hum, lastUpdated: timeNow };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        // Silent recovery
      }
    }, 3000);

    return () => {
      unsubscribeData();
      clearInterval(pollInterval);
    };
  }, [currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) {
      setLoginError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      // Ignore
    }
  };

  // Environmental Cooler Status Analytics
  const coolingComfort = useMemo(() => {
    const { temperature, humidity } = sensorData;
    if (humidity > 90 && temperature > 28) {
      return {
        label: 'Cooler Saturation Warning',
        desc: 'Humidity is near 100% and heat is elevated. Evaporative cooling pad efficiency drops under saturated moisture.',
        color: 'rose',
        status: 'CRITICAL_HUMIDITY'
      };
    } else if (temperature < 25 && humidity < 70) {
      return {
        label: 'Optimal Comfort',
        desc: 'Air cooler output is maintaining ideal temperature and humidity distribution.',
        color: 'emerald',
        status: 'OPTIMAL'
      };
    } else {
      return {
        label: 'Active Conditioning',
        desc: 'Cooler is running normally within balanced operating bounds.',
        color: 'blue',
        status: 'NORMAL'
      };
    }
  }, [sensorData]);

  // Donut/Pie Calculations for Temperature (Scale: 0 to 50 °C)
  const tempChartData = useMemo(() => {
    const maxTemp = 50;
    const current = Math.min(Math.max(sensorData.temperature, 0), maxTemp);
    const remaining = maxTemp - current;
    const percentage = Math.round((current / maxTemp) * 100);
    const circumference = 2 * Math.PI * 36;
    const strokeDasharray = `${(current / maxTemp) * circumference} ${circumference}`;

    let color = '#10b981'; // cool/green
    if (current > 32) color = '#f43f5e'; // hot/rose
    else if (current > 27) color = '#f59e0b'; // warm/amber

    return {
      current,
      remaining,
      percentage,
      circumference,
      strokeDasharray,
      color,
      max: maxTemp
    };
  }, [sensorData.temperature]);

  // Donut/Pie Calculations for Humidity (Scale: 0 to 100 %)
  const humChartData = useMemo(() => {
    const maxHum = 100;
    const current = Math.min(Math.max(sensorData.humidity, 0), maxHum);
    const remaining = maxHum - current;
    const percentage = Math.round(current);
    const circumference = 2 * Math.PI * 36;
    const strokeDasharray = `${(current / maxHum) * circumference} ${circumference}`;

    let color = '#06b6d4'; // normal cyan
    if (current > 85) color = '#3b82f6'; // saturated deep blue
    else if (current < 40) color = '#eab308'; // dry yellow

    return {
      current,
      remaining,
      percentage,
      circumference,
      strokeDasharray,
      color,
      max: maxHum
    };
  }, [sensorData.humidity]);

  // SVG Line Chart Calculation for Temperature trend
  const chartWidth = 500;
  const chartHeight = 150;
  const padBottom = 20;

  const points = useMemo(() => {
    if (historyLogs.length < 2) {
      return [
        { x: 30, y: chartHeight / 2, val: sensorData.temperature },
        { x: chartWidth - 30, y: chartHeight / 2, val: sensorData.temperature }
      ];
    }
    const sample = [...historyLogs].reverse().slice(-12);
    const minVal = Math.min(...sample.map((s) => s.temperature), 15);
    const maxVal = Math.max(...sample.map((s) => s.temperature), 45);
    const range = maxVal - minVal || 1;

    return sample.map((item, idx) => {
      const x = 30 + idx * ((chartWidth - 60) / Math.max(sample.length - 1, 1));
      const ratio = (item.temperature - minVal) / range;
      const y = (chartHeight - padBottom) - ratio * (chartHeight - padBottom - 25);
      return { x, y, val: item.temperature, time: item.timeStr };
    });
  }, [historyLogs, sensorData.temperature]);

  const polylineStr = useMemo(() => points.map((p) => `${p.x},${p.y}`).join(' '), [points]);

  const handleExportCSV = () => {
    if (historyLogs.length === 0) return;
    const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Status'];
    const rows = historyLogs.map((log) => [
      `"${new Date(log.timestamp).toLocaleString('en-GB')}"`,
      log.temperature,
      log.humidity,
      `"${coolingComfort.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AirCooler_DHT22_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-950/60 animate-bounce">
          <Wind size={26} className="text-white" />
        </div>
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Connecting to Air Cooler DHT22 Cloud...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/30">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-cyan-700/80 border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-950/50 mb-3">
              <Wind size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1">
              <span>AIR COOLER</span><span className="text-cyan-400 font-extrabold">IOT</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Real-Time DHT22 Climate Telemetry</p>
          </div>

          {loginError && (
            <div className="p-3.5 mb-5 bg-rose-950/60 border border-rose-800 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Operator Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="admin@cooler.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full mt-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-950/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Access Monitor Portal</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              ESP32 / NodeMCU DHT22 Evaporative Cooler Unit
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 selection:bg-cyan-600 selection:text-white relative overflow-x-hidden">
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-5 md:p-6 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-700 border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-950/50">
              <Wind size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
                <span>COOLER</span><span className="text-cyan-400 font-extrabold">MON</span>
              </h1>
              <p className="text-[10px] text-slate-400">DHT22 Realtime Stream</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
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
                ? 'bg-cyan-700 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('logs');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'logs'
                ? 'bg-cyan-700 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock size={17} />
            <span>Telemetry History</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('reports');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'reports'
                ? 'bg-cyan-700 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText size={17} />
            <span>Reports &amp; Export</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('help');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'help'
                ? 'bg-cyan-700 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle size={17} />
            <span>Hardware Diagnostics</span>
          </button>
        </nav>

        <div className="p-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              AC
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser?.email || 'Operator'}</p>
              <p className="text-[10px] text-cyan-400 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Firebase Online
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm relative z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="hidden sm:inline">Air Cooler System</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-bold capitalize">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Live Data Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-200 rounded-full text-xs font-mono font-bold text-cyan-800">
              <Radio size={13} className="text-cyan-600 animate-pulse" />
              <span>DHT22 LIVE STREAM</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setNotificationsRead(true);
                }}
                className="relative p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
              >
                <Bell size={19} />
                {!notificationsRead && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>

              {showNotifications && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">System Activity</span>
                    <span className="text-[10px] text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full font-semibold">
                      Live
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800">Realtime Snapshot</p>
                        <p className="text-[11px] text-slate-500">
                          Temperature: {sensorData.temperature}°C, Humidity: {sensorData.humidity}%
                        </p>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{sensorData.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/70">
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Individual Pie / Donut Charts for Temperature & Humidity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. TEMPERATURE PIE / DONUT CARD */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow transition">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                        <Thermometer size={22} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">PATH: /temperature</span>
                        <h3 className="text-base font-extrabold text-slate-800">Temperature Pie Gauge</h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                      0 – 50°C
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6">
                    {/* SVG Pie Chart for Temperature */}
                    <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {/* Background track */}
                        <circle
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="15"
                        />
                        {/* Active Temperature Arc */}
                        <circle
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke={tempChartData.color}
                          strokeWidth="15"
                          strokeDasharray={tempChartData.strokeDasharray}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>

                      {/* Center Reading */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                        <span className="text-2xl font-black text-slate-900 leading-tight font-mono">
                          {sensorData.temperature}°
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
                          Celsius
                        </span>
                      </div>
                    </div>

                    {/* Temperature Legend & Proportions */}
                    <div className="flex-1 w-full space-y-2.5">
                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tempChartData.color }} />
                          Current Thermal Load
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {sensorData.temperature} °C ({tempChartData.percentage}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                          Scale Headroom (50°C Max)
                        </span>
                        <span className="font-bold text-slate-500 font-mono">
                          {tempChartData.remaining.toFixed(1)} °C
                        </span>
                      </div>

                      <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Status: <strong className="text-slate-700">{sensorData.temperature > 32 ? 'High Thermal' : 'Comfort Band'}</strong></span>
                        <span className="font-mono">{sensorData.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. HUMIDITY PIE / DONUT CARD */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow transition">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
                        <Droplets size={22} />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">PATH: /humidity</span>
                        <h3 className="text-base font-extrabold text-slate-800">Humidity Pie Gauge</h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 text-xs font-bold rounded-full border border-cyan-200">
                      0 – 100% RH
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6">
                    {/* SVG Pie Chart for Humidity */}
                    <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {/* Background track */}
                        <circle
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="15"
                        />
                        {/* Active Humidity Arc */}
                        <circle
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          stroke={humChartData.color}
                          strokeWidth="15"
                          strokeDasharray={humChartData.strokeDasharray}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>

                      {/* Center Reading */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                        <span className="text-2xl font-black text-slate-900 leading-tight font-mono">
                          {sensorData.humidity}%
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-600">
                          Relative
                        </span>
                      </div>
                    </div>

                    {/* Humidity Legend & Proportions */}
                    <div className="flex-1 w-full space-y-2.5">
                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: humChartData.color }} />
                          Current Saturation
                        </span>
                        <span className="font-bold text-slate-900 font-mono">
                          {sensorData.humidity} %
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                          Dry Margin Room
                        </span>
                        <span className="font-bold text-slate-500 font-mono">
                          {humChartData.remaining.toFixed(1)} %
                        </span>
                      </div>

                      <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Status: <strong className="text-cyan-700">{sensorData.humidity >= 90 ? 'Near Saturation' : 'Balanced Vapor'}</strong></span>
                        <span className="font-mono">{sensorData.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Status & Diagnostic Banner */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      coolingComfort.color === 'rose' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}>
                      <Activity size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{coolingComfort.label}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          coolingComfort.color === 'rose' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {coolingComfort.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl">{coolingComfort.desc}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Database Endpoint</span>
                    <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 inline-block mt-0.5">
                      air-cooler-b6f0d-default-rtdb
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time SVG Trend Chart */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-7 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">TEMPERATURE STREAM OVERVIEW</h3>
                    <p className="text-xs text-slate-400">Live timeline curve recorded from incoming WebSocket snapshots</p>
                  </div>
                  <span className="text-xs font-mono bg-cyan-50 text-cyan-800 px-3 py-1 rounded-xl border border-cyan-200 font-bold">
                    {historyLogs.length} Samples
                  </span>
                </div>

                <div className="h-44 w-full pt-4">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                    <line x1="20" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeDasharray="4 4" />
                    <line x1="20" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeDasharray="4 4" />
                    <line x1="20" y1={chartHeight - padBottom} x2="480" y2={chartHeight - padBottom} stroke="#e2e8f0" />

                    <polyline
                      fill="none"
                      stroke="#0891b2"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylineStr}
                    />

                    {points.map((pt, idx) => (
                      <g key={idx}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill="#0891b2"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 10}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill="#0e7490"
                        >
                          {pt.val}°C
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

            </div>
          )}

          {/* TAB: LOGS */}
          {activeTab === 'logs' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={20} className="text-cyan-600" />
                    <span>DHT22 Activity Logs</span>
                  </h2>
                  <p className="text-xs text-slate-500">Live operational history of temperature &amp; humidity shifts</p>
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={historyLogs.length === 0}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Export Log to CSV</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">TIMESTAMP</th>
                      <th className="py-3 px-4">TEMPERATURE</th>
                      <th className="py-3 px-4">HUMIDITY</th>
                      <th className="py-3 px-4">HEAT INDEX</th>
                      <th className="py-3 px-4 text-right">SOURCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {historyLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-10 text-center text-slate-400 font-sans">
                          Awaiting sensor updates from Firebase...
                        </td>
                      </tr>
                    ) : (
                      historyLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition font-sans">
                          <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-amber-700">
                            {log.temperature} °C
                          </td>
                          <td className="py-3 px-4 font-bold text-cyan-700">
                            {log.humidity} %
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">
                            {log.temperature > 27 && log.humidity > 80 ? 'Heavy Moist Heat' : 'Standard'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                            RTDB: /temperature
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: REPORTS */}
          {activeTab === 'reports' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Air Cooler Diagnostics &amp; Audit</h2>
                  <p className="text-xs text-slate-500">System metrics, cloud connection verification, and export tools</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    <span>Download CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer size={14} />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Samples Logged</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{historyLogs.length}</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Current Temperature</p>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">{sensorData.temperature} °C</p>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Current Humidity</p>
                  <p className="text-2xl font-extrabold text-cyan-600 mt-1">{sensorData.humidity} %</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 text-sm">System Connection Details</h4>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Firebase RTDB URL</span>
                  <span className="font-mono text-slate-800">{RTDB_URL}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Subscribed Keys</span>
                  <span className="font-mono text-cyan-700 font-bold">/temperature , /humidity</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Sensor Model</span>
                  <span className="font-semibold text-slate-800">DHT22 Digital Temperature &amp; Humidity</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HELP */}
          {activeTab === 'help' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Hardware &amp; Circuit Wiring Reference</h2>
                <p className="text-xs text-slate-500">DHT22 pinouts and ESP32 / Arduino connection guidance</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
                <h3 className="font-bold text-sm text-slate-800">DHT22 Pin Connections</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase">Pin 1</p>
                    <p className="text-sm font-bold text-slate-800">VCC (3.3V / 5V)</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase">Pin 2</p>
                    <p className="text-sm font-bold text-cyan-600">DATA (GPIO)</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase">Pin 3</p>
                    <p className="text-sm font-bold text-slate-400">NC (No Conn)</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase">Pin 4</p>
                    <p className="text-sm font-bold text-slate-800">GND</p>
                  </div>
                </div>
                <p className="text-slate-500 leading-relaxed mt-2">
                  * Note: For bare 4-pin DHT22 sensors, add a 4.7kΩ - 10kΩ pull-up resistor between Pin 1 (VCC) and Pin 2 (DATA) for stable signal transmission.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}