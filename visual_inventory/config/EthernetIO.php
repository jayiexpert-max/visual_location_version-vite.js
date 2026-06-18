<?php
/**
 * EthernetIO Class (Modbus TCP)
 * Handles communication with standard industrial Ethernet IO modules.
 */
class EthernetIO {
    private $ip;
    private $port;
    private $timeout;
    private $socket;

    public function __construct($ip, $port = 502, $timeout = 2) {
        $this->ip = $ip;
        $this->port = $port;
        $this->timeout = $timeout;
    }

    private function connect() {
        if ($this->socket) return true;
        
        $this->socket = @fsockopen($this->ip, $this->port, $errno, $errstr, $this->timeout);
        if (!$this->socket) {
            error_log("EthernetIO Connection failed: $errstr ($errno)");
            return false;
        }
        stream_set_timeout($this->socket, $this->timeout);
        return true;
    }

    private function disconnect() {
        if ($this->socket) {
            fclose($this->socket);
            $this->socket = null;
        }
    }

    /**
     * Send Modbus TCP request
     */
    private function sendModbusRequest($unitId, $functionCode, $data) {
        if (!$this->connect()) return false;

        $transactionId = rand(0, 65535);
        $protocolId = 0;
        $length = 2 + strlen($data); // Unit ID (1) + Function Code (1) + Data

        // Modbus Application Protocol (MBAP) Header
        $header = pack('nnnCC', $transactionId, $protocolId, $length, $unitId, $functionCode);
        $packet = $header . $data;

        fwrite($this->socket, $packet);
        
        // Read response (at least 7 bytes for MBAP + Function Code)
        $response = fread($this->socket, 1024);
        $this->disconnect();

        if (strlen($response) < 7) {
            error_log("EthernetIO: Invalid response length");
            return false;
        }

        // Validate response
        $respHeader = unpack('ntransaction/nprotocol/nlength/Cunit/Cfunction', substr($response, 0, 8));
        
        // Check for Modbus exception (function code + 0x80)
        if ($respHeader['function'] == ($functionCode + 0x80)) {
            $exceptionCode = ord($response[8]);
            error_log("EthernetIO: Modbus Exception $exceptionCode");
            return false;
        }

        return substr($response, 8); // Return data payload
    }

    /**
     * Turn on a specific output pin
     * Uses Modbus Function 05 (Write Single Coil)
     * $pin is 0-indexed (e.g. Pin 0 is the first output)
     */
    public function turnOn($pin) {
        // Coil address = $pin
        // Value: FF 00 for ON
        $data = pack('nn', $pin, 0xFF00);
        return $this->sendModbusRequest(1, 0x05, $data) !== false;
    }

    /**
     * Turn off a specific output pin
     * Uses Modbus Function 05 (Write Single Coil)
     */
    public function turnOff($pin) {
        // Value: 00 00 for OFF
        $data = pack('nn', $pin, 0x0000);
        return $this->sendModbusRequest(1, 0x05, $data) !== false;
    }

    /**
     * Read a specific input pin
     * Uses Modbus Function 02 (Read Discrete Inputs)
     * Returns true if ON, false if OFF
     */
    public function readInput($pin) {
        // Address = $pin, Quantity = 1
        $data = pack('nn', $pin, 1);
        $response = $this->sendModbusRequest(1, 0x02, $data);
        
        if ($response === false || strlen($response) < 2) {
            return false; // Error reading
        }
        
        $byteCount = ord($response[0]);
        $status = ord($response[1]);
        
        // Bit 0 of the status byte indicates the state of the requested pin
        return ($status & 0x01) === 1;
    }
}
