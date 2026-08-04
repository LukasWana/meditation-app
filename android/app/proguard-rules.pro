# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# === Capacitor / WebView ===
# Keep the WebView JavaScript interface and bridge
-keepclassmembers class * {
    @androidx.annotation.JavascriptInterface <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Keep WebView client classes
-keepclassmembers class * extends android.webkit.WebViewClient {
    public *;
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public *;
}

# === Firebase ===
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# === React / Vite ===
# Keep JS bundle from being optimized away
-keep class assets.** { *; }

# Keep model classes used in JSON serialization
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}