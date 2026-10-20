package com.viper.business;

import static org.junit.Assert.*;
import static com.viper.business.NativeTestSupport.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import android.view.KeyEvent;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class OfflineAcceptanceTest {
    @Test public void freshInstallIsEmptyAndNeedsNoServer() throws Exception {
        reset(false);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            ready(scenario);waitFor(scenario,"document.body.innerText.includes('Business Profile')");
            assertEquals("false",js(scenario,"return document.body.innerText.includes('Connect Viper');"));
            assertEquals(0,state().getJSONArray("transactions").length());assertEquals(0,state().getJSONArray("items").length());
            js(scenario,"input('Registered Business Legal Name','Offline Shop');input('Official Phone Number','1234567890');input('Registered Address','QA test address');return true;");
            click(scenario,"Save Profile");waitFor(scenario,"window.__qaAlerts.some(t=>t.includes('successfully'))");
            assertEquals("Offline Shop",state().getJSONObject("profile").getString("name"));capture("fresh-offline-business");
        }
    }
    @Test public void invoicesPaymentsReturnsAndReloadStayOffline() throws Exception {
        reset(true);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            ready(scenario);
            // Any accidental network API usage fails the test immediately.
            js(scenario,"window.fetch=()=>{throw Error('Network forbidden in offline acceptance');};document.querySelector('button[title^=\"Add Sale\"]').click();return true;");
            waitFor(scenario,"document.querySelector('[role=dialog]')");click(scenario,"Save Invoice");
            waitFor(scenario,"!document.querySelector('.modal-card')");
            assertEquals("true",js(scenario,"return document.body.innerText.includes(\"PKR\");"));
            JSONObject first=state();assertEquals(1,first.getJSONArray("transactions").length());assertEquals(4,first.getJSONArray("items").getJSONObject(0).getDouble("currentStock"),0.001);
            String saleId=first.getJSONArray("transactions").getJSONObject(0).getString("id");
            navigate(scenario,"Sales & Invoices");click(scenario,"+ Receive Payment");waitFor(scenario,"document.querySelector('[aria-label=\"Receive Payment\"]')");
            js(scenario,"input('Amount',100);input('Apply payment to',"+JSONObject.quote(saleId)+");return true;");click(scenario,"Save Payment");waitFor(scenario,"!document.querySelector('.modal-card')");
            JSONObject paid=state();assertEquals(0,paid.getJSONArray("parties").getJSONObject(0).getDouble("currentBalance"),0.001);
            click(scenario,"+ Sales Return");waitFor(scenario,"document.querySelector('[aria-label=\"Sale Return / Credit Note\"]')");
            js(scenario,"input('Original invoice',"+JSONObject.quote(saleId)+");return true;");
            js(scenario,"input('Amount Refunded',100);return true;");
            waitFor(scenario,"document.querySelector('#invoice-paid-amount').value==='100'");
            click(scenario,"Save Invoice");waitFor(scenario,"!document.querySelector('.modal-card')");
            JSONObject returned=state();assertEquals(5,returned.getJSONArray("items").getJSONObject(0).getDouble("currentStock"),0.001);assertEquals(0,returned.getJSONArray("accounts").getJSONObject(0).getDouble("balance"),0.001);
            navigate(scenario,"Reports & GST");waitFor(scenario,"document.body.innerText.includes('Net Business Profit')");capture("offline-reports");
            js(scenario,"location.reload();return true;");ready(scenario);assertEquals(3,state().getJSONArray("transactions").length());
            assertEquals("false",js(scenario,"return !!document.querySelector('[role=alert]');"));capture("offline-reopened");
        }
    }
    @Test public void nativePrintAndExportOpenSystemUIs() throws Exception {
        reset(true);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            ready(scenario);navigate(scenario,"Reports & GST");click(scenario,"Export CSV");
            waitForSystemUi("intentresolver");capture("android-share-sheet");InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            click(scenario,"Print Report");waitForSystemUi("printspooler");capture("android-print-dialog");InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
        }
    }
    private void waitForSystemUi(String expected) throws Exception {
        String last="";
        for(int n=0;n<200;n++){
            android.view.accessibility.AccessibilityNodeInfo root=InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow();
            if(root!=null&&root.getPackageName()!=null){last=root.getPackageName().toString();if(last.contains(expected))return;}
            Thread.sleep(100);
        }
        fail("Expected Android "+expected+" UI; active package: "+last);
    }
}
