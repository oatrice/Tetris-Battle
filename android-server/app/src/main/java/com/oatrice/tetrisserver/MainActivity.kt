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
            when (intent?.action) {
                "com.oatrice.tetrisserver.LOG" -> {
                    val msg = intent.getStringExtra("msg")
                    Log.d(TAG, "Log Received: $msg")
                    msg?.let { queueLog(it) }
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
        setContentView(R.layout.activity_main)

        logTv = findViewById(R.id.logText)
        ipTv = findViewById(R.id.ipAddressText)
        toggleBtn = findViewById(R.id.toggleServerBtn)
        logScrollView = findViewById(R.id.logScrollView)

        toggleBtn.setOnClickListener {
            if (isRunning) stopServerService() else checkNotificationPermissionAndStart()
        }

        updateIp()
        
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
            startServerService()
        }
    }

    private fun startServerService() {
        val intent = Intent(this, TetrisServerService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        updateIp()
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
        synchronized(logBuffer) {
            logBuffer.append("[$timestamp] $msg\n")
        }
        if (!isUpdatePending) {
            isUpdatePending = true
            handler.postDelayed({ updateLogUi() }, 100) // เร็วขึ้นเป็น 100ms
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
            runOnUiThread {
                logTv.append(newLogs)
                logScrollView.post {
                    logScrollView.fullScroll(ScrollView.FOCUS_DOWN)
                }
            }
        }
    }

    private fun getIpAddress(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            for (intf in Collections.list(interfaces)) {
                for (addr in Collections.list(intf.inetAddresses)) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address) return addr.hostAddress ?: ""
                }
            }
        } catch (e: Exception) { }
        return "Unknown"
    }

    override fun onDestroy() {
        super.onDestroy()
        try { unregisterReceiver(logReceiver) } catch (e: Exception) {}
    }
}
