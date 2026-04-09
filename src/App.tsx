/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Pause, Play, Plus, RotateCcw, Settings, Volume2, VolumeX } from 'lucide-react';

type TimerMode = 'focus' | 'break';

type DurationControl = {
  delta: number;
  label: string;
  title: string;
};

type DurationSection = {
  key: TimerMode;
  label: string;
  value: number;
  setValue: Dispatch<SetStateAction<number>>;
};

const MIN_DURATION_SECONDS = 5;
const FIVE_SECONDS_STEP = 5;
const ONE_MINUTE_STEP = 60;

const DURATION_CONTROLS: DurationControl[] = [
  { delta: -ONE_MINUTE_STEP, label: '-1分', title: '减少 1 分钟' },
  { delta: -FIVE_SECONDS_STEP, label: '-5秒', title: '减少 5 秒' },
  { delta: FIVE_SECONDS_STEP, label: '+5秒', title: '增加 5 秒' },
  { delta: ONE_MINUTE_STEP, label: '+1分', title: '增加 1 分钟' },
];

const getModeDuration = (mode: TimerMode, focusDuration: number, breakDuration: number) =>
  mode === 'focus' ? focusDuration : breakDuration;

export default function App() {
  const [totalRounds, setTotalRounds] = useState<number>(10);
  const [focusDuration, setFocusDuration] = useState<number>(25 * 60);
  const [breakDuration, setBreakDuration] = useState<number>(5 * 60);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(focusDuration);
  const [preciseTimeLeft, setPreciseTimeLeft] = useState<number>(focusDuration);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const targetTimeRef = useRef<number | null>(null);
  const lastAnnouncedSecondRef = useRef<number>(focusDuration);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const syncDisplayedTime = useCallback((seconds: number) => {
    setTimeLeft(seconds);
    setPreciseTimeLeft(seconds);
    lastAnnouncedSecondRef.current = seconds;
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    targetTimeRef.current = null;
  }, []);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) {
        audioContextRef.current = new AudioContextCtor();
      }
    }
  };

  const playBeep = useCallback((frequency = 880, duration = 0.1) => {
    if (!isSoundEnabled || !audioContextRef.current) {
      return;
    }

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

  const adjustDuration = (
    currentDuration: number,
    setDuration: Dispatch<SetStateAction<number>>,
    deltaSeconds: number,
    targetMode: TimerMode,
  ) => {
    const nextDuration = Math.max(MIN_DURATION_SECONDS, currentDuration + deltaSeconds);
    setDuration(nextDuration);

    if (!isRunning && mode === targetMode) {
      syncDisplayedTime(nextDuration);
    }
  };

  const handleTimerComplete = useCallback(() => {
    stopAnimation();

    if (mode === 'focus') {
      if (currentRound < totalRounds) {
        setMode('break');
        syncDisplayedTime(breakDuration);
      } else {
        setIsRunning(false);
      }

      return;
    }

    setMode('focus');
    setCurrentRound((prevRound) => prevRound + 1);
    syncDisplayedTime(focusDuration);
  }, [breakDuration, currentRound, focusDuration, mode, stopAnimation, syncDisplayedTime, totalRounds]);

  useEffect(() => {
    if (!isRunning) {
      stopAnimation();
      return undefined;
    }

    targetTimeRef.current = performance.now() + preciseTimeLeft * 1000;

    const tick = () => {
      if (targetTimeRef.current === null) {
        return;
      }

      const remainingSeconds = Math.max(0, (targetTimeRef.current - performance.now()) / 1000);
      const roundedSeconds = Math.ceil(remainingSeconds);

      setPreciseTimeLeft(remainingSeconds);

      if (roundedSeconds !== lastAnnouncedSecondRef.current) {
        setTimeLeft(roundedSeconds);

        if (roundedSeconds <= 10 && roundedSeconds >= 0) {
          playBeep(roundedSeconds === 0 ? 1320 : 880, roundedSeconds === 0 ? 0.3 : 0.1);
        }

        lastAnnouncedSecondRef.current = roundedSeconds;
      }

      if (remainingSeconds <= 0) {
        syncDisplayedTime(0);
        handleTimerComplete();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return stopAnimation;
  }, [handleTimerComplete, isRunning, playBeep, preciseTimeLeft, stopAnimation, syncDisplayedTime]);

  const toggleTimer = () => {
    initAudio();

    if (isRunning && targetTimeRef.current !== null) {
      const remainingSeconds = Math.max(0, (targetTimeRef.current - performance.now()) / 1000);
      const roundedSeconds = Math.ceil(remainingSeconds);
      setPreciseTimeLeft(remainingSeconds);
      setTimeLeft(roundedSeconds);
      lastAnnouncedSecondRef.current = roundedSeconds;
      targetTimeRef.current = null;
    } else {
      lastAnnouncedSecondRef.current = timeLeft;
    }

    setIsRunning((prevRunning) => !prevRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setCurrentRound(1);
    setMode('focus');
    stopAnimation();
    syncDisplayedTime(focusDuration);
  };

  const currentModeDuration = getModeDuration(mode, focusDuration, breakDuration);
  const progress = (preciseTimeLeft / currentModeDuration) * 100;
  const visibleProgress = Math.max(0, Math.min(progress, 100));
  const ringStrokeDasharray = `${visibleProgress} ${100 - visibleProgress}`;

  const durationSections: DurationSection[] = [
    { key: 'focus', label: '专注时长', value: focusDuration, setValue: setFocusDuration },
    { key: 'break', label: '间隔时长', value: breakDuration, setValue: setBreakDuration },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-pink-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="text-center mb-12 relative z-10">
        <h1 className="text-4xl font-bold tracking-widest mb-2">番茄钟</h1>
        <p className="text-slate-400 text-sm tracking-[0.3em] uppercase">专注 · 休息 · 循环</p>
      </header>

      <main className="relative z-10 flex flex-col items-center">
        <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mb-12">
          <svg className="absolute inset-0 w-full h-full">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-800"
            />
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              pathLength={100}
              strokeLinecap="round"
              className={mode === 'focus' ? 'text-pink-500' : 'text-emerald-500'}
              strokeDasharray={ringStrokeDasharray}
              style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg) scaleX(-1)' }}
            />
          </svg>

          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">{mode === 'focus' ? '专注时间' : '休息时间'}</p>
            <h2 className="text-6xl font-mono font-medium tabular-nums mb-2">{formatTime(timeLeft)}</h2>
            <p className="text-slate-500 text-xs tracking-wider">第 {currentRound} / {totalRounds} 轮</p>
          </div>
        </div>

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
            onClick={() => setIsSoundEnabled((prevEnabled) => !prevEnabled)}
            className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors text-slate-300"
            title={isSoundEnabled ? '静音' : '开启声音'}
          >
            {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <button
          onClick={() => setShowSettings((prevVisible) => !prevVisible)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/30 hover:bg-slate-800/60 transition-all text-slate-400 text-sm mb-8"
        >
          <Settings size={16} />
          设置
        </button>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-500 uppercase tracking-widest">轮次设置</span>
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-1">
                  <button
                    onClick={() => setTotalRounds((prevRounds) => Math.max(1, prevRounds - 1))}
                    className="p-2 hover:text-pink-500 transition-colors"
                    title="减少 1 轮"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-mono">{totalRounds}</span>
                  <button
                    onClick={() => setTotalRounds((prevRounds) => prevRounds + 1)}
                    className="p-2 hover:text-pink-500 transition-colors"
                    title="增加 1 轮"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {durationSections.map((section) => (
                <div key={section.key} className="flex flex-col items-center gap-3">
                  <span className="text-xs text-slate-500 uppercase tracking-widest">{section.label}</span>
                  <div className="flex flex-col items-center gap-2 bg-slate-800/50 rounded-xl p-3 w-full">
                    <span className="font-mono tabular-nums text-sm">{formatTime(section.value)}</span>
                    <div className="grid grid-cols-4 gap-2 w-full">
                      {DURATION_CONTROLS.map((control) => (
                        <button
                          key={`${section.key}-${control.label}`}
                          onClick={() => adjustDuration(section.value, section.setValue, control.delta, section.key)}
                          className="px-2 py-2 rounded-lg text-xs bg-slate-800 hover:text-pink-500 transition-colors"
                          title={control.title}
                        >
                          {control.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
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
