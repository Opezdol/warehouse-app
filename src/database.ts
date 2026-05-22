import * as SQLite from 'expo-sqlite';
import {
  Category,
  StoreItem,
  Location,
  Batch,
  BatchDisplay,
  getDaysUntilExpiry,
} from './types';

let db: SQLite.SQLiteDatabase;

export function initDatabase(): void {
  db = SQLite.openDatabaseSync('warehouse.db');

  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS store_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      categoryId INTEGER NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      itemId INTEGER NOT NULL,
      locationId INTEGER NOT NULL,
      expiryDate TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      receivedDate TEXT NOT NULL DEFAULT (date('now')),
      FOREIGN KEY (itemId) REFERENCES store_items(id),
      FOREIGN KEY (locationId) REFERENCES locations(id)
    );
  `);

  seedDefaults();
}

function seedDefaults(): void {
  const catCount = (db.getAllSync('SELECT COUNT(*) as c FROM categories') as any[])[0].c;
  if (catCount > 0) return;

  // Categories
  db.runSync('INSERT INTO categories (name) VALUES (?)', 'Медикаменты');
  db.runSync('INSERT INTO categories (name) VALUES (?)', 'Расходка');

  // Items — Медикаменты
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Пропофол 1% 20мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Пропофол 2% 50мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Дротаверин 2% 2мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Адреналин 0.1% 1мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Атропин 0.1% 1мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Кетамин 5% 2мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Фентанил 0.005% 2мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Севафлуран 250мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Лидовокаин 2% 2мл', 1);
  db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', 'Рокуроний 10мг/мл 5мл', 1);

  // Items — Расходка
  const расходкаItems = [
    'Шапочка-Шарлотта',
    'Маска хирургическая',
    'Маска анестезиологическая',
    'Маска кислородная',
    'Игла инъекционная 18G',
    'Система инфузионная',
    'Соединитель гибкий угловой (коннектор)',
    'Мочеприёмник',
    'Иглы (канюли) для проводниковой анестезии',
    'Набор для эпидуральной анестезии',
    'Набор для постановки ЦВК',
    'Бинт марлевый',
    'Контур дыхательный',
    'Насос инфузионный «Изипамп»',
    'Дыхательный мешок 3.0L',
    'Фильтр дыхательный',
    'Экспресс тест для определения беременности',
    'Халат хирургический',
    'Халат операционный',
    'Фильтр-канюля аспирационная «Полиспайк»',
    'Заглушка инфузионная (In-Stopper)',
    'Тройник',
    'Трубка трахеостомическая',
    'Стилет для эндотрахеальной трубки',
    'Салфетка марлевая',
    'CO2 фильтр к инсуффляторам',
    'Рукоять ларингоскопа KAWE',
    'Резервуар коллекторный',
    'Простыня хирургическая (пелёнка)',
    'Проводник для проведения эндотрахеальных трубок (Буж)',
    'Набор для обработки крови (CellSaver)',
    'Магистраль аутотрансфузионная',
    'Магистраль инфузионная для перфузора (линия удлинительная инфузионная)',
    'Лейкопластырь рулонный',
    'Лейкопластырь д. фикс. кат.',
    'Коннектор инфузионный трехходовой',
    'Клинок для ларингоскопа 3',
    'Клинок для ларингоскопа 4',
    'Клинок для ларингоскопа 5',
    'Канюля назальная',
    'Жгут на верхнюю/нижнюю конечность',
    'Ёмкость для сбора колюще-режущих отходов (контейнер)',
    'Гель для УЗИ',
    'Воздуховод',
    'Аптечка АНТИ ВИЧ',
    'Абсорбент CO2',
    'Шприц 150 мл Жане/Жанэ',
    'Шприц 50 мл',
    'Шприц 20 мл',
    'Шприц 10 мл',
    'Шприц 5 мл',
    'Шприц 2 мл',
    'Перчатки смотровые S',
    'Перчатки смотровые M',
    'Перчатки смотровые L',
    'Перчатки стерильные 6',
    'Перчатки стерильные 6.5',
    'Перчатки стерильные 7',
    'Перчатки стерильные 7.5',
    'Перчатки стерильные 8',
    'Перчатки стерильные 8.5',
    'Перчатки стерильные 9',
    'Перчатки стерильные 9.5',
    'Катетер желудочный 16G',
    'Катетер желудочный 18G',
    'Катетер желудочный 20G',
    'Катетер желудочный 22G',
    'Трубка эндотрахеальная 6 мм',
    'Трубка эндотрахеальная 6.5 мм',
    'Трубка эндотрахеальная 7.0 мм',
    'Трубка эндотрахеальная 7.5 мм',
    'Трубка эндотрахеальная 8.0 мм',
    'Трубка эндотрахеальная 8.5 мм',
    'Трубка эндотрахеальная 9.0 мм',
    'Трубка эндотрахеальная 9.5 мм',
    'Трубка эндотрахеальная 10.0 мм',
    'Внутривенная канюля 14G',
    'Внутривенная канюля 16G',
    'Внутривенная канюля 18G',
    'Внутривенная канюля 20G',
    'Внутривенная канюля 22G',
    'Внутривенная канюля 24G',
    'Внутривенная канюля 26G',
    'Игла спиномозговая 25G',
    'Игла спиномозговая 27G',
    'Катетер Фолея двухходовой FR 14',
    'Катетер Фолея двухходовой FR 16',
    'Катетер Фолея двухходовой FR 18',
    'Катетер Фолея двухходовой FR 20',
    'Катетер Фолея двухходовой FR 22',
    'Пакет полиэтиленовый для сбора отходов класса «А» 30 литров',
    'Пакет полиэтиленовый для сбора отходов класса «Б» 30 литров',
    'Пакет полиэтиленовый для сбора отходов класса «В» 30 литров',
    'Пакет полиэтиленовый для сбора отходов класса «Г» 30 литров',
    'Пакет полиэтиленовый для сбора отходов класса «А» 60 литров',
    'Пакет полиэтиленовый для сбора отходов класса «Б» 60 литров',
    'Пакет полиэтиленовый для сбора отходов класса «В» 60 литров',
    'Пакет полиэтиленовый для сбора отходов класса «Г» 60 литров',
  ];
  for (const item of расходкаItems) {
    db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', item, 2);
  }

  // Locations
  db.runSync('INSERT INTO locations (name) VALUES (?)', 'Склад');
  db.runSync('INSERT INTO locations (name) VALUES (?)', 'Укладка');
  db.runSync('INSERT INTO locations (name) VALUES (?)', 'Операционная');
}

// === CRUD === //

export function getCategories(): Category[] {
  return db.getAllSync('SELECT * FROM categories ORDER BY name') as Category[];
}

export function getItemsByCategory(categoryId: number): StoreItem[] {
  return db.getAllSync(
    'SELECT * FROM store_items WHERE categoryId = ? ORDER BY name',
    categoryId
  ) as StoreItem[];
}

export function getAllItems(): StoreItem[] {
  return db.getAllSync('SELECT * FROM store_items ORDER BY name') as StoreItem[];
}

export function getLocations(): Location[] {
  return db.getAllSync('SELECT * FROM locations ORDER BY name') as Location[];
}

export function addBatch(
  itemId: number,
  locationId: number,
  expiryDate: string,
  quantity: number,
): number {
  const result = db.runSync(
    'INSERT INTO batches (itemId, locationId, expiryDate, quantity) VALUES (?, ?, ?, ?)',
    [itemId, locationId, expiryDate, quantity]
  );
  return result.lastInsertRowId as number;
}

export function addBatchTransaction(batches: {
  itemId: number;
  locationId: number;
  expiryDate: string;
  quantity: number;
}[]): void {
  db.execSync('BEGIN TRANSACTION');
  try {
    for (const b of batches) {
      db.runSync(
        'INSERT INTO batches (itemId, locationId, expiryDate, quantity) VALUES (?, ?, ?, ?)',
        [b.itemId, b.locationId, b.expiryDate, b.quantity]
      );
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }
}

export function getAllBatches(): BatchDisplay[] {
  const rows = db.getAllSync(`
    SELECT
      b.id,
      b.itemId,
      b.locationId,
      b.expiryDate,
      b.quantity,
      b.receivedDate,
      si.name AS itemName,
      c.name AS categoryName,
      l.name AS locationName
    FROM batches b
    JOIN store_items si ON b.itemId = si.id
    JOIN categories c ON si.categoryId = c.id
    JOIN locations l ON b.locationId = l.id
    ORDER BY b.expiryDate ASC
  `) as any[];

  return rows.map((r) => ({
    ...r,
    daysUntilExpiry: getDaysUntilExpiry(r.expiryDate),
  }));
}

export function getExpiringBatches(daysThreshold: number): BatchDisplay[] {
  const all = getAllBatches();
  return all.filter((b) => b.daysUntilExpiry <= daysThreshold && b.daysUntilExpiry >= 0);
}

export function getExpiredBatches(): BatchDisplay[] {
  const all = getAllBatches();
  return all.filter((b) => b.daysUntilExpiry < 0);
}

export function deleteBatch(id: number): void {
  db.runSync('DELETE FROM batches WHERE id = ?', id);
}

export function getBatchStats(): {
  total: number;
  expired: number;
  expiringSoon: number;
} {
  const all = getAllBatches();
  return {
    total: all.length,
    expired: all.filter((b) => b.daysUntilExpiry < 0).length,
    expiringSoon: all.filter((b) => b.daysUntilExpiry >= 0 && b.daysUntilExpiry <= 30).length,
  };
}