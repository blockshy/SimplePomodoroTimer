/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Plus, Minus, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TimerMode = 'focus' | 'break';

export default function App() {
  // Settings
  const [totalRounds, setTotalRounds] = useState(10);
  const [focusDuration, setFocusDuration] = useState(25 * 60); // 25 minutes in seconds
  const [breakDuration, setBreakDuration] = useState(5 * 60); // 5 minutes in seconds

  // State
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(focusDuration);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Audio Context on user interaction
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  // Play beep sound
  const playBeep = useCallback((frequency: number = 880, duration: number = 0.1) => {
    if (!isSoundEnabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }, [isSoundEnabled]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          
          // Beep logic: last 10 seconds (or every second if duration < 10)
          if (next <= 10 && next >= 0) {
            playBeep(next === 0 ? 1320 : 880, next === 0 ? 0.3 : 0.1);
          }
          
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, playBeep]);

  const handleTimerComplete = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (mode === 'focus') {
      if (currentRound < totalRounds) {
        setMode('break');
        setTimeLeft(breakDuration);
      } else {
        setIsRunning(false);
        // All rounds complete
      }
    } else {
      setMode('focus');
      setCurrentRound((prev) => prev + 1);
      setTimeLeft(focusDuration);
    }
  };

  const toggleTimer = () => {
    initAudio();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setCurrentRound(1);
    setMode('focus');
    setTimeLeft(focusDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'focus' 
    ? (timeLeft / focusDuration) * 100 
    : (timeLeft / breakDuration) * 100;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-pink-500/30">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="text-center mb-12 relative z-10">
        <h1 className="text-4xl font-bold tracking-widest mb-2">番茄钟</h1>
        <p className="text-slate-400 text-sm tracking-[0.3em] uppercase">专注 · 休息 · 循环</p>
      </header>

      <main className="relative z-10 flex flex-col items-center">
        {/* Timer Circle */}
        <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mb-12">
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-800"
            />
            <motion.circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray="100 100"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: progress }}
              transition={{ duration: 1, ease: "linear" }}
              className={mode === 'focus' ? "text-pink-500" : "text-emerald-500"}
              style={{ strokeDasharray: "301.59", strokeDashoffset: `${(progress / 100) * 301.59}` }}
            />
          </svg>

          {/* Inner Content */}
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">{mode === 'focus' ? '专注时间' : '休息时间'}</p>
            <h2 className="text-6xl font-mono font-medium tabular-nums mb-2">
              {formatTime(timeLeft)}
            </h2>
            <p className="text-slate-500 text-xs tracking-wider">
              第 {currentRound} / {totalRounds} 轮
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mb-12">
          <button 
            onClick={resetTimer}
            className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors text-slate-300"
            title="重置"
          >
            <RotateCcw size={20} />
          </button>

          <button 
            onClick={toggleTimer}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
              isRunning ? 'bg-slate-700' : 'bg-pink-500'
            }`}
          >
            {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
          </button>

          <button 
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors text-slate-300"
            title={isSoundEnabled ? "静音" : "开启声音"}
          >
            {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        {/* Settings Button */}
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/30 hover:bg-slate-800/60 transition-all text-slate-400 text-sm mb-8"
        >
          <Settings size={16} />
          设置
        </button>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-500 uppercase tracking-widest">轮数设置</span>
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-1">
                  <button onClick={() => setTotalRounds(Math.max(1, totalRounds - 1))} className="p-2 hover:text-pink-500 transition-colors"><Minus size={16}/></button>
                  <span className="w-8 text-center font-mono">{totalRounds}</span>
                  <button onClick={() => setTotalRounds(totalRounds + 1)} className="p-2 hover:text-pink-500 transition-colors"><Plus size={16}/></button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-500 uppercase tracking-widest">专注时长</span>
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-1">
                  <button onClick={() => {
                    const newVal = Math.max(60, focusDuration - 60);
                    setFocusDuration(newVal);
                    if (!isRunning && mode === 'focus') setTimeLeft(newVal);
                  }} className="p-2 hover:text-pink-500 transition-colors"><Minus size={16}/></button>
                  <span className="w-8 text-center font-mono">{focusDuration / 60}</span>
                  <button onClick={() => {
                    const newVal = focusDuration + 60;
                    setFocusDuration(newVal);
                    if (!isRunning && mode === 'focus') setTimeLeft(newVal);
                  }} className="p-2 hover:text-pink-500 transition-colors"><Plus size={16}/></button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-500 uppercase tracking-widest">间隔时长</span>
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-1">
                  <button onClick={() => {
                    const newVal = Math.max(60, breakDuration - 60);
                    setBreakDuration(newVal);
                    if (!isRunning && mode === 'break') setTimeLeft(newVal);
                  }} className="p-2 hover:text-pink-500 transition-colors"><Minus size={16}/></button>
                  <span className="w-8 text-center font-mono">{breakDuration / 60}</span>
                  <button onClick={() => {
                    const newVal = breakDuration + 60;
                    setBreakDuration(newVal);
                    if (!isRunning && mode === 'break') setTimeLeft(newVal);
                  }} className="p-2 hover:text-pink-500 transition-colors"><Plus size={16}/></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto py-8 text-slate-600 text-xs tracking-widest uppercase">
        Stay Focused · Keep Moving
      </footer>
    </div>
  );
}
