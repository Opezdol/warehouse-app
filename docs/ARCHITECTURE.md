# Склад Учёт — Architecture

## Stack
- **Framework:** React Native (Expo SDK 54)
- **Navigation:** Expo Router 6 (file-based routing)
- **UI:** React Native Paper (Material Design 3)
- **Database:** expo-sqlite (local, WAL mode)
- **Platforms:** iOS + Android

## Directory Structure

```
warehouse-app/
├── app/                         # Expo Router — file-based navigation
│   ├── _layout.tsx              # Root layout: PaperProvider + DB init
│   ├── (tabs)/                  # Tab navigation
│   │   ├── _layout.tsx          # Bottom tab bar (3 tabs)
│   │   ├── index.tsx            # Tab 1: Мониторинг (dashboard)
│   │   ├── receiving.tsx        # Tab 2: Приёмка (receive stock)
│   │   └── search.tsx           # Tab 3: Поиск (search/filter)
│   └── _components.tsx          # (internal components if needed)
├── src/
│   ├── types.ts                 # ✅ DONE — TypeScript interfaces + helpers
│   ├── database.ts              # ✅ DONE — SQLite schema + CRUD + seed
│   └── components/              # Reusable UI components
│       ├── BatchCard.tsx        # Card displaying one batch row
│       ├── ExpiryBadge.tsx      # Color-coded expiry status badge
│       └── PickerField.tsx      # Labeled dropdown picker
├── assets/                      # Icons, splash screen
├── app.json                     # ✅ DONE — Expo config
├── index.ts                     # Entry point (expo-router/entry)
├── package.json                 # ✅ DONE
└── tsconfig.json                # ✅ DONE
```

## Data Model

```
categories: id, name
store_items: id, name, categoryId → categories
locations:  id, name
batches:    id, itemId, locationId, expiryDate, quantity, receivedDate
```

## Color Coding (Expiry Status)

| Status     | Days Left     | Color   | Label              |
|------------|---------------|---------|--------------------|
| expired    | < 0           | #D32F2F | Просрочено         |
| critical   | 0–30          | #F57C00 | Критично (< 30 дн) |
| warning    | 31–180        | #FBC02D | Внимание (1–6 мес) |
| ok         | > 180         | #388E3C | Норма (> 6 мес)    |

## Screens

### 1. Мониторинг (Dashboard) — app/(tabs)/index.tsx
- Stats cards: всего, просрочено, скоро истекает
- FlatList всех партий, сортировка по expiryDate ASC
- Каждая карточка: товар, категория, локация, срок годности, цветовой индикатор
- Pull-to-refresh, auto-refresh on tab focus

### 2. Приёмка (Receiving) — app/(tabs)/receiving.tsx
- Step 1: Локация (Modal picker, default Склад)
- Step 2: Категория (Modal picker)
- Step 3: Товар (Modal picker с **поиском/фильтром** по названию, фильтр по категории)
- Step 4: Партии — динамический список строк:
  - Срок годности (гибкий ввод: `6.7.26` / `06.07.2026` / `06-07-2026` → `2026-07-06`)
  - Количество (numeric input, default **1**)
  - Кнопка "+ Добавить партию" — добавляет строку
- Кнопка "Сохранить" → addBatchTransaction() → возврат на мониторинг

### 3. Поиск (Search) — app/(tabs)/search.tsx
- TextInput поиск по названию товара
- Фильтры: категория, локация, статус годности
- Результаты: отфильтрованный FlatList
- Возможность удалить партию (swipe-to-delete / долгое нажатие)

## Entry Point
- `index.ts` → imports `expo-router/entry` (no custom App.tsx needed)
- `app/_layout.tsx` → inits DB, wraps with PaperProvider
- `app/(tabs)/_layout.tsx` → Bottom Tab Navigator (3 tabs)

## Data Flow
1. App starts → initDatabase() in _layout.tsx → schema + seed
2. Each screen queries DB directly via database.ts functions
3. On Receiving save → addBatchTransaction() → navigate to monitoring tab
4. Monitoring screen refreshes on focus via `useFocusEffect`
