package com.viper.business;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** App-private, transactional offline storage. No network or storage permissions. */
@CapacitorPlugin(name = "ViperStorage")
public class ViperStoragePlugin extends Plugin {
    private SQLiteDatabase database;
    private synchronized SQLiteDatabase open() {
        if (database == null || !database.isOpen()) {
            database = getContext().openOrCreateDatabase("viper-business.sqlite", 0, null);
            if (database.getVersion() > 1) throw new IllegalStateException("Database was created by a newer Viper version. Update the app; data has not been changed.");
            database.enableWriteAheadLogging();
            database.execSQL("PRAGMA synchronous=FULL");
            database.execSQL("CREATE TABLE IF NOT EXISTS business_state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, payload TEXT NOT NULL)");
            database.execSQL("CREATE TABLE IF NOT EXISTS recovery_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, payload TEXT NOT NULL)");
            database.setVersion(1);
        }
        return database;
    }
    @Override
    protected synchronized void handleOnDestroy() { if (database != null && database.isOpen()) database.close(); }
    @PluginMethod
    public synchronized void load(PluginCall call) {
        try (Cursor cursor = open().rawQuery("SELECT revision,payload FROM business_state WHERE id=1", null)) {
            JSObject result = new JSObject();
            result.put("revision", cursor.moveToFirst() ? cursor.getLong(0) : 0);
            if (cursor.getCount() > 0) result.put("data", cursor.getString(1));
            call.resolve(result);
        } catch (Exception error) { call.reject("Cannot read the on-device database. Your data was not reset.", error); }
    }
    @PluginMethod
    public synchronized void save(PluginCall call) {
        String payload = call.getString("data");
        Integer expected = call.getInt("expectedRevision");
        if (payload == null || expected == null) { call.reject("Invalid database commit"); return; }
        SQLiteDatabase db = null;
        try {
            // Parse before starting a transaction, never store incomplete JSON.
            new org.json.JSONObject(payload);
            db = open(); db.beginTransaction();
            long current = 0; String previous = null;
            try (Cursor cursor = db.rawQuery("SELECT revision,payload FROM business_state WHERE id=1", null)) {
                if (cursor.moveToFirst()) { current = cursor.getLong(0); previous = cursor.getString(1); }
            }
            if (current != expected) throw new IllegalStateException("Database changed in another session. Reopen Viper and retry.");
            if (previous != null) {
                ContentValues recovery = new ContentValues(); recovery.put("payload", previous);
                db.insertOrThrow("recovery_snapshots", null, recovery);
                db.execSQL("DELETE FROM recovery_snapshots WHERE id NOT IN (SELECT id FROM recovery_snapshots ORDER BY id DESC LIMIT 5)");
            }
            ContentValues state = new ContentValues(); state.put("id", 1); state.put("revision", current + 1); state.put("payload", payload);
            if (db.insertWithOnConflict("business_state", null, state, SQLiteDatabase.CONFLICT_REPLACE) == -1) throw new IllegalStateException("SQLite rejected the database write");
            db.setTransactionSuccessful();
            JSObject result = new JSObject(); result.put("revision", current + 1);
            db.endTransaction(); db = null; call.resolve(result);
        } catch (Exception error) { call.reject("Database save failed; this operation was not committed. " + error.getMessage(), error); }
        finally { if (db != null && db.inTransaction()) db.endTransaction(); }
    }
}
