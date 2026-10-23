package com.viper.business;

import static org.junit.Assert.*;
import static com.viper.business.NativeTestSupport.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class BillingProductsTest {
    @Test public void productPickerIsVisibleAndRepeatedLinesDeductStock() throws Exception {
        reset(true);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(a->a.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
            ready(scenario);
            assertEquals("false",js(scenario,"return document.body.innerText.includes(\"POS Counter\") || !![...document.querySelectorAll(\".nav-item\")].find(e=>e.innerText.includes(\"Point of Sale\"));"));
            js(scenario,"document.querySelector('button[title^=\"Add Sale\"]').click();return true;");
            waitFor(scenario,"document.querySelector('.invoice-items-table select')");
            assertEquals("Invoice products must not collapse inside the scrolling form", "true", js(scenario,"const e=document.querySelector('.invoice-items-table select');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();const body=document.querySelector('.modal-body').getBoundingClientRect();const card=e.closest('.card').getBoundingClientRect();return r.height>=40&&card.height>=r.height&&r.top>=card.top&&r.bottom<=card.bottom&&r.bottom>body.top&&r.top<body.bottom;"));
            capture("bill-product-picker");
            change(scenario,"[aria-label='Quantity 1']","2");
            click(scenario,"Add Product");
            waitFor(scenario,"document.querySelectorAll('.invoice-items-table tbody tr').length===2");
            String itemId=state().getJSONArray("items").getJSONObject(0).getString("id");
            change(scenario,"[aria-label='Product 2']",itemId);
            click(scenario,"Save Invoice");waitFor(scenario,"!document.querySelector('.modal-card')");
            JSONObject saved=state();
            assertEquals(2,saved.getJSONArray("items").getJSONObject(0).getDouble("currentStock"),0.001);
            assertEquals(300,saved.getJSONArray("transactions").getJSONObject(0).getDouble("total"),0.001);
            assertEquals(2,saved.getJSONArray("transactions").getJSONObject(0).getJSONArray("items").length());
            js(scenario,"location.reload();return true;");ready(scenario);
            assertEquals(1,state().getJSONArray("transactions").length());
        }
    }
    @Test public void twoNewProductsCanBeCreatedAndSelectedForBilling() throws Exception {
        reset(true);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario);navigate(scenario,"Items / Stock");
            for(int n=1;n<=2;n++) {
                click(scenario,"+ Add New Item");waitFor(scenario,"document.querySelector('.modal-card')");
                js(scenario,"input('Item / Product Name','New QA product "+n+"');input('Selling Price',"+(n*25)+");input('Opening / Current Stock Quantity',5);input('GST Tax Rate',0);return true;");
                click(scenario,"Save Item");waitFor(scenario,"!document.querySelector('.modal-card')");
                assertEquals(n+1,state().getJSONArray("items").length());
            }
            JSONObject data=state();
            assertNotEquals(data.getJSONArray("items").getJSONObject(1).getString("code"),data.getJSONArray("items").getJSONObject(2).getString("code"));
            js(scenario,"document.querySelector('button[title^=\"Add Sale\"]').click();return true;");
            waitFor(scenario,"document.querySelector('.invoice-items-table select')");
            change(scenario,"[aria-label='Product 1']",data.getJSONArray("items").getJSONObject(1).getString("id"));
            click(scenario,"Add Product");
            change(scenario,"[aria-label='Product 2']",data.getJSONArray("items").getJSONObject(2).getString("id"));
            click(scenario,"Save Invoice");waitFor(scenario,"!document.querySelector('.modal-card')");
            JSONObject saved=state();assertEquals(75,saved.getJSONArray("transactions").getJSONObject(0).getDouble("total"),0.001);
            assertEquals(4,saved.getJSONArray("items").getJSONObject(1).getDouble("currentStock"),0.001);
            assertEquals(4,saved.getJSONArray("items").getJSONObject(2).getDouble("currentStock"),0.001);
        }
    }
    @Test public void newProductCanBeCreatedWithoutLosingTheOpenBill() throws Exception {
        reset(true);
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            ready(scenario);
            js(scenario,"document.querySelector('button[title^=\"Add Sale\"]').click();return true;");
            waitFor(scenario,"document.querySelector('.invoice-items-table select')");
            change(scenario,"[aria-label='Quantity 1']","2");
            click(scenario,"New Product");waitFor(scenario,"document.querySelectorAll('.modal-card').length===2");
            js(scenario,"input('Item / Product Name','Created inside bill');input('Selling Price',30);input('Opening / Current Stock Quantity',5);input('GST Tax Rate',0);return true;");
            click(scenario,"Save Item");waitFor(scenario,"document.querySelectorAll('.modal-card').length===1");
            assertEquals("2",new org.json.JSONArray("["+js(scenario,"return document.querySelector('[aria-label=\"Quantity 1\"]').value;")+"]").getString(0));
            String added=state().getJSONArray("items").getJSONObject(1).getString("id");
            change(scenario,"[aria-label='Product 1']",added);
            click(scenario,"Save Invoice");waitFor(scenario,"!document.querySelector('.modal-card')");
            assertEquals(60,state().getJSONArray("transactions").getJSONObject(0).getDouble("total"),0.001);
            assertEquals(3,state().getJSONArray("items").getJSONObject(1).getDouble("currentStock"),0.001);
        }
    }
    private void change(ActivityScenario<MainActivity> scenario,String selector,String value) throws Exception {
        js(scenario,"const e=document.querySelector("+JSONObject.quote(selector)+");if(!e)throw Error('Missing billing field');const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,"+JSONObject.quote(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;");
    }
}
