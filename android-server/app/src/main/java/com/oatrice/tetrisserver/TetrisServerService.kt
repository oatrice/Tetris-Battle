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
import android.content.pm.ServiceInfo
import java.text.SimpleDateFormat
import java.util.Date
import java.util.LinkedList
import java.util.Locale

class TetrisServerService : Service() {

    private var isRunning = false
    private val channelId = "TetrisServer"
    private val lastLogs = LinkedList<String>()
    private val maxLogLines = 3
    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

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
             try {
                val notification = createNotification("Starting server...")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
                } else {
                    startForeground(1, notification)
                }
                
                updateLogsAndNotify("Service Starting...")
                startServer()
            } catch (e: Exception) {
                e.printStackTrace()
                broadcastLog("Error starting foreground: ${e.message}")
                stopSelf()
            }
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        updateLogsAndNotify("Service Destroyed")
        stopServer()
        super.onDestroy()
    }

    private fun startServer() {
        isRunning = true
        broadcastStatus(true)
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                tetrisserver.Tetrisserver.setLogger(object : tetrisserver.Logger {
                    override fun log(msg: String?) {
                        msg?.let { updateLogsAndNotify(it) }
                    }
                })
                
                updateLogsAndNotify("Go Server Launching...")
                tetrisserver.Tetrisserver.start(":8080")
            } catch (e: Exception) {
                e.printStackTrace()
                updateLogsAndNotify("Go Server Crashed: ${e.message}")
                isRunning = false
                broadcastStatus(false)
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
            broadcastStatus(false)
            updateLogsAndNotify("Server Stopped")
        }
    }

    private fun updateLogsAndNotify(msg: String) {
        val timestamp = timeFormat.format(Date())
        val formattedMsg = "[$timestamp] $msg"

        // Broadcast to Activity
        broadcastLog(msg)

        // Update local log list for notification
        synchronized(lastLogs) {
            if (lastLogs.size >= maxLogLines) {
                lastLogs.removeFirst()
            }
            lastLogs.addLast(formattedMsg)
        }

        // Update Notification
        val notificationManager = getSystemService(NotificationManager::class.java)
        val summary = if (isRunning) "Server running on port 8080" else "Server stopped"
        notificationManager.notify(1, createNotification(summary))
    }

    private fun broadcastLog(msg: String) {
        val intent = Intent("com.oatrice.tetrisserver.LOG")
        intent.putExtra("msg", msg)
        intent.setPackage(packageName)
        sendBroadcast(intent)
    }

    private fun broadcastStatus(running: Boolean) {
        val intent = Intent("com.oatrice.tetrisserver.STATUS")
        intent.putExtra("isRunning", running)
        intent.setPackage(packageName)
        sendBroadcast(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.VERSION_CODES.O <= Build.VERSION.SDK_INT) {
            val serviceChannel = NotificationChannel(
                channelId,
                "Tetris Server Channel",
                NotificationManager.IMPORTANCE_LOW // Use LOW to avoid sound on every log update
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(content: String): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
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

        val bigText = synchronized(lastLogs) {
            lastLogs.joinToString("\n")
        }

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Tetris Battle Server")
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Server", stopPendingIntent)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW) // Priority LOW to match IMPORTANCE_LOW
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }
}
