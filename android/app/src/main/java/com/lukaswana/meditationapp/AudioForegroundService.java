package com.lukaswana.meditationapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.support.v4.media.session.MediaSessionCompat.Callback;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;

public class AudioForegroundService extends android.app.Service {

    private static final String TAG = "AudioForegroundService";
    private static final String CHANNEL_ID = "meditation_audio_channel";
    private static final int NOTIFICATION_ID = 1;

    private MediaSessionCompat mediaSession;
    private NotificationManager notificationManager;

    private String title = "Meditation";
    private String artist = "Meditation App";
    private String artworkUrl = null;
    private long duration = 0;
    private long position = 0;
    private boolean isPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
        setupMediaSession();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Meditation Audio",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Media playback for meditation");
            channel.setShowBadge(false);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void setupMediaSession() {
        mediaSession = new MediaSessionCompat(this, "MeditationMediaSession");
        mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        mediaSession.setCallback(new Callback() {
            @Override
            public void onPlay() {
                AudioPlugin.notifyJS("play", null);
            }

            @Override
            public void onPause() {
                AudioPlugin.notifyJS("pause", null);
            }

            @Override
            public void onStop() {
                AudioPlugin.notifyJS("stop", null);
            }

            @Override
            public void onSkipToNext() {
                AudioPlugin.notifyJS("next", null);
            }

            @Override
            public void onSkipToPrevious() {
                AudioPlugin.notifyJS("previous", null);
            }

            @Override
            public void onSeekTo(long pos) {
                AudioPlugin.notifyJS("seek", String.valueOf(pos));
            }
        });

        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            switch (action) {
                case "START":
                    startForegroundService();
                    break;
                case "STOP":
                    stopForegroundService();
                    break;
                case "PLAY":
                    setPlaying(true);
                    break;
                case "PAUSE":
                    setPlaying(false);
                    break;
                case "METADATA":
                    if (intent.hasExtra("title")) title = intent.getStringExtra("title");
                    if (intent.hasExtra("artist")) artist = intent.getStringExtra("artist");
                    if (intent.hasExtra("artworkUrl")) artworkUrl = intent.getStringExtra("artworkUrl");
                    if (intent.hasExtra("duration")) duration = intent.getLongExtra("duration", 0);
                    updateMetadata();
                    break;
                case "POSITION":
                    position = intent.getLongExtra("position", 0);
                    updatePlaybackState();
                    break;
            }
        }
        return START_NOT_STICKY;
    }

    private void startForegroundService() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void stopForegroundService() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        stopForeground(true);
        stopSelf();
    }

    private void setPlaying(boolean playing) {
        isPlaying = playing;
        updatePlaybackState();
        updateNotification();
    }

    private void updateMetadata() {
        if (mediaSession == null) return;
        MediaMetadataCompat.Builder metadataBuilder = new MediaMetadataCompat.Builder();
        metadataBuilder.putString(MediaMetadataCompat.METADATA_KEY_TITLE, title);
        metadataBuilder.putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist);
        metadataBuilder.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, duration);
        if (artworkUrl != null) {
            metadataBuilder.putString(MediaMetadataCompat.METADATA_KEY_ART_URI, artworkUrl);
        }
        mediaSession.setMetadata(metadataBuilder.build());
        updateNotification();
    }

    private void updatePlaybackState() {
        if (mediaSession == null) return;
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder();
        long state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        stateBuilder.setState((int) state, position, isPlaying ? 1.0f : 0.0f);
        stateBuilder.setActions(
                PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_STOP |
                PlaybackStateCompat.ACTION_SEEK_TO |
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
        );
        mediaSession.setPlaybackState(stateBuilder.build());
    }

    private Notification buildNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this, 0, contentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent playIntent = new Intent(this, AudioForegroundService.class);
        playIntent.setAction("PLAY");
        PendingIntent playPendingIntent = PendingIntent.getService(
                this, 1, playIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent pauseIntent = new Intent(this, AudioForegroundService.class);
        pauseIntent.setAction("PAUSE");
        PendingIntent pausePendingIntent = PendingIntent.getService(
                this, 2, pauseIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, AudioForegroundService.class);
        stopIntent.setAction("STOP");
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this, 3, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(artist)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(contentPendingIntent)
                .setShowWhen(false)
                .setOngoing(isPlaying)
                .addAction(
                        isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        isPlaying ? "Pause" : "Play",
                        isPlaying ? pausePendingIntent : playPendingIntent
                )
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent);

        if (mediaSession != null) {
            builder.setStyle(new MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0, 1));
        }

        return builder.build();
    }

    private void updateNotification() {
        Notification notification = buildNotification();
        notificationManager.notify(NOTIFICATION_ID, notification);
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public android.os.IBinder onBind(Intent intent) {
        return null;
    }
}