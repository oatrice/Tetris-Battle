package com.oatrice.tetrisserver

import android.os.Bundle
import android.text.method.ScrollingMovementMethod
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build

class MainActivity : AppCompatActivity() {

    private var isRunning = false
    private lateinit var logTv: TextView
    private lateinit var ipTv: TextView
    private lateinit var toggleBtn: Button

    private val logReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.oatrice.tetrisserver.LOG") {
                val msg = intent.getStringExtra("msg")
                msg?.let { appendLog(it) }
            } else if (intent?.action == "com.oatrice.tetrisserver.STATUS") {
                val status = intent.getBooleanExtra("isRunning", false)
                isRunning = status
                updateButtonState()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        logTv = findViewById(R.id.logText)
        ipTv = findViewById(R.id.ipAddressText)
        toggleBtn = findViewById(R.id.toggleServerBtn)

        logTv.movementMethod = ScrollingMovementMethod()

        toggleBtn.setOnClickListener {
            if (isRunning) {
                stopServerService()
            } else {
                startServerService()
            }
        }

        updateIp()
        
        // Register Receiver
        val filter = IntentFilter().apply {
            addAction("com.oatrice.tetrisserver.LOG")
            addAction("com.oatrice.tetrisserver.STATUS")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            registerReceiver(logReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
             registerReceiver(logReceiver, filter)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(logReceiver)
    }

    private fun startServerService() {
        val intent = Intent(this, TetrisServerService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        isRunning = true
        updateButtonState()
        appendLog("Requesting Server Start...")
        updateIp()
    }

    private fun stopServerService() {
        val intent = Intent(this, TetrisServerService::class.java).apply {
            action = "STOP"
        }
        startService(intent)
        isRunning = false
        updateButtonState()
        appendLog("Requesting Server Stop...")
    }

    private fun updateButtonState() {
        if (isRunning) {
            toggleBtn.text = "Stop Server"
        } else {
            toggleBtn.text = "Start Server"
        }
    }

    private fun updateIp() {
        val ip = getIpAddress()
        ipTv.text = "IP: $ip:8080"
    }

    private fun appendLog(msg: String) {
        val current = logTv.text.toString()
        val newText = "$current\n$msg"
        // Keep last 100 lines
        val lines = newText.split("\n")
        val truncated = if (lines.size > 100) lines.takeLast(100).joinToString("\n") else newText
        
        logTv.text = truncated
        
        // Auto scroll
        logTv.post {
            if (logTv.lineCount > 0) {
                val scrollAmount = logTv.layout.getLineTop(logTv.lineCount) - logTv.height
                if (scrollAmount > 0) {
                    logTv.scrollTo(0, scrollAmount)
                } else {
                    logTv.scrollTo(0, 0)
                }
            }
        }
    }

    private fun getIpAddress(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            for (intf in Collections.list(interfaces)) {
                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        return addr.hostAddress ?: ""
                    }
                }
            }
        } catch (e: Exception) { }
        return "Unknown"
    }
}
