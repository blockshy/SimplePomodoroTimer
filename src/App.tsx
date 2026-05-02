/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Languages,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Sun,
  TimerReset,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  applyLanguage,
  applyTheme,
  cleanupLanguageQueryParam,
  cleanupThemeQueryParam,
  readInitialLanguage,
  readInitialTheme,
} from './lib/preferences';
import type { AppLanguage, ThemeMode } from './lib/preferences';

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

const copy = {
  zh: {
    appName: '番茄钟',
    subtitle: '专注 · 休息 · 循环',
    focusMode: '专注时间',
    breakMode: '休息时间',
    roundStatus: (current: number, total: number) => `第 ${current} / ${total} 轮`,
    reset: '重置',
    start: '开始',
    pause: '暂停',
    mute: '静音',
    unmute: '开启声音',
    settings: '设置',
    closeSettings: '收起设置',
    roundSettings: '轮次设置',
    focusDuration: '专注时长',
    breakDuration: '间隔时长',
    lessRound: '减少 1 轮',
    moreRound: '增加 1 轮',
    footer: 'Stay Focused · Keep Moving',
    switchToEnglish: '切换到 English',
    switchToChinese: '切换到中文',
    themeLight: '切换到浅色模式',
    themeDark: '切换到深色模式',
    minusMinute: '减少 1 分钟',
    minusFiveSeconds: '减少 5 秒',
    plusFiveSeconds: '增加 5 秒',
    plusMinute: '增加 1 分钟',
    minuteShort: '分',
    secondShort: '秒',
  },
  en: {
    appName: 'Pomodoro Timer',
    subtitle: 'Focus · Break · Repeat',
    focusMode: 'Focus time',
    breakMode: 'Break time',
    roundStatus: (current: number, total: number) => `Round ${current} / ${total}`,
    reset: 'Reset',
    start: 'Start',
    pause: 'Pause',
    mute: 'Mute',
    unmute: 'Enable sound',
    settings: 'Settings',
    closeSettings: 'Close settings',
    roundSettings: 'Rounds',
    focusDuration: 'Focus duration',
    breakDuration: 'Break duration',
    lessRound: 'Decrease by 1 round',
    moreRound: 'Increase by 1 round',
    footer: 'Stay Focused · Keep Moving',
    switchToEnglish: 'Switch to English',
    switchToChinese: 'Switch to Chinese',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode',
    minusMinute: 'Decrease by 1 minute',
    minusFiveSeconds: 'Decrease by 5 seconds',
    plusFiveSeconds: 'Increase by 5 seconds',
    plusMinute: 'Increase by 1 minute',
    minuteShort: 'm',
    secondShort: 's',
  },
} satisfies Record<AppLanguage, Record<string, string | ((current: number, total: number) => string)>>;

const getModeDuration = (mode: TimerMode, focusDuration: number, breakDuration: number) =>
  mode === 'focus' ? focusDuration : breakDuration;

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => readInitialLanguage());
  const [theme, setTheme] = useState<ThemeMode>(() => readInitialTheme());
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
  const t = copy[language];

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
    applyLanguage(language);
    cleanupLanguageQueryParam();
  }, [language]);

  useEffect(() => {
    applyTheme(theme);
    cleanupThemeQueryParam();
  }, [theme]);

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

  const toggleLanguage = () => setLanguage((current) => (current === 'zh' ? 'en' : 'zh'));
  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  const currentModeDuration = getModeDuration(mode, focusDuration, breakDuration);
  const progress = (preciseTimeLeft / currentModeDuration) * 100;
  const visibleProgress = Math.max(0, Math.min(progress, 100));
  const ringStrokeDasharray = `${visibleProgress} ${100 - visibleProgress}`;

  const durationControls: DurationControl[] = [
    { delta: -ONE_MINUTE_STEP, label: `-1${t.minuteShort}`, title: t.minusMinute as string },
    { delta: -FIVE_SECONDS_STEP, label: `-5${t.secondShort}`, title: t.minusFiveSeconds as string },
    { delta: FIVE_SECONDS_STEP, label: `+5${t.secondShort}`, title: t.plusFiveSeconds as string },
    { delta: ONE_MINUTE_STEP, label: `+1${t.minuteShort}`, title: t.plusMinute as string },
  ];

  const durationSections: DurationSection[] = [
    { key: 'focus', label: t.focusDuration as string, value: focusDuration, setValue: setFocusDuration },
    { key: 'break', label: t.breakDuration as string, value: breakDuration, setValue: setBreakDuration },
  ];

  return (
    <div className="pomodoro-app min-h-screen font-sans">
      <header className="tool-shell-header">
        <div className="tool-shell-header-inner">
          <div className="tool-brand">
            <div className="tool-brand-mark">
              <TimerReset className="w-5 h-5" />
            </div>
            <div>
              <h1 className="tool-brand-title">{t.appName as string}</h1>
              <p className="tool-brand-subtitle">{t.subtitle as string}</p>
            </div>
          </div>

          <div className="tool-header-actions">
            <button
              type="button"
              className="tool-text-button"
              onClick={toggleLanguage}
              title={language === 'zh' ? t.switchToEnglish as string : t.switchToChinese as string}
              aria-label={language === 'zh' ? t.switchToEnglish as string : t.switchToChinese as string}
            >
              <Languages className="w-4 h-4" />
              {language.toUpperCase()}
            </button>
            <button
              type="button"
              className="tool-icon-button"
              onClick={toggleTheme}
              title={theme === 'dark' ? t.themeLight as string : t.themeDark as string}
              aria-label={theme === 'dark' ? t.themeLight as string : t.themeDark as string}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="pomodoro-main">
        <motion.section
          className="pomodoro-workspace"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div className="pomodoro-ring-panel">
            <div className="pomodoro-ring-frame" aria-label={mode === 'focus' ? t.focusMode as string : t.breakMode as string}>
              <svg className="pomodoro-ring" viewBox="0 0 100 100" role="img" aria-hidden="true">
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.75"
                  className="pomodoro-ring-track"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.75"
                  pathLength={100}
                  strokeLinecap="round"
                  className={mode === 'focus' ? 'pomodoro-ring-focus' : 'pomodoro-ring-break'}
                  strokeDasharray={ringStrokeDasharray}
                  style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg) scaleX(-1)' }}
                />
              </svg>

              <div className="pomodoro-time-stack">
                <p className="pomodoro-mode-label">{mode === 'focus' ? t.focusMode as string : t.breakMode as string}</p>
                <h2 className="pomodoro-time">{formatTime(timeLeft)}</h2>
                <p className="pomodoro-round">{(t.roundStatus as (current: number, total: number) => string)(currentRound, totalRounds)}</p>
              </div>
            </div>

            <div className="pomodoro-actions" aria-label="Timer controls">
              <button
                type="button"
                onClick={resetTimer}
                className="tool-icon-button pomodoro-secondary-action"
                title={t.reset as string}
                aria-label={t.reset as string}
              >
                <RotateCcw size={20} />
              </button>

              <button
                type="button"
                onClick={toggleTimer}
                className={`pomodoro-primary-action ${isRunning ? 'is-running' : ''}`}
                title={isRunning ? t.pause as string : t.start as string}
                aria-label={isRunning ? t.pause as string : t.start as string}
              >
                {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
              </button>

              <button
                type="button"
                onClick={() => setIsSoundEnabled((prevEnabled) => !prevEnabled)}
                className="tool-icon-button pomodoro-secondary-action"
                title={isSoundEnabled ? t.mute as string : t.unmute as string}
                aria-label={isSoundEnabled ? t.mute as string : t.unmute as string}
              >
                {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>

          <div className="pomodoro-settings-column">
            <button
              type="button"
              onClick={() => setShowSettings((prevVisible) => !prevVisible)}
              className="tool-outline-button"
              aria-expanded={showSettings}
            >
              <Settings size={16} />
              {showSettings ? t.closeSettings as string : t.settings as string}
            </button>

            <AnimatePresence initial={false}>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="pomodoro-settings-panel"
                >
                  <div className="pomodoro-setting-block">
                    <span className="pomodoro-setting-label">{t.roundSettings as string}</span>
                    <div className="pomodoro-stepper">
                      <button
                        type="button"
                        onClick={() => setTotalRounds((prevRounds) => Math.max(1, prevRounds - 1))}
                        className="pomodoro-step-button"
                        title={t.lessRound as string}
                        aria-label={t.lessRound as string}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="pomodoro-step-value">{totalRounds}</span>
                      <button
                        type="button"
                        onClick={() => setTotalRounds((prevRounds) => prevRounds + 1)}
                        className="pomodoro-step-button"
                        title={t.moreRound as string}
                        aria-label={t.moreRound as string}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {durationSections.map((section) => (
                    <div key={section.key} className="pomodoro-setting-block">
                      <span className="pomodoro-setting-label">{section.label}</span>
                      <div className="pomodoro-duration-box">
                        <span className="pomodoro-duration-value">{formatTime(section.value)}</span>
                        <div className="pomodoro-duration-controls">
                          {durationControls.map((control) => (
                            <button
                              key={`${section.key}-${control.label}`}
                              type="button"
                              onClick={() => adjustDuration(section.value, section.setValue, control.delta, section.key)}
                              className="pomodoro-duration-button"
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
          </div>
        </motion.section>
      </main>

      <footer className="tool-footer">
        {t.footer as string}
      </footer>
    </div>
  );
}
