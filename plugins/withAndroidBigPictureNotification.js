const { withAndroidManifest, withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE_NAME = 'ChristPavilionNotificationService';

const SERVICE_JAVA_CODE = `package com.spiritoffaith.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

public class ChristPavilionNotificationService extends FirebaseMessagingService {
    private static final String TAG = "ChristPavilionNotif";
    private static final String DEFAULT_CHANNEL_ID = "devotionals";
    private static final String DEFAULT_CHANNEL_NAME = "Daily Devotionals";
    private static final int MAX_REDIRECTS = 5;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        RemoteMessage.Notification notification = remoteMessage.getNotification();

        String title = null;
        String body = null;
        String imageUrl = null;
        String channelId = DEFAULT_CHANNEL_ID;

        Log.d(TAG, "onMessageReceived: data payload=" + (data != null ? data.toString() : "null")
                + ", hasNotification=" + (notification != null));

        if (notification != null) {
            title = notification.getTitle();
            body = notification.getBody();
            if (notification.getImageUrl() != null) {
                imageUrl = notification.getImageUrl().toString();
                Log.d(TAG, "Image from notification block: " + imageUrl);
            }
        }

        if (data != null && !data.isEmpty()) {
            if (data.containsKey("title") && data.get("title") != null) title = data.get("title");
            
            // Expo maps push 'body' to 'message' in FCM data payload
            if (data.containsKey("message") && data.get("message") != null) body = data.get("message");
            else if (data.containsKey("body") && data.get("body") != null && !data.get("body").startsWith("{")) {
                body = data.get("body");
            }
            
            // Search all keys in the intent data for JSON objects and parse them aggressively
            for (String key : data.keySet()) {
                String val = data.get(key);
                if (val != null && val.startsWith("{")) {
                    try {
                        org.json.JSONObject jsonObj = new org.json.JSONObject(val);
                        Log.d(TAG, "Aggressive parse: Found JSON in key '" + key + "' -> keys: " + jsonObj.keys());
                        if ((imageUrl == null || imageUrl.isEmpty()) && jsonObj.has("image") && !jsonObj.isNull("image") && jsonObj.getString("image").length() > 0) {
                            imageUrl = jsonObj.getString("image");
                        }
                        if ((imageUrl == null || imageUrl.isEmpty()) && jsonObj.has("imageUrl") && !jsonObj.isNull("imageUrl") && jsonObj.getString("imageUrl").length() > 0) {
                            imageUrl = jsonObj.getString("imageUrl");
                        }
                        if ((imageUrl == null || imageUrl.isEmpty()) && jsonObj.has("coverUrl") && !jsonObj.isNull("coverUrl") && jsonObj.getString("coverUrl").length() > 0) {
                            imageUrl = jsonObj.getString("coverUrl");
                        }
                        if (jsonObj.has("channelId") && !jsonObj.isNull("channelId") && (channelId == null || channelId.equals(DEFAULT_CHANNEL_ID))) {
                            channelId = jsonObj.getString("channelId");
                        }
                    } catch (Exception e) {
                        // ignore parsing errors on non-json structures
                    }
                }
            }

            // Flat FCM data fields fallback — check if imageUrl is still missing or empty
            if (imageUrl == null || imageUrl.trim().isEmpty()) {
                if (data.containsKey("image") && data.get("image") != null && !data.get("image").trim().isEmpty()) {
                    imageUrl = data.get("image");
                } else if (data.containsKey("imageUrl") && data.get("imageUrl") != null && !data.get("imageUrl").trim().isEmpty()) {
                    imageUrl = data.get("imageUrl");
                } else if (data.containsKey("coverUrl") && data.get("coverUrl") != null && !data.get("coverUrl").trim().isEmpty()) {
                    imageUrl = data.get("coverUrl");
                }
            }
            if (data.containsKey("channelId") && data.get("channelId") != null && (channelId == null || channelId.equals(DEFAULT_CHANNEL_ID))) {
                channelId = data.get("channelId");
            }
        }

        if (title == null && body == null) {
            Log.w(TAG, "Both title and body are null, skipping notification");
            return;
        }

        Log.d(TAG, "Resolved imageUrl=" + imageUrl + ", channelId=" + channelId);

        Bitmap bitmap = null;
        if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            bitmap = downloadBitmap(imageUrl.trim());
            Log.d(TAG, "downloadBitmap result: " + (bitmap != null ? bitmap.getWidth() + "x" + bitmap.getHeight() : "null"));
        }

        showRichNotification(title, body, bitmap, channelId, data);
    }

    private Bitmap downloadBitmap(String src) {
        HttpURLConnection connection = null;
        InputStream input = null;
        String currentUrl = src;

        try {
            for (int redirects = 0; redirects < MAX_REDIRECTS; redirects++) {
                URL url = new URL(currentUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(12000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "SpiritOfFaithApp/1.0 (Android)");
                connection.setRequestProperty("Accept", "image/*");
                connection.connect();

                int responseCode = connection.getResponseCode();
                Log.d(TAG, "Image download HTTP " + responseCode + " from: " + currentUrl);

                if (responseCode == HttpURLConnection.HTTP_MOVED_PERM
                        || responseCode == HttpURLConnection.HTTP_MOVED_TEMP
                        || responseCode == HttpURLConnection.HTTP_SEE_OTHER
                        || responseCode == 307 || responseCode == 308) {
                    // Manual redirect — needed for cross-protocol HTTP->HTTPS redirects
                    String redirectUrl = connection.getHeaderField("Location");
                    connection.disconnect();
                    if (redirectUrl == null || redirectUrl.trim().isEmpty()) {
                        Log.e(TAG, "Redirect response but no Location header");
                        return null;
                    }
                    // Handle relative redirect URLs
                    if (redirectUrl.startsWith("/")) {
                        URL base = new URL(currentUrl);
                        redirectUrl = base.getProtocol() + "://" + base.getHost() + redirectUrl;
                    }
                    currentUrl = redirectUrl;
                    Log.d(TAG, "Following redirect to: " + currentUrl);
                    continue;
                }

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    Log.e(TAG, "Image download failed with HTTP " + responseCode);
                    return null;
                }

                input = connection.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);
                if (bitmap == null) {
                    Log.e(TAG, "BitmapFactory.decodeStream returned null for: " + currentUrl);
                }
                return bitmap;
            }

            Log.e(TAG, "Too many redirects downloading image: " + src);
            return null;
        } catch (Exception e) {
            Log.e(TAG, "Failed to download notification image: " + e.getMessage(), e);
            return null;
        } finally {
            try { if (input != null) input.close(); } catch (Exception ignored) {}
            if (connection != null) connection.disconnect();
        }
    }

    private void showRichNotification(String title, String body, Bitmap bitmap, String channelId, Map<String, String> data) {
        Context context = getApplicationContext();

        // 1. Ensure Notification Channel exists (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                NotificationChannel channel = notificationManager.getNotificationChannel(channelId);
                if (channel == null) {
                    channel = new NotificationChannel(
                            channelId,
                            channelId.equals("teachings") ? "Audio Teachings" : DEFAULT_CHANNEL_NAME,
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Spirit of Faith notifications and ministry updates");
                    channel.enableLights(true);
                    channel.enableVibration(true);
                    notificationManager.createNotificationChannel(channel);
                }
            }
        }

        // 2. Launch Intent when user taps notification
        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (data != null) {
                for (Map.Entry<String, String> entry : data.entrySet()) {
                    intent.putExtra(entry.getKey(), entry.getValue());
                }
            }
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                (int) System.currentTimeMillis(),
                intent,
                flags
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        int smallIcon = getResources().getIdentifier("ic_launcher", "mipmap", getPackageName());
        if (smallIcon == 0) {
            smallIcon = android.R.drawable.ic_dialog_info;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(smallIcon)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        if (bitmap != null) {
            // Apply native Android BigPictureStyle for full expandable banner
            NotificationCompat.BigPictureStyle bigPictureStyle = new NotificationCompat.BigPictureStyle()
                    .bigPicture(bitmap)
                    .setSummaryText(body);
            builder.setStyle(bigPictureStyle);
            builder.setLargeIcon(bitmap);
        } else {
            // Fallback to expandable BigTextStyle
            builder.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
        }

        int notificationId = (int) (System.currentTimeMillis() & 0xfffffff);
        NotificationManagerCompat notificationManagerCompat = NotificationManagerCompat.from(context);
        try {
            notificationManagerCompat.notify((int) System.currentTimeMillis(), builder.build());
        } catch (SecurityException e) {
            Log.e(TAG, "Notification permission missing: " + e.getMessage());
        }
    }
}
`;

function withAndroidBigPictureNotification(config) {
  // 1. Inject Java service file into Android project source tree during prebuild
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidSrcDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'spiritoffaith',
        'app'
      );

      if (fs.existsSync(path.join(projectRoot, 'android'))) {
        fs.mkdirSync(androidSrcDir, { recursive: true });
        const filePath = path.join(androidSrcDir, `${SERVICE_NAME}.java`);
        fs.writeFileSync(filePath, SERVICE_JAVA_CODE, 'utf8');
      }
      return cfg;
    },
  ]);

  // 2. Register ChristPavilionNotificationService in AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const mainApplication = cfg.modResults.manifest.application?.[0];
    if (!mainApplication) return cfg;

    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const serviceExists = mainApplication.service.some(
      (s) => s.$?.['android:name'] === `.${SERVICE_NAME}`
    );

    if (!serviceExists) {
      mainApplication.service.push({
        $: {
          'android:name': `.${SERVICE_NAME}`,
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            $: {
              'android:priority': '100',
            },
            action: [
              {
                $: {
                  'android:name': 'com.google.firebase.MESSAGING_EVENT',
                },
              },
            ],
          },
        ],
      });
    }

    return cfg;
  });

  // 3. Inject Firebase Messaging & AndroidX dependencies into app/build.gradle
  config = withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('firebase-messaging')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    implementation 'com.google.firebase:firebase-messaging:24.0.0'\n    implementation 'androidx.core:core:1.13.1'`
      );
    }
    return cfg;
  });

  return config;
}

module.exports = withAndroidBigPictureNotification;
