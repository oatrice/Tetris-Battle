package com.oatrice.tetrisserver

import android.os.Bundle
import android.text.method.ScrollingMovementMethod
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

class MainActivity : AppCompatActivity() {

    private var server: TetrisServer? = null
    private var isRunning = false
    private lateinit var logTv: TextView
    private lateinit var ipTv: TextView
    private lateinit var toggleBtn: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        logTv = findViewById(R.id.logText)
        ipTv = findViewById(R.id.ipAddressText)
        toggleBtn = findViewById(R.id.toggleServerBtn)

        logTv.movementMethod = ScrollingMovementMethod()

        toggleBtn.setOnClickListener {
            if (isRunning) {
                stopServer()
            } else {
                startServer()
            }
        }

        updateIp()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopServer()
    }

    private fun startServer() {
        try {
            server = TetrisServer(8080) { msg ->
                runOnUiThread { appendLog(msg) }
            }
            server?.start()
            isRunning = true
            toggleBtn.text = "Stop Server"
            toggleBtn.background.setTint(getColor(R.color.teal_700)) // Change color needed?
            updateIp()
            appendLog("Server starting on port 8080...")
        } catch (e: Exception) {
            appendLog("Error starting: ${e.message}")
        }
    }

    private fun stopServer() {
        try {
            server?.stop()
            server = null
            isRunning = false
            toggleBtn.text = "Start Server"
            appendLog("Server stopped.")
        } catch (e: Exception) {
            appendLog("Error stopping: ${e.message}")
        }
    }

    private fun updateIp() {
        val ip = getIpAddress()
        ipTv.text = "IP: $ip:8080"
    }

    private fun appendLog(msg: String) {
        val current = logTv.text.toString()
        val newText = "$current\n$msg"
        // Keep last 50 lines
        val lines = newText.split("\n")
        val truncated = if (lines.size > 50) lines.takeLast(50).joinToString("\n") else newText
        
        logTv.text = truncated
        
        // Auto scroll?
        // Simple implementation
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
