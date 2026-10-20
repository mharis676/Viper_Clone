package com.viper.business;

import android.content.Context;
import android.print.PrintManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ViperPrint")
public class ViperPrintPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                manager.print("Viper document", getBridge().getWebView().createPrintDocumentAdapter("Viper document"), null);
                call.resolve(new JSObject());
            } catch (Exception e) {
                call.reject("Could not open Android printing", e);
            }
        });
    }
}
