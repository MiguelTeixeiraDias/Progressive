<<<<<<< HEAD
# Progressive
=======
# Progressive 🏋️

A polished, dark-mode-first **gym tracking app** built with React Native + Expo. Log
workouts in seconds, track progressive overload, and stay motivated with streaks,
personal-best badges and friendly encouragement.

> Mobile-first, TypeScript throughout, local-only (no backend). Your data persists on
> device via AsyncStorage.

---

## ✨ Features

- **Home dashboard** — motivational greeting, one-tap *Start Workout* / *Repeat Last*,
  KPI grid (workouts, volume, streak, overload score, most-improved, muscle groups),
  weekly goal + daily-volume chart, muscle-focus breakdown and a recent-workout card.
- **Fast workout logging** — large tap targets, ±steppers for reps & weight, auto-filled
  values from your last performance, one-tap set completion with success states, inline
  notes, live timer, and encouraging toasts (*“New PB!”*, *“Beating last time 💪”*).
- **Exercise library** — search, muscle-group filter chips, last-performed stats, custom
  exercises via a floating add button, and a per-exercise detail screen with records and
  a progress chart.
- **Progress analytics** — total volume over time, weekly consistency, estimated 1RM,
  personal records, muscle-group frequency, a progressive-overload score and
  plain-English insights.
- **Workout history** — sessions grouped by day, full set/rep/weight/volume breakdown,
  and *Repeat Workout* from any past session.
- **Motivation** — streaks, PR badges, weekly goal progress and a celebration screen
  when you finish.
- **Premium UI** — rounded cards, bold KPI typography, gradient accents, pill badges,
  progress bars and friendly empty states on a deep-charcoal theme.

## 🧰 Tech stack

| Concern        | Choice |
| -------------- | ------ |
| Framework      | Expo (SDK 54) + React Native |
| Language       | TypeScript (strict) |
| Navigation     | React Navigation (bottom tabs + native-stack modals) |
| State          | Zustand |
| Persistence    | AsyncStorage (via Zustand `persist`) |
| Charts         | Custom React Native views (no native chart dependency) |
| Icons          | `@expo/vector-icons` (Ionicons) |
| Fonts          | Bebas Neue + Space Grotesk (`@expo-google-fonts`, `expo-font`) |

---

## 🚀 Getting started

### Prerequisites
- **Node.js 18+**
- The **Expo Go** app on your iOS/Android device, or an Android emulator / iOS simulator.

### Install
```bash
npm install
```

### Run
```bash
npm start          # start the Metro dev server, then scan the QR code with Expo Go
# or target a platform directly:
npm run android    # Android emulator / device
npm run ios        # iOS simulator (macOS only)
```

On first launch the app seeds a realistic 2-week Push/Pull/Legs history so every screen
looks alive immediately. All new workouts you log are saved locally and persist between
launches.

> The app is designed mobile-first for iOS/Android via Expo Go. Running in a browser
> would require adding `react-native-web` + `react-dom`.

---

## 📁 Project structure

```
Progressive/
├─ App.tsx                  # Root: providers, navigation theme, hydration splash
├─ index.ts                 # Entry point (registers the root component)
├─ src/
│  ├─ components/           # Reusable UI: KPICard, SetRow, ProgressBar, StatChart,
│  │                        #   ExerciseCard, WorkoutSummaryCard, PrimaryButton,
│  │                        #   MuscleGroupBadge, PersonalBestBadge, EmptyState, …
│  ├─ screens/              # Home, Workout, Exercises, Progress, History + modals
│  │                        #   (ExercisePicker, AddExercise, ExerciseDetail,
│  │                        #    WorkoutDetail, WorkoutComplete)
│  ├─ navigation/           # Tab navigator, root stack, typed param lists
│  ├─ store/                # Zustand store + AsyncStorage persistence
│  ├─ types/                # Exercise, MuscleGroup, WorkoutSession, SetEntry,
│  │                        #   PersonalRecord, UserStats, …
│  ├─ data/                 # Default exercise library + seed workout generator
│  ├─ utils/                # Stats engine (volume, 1RM, streaks, overload), date,
│  │                        #   formatting, color helpers
│  └─ theme/                # Colors, spacing, radius, typography, shadows, gradients
```

## 🎨 Design language

Editorial training-journal aesthetic — a strict three-color system, sharp 4px
controls / 8px cards, hairline bone borders and oversized condensed metrics.
Acid-lime is reserved for actions, completed sets and progress emphasis.

**Type** — Bebas Neue for display/metrics, Space Grotesk for body/labels.

```
Background      #0B0F14      Acid-lime accent  #D6FF3F  (actions/progress)
Card            #121821      Bone text         #E8E2D6
Secondary card  #1A222D      Text dim          rgba(232,226,214,0.62)
Surface 3       #2A3441      Hairline border   rgba(232,226,214,0.12)
```

## 🧠 Notes & design decisions

- **One source of truth.** All workout/exercise data lives in the Zustand store; screens
  derive KPIs, charts and insights through pure functions in `src/utils/stats.ts`.
- **Encouraging by default.** Completing a set checks your history for a new PB or a
  beat-your-last-time moment and surfaces a quick toast.
- **Previous values are reused.** Adding an exercise pre-fills sets from the last time you
  trained it; adding a set copies the previous one — minimal typing.
- **Reset the seed data.** The store exposes `factoryReset()` if you want to wipe to a
  fresh seeded state (handy during development).
```ts
import { useStore } from './src/store/useStore';
useStore.getState().factoryReset();
```
>>>>>>> 0a35762 (The app lol)
