const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
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

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        RemoteMessage.Notification notification = remoteMessage.getNotification();

        String title = null;
        String body = null;
        String imageUrl = null;
        String channelId = DEFAULT_CHANNEL_ID;

        if (notification != null) {
            title = notification.getTitle();
            body = notification.getBody();
            if (notification.getImageUrl() != null) {
                imageUrl = notification.getImageUrl().toString();
            }
        }

        if (data != null && !data.isEmpty()) {
            if (data.containsKey("title") && data.get("title") != null) title = data.get("title");
            if (data.containsKey("body") && data.get("body") != null) body = data.get("body");
            if (data.containsKey("image") && data.get("image") != null) imageUrl = data.get("image");
            else if (data.containsKey("imageUrl") && data.get("imageUrl") != null) imageUrl = data.get("imageUrl");
            else if (data.containsKey("coverUrl") && data.get("coverUrl") != null) imageUrl = data.get("coverUrl");

            if (data.containsKey("channelId") && data.get("channelId") != null) {
                channelId = data.get("channelId");
            }
        }

        if (title == null && body == null) {
            return;
        }

        Bitmap bitmap = null;
        if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            bitmap = downloadBitmap(imageUrl.trim());
        }

        showRichNotification(title, body, bitmap, channelId, data);
    }

    private Bitmap downloadBitmap(String src) {
        try {
            URL url = new URL(src);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(12000);
            connection.connect();
            InputStream input = connection.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (Exception e) {
            Log.e(TAG, "Failed to download notification image: " + e.getMessage());
            return null;
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
            // Apply native Android BigPictureStyle for full expandable Instagram/PalmPay banner
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
        try {
            NotificationManagerCompat.from(context).notify(notificationId, builder.build());
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

  return config;
}

module.exports = withAndroidBigPictureNotification;
