import * as SQLite from 'expo-sqlite';
import {
  Category,
  StoreItem,
  Location,
  Batch,
  BatchDisplay,
  getDaysUntilExpiry,
} from './types';
import medications from '../data/medications.json';
import consumables from '../data/consumables.json';

let db: SQLite.SQLiteDatabase;

// Категории: id 1 = Медикаменты, id 2 = Расходка
const CAT_MED = 1;
const CAT_CONS = 2;

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

  if (catCount === 0) {
    // Первый запуск — создаём всё с нуля
    db.runSync('INSERT INTO categories (name) VALUES (?)', 'Медикаменты');
    db.runSync('INSERT INTO categories (name) VALUES (?)', 'Расходка');
    seedCategory(CAT_MED, medications);
    seedCategory(CAT_CONS, consumables);
  } else {
    // Проверяем и обновляем каждую категорию по отдельности
    syncCategory(CAT_MED, medications, 'Медикаменты');
    syncCategory(CAT_CONS, consumables, 'Расходка');
  }

  // Локации (только при первом запуске)
  const locCount = (db.getAllSync('SELECT COUNT(*) as c FROM locations') as any[])[0].c;
  if (locCount === 0) {
    db.runSync('INSERT INTO locations (name) VALUES (?)', 'Склад');
    db.runSync('INSERT INTO locations (name) VALUES (?)', 'Укладка');
    db.runSync('INSERT INTO locations (name) VALUES (?)', 'Операционная');
  }
}

/** Вставить все предметы категории (первичная загрузка) */
function seedCategory(categoryId: number, items: string[]): void {
  for (const name of items) {
    db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', name, categoryId);
  }
}

/** Синхронизировать категорию с JSON: если количество не совпадает — перезаписать */
function syncCategory(categoryId: number, jsonItems: string[], label: string): void {
  const dbCount = (db.getAllSync(
    'SELECT COUNT(*) as c FROM store_items WHERE categoryId = ?', categoryId
  ) as any[])[0].c;

  if (dbCount === jsonItems.length) return; // уже в актуальном состоянии

  // Удаляем старые записи этой категории (включая связанные партии)
  const oldIds = (db.getAllSync(
    'SELECT id FROM store_items WHERE categoryId = ?', categoryId
  ) as any[]).map((r: any) => r.id);
  for (const id of oldIds) {
    db.runSync('DELETE FROM batches WHERE itemId = ?', id);
  }
  db.runSync('DELETE FROM store_items WHERE categoryId = ?', categoryId);

  // Вставляем актуальные из JSON
  for (const name of jsonItems) {
    db.runSync('INSERT INTO store_items (name, categoryId) VALUES (?, ?)', name, categoryId);
  }
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

export function addBatchFull(
  itemId: number,
  locationId: number,
  expiryDate: string,
  quantity: number,
  receivedDate: string,
): number {
  const result = db.runSync(
    'INSERT INTO batches (itemId, locationId, expiryDate, quantity, receivedDate) VALUES (?, ?, ?, ?, ?)',
    [itemId, locationId, expiryDate, quantity, receivedDate]
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