package com.oatrice.tetrisserver

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TetrisServerService : Service() {

    private var isRunning = false
    private val channelId = "TetrisServer"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        
        if (action == "STOP") {
            stopServer()
            stopSelf()
            return START_NOT_STICKY
        }

        if (!isRunning) {
            startForeground(1, createNotification("Starting server..."))
            startServer()
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        stopServer()
        super.onDestroy()
    }

    private fun startServer() {
        isRunning = true
        CoroutineScope(Dispatchers.IO).launch {
            try {
                tetrisserver.Tetrisserver.setLogger(object : tetrisserver.Logger {
                    override fun log(msg: String?) {
                        val intent = Intent("com.oatrice.tetrisserver.LOG")
                        intent.putExtra("msg", msg)
                        sendBroadcast(intent)
                    }
                })
                
                // Update notification text
                val notificationManager = getSystemService(NotificationManager::class.java)
                notificationManager.notify(1, createNotification("Server running on port 8080"))

                tetrisserver.Tetrisserver.start(":8080")
            } catch (e: Exception) {
                e.printStackTrace()
                isRunning = false
                stopSelf()
            }
        }
    }

    private fun stopServer() {
        if (isRunning) {
            try {
                tetrisserver.Tetrisserver.stop()
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isRunning = false
            
            val intent = Intent("com.oatrice.tetrisserver.STATUS")
            intent.putExtra("isRunning", false)
            sendBroadcast(intent)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                channelId,
                "Tetris Server Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(content: String): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        val stopIntent = Intent(this, TetrisServerService::class.java).apply {
            action = "STOP"
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Tetris Battle Server")
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Server", stopPendingIntent)
            .setOngoing(true)
            .build()
    }
}
