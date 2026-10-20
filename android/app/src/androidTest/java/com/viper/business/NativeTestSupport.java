package com.viper.business;

import static org.junit.Assert.*;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.Bitmap;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

final class NativeTestSupport {
    static final String HELPERS = "const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';const norm=s=>s.replace(/\\s+/g,' ').trim();const button=t=>[...document.querySelectorAll('button')].find(e=>visible(e)&&norm(e.innerText)===t);const input=(text,value)=>{const label=[...document.querySelectorAll('label')].find(l=>norm(l.textContent).startsWith(text));if(!label)throw Error('Missing label '+text);const e=label.control||label.querySelector('input,select,textarea')||label.closest('.form-group')?.querySelector('input,select,textarea');if(!e)throw Error('No input '+text);const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,String(value));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};";
    static Context context() { return InstrumentationRegistry.getInstrumentation().getTargetContext(); }
    static void reset(boolean fixture) throws Exception {
        assertTrue("Delete only isolated emulator app database", context().getPackageName().equals("com.viper.business"));
        context().deleteDatabase("viper-business.sqlite");
        if (fixture) {
            String state;
            try (java.io.InputStream in = InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("offline-fixture.json")) { state = new String(in.readAllBytes(), StandardCharsets.UTF_8); }
            try (SQLiteDatabase db = context().openOrCreateDatabase("viper-business.sqlite",0,null)) {
                db.execSQL("CREATE TABLE business_state(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL)");
                db.execSQL("INSERT INTO business_state VALUES(1,1,?)",new Object[]{state});
            }
        }
    }
    static String js(ActivityScenario<MainActivity> scenario, String body) throws Exception {
        CountDownLatch latch=new CountDownLatch(1); AtomicReference<String> result=new AtomicReference<>();
        String script="(()=>{try{"+HELPERS+body+"}catch(e){return {testError:String(e),body:document.body.innerText}}})()";
        scenario.onActivity(a->a.getBridge().getWebView().evaluateJavascript(script,v->{result.set(v);latch.countDown();}));
        assertTrue("WebView evaluation timeout",latch.await(5,TimeUnit.SECONDS));
        String value=result.get();if(value!=null&&value.contains("testError"))fail(value);return value;
    }
    static void waitFor(ActivityScenario<MainActivity> scenario,String expression) throws Exception {
        String last="";
        for(int n=0;n<100;n++){last=js(scenario,"return !!("+expression+");");if("true".equals(last))return;SystemClock.sleep(100);}
        fail("Condition failed: "+expression+"; "+js(scenario,"return document.body.innerText;"));
    }
    static void ready(ActivityScenario<MainActivity> scenario) throws Exception {
        waitFor(scenario,"document.querySelector('.mobile-menu') && ![...document.querySelectorAll('[role=status]')].some(e=>e.innerText.includes('Loading'))");
        js(scenario,"window.__qaAlerts=[];window.alert=m=>window.__qaAlerts.push(m);window.confirm=()=>true;return true;");
    }
    static void navigate(ActivityScenario<MainActivity> scenario,String name) throws Exception {
        js(scenario,"const menu=document.querySelector('.mobile-menu');if(visible(menu)&&!document.querySelector('.navigation-shell.is-open'))menu.click();return true;");
        waitFor(scenario,"[...document.querySelectorAll('.nav-item')].some(e=>visible(e)&&norm(e.innerText)==="+JSONObject.quote(name)+")");
        js(scenario,"[...document.querySelectorAll('.nav-item')].find(e=>norm(e.innerText)==="+JSONObject.quote(name)+").click();return true;");
    }
    static void click(ActivityScenario<MainActivity> scenario,String name) throws Exception {
        js(scenario,"const b=button("+JSONObject.quote(name)+");if(!b)throw Error('Missing button '+"+JSONObject.quote(name)+");b.scrollIntoView({block:'nearest'});b.click();return true;");
    }
    static JSONObject state() throws Exception {
        try(SQLiteDatabase db=SQLiteDatabase.openDatabase(context().getDatabasePath("viper-business.sqlite").getPath(),null,SQLiteDatabase.OPEN_READONLY);Cursor cursor=db.rawQuery("SELECT payload FROM business_state WHERE id=1",null)){
            assertTrue(cursor.moveToFirst());return new JSONObject(cursor.getString(0));
        }
    }
    static void capture(String name) throws Exception {
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        SystemClock.sleep(500); // Let Android/WebView paint after bounds and activity transitions.
        Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);
        File dir=new File(context().getExternalFilesDir(null),"qa");assertTrue(dir.exists()||dir.mkdirs());
        try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){bitmap.compress(Bitmap.CompressFormat.PNG,100,out);}bitmap.recycle();
    }
}
