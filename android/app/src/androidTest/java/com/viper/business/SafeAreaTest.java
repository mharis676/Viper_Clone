package com.viper.business;

import static org.junit.Assert.*;
import android.graphics.Rect;
import android.view.View;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Runs in CI on API 35/36 with a cutout and gesture/three-button navigation. */
@RunWith(AndroidJUnit4.class)
public class SafeAreaTest {
    @Test
    public void invoiceControlsStayInsideSystemBarsInPortraitAndLandscape() throws Exception {
        NativeTestSupport.reset(true);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            NativeTestSupport.ready(scenario);
            NativeTestSupport.js(scenario,"document.querySelector('button[title^=\"Add Sale\"]').click();return true;");
            NativeTestSupport.waitFor(scenario,"document.querySelector('[role=dialog]')");
            verify(scenario, false);
            NativeTestSupport.capture("invoice-portrait-safe-area");
            scenario.onActivity(a -> a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            verify(scenario, true);
            NativeTestSupport.capture("invoice-landscape-safe-area");
        }
    }
    private void verify(ActivityScenario<MainActivity> scenario, boolean landscape) throws Exception {
        JSONObject measured = null;
        for (int attempt = 0; attempt < 60; attempt++) {
            CountDownLatch latch = new CountDownLatch(1);
            AtomicReference<String> result = new AtomicReference<>();
            scenario.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(
                "JSON.stringify((()=>{const b=document.querySelector('.modal-footer button:last-child');if(!b)return null;b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect();const h=document.querySelector('.modal-header').getBoundingClientRect();return {top:h.top,bottom:r.bottom,left:r.left,right:r.right,w:innerWidth,h:innerHeight,ratio:devicePixelRatio,overflow:document.documentElement.scrollWidth>innerWidth};})())",
                value -> { result.set(value); latch.countDown(); }));
            assertTrue("WebView evaluation timed out", latch.await(5, TimeUnit.SECONDS));
            String raw = result.get();
            if (raw != null && !raw.equals("null") && !raw.equals("\"null\"")) {
                JSONObject sample = new JSONObject(new org.json.JSONArray("[" + raw + "]").getString(0));
                if ((sample.getDouble("w") > sample.getDouble("h")) == landscape) { measured = sample; break; }
            }
            Thread.sleep(250);
        }
        assertNotNull("Invoice UI did not load", measured);
        final JSONObject m = measured;
        scenario.onActivity(a -> {
            try {
                WebView web = a.getBridge().getWebView();
                WindowInsetsCompat window = ViewCompat.getRootWindowInsets(web);
                assertNotNull(window);
                Insets bars = window.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                int[] origin = new int[2]; web.getLocationOnScreen(origin);
                View decor = a.getWindow().getDecorView(); Rect bounds = new Rect(); decor.getGlobalVisibleRect(bounds);
                double ratio = m.getDouble("ratio");
                assertFalse("Page must not overflow horizontally", m.getBoolean("overflow"));
                assertTrue("Control overlaps status bar/cutout", origin[1] + m.getDouble("top") * ratio >= bars.top - 2);
                assertTrue("Control overlaps bottom navigation", origin[1] + m.getDouble("bottom") * ratio <= bounds.bottom - bars.bottom + 2);
                assertTrue("Control overlaps left cutout", origin[0] + m.getDouble("left") * ratio >= bars.left - 2);
                assertTrue("Control overlaps right cutout", origin[0] + m.getDouble("right") * ratio <= bounds.right - bars.right + 2);
            } catch (org.json.JSONException e) { throw new AssertionError(e); }
        });
    }
}
