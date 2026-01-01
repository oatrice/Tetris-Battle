package com.oatrice.tetrisserver

import android.Manifest
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.ScrollView
import androidx.appcompat.app.AppCompatActivity
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private val TAG = "TetrisMainActivity"
    private var isRunning = false
    private lateinit var logTv: TextView
    private lateinit var ipTv: TextView
    private lateinit var toggleBtn: Button
    private lateinit var logScrollView: ScrollView
    
    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    private val logBuffer = StringBuilder()
    private val handler = Handler(Looper.getMainLooper())
    private var isUpdatePending = false

    private val logReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "OnReceive: ${intent?.action}")
            when (intent?.action) {
                "com.oatrice.tetrisserver.LOG" -> {
                    intent.getStringExtra("msg")?.let { queueLog(it) }
                }
                "com.oatrice.tetrisserver.STATUS" -> {
                    isRunning = intent.getBooleanExtra("isRunning", false)
                    Log.d(TAG, "Status Update: isRunning = $isRunning")
                    updateButtonState()
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "onCreate")
        setContentView(R.layout.activity_main)

        logTv = findViewById(R.id.logText)
        ipTv = findViewById(R.id.ipAddressText)
        toggleBtn = findViewById(R.id.toggleServerBtn)
        logScrollView = findViewById(R.id.logScrollView)

        toggleBtn.setOnClickListener {
            Log.d(TAG, "Button Clicked! isRunning=$isRunning")
            if (isRunning) stopServerService() else checkNotificationPermissionAndStart()
        }

        updateIp()
        registerReceivers()
    }

    private fun registerReceivers() {
        val filter = IntentFilter().apply {
            addAction("com.oatrice.tetrisserver.LOG")
            addAction("com.oatrice.tetrisserver.STATUS")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(logReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(logReceiver, filter)
        }
    }

    private fun checkNotificationPermissionAndStart() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
                return
            }
        }
        startServerService()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 101) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Permission Granted by User")
                startServerService()
            } else {
                Log.d(TAG, "Permission Denied by User")
                queueLog("System: Notification permission denied. Server will start but notification might not show.")
                startServerService()
            }
        }
    }

    private fun startServerService() {
        Log.d(TAG, "Starting service...")
        val intent = Intent(this, TetrisServerService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
            queueLog("Requesting Server Start...")
        } catch (e: Exception) {
            Log.e(TAG, "Start Service Error", e)
            queueLog("Error: ${e.message}")
        }
    }

    private fun stopServerService() {
        val intent = Intent(this, TetrisServerService::class.java).apply { action = "STOP" }
        startService(intent)
    }

    private fun updateButtonState() {
        runOnUiThread {
            toggleBtn.text = if (isRunning) "Stop Server" else "Start Server"
            toggleBtn.backgroundTintList = ContextCompat.getColorStateList(this, 
                if (isRunning) android.R.color.holo_red_dark else R.color.purple_500)
        }
    }

    private fun updateIp() {
        handler.post { ipTv.text = "IP: ${getIpAddress()}:8080" }
    }

    private fun queueLog(msg: String) {
        val timestamp = timeFormat.format(Date())
        synchronized(logBuffer) { logBuffer.append("[$timestamp] $msg\n") }
        if (!isUpdatePending) {
            isUpdatePending = true
            handler.postDelayed({ updateLogUi() }, 300)
        }
    }

    private fun updateLogUi() {
        val newLogs: String
        synchronized(logBuffer) {
            newLogs = logBuffer.toString()
            logBuffer.setLength(0)
            isUpdatePending = false
        }
        if (newLogs.isNotEmpty()) {
            logTv.append(newLogs)
            logScrollView.post { logScrollView.fullScroll(ScrollView.FOCUS_DOWN) }
        }
    }

    private fun getIpAddress(): String {
        return try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            Collections.list(interfaces).flatMap { Collections.list(it.inetAddresses) }
                .firstOrNull { !it.isLoopbackAddress && it is Inet4Address }?.hostAddress ?: "Unknown"
        } catch (e: Exception) { "Error" }
    }

    override fun onDestroy() {
        super.onDestroy()
        try { unregisterReceiver(logReceiver) } catch (e: Exception) {}
    }
}
