# SimplePomodoroTimer

## 中文说明

SimplePomodoroTimer 是一个简洁的番茄钟网页应用，支持自定义专注时长、休息时长和总轮次，并提供倒计时音效提示，适合日常专注、学习和轻量任务管理。

项目部署网站：<https://timer.rsec.top>

### 功能特性

- 支持开始、暂停和重置计时
- 支持自定义专注时长、休息时长与轮次
- 自动在专注和休息模式之间切换
- 倒计时最后 10 秒提供提示音
- 支持静音切换
- 提供简洁的设置面板和进度环形显示

### 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- `lucide-react`
- `motion`

### 本地运行

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3000
```

### 构建生产版本

```bash
npm run build
npm run preview
```

### 目录结构

```text
src/
  App.tsx              计时器主界面与状态逻辑
  main.tsx             应用入口
  index.css            页面样式
```

### 适用场景

- 学习与复习计时
- 日常专注工作
- 轻量番茄工作法实践

---

## English

SimplePomodoroTimer is a minimal web Pomodoro app with configurable focus duration, break duration, and total rounds. It includes countdown audio cues and is suitable for studying, focused work, and lightweight task routines.

Project deployment website: <https://timer.rsec.top>

### Features

- Start, pause, and reset the timer
- Configure focus duration, break duration, and round count
- Automatically switch between focus and break modes
- Play audio cues during the last 10 seconds
- Toggle sound on or off
- Includes a compact settings panel and circular progress display

### Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- `lucide-react`
- `motion`

### Run Locally

```bash
npm install
npm run dev
```

Default dev URL:

```text
http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run preview
```

### Project Structure

```text
src/
  App.tsx              Timer UI and state logic
  main.tsx             App entry
  index.css            Styles
```

### Use Cases

- Study and revision sessions
- Focused work blocks
- Lightweight Pomodoro workflows
