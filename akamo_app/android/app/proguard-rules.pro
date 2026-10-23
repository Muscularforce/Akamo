# ═══════════════════════════════════════════════════════════════
# Akamo Android ProGuard / R8 Rules for Audio Engine & Supabase
# ═══════════════════════════════════════════════════════════════

# Audio Service Plugin
-keep class com.ryanheise.audioservice.** { *; }
-dontwarn com.ryanheise.audioservice.**

# Just Audio Plugin
-keep class com.ryanheise.just_audio.** { *; }
-dontwarn com.ryanheise.just_audio.**

# AndroidX Media & Media3
-keep class androidx.media.** { *; }
-keep class androidx.media3.** { *; }
-keep class androidx.media.session.** { *; }
-dontwarn androidx.media.**
-dontwarn androidx.media3.**

# Google ExoPlayer
-keep class com.google.android.exoplayer2.** { *; }
-keep class androidx.media3.exoplayer.** { *; }
-dontwarn com.google.android.exoplayer2.**
-dontwarn androidx.media3.exoplayer.**

# Supabase and Serialization
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepclassmembers enum * { *; }
