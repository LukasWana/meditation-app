package com.lukaswana.meditationapp;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "AudioPlugin")
public class AudioPlugin extends Plugin {

    private static AudioPlugin instance;
    private PluginCall pendingListenerCall = null;

    @Override
    public void load() {
        instance = this;
    }

    static void notifyJS(String event, String data) {
        if (instance != null && instance.pendingListenerCall != null) {
            JSObject ret = new JSObject();
            ret.put("event", event);
            if (data != null) ret.put("data", data);
            instance.pendingListenerCall.resolve(ret);
        }
    }

    @PluginMethod
    public void startForeground(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction("START");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void stopForeground(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction("STOP");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void setMetadata(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction("METADATA");
        if (call.hasOption("title")) intent.putExtra("title", call.getString("title"));
        if (call.hasOption("artist")) intent.putExtra("artist", call.getString("artist"));
        if (call.hasOption("artworkUrl")) intent.putExtra("artworkUrl", call.getString("artworkUrl"));
        if (call.hasOption("duration")) intent.putExtra("duration", (long) call.getDouble("duration", 0.0));
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void setPlaying(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction(call.getBoolean("playing", false) ? "PLAY" : "PAUSE");
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void setPosition(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction("POSITION");
        intent.putExtra("position", (long) call.getDouble("position", 0.0));
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void addListener(PluginCall call) {
        pendingListenerCall = call;
        call.setKeepAlive(true);
        call.resolve();
    }

    @PluginMethod
    public void removeListener(PluginCall call) {
        pendingListenerCall = null;
        call.resolve();
    }
}