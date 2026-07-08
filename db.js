/**
 * db.js - Supabase Online-Only Database Layer for WMS
 * Single Supabase client shared across the app (exposed as window._sb).
 * No localStorage fallback — requires an active internet connection.
 * Realtime subscriptions invalidate the products cache automatically.
 */

const DEFAULT_CATEGORIES = ['Electronics', 'Display', 'Office Supply', 'Furniture', 'Networking'];
const DEFAULT_LOCATIONS  = ['Rack A1', 'Rack A2', 'Rack B1', 'Rack B2', 'Rack B3', 'Rack C1', 'Rack C2', 'Rack C3'];

// ── Single Supabase client ────────────────────────────────────────────────────
const SUPABASE_URL = "https://fjpvrxucmxlfojwmbdfu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcHZyeHVjbXhsZm9qd21iZGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NTM0OTAsImV4cCI6MjA5NzQyOTQ5MH0.Fh6qJI1U1RhKc2ZHsxDABd7SdReYo9TnDTyGpeghfYk";

if (!window.supabase) {
  console.error('[WMS] Supabase SDK not loaded. Make sure the CDN script tag is present.');
}

// Shared client — reused by auth.js and login.html via window._sb
const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
window._sb = supabase; // expose for auth.js / login.html

// ── Caches ───────────────────────────────────────────────────────────────────
let settingsCache = null;

// productsCache is invalidated automatically by Realtime on any product change
// (see subscribeRealtimeInvalidation at the bottom of this file)

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetches ALL rows from a Supabase table in 1000-row batches.
 * Supabase enforces a hard cap of 1000 rows per request by default.
 */
async function fetchAllRows(queryFn) {
  const BATCH = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryFn(from, from + BATCH - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return allRows;
}

/** Generate a collision-safe transaction ID using crypto.randomUUID */
function generateTxId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'TX-' + crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
  }
  // Fallback (very unlikely to be needed in any modern browser)
  return 'TX-' + Math.random().toString(36).substring(2, 14).toUpperCase();
}

/**
 * Parse a product's location field.
 * Supports both JSON map {"Rack A1":50} and plain text "Rack A1".
 */
function parseLocations(locationStr, stockOnHand = 0) {
  if (!locationStr) return {};
  const trimmed = String(locationStr).trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const cleaned = {};
      for (const [loc, qty] of Object.entries(parsed)) {
        const q = parseInt(qty) || 0;
        if (q > 0 && loc && loc !== '0' && loc !== 'N/A' && loc !== 'Pending') {
          cleaned[loc] = q;
        }
      }
      return cleaned;
    } catch (_) { /* fall through */ }
  }
  const cleaned = {};
  if (trimmed && trimmed !== '0' && trimmed !== 'Pending' && trimmed !== 'N/A') {
    cleaned[trimmed] = parseInt(stockOnHand) || 0;
  }
  return cleaned;
}
window.parseLocations = parseLocations;

function normalizeLocationField(locationVal, stockVal) {
  if (!locationVal) return JSON.stringify({});
  const trimmed = String(locationVal).trim();
  if (!trimmed || trimmed === '0' || trimmed === 'N/A' || trimmed === 'Pending') {
    return JSON.stringify({});
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const cleaned = {};
      for (const [loc, qty] of Object.entries(parsed)) {
        const q = parseInt(qty) || 0;
        if (q > 0 && loc && loc !== '0' && loc !== 'N/A' && loc !== 'Pending') {
          cleaned[loc] = q;
        }
      }
      return JSON.stringify(cleaned);
    } catch (_) { /* fall through */ }
  }
  const obj = {};
  obj[trimmed] = parseInt(stockVal) || 0;
  return JSON.stringify(obj);
}

function enrichProductData(product, lowLimit) {
  const stock    = parseInt(product.stock_on_hand  ?? product.quantity    ?? 0) || 0;
  const reserved = parseInt(product.reserved_stock ?? 0) || 0;
  const reorder  = parseInt(product.reorder_level  ?? product.min_qty ?? lowLimit) || lowLimit;

  const available = stock - reserved;
  let status = 'In Stock';
  if (available <= 0)       status = 'Out of Stock';
  else if (available <= reorder) status = 'Low Stock';

  return {
    sku:            product.sku,
    name:           product.name,
    category:       product.category,
    location:       product.location,
    stock_on_hand:  stock,
    reserved_stock: reserved,
    available_stock: available,
    reorder_level:  reorder,
    price:          parseFloat(product.price) || 0,
    status,
    barcode:        product.barcode || product.sku,
    expiry_date:    product.expiry_date || null,
    updated_at:     product.updated_at || new Date().toISOString()
  };
}

// ── Connectivity guard ────────────────────────────────────────────────────────
function requireOnline() {
  if (!supabase) {
    throw new Error('Database unavailable. Please check your internet connection and reload the page.');
  }
}

// ── WMSDatabase ───────────────────────────────────────────────────────────────
class WMSDatabase {

  static async init() {
    requireOnline();
    // Verify connection with a fast probe
    const { error } = await supabase.from('settings').select('key').limit(1);
    if (error) {
      throw new Error('Could not connect to the database. Please check your internet connection.');
    }
    // Run schema migrations on init
    await this._runMigrations();
    // Start Realtime product cache invalidation
    this._subscribeRealtimeInvalidation();
  }

  /**
   * Initialize database schema migrations
   * Ensures expiry_date column and related schema exist
   */
  static async _runMigrations() {
    requireOnline();
    try {
      const schemaStatus = await this.getSchemaStatus();
      
      if (!schemaStatus.products_has_expiry_date) {
        console.warn('[WMS] expiry_date column missing from products table - schema may need manual migration');
      }
      
      if (!schemaStatus.expiry_alerts_exists) {
        console.warn('[WMS] expiry_alerts table does not exist - run migration script wave0_database_setup.sql');
      }

      if (!schemaStatus.price_history_exists) {
        console.warn('[WMS] price_history table does not exist - run migration script wave0_database_setup.sql');
      }

      if (!schemaStatus.sessions_exists) {
        console.warn('[WMS] sessions table does not exist - run migration script wave0_database_setup.sql');
      }

      return true;
    } catch (error) {
      console.error('[WMS] Migration check error:', error);
      return false;
    }
  }

  /**
   * Get current database schema status
   * Returns object with boolean flags indicating which tables/columns exist
   */
  static async getSchemaStatus() {
    requireOnline();
    const status = {
      products_has_expiry_date: false,
      expiry_alerts_exists: false,
      price_history_exists: false,
      sessions_exists: false,
      user_actions_exists: false,
      activity_log_exists: false
    };

    try {
      // Check products table for expiry_date column
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .limit(1);
      
      if (products && products[0]) {
        status.products_has_expiry_date = 'expiry_date' in products[0];
      }
    } catch (err) {
      console.debug('[WMS] Could not check products table:', err.message);
    }

    // Check expiry_alerts table
    try {
      await supabase.from('expiry_alerts').select('*').limit(1);
      status.expiry_alerts_exists = true;
    } catch (err) {
      console.debug('[WMS] expiry_alerts table check:', err.message);
    }

    // Check price_history table
    try {
      await supabase.from('price_history').select('*').limit(1);
      status.price_history_exists = true;
    } catch (err) {
      console.debug('[WMS] price_history table check:', err.message);
    }

    // Check sessions table
    try {
      await supabase.from('sessions').select('*').limit(1);
      status.sessions_exists = true;
    } catch (err) {
      console.debug('[WMS] sessions table check:', err.message);
    }

    // Check user_actions table
    try {
      await supabase.from('user_actions').select('*').limit(1);
      status.user_actions_exists = true;
    } catch (err) {
      console.debug('[WMS] user_actions table check:', err.message);
    }

    // Check activity_log table (fallback for sessions logging)
    try {
      await supabase.from('activity_log').select('*').limit(1);
      status.activity_log_exists = true;
    } catch (err) {
      console.debug('[WMS] activity_log table check:', err.message);
    }

    return status;
  }

  // ── Products ────────────────────────────────────────────────────────────────

  static async getProducts() {
    requireOnline();
    const settings = await this.getSettings();
    const lowLimit = settings.lowStockThreshold || 15;
    try {
      const data = await fetchAllRows((from, to) =>
        supabase.from('products').select('*').order('sku').range(from, to)
      );
      return data.map(p => enrichProductData(p, lowLimit));
    } catch (err) {
      console.error('[WMS] getProducts error:', err);
      if (window.showToast) window.showToast('Failed to load inventory. Check your connection.', 'error');
      return [];
    }
  }

  static async getProduct(sku) {
    if (!sku) return null;
    requireOnline();
    const cleanSku = sku.toUpperCase().trim();
    const settings = await this.getSettings();
    const lowLimit = settings.lowStockThreshold || 15;

    const { data, error } = await supabase
      .from('products').select('*').eq('sku', cleanSku).maybeSingle();
    if (error) { console.error('[WMS] getProduct error:', error); return null; }
    return data ? enrichProductData(data, lowLimit) : null;
  }

  static async saveProduct(productData) {
    requireOnline();
    const cleanSku = productData.sku.toUpperCase().trim();
    const stock    = parseInt(productData.stock_on_hand ?? productData.quantity ?? 0) || 0;

    const record = {
      sku:            cleanSku,
      name:           productData.name.trim(),
      category:       productData.category || 'Uncategorized',
      location:       normalizeLocationField(productData.location, stock),
      stock_on_hand:  stock,
      reserved_stock: parseInt(productData.reserved_stock) || 0,
      reorder_level:  parseInt(productData.reorder_level ?? productData.minQty) || 15,
      price:          parseFloat(productData.price) || 0,
      barcode:        cleanSku,
      expiry_date:    productData.expiry_date || null,
      updated_at:     new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('products').upsert(record).select().single();
    if (error) { console.error('[WMS] saveProduct error:', error); throw error; }

    const settings = await this.getSettings();
    return enrichProductData(data, settings.lowStockThreshold || 15);
  }

  static async deleteProduct(sku) {
    requireOnline();
    const { error } = await supabase
      .from('products').delete().eq('sku', sku.toUpperCase().trim());
    if (error) { console.error('[WMS] deleteProduct error:', error); throw error; }
  }

  // ── Transactions ────────────────────────────────────────────────────────────

  static async getTransactions() {
    requireOnline();
    const { data, error } = await supabase
      .from('transactions').select('*')
      .order('timestamp', { ascending: false }).limit(200);
    if (error) { console.error('[WMS] getTransactions error:', error); return []; }
    return data.map(tx => ({
      id:          tx.id,
      timestamp:   tx.timestamp,
      type:        tx.type,
      sku:         tx.sku,
      productName: tx.product_name || tx.productName,
      category:    tx.category || '',
      quantity:    tx.quantity,
      price:       tx.price || 0,
      docRef:      tx.doc_ref || tx.docRef,
      location:    tx.location || 'N/A',
      operator:    tx.operator,
      notes:       tx.notes
    }));
  }

  static async logTransaction({ type, sku, productName, category, quantity, price, docRef, location, notes }) {
    requireOnline();
    // Always prefer the live Supabase auth profile for operator tagging — this guarantees
    // every transaction is attributed to the actual logged-in user, not a stale localStorage value.
    const authProfile = (typeof window !== 'undefined' && window.WMSAuth && window.WMSAuth.profile)
      ? window.WMSAuth.profile
      : null;
    const currentUser = authProfile
      ? { name: authProfile.full_name || authProfile.email || 'Unknown' }
      : this.getCurrentUser();
    const cleanSku    = sku.toUpperCase().trim();
    const parsedQty   = parseInt(quantity) || 0;
    const parsedPrice = parseFloat(price) || 0;

    // ── Pre-validate stock before writing ──────────────────────────────────
    const { data: preCheck } = await supabase
      .from('products').select('stock_on_hand, location').eq('sku', cleanSku).maybeSingle();

    if (preCheck) {
      const preLocObj = parseLocations(preCheck.location, parseInt(preCheck.stock_on_hand) || 0);
      if (type === 'Stock In') {
        if (!preLocObj[location] && Object.keys(preLocObj).length >= 5) {
          throw new Error(`SKU ${cleanSku} is already stored in 5 locations. Stock in at an existing location or consolidate first.`);
        }
      } else if (type === 'Stock Out') {
        const avail = preLocObj[location] || 0;
        if (avail < parsedQty) {
          throw new Error(`Insufficient stock at ${location}. Available: ${avail} units.`);
        }
      }
    }

    // ── Insert transaction ─────────────────────────────────────────────────
    const txRecord = {
      id:           generateTxId(),
      timestamp:    new Date().toISOString(),
      type,
      sku:          cleanSku,
      product_name: productName,
      category:     category || '',
      quantity:     parsedQty,
      price:        parsedPrice,
      doc_ref:      docRef ? docRef.trim() : 'N/A',
      location:     location || 'N/A',
      operator:     currentUser ? currentUser.name : 'System',
      notes:        notes ? notes.trim() : ''
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('transactions').insert(txRecord).select().single();
    if (insertErr) { console.error('[WMS] logTransaction insert error:', insertErr); throw insertErr; }

    // ── Update product stock ───────────────────────────────────────────────
    const { data: currentProduct } = await supabase
      .from('products').select('stock_on_hand, location').eq('sku', cleanSku).maybeSingle();

    if (currentProduct) {
      const currentStock = parseInt(currentProduct.stock_on_hand) || 0;
      const locObj = parseLocations(currentProduct.location, currentStock);

      if (type === 'Stock In') {
        locObj[location] = (locObj[location] || 0) + parsedQty;
      } else if (type === 'Stock Out') {
        locObj[location] = (locObj[location] || 0) - parsedQty;
        if (locObj[location] <= 0) delete locObj[location];
      }

      const newStock = Object.values(locObj).reduce((a, b) => a + b, 0);
      await supabase.from('products').update({
        stock_on_hand: newStock,
        location:      JSON.stringify(locObj),
        updated_at:    txRecord.timestamp
      }).eq('sku', cleanSku);
    }

    return {
      id:          inserted.id,
      timestamp:   inserted.timestamp,
      type:        inserted.type,
      sku:         inserted.sku,
      productName: inserted.product_name,
      category:    inserted.category || category || '',
      quantity:    inserted.quantity,
      price:       inserted.price ?? parsedPrice,
      docRef:      inserted.doc_ref,
      location:    inserted.location || 'N/A',
      operator:    inserted.operator,
      notes:       inserted.notes
    };
  }

  // ── Users ────────────────────────────────────────────────────────────────────

  static async getUsers() {
    requireOnline();
    const { data, error } = await supabase.from('users').select('*').order('username');
    if (error) { console.error('[WMS] getUsers error:', error); return []; }
    return data;
  }

  static async saveUser(userData) {
    requireOnline();
    const cleanUsername = userData.username.trim().toLowerCase();
    const record = {
      username: cleanUsername,
      name:     userData.name.trim(),
      email:    userData.email.trim(),
      role:     userData.role || 'Operator'
    };
    const { data, error } = await supabase.from('users').upsert(record).select().single();
    if (error) { console.error('[WMS] saveUser error:', error); throw error; }
    return data;
  }

  static async deleteUser(username) {
    requireOnline();
    const cleanUsername = username.trim().toLowerCase();
    const { error } = await supabase.from('users').delete().eq('username', cleanUsername);
    if (error) { console.error('[WMS] deleteUser error:', error); throw error; }

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.username.toLowerCase() === cleanUsername) {
      const users = await this.getUsers();
      const fallback = users.find(u => u.role === 'Administrator') || users[0] ||
        { username: 'admin', name: 'Administrator', role: 'Administrator' };
      this.setCurrentUser(fallback);
    }
  }

  // Active session is cached in localStorage (lightweight — no sensitive data)
  static getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('wms_current_user')) ||
        { username: 'admin', name: 'Administrator', role: 'Administrator' };
    } catch (_) {
      return { username: 'admin', name: 'Administrator', role: 'Administrator' };
    }
  }

  static setCurrentUser(user) {
    localStorage.setItem('wms_current_user', JSON.stringify(user));
  }

  // ── Login logs ────────────────────────────────────────────────────────────────

  static async getLoginLogs() {
    requireOnline();
    const { data, error } = await supabase
      .from('login_log').select('*')
      .order('timestamp', { ascending: false }).limit(100);
    if (error) { console.error('[WMS] getLoginLogs error:', error); return []; }
    return data || [];
  }

  // ── Realtime subscriptions ────────────────────────────────────────────────────

  /**
   * Invalidate the in-memory products cache whenever a product row changes
   * on Supabase, so any tab/user sees fresh data on next render.
   */
  static _subscribeRealtimeInvalidation() {
    if (!supabase) return;
    supabase.channel('wms-product-invalidation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        // Null out the app-level cache so the next getCachedProducts() re-fetches
        if (typeof productsCache !== 'undefined') productsCache = null;
        // Notify app.js to do the same
        window.dispatchEvent(new CustomEvent('wms:products-changed'));
      })
      .subscribe();

    // Also invalidate settingsCache when settings change from any tab/device
    supabase.channel('wms-settings-invalidation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        settingsCache = null;
      })
      .subscribe();

    // Wave 1-3: Expiry alerts subscription
    supabase.channel('wms-expiry-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expiry_alerts' }, () => {
        window.dispatchEvent(new CustomEvent('wms:expiry-changed'));
      })
      .subscribe();

    // Wave 2: Price history subscription
    supabase.channel('wms-price-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'price_history' }, () => {
        window.dispatchEvent(new CustomEvent('wms:price-changed'));
      })
      .subscribe();

    // Wave 3: Sessions subscription
    supabase.channel('wms-session-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        window.dispatchEvent(new CustomEvent('wms:sessions-changed'));
      })
      .subscribe();
  }

  static subscribeToRealtimeLogs(onTxChange, onLoginChange) {
    if (!supabase) return null;
    const txChannel = supabase.channel('realtime-transactions-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
        onTxChange(payload.new);
      }).subscribe();

    const loginChannel = supabase.channel('realtime-logins-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'login_log' }, payload => {
        onLoginChange(payload.new);
      }).subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(txChannel);
        supabase.removeChannel(loginChannel);
      }
    };
  }

  // ── Settings ──────────────────────────────────────────────────────────────────

  static async getSettings() {
    if (settingsCache !== null) return settingsCache;
    requireOnline();
    const { data, error } = await supabase
      .from('settings').select('value').eq('key', 'general').maybeSingle();
    if (error) console.error('[WMS] getSettings error:', error);
    if (data && data.value) {
      settingsCache = data.value;
      return settingsCache;
    }
    // First-run default
    settingsCache = {
      warehouseName:     'Ace Remnants Butuan HQ',
      lowStockThreshold: 15,
      categories:        DEFAULT_CATEGORIES,
      locations:         DEFAULT_LOCATIONS,
      theme:             'dark'
    };
    return settingsCache;
  }

  static async saveSettings(newSettings) {
    requireOnline();
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings };
    const { error } = await supabase.from('settings').upsert({ key: 'general', value: updated });
    if (error) { console.error('[WMS] saveSettings error:', error); throw error; }
    settingsCache = updated;
    return updated;
  }

  // ── Database reset ─────────────────────────────────────────────────────────────

  static async resetDatabase() {
    requireOnline();
    settingsCache = null;

    const defaultSettings = {
      warehouseName:     'Ace Remnants Butuan HQ',
      lowStockThreshold: 15,
      categories:        DEFAULT_CATEGORIES,
      locations:         DEFAULT_LOCATIONS,
      theme:             'dark'
    };

    try {
      // Wipe tables — neq trick avoids the "must include filter" restriction
      await supabase.from('transactions').delete().neq('id', '__none__');
      await supabase.from('products').delete().neq('sku', '__none__');
      await supabase.from('settings').delete().eq('key', 'general');
      await supabase.from('settings').insert({ key: 'general', value: defaultSettings });

      this.setCurrentUser({ username: 'admin', name: 'Administrator', role: 'Administrator' });
      settingsCache = defaultSettings;
      return true;
    } catch (e) {
      console.error('[WMS] resetDatabase error:', e);
      return false;
    }
  }

  // ── Batch product save (used by Excel/CSV import) ─────────────────────────────

  static async saveProductsBatch(productsArray) {
    requireOnline();
    const settings = await this.getSettings();
    const lowLimit  = settings.lowStockThreshold || 15;

    const records = productsArray.map(p => {
      const cleanSku = String(p.sku).toUpperCase().trim();
      const stock    = parseInt(p.stock_on_hand ?? p.quantity ?? 0) || 0;
      return {
        sku:            cleanSku,
        name:           String(p.name).trim(),
        category:       p.category || 'Uncategorized',
        location:       normalizeLocationField(p.location, stock),
        stock_on_hand:  stock,
        reserved_stock: parseInt(p.reserved_stock ?? 0) || 0,
        reorder_level:  parseInt(p.reorder_level ?? p.min_qty ?? p.minQty ?? lowLimit) || lowLimit,
        price:          parseFloat(p.price) || 0,
        barcode:        cleanSku,
        expiry_date:    p.expiry_date || null,
        updated_at:     new Date().toISOString()
      };
    });

    // Upsert in chunks of 500 to stay within Supabase limits
    const CHUNK = 500;
    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const { error } = await supabase.from('products').upsert(chunk);
      if (error) { console.error('[WMS] saveProductsBatch error:', error); throw error; }
    }
  }

  // ── Export / Import ────────────────────────────────────────────────────────────

  static async exportData() {
    requireOnline();
    const [products, transactions, settings] = await Promise.all([
      this.getProducts(),
      this.getTransactions(),
      this.getSettings()
    ]);
    return JSON.stringify({ products, transactions, settings, exportedAt: new Date().toISOString() }, null, 2);
  }

  static async importData(jsonData) {
    requireOnline();
    settingsCache = null;
    try {
      const data = JSON.parse(jsonData);
      if (!data.products || !data.transactions || !data.settings) return false;

      // Wipe & re-seed
      await supabase.from('transactions').delete().neq('id', '__none__');
      await supabase.from('products').delete().neq('sku', '__none__');
      await supabase.from('settings').delete().eq('key', 'general');
      await supabase.from('settings').insert({ key: 'general', value: data.settings });

      if (data.products.length > 0) {
        const rows = data.products.map(p => ({
          sku:            p.sku,
          name:           p.name,
          category:       p.category,
          location:       normalizeLocationField(p.location, p.stock_on_hand ?? p.quantity ?? 0),
          stock_on_hand:  parseInt(p.stock_on_hand ?? p.quantity ?? 0) || 0,
          reserved_stock: parseInt(p.reserved_stock ?? 0) || 0,
          reorder_level:  parseInt(p.reorder_level ?? p.min_qty ?? p.minQty ?? 15) || 15,
          price:          parseFloat(p.price) || 0,
          barcode:        p.barcode || p.sku,
          expiry_date:    p.expiry_date || null,
          updated_at:     p.updated_at || new Date().toISOString()
        }));
        await supabase.from('products').insert(rows);
      }

      if (data.transactions.length > 0) {
        const txs = data.transactions.map(t => ({
          id:           t.id,
          timestamp:    t.timestamp,
          type:         t.type,
          sku:          t.sku,
          product_name: t.product_name || t.productName,
          category:     t.category || '',
          quantity:     t.quantity,
          price:        t.price || 0,
          doc_ref:      t.doc_ref || t.docRef,
          location:     t.location || 'N/A',
          operator:     t.operator,
          notes:        t.notes
        }));
        await supabase.from('transactions').insert(txs);
      }

      return true;
    } catch (e) {
      console.error('[WMS] importData error:', e);
      return false;
    }
  }

  // ── WAVE 1-3: EXPIRY TRACKING METHODS ─────────────────────────────

  static async getNearExpiryProducts(thresholdDays = 30) {
    requireOnline();
    const products = await this.getProducts();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return products.filter(p => {
      if (!p.expiry_date) return false;
      const expDate = new Date(p.expiry_date);
      expDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.floor((expDate - now) / (1000 * 60 * 60 * 24));
      return daysLeft >= -1 && daysLeft <= thresholdDays;
    }).sort((a, b) => {
      const daysA = Math.floor((new Date(a.expiry_date) - now) / (1000 * 60 * 60 * 24));
      const daysB = Math.floor((new Date(b.expiry_date) - now) / (1000 * 60 * 60 * 24));
      return daysA - daysB;
    });
  }

  static async logExpiryAlert(sku, expiryDate, alertType) {
    requireOnline();
    try {
      const product = await this.getProduct(sku);
      if (!product) return;
      
      try {
        await supabase.from('expiry_alerts').insert({
          sku,
          product_name: product.name,
          expiry_date: expiryDate,
          alert_type: alertType,
          status: 'active',
          created_at: new Date().toISOString()
        });
      } catch (tableError) {
        console.log('[WMS] Expiry alert (table unavailable):', { sku, expiryDate, alertType });
      }
    } catch (error) {
      console.error('[WMS] logExpiryAlert error:', error);
    }
  }

  // ── WAVE 2: PRICE TRACKING METHODS ────────────────────────────────

  /**
   * Calculate the revaluation impact of a price change for a SKU
   * Calls: public.calculate_revaluation_impact(sku, newPrice) → { impactAmount, itemsAffected, percentageChange }
   * 
   * @param {string} sku - Product SKU
   * @param {number} newPrice - New unit price to apply
   * @returns {Object|null} - { impactAmount, itemsAffected, percentageChange } or null if SKU not found
   */
  static async calculateRevaluationImpact(sku, newPrice) {
    requireOnline();
    try {
      const cleanSku = sku.toUpperCase().trim();
      const { data, error } = await supabase
        .rpc('calculate_revaluation_impact', {
          p_sku: cleanSku,
          p_new_price: parseFloat(newPrice) || 0
        });
      
      if (error) {
        console.error('[WMS] calculateRevaluationImpact error:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('[WMS] calculateRevaluationImpact error:', err);
      return null;
    }
  }

  /**
   * Atomically update a product price and log to price_history
   * Calls: public.update_price_with_history(sku, newPrice, changedBy, reason)
   * 
   * REQUIREMENTS: 6.1, 6.2, 6.3, 6.4
   * - Validates product exists before update
   * - Calculates revaluation impact
   * - Updates products.price
   * - Inserts into price_history audit table
   * - Uses transaction semantics for atomicity
   * 
   * @param {string} sku - Product SKU
   * @param {number} newPrice - New unit price to apply
   * @param {string} changedBy - Username of person making the change
   * @param {string} reason - Optional reason for the price change
   * @returns {Object} - { success, old_price, new_price, impact_amount, items_affected, percentage_change, history_id, timestamp, error? }
   */
  static async updatePriceWithHistory(sku, newPrice, changedBy = 'System', reason = 'Price adjustment') {
    requireOnline();
    try {
      const cleanSku = sku.toUpperCase().trim();
      const { data, error } = await supabase
        .rpc('update_price_with_history', {
          p_sku: cleanSku,
          p_new_price: parseFloat(newPrice) || 0,
          p_changed_by: String(changedBy).trim(),
          p_change_reason: String(reason).trim()
        });
      
      if (error) {
        console.error('[WMS] updatePriceWithHistory error:', error);
        return {
          success: false,
          error: error.message || 'Failed to update price'
        };
      }
      
      return data || { success: false, error: 'No data returned' };
    } catch (err) {
      console.error('[WMS] updatePriceWithHistory error:', err);
      return {
        success: false,
        error: err.message || 'Unexpected error during price update'
      };
    }
  }

  static async logPriceChange(sku, oldPrice, newPrice, reason, changedBy) {
    requireOnline();
    try {
      const product = await this.getProduct(sku);
      if (!product) return;
      
      const impact = (newPrice - oldPrice) * product.stock_on_hand;
      
      try {
        await supabase.from('price_history').insert({
          sku,
          previous_price: oldPrice,
          new_price: newPrice,
          changed_by: changedBy,
          revaluation_impact: impact,
          items_affected: product.stock_on_hand,
          reason: reason,
          status: 'completed',
          change_date: new Date().toISOString()
        });
      } catch (tableError) {
        console.log('[WMS] Price change (table unavailable):', { sku, oldPrice, newPrice, reason });
      }
    } catch (error) {
      console.error('[WMS] logPriceChange error:', error);
    }
  }

  static async getPriceHistory(sku, fromDate = null, toDate = null) {
    requireOnline();
    try {
      let query = supabase
        .from('price_history')
        .select('*')
        .eq('sku', sku.toUpperCase().trim())
        .order('change_date', { ascending: false });
      
      if (fromDate) {
        query = query.gte('change_date', new Date(fromDate).toISOString());
      }
      if (toDate) {
        // Add 1 day to include the entire toDate day
        const endOfDay = new Date(toDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        query = query.lt('change_date', endOfDay.toISOString());
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('[WMS] getPriceHistory error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[WMS] getPriceHistory error:', err);
      return [];
    }
  }

  static async getPriceHistoryByDateRange(fromDate, toDate, sku = null) {
    requireOnline();
    try {
      let query = supabase
        .from('price_history')
        .select('*')
        .gte('change_date', new Date(fromDate).toISOString());
      
      const endOfDay = new Date(toDate);
      endOfDay.setDate(endOfDay.getDate() + 1);
      query = query.lt('change_date', endOfDay.toISOString());
      
      if (sku) {
        query = query.eq('sku', sku.toUpperCase().trim());
      }
      
      const { data, error } = await query.order('change_date', { ascending: false });
      if (error) {
        console.error('[WMS] getPriceHistoryByDateRange error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[WMS] getPriceHistoryByDateRange error:', err);
      return [];
    }
  }

  // ── WAVE 3: SESSION MANAGEMENT METHODS ────────────────────────────

  static async createSession(userId, username, ipAddress = null) {
    requireOnline();
    try {
      // Try to call the SQL RPC function first (preferred method)
      // The function signature is: initializeSession(user_id, ip_address) → session_id
      try {
        const { data, error } = await supabase.rpc('initializeSession', {
          p_user_id: userId,
          p_ip_address: ipAddress || '127.0.0.1'
        });
        
        if (!error && data) {
          console.log('[WMS] Session created via RPC:', data);
          return data;
        }
      } catch (rpcError) {
        console.log('[WMS] RPC initializeSession unavailable, falling back to direct insert:', rpcError.message);
      }

      // Fallback: direct table insert if RPC not available
      const sessionId = 'SES-' + Math.random().toString(36).substring(2, 14).toUpperCase();
      try {
        await supabase.from('sessions').insert({
          id: sessionId,
          user_id: userId,
          username: username,
          ip_address: ipAddress || '127.0.0.1',
          status: 'active',
          login_time: new Date().toISOString(),
          last_activity: new Date().toISOString()
        });
      } catch (tableError) {
        console.log('[WMS] Sessions table unavailable, using client-side session ID');
      }
      return sessionId;
    } catch (error) {
      console.error('[WMS] createSession error:', error);
      return 'SES-' + Math.random().toString(36).substring(2, 14).toUpperCase();
    }
  }

  static async endSession(sessionId) {
    requireOnline();
    try {
      await supabase.from('sessions')
        .update({ status: 'offline', ended_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (error) {
      console.error('[WMS] endSession error:', error);
    }
  }

  static async updateSessionActivity(sessionId, lastAction) {
    requireOnline();
    try {
      await supabase.from('sessions')
        .update({ last_activity: new Date().toISOString(), last_action: lastAction })
        .eq('id', sessionId);
    } catch (error) {
      console.error('[WMS] updateSessionActivity error:', error);
    }
  }

  static async getActiveSessions() {
    requireOnline();
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'online')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[WMS] getActiveSessions error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[WMS] getActiveSessions error:', err);
      return [];
    }
  }

  static async logUserAction(userId, username, actionType, actionDetails, sessionId) {
    requireOnline();
    try {
      try {
        await supabase.from('activity_log').insert({
          user_id: userId,
          username: username,
          action_type: actionType,
          action_details: actionDetails,
          session_id: sessionId,
          created_at: new Date().toISOString()
        });
      } catch (tableError) {
        console.log('[WMS] Activity log (table unavailable):', { username, actionType });
      }
    } catch (error) {
      console.error('[WMS] logUserAction error:', error);
    }
  }
}
