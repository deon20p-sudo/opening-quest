package com.openingquest.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Opening Quest runs as a web app inside this WebView. App files are served from the
 * APK's assets under a secure https origin, so the chess engine (WebAssembly in a
 * worker) and local storage work exactly as in a browser.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/index.html";
    private WebView web;
    private FrameLayout root;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#21201d"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) return null; // Chess.com import goes to the network as normal
                return asset(u.getPath());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });
        // Keep the app clear of the status bar, camera cut-out and gesture bar
        // (Android 15 draws apps edge-to-edge, which put the header under the clock).
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#21201d"));
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l = 0, t = 0, r = 0, b = 0;
            if (Build.VERSION.SDK_INT >= 35) { // only Android 15+ forces edge-to-edge drawing
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                l = i.left; t = i.top; r = i.right; b = i.bottom;
            }
            v.setPadding(l, t, r, b);
            return insets;
        });
        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        setContentView(root);
        registerBack();
        if (state != null) web.restoreState(state);
        if (web.getUrl() == null) web.loadUrl(START);
    }

    /** Lets the web app switch the system bars between light and dark mode. */
    private class Bridge {
        @JavascriptInterface
        public void setTheme(final boolean light, final String bg) {
            runOnUiThread(() -> {
                int c;
                try { c = Color.parseColor(bg); } catch (Exception e) { c = light ? Color.parseColor("#f3f0ea") : Color.parseColor("#21201d"); }
                root.setBackgroundColor(c);
                web.setBackgroundColor(c);
                getWindow().setStatusBarColor(c);
                getWindow().setNavigationBarColor(c);
                if (Build.VERSION.SDK_INT >= 30 && getWindow().getInsetsController() != null) {
                    int mask = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    getWindow().getInsetsController().setSystemBarsAppearance(light ? mask : 0, mask);
                } else if (Build.VERSION.SDK_INT >= 26) {
                    int f = getWindow().getDecorView().getSystemUiVisibility();
                    int bits = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    getWindow().getDecorView().setSystemUiVisibility(light ? (f | bits) : (f & ~bits));
                }
            });
        }
    }

    private WebResourceResponse asset(String path) {
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        if (path.contains("..")) return notFound();
        try {
            InputStream in = getAssets().open("web" + path);
            String mime = mime(path);
            boolean text = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") || mime.endsWith("svg+xml");
            WebResourceResponse r = new WebResourceResponse(mime, text ? "utf-8" : null, in);
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-cache");
            h.put("Access-Control-Allow-Origin", "*");
            r.setResponseHeaders(h);
            return r;
        } catch (IOException e) {
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    private static String mime(String p) {
        String l = p.toLowerCase();
        if (l.endsWith(".html")) return "text/html";
        if (l.endsWith(".js") || l.endsWith(".mjs")) return "text/javascript";
        if (l.endsWith(".css")) return "text/css";
        if (l.endsWith(".json")) return "application/json";
        if (l.endsWith(".wasm")) return "application/wasm";
        if (l.endsWith(".svg")) return "image/svg+xml";
        if (l.endsWith(".png")) return "image/png";
        if (l.endsWith(".txt")) return "text/plain";
        if (l.endsWith(".wav")) return "audio/wav";
        if (l.endsWith(".ogg")) return "audio/ogg";
        return "application/octet-stream";
    }

    /** Android 13+ back handling (required for apps targeting Android 16, where onBackPressed is no longer called). */
    private void registerBack() {
        if (Build.VERSION.SDK_INT < 33) return;
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () ->
            web.evaluateJavascript("(window.appBack && window.appBack()) ? 'yes' : 'no'", v -> {
                if (v == null || !v.contains("yes")) moveTaskToBack(true);
            }));
    }

    @Override
    public void onBackPressed() {
        // Let the app go back a screen first; leave the app only from the home screen.
        web.evaluateJavascript("(window.appBack && window.appBack()) ? 'yes' : 'no'", v -> {
            if (v == null || !v.contains("yes")) MainActivity.super.onBackPressed();
        });
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }
}
